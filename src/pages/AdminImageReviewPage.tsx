import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getUserRole } from '../utils/authStorage';
import { getPatients, PatientResponseDTO } from '../services/patients';
import { downloadImage, getImagesByPatient, MedicalImageDTO } from '../services/images';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

export default function AdminImageReviewPage() {
  const navigate = useNavigate();
  const role = getUserRole();
  const { toasts, removeToast, showError, showInfo, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientResponseDTO[]>([]);
  const [patientId, setPatientId] = useState('');

  const [imagesLoading, setImagesLoading] = useState(false);
  const [images, setImages] = useState<MedicalImageDTO[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

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

    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to load patients'));
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async () => {
    if (!patientId) {
      showError('Select a patient first');
      return;
    }

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
      showSuccess('Download started');
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to download image'));
    } finally {
      setDownloadingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const typeQ = typeFilter.trim().toLowerCase();
    const tagQ = tagFilter.trim().toLowerCase();

    return images.filter((img) => {
      const matchesSearch = !q
        ? true
        : (img.id || '').toLowerCase().includes(q) ||
          (img.patientId || '').toLowerCase().includes(q) ||
          (img.uploadedByStaffId || '').toLowerCase().includes(q) ||
          (img.imageType || '').toLowerCase().includes(q) ||
          (img.diseaseTag || '').toLowerCase().includes(q);

      const matchesType = !typeQ ? true : (img.imageType || '').toLowerCase().includes(typeQ);
      const matchesTag = !tagQ ? true : (img.diseaseTag || '').toLowerCase().includes(tagQ);

      return matchesSearch && matchesType && matchesTag;
    });
  }, [images, search, typeFilter, tagFilter]);

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes && bytes !== 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <LoadingSpinner size="large" message="Loading admin image review..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 32, color: '#0f172a' }}>Admin Image Review</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: 16 }}>Browse and filter images by patient and metadata.</p>
      </div>

      <div
        style={{
          background: 'white',
          border: '1px solid #e6efff',
          borderRadius: 16,
          padding: 16,
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          marginBottom: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          alignItems: 'end',
        }}
      >
        <div>
          <label style={{ display: 'block', fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Patient</label>
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
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="id / staffId / type / tag"
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
          <label style={{ display: 'block', fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Type</label>
          <input
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            placeholder="MRI, X-Ray..."
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
          <label style={{ display: 'block', fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Tag</label>
          <input
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="Pneumonia..."
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

        <button
          type="button"
          onClick={loadImages}
          disabled={imagesLoading}
          style={{
            padding: '10px 14px',
            background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            cursor: imagesLoading ? 'not-allowed' : 'pointer',
            fontWeight: 900,
          }}
        >
          {imagesLoading ? 'Loading...' : 'Load Images'}
        </button>
      </div>

      <div style={{ marginBottom: 10, color: '#64748b', fontSize: 14 }}>
        Showing <strong style={{ color: '#0f172a' }}>{filtered.length}</strong> of{' '}
        <strong style={{ color: '#0f172a' }}>{images.length}</strong> images
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
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div style={{ fontSize: 13, marginBottom: 16, fontWeight: 800, color: '#94a3b8' }}>No results</div>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>No images</h3>
            <p style={{ margin: 0, fontSize: 14 }}>Select a patient and load images to begin.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 0 }}>
            {filtered.map((img) => (
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
                    Uploaded: {formatDate(img.uploadedAt)} | Size: {formatBytes(img.fileSize)} | Type: {img.contentType || '—'}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                    Image ID: <span style={{ color: '#0f172a', fontWeight: 800 }}>{img.id}</span>
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
