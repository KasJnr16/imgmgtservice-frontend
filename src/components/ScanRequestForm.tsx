import React, { useState, useEffect } from 'react';
import { scanAppointmentService, ScanRequestDTO, ScanTypeValue } from '../services/analytics';
import { getMedicalStaff, MedicalStaffResponseDTO } from '../services/medicalStaff';
import { useToast } from '../hooks/useToast';

interface ScanRequestFormProps {
  medicalRecordId: string;
  patientId: string;
  doctorId: string;
  onRequestCreated?: (appointment: any) => void;
}

export default function ScanRequestForm({ 
  medicalRecordId, 
  patientId, 
  doctorId, 
  onRequestCreated 
}: ScanRequestFormProps) {
  const { showError, showSuccess } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    scanType: 'X_RAY' as ScanTypeValue,
    scanReason: '',
    notes: '',
    radiologistId: ''
  });
  
  const [radiologists, setRadiologists] = useState<MedicalStaffResponseDTO[]>([]);
  const [loadingRadiologists, setLoadingRadiologists] = useState(false);

  // Load radiologists when form is shown
  useEffect(() => {
    if (showForm) {
      loadRadiologists();
    }
  }, [showForm]);

  const loadRadiologists = async () => {
    setLoadingRadiologists(true);
    try {
      const staff = await getMedicalStaff();
      // Filter for radiologists based on email pattern: radiologist<number>@test.com
      const radiologistStaff = staff.filter(s => {
        const email = s.email?.toLowerCase() || '';
        return email.startsWith('radiologist') && email.includes('@test.com');
      });
      setRadiologists(radiologistStaff);
      
      if (radiologistStaff.length === 0) {
        console.warn('No radiologists found with email pattern radiologist<number>@test.com');
        // If no radiologists found, show all staff so doctors can still assign someone
        setRadiologists(staff);
      }
    } catch (error) {
      console.error('Failed to load radiologists:', error);
      showError('Failed to load radiologists');
    } finally {
      setLoadingRadiologists(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.scanReason.trim()) {
      showError('Please provide a reason for the scan request');
      return;
    }

    setLoading(true);
    try {
      const request: ScanRequestDTO = {
        medicalRecordId,
        patientId,
        doctorId,
        scanType: formData.scanType,
        scanReason: formData.scanReason,
        notes: formData.notes || undefined,
        radiologistId: formData.radiologistId || undefined
      };

      const appointment = await scanAppointmentService.createScanRequest(request);
      showSuccess('Scan request created successfully');
      
      // Reset form
      setFormData({
        scanType: 'X_RAY',
        scanReason: '',
        notes: '',
        radiologistId: ''
      });
      setShowForm(false);
      
      if (onRequestCreated) {
        onRequestCreated(appointment);
      }
    } catch (err) {
      showError('Failed to create scan request');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const scanTypes: { value: ScanTypeValue; label: string }[] = [
    { value: 'X_RAY', label: 'X-Ray' },
    { value: 'CT_SCAN', label: 'CT Scan' },
    { value: 'MRI', label: 'MRI' },
    { value: 'ULTRASOUND', label: 'Ultrasound' },
    { value: 'MAMMOGRAM', label: 'Mammogram' },
    { value: 'BONE_SCAN', label: 'Bone Scan' },
    { value: 'PET_SCAN', label: 'PET Scan' },
    { value: 'ANGIOGRAM', label: 'Angiogram' },
    { value: 'OTHER', label: 'Other' }
  ];

  if (!showForm) {
    return (
      <div style={{ marginTop: 16, padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 14 }}>Request Medical Scan</div>
            <div style={{ color: '#64748b', fontSize: 12 }}>Optional: Request radiology scan for this patient</div>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #3b82f6',
              background: 'white',
              color: '#3b82f6',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14
            }}
          >
            Request Scan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, padding: 20, border: '1px solid #e2e8f0', borderRadius: 12, background: 'white' }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#0f172a', fontWeight: 900 }}>
          Request Medical Scan
        </h3>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
          Create a scan appointment request for the radiology department
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 900, color: '#64748b', marginBottom: 6 }}>
              Scan Type *
            </label>
            <select
              value={formData.scanType}
              onChange={(e) => setFormData({ ...formData, scanType: e.target.value as ScanTypeValue })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #dbeafe',
                background: 'white',
                fontSize: 14,
                boxSizing: 'border-box'
              }}
              required
            >
              {scanTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 900, color: '#64748b', marginBottom: 6 }}>
              Assign Radiologist (Optional)
            </label>
            <select
              value={formData.radiologistId}
              onChange={(e) => setFormData({ ...formData, radiologistId: e.target.value })}
              disabled={loadingRadiologists}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #dbeafe',
                background: 'white',
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            >
              <option value="">No radiologist assigned</option>
              {radiologists.map(radiologist => (
                <option key={radiologist.id} value={radiologist.id}>
                  {radiologist.name}
                </option>
              ))}
            </select>
            {loadingRadiologists && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Loading radiologists...
              </div>
            )}
            {!loadingRadiologists && radiologists.length === 0 && (
              <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                No radiologists available
              </div>
            )}
            {!loadingRadiologists && radiologists.length > 0 && (
              <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
                {radiologists.length} radiologist(s) available
              </div>
            )}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 900, color: '#64748b', marginBottom: 6 }}>
            Reason for Scan *
          </label>
          <textarea
            value={formData.scanReason}
            onChange={(e) => setFormData({ ...formData, scanReason: e.target.value })}
            placeholder="Explain why this scan is needed..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #dbeafe',
              background: 'white',
              fontSize: 14,
              minHeight: 80,
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 900, color: '#64748b', marginBottom: 6 }}>
            Additional Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any additional instructions or notes for the radiologist..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #dbeafe',
              background: 'white',
              fontSize: 14,
              minHeight: 60,
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#64748b',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: loading ? '#94a3b8' : '#3b82f6',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: 14
            }}
          >
            {loading ? 'Creating...' : 'Create Scan Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
