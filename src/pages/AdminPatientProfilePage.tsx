import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getUserRole } from '../utils/authStorage';
import { getPatient, PatientResponseDTO } from '../services/patients';
import { downloadImage, getImagesByPatient, MedicalImageDTO } from '../services/images';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

export default function AdminPatientProfilePage() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const role = getUserRole();
  const { toasts, removeToast, showError, showInfo } = useToast();

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientResponseDTO | null>(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [images, setImages] = useState<MedicalImageDTO[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
  }, [patientId]);

  const load = async () => {
    setLoading(true);
    try {
      if (!patientId) {
        showError('Missing patient id in URL');
        setPatient(null);
        return;
      }

      const data = await getPatient(patientId);
      setPatient(data);
    } catch (err) {
      setPatient(null);
      showError(getErrorMessage(err, 'Failed to load patient profile'));
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async () => {
    if (!patientId) return;
    setImagesLoading(true);
    try {
      const data = await getImagesByPatient(patientId);
      setImages(data);
      showInfo(`Loaded ${data.length} image record${data.length === 1 ? '' : 's'}`);
    } catch (err) {
      setImages([]);
      showError(getErrorMessage(err, 'Failed to load images'));
    } finally {
      setImagesLoading(false);
    }
  };

  const handleDownload = async (image: MedicalImageDTO) => {
    setDownloadingId(image.id);
    try {
      const blob = await downloadImage(image.id);
      const ext = (image.contentType || '').includes('jpeg')
        ? 'jpg'
        : (image.contentType || '').includes('png')
          ? 'png'
          : 'bin';
      const filename = `medical-image-${image.id}.${ext}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to download image'));
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <LoadingSpinner size="large" message="Loading patient profile..." />
      </div>
    );
  }

  if (!patient) {
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
          <h2 style={{ margin: '0 0 8px', color: '#0f172a' }}>Patient not found</h2>
          <p style={{ margin: '0 0 16px', color: '#64748b' }}>We couldn't load this patient record.</p>
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
        <h2 style={{ margin: '0 0 6px', fontSize: 32, color: '#0f172a' }}>Patient Profile (Admin)</h2>
        <p style={{ margin: 0, color: '#64748b' }}>Read-only view of patient details and images.</p>
      </div>

      <div
        style={{
          background: 'white',
          border: '1px solid #e6efff',
          borderRadius: 18,
          padding: 24,
          boxShadow: '0 18px 46px rgba(15, 23, 42, 0.06)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            {patient.name.charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>{patient.name}</div>
            <div style={{ color: '#64748b', fontSize: 14 }}>{patient.email}</div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>
              Patient ID: <span style={{ color: '#0f172a', fontWeight: 800 }}>{patient.id}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/user-management')}
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
              Back
            </button>
            <button
              type="button"
              onClick={loadImages}
              disabled={imagesLoading}
              style={{
                padding: '10px 14px',
                background: '#1d4ed8',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                cursor: imagesLoading ? 'not-allowed' : 'pointer',
                fontWeight: 900,
              }}
            >
              {imagesLoading ? 'Loading...' : `Load Images (${images.length})`}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 16 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 900, textTransform: 'uppercase' }}>Date of Birth</div>
            <div style={{ fontSize: 14, color: '#0f172a', marginTop: 6, fontWeight: 700 }}>{patient.dateOfBirth || '—'}</div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 900, textTransform: 'uppercase' }}>Address</div>
            <div style={{ fontSize: 14, color: '#0f172a', marginTop: 6, fontWeight: 700 }}>{patient.address || '—'}</div>
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'white',
          border: '1px solid #e6efff',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        }}
      >
        {imagesLoading ? (
          <div style={{ padding: 20 }}>
            <LoadingSpinner size="small" message="Loading images..." />
          </div>
        ) : images.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
            <div style={{ fontSize: 13, marginBottom: 12, fontWeight: 800, color: '#94a3b8' }}>No images</div>
            <div style={{ fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>No images loaded</div>
            <div style={{ fontSize: 14 }}>Click “Load Images” to retrieve images for this patient.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 0 }}>
            {images.map((img) => (
              <div
                key={img.id}
                style={{
                  padding: 16,
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <div style={{ minWidth: 260, flex: 1 }}>
                  <div style={{ fontWeight: 900, color: '#0f172a' }}>{img.imageType || 'Medical Image'}</div>
                  <div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>
                    Tag: <span style={{ color: '#0f172a', fontWeight: 800 }}>{img.diseaseTag || '—'}</span>
                    {' | '}Uploaded By: <span style={{ color: '#0f172a', fontWeight: 800 }}>{img.uploadedByStaffId || '—'}</span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                    Uploaded: {formatDate(img.uploadedAt)} | Type: {img.contentType || '—'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownload(img)}
                  disabled={downloadingId === img.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#10b981',
                    color: 'white',
                    cursor: downloadingId === img.id ? 'not-allowed' : 'pointer',
                    fontWeight: 900,
                  }}
                >
                  {downloadingId === img.id ? 'Downloading...' : 'Download'}
                </button>
              </div>
            ))}
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
