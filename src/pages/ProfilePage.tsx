import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserRole, getToken } from '../utils/authStorage';
import { getPatient } from '../services/patients';
import { getMedicalStaffById } from '../services/medicalStaff';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  address: string;
  dateOfBirth: string;
  role: string;
  registeredDate?: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const { toasts, removeToast, showSuccess, showError } = useToast();

  function getErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const statusText = err.response?.statusText;
      const data = err.response?.data;

      const serverMessage =
        typeof data === 'string'
          ? data
          : (data && typeof data === 'object' && 'message' in data && typeof (data as any).message === 'string')
            ? (data as any).message
            : undefined;

      if (!err.response) {
        return `${fallback} (network/proxy error)`;
      }

      return `${fallback} (${status}${statusText ? ` ${statusText}` : ''})${serverMessage ? `: ${serverMessage}` : ''}`;
    }

    return fallback;
  }

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      // Decode JWT to get user id
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userRole = getUserRole();
      const userId = payload.id || '';

      if (!userId) {
        showError('Missing user id in token. Please log out and log in again.');
        return;
      }

      if (userRole === 'PATIENT') {
        const patientData = await getPatient(userId);

        const profileData: UserProfile = {
          id: patientData.id,
          name: patientData.name,
          email: patientData.email,
          address: patientData.address,
          dateOfBirth: patientData.dateOfBirth,
          role: userRole,
          registeredDate: payload.registeredDate,
        };

        setProfile(profileData);
        setFormData({
          name: profileData.name || '',
          address: profileData.address || '',
        });
        return;
      }

      if (userRole === 'DOCTOR' || userRole === 'RADIOLOGIST') {
        const staffData = await getMedicalStaffById(userId);

        const profileData: UserProfile = {
          id: staffData.id,
          name: staffData.name,
          email: staffData.email,
          address: staffData.address,
          dateOfBirth: staffData.dateOfBirth,
          role: userRole,
          registeredDate: payload.registeredDate,
        };

        setProfile(profileData);
        setFormData({
          name: profileData.name || '',
          address: profileData.address || '',
        });
        return;
      }

      navigate('/dashboard');
      return;
    } catch (error) {
      console.error('Failed to load profile information:', error);
      showError(getErrorMessage(error, 'Failed to load profile information'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      name: profile?.name || '',
      address: profile?.address || '',
    });
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      showError('Name is required');
      return;
    }

    try {
      // TODO: Implement actual API call to update profile
      // For now, just update local state
      setProfile(prev => prev ? { ...prev, ...formData } : null);
      setEditing(false);
      showSuccess('Profile updated successfully');
    } catch (error) {
      showError('Failed to update profile');
    }
  };

  const handleInputChange = (field: keyof UserProfile) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <LoadingSpinner size="large" message="Loading profile..." />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h3 style={{ color: '#0f172a', marginBottom: 16 }}>Profile not found</h3>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '10px 20px',
            background: '#1d4ed8',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 32, color: '#0f172a' }}>My Profile</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: 16 }}>
          Manage your personal information and account details
        </p>
      </div>

      <div
        style={{
          background: 'white',
          border: '1px solid #e6efff',
          borderRadius: 18,
          padding: 32,
          boxShadow: '0 18px 46px rgba(15, 23, 42, 0.06)',
        }}
      >
        {/* Profile Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            {profile.name.charAt(0).toUpperCase()}
          </div>
          
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 4px', color: '#0f172a', fontSize: 24, fontWeight: 700 }}>
              {profile.name}
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
              {profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase()}
            </p>
          </div>

          {!editing && (
            <button
              onClick={handleEdit}
              style={{
                padding: '10px 20px',
                background: '#1d4ed8',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e40af')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Profile Information */}
        <div style={{ display: 'grid', gap: 24 }}>
          {/* Email (Read-only) */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, color: '#64748b', marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Email Address
            </label>
            <div style={{
              padding: '14px 16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              color: '#64748b',
              fontSize: 15,
            }}>
              {profile.email}
            </div>
          </div>

          {/* Name (Editable) */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, color: '#64748b', marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Full Name
            </label>
            {editing ? (
              <input
                type="text"
                value={formData.name || ''}
                onChange={handleInputChange('name')}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid #dbeafe',
                  borderRadius: 12,
                  fontSize: 15,
                  background: '#f8fafc',
                  boxSizing: 'border-box',
                }}
              />
            ) : (
              <div style={{
                padding: '14px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                color: '#0f172a',
                fontSize: 15,
              }}>
                {profile.name}
              </div>
            )}
          </div>

          {/* Address (Editable) */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, color: '#64748b', marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Address
            </label>
            {editing ? (
              <textarea
                value={formData.address || ''}
                onChange={handleInputChange('address')}
                rows={3}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid #dbeafe',
                  borderRadius: 12,
                  fontSize: 15,
                  background: '#f8fafc',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            ) : (
              <div style={{
                padding: '14px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                color: '#0f172a',
                fontSize: 15,
                minHeight: '60px',
              }}>
                {profile.address || 'No address provided'}
              </div>
            )}
          </div>

          {/* Date of Birth (Read-only) */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, color: '#64748b', marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Date of Birth
            </label>
            <div style={{
              padding: '14px 16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              color: '#64748b',
              fontSize: 15,
            }}>
              {profile.dateOfBirth || 'Not provided'}
            </div>
          </div>

          {/* Registered Date (Read-only) */}
          {profile.registeredDate && (
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#64748b', marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Member Since
              </label>
              <div style={{
                padding: '14px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                color: '#64748b',
                fontSize: 15,
              }}>
                {new Date(profile.registeredDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {editing && (
          <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'flex-end' }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '12px 24px',
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
              }}
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
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
