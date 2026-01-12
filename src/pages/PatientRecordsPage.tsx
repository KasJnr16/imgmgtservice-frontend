import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients, PatientResponseDTO } from '../services/patients';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

export default function PatientRecordsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState<'all' | 'name' | 'email' | 'dateOfBirth'>('all');
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const patientsData = await getPatients();
      setPatients(patientsData);
      showInfo(`Loaded ${patientsData.length} patient records`);
    } catch (err) {
      showError('Failed to load patient records');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients;

    const searchLower = searchTerm.toLowerCase();
    
    return patients.filter(patient => {
      switch (filterField) {
        case 'name':
          return patient.name.toLowerCase().includes(searchLower);
        case 'email':
          return patient.email.toLowerCase().includes(searchLower);
        case 'dateOfBirth':
          return patient.dateOfBirth.includes(searchTerm);
        case 'all':
        default:
          return (
            patient.name.toLowerCase().includes(searchLower) ||
            patient.email.toLowerCase().includes(searchLower) ||
            patient.dateOfBirth.includes(searchTerm) ||
            patient.address.toLowerCase().includes(searchLower)
          );
      }
    });
  }, [patients, searchTerm, filterField]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <LoadingSpinner size="large" message="Loading patient records..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 32, color: '#0f172a' }}>Patient Records</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: 16 }}>
          Search and filter patient information
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e6efff',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: 8, fontSize: 14 }}>
              Search Patients
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter search term..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #dbeafe',
                borderRadius: 8,
                fontSize: 14,
                background: '#f8fafc',
                boxSizing: 'border-box',
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: 8, fontSize: 14 }}>
              Filter By
            </label>
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #dbeafe',
                borderRadius: 8,
                fontSize: 14,
                background: 'white',
                boxSizing: 'border-box',
              }}
            >
              <option value="all">All Fields</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="dateOfBirth">Date of Birth</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#64748b', fontSize: 14 }}>
            {searchTerm ? (
              <span>Found <strong>{filteredPatients.length}</strong> patient{filteredPatients.length !== 1 ? 's' : ''}</span>
            ) : (
              <span>Showing <strong>{patients.length}</strong> total patient{patients.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                padding: '6px 12px',
                border: '1px solid #dbeafe',
                background: 'white',
                color: '#1d4ed8',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {filteredPatients.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'white',
            border: '1px solid #e6efff',
            borderRadius: 12,
            color: '#64748b',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>
            {searchTerm ? 'No patients found' : 'No patient records'}
          </h3>
          <p style={{ margin: 0, fontSize: 14 }}>
            {searchTerm 
              ? 'Try adjusting your search terms or filters'
              : 'No patient records are available in the system'
            }
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              style={{
                background: 'white',
                border: '1px solid #e6efff',
                borderRadius: 12,
                padding: 20,
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/patient-records/${patient.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.04)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: 18, fontWeight: 700 }}>
                    {patient.name}
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>Email</div>
                      <div style={{ color: '#0f172a', fontSize: 14 }}>{patient.email}</div>
                    </div>
                    
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>Date of Birth</div>
                      <div style={{ color: '#0f172a', fontSize: 14 }}>{patient.dateOfBirth}</div>
                    </div>
                    
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>Address</div>
                      <div style={{ color: '#0f172a', fontSize: 14 }}>{patient.address}</div>
                    </div>
                  </div>
                </div>
                
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#e6efff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1d4ed8',
                  fontSize: 18,
                  fontWeight: 700,
                }}>
                  {patient.name.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          ))}
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
    </div>
  );
}
