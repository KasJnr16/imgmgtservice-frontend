import apiClient from './api';
import { createBillingCharge, createBillingRequest } from './billing';

export interface ImageUploadRequestDTO {
  patientId: string;
  staffId: string;
  imageType?: string;
  diseaseTag?: string;
  diagnosisId?: string;
  medicalRecordId?: string;
}

export interface MedicalImageDTO {
  id: string;
  patientId: string;
  uploadedByStaffId: string;
  imageType?: string;
  diseaseTag?: string;
  diagnosisId?: string;
  medicalRecordId?: string;
  filePath?: string;
  contentType?: string;
  fileSize?: number;
  uploadedAt?: string;
}

export async function getImagesByPatient(patientId: string): Promise<MedicalImageDTO[]> {
  const { data } = await apiClient.get<MedicalImageDTO[]>(`/api/images/patient/${patientId}`);
  return data;
}

export async function downloadImage(imageId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/api/images/${imageId}/download`, {
    responseType: 'blob',
  });
  return data;
}

export async function deleteImage(imageId: string): Promise<void> {
  await apiClient.delete(`/api/images/${imageId}`);
}

export async function uploadImage(file: File, request: ImageUploadRequestDTO): Promise<MedicalImageDTO> {
  const form = new FormData();
  form.append('file', file);
  form.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));

  const { data } = await apiClient.post<MedicalImageDTO>('/api/images/upload', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  // Create billing charge
  try {
    const billingPayload = createBillingRequest(
      request.patientId,
      'MEDICAL_IMAGE',
      data.id,
      { imageType: request.imageType, diseaseName: request.diseaseTag }
    );
    await createBillingCharge(billingPayload);
  } catch {
    // Ignore billing errors for now
  }

  return data;
}
