import apiClient from './api';

export interface PatientRequestDTO {
  id?: string;
  name: string;
  email: string;
  address: string;
  dateOfBirth: string;
  registeredDate: string;
}

export interface PatientResponseDTO {
  id: string;
  name: string;
  email: string;
  address: string;
  dateOfBirth: string;
}

export async function getPatients(): Promise<PatientResponseDTO[]> {
  const { data } = await apiClient.get<PatientResponseDTO[]>('/api/patients');
  return data;
}

export async function getPatient(id: string): Promise<PatientResponseDTO> {
  const { data } = await apiClient.get<PatientResponseDTO>(`/api/patients/${id}`);
  return data;
}

export async function updatePatient(id: string, payload: PatientRequestDTO): Promise<PatientResponseDTO> {
  const { data } = await apiClient.put<PatientResponseDTO>(`/api/patients/${id}`, payload);
  return data;
}

export async function deletePatient(id: string): Promise<void> {
  await apiClient.delete(`/api/patients/${id}`);
}
