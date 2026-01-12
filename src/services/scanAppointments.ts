import axios from 'axios';
import { getToken } from '../utils/authStorage';

export interface ScanType {
  X_RAY: 'X_RAY';
  CT_SCAN: 'CT_SCAN';
  MRI: 'MRI';
  ULTRASOUND: 'ULTRASOUND';
  MAMMOGRAM: 'MAMMOGRAM';
  BONE_SCAN: 'BONE_SCAN';
  PET_SCAN: 'PET_SCAN';
  ANGIOGRAM: 'ANGIOGRAM';
  OTHER: 'OTHER';
}

export type ScanTypeValue = ScanType[keyof ScanType];

export interface AppointmentStatus {
  REQUESTED: 'REQUESTED';
  SCHEDULED: 'SCHEDULED';
  IN_PROGRESS: 'IN_PROGRESS';
  COMPLETED: 'COMPLETED';
  CANCELLED: 'CANCELLED';
  REJECTED: 'REJECTED';
}

export type AppointmentStatusValue = AppointmentStatus[keyof AppointmentStatus];

export interface ScanRequestDTO {
  medicalRecordId: string;
  patientId: string;
  doctorId: string;
  scanType: ScanTypeValue;
  scanReason: string;
  notes?: string;
  radiologistId?: string;
}

export interface ScanAppointmentDTO {
  id: string;
  medicalRecordId: string;
  patientId: string;
  doctorId: string;
  radiologistId?: string;
  scanType: ScanTypeValue;
  scanReason: string;
  status: AppointmentStatusValue;
  requestedAt: string;
  scheduledAt?: string;
  completedAt?: string;
  imageFilePath?: string;
  imageUploadedAt?: string;
  notes?: string;
  feeAmount?: number;
  billingChargeId?: string;
  patientName?: string;
  doctorName?: string;
  radiologistName?: string;
}

export interface ScanUpdateDTO {
  status: AppointmentStatusValue;
  notes?: string;
  radiologistId?: string;
  imageFilePath?: string;
}

const API_URL = process.env.REACT_APP_ANALYTICS_SERVICE_URL || '';

const authHeaders = () => ({
  'Authorization': `Bearer ${getToken()}`,
  'Content-Type': 'application/json'
});

export const scanAppointmentService = {
  // Create scan request (doctor only)
  async createScanRequest(request: ScanRequestDTO): Promise<ScanAppointmentDTO> {
    const response = await axios.post(
      `${API_URL}/api/analytics/scan-appointments/request`,
      request,
      { headers: authHeaders() }
    );
    return response.data;
  },

  // Get appointment by ID
  async getAppointment(id: string): Promise<ScanAppointmentDTO> {
    const response = await axios.get(
      `${API_URL}/api/analytics/scan-appointments/${id}`,
      { headers: authHeaders() }
    );
    return response.data;
  },

  // Update appointment
  async updateAppointment(id: string, update: ScanUpdateDTO, userId: string): Promise<ScanAppointmentDTO> {
    const response = await axios.put(
      `${API_URL}/api/analytics/scan-appointments/${id}?userId=${userId}`,
      update,
      { headers: authHeaders() }
    );
    return response.data;
  },

  // Upload scan image (radiologist only)
  async uploadScanImage(id: string, imageFilePath: string, radiologistId: string): Promise<ScanAppointmentDTO> {
    const response = await axios.post(
      `${API_URL}/api/analytics/scan-appointments/${id}/upload-image?imageFilePath=${encodeURIComponent(imageFilePath)}&radiologistId=${radiologistId}`,
      {},
      { headers: authHeaders() }
    );
    return response.data;
  },

  // Cancel appointment
  async cancelAppointment(id: string, userId: string): Promise<void> {
    await axios.post(
      `${API_URL}/api/analytics/scan-appointments/${id}/cancel?userId=${userId}`,
      {},
      { headers: authHeaders() }
    );
  },

  // Get appointments for patient
  async getAppointmentsForPatient(patientId: string): Promise<ScanAppointmentDTO[]> {
    const response = await axios.get(
      `${API_URL}/api/analytics/scan-appointments/patient/${patientId}`,
      { headers: authHeaders() }
    );
    return response.data;
  },

  // Get appointments for doctor
  async getAppointmentsForDoctor(doctorId: string): Promise<ScanAppointmentDTO[]> {
    const response = await axios.get(
      `${API_URL}/api/analytics/scan-appointments/doctor/${doctorId}`,
      { headers: authHeaders() }
    );
    return response.data;
  },

  // Get appointments for radiologist
  async getAppointmentsForRadiologist(radiologistId: string): Promise<ScanAppointmentDTO[]> {
    const response = await axios.get(
      `${API_URL}/api/analytics/scan-appointments/radiologist/${radiologistId}`,
      { headers: authHeaders() }
    );
    return response.data;
  },

  // Get unassigned requested scans (radiologist only)
  async getUnassignedRequestedScans(): Promise<ScanAppointmentDTO[]> {
    const response = await axios.get(
      `${API_URL}/api/analytics/scan-appointments/unassigned`,
      { headers: authHeaders() }
    );
    return response.data;
  },

  // Get upcoming appointments for radiologist
  async getUpcomingAppointmentsForRadiologist(radiologistId: string): Promise<ScanAppointmentDTO[]> {
    const response = await axios.get(
      `${API_URL}/api/analytics/scan-appointments/radiologist/${radiologistId}/upcoming`,
      { headers: authHeaders() }
    );
    return response.data;
  },

  // Assign radiologist to appointment
  async assignRadiologist(id: string, radiologistId: string): Promise<ScanAppointmentDTO> {
    const response = await axios.post(
      `${API_URL}/api/analytics/scan-appointments/${id}/assign-radiologist?radiologistId=${radiologistId}`,
      {},
      { headers: authHeaders() }
    );
    return response.data;
  },

  // Schedule appointment
  async scheduleAppointment(id: string, radiologistId: string): Promise<ScanAppointmentDTO> {
    const response = await axios.post(
      `${API_URL}/api/analytics/scan-appointments/${id}/schedule?radiologistId=${radiologistId}`,
      {},
      { headers: authHeaders() }
    );
    return response.data;
  },

  // Helper function to get scan type display name
  getScanTypeDisplayName(scanType: ScanTypeValue): string {
    const typeNames: Record<ScanTypeValue, string> = {
      X_RAY: 'X-Ray',
      CT_SCAN: 'CT Scan',
      MRI: 'MRI',
      ULTRASOUND: 'Ultrasound',
      MAMMOGRAM: 'Mammogram',
      BONE_SCAN: 'Bone Scan',
      PET_SCAN: 'PET Scan',
      ANGIOGRAM: 'Angiogram',
      OTHER: 'Other'
    };
    return typeNames[scanType] || scanType;
  },

  // Helper function to get status display name
  getStatusDisplayName(status: AppointmentStatusValue): string {
    const statusNames: Record<AppointmentStatusValue, string> = {
      REQUESTED: 'Requested',
      SCHEDULED: 'Scheduled',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      REJECTED: 'Rejected'
    };
    return statusNames[status] || status;
  },

  // Helper function to get status color
  getStatusColor(status: AppointmentStatusValue): string {
    const statusColors: Record<AppointmentStatusValue, string> = {
      REQUESTED: '#f59e0b',
      SCHEDULED: '#3b82f6',
      IN_PROGRESS: '#8b5cf6',
      COMPLETED: '#10b981',
      CANCELLED: '#ef4444',
      REJECTED: '#ef4444'
    };
    return statusColors[status] || '#6b7280';
  }
};
