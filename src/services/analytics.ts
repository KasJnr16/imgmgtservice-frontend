import apiClient from './api';
import { createBillingCharge, createBillingRequest } from './billing';

export type UserRole = 'PATIENT' | 'DOCTOR' | 'RADIOLOGIST' | 'ADMIN';

export type DiagnosisSeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
export type DiagnosisStatus = 'ACTIVE' | 'RESOLVED' | 'CHRONIC' | 'UNDER_OBSERVATION';

export type ReportType = 'PATIENT_SUMMARY' | 'DIAGNOSIS_HISTORY' | 'TREATMENT_PROGRESS' | 'COMPREHENSIVE';
export type ReportFormat = 'JSON' | 'PDF' | 'TEXT';

export interface DiagnosisImageDTO {
  id: string;
  imageId: string;
  imageType?: string;
  notes?: string;
  linkedAt?: string;
}

export interface DiagnosisDTO {
  id: string;
  diagnosedByStaffId: string;
  diseaseName: string;
  icdCode?: string;
  description?: string;
  severity?: DiagnosisSeverity;
  status?: DiagnosisStatus;
  treatmentPlan?: string;
  notes?: string;
  diagnosisDate?: string;
  createdAt?: string;
  updatedAt?: string;
  images?: DiagnosisImageDTO[];
  medicalRecord?: MedicalRecordDTO;
}

export interface MedicalRecordDTO {
  id: string;
  patientId: string;
  createdByStaffId: string;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  medications?: string;
  allergies?: string;
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  recordDate?: string;
  createdAt?: string;
  updatedAt?: string;
  diagnoses?: DiagnosisDTO[];
}

export interface ReportDTO {
  id: string;
  patientId: string;
  generatedByStaffId?: string;
  reportType: ReportType;
  startDate?: string;
  endDate?: string;
  reportContent?: string;
  format: ReportFormat;
  generatedAt?: string;
}

export interface CreateMedicalRecordDTO {
  patientId: string;
  createdByStaffId?: string;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  medications?: string;
  allergies?: string;
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
}

export interface CreateDiagnosisDTO {
  medicalRecordId: string;
  diagnosedByStaffId?: string;
  diseaseName: string;
  icdCode?: string;
  description?: string;
  severity?: DiagnosisSeverity;
  status?: DiagnosisStatus;
  treatmentPlan?: string;
  notes?: string;
  imageIds?: string[];
}

export interface GenerateReportDTO {
  patientId: string;
  generatedByStaffId?: string;
  reportType: ReportType;
  startDate?: string;
  endDate?: string;
  format: ReportFormat;
}

function normalizeArrayResponse<T>(value: unknown, keys: string[]): T[] {
  const wrapperKeys = ['data', 'result', 'payload', 'body', 'response'];

  const visit = (v: unknown, depth: number): T[] => {
    if (Array.isArray(v)) return v as T[];
    if (!v || typeof v !== 'object') return [];
    if (depth > 4) return [];

    const obj = v as Record<string, unknown>;

    for (const k of keys) {
      const candidate = obj[k];
      if (Array.isArray(candidate)) return candidate as T[];
    }

    for (const wk of wrapperKeys) {
      if (wk in obj) {
        const nested = visit(obj[wk], depth + 1);
        if (nested.length) return nested;
      }
    }

    const objKeys = Object.keys(obj);
    if (objKeys.length === 1) {
      const nested = visit(obj[objKeys[0]], depth + 1);
      if (nested.length) return nested;
    }

    return [];
  };

  return visit(value, 0);
}

function decodeTokenPayload(): any | null {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    return payload;
  } catch {
    return null;
  }
}

function getUserContext(): { role: UserRole | null; userId: string | null } {
  const payload = decodeTokenPayload();
  const role = (payload?.role as UserRole | undefined) || null;
  const userId = (payload?.id as string | undefined) || null;
  return { role, userId };
}

function assertPatientScope(patientId: string) {
  const { role, userId } = getUserContext();
  if (role === 'PATIENT' && userId && patientId !== userId) {
    throw new Error('Access denied: patients can only access their own data.');
  }
}

function assertNotPatient(action: string) {
  const { role } = getUserContext();
  if (role === 'PATIENT') {
    throw new Error(`Access denied: patients cannot ${action}.`);
  }
}

function assertRoleAllowed(action: string, roles: UserRole[]) {
  const { role } = getUserContext();
  if (!role || !roles.includes(role)) {
    throw new Error(`Access denied: ${role || 'UNKNOWN'} cannot ${action}.`);
  }
}

function maybeInjectStaffId<T extends { createdByStaffId?: string; diagnosedByStaffId?: string; generatedByStaffId?: string }>(
  payload: T,
  field: 'createdByStaffId' | 'diagnosedByStaffId' | 'generatedByStaffId'
): T {
  const { role, userId } = getUserContext();
  if (!userId) return payload;

  if (role === 'DOCTOR' || role === 'RADIOLOGIST' || role === 'ADMIN') {
    return { ...payload, [field]: userId } as T;
  }

  return payload;
}

export async function createMedicalRecord(payload: CreateMedicalRecordDTO): Promise<MedicalRecordDTO> {
  assertNotPatient('create medical records');
  assertRoleAllowed('create medical records', ['DOCTOR', 'ADMIN']);
  assertPatientScope(payload.patientId);

  const adjusted = maybeInjectStaffId(payload, 'createdByStaffId');
  const { data } = await apiClient.post<MedicalRecordDTO>('/api/analytics/medical-records', adjusted);
  // Create billing charge
  try {
    const billingPayload = createBillingRequest(
      payload.patientId,
      'MEDICAL_RECORD',
      data.id,
      { chiefComplaint: payload.chiefComplaint }
    );
    await createBillingCharge(billingPayload);
  } catch {
    // Ignore billing errors for now
  }
  return data;
}

export async function getMedicalRecordsByPatient(patientId: string): Promise<MedicalRecordDTO[]> {
  assertPatientScope(patientId);
  const { data } = await apiClient.get<any>(`/api/analytics/medical-records/patient/${patientId}`);
  return normalizeArrayResponse<MedicalRecordDTO>(data, ['records', 'medicalRecords', 'items', 'content', 'data', 'result']);
}

export async function getMedicalRecord(recordId: string): Promise<MedicalRecordDTO> {
  const { data } = await apiClient.get<MedicalRecordDTO>(`/api/analytics/medical-records/${recordId}`);
  return data;
}

export async function getMedicalRecordsByDateRange(patientId: string, startDate: string, endDate: string): Promise<MedicalRecordDTO[]> {
  assertPatientScope(patientId);
  const { data } = await apiClient.get<any>(`/api/analytics/medical-records/patient/${patientId}/date-range`, {
    params: { startDate, endDate },
  });
  return normalizeArrayResponse<MedicalRecordDTO>(data, ['records', 'medicalRecords', 'items', 'content', 'data', 'result']);
}

export async function createDiagnosis(request: CreateDiagnosisDTO): Promise<DiagnosisDTO> {
  assertNotPatient('create diagnoses');
  assertRoleAllowed('create diagnoses', ['DOCTOR', 'ADMIN']);
  const adjusted = maybeInjectStaffId(request, 'diagnosedByStaffId');
  const { data } = await apiClient.post<DiagnosisDTO>('/api/analytics/diagnoses', adjusted);
  // Create billing charge: fetch medical record to get patientId
  try {
    const record = await getMedicalRecord(request.medicalRecordId);
    const billingPayload = createBillingRequest(
      record.patientId,
      'DIAGNOSIS',
      data.id,
      { diseaseName: request.diseaseName, severity: request.severity, status: request.status }
    );
    await createBillingCharge(billingPayload);
  } catch {
    // Ignore billing errors for now
  }
  return data;
}

export async function getDiagnosesByPatient(patientId: string): Promise<DiagnosisDTO[]> {
  assertPatientScope(patientId);
  const { data } = await apiClient.get<any>(`/api/analytics/diagnoses/patient/${patientId}`);
  return normalizeArrayResponse<DiagnosisDTO>(data, ['diagnoses', 'items', 'content', 'data', 'result']);
}

export async function getActiveDiagnosesByPatient(patientId: string): Promise<DiagnosisDTO[]> {
  assertPatientScope(patientId);
  const { data } = await apiClient.get<any>(`/api/analytics/diagnoses/patient/${patientId}/active`);
  return normalizeArrayResponse<DiagnosisDTO>(data, ['diagnoses', 'items', 'content', 'data', 'result']);
}

export async function getDiagnosesByDateRange(patientId: string, startDate: string, endDate: string): Promise<DiagnosisDTO[]> {
  assertPatientScope(patientId);
  const { data } = await apiClient.get<any>(`/api/analytics/diagnoses/patient/${patientId}/date-range`, {
    params: { startDate, endDate },
  });
  return normalizeArrayResponse<DiagnosisDTO>(data, ['diagnoses', 'items', 'content', 'data', 'result']);
}

export async function updateDiagnosisStatus(diagnosisId: string, status: DiagnosisStatus): Promise<any> {
  assertNotPatient('update diagnosis status');
  const { data } = await apiClient.patch(`/api/analytics/diagnoses/${diagnosisId}/status`, null, {
    params: { status },
  });
  return data;
}

export async function generateReport(payload: GenerateReportDTO): Promise<any> {
  assertPatientScope(payload.patientId);
  const { role, userId } = getUserContext();

  if (role === 'PATIENT') {
    const adjusted = { ...payload };
    delete (adjusted as any).generatedByStaffId;
    const { data } = await apiClient.post('/api/analytics/reports/generate', adjusted);
    return data;
  }

  if (role === 'DOCTOR' || role === 'ADMIN') {
    const adjusted = userId ? { ...payload, generatedByStaffId: userId } : payload;
    const { data } = await apiClient.post('/api/analytics/reports/generate', adjusted);
    return data;
  }

  const { data } = await apiClient.post('/api/analytics/reports/generate', payload);
  return data;
}

export async function getReportsByPatient(patientId: string): Promise<ReportDTO[]> {
  assertPatientScope(patientId);
  const { data } = await apiClient.get<any>(`/api/analytics/reports/patient/${patientId}`);
  return normalizeArrayResponse<ReportDTO>(data, ['reports', 'items', 'content', 'data', 'result']);
}

export async function getReport(reportId: string): Promise<ReportDTO> {
  const { data } = await apiClient.get<ReportDTO>(`/api/analytics/reports/${reportId}`);
  return data;
}

// Export scan appointment types and service
export * from './scanAppointments';
