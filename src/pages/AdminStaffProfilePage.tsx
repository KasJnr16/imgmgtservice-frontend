import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getUserRole } from '../utils/authStorage';
import { getMedicalStaff, MedicalStaffResponseDTO } from '../services/medicalStaff';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

export default function AdminStaffProfilePage() {
  const navigate = useNavigate();
  const { staffId } = useParams();
  const role = getUserRole();
  const { toasts, removeToast, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<MedicalStaffResponseDTO | null>(null);

  function getErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const statusText = err.response?.statusText;
      const data = err.response?.data;
      const serverMessage = typeof data === 'string' ? data : undefined;

      if (!err.response) return `${fallback} (network/proxy error)`;
      return `${fallback} (${status}${statusText ? ` ${statusText}` : ''})${serverMessage ? `: ${serverMessage}` : ''}`;
    }

    return fallback;
  }

  useEffect(() => {
    if (role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  const load = async () => {
    setLoading(true);
    try {
      if (!staffId) {
        showError('Missing staff id in URL');
        setStaff(null);
        return;
      }

      const all = await getMedicalStaff();
      const found = all.find((s) => s.id === staffId) || null;
      setStaff(found);

      if (!found) {
        showError('Staff member not found');
      }
    } catch (err) {
      setStaff(null);
      showError(getErrorMessage(err, 'Failed to load staff profile'));
    } finally {
      setLoading(false);
    }
  };

  const initials = useMemo(() => {
    const name = staff?.name || '';
    return name ? name.charAt(0).toUpperCase() : 'S';
  }, [staff]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <LoadingSpinner size="large" message="Loading staff profile..." />
      </div>
    );
  }

  if (!staff) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px' }}>
        <div
          style={{
            background: 'white',
            border: '1px solid #e6efff',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <h2 style={{ margin: '0 0 8px', color: '#0f172a' }}>Staff not found</h2>
          <p style={{ margin: '0 0 16px', color: '#64748b' }}>We couldn't load this staff record.</p>
          <button
            type="button"
            onClick={() => navigate('/user-management')}
            style={{
              padding: '10px 16px',
              background: '#1d4ed8',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            Back to User Management
          </button>
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

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 32, color: '#0f172a' }}>Staff Profile (Admin)</h2>
        <p style={{ margin: 0, color: '#64748b' }}>Read-only view of staff details.</p>
      </div>

      <div
        style={{
          background: 'white',
          border: '1px solid #e6efff',
          borderRadius: 18,
          padding: 24,
          boxShadow: '0 18px 46px rgba(15, 23, 42, 0.06)',
        }}
      >
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0f172a, #60a5fa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>{staff.name}</div>
            <div style={{ color: '#64748b', fontSize: 14 }}>{staff.email}</div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>
              Staff ID: <span style={{ color: '#0f172a', fontWeight: 800 }}>{staff.id}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/user-management')}
            style={{
              padding: '10px 14px',
              background: '#1d4ed8',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 900,
            }}
          >
            Back
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 16 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 900, textTransform: 'uppercase' }}>Date of Birth</div>
            <div style={{ fontSize: 14, color: '#0f172a', marginTop: 6, fontWeight: 700 }}>{staff.dateOfBirth || '—'}</div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 900, textTransform: 'uppercase' }}>Address</div>
            <div style={{ fontSize: 14, color: '#0f172a', marginTop: 6, fontWeight: 700 }}>{staff.address || '—'}</div>
          </div>
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
