import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getUserRole } from '../utils/authStorage';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { scanAppointmentService, ScanAppointmentDTO } from '../services/analytics';
import { getMedicalStaffNameMap, StaffNameMap } from '../services/medicalStaff';
import { getPatient, PatientResponseDTO } from '../services/patients';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const role = getUserRole();
  const { toasts, removeToast, showError } = useToast();

  const [staffId, setStaffId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [scanAppointments, setScanAppointments] = useState<ScanAppointmentDTO[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, { updating: boolean; showActions: boolean }>>({});
  const [staffNameMap, setStaffNameMap] = useState<StaffNameMap>({});
  const [patientNameMap, setPatientNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (role !== 'DOCTOR' && role !== 'RADIOLOGIST') {
      navigate('/dashboard');
      return;
    }

    const token = getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    // Extract user ID from token
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const userId = payload?.id as string;
      if (userId) {
        setStaffId(userId);
        loadScanAppointments(userId);
      }
    } catch (err) {
      showError('Invalid session token');
      navigate('/login');
    }
  }, [role, navigate]);

  const loadScanAppointments = async (userId: string) => {
    setAppointmentsLoading(true);
    try {
      let appointments: ScanAppointmentDTO[] = [];
      
      if (role === 'DOCTOR') {
        appointments = await scanAppointmentService.getAppointmentsForDoctor(userId);
      } else if (role === 'RADIOLOGIST') {
        appointments = await scanAppointmentService.getAppointmentsForRadiologist(userId);
      }
      
      // Load staff names for doctors and radiologists
      const staffIds = Array.from(new Set(
        appointments
          .map(a => [a.doctorId, a.radiologistId].filter(Boolean))
          .flat()
          .filter((id): id is string => id !== undefined)
      ));
      
      // Load patient names separately
      const patientIds = Array.from(new Set(
        appointments
          .map(a => a.patientId)
          .filter((id): id is string => id !== undefined)
      ));
      
      // Load staff names
      if (staffIds.length > 0) {
        try {
          const nameMap = await getMedicalStaffNameMap(staffIds);
          setStaffNameMap(nameMap);
        } catch (error) {
          console.error('Failed to load staff names:', error);
        }
      }
      
      // Load patient names
      if (patientIds.length > 0) {
        try {
          const patientPromises = patientIds.map(async (patientId) => {
            try {
              const patient = await getPatient(patientId);
              return { id: patientId, name: patient.name };
            } catch (error) {
              console.error(`Failed to load patient ${patientId}:`, error);
              return { id: patientId, name: 'Unknown Patient' };
            }
          });
          
          const patientResults = await Promise.all(patientPromises);
          const patientMap = patientResults.reduce((acc, { id, name }) => {
            acc[id] = name;
            return acc;
          }, {} as Record<string, string>);
          
          setPatientNameMap(patientMap);
        } catch (error) {
          console.error('Failed to load patient names:', error);
        }
      }
      
      setScanAppointments(appointments);
    } catch (err) {
      showError('Failed to load scan appointments');
    } finally {
      setAppointmentsLoading(false);
      setLoading(false);
    }
  };

  const getStatusBadge = (status: any) => {
    const colors: Record<string, string> = {
      REQUESTED: '#f59e0b',
      SCHEDULED: '#3b82f6',
      IN_PROGRESS: '#8b5cf6',
      COMPLETED: '#10b981',
      CANCELLED: '#ef4444',
      REJECTED: '#ef4444'
    };

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 10px',
          borderRadius: 999,
          background: colors[status as string] || '#6b7280',
          color: 'white',
          fontSize: 12,
          fontWeight: 900
        }}
      >
        {scanAppointmentService.getStatusDisplayName(status)}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    setStatusUpdates(prev => ({ ...prev, [appointmentId]: { ...prev[appointmentId], updating: true } }));
    try {
      const token = getToken();
      if (!token) {
        showError('Authentication required');
        return;
      }
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const userId = payload?.id as string;
      
      const appointment = scanAppointments.find(a => a.id === appointmentId);
      if (!appointment) {
        showError('Appointment not found');
        return;
      }
      
      await scanAppointmentService.updateAppointment(appointmentId, {
        status: newStatus as any,
        notes: appointment.notes
      }, userId);
      
      // Reload appointments
      await loadScanAppointments(userId);
    } catch (err) {
      showError('Failed to update status');
    } finally {
      setStatusUpdates(prev => ({ ...prev, [appointmentId]: { ...prev[appointmentId], updating: false, showActions: false } }));
    }
  };

  const toggleStatusActions = (appointmentId: string) => {
    setStatusUpdates(prev => ({
      ...prev,
      [appointmentId]: {
        updating: false,
        showActions: !prev[appointmentId]?.showActions
      }
    }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <LoadingSpinner size="large" message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 32, color: '#0f172a' }}>
        {role === 'DOCTOR' ? 'Doctor' : 'Radiologist'} Dashboard
      </h2>
      <p style={{ margin: '0 0 24px', color: '#475569', lineHeight: 1.6 }}>
        Welcome to the staff portal. Manage patient records and imaging workflows.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e6efff',
            background: 'white',
            padding: 20,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onClick={() => navigate('/patient-records')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.04)';
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>Patient Records</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            Search and filter patient information by name, email, date of birth, and more.
          </p>
        </div>

        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e6efff',
            background: 'white',
            padding: 20,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onClick={() => navigate('/image-review')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.04)';
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>Image Upload</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            Upload and manage medical images for patients.
          </p>
        </div>

        {role === 'RADIOLOGIST' && (
          <div
            style={{
              borderRadius: 16,
              border: '1px solid #e6efff',
              background: 'white',
              padding: 20,
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onClick={() => navigate('/radiologist-dashboard')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.04)';
            }}
          >
            <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>Scan Management</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
              Manage scan appointments and upload images.
            </p>
          </div>
        )}

        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e6efff',
            background: 'white',
            padding: 20,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onClick={() => navigate('/staff/reports')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.04)';
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>Reports</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            Generate and manage radiology reports and analytics.
          </p>
        </div>
      </div>

      {/* Scan Appointments Section */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e6efff',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 20, color: '#0f172a', fontWeight: 900 }}>
              Your Scan Appointments
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
              {scanAppointments.length} scan appointment{scanAppointments.length !== 1 ? 's' : ''}
              {role === 'DOCTOR' ? ' you requested' : ' assigned to you'}
            </p>
          </div>
          <button
            onClick={() => role === 'RADIOLOGIST' ? navigate('/radiologist-dashboard') : navigate('/my-health')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #dbeafe',
              background: '#eff6ff',
              color: '#1d4ed8',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14
            }}
          >
            View All
          </button>
        </div>

        {appointmentsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <LoadingSpinner size="small" message="Loading appointments..." />
          </div>
        ) : scanAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>No scan appointments</div>
            <div style={{ fontSize: 14 }}>
              {role === 'DOCTOR' ? "You haven't requested any scans" : "No appointments assigned to you"}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {scanAppointments.slice(0, 3).map((appointment) => {
              const appointmentStatus = statusUpdates[appointment.id] || { updating: false, showActions: false };

              return (
                <div
                  key={appointment.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: 16,
                    background: 'white',
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  {/* Header with Patient Name and Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ minWidth: 240 }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
                        {scanAppointmentService.getScanTypeDisplayName(appointment.scanType)}
                      </div>
                      <div style={{ marginTop: 4, fontWeight: 900, color: '#0f172a', fontSize: 16 }}>
                        Requested for {patientNameMap[appointment.patientId] || appointment.patientName || 'Unknown Patient'}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 14, color: '#64748b', fontWeight: 700 }}>
                        {staffNameMap[appointment.doctorId] || appointment.doctorName || 'Unknown Doctor'}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 13, color: '#64748b' }}>
                        Scan Appointment
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {getStatusBadge(appointment.status)}
                      {role === 'RADIOLOGIST' && (
                        <button
                          onClick={() => toggleStatusActions(appointment.id)}
                          disabled={appointmentStatus.updating}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid #dbeafe',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            cursor: appointmentStatus.updating ? 'not-allowed' : 'pointer',
                            fontSize: 11,
                            fontWeight: 700
                          }}
                        >
                          {appointmentStatus.updating ? 'Updating...' : 'Change Status'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status Actions Dropdown */}
                  {appointmentStatus.showActions && role === 'RADIOLOGIST' && (
                    <div style={{
                      border: '1px solid #dbeafe',
                      borderRadius: 8,
                      background: '#f8fafc',
                      padding: 8,
                      display: 'grid',
                      gap: 4
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', marginBottom: 4 }}>Update Status:</div>
                      {['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].filter(status => status !== appointment.status).map(status => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(appointment.id, status)}
                          disabled={appointmentStatus.updating}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            background: 'white',
                            color: '#0f172a',
                            cursor: appointmentStatus.updating ? 'not-allowed' : 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            textAlign: 'left'
                          }}
                        >
                          {scanAppointmentService.getStatusDisplayName(status as any)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timeline Information */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      Requested: <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        {formatDate(appointment.requestedAt)}
                      </span>
                    </div>
                    {appointment.scheduledAt && (
                      <div style={{ color: '#64748b', fontSize: 12 }}>
                        Scheduled: <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {formatDate(appointment.scheduledAt)}
                        </span>
                      </div>
                    )}
                    {appointment.completedAt && (
                      <div style={{ color: '#64748b', fontSize: 12 }}>
                        Completed: <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {formatDate(appointment.completedAt)}
                        </span>
                      </div>
                    )}
                    {appointment.feeAmount && (
                      <div style={{ color: '#64748b', fontSize: 12 }}>
                        Fee: <span style={{ fontWeight: 700, color: '#0f172a' }}>${appointment.feeAmount}</span>
                      </div>
                    )}
                  </div>

                  {/* Staff Information */}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'grid', gap: 2 }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Requesting Doctor</div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>
                        {staffNameMap[appointment.doctorId] || appointment.doctorName || 'Unknown Doctor'}
                      </div>
                    </div>
                    {role === 'DOCTOR' && appointment.radiologistId && (
                      <div style={{ display: 'grid', gap: 2 }}>
                        <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Assigned Radiologist</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>
                          {staffNameMap[appointment.radiologistId] || appointment.radiologistName || 'Unknown Radiologist'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scan Reason */}
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Reason for Scan</div>
                    <div style={{ color: '#0f172a', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {appointment.scanReason}
                    </div>
                  </div>

                  {/* Additional Notes */}
                  {appointment.notes && (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Additional Notes</div>
                      <div style={{ color: '#0f172a', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {appointment.notes}
                      </div>
                    </div>
                  )}

                  {/* Image Status */}
                  {appointment.imageFilePath && (
                    <div style={{ padding: 8, background: '#dcfce7', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: '#166534', marginBottom: 4 }}>
                        ✅ Scan Image Available
                      </div>
                      <div style={{ fontSize: 13, color: '#166534' }}>
                        {appointment.imageUploadedAt ? `Uploaded: ${formatDate(appointment.imageUploadedAt)}` : 'Recently uploaded'}
                      </div>
                      <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                        File: {appointment.imageFilePath}
                      </div>
                    </div>
                  )}

                  {/* Medical Record Reference */}
                  <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                    Medical Record ID: {appointment.medicalRecordId?.slice(0, 8)}...{appointment.medicalRecordId?.slice(-4)}
                  </div>
                </div>
              );
            })}
            
            {scanAppointments.length > 3 && (
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <button
                  onClick={() => role === 'RADIOLOGIST' ? navigate('/radiologist-dashboard') : navigate('/my-health')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #dbeafe',
                    background: 'white',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 14
                  }}
                >
                  View {scanAppointments.length - 3} more appointment{scanAppointments.length - 3 !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
