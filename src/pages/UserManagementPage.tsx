import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients, updatePatient, deletePatient, PatientResponseDTO, PatientRequestDTO } from '../services/patients';
import { getMedicalStaff, createMedicalStaff, updateMedicalStaff, deleteMedicalStaff, MedicalStaffResponseDTO, MedicalStaffRequestDTO } from '../services/medicalStaff';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getUserRole } from '../utils/authStorage';

type TabType = 'patients' | 'staff';

export default function UserManagementPage() {
  const navigate = useNavigate();
  const role = getUserRole();
  const [activeTab, setActiveTab] = useState<TabType>('patients');
  const [patients, setPatients] = useState<PatientResponseDTO[]>([]);
  const [staff, setStaff] = useState<MedicalStaffResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<PatientResponseDTO | null>(null);
  const [editingStaff, setEditingStaff] = useState<MedicalStaffResponseDTO | null>(null);
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();

  useEffect(() => {
    if (role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [patientsData, staffData] = await Promise.all([
        getPatients(),
        getMedicalStaff()
      ]);
      setPatients(patientsData);
      setStaff(staffData);
      showInfo('User data loaded successfully');
    } catch (err) {
      setError('Failed to load user data');
      showError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePatient = async (id: string, payload: PatientRequestDTO) => {
    setActionLoading(true);
    try {
      await updatePatient(id, payload);
      await loadData();
      setEditingPatient(null);
      showSuccess('Patient updated successfully');
    } catch (err) {
      showError('Failed to update patient');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this patient?')) return;
    setActionLoading(true);
    try {
      await deletePatient(id);
      await loadData();
      showSuccess('Patient deleted successfully');
    } catch (err) {
      showError('Failed to delete patient');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateStaff = async (payload: MedicalStaffRequestDTO) => {
    setActionLoading(true);
    try {
      console.log('Creating staff member with payload:', payload);
      const result = await createMedicalStaff(payload);
      console.log('Staff member created successfully:', result);
      await loadData();
      setShowCreateStaff(false);
      showSuccess('Staff member created successfully');
    } catch (err) {
      console.error('Error creating staff member:', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      }
      showError(`Failed to create staff member: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStaff = async (id: string, payload: MedicalStaffRequestDTO) => {
    setActionLoading(true);
    try {
      await updateMedicalStaff(id, payload);
      await loadData();
      setEditingStaff(null);
      showSuccess('Staff member updated successfully');
    } catch (err) {
      showError('Failed to update staff member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    setActionLoading(true);
    try {
      await deleteMedicalStaff(id);
      await loadData();
      showSuccess('Staff member deleted successfully');
    } catch (err) {
      showError('Failed to delete staff member');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <LoadingSpinner size="large" message="Loading user data..." />
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 24px', fontSize: 32, color: '#0f172a' }}>User Management</h2>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#dc2626',
            padding: 12,
            borderRadius: 12,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

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

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('patients')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: activeTab === 'patients' ? '#1d4ed8' : '#f1f5f9',
            color: activeTab === 'patients' ? 'white' : '#475569',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Patients ({patients.length})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: activeTab === 'staff' ? '#1d4ed8' : '#f1f5f9',
            color: activeTab === 'staff' ? 'white' : '#475569',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Medical Staff ({staff.length})
        </button>
      </div>

      {activeTab === 'patients' && (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Patients</h3>
          </div>

          {patients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              No patients found
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  style={{
                    border: '1px solid #e6efff',
                    borderRadius: 12,
                    padding: 16,
                    background: 'white',
                  }}
                >
                  {editingPatient?.id === patient.id ? (
                    <PatientEditForm
                      patient={patient}
                      onSubmit={(payload) => handleUpdatePatient(patient.id, payload)}
                      onCancel={() => setEditingPatient(null)}
                    />
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{patient.name}</div>
                        <div style={{ color: '#64748b', fontSize: 14, marginBottom: 2 }}>{patient.email}</div>
                        <div style={{ color: '#64748b', fontSize: 14, marginBottom: 2 }}>{patient.address}</div>
                        <div style={{ color: '#64748b', fontSize: 14 }}>DOB: {patient.dateOfBirth}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/patients/${patient.id}`)}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #bae6fd',
                            background: 'white',
                            color: '#0284c7',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => setEditingPatient(patient)}
                          disabled={actionLoading}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #dbeafe',
                            background: 'white',
                            color: '#1d4ed8',
                            borderRadius: 6,
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                            fontSize: 13,
                            opacity: actionLoading ? 0.6 : 1,
                          }}
                        >
                          {actionLoading ? <LoadingSpinner size="small" /> : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDeletePatient(patient.id)}
                          disabled={actionLoading}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #fecaca',
                            background: 'white',
                            color: '#dc2626',
                            borderRadius: 6,
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                            fontSize: 13,
                            opacity: actionLoading ? 0.6 : 1,
                          }}
                        >
                          {actionLoading ? <LoadingSpinner size="small" /> : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'staff' && (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Medical Staff</h3>
            <button
              onClick={() => setShowCreateStaff(true)}
              style={{
                padding: '8px 16px',
                background: '#1d4ed8',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Create Staff Member
            </button>
          </div>

          {showCreateStaff && (
            <div style={{ marginBottom: 16 }}>
              <StaffCreateForm
                onSubmit={handleCreateStaff}
                onCancel={() => setShowCreateStaff(false)}
                isLoading={actionLoading}
              />
            </div>
          )}

          {staff.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              No staff members found
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {staff.map((member) => (
                <div
                  key={member.id}
                  style={{
                    border: '1px solid #e6efff',
                    borderRadius: 12,
                    padding: 16,
                    background: 'white',
                  }}
                >
                  {editingStaff?.id === member.id ? (
                    <StaffEditForm
                      staff={member}
                      onSubmit={(payload) => handleUpdateStaff(member.id, payload)}
                      onCancel={() => setEditingStaff(null)}
                    />
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{member.name}</div>
                        <div style={{ color: '#64748b', fontSize: 14, marginBottom: 2 }}>{member.email}</div>
                        <div style={{ color: '#64748b', fontSize: 14, marginBottom: 2 }}>{member.address}</div>
                        <div style={{ color: '#64748b', fontSize: 14 }}>DOB: {member.dateOfBirth}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/staff/${member.id}`)}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #bae6fd',
                            background: 'white',
                            color: '#0284c7',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => setEditingStaff(member)}
                          disabled={actionLoading}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #dbeafe',
                            background: 'white',
                            color: '#1d4ed8',
                            borderRadius: 6,
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                            fontSize: 13,
                            opacity: actionLoading ? 0.6 : 1,
                          }}
                        >
                          {actionLoading ? <LoadingSpinner size="small" /> : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(member.id)}
                          disabled={actionLoading}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #fecaca',
                            background: 'white',
                            color: '#dc2626',
                            borderRadius: 6,
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                            fontSize: 13,
                            opacity: actionLoading ? 0.6 : 1,
                          }}
                        >
                          {actionLoading ? <LoadingSpinner size="small" /> : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PatientEditForm({ patient, onSubmit, onCancel }: {
  patient: PatientResponseDTO;
  onSubmit: (payload: PatientRequestDTO) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: patient.name,
    email: patient.email,
    address: patient.address,
    dateOfBirth: patient.dateOfBirth,
    registeredDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Name"
        style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6 }}
      />
      <input
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
        type="email"
        style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6 }}
      />
      <input
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        placeholder="Address"
        style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6 }}
      />
      <input
        value={formData.dateOfBirth}
        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
        type="date"
        style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          style={{
            padding: '8px 16px',
            background: '#1d4ed8',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            background: '#f1f5f9',
            color: '#475569',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function StaffCreateForm({ onSubmit, onCancel, isLoading }: {
  onSubmit: (payload: MedicalStaffRequestDTO) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    dateOfBirth: '',
    registeredDate: new Date().toISOString().split('T')[0],
    password: '',
    role: 'DOCTOR',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid #e6efff', borderRadius: 12, padding: 16, background: '#f8fafc' }}>
      <h4 style={{ margin: '0 0 12px', color: '#0f172a' }}>Create New Staff Member</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: 4, fontSize: 13 }}>
            Full Name *
          </label>
          <input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter staff member's full name"
            required
            style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6, width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: 4, fontSize: 13 }}>
            Email Address *
          </label>
          <input
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="staff@hospital.com"
            type="email"
            required
            style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6, width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: 4, fontSize: 13 }}>
            Address *
          </label>
          <input
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="123 Medical Center Dr, City, State"
            required
            style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6, width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: 4, fontSize: 13 }}>
            Date of Birth *
          </label>
          <input
            value={formData.dateOfBirth}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            type="date"
            required
            style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6, width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: 4, fontSize: 13 }}>
            Registered Date *
          </label>
          <input
            value={formData.registeredDate}
            onChange={(e) => setFormData({ ...formData, registeredDate: e.target.value })}
            type="date"
            required
            style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6, width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: 4, fontSize: 13 }}>
            Password *
          </label>
          <input
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter secure password"
            type="password"
            required
            style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6, width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: 4, fontSize: 13 }}>
            Role *
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            required
            style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6, background: 'white', width: '100%' }}
          >
            <option value="">Select Role</option>
            <option value="DOCTOR">Doctor</option>
            <option value="RADIOLOGIST">Radiologist</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            background: '#1d4ed8',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {isLoading ? <LoadingSpinner size="small" /> : 'Create Staff Member'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            background: '#f1f5f9',
            color: '#475569',
            border: 'none',
            borderRadius: 6,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function StaffEditForm({ staff, onSubmit, onCancel }: {
  staff: MedicalStaffResponseDTO;
  onSubmit: (payload: MedicalStaffRequestDTO) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: staff.name,
    email: staff.email,
    address: staff.address,
    dateOfBirth: staff.dateOfBirth,
    registeredDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Name"
        style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6 }}
      />
      <input
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
        type="email"
        style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6 }}
      />
      <input
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        placeholder="Address"
        style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6 }}
      />
      <input
        value={formData.dateOfBirth}
        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
        type="date"
        style={{ padding: '8px 12px', border: '1px solid #dbeafe', borderRadius: 6 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          style={{
            padding: '8px 16px',
            background: '#1d4ed8',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            background: '#f1f5f9',
            color: '#475569',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
