import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getUserRole } from '../utils/authStorage';
import { getPatient, PatientResponseDTO } from '../services/patients';
import { downloadImage, getImagesByPatient, MedicalImageDTO } from '../services/images';
import { getMedicalStaffNameMap, getStaffDisplayName, StaffNameMap, getMedicalStaff, MedicalStaffResponseDTO } from '../services/medicalStaff';
import {
  CreateDiagnosisDTO,
  CreateMedicalRecordDTO,
  DiagnosisDTO,
  DiagnosisSeverity,
  DiagnosisStatus,
  GenerateReportDTO,
  MedicalRecordDTO,
  ReportDTO,
  ScanAppointmentDTO,
  ScanRequestDTO,
  createDiagnosis,
  createMedicalRecord,
  generateReport,
  getDiagnosesByPatient,
  getMedicalRecord,
  getMedicalRecordsByPatient,
  getReportsByPatient,
  scanAppointmentService,
} from '../services/analytics';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

export default function StaffPatientProfilePage() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { toasts, removeToast, showError, showInfo, showSuccess, showWarning } = useToast();

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientResponseDTO | null>(null);
  const [tab, setTab] = useState<'overview' | 'clinical'>('overview');
  const [imagesLoading, setImagesLoading] = useState(false);
  const [images, setImages] = useState<MedicalImageDTO[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [records, setRecords] = useState<MedicalRecordDTO[]>([]);
  const [diagnosesLoading, setDiagnosesLoading] = useState(false);
  const [diagnoses, setDiagnoses] = useState<DiagnosisDTO[]>([]);
  const [scanAppointmentsLoading, setScanAppointmentsLoading] = useState(false);
  const [scanAppointments, setScanAppointments] = useState<ScanAppointmentDTO[]>([]);
  const [showScanRequestForm, setShowScanRequestForm] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportType, setReportType] = useState<GenerateReportDTO['reportType']>('COMPREHENSIVE');
  const [reportFormat, setReportFormat] = useState<GenerateReportDTO['format']>('JSON');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  const [creatingRecord, setCreatingRecord] = useState(false);
  const [recordChiefComplaint, setRecordChiefComplaint] = useState('');
  const [recordHpi, setRecordHpi] = useState('');

  const [creatingDiagnosis, setCreatingDiagnosis] = useState(false);
  const [diagnosisRecordId, setDiagnosisRecordId] = useState('');
  const [diagnosisDiseaseName, setDiagnosisDiseaseName] = useState('');
  const [diagnosisIcdCode, setDiagnosisIcdCode] = useState('');
  const [diagnosisSeverity, setDiagnosisSeverity] = useState<DiagnosisSeverity | ''>('');
  const [diagnosisStatus, setDiagnosisStatus] = useState<DiagnosisStatus | ''>('');
  const [diagnosisDescription, setDiagnosisDescription] = useState('');
  const [diagnosisTreatmentPlan, setDiagnosisTreatmentPlan] = useState('');
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [diagnosisImageIds, setDiagnosisImageIds] = useState<string[]>([]);

  const [scanRequestType, setScanRequestType] = useState('X_RAY' as any);
  const [scanRequestReason, setScanRequestReason] = useState('');
  const [scanRequestNotes, setScanRequestNotes] = useState('');
  const [scanRequestRadiologistId, setScanRequestRadiologistId] = useState('');
  const [radiologists, setRadiologists] = useState<any[]>([]);
  const [loadingRadiologists, setLoadingRadiologists] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, { updating: boolean; showActions: boolean }>>({});
  const [patientNameMap, setPatientNameMap] = useState<Record<string, string>>({});

  const [staffNameMap, setStaffNameMap] = useState<StaffNameMap>({});

  const safeRecords = Array.isArray(records) ? records : [];
  const safeDiagnoses = Array.isArray(diagnoses) ? diagnoses : [];
  const safeReports = Array.isArray(reports) ? reports : [];

  const mergeUniqueById = <T extends { id: string }>(items: T[]) => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const it of items) {
      if (!it?.id) continue;
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      out.push(it);
    }
    return out;
  };

  const ensureStaffNames = async (ids: string[]) => {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (unique.length === 0) return;

    const missing = unique.filter((id) => !staffNameMap[id]);
    if (missing.length === 0) return;

    try {
      const map = await getMedicalStaffNameMap(missing);
      if (Object.keys(map).length === 0) return;
      setStaffNameMap((prev) => ({ ...prev, ...map }));
    } catch {
      // best-effort only
    }
  };

  const badgeStyle = (bg: string, fg: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 999,
    background: bg,
    color: fg,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.2,
  });

  const statusBadge = (status?: DiagnosisStatus) => {
    const s = status || 'ACTIVE';
    const styles: Record<string, React.CSSProperties> = {
      ACTIVE: badgeStyle('#dcfce7', '#166534'),
      UNDER_OBSERVATION: badgeStyle('#dbeafe', '#1d4ed8'),
      RESOLVED: badgeStyle('#e2e8f0', '#334155'),
      CHRONIC: badgeStyle('#ede9fe', '#5b21b6'),
    };
    return <span style={styles[s] || badgeStyle('#e2e8f0', '#334155')}>{s}</span>;
  };

  const severityBadge = (severity?: DiagnosisSeverity) => {
    const s = severity || 'MILD';
    const styles: Record<string, React.CSSProperties> = {
      MILD: badgeStyle('#dcfce7', '#166534'),
      MODERATE: badgeStyle('#fef3c7', '#92400e'),
      SEVERE: badgeStyle('#ffedd5', '#9a3412'),
      CRITICAL: badgeStyle('#fee2e2', '#991b1b'),
    };
    return <span style={styles[s] || badgeStyle('#e2e8f0', '#334155')}>{s}</span>;
  };

  const safeJsonParse = (value?: string): any | null => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const downloadTextFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadReport = (r: ReportDTO) => {
    const base = `report-${r.reportType}-${(r.generatedAt || '').replace(/[:.]/g, '-') || r.id}`;
    const parsed = safeJsonParse(r.reportContent);

    if (r.format === 'JSON') {
      const json = parsed ? JSON.stringify(parsed, null, 2) : r.reportContent || '';
      downloadTextFile(`${base}.json`, json, 'application/json');
      return;
    }

    if (r.format === 'TEXT') {
      downloadTextFile(`${base}.txt`, r.reportContent || '', 'text/plain');
      return;
    }

    downloadTextFile(`${base}.pdf`, r.reportContent || '', 'application/pdf');
  };

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

      if (!err.response) return `${fallback} (network/proxy error)`;

      return `${fallback} (${status}${statusText ? ` ${statusText}` : ''})${serverMessage ? `: ${serverMessage}` : ''}`;
    }

    return fallback;
  }

  const role = getUserRole();
  const isDoctor = role === 'DOCTOR';

  useEffect(() => {
    if (role === 'PATIENT') {
      navigate('/dashboard');
      return;
    }

    loadPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    if (!isDoctor) return;
    if (tab !== 'clinical') return;
    loadRecords();
    loadScanAppointments();
    loadDiagnoses();
    loadImages();
    loadRadiologists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, patientId, isDoctor]);

  const loadPatient = async () => {
    setLoading(true);
    try {
      if (!patientId) {
        showError('Missing patient id in URL');
        setPatient(null);
        return;
      }

      const data = await getPatient(patientId);
      setPatient(data);

      if (!isDoctor && tab === 'clinical') {
        setTab('overview');
      }
    } catch (err) {
      setPatient(null);
      showError(getErrorMessage(err, 'Failed to load patient profile'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMedicalRecord = async () => {
    if (!patientId) return;
    if (!recordChiefComplaint.trim() && !recordHpi.trim()) {
      showError('Provide at least a chief complaint or a short note');
      return;
    }

    setCreatingRecord(true);
    try {
      const payload: CreateMedicalRecordDTO = {
        patientId,
        chiefComplaint: recordChiefComplaint.trim() || undefined,
        historyOfPresentIllness: recordHpi.trim() || undefined,
      };
      const created = await createMedicalRecord(payload);
      if (!created?.id) {
        showWarning('Record creation returned no id. It may not have been saved.');
        return;
      }

      try {
        await getMedicalRecord(created.id);
      } catch {
        showWarning('Record was created but could not be fetched by id. It may not have been saved.');
      }

      setRecords((prev) => mergeUniqueById<MedicalRecordDTO>([created, ...(Array.isArray(prev) ? prev : [])]));
      showSuccess('Medical record created');
      setRecordChiefComplaint('');
      setRecordHpi('');
      const refreshed = await loadRecords();
      if (!refreshed.some((r) => r.id === created.id)) {
        setRecords((prev) => mergeUniqueById<MedicalRecordDTO>([created, ...(Array.isArray(prev) ? prev : [])]));
        showWarning('Record saved response received, but it did not appear in the records list. The API may be filtering results.');
      }
      setDiagnosisRecordId(created.id);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to create medical record'));
    } finally {
      setCreatingRecord(false);
    }
  };

  const handleCreateDiagnosis = async () => {
    if (!patientId) return;
    if (!diagnosisRecordId.trim()) {
      showError('Select a medical record');
      return;
    }
    if (!diagnosisDiseaseName.trim()) {
      showError('Disease name is required');
      return;
    }

    setCreatingDiagnosis(true);
    try {
      const payload: CreateDiagnosisDTO = {
        medicalRecordId: diagnosisRecordId.trim(),
        diseaseName: diagnosisDiseaseName.trim(),
        icdCode: diagnosisIcdCode.trim() || undefined,
        description: diagnosisDescription.trim() || undefined,
        severity: diagnosisSeverity || undefined,
        status: diagnosisStatus || undefined,
        treatmentPlan: diagnosisTreatmentPlan.trim() || undefined,
        notes: diagnosisNotes.trim() || undefined,
        imageIds: diagnosisImageIds.length ? diagnosisImageIds : undefined,
      };
      const created = await createDiagnosis(payload);
      if (!created?.id) {
        showWarning('Diagnosis creation returned no id. It may not have been saved.');
        return;
      }
      setDiagnoses((prev) => mergeUniqueById<DiagnosisDTO>([created, ...(Array.isArray(prev) ? prev : [])]));
      showSuccess('Diagnosis added');
      setDiagnosisDiseaseName('');
      setDiagnosisIcdCode('');
      setDiagnosisSeverity('');
      setDiagnosisStatus('');
      setDiagnosisDescription('');
      setDiagnosisTreatmentPlan('');
      setDiagnosisNotes('');
      setDiagnosisImageIds([]);
      const refreshed = await loadDiagnoses();
      if (!refreshed.some((d) => d.id === created.id)) {
        setDiagnoses((prev) => mergeUniqueById<DiagnosisDTO>([created, ...(Array.isArray(prev) ? prev : [])]));
        showWarning('Diagnosis saved response received, but it did not appear in the diagnoses list. The API may be filtering results.');
      }
      await loadRecords();
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to add diagnosis'));
    } finally {
      setCreatingDiagnosis(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    setStatusUpdates(prev => ({ ...prev, [appointmentId]: { ...prev[appointmentId], updating: true } }));
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showError('Authentication required');
        return;
      }
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const userId = payload?.id as string;
      
      const appointment = scanAppointments.find(a => a.id === appointmentId);
      if (!appointment) {
        showError('Appointment not found');
        return;
      }
      
      await scanAppointmentService.updateAppointment(appointmentId, {
        status: newStatus as any,
        notes: appointment.notes
      }, userId);
      
      showSuccess('Status updated successfully');
      await loadScanAppointments();
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to update status'));
    } finally {
      setStatusUpdates(prev => ({ ...prev, [appointmentId]: { ...prev[appointmentId], updating: false, showActions: false } }));
    }
  };

  const toggleStatusActions = (appointmentId: string) => {
    setStatusUpdates(prev => ({
      ...prev,
      [appointmentId]: {
        updating: false,
        showActions: !prev[appointmentId]?.showActions
      }
    }));
  };

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

  const handleCreateScanRequest = async () => {
    if (!patientId) return;
    if (!records || records.length === 0) {
      showError('Please create a medical record first');
      return;
    }
    
    const latestRecord = records[0]; // Use the most recent record
    const token = localStorage.getItem('token');
    if (!token) {
      showError('Authentication required');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const doctorId = payload?.id as string;
      
      if (!doctorId) {
        showError('Doctor ID not found');
        return;
      }

      const scanRequest: ScanRequestDTO = {
        medicalRecordId: latestRecord.id,
        patientId,
        doctorId,
        scanType: scanRequestType,
        scanReason: scanRequestReason,
        notes: scanRequestNotes || undefined,
        radiologistId: scanRequestRadiologistId || undefined
      };

      const appointment = await scanAppointmentService.createScanRequest(scanRequest);
      showSuccess('Scan request created successfully');
      
      // Reset form
      setScanRequestType('X_RAY');
      setScanRequestReason('');
      setScanRequestNotes('');
      setScanRequestRadiologistId('');
      setShowScanRequestForm(false);
      
      // Reload scan appointments
      await loadScanAppointments();
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to create scan request'));
    }
  };

  const loadImages = async () => {
    if (!patientId) return;
    setImagesLoading(true);
    try {
      const data = await getImagesByPatient(patientId);
      setImages(data);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to load patient images'));
    } finally {
      setImagesLoading(false);
    }
  };

  const loadRecords = async (): Promise<MedicalRecordDTO[]> => {
    if (!patientId) return [];
    setRecordsLoading(true);
    try {
      const data = await getMedicalRecordsByPatient(patientId);
      setRecords(data);
      await ensureStaffNames((Array.isArray(data) ? data : []).map((r) => r.createdByStaffId));
      return Array.isArray(data) ? data : [];
    } catch (err) {
      setRecords([]);
      showError(getErrorMessage(err, 'Failed to load medical records'));
      return [];
    } finally {
      setRecordsLoading(false);
    }
  };

  const loadDiagnoses = async (): Promise<DiagnosisDTO[]> => {
    if (!patientId) return [];
    setDiagnosesLoading(true);
    try {
      const data = await getDiagnosesByPatient(patientId);
      setDiagnoses(data);
      await ensureStaffNames((Array.isArray(data) ? data : []).map((d) => d.diagnosedByStaffId));
      return Array.isArray(data) ? data : [];
    } catch (err) {
      setDiagnoses([]);
      showError(getErrorMessage(err, 'Failed to load diagnoses'));
      return [];
    } finally {
      setDiagnosesLoading(false);
    }
  };

  const loadScanAppointments = async (): Promise<ScanAppointmentDTO[]> => {
    if (!patientId) return [];
    setScanAppointmentsLoading(true);
    try {
      const data = await scanAppointmentService.getAppointmentsForPatient(patientId);
      setScanAppointments(data);
      
      // Load staff names for doctors and radiologists
      await ensureStaffNames((Array.isArray(data) ? data : []).map((a) => a.doctorId).filter(Boolean));
      await ensureStaffNames((Array.isArray(data) ? data : []).map((a) => a.radiologistId || '').filter(Boolean));
      
      // Set patient name from the loaded patient data
      if (patient) {
        setPatientNameMap({ [patientId]: patient.name });
      }
      
      return Array.isArray(data) ? data : [];
    } catch (err) {
      setScanAppointments([]);
      showError(getErrorMessage(err, 'Failed to load scan appointments'));
      return [];
    } finally {
      setScanAppointmentsLoading(false);
    }
  };

  const loadReports = async () => {
    if (!patientId) return;
    setReportsLoading(true);
    try {
      const data = await getReportsByPatient(patientId);
      setReports(data);
      await ensureStaffNames((Array.isArray(data) ? data : []).map((r) => r.generatedByStaffId || '').filter(Boolean));
    } catch (err) {
      setReports([]);
      showError(getErrorMessage(err, 'Failed to load reports'));
    } finally {
      setReportsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!patientId) return;
    setGeneratingReport(true);
    try {
      const payload: GenerateReportDTO = {
        patientId,
        reportType,
        format: reportFormat,
        startDate: reportStartDate || undefined,
        endDate: reportEndDate || undefined,
      };
      await generateReport(payload);
      showInfo('Report generation requested');
      await loadReports();
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to generate report'));
    } finally {
      setGeneratingReport(false);
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
            onClick={() => navigate('/patient-records')}
            style={{
              padding: '10px 16px',
              background: '#1d4ed8',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Back to Patient Records
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
        <h2 style={{ margin: '0 0 6px', fontSize: 32, color: '#0f172a' }}>Patient Profile</h2>
        <p style={{ margin: 0, color: '#64748b' }}>Review patient demographics and clinical context.</p>
      </div>

      <div
        style={{
          background: 'white',
          border: '1px solid #e6efff',
          borderRadius: 18,
          padding: 24,
          boxShadow: '0 18px 46px rgba(15, 23, 42, 0.06)',
          marginBottom: 18,
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
              fontWeight: 800,
            }}
          >
            {patient.name.charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{patient.name}</div>
            <div style={{ color: '#64748b', fontSize: 14 }}>{patient.email}</div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>
              Patient ID: <span style={{ color: '#0f172a', fontWeight: 600 }}>{patient.id}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(patient.id).catch(() => {});
                showInfo('Patient ID copied');
              }}
              style={{
                padding: '10px 14px',
                background: '#f1f5f9',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Copy ID
            </button>
            <button
              type="button"
              onClick={loadPatient}
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
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setTab('overview')}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #dbeafe',
            background: tab === 'overview' ? '#1d4ed8' : 'white',
            color: tab === 'overview' ? 'white' : '#1d4ed8',
            cursor: 'pointer',
            fontWeight: 800,
          }}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setTab('clinical')}
          disabled={!isDoctor}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #dbeafe',
            background: tab === 'clinical' ? '#1d4ed8' : 'white',
            color: tab === 'clinical' ? 'white' : '#1d4ed8',
            cursor: isDoctor ? 'pointer' : 'not-allowed',
            opacity: isDoctor ? 1 : 0.5,
            fontWeight: 800,
          }}
        >
          Doctor View
        </button>
      </div>

      {tab === 'overview' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          <div
            style={{
              background: 'white',
              border: '1px solid #e6efff',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ fontWeight: 900, color: '#0f172a', marginBottom: 10 }}>Demographics</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Date of Birth</div>
                <div style={{ fontSize: 14, color: '#0f172a' }}>{patient.dateOfBirth || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Address</div>
                <div style={{ fontSize: 14, color: '#0f172a' }}>{patient.address || '—'}</div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'white',
              border: '1px solid #e6efff',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ fontWeight: 900, color: '#0f172a', marginBottom: 10 }}>Quick Actions</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  if (isDoctor) {
                    setTab('clinical');
                    loadImages();
                    return;
                  }
                  showInfo('Images view is available to Doctors on assigned patients.');
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  fontWeight: 800,
                  textAlign: 'left',
                }}
              >
                View Images
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isDoctor) {
                    setTab('clinical');
                    loadReports();
                    return;
                  }
                  showInfo('Reports view is available to Doctors on assigned patients.');
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  fontWeight: 800,
                  textAlign: 'left',
                }}
              >
                View Reports
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isDoctor) {
                    setTab('clinical');
                    loadDiagnoses();
                    return;
                  }
                  showInfo('Diagnoses view is available to Doctors on assigned patients.');
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  fontWeight: 800,
                  textAlign: 'left',
                }}
              >
                View Diagnoses
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'clinical' && isDoctor && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div
            style={{
              background: 'white',
              border: '1px solid #e6efff',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Images (treated by you)</div>
              <button
                type="button"
                onClick={loadImages}
                disabled={imagesLoading}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid #dbeafe',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  cursor: imagesLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 800,
                }}
              >
                {imagesLoading ? 'Loading...' : 'Load'}
              </button>
            </div>

            {imagesLoading ? (
              <div style={{ padding: '18px 0' }}>
                <LoadingSpinner size="small" message="Loading images..." />
              </div>
            ) : images.length === 0 ? (
              <div style={{ marginTop: 10, color: '#64748b', fontSize: 14 }}>
                No images found for this patient (or you may not have access).
              </div>
            ) : (
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {images.map((img) => (
                  <div
                    key={img.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 16,
                      background: 'white',
                      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onClick={() => handleDownload(img)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.04)';
                    }}
                  >
                    {/* Image Preview */}
                    <div 
                      style={{
                        width: '100%',
                        height: '200px',
                        borderRadius: 8,
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        marginBottom: 12,
                        position: 'relative',
                        border: '1px solid #e2e8f0'
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
                              console.log(`Image loaded successfully: ${img.id}`);
                              e.currentTarget.style.opacity = '1';
                            }}
                            onError={(e) => {
                              console.error(`Failed to load image: ${img.id}`);
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
                                  console.log(`Trying alternative URL: ${newSrc}`);
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
                                        <div style="font-size: 32px; margin-bottom: 8px;">📷</div>
                                        <div>Image not available</div>
                                        <div style="font-size: 12px; margin-top: 4px; color: #94a3b8;">ID: ${img.id}</div>
                                        <div style="font-size: 11px; margin-top: 8px; color: #ef4444;">Backend service check needed</div>
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
                          <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                          <div>Image not available</div>
                          <div style={{ fontSize: 12, marginTop: 4, color: '#94a3b8' }}>No image ID</div>
                        </div>
                      )}
                    </div>

                    {/* Image Information */}
                    <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2, fontWeight: 600 }}>Type</div>
                          <div style={{ color: '#0f172a', fontSize: 14, fontWeight: 700 }}>{img.imageType || 'Medical Image'}</div>
                        </div>
                        {img.diseaseTag && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2, fontWeight: 600 }}>Tag</div>
                            <div style={{ color: '#0f172a', fontSize: 14, fontWeight: 700 }}>{img.diseaseTag}</div>
                          </div>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#64748b' }}>
                        <span>Uploaded: {formatDate(img.uploadedAt)}</span>
                        {img.fileSize && <span>Size: {formatBytes(img.fileSize)}</span>}
                      </div>
                      
                      {img.contentType && (
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          Format: {img.contentType}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(img);
                      }}
                      disabled={downloadingId === img.id}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: downloadingId === img.id ? '#94a3b8' : '#10b981',
                        color: 'white',
                        cursor: downloadingId === img.id ? 'not-allowed' : 'pointer',
                        fontWeight: 900,
                        fontSize: 14,
                        transition: 'all 0.2s',
                        marginTop: 'auto',
                      }}
                    >
                      {downloadingId === img.id ? 'Downloading...' : '⬇ Download Image'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              background: 'white',
              border: '1px solid #e6efff',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Medical Records</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={loadRecords}
                  disabled={recordsLoading}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid #dbeafe',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    cursor: recordsLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                  }}
                >
                  {recordsLoading ? 'Loading...' : 'Load'}
                </button>
                <button
                  type="button"
                  onClick={handleCreateMedicalRecord}
                  disabled={creatingRecord}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#1d4ed8',
                    color: 'white',
                    cursor: creatingRecord ? 'not-allowed' : 'pointer',
                    fontWeight: 900,
                  }}
                >
                  {creatingRecord ? 'Saving...' : 'Create'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Chief Complaint</div>
                  <input
                    value={recordChiefComplaint}
                    onChange={(e) => setRecordChiefComplaint(e.target.value)}
                    placeholder="e.g. Chest pain"
                    style={{ width: '100%', height: 42, padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
                  <textarea
                    value={recordHpi}
                    onChange={(e) => setRecordHpi(e.target.value)}
                    rows={3}
                    placeholder="Short clinical note"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              </div>
            </div>

            {recordsLoading ? (
              <div style={{ padding: '18px 0' }}>
                <LoadingSpinner size="small" message="Loading records..." />
              </div>
            ) : safeRecords.length === 0 ? (
              <div style={{ marginTop: 10, color: '#64748b', fontSize: 14 }}>
                No medical records found for this patient (or you may not have access).
              </div>
            ) : (
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 900, color: '#1d4ed8' }}>Show records ({safeRecords.length})</summary>
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {safeRecords.map((r) => {
                    const hasVitals =
                      r.temperature != null ||
                      r.bloodPressureSystolic != null ||
                      r.bloodPressureDiastolic != null ||
                      r.heartRate != null ||
                      r.respiratoryRate != null ||
                      r.oxygenSaturation != null;

                    const metaItem = (label: string, value: React.ReactNode) => (
                      <div style={{ display: 'grid', gap: 2 }}>
                        <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{value}</div>
                      </div>
                    );

                    const vitalsItem = (label: string, value: React.ReactNode) => (
                      <div style={{ padding: 10, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white' }}>
                        <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ marginTop: 4, fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{value}</div>
                      </div>
                    );

                    return (
                      <div
                        key={r.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 14,
                          padding: 14,
                          background: 'white',
                          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                          display: 'grid',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
                          <div style={{ minWidth: 240 }}>
                            <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Medical Record</div>
                            <div style={{ marginTop: 4, fontWeight: 900, color: '#0f172a', fontSize: 16 }}>{r.chiefComplaint || 'Visit note'}</div>
                          </div>
                          <div style={{ color: '#64748b', fontSize: 12, fontWeight: 800 }}>Recorded: {formatDate(r.recordDate || r.createdAt)}</div>
                        </div>

                        <div style={{ height: 1, background: '#e2e8f0' }} />

                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {metaItem('By', getStaffDisplayName(r.createdByStaffId, staffNameMap))}
                          {metaItem('Record ID', <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>{r.id}</span>)}
                        </div>

                        {hasVitals && (
                          <div style={{ display: 'grid', gap: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Vitals</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                              {r.temperature != null ? vitalsItem('Temp', `${r.temperature} °C`) : null}
                              {r.bloodPressureSystolic != null || r.bloodPressureDiastolic != null
                                ? vitalsItem('Blood pressure', `${r.bloodPressureSystolic ?? '—'}/${r.bloodPressureDiastolic ?? '—'}`)
                                : null}
                              {r.heartRate != null ? vitalsItem('Heart rate', `${r.heartRate} bpm`) : null}
                              {r.respiratoryRate != null ? vitalsItem('Resp rate', `${r.respiratoryRate} /min`) : null}
                              {r.oxygenSaturation != null ? vitalsItem('SpO₂', `${r.oxygenSaturation}%`) : null}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Clinical Note</div>
                          {r.historyOfPresentIllness ? (
                            <div style={{ color: '#0f172a', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                              {r.historyOfPresentIllness.length > 380 ? `${r.historyOfPresentIllness.slice(0, 380)}...` : r.historyOfPresentIllness}
                            </div>
                          ) : (
                            <div style={{ color: '#94a3b8', fontSize: 12 }}>No narrative available.</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>

          {/* Scan Appointments Section */}
          <div
            style={{
              background: 'white',
              border: '1px solid #e6efff',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Scan Appointments</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {isDoctor && (
                  <button
                    type="button"
                    onClick={() => setShowScanRequestForm(!showScanRequestForm)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid #dbeafe',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      cursor: 'pointer',
                      fontWeight: 800,
                    }}
                  >
                    {showScanRequestForm ? 'Cancel' : 'Request Scan'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={loadScanAppointments}
                  disabled={scanAppointmentsLoading}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid #dbeafe',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    cursor: scanAppointmentsLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                  }}
                >
                  {scanAppointmentsLoading ? 'Loading...' : 'Reload'}
                </button>
              </div>
            </div>

            {/* Scan Request Form */}
            {showScanRequestForm && isDoctor && (
              <div style={{ marginTop: 16, padding: 20, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                  Request Medical Scan
                </h4>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 900, color: '#64748b', marginBottom: 6 }}>
                        Scan Type *
                      </label>
                      <select
                        value={scanRequestType}
                        onChange={(e) => setScanRequestType(e.target.value)}
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
                        <option value="X_RAY">X-Ray</option>
                        <option value="CT_SCAN">CT Scan</option>
                        <option value="MRI">MRI</option>
                        <option value="ULTRASOUND">Ultrasound</option>
                        <option value="MAMMOGRAM">Mammogram</option>
                        <option value="BONE_SCAN">Bone Scan</option>
                        <option value="PET_SCAN">PET Scan</option>
                        <option value="ANGIOGRAM">Angiogram</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 900, color: '#64748b', marginBottom: 6 }}>
                        Assign Radiologist (Optional)
                      </label>
                      <select
                        value={scanRequestRadiologistId}
                        onChange={(e) => setScanRequestRadiologistId(e.target.value)}
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
                      value={scanRequestReason}
                      onChange={(e) => setScanRequestReason(e.target.value)}
                      placeholder="Explain why this scan is needed..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #dbeafe',
                        background: 'white',
                        fontSize: 14,
                        minHeight: 100,
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 900, color: '#64748b', marginBottom: 6 }}>
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={scanRequestNotes}
                      onChange={(e) => setScanRequestNotes(e.target.value)}
                      placeholder="Any additional instructions or notes for the radiologist..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #dbeafe',
                        background: 'white',
                        fontSize: 14,
                        minHeight: 80,
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowScanRequestForm(false)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        background: 'white',
                        color: '#64748b',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 14,
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateScanRequest}
                      disabled={!scanRequestReason.trim()}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 8,
                        border: 'none',
                        background: scanRequestReason.trim() ? '#3b82f6' : '#94a3b8',
                        color: 'white',
                        cursor: scanRequestReason.trim() ? 'pointer' : 'not-allowed',
                        fontWeight: 700,
                        fontSize: 14,
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => {
                        if (scanRequestReason.trim()) {
                          e.currentTarget.style.backgroundColor = '#2563eb';
                        }
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = scanRequestReason.trim() ? '#3b82f6' : '#94a3b8';
                      }}
                    >
                      Create Scan Request
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Scan Appointments List */}
            {scanAppointmentsLoading ? (
              <div style={{ padding: '18px 0' }}>
                <LoadingSpinner size="small" message="Loading scan appointments..." />
              </div>
            ) : scanAppointments.length === 0 ? (
              <div style={{ marginTop: 10, color: '#64748b', fontSize: 14 }}>
                No scan appointments found for this patient.
              </div>
            ) : (
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 900, color: '#1d4ed8' }}>
                  Show scan appointments ({scanAppointments.length})
                </summary>
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {scanAppointments.map((appointment) => {
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

                    const appointmentStatus = statusUpdates[appointment.id] || { updating: false, showActions: false };

                    return (
                      <div
                        key={appointment.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 14,
                          padding: 16,
                          background: 'white',
                          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                          display: 'grid',
                          gap: 12,
                        }}
                      >
                        {/* Header with Patient Name and Status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ minWidth: 240 }}>
                            <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
                              {scanAppointmentService.getScanTypeDisplayName(appointment.scanType)}
                            </div>
                            <div style={{ marginTop: 4, fontWeight: 900, color: '#0f172a', fontSize: 16 }}>
                              Requested for {patientNameMap[appointment.patientId] || appointment.patientName || 'Unknown Patient'}
                            </div>
                            <div style={{ marginTop: 2, fontSize: 14, color: '#64748b', fontWeight: 700 }}>
                              {staffNameMap[appointment.doctorId] || appointment.doctorName || 'Unknown Doctor'}
                            </div>
                            <div style={{ marginTop: 2, fontSize: 13, color: '#64748b' }}>
                              Scan Appointment
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {getStatusBadge(appointment.status)}
                            {isDoctor && (
                              <button
                                onClick={() => toggleStatusActions(appointment.id)}
                                disabled={appointmentStatus.updating}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #dbeafe',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  cursor: appointmentStatus.updating ? 'not-allowed' : 'pointer',
                                  fontSize: 11,
                                  fontWeight: 700
                                }}
                              >
                                {appointmentStatus.updating ? 'Updating...' : 'Change Status'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Status Actions Dropdown */}
                        {appointmentStatus.showActions && (
                          <div style={{
                            border: '1px solid #dbeafe',
                            borderRadius: 8,
                            background: '#f8fafc',
                            padding: 8,
                            display: 'grid',
                            gap: 4
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', marginBottom: 4 }}>Update Status:</div>
                            {['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].filter(status => status !== appointment.status).map(status => (
                              <button
                                key={status}
                                onClick={() => handleStatusChange(appointment.id, status)}
                                disabled={appointmentStatus.updating}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  border: '1px solid #e2e8f0',
                                  background: 'white',
                                  color: '#0f172a',
                                  cursor: appointmentStatus.updating ? 'not-allowed' : 'pointer',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textAlign: 'left'
                                }}
                              >
                                {scanAppointmentService.getStatusDisplayName(status as any)}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Timeline Information */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ color: '#64748b', fontSize: 12 }}>
                            Requested: <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {formatDate(appointment.requestedAt)}
                            </span>
                          </div>
                          {appointment.scheduledAt && (
                            <div style={{ color: '#64748b', fontSize: 12 }}>
                              Scheduled: <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                {formatDate(appointment.scheduledAt)}
                              </span>
                            </div>
                          )}
                          {appointment.completedAt && (
                            <div style={{ color: '#64748b', fontSize: 12 }}>
                              Completed: <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                {formatDate(appointment.completedAt)}
                              </span>
                            </div>
                          )}
                          {appointment.feeAmount && (
                            <div style={{ color: '#64748b', fontSize: 12 }}>
                              Fee: <span style={{ fontWeight: 700, color: '#0f172a' }}>${appointment.feeAmount}</span>
                            </div>
                          )}
                        </div>

                        {/* Staff Information */}
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <div style={{ display: 'grid', gap: 2 }}>
                            <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Requesting Doctor</div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>
                              {getStaffDisplayName(appointment.doctorId, staffNameMap)}
                            </div>
                          </div>
                          {appointment.radiologistId && (
                            <div style={{ display: 'grid', gap: 2 }}>
                              <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Assigned Radiologist</div>
                              <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>
                                {getStaffDisplayName(appointment.radiologistId, staffNameMap)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Scan Reason */}
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Reason for Scan</div>
                          <div style={{ color: '#0f172a', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                            {appointment.scanReason}
                          </div>
                        </div>

                        {/* Additional Notes */}
                        {appointment.notes && (
                          <div style={{ display: 'grid', gap: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Additional Notes</div>
                            <div style={{ color: '#0f172a', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                              {appointment.notes}
                            </div>
                          </div>
                        )}

                        {/* Image Status */}
                        {appointment.imageFilePath && (
                          <div style={{ padding: 8, background: '#dcfce7', borderRadius: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, color: '#166534', marginBottom: 4 }}>
                              ✅ Scan Image Available
                            </div>
                            <div style={{ fontSize: 13, color: '#166534' }}>
                              {appointment.imageUploadedAt ? `Uploaded: ${formatDate(appointment.imageUploadedAt)}` : 'Recently uploaded'}
                            </div>
                            <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                              File: {appointment.imageFilePath}
                            </div>
                          </div>
                        )}

                        {/* Medical Record Reference */}
                        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                          Medical Record ID: {appointment.medicalRecordId?.slice(0, 8)}...{appointment.medicalRecordId?.slice(-4)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>

          <div
            style={{
              background: 'white',
              border: '1px solid #e6efff',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Diagnoses (your cases)</div>
              <button
                type="button"
                onClick={loadDiagnoses}
                disabled={diagnosesLoading}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid #dbeafe',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  cursor: diagnosesLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 800,
                }}
              >
                {diagnosesLoading ? 'Loading...' : 'Load'}
              </button>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Medical Record</div>
                <select
                  value={diagnosisRecordId}
                  onChange={(e) => setDiagnosisRecordId(e.target.value)}
                  style={{ width: '100%', height: 42, padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: 'white', boxSizing: 'border-box' }}
                >
                  <option value="">Select record...</option>
                  {safeRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.chiefComplaint || 'Medical Record'} ({r.id.slice(0, 8)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Disease Name</div>
                <input
                  value={diagnosisDiseaseName}
                  onChange={(e) => setDiagnosisDiseaseName(e.target.value)}
                  placeholder="e.g. Pneumonia"
                  style={{ width: '100%', height: 42, padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>ICD Code</div>
                <input
                  value={diagnosisIcdCode}
                  onChange={(e) => setDiagnosisIcdCode(e.target.value)}
                  placeholder="e.g. J18.9"
                  style={{ width: '100%', height: 42, padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Severity</div>
                <select
                  value={diagnosisSeverity}
                  onChange={(e) => setDiagnosisSeverity((e.target.value as DiagnosisSeverity) || '')}
                  style={{ width: '100%', height: 42, padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: 'white', boxSizing: 'border-box' }}
                >
                  <option value="">—</option>
                  <option value="MILD">Mild</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="SEVERE">Severe</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Status</div>
                <select
                  value={diagnosisStatus}
                  onChange={(e) => setDiagnosisStatus((e.target.value as DiagnosisStatus) || '')}
                  style={{ width: '100%', height: 42, padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: 'white', boxSizing: 'border-box' }}
                >
                  <option value="">—</option>
                  <option value="ACTIVE">Active</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CHRONIC">Chronic</option>
                  <option value="UNDER_OBSERVATION">Under Observation</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'end' }}>
                <button
                  type="button"
                  onClick={handleCreateDiagnosis}
                  disabled={creatingDiagnosis}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: creatingDiagnosis ? 'not-allowed' : 'pointer',
                    fontWeight: 900,
                    boxSizing: 'border-box',
                  }}
                >
                  {creatingDiagnosis ? 'Saving...' : 'Add Diagnosis'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
                <textarea
                  value={diagnosisDescription}
                  onChange={(e) => setDiagnosisDescription(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Treatment Plan</div>
                <textarea
                  value={diagnosisTreatmentPlan}
                  onChange={(e) => setDiagnosisTreatmentPlan(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
                <textarea
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {images.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Attach Images</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {images.slice(0, 8).map((img) => {
                      const checked = diagnosisImageIds.includes(img.id);
                      return (
                        <label key={img.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) setDiagnosisImageIds((prev) => [...prev, img.id]);
                              else setDiagnosisImageIds((prev) => prev.filter((x) => x !== img.id));
                            }}
                          />
                          <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 800 }}>{img.imageType || 'Image'}</span>
                          <span style={{ fontSize: 12, color: '#64748b' }}>{img.id}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {diagnosesLoading ? (
              <div style={{ padding: '18px 0' }}>
                <LoadingSpinner size="small" message="Loading diagnoses..." />
              </div>
            ) : safeDiagnoses.length === 0 ? (
              <div style={{ marginTop: 10, color: '#64748b', fontSize: 14 }}>
                No diagnoses found for this patient (or you may not have access).
              </div>
            ) : (
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 900, color: '#1d4ed8' }}>Show diagnoses ({safeDiagnoses.length})</summary>
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {safeDiagnoses.map((d) => {
                    const metaItem = (label: string, value: React.ReactNode) => (
                      <div style={{ display: 'grid', gap: 2 }}>
                        <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{value}</div>
                      </div>
                    );

                    const hasDetails = Boolean(d.treatmentPlan || d.notes);

                    return (
                      <div
                        key={d.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 14,
                          padding: 14,
                          background: 'white',
                          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                          display: 'grid',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ minWidth: 240 }}>
                            <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Diagnosis</div>
                            <div style={{ marginTop: 4, fontWeight: 900, color: '#0f172a', fontSize: 16 }}>{d.diseaseName || 'Diagnosis'}</div>
                          </div>
                          {statusBadge(d.status)}
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ color: '#64748b', fontSize: 12 }}>
                            ICD: <span style={{ color: '#0f172a', fontWeight: 900 }}>{d.icdCode || '—'}</span>
                          </div>
                          {severityBadge(d.severity)}
                        </div>

                        <div style={{ height: 1, background: '#e2e8f0' }} />

                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {metaItem('Diagnosed', formatDate(d.diagnosisDate))}
                          {metaItem('By', getStaffDisplayName(d.diagnosedByStaffId, staffNameMap))}
                          {metaItem('Diagnosis ID', <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>{d.id}</span>)}
                        </div>

                        {d.description ? (
                          <div style={{ display: 'grid', gap: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Description</div>
                            <div style={{ color: '#0f172a', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.description}</div>
                          </div>
                        ) : null}

                        {hasDetails && (
                          <details>
                            <summary style={{ cursor: 'pointer', fontWeight: 900, color: '#1d4ed8' }}>More details</summary>
                            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                              {d.treatmentPlan ? (
                                <div style={{ display: 'grid', gap: 6 }}>
                                  <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Treatment Plan</div>
                                  <div style={{ color: '#0f172a', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.treatmentPlan}</div>
                                </div>
                              ) : null}
                              {d.notes ? (
                                <div style={{ display: 'grid', gap: 6 }}>
                                  <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Notes</div>
                                  <div style={{ color: '#0f172a', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.notes}</div>
                                </div>
                              ) : null}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>

          <div
            style={{
              background: 'white',
              border: '1px solid #e6efff',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Reports (generated by you)</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={loadReports}
                  disabled={reportsLoading}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid #dbeafe',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    cursor: reportsLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                  }}
                >
                  {reportsLoading ? 'Loading...' : 'Load'}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#1d4ed8',
                    color: 'white',
                    cursor: generatingReport ? 'not-allowed' : 'pointer',
                    fontWeight: 900,
                  }}
                >
                  {generatingReport ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Type</div>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: 'white' }}
                >
                  <option value="PATIENT_SUMMARY">Patient Summary</option>
                  <option value="DIAGNOSIS_HISTORY">Diagnosis History</option>
                  <option value="TREATMENT_PROGRESS">Treatment Progress</option>
                  <option value="COMPREHENSIVE">Comprehensive</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Format</div>
                <select
                  value={reportFormat}
                  onChange={(e) => setReportFormat(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: 'white' }}
                >
                  <option value="JSON">JSON</option>
                  <option value="PDF">PDF</option>
                  <option value="TEXT">Text</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Start Date</div>
                <input
                  type="datetime-local"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc' }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>End Date</div>
                <input
                  type="datetime-local"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc' }}
                />
              </div>
            </div>

            {reportsLoading ? (
              <div style={{ padding: '18px 0' }}>
                <LoadingSpinner size="small" message="Loading reports..." />
              </div>
            ) : safeReports.length === 0 ? (
              <div style={{ marginTop: 10, color: '#64748b', fontSize: 14 }}>
                No reports found for this patient (or you may not have access).
              </div>
            ) : (
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 900, color: '#1d4ed8' }}>Show reports ({safeReports.length})</summary>
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {safeReports.map((r) => {
                    const parsed = safeJsonParse(r.reportContent);
                    const summary = parsed?.summary;
                    const totalVisits = summary?.totalVisits;
                    const totalDiagnoses = summary?.totalDiagnoses;
                    const activeDiagnoses: any[] = Array.isArray(summary?.activeDiagnoses) ? summary.activeDiagnoses : [];

                    return (
                      <div
                        key={r.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: 12,
                          background: '#f8fafc',
                          display: 'grid',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ fontWeight: 900, color: '#0f172a' }}>{r.reportType}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ color: '#64748b', fontSize: 12 }}>Generated: {formatDate(r.generatedAt)}</span>
                            <button
                              type="button"
                              onClick={() => handleDownloadReport(r)}
                              style={{
                                padding: '8px 10px',
                                borderRadius: 10,
                                border: 'none',
                                background: '#10b981',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 900,
                                fontSize: 12,
                              }}
                            >
                              Download
                            </button>
                          </div>
                        </div>

                        <div style={{ color: '#64748b', fontSize: 12 }}>
                          Format: <span style={{ color: '#0f172a', fontWeight: 800 }}>{r.format}</span>
                          {' | '}Report ID: <span style={{ color: '#0f172a', fontWeight: 800 }}>{r.id}</span>
                          {' | '}By:{' '}
                          <span style={{ color: '#0f172a', fontWeight: 800 }}>{getStaffDisplayName(r.generatedByStaffId, staffNameMap)}</span>
                        </div>

                        {parsed ? (
                          <div style={{ display: 'grid', gap: 8 }}>
                            <div style={{ fontWeight: 900, color: '#0f172a' }}>Report Summary</div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: '#0f172a', fontSize: 13 }}>
                              <div>
                                Visits: <span style={{ fontWeight: 900 }}>{typeof totalVisits === 'number' ? totalVisits : '—'}</span>
                              </div>
                              <div>
                                Total diagnoses: <span style={{ fontWeight: 900 }}>{typeof totalDiagnoses === 'number' ? totalDiagnoses : '—'}</span>
                              </div>
                              <div>
                                Active: <span style={{ fontWeight: 900 }}>{activeDiagnoses.length}</span>
                              </div>
                            </div>

                            {activeDiagnoses.length > 0 && (
                              <div style={{ display: 'grid', gap: 8 }}>
                                <div style={{ fontWeight: 900, color: '#0f172a' }}>Active Diagnoses</div>
                                <div style={{ display: 'grid', gap: 8 }}>
                                  {activeDiagnoses.slice(0, 6).map((d: any) => (
                                    <div key={d.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: 'white' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 900, color: '#0f172a' }}>{d.diseaseName || 'Diagnosis'}</div>
                                        {statusBadge(d.status)}
                                      </div>
                                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                                        <div style={{ color: '#64748b', fontSize: 12 }}>
                                          ICD: <span style={{ color: '#0f172a', fontWeight: 800 }}>{d.icdCode || '—'}</span>
                                        </div>
                                        {severityBadge(d.severity)}
                                      </div>
                                      <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                                        Diagnosed: {formatDate(d.diagnosisDate)} | By:{' '}
                                        <span style={{ color: '#0f172a', fontWeight: 800 }}>{getStaffDisplayName(d.diagnosedByStaffId, staffNameMap)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <details>
                              <summary style={{ cursor: 'pointer', fontWeight: 900, color: '#64748b' }}>Show raw content</summary>
                              <pre style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', fontSize: 12, color: '#0f172a' }}>{JSON.stringify(parsed, null, 2)}</pre>
                            </details>
                          </div>
                        ) : r.reportContent ? (
                          <div style={{ color: '#0f172a', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {r.reportContent.length > 360 ? `${r.reportContent.slice(0, 360)}...` : r.reportContent}
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontSize: 12 }}>No content preview available.</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
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
