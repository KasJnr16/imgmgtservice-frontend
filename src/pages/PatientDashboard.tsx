import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getUserRole } from '../utils/authStorage';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { scanAppointmentService, ScanAppointmentDTO } from '../services/analytics';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const role = getUserRole();
  const { toasts, removeToast, showError } = useToast();

  const [patientId, setPatientId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [scanAppointments, setScanAppointments] = useState<ScanAppointmentDTO[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  useEffect(() => {
    if (role !== 'PATIENT') {
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
        setPatientId(userId);
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
      const appointments = await scanAppointmentService.getAppointmentsForPatient(userId);
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <LoadingSpinner size="large" message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 32, color: '#0f172a' }}>Patient Dashboard</h2>
      <p style={{ margin: '0 0 24px', color: '#475569', lineHeight: 1.6 }}>
        Welcome to your patient portal. Here you can view and manage your medical information.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
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
          onClick={() => navigate('/my-images')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.04)';
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>My Images</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            View and download your medical images and reports.
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
          onClick={() => navigate('/my-health')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.04)';
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>My Health</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            View your records, diagnoses, and generate reports.
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
          onClick={() => navigate('/billing')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.04)';
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>My Bills</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            View and pay your medical billing statements.
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
          onClick={() => navigate('/profile')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.04)';
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>Profile</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            Update your personal information and contact details.
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
            </p>
          </div>
          <button
            onClick={() => navigate('/my-health')}
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
            <div style={{ fontSize: 14 }}>You don't have any scan appointments scheduled</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {scanAppointments.slice(0, 3).map((appointment) => (
              <div
                key={appointment.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 16,
                  background: '#f8fafc',
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                        {scanAppointmentService.getScanTypeDisplayName(appointment.scanType)}
                      </h4>
                      {getStatusBadge(appointment.status)}
                    </div>
                    
                    <div style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>
                      Requested: <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        {formatDate(appointment.requestedAt)}
                      </span>
                      {appointment.scheduledAt && (
                        <span> • Scheduled: <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {formatDate(appointment.scheduledAt)}
                        </span></span>
                      )}
                    </div>
                    
                    <div style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>
                      Doctor: <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        {appointment.doctorName || 'Assigned Doctor'}
                      </span>
                      {appointment.radiologistId && (
                        <span> • Radiologist: <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {appointment.radiologistName || 'Assigned Radiologist'}
                        </span></span>
                      )}
                    </div>
                    
                    <div style={{ fontSize: 14, color: '#0f172a', lineHeight: 1.5 }}>
                      <strong>Reason:</strong> {appointment.scanReason}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {scanAppointments.length > 3 && (
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <button
                  onClick={() => navigate('/my-health')}
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
