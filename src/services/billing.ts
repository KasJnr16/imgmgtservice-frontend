import apiClient from './api';

export interface BillingDTO {
  id: string;
  billingAccount: {
    id: string;
    patientId: string;
    accountName: string;
    balance: number;
    isSettled: boolean;
    createdAt: string;
  };
  amountDue: number;
  dueDate: string;
  paid: boolean;
  description: string;
  createdAt: string;
}

export interface BillingAccountDTO {
  id: string;
  patientId: string;
  accountName: string;
  balance: number;
  isSettled: boolean;
  createdAt: string;
}

export interface CreateBillingRequestDTO {
  patientId: string;
  amount: number;
  dueDate: string;
  description: string;
}

export async function getBillingCharges(patientId: string): Promise<BillingDTO[]> {
  const { data } = await apiClient.get<BillingDTO[]>(`/api/billing/charges/patient/${patientId}`);
  return data;
}

export async function getOutstandingBills(patientId: string): Promise<BillingDTO[]> {
  const { data } = await apiClient.get<BillingDTO[]>(`/api/billing/charges/patient/${patientId}/outstanding`);
  return data;
}

export async function getBillingAccount(patientId: string): Promise<BillingAccountDTO> {
  const { data } = await apiClient.get<BillingAccountDTO>(`/api/billing/accounts/${patientId}`);
  return data;
}

export async function createBillingCharge(payload: CreateBillingRequestDTO): Promise<BillingDTO> {
  const { data } = await apiClient.post<BillingDTO>('/api/billing/charges', payload);
  return data;
}

export async function payBillingCharge(billingId: string): Promise<void> {
  await apiClient.post(`/api/billing/charges/${billingId}/pay`);
}

export async function createBillingAccount(patientId: string, accountName: string): Promise<BillingAccountDTO> {
  const { data } = await apiClient.post<BillingAccountDTO>(`/api/billing/accounts/${patientId}?accountName=${accountName}`);
  return data;
}

export async function checkAccountSettled(patientId: string): Promise<boolean> {
  const { data } = await apiClient.get<boolean>(`/api/billing/accounts/${patientId}/settled`);
  return data;
}

// Helper to generate billing amount based on condition/disease
export function generateBillingAmount(entityType: 'MEDICAL_RECORD' | 'DIAGNOSIS' | 'MEDICAL_IMAGE', severity?: string, status?: string, diseaseName?: string, imageType?: string): number {
  // Medical records: flat $5 fee
  if (entityType === 'MEDICAL_RECORD') {
    return 5;
  }

  // Diagnoses: base amount varies by status and adjusted by severity
  if (entityType === 'DIAGNOSIS') {
    let baseAmount = 0;
    
    // Base amount by status
    switch (status) {
      case 'ACTIVE':
        baseAmount = 150;
        break;
      case 'UNDER_OBSERVATION':
        baseAmount = 120;
        break;
      case 'CHRONIC':
        baseAmount = 200;
        break;
      case 'RESOLVED':
        baseAmount = 100;
        break;
      default:
        baseAmount = 100;
    }
    
    // Adjust based on severity
    switch (severity) {
      case 'MILD':
        return Math.floor(baseAmount * 0.7);
      case 'MODERATE':
        return Math.floor(baseAmount * 1.0);
      case 'SEVERE':
        return Math.floor(baseAmount * 1.5);
      case 'CRITICAL':
        return Math.floor(baseAmount * 2.0);
      default:
        return baseAmount;
    }
  }

  // Medical images: existing logic
  const baseRanges = {
    MEDICAL_IMAGE: { min: 120, max: 800 },
  };

  const range = baseRanges[entityType];
  let amount = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

  // Adjust based on disease keywords for images
  if (entityType === 'MEDICAL_IMAGE' && (imageType || diseaseName)) {
    const keywords = (imageType || diseaseName || '').toLowerCase();
    if (keywords.includes('mri')) amount = Math.floor(amount * 1.8);
    if (keywords.includes('ct')) amount = Math.floor(amount * 1.4);
    if (keywords.includes('x-ray') || keywords.includes('xray')) amount = Math.floor(amount * 0.8);
    if (keywords.includes('ultrasound')) amount = Math.floor(amount * 0.9);
  }

  return amount;
}

// Helper to create a billing description
export function generateBillingDescription(entityType: 'MEDICAL_RECORD' | 'DIAGNOSIS' | 'MEDICAL_IMAGE', details?: { diseaseName?: string; imageType?: string; chiefComplaint?: string }): string {
  switch (entityType) {
    case 'MEDICAL_RECORD':
      return `Medical record consultation${details?.chiefComplaint ? `: ${details.chiefComplaint}` : ''}`;
    case 'DIAGNOSIS':
      return `Diagnosis and treatment plan${details?.diseaseName ? ` for ${details.diseaseName}` : ''}`;
    case 'MEDICAL_IMAGE':
      return `Medical imaging${details?.imageType ? ` (${details.imageType})` : ''}${details?.diseaseName ? ` - ${details.diseaseName}` : ''}`;
    default:
      return 'Medical service';
  }
}

// Helper to create a billing charge with due date (e.g., 30 days from now)
export function createBillingRequest(
  patientId: string,
  entityType: 'MEDICAL_RECORD' | 'DIAGNOSIS' | 'MEDICAL_IMAGE',
  entityId: string,
  details?: { diseaseName?: string; imageType?: string; chiefComplaint?: string; severity?: string; status?: string; diseaseTag?: string }
): CreateBillingRequestDTO {
  const amount = generateBillingAmount(entityType, details?.severity, details?.status, details?.diseaseName, details?.imageType);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  
  // Generate meaningful description based on entity type and details
  let description = 'Medical Service';
  switch (entityType) {
    case 'MEDICAL_RECORD':
      description = `Medical Record${details?.chiefComplaint ? ` - ${details.chiefComplaint}` : ''}`;
      break;
    case 'DIAGNOSIS':
      description = `Diagnosis${details?.diseaseName ? ` - ${details.diseaseName}` : ''}${details?.severity ? ` (${details.severity})` : ''}`;
      break;
    case 'MEDICAL_IMAGE':
      description = `Medical Imaging${details?.imageType ? ` - ${details.imageType}` : ''}${details?.diseaseTag ? ` for ${details.diseaseTag}` : ''}`;
      break;
  }
  
  // Format as ISO datetime for LocalDateTime compatibility
  return {
    patientId,
    amount: amount, // Ensure it's a plain number for BigDecimal conversion
    dueDate: dueDate.toISOString(),
    description,
  };
}
