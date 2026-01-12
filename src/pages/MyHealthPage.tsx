import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken, getUserRole } from '../utils/authStorage';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getMedicalStaffNameMap, getStaffDisplayName, StaffNameMap } from '../services/medicalStaff';
import {
  DiagnosisDTO,
  DiagnosisSeverity,
  DiagnosisStatus,
  GenerateReportDTO,
  MedicalRecordDTO,
  ReportDTO,
  ScanAppointmentDTO,
  generateReport,
  getDiagnosesByPatient,
  getMedicalRecordsByPatient,
  getReportsByPatient,
  scanAppointmentService,
} from '../services/analytics';

export default function MyHealthPage() {
  const navigate = useNavigate();
  const role = getUserRole();
  const { toasts, removeToast, showError, showInfo, showSuccess } = useToast();

  const [patientId, setPatientId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [recordsLoading, setRecordsLoading] = useState(false);
  const [diagnosesLoading, setDiagnosesLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [scanAppointmentsLoading, setScanAppointmentsLoading] = useState(false);

  const [records, setRecords] = useState<MedicalRecordDTO[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisDTO[]>([]);
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [scanAppointments, setScanAppointments] = useState<ScanAppointmentDTO[]>([]);

  const [staffNameMap, setStaffNameMap] = useState<StaffNameMap>({});

  const [tab, setTab] = useState<'records' | 'diagnoses' | 'reports' | 'scans'>('reports');

  const [reportType, setReportType] = useState<GenerateReportDTO['reportType']>('PATIENT_SUMMARY');
  const [reportFormat, setReportFormat] = useState<GenerateReportDTO['format']>('JSON');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);

  function getErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const statusText = err.response?.statusText;
      const data = err.response?.data;
      const serverMessage = typeof data === 'string' ? data : undefined;

      if (!err.response) return `${fallback} (network/proxy error)`;
      return `${fallback} (${status}${statusText ? ` ${statusText}` : ''})${serverMessage ? `: ${serverMessage}` : ''}`;
    }

    if (err instanceof Error) return `${fallback}: ${err.message}`;
    return fallback;
  }

  useEffect(() => {
    if (role !== 'PATIENT') {
      navigate('/dashboard');
      return;
    }

    const token = getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const id = payload?.id as string | undefined;
      if (!id) {
        showError('Missing patient id in token. Please log out and log in again.');
        navigate('/dashboard');
        return;
      }
      setPatientId(id);
    } catch {
      showError('Invalid session token. Please log out and log in again.');
      navigate('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!patientId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadReports(), loadDiagnoses(), loadRecords(), loadScanAppointments()]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    if (!patientId) return;
    setRecordsLoading(true);
    try {
      const data = await getMedicalRecordsByPatient(patientId);
      setRecords(data);
      await ensureStaffNames((Array.isArray(data) ? data : []).map((r) => r.createdByStaffId));
    } catch (err) {
      setRecords([]);
      showError(getErrorMessage(err, 'Failed to load medical records'));
    } finally {
      setRecordsLoading(false);
    }
  };

  const loadDiagnoses = async () => {
    if (!patientId) return;
    setDiagnosesLoading(true);
    try {
      const data = await getDiagnosesByPatient(patientId);
      setDiagnoses(data);
      await ensureStaffNames((Array.isArray(data) ? data : []).map((d) => d.diagnosedByStaffId));
    } catch (err) {
      setDiagnoses([]);
      showError(getErrorMessage(err, 'Failed to load diagnoses'));
    } finally {
      setDiagnosesLoading(false);
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

  const loadScanAppointments = async () => {
    if (!patientId) return;
    setScanAppointmentsLoading(true);
    try {
      const data = await scanAppointmentService.getAppointmentsForPatient(patientId);
      setScanAppointments(data);
      await ensureStaffNames((Array.isArray(data) ? data : []).map((r) => r.doctorId).filter(Boolean));
      await ensureStaffNames((Array.isArray(data) ? data : []).map((r) => r.radiologistId || '').filter(Boolean));
    } catch (err) {
      setScanAppointments([]);
      showError(getErrorMessage(err, 'Failed to load scan appointments'));
    } finally {
      setScanAppointmentsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!patientId) return;

    setGenerating(true);
    try {
      const payload: GenerateReportDTO = {
        patientId,
        reportType,
        format: reportFormat,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      await generateReport(payload);
      showSuccess('Report generation requested');
      await loadReports();
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to generate report'));
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      const ad = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
      const bd = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
      return bd - ad;
    });
  }, [reports]);

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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <LoadingSpinner size="large" message="Loading your health data..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 32, color: '#0f172a' }}>My Health</h2>
        <p style={{ margin: 0, color: '#64748b' }}>View your medical records, diagnoses, and generated reports.</p>
      </div>

      <div
        style={{
          background: 'white',
          border: '1px solid #e6efff',
          borderRadius: 16,
          padding: 16,
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>Generate Report</div>
            <div style={{ color: '#64748b', fontSize: 13 }}>Reports are generated from your own medical data.</div>
          </div>

          <button
            type="button"
            onClick={() => {
              showInfo('Refreshing data...');
              loadAll();
            }}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #dbeafe',
              background: '#eff6ff',
              color: '#1d4ed8',
              cursor: 'pointer',
              fontWeight: 900,
            }}
          >
            Refresh
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Type</div>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              style={{ width: '100%', height: 42, padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: 'white', boxSizing: 'border-box' }}
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
              style={{ width: '100%', height: 42, padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: 'white', boxSizing: 'border-box' }}
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
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', height: 42, padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>End Date</div>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', height: 42, padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>&nbsp;</div>
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={generating}
              style={{
                width: '100%',
                height: 42,
                padding: '10px 14px',
                background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                cursor: generating ? 'not-allowed' : 'pointer',
                fontWeight: 900,
                boxSizing: 'border-box',
              }}
            >
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setTab('reports')}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #dbeafe',
            background: tab === 'reports' ? '#1d4ed8' : 'white',
            color: tab === 'reports' ? 'white' : '#1d4ed8',
            cursor: 'pointer',
            fontWeight: 900,
          }}
        >
          Reports ({reports.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('diagnoses')}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #dbeafe',
            background: tab === 'diagnoses' ? '#1d4ed8' : 'white',
            color: tab === 'diagnoses' ? 'white' : '#1d4ed8',
            cursor: 'pointer',
            fontWeight: 900,
          }}
        >
          Diagnoses ({diagnoses.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('records')}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #dbeafe',
            background: tab === 'records' ? '#1d4ed8' : 'white',
            color: tab === 'records' ? 'white' : '#1d4ed8',
            cursor: 'pointer',
            fontWeight: 900,
          }}
        >
          Records ({records.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('scans')}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #dbeafe',
            background: tab === 'scans' ? '#1d4ed8' : 'white',
            color: tab === 'scans' ? 'white' : '#1d4ed8',
            cursor: 'pointer',
            fontWeight: 900,
          }}
        >
          Scans ({scanAppointments.length})
        </button>
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
        {tab === 'reports' && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Your Reports</div>
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
                  fontWeight: 900,
                }}
              >
                {reportsLoading ? 'Loading...' : 'Reload'}
              </button>
            </div>

            {reportsLoading ? (
              <div style={{ padding: '18px 0' }}>
                <LoadingSpinner size="small" message="Loading reports..." />
              </div>
            ) : sortedReports.length === 0 ? (
              <div style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>No reports found.</div>
            ) : (
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {sortedReports.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 12,
                      background: '#f8fafc',
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 900, color: '#0f172a' }}>{r.reportType}</div>
                      <div style={{ color: '#64748b', fontSize: 12 }}>Generated: {formatDate(r.generatedAt)}</div>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      Format: <span style={{ color: '#0f172a', fontWeight: 800 }}>{r.format}</span>
                      {' | '}Report ID: <span style={{ color: '#0f172a', fontWeight: 800 }}>{r.id}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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

                    {(() => {
                      const parsed = safeJsonParse(r.reportContent);
                      const summary = parsed?.summary;
                      const totalVisits = summary?.totalVisits;
                      const totalDiagnoses = summary?.totalDiagnoses;
                      const activeDiagnoses: any[] = Array.isArray(summary?.activeDiagnoses) ? summary.activeDiagnoses : [];

                      if (parsed) {
                        return (
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

                            <details>
                              <summary style={{ cursor: 'pointer', fontWeight: 900, color: '#64748b' }}>Show raw content</summary>
                              <pre style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', fontSize: 12, color: '#0f172a' }}>{JSON.stringify(parsed, null, 2)}</pre>
                            </details>
                          </div>
                        );
                      }

                      if (r.reportContent) {
                        return (
                          <div style={{ color: '#0f172a', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {r.reportContent.length > 280 ? `${r.reportContent.slice(0, 280)}...` : r.reportContent}
                          </div>
                        );
                      }

                      return <div style={{ color: '#94a3b8', fontSize: 12 }}>No content preview available.</div>;
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'diagnoses' && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Your Diagnoses</div>
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
                  fontWeight: 900,
                }}
              >
                {diagnosesLoading ? 'Loading...' : 'Reload'}
              </button>
            </div>

            {diagnosesLoading ? (
              <div style={{ padding: '18px 0' }}>
                <LoadingSpinner size="small" message="Loading diagnoses..." />
              </div>
            ) : diagnoses.length === 0 ? (
              <div style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>No diagnoses found.</div>
            ) : (
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {diagnoses.map((d) => {
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
            )}
          </div>
        )}

        {tab === 'scans' && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Your Scan Appointments</div>
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
                  fontWeight: 900,
                }}
              >
                {scanAppointmentsLoading ? 'Loading...' : 'Reload'}
              </button>
            </div>

            {scanAppointmentsLoading ? (
              <div style={{ padding: '18px 0' }}>
                <LoadingSpinner size="small" message="Loading scan appointments..." />
              </div>
            ) : scanAppointments.length === 0 ? (
              <div style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>No scan appointments found.</div>
            ) : (
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

                  return (
                    <div
                      key={appointment.id}
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
                          <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
                            {scanAppointmentService.getScanTypeDisplayName(appointment.scanType)}
                          </div>
                          <div style={{ marginTop: 4, fontWeight: 900, color: '#0f172a', fontSize: 16 }}>
                            Scan Appointment
                          </div>
                        </div>
                        {getStatusBadge(appointment.status)}
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: 12 }}>
                          Requested: <span style={{ color: '#0f172a', fontWeight: 900 }}>{formatDate(appointment.requestedAt)}</span>
                        </div>
                        {appointment.scheduledAt && (
                          <div style={{ color: '#64748b', fontSize: 12 }}>
                            Scheduled: <span style={{ color: '#0f172a', fontWeight: 900 }}>{formatDate(appointment.scheduledAt)}</span>
                          </div>
                        )}
                        {appointment.feeAmount && (
                          <div style={{ color: '#64748b', fontSize: 12 }}>
                            Fee: <span style={{ color: '#0f172a', fontWeight: 900 }}>${appointment.feeAmount}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Doctor</div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>
                            {getStaffDisplayName(appointment.doctorId, staffNameMap)}
                          </div>
                        </div>
                        {appointment.radiologistId && (
                          <div style={{ display: 'grid', gap: 2 }}>
                            <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Radiologist</div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>
                              {getStaffDisplayName(appointment.radiologistId, staffNameMap)}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Reason for Scan</div>
                        <div style={{ color: '#0f172a', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                          {appointment.scanReason}
                        </div>
                      </div>

                      {appointment.notes && (
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Notes</div>
                          <div style={{ color: '#0f172a', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                            {appointment.notes}
                          </div>
                        </div>
                      )}

                      {appointment.imageFilePath && (
                        <div style={{ padding: 8, background: '#dcfce7', borderRadius: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#166534', marginBottom: 4 }}>
                            ✅ Image Available
                          </div>
                          <div style={{ fontSize: 13, color: '#166534' }}>
                            {appointment.imageUploadedAt ? `Uploaded: ${formatDate(appointment.imageUploadedAt)}` : 'Recently uploaded'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'records' && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Your Medical Records</div>
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
                  fontWeight: 900,
                }}
              >
                {recordsLoading ? 'Loading...' : 'Reload'}
              </button>
            </div>

            {recordsLoading ? (
              <div style={{ padding: '18px 0' }}>
                <LoadingSpinner size="small" message="Loading records..." />
              </div>
            ) : records.length === 0 ? (
              <div style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>No medical records found.</div>
            ) : (
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {records.map((r) => {
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
            )}
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
