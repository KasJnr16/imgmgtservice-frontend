import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getUserRole } from '../utils/authStorage';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { scanAppointmentService, ScanAppointmentDTO, AppointmentStatusValue } from '../services/analytics';
import { getMedicalStaffNameMap, StaffNameMap } from '../services/medicalStaff';
import { getPatient, PatientResponseDTO } from '../services/patients';

export default function RadiologistDashboard() {
  const navigate = useNavigate();
  const role = getUserRole();
  const { toasts, removeToast, showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [unassignedScans, setUnassignedScans] = useState<ScanAppointmentDTO[]>([]);
  const [myAppointments, setMyAppointments] = useState<ScanAppointmentDTO[]>([]);
  const [activeTab, setActiveTab] = useState<'unassigned' | 'my-appointments'>('unassigned');
  const [refreshing, setRefreshing] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, { updating: boolean; showActions: boolean }>>({});
  const [staffNameMap, setStaffNameMap] = useState<StaffNameMap>({});
  const [patientNameMap, setPatientNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    console.log('RadiologistDashboard - Role:', role);
    if (role !== 'RADIOLOGIST') {
      console.log('Redirecting to dashboard - role is not RADIOLOGIST');
      navigate('/dashboard');
      return;
    }

    const token = getToken();
    if (!token) {
      console.log('No token found, redirecting to login');
      navigate('/login');
      return;
    }

    // Extract user ID from token
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const userId = payload?.id as string;
      console.log('User ID extracted:', userId);
      if (userId) {
        console.log('Loading dashboard data...');
        loadDashboardData(userId);
      }
    } catch (err) {
      console.error('Token parsing error:', err);
      showError('Invalid session token');
      navigate('/login');
    }
  }, [role, navigate]);

  const loadDashboardData = async (radiologistId: string) => {
    console.log('loadDashboardData called with radiologistId:', radiologistId);
    setLoading(true);
    try {
      console.log('Fetching unassigned scans and appointments...');
      const [unassigned, myAppts] = await Promise.all([
        scanAppointmentService.getUnassignedRequestedScans(),
        scanAppointmentService.getAppointmentsForRadiologist(radiologistId)
      ]);
      
      console.log('Unassigned scans:', unassigned.length, unassigned);
      console.log('My appointments:', myAppts.length, myAppts);
      
      setUnassignedScans(unassigned);
      setMyAppointments(myAppts);
      
      // Load staff names for all appointments
      const allAppointments = [...unassigned, ...myAppts];
      
      // Load staff names for doctors and radiologists
      const staffIds = Array.from(new Set(
        allAppointments
          .map(a => [a.doctorId, a.radiologistId].filter(Boolean))
          .flat()
          .filter((id): id is string => id !== undefined)
      ));
      
      // Load patient names separately
      const patientIds = Array.from(new Set(
        allAppointments
          .map(a => a.patientId)
          .filter((id): id is string => id !== undefined)
      ));
      
      // Load staff names
      if (staffIds.length > 0) {
        try {
          const nameMap = await getMedicalStaffNameMap(staffIds);
          console.log('Staff name map loaded:', nameMap);
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
          
          console.log('Patient name map loaded:', patientMap);
          setPatientNameMap(patientMap);
        } catch (error) {
          console.error('Failed to load patient names:', error);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      showError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const token = getToken();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1] || ''));
        const userId = payload?.id as string;
        if (userId) {
          await loadDashboardData(userId);
        }
      }
    } catch (err) {
      showError('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAssignToMe = async (appointmentId: string) => {
    try {
      const token = getToken();
      if (!token) return;

      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const radiologistId = payload?.id as string;

      await scanAppointmentService.assignRadiologist(appointmentId, radiologistId);
      showSuccess('Appointment assigned to you');
      await handleRefresh();
    } catch (err) {
      showError('Failed to assign appointment');
    }
  };

  const handleScheduleAppointment = async (appointmentId: string) => {
    try {
      const token = getToken();
      if (!token) return;

      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const radiologistId = payload?.id as string;

      await scanAppointmentService.scheduleAppointment(appointmentId, radiologistId);
      showSuccess('Appointment scheduled');
      await handleRefresh();
    } catch (err) {
      showError('Failed to schedule appointment');
    }
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
      
      const appointment = [...unassignedScans, ...myAppointments].find(a => a.id === appointmentId);
      if (!appointment) {
        showError('Appointment not found');
        return;
      }
      
      await scanAppointmentService.updateAppointment(appointmentId, {
        status: newStatus as any,
        notes: appointment.notes
      }, userId);
      
      showSuccess('Status updated successfully');
      await handleRefresh();
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: AppointmentStatusValue) => {
    const colors: Record<AppointmentStatusValue, string> = {
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
          background: colors[status] || '#6b7280',
          color: 'white',
          fontSize: 12,
          fontWeight: 900
        }}
      >
        {scanAppointmentService.getStatusDisplayName(status)}
      </span>
    );
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 32, color: '#0f172a' }}>Radiologist Dashboard</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: 16 }}>
          Manage medical scan appointments and upload images
        </p>
      </div>

      <div
        style={{
          background: 'white',
          border: '1px solid #e6efff',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, color: '#0f172a', fontWeight: 900 }}>
              Scan Appointments
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
              {unassignedScans.length} unassigned requests • {myAppointments.length} my appointments
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid #dbeafe',
              background: '#eff6ff',
              color: '#1d4ed8',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              fontWeight: 900,
              fontSize: 14
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, borderBottom: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab('unassigned')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: activeTab === 'unassigned' ? '#1d4ed8' : 'transparent',
              color: activeTab === 'unassigned' ? 'white' : '#64748b',
              cursor: 'pointer',
              fontWeight: 900,
              fontSize: 14,
              borderRadius: '8px 8px 0 0'
            }}
          >
            Unassigned Requests ({unassignedScans.length})
          </button>
          <button
            onClick={() => setActiveTab('my-appointments')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: activeTab === 'my-appointments' ? '#1d4ed8' : 'transparent',
              color: activeTab === 'my-appointments' ? 'white' : '#64748b',
              cursor: 'pointer',
              fontWeight: 900,
              fontSize: 14,
              borderRadius: '8px 8px 0 0'
            }}
          >
            My Appointments ({myAppointments.length})
          </button>
        </div>

        <div style={{ padding: '16px 0' }}>
          {activeTab === 'unassigned' && (
            <div>
              {unassignedScans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>No unassigned scan requests</div>
                  <div style={{ fontSize: 14 }}>All scan requests have been assigned to radiologists</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {unassignedScans.map((appointment) => {
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
                              Scan Request
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {getStatusBadge(appointment.status)}
                            <button
                              onClick={() => handleAssignToMe(appointment.id)}
                              disabled={appointmentStatus.updating}
                              style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: 'none',
                                background: appointmentStatus.updating ? '#94a3b8' : '#3b82f6',
                                color: 'white',
                                cursor: appointmentStatus.updating ? 'not-allowed' : 'pointer',
                                fontWeight: 700,
                                fontSize: 14
                              }}
                            >
                              {appointmentStatus.updating ? 'Assigning...' : 'Assign to Me'}
                            </button>
                          </div>
                        </div>

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

                        {/* Medical Record Reference */}
                        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                          Medical Record ID: {appointment.medicalRecordId?.slice(0, 8)}...{appointment.medicalRecordId?.slice(-4)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'my-appointments' && (
            <div>
              {myAppointments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>No appointments assigned</div>
                  <div style={{ fontSize: 14 }}>You haven't been assigned any scan appointments yet</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {myAppointments.map((appointment) => {
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
                              My Appointment
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {getStatusBadge(appointment.status)}
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
                          </div>
                        </div>

                        {/* Status Actions Dropdown */}
                        {appointmentStatus.showActions && (
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

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {appointment.status === 'REQUESTED' && (
                            <button
                              onClick={() => handleScheduleAppointment(appointment.id)}
                              style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: 'none',
                                background: '#3b82f6',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: 14
                              }}
                            >
                              Schedule
                            </button>
                          )}
                          
                          {appointment.status === 'SCHEDULED' && (
                            <button
                              onClick={() => {/* TODO: Implement upload image functionality */}}
                              style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: 'none',
                                background: '#10b981',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: 14
                              }}
                            >
                              Upload Image
                            </button>
                          )}
                        </div>

                        {/* Medical Record Reference */}
                        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                          Medical Record ID: {appointment.medicalRecordId?.slice(0, 8)}...{appointment.medicalRecordId?.slice(-4)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
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
