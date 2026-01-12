import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken, getUserRole } from '../utils/authStorage';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { downloadImage, getImagesByPatient, MedicalImageDTO } from '../services/images';

export default function MyImagesPage() {
  const navigate = useNavigate();
  const { toasts, removeToast, showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<MedicalImageDTO[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadImages = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const role = getUserRole();
      if (role !== 'PATIENT') {
        navigate('/dashboard');
        return;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      const patientId = payload.id || '';

      if (!patientId) {
        showError('Missing patient id in token. Please log out and log in again.');
        return;
      }

      const data = await getImagesByPatient(patientId);
      setImages(data);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to load images'));
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return images;
    const q = search.toLowerCase();
    return images.filter((img) => {
      return (
        (img.imageType || '').toLowerCase().includes(q) ||
        (img.diseaseTag || '').toLowerCase().includes(q) ||
        (img.id || '').toLowerCase().includes(q)
      );
    });
  }, [images, search]);

  const formatBytes = (bytes?: number) => {
    if (!bytes && bytes !== 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  const handleDownload = async (image: MedicalImageDTO) => {
    setDownloadingId(image.id);
    try {
      const blob = await downloadImage(image.id);
      const ext = (image.contentType || '').includes('jpeg') ? 'jpg' : (image.contentType || '').includes('png') ? 'png' : 'bin';
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <LoadingSpinner size="large" message="Loading your images..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 32, color: '#0f172a' }}>My Images</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: 16 }}>View and download your medical images.</p>
      </div>

      <div
        style={{
          background: 'white',
          border: '1px solid #e6efff',
          borderRadius: 12,
          padding: 16,
          marginBottom: 18,
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by type, tag, or id"
          style={{
            flex: 1,
            minWidth: 240,
            padding: '10px 12px',
            border: '1px solid #dbeafe',
            borderRadius: 10,
            fontSize: 14,
            background: '#f8fafc',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={loadImages}
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
          Refresh
        </button>
      </div>

      {filtered.length === 0 ? (
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
          <div style={{ fontSize: 48, marginBottom: 16 }}>🖼️</div>
          <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>No images found</h3>
          <p style={{ margin: 0, fontSize: 14 }}>When images are assigned to you, they will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {filtered.map((img) => (
            <div
              key={img.id}
              style={{
                background: 'white',
                border: '1px solid #e6efff',
                borderRadius: 12,
                padding: 16,
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Image Preview */}
              <div
                style={{
                  width: '100%',
                  height: 200,
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  position: 'relative',
                }}
              >
                {img.id ? (
                  <>
                    <img
                      src={`http://localhost:4000/api/images/${img.id}/view`}
                      alt={img.imageType || 'Medical Image'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 8,
                        opacity: 0
                      }}
                      onLoad={(e) => {
                        console.log(`MyImagesPage - Image loaded successfully: ${img.id}`);
                        e.currentTarget.style.opacity = '1';
                      }}
                      onError={(e) => {
                        console.error(`MyImagesPage - Failed to load image: ${img.id}`);
                        // Try alternative endpoints
                        const alternativeUrls = [
                          `http://localhost:4000/api/images/${img.id}/view`,
                          `http://localhost:4000/api/images/${img.id}`,
                          `http://localhost:4000/images/${img.id}`,
                          `http://localhost:4000/uploads/${img.id}`,
                        ];
                        
                        let attemptCount = 0;
                        const tryAlternativeUrl = () => {
                          if (attemptCount < alternativeUrls.length) {
                            const newSrc = alternativeUrls[attemptCount];
                            console.log(`MyImagesPage - Trying alternative URL: ${newSrc}`);
                            e.currentTarget.src = newSrc;
                            attemptCount++;
                          } else {
                            // All attempts failed, show placeholder
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div style="
                                  width: 100%;
                                  height: 100%;
                                  display: flex;
                                  flex-direction: column;
                                  align-items: center;
                                  justify-content: center;
                                  background: #e2e8f0;
                                  border-radius: 8;
                                  color: #64748b;
                                  font-size: 14px;
                                  font-weight: 600;
                                ">
                                  <div style="font-size: 32px; margin-bottom: 8px;">🖼️</div>
                                  <div>Image not available</div>
                                  <div style="font-size: 12px; margin-top: 4px; color: #94a3b8;">ID: ${img.id}</div>
                                </div>
                              `;
                            }
                          }
                        };
                        
                        tryAlternativeUrl();
                      }}
                    />
                  </>
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#e2e8f0',
                    border: '2px dashed #cbd5e1',
                    borderRadius: 8,
                    color: '#64748b',
                    fontSize: 14,
                    fontWeight: 600,
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                    <div>Image not available</div>
                    <div style={{ fontSize: 12, marginTop: 4, color: '#94a3b8' }}>No image ID</div>
                  </div>
                )}
              </div>

              {/* Image Details */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>
                  {img.imageType || 'Medical Image'}
                </div>
                <div style={{ color: '#64748b', fontSize: 13 }}>
                  Tag: <span style={{ color: '#0f172a', fontWeight: 700 }}>{img.diseaseTag || '—'}</span>
                </div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                  Uploaded: {formatDate(img.uploadedAt)} | Size: {formatBytes(img.fileSize)}
                </div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                  ID: <span style={{ color: '#0f172a', fontWeight: 700 }}>{img.id.slice(0, 8)}...</span>
                </div>
              </div>

              {/* Download Button */}
              <button
                type="button"
                onClick={() => handleDownload(img)}
                disabled={downloadingId === img.id}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: downloadingId === img.id ? '#94a3b8' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: downloadingId === img.id ? 'not-allowed' : 'pointer',
                  fontWeight: 900,
                  fontSize: 14,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {downloadingId === img.id ? 'Downloading...' : '⬇ Download Image'}
              </button>
            </div>
          ))}
        </div>
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
