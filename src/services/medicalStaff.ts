import apiClient from './api';

export interface MedicalStaffRequestDTO {
  id?: string;
  name: string;
  email: string;
  address: string;
  dateOfBirth: string;
  registeredDate: string;
  password?: string;
  role?: string;
}

export interface MedicalStaffResponseDTO {
  id: string;
  name: string;
  email: string;
  address: string;
  dateOfBirth: string;
  role?: string;
}

export type StaffNameMap = Record<string, string>;

export async function getMedicalStaff(): Promise<MedicalStaffResponseDTO[]> {
  const { data } = await apiClient.get<MedicalStaffResponseDTO[]>('/api/medical-staff');
  return data;
}

export async function getMedicalStaffById(id: string): Promise<MedicalStaffResponseDTO> {
  const { data } = await apiClient.get<MedicalStaffResponseDTO>(`/api/medical-staff/${id}`);
  return data;
}

export async function getMedicalStaffNameMap(ids?: string[]): Promise<StaffNameMap> {
  try {
    const staff = await getMedicalStaff();
    const map: StaffNameMap = {};
    for (const s of staff) {
      if (s?.id && s?.name) map[s.id] = s.name;
    }

    if (!ids?.length) return map;

    const filtered: StaffNameMap = {};
    for (const id of ids) {
      if (map[id]) filtered[id] = map[id];
    }
    return filtered;
  } catch {
    if (!ids?.length) return {};

    const entries = await Promise.all(
      ids.map(async (id) => {
        try {
          const staff = await getMedicalStaffById(id);
          if (!staff?.name) return null;
          return [id, staff.name] as const;
        } catch {
          return null;
        }
      })
    );

    const map: StaffNameMap = {};
    for (const entry of entries) {
      if (!entry) continue;
      map[entry[0]] = entry[1];
    }
    return map;
  }
}

export function getStaffDisplayName(staffId: string | undefined, map: StaffNameMap | undefined): string {
  if (!staffId) return '—';
  const name = map?.[staffId];
  if (name) return name;
  if (staffId.length <= 12) return staffId;
  return `${staffId.slice(0, 8)}…${staffId.slice(-4)}`;
}

export async function createMedicalStaff(payload: MedicalStaffRequestDTO): Promise<MedicalStaffResponseDTO> {
  console.log('Making POST request to /api/medical-staff with payload:', payload);
  try {
    const { data } = await apiClient.post<MedicalStaffResponseDTO>('/api/medical-staff', payload);
    console.log('POST request successful, response:', data);
    return data;
  } catch (error) {
    console.error('POST request failed:', error);
    throw error;
  }
}

export async function updateMedicalStaff(id: string, payload: MedicalStaffRequestDTO): Promise<MedicalStaffResponseDTO> {
  const { data } = await apiClient.put<MedicalStaffResponseDTO>(`/api/medical-staff/${id}`, payload);
  return data;
}

export async function deleteMedicalStaff(id: string): Promise<void> {
  await apiClient.delete(`/api/medical-staff/${id}`);
}
