import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken, getUserRole } from '../utils/authStorage';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getPatients, PatientResponseDTO } from '../services/patients';
import { uploadImage } from '../services/images';
import { getDiagnosesByPatient, DiagnosisDTO, getMedicalRecordsByPatient, MedicalRecordDTO } from '../services/analytics';

export default function ImageReviewPage() {
  const navigate = useNavigate();
  const role = getUserRole();
  const { toasts, removeToast, showError, showSuccess, showInfo } = useToast();

  const [patients, setPatients] = useState<PatientResponseDTO[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientResponseDTO[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [imageType, setImageType] = useState('');
  const [diseaseTag, setDiseaseTag] = useState('');
  const [diagnosisId, setDiagnosisId] = useState('');
  const [medicalRecordId, setMedicalRecordId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [diagnoses, setDiagnoses] = useState<DiagnosisDTO[]>([]);
  const [records, setRecords] = useState<MedicalRecordDTO[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

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
    if (role === 'PATIENT') {
      navigate('/dashboard');
      return;
    }

    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await getPatients();
      setPatients(data);
      setFilteredPatients(data);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to load patients'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = patients.filter((patient) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        patient.name.toLowerCase().includes(searchLower) ||
        patient.email.toLowerCase().includes(searchLower) ||
        patient.address.toLowerCase().includes(searchLower) ||
        patient.dateOfBirth.includes(searchTerm)
      );
    });
    setFilteredPatients(filtered);
  }, [patients, searchTerm]);

  const selectedPatient = useMemo(() => patients.find((p) => p.id === patientId) || null, [patients, patientId]);

  useEffect(() => {
    if (patientId) {
      loadPatientAnalytics();
    } else {
      setDiagnoses([]);
      setRecords([]);
      setDiagnosisId('');
      setMedicalRecordId('');
    }
  }, [patientId]);

  const loadPatientAnalytics = async () => {
    if (!patientId) return;
    setLoadingRecords(true);
    try {
      const [diagData, recData] = await Promise.all([
        getDiagnosesByPatient(patientId).catch(() => []),
        getMedicalRecordsByPatient(patientId).catch(() => []),
      ]);
      setDiagnoses(diagData);
      setRecords(recData);
    } catch (err) {
      // Silently ignore; optional fields
    } finally {
      setLoadingRecords(false);
    }
  };

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (role !== 'RADIOLOGIST') {
      showError('Only Radiologists can upload images.');
      return;
    }

    const token = getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const staffId = payload.id || '';

    if (!staffId) {
      showError('Missing staff id in token. Please log out and log in again.');
      return;
    }

    if (!patientId) {
      showError('Select a patient');
      return;
    }

    if (!file) {
      showError('Select an image file');
      return;
    }

    setSubmitting(true);
    try {
      await uploadImage(file, {
        patientId,
        staffId,
        imageType: imageType.trim() || undefined,
        diseaseTag: diseaseTag.trim() || undefined,
        diagnosisId: diagnosisId || undefined,
        medicalRecordId: medicalRecordId || undefined,
      });

      showSuccess('Image uploaded successfully');
      setImageType('');
      setDiseaseTag('');
      setDiagnosisId('');
      setMedicalRecordId('');
      setFile(null);
      const input = document.getElementById('image-file-input') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to upload image'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <LoadingSpinner size="large" message="Loading image review..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 32, color: '#0f172a' }}>Image Review</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: 16 }}>
          {role === 'RADIOLOGIST'
            ? 'Upload images and assign them to patients.'
            : 'Doctors can only view images for assigned patients. Upload is restricted to Radiologists.'}
        </p>
      </div>

      {role !== 'RADIOLOGIST' ? (
        <div
          style={{
            background: 'white',
            border: '1px solid #e6efff',
            borderRadius: 16,
            padding: 20,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            color: '#64748b',
          }}
        >
          <div style={{ fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Upload not available</div>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            If you are a Doctor, open a patient from Patient Records and use the Doctor View tab to see images for that patient.
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/patient-records')}
              style={{
                padding: '10px 14px',
                background: '#1d4ed8',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 800,
              }}
            >
              Go to Patient Records
            </button>
            <button
              type="button"
              onClick={() => showInfo('If you need upload access, log in as a Radiologist.')}
              style={{
                padding: '10px 14px',
                background: '#f1f5f9',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 800,
              }}
            >
              Learn more
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={onUpload}
          style={{
            background: 'white',
            border: '1px solid #e6efff',
            borderRadius: 16,
            padding: 20,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Patient</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, address, or DOB..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #dbeafe',
                  borderRadius: 10,
                  background: '#f8fafc',
                  boxSizing: 'border-box',
                  marginBottom: 8,
                  fontSize: 14
                }}
              />
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #dbeafe',
                  borderRadius: 10,
                  background: 'white',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">Select patient...</option>
                {filteredPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.email})
                  </option>
                ))}
              </select>
              {searchTerm && filteredPatients.length === 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444' }}>
                  No patients found matching "{searchTerm}"
                </div>
              )}
              {searchTerm && filteredPatients.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#10b981' }}>
                  {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} found
                </div>
              )}
              {selectedPatient && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                  DOB: {selectedPatient.dateOfBirth} | {selectedPatient.address}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Image Type</label>
              <input
                value={imageType}
                onChange={(e) => setImageType(e.target.value)}
                placeholder="e.g. X-Ray, MRI"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #dbeafe',
                  borderRadius: 10,
                  background: '#f8fafc',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Disease Tag</label>
              <input
                value={diseaseTag}
                onChange={(e) => setDiseaseTag(e.target.value)}
                placeholder="e.g. Pneumonia"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #dbeafe',
                  borderRadius: 10,
                  background: '#f8fafc',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {patientId && (
              <>
                <div>
                  <label style={{ display: 'block', fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Link to Diagnosis (optional)</label>
                  <select
                    value={diagnosisId}
                    onChange={(e) => {
                      setDiagnosisId(e.target.value);
                      if (e.target.value) setMedicalRecordId(''); // mutually exclusive for now
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #dbeafe',
                      borderRadius: 10,
                      background: 'white',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">None</option>
                    {diagnoses.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.diseaseName} ({new Date(d.diagnosisDate || '').toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Link to Medical Record (optional)</label>
                  <select
                    value={medicalRecordId}
                    onChange={(e) => {
                      setMedicalRecordId(e.target.value);
                      if (e.target.value) setDiagnosisId(''); // mutually exclusive for now
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #dbeafe',
                      borderRadius: 10,
                      background: 'white',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">None</option>
                    {records.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.chiefComplaint || 'Visit note'} ({new Date(r.recordDate || r.createdAt || '').toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>File</label>
              <input
                id="image-file-input"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={loadPatients}
              disabled={submitting}
              style={{
                padding: '10px 14px',
                background: '#f1f5f9',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontWeight: 800,
              }}
            >
              Reload Patients
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 14px',
                background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontWeight: 900,
              }}
            >
              {submitting ? 'Uploading...' : 'Upload & Assign'}
            </button>
          </div>
        </form>
      )}

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
