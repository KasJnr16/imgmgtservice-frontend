import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getUserRole } from '../utils/authStorage';
import { getPatients, PatientResponseDTO } from '../services/patients';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import {
  DiagnosisDTO,
  GenerateReportDTO,
  MedicalRecordDTO,
  ReportDTO,
  generateReport,
  getDiagnosesByPatient,
  getMedicalRecordsByPatient,
  getReportsByPatient,
} from '../services/analytics';
import { getMedicalStaffNameMap, getStaffDisplayName, StaffNameMap } from '../services/medicalStaff';

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const role = getUserRole();
  const { toasts, removeToast, showError, showInfo, showSuccess } = useToast();

  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patients, setPatients] = useState<PatientResponseDTO[]>([]);
  const [patientId, setPatientId] = useState('');

  const [recordsLoading, setRecordsLoading] = useState(false);
  const [diagnosesLoading, setDiagnosesLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [records, setRecords] = useState<MedicalRecordDTO[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisDTO[]>([]);
  const [reports, setReports] = useState<ReportDTO[]>([]);

  const [tab, setTab] = useState<'reports' | 'diagnoses' | 'records'>('reports');

  const [reportType, setReportType] = useState<GenerateReportDTO['reportType']>('COMPREHENSIVE');
  const [reportFormat, setReportFormat] = useState<GenerateReportDTO['format']>('JSON');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);

  const [search, setSearch] = useState('');
  const [staffNameMap, setStaffNameMap] = useState<StaffNameMap>({});

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

  React.useEffect(() => {
    if (role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }

    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (diagnoses.length || records.length || reports.length) {
      ensureStaffNames();
    }
  }, [diagnoses, records, reports]);

  const loadPatients = async () => {
    setPatientsLoading(true);
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to load patients'));
    } finally {
      setPatientsLoading(false);
    }
  };

  const ensurePatient = () => {
    if (!patientId) {
      showError('Select a patient first');
      return false;
    }
    return true;
  };

  const ensureStaffNames = async () => {
    const ids = new Set<string>();
    diagnoses.forEach((d) => {
      if (d.diagnosedByStaffId) ids.add(d.diagnosedByStaffId);
    });
    records.forEach((r) => {
      if (r.createdByStaffId) ids.add(r.createdByStaffId);
    });
    reports.forEach((r) => {
      if (r.generatedByStaffId) ids.add(r.generatedByStaffId);
    });
    if (ids.size === 0) return;
    const map = await getMedicalStaffNameMap(Array.from(ids));
    setStaffNameMap(map);
  };

  const loadRecords = async () => {
    if (!ensurePatient()) return;
    setRecordsLoading(true);
    try {
      const data = await getMedicalRecordsByPatient(patientId);
      setRecords(data);
      showInfo(`Loaded ${data.length} record${data.length === 1 ? '' : 's'}`);
    } catch (err) {
      setRecords([]);
      showError(getErrorMessage(err, 'Failed to load medical records'));
    } finally {
      setRecordsLoading(false);
    }
  };

  const loadDiagnoses = async () => {
    if (!ensurePatient()) return;
    setDiagnosesLoading(true);
    try {
      const data = await getDiagnosesByPatient(patientId);
      setDiagnoses(data);
      showInfo(`Loaded ${data.length} diagnosis${data.length === 1 ? '' : 'es'}`);
    } catch (err) {
      setDiagnoses([]);
      showError(getErrorMessage(err, 'Failed to load diagnoses'));
    } finally {
      setDiagnosesLoading(false);
    }
  };

  const loadReports = async () => {
    if (!ensurePatient()) return;
    setReportsLoading(true);
    try {
      const data = await getReportsByPatient(patientId);
      setReports(data);
      showInfo(`Loaded ${data.length} report${data.length === 1 ? '' : 's'}`);
    } catch (err) {
      setReports([]);
      showError(getErrorMessage(err, 'Failed to load reports'));
    } finally {
      setReportsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!ensurePatient()) return;

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

  const badgeStyle = (bg: string, color: string) => ({
    fontSize: 11,
    fontWeight: 900,
    padding: '3px 8px',
    borderRadius: 6,
    background: bg,
    color,
    textTransform: 'uppercase' as const,
  });

  const statusBadge = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case 'ACTIVE':
        return <span style={badgeStyle('#dcfce7', '#166534')}>Active</span>;
      case 'RESOLVED':
        return <span style={badgeStyle('#dbeafe', '#1d4ed8')}>Resolved</span>;
      case 'UNDER_OBSERVATION':
        return <span style={badgeStyle('#fef3c7', '#92400e')}>Under Observation</span>;
      default:
        return <span style={badgeStyle('#f3f4f6', '#374151')}>{status}</span>;
    }
  };

  const severityBadge = (severity?: string) => {
    if (!severity) return null;
    switch (severity) {
      case 'MILD':
        return <span style={badgeStyle('#e0f2fe', '#0369a1')}>Mild</span>;
      case 'MODERATE':
        return <span style={badgeStyle('#fef3c7', '#92400e')}>Moderate</span>;
      case 'SEVERE':
        return <span style={badgeStyle('#fecaca', '#991b1b')}>Severe</span>;
      default:
        return <span style={badgeStyle('#f3f4f6', '#374151')}>{severity}</span>;
    }
  };

  const safeJsonParse = (text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const downloadTextFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = (report: ReportDTO) => {
    const content = report.reportContent || '';
    const filename = `${report.reportType?.toLowerCase().replace(/\s+/g, '-') || 'report'}-${report.id?.slice(0, 8)}.${report.format?.toLowerCase() || 'txt'}`;
    const mimeType = report.format === 'PDF' ? 'application/pdf' : report.format === 'JSON' ? 'application/json' : 'text/plain';
    downloadTextFile(content, filename, mimeType);
  };

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => {
      return (
        (r.id || '').toLowerCase().includes(q) ||
        (r.reportType || '').toLowerCase().includes(q) ||
        (r.generatedByStaffId || '').toLowerCase().includes(q) ||
        (r.format || '').toLowerCase().includes(q)
      );
    });
  }, [reports, search]);

  if (patientsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <LoadingSpinner size="large" message="Loading analytics..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 32, color: '#0f172a' }}>Reports & Analytics</h2>
        <p style={{ margin: 0, color: '#64748b' }}>Admin view of records, diagnoses, and reports across patients.</p>
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
          <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Patient</div>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: 'white' }}
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
          <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Report Type</div>
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
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc' }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>End Date</div>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc' }}
          />
        </div>

        <button
          type="button"
          onClick={handleGenerateReport}
          disabled={generating}
          style={{
            padding: '10px 14px',
            background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            cursor: generating ? 'not-allowed' : 'pointer',
            fontWeight: 900,
          }}
        >
          {generating ? 'Generating...' : 'Generate Report'}
        </button>
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
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Patient Reports</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reports"
                  style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc' }}
                />
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
                  {reportsLoading ? 'Loading...' : 'Load'}
                </button>
              </div>
            </div>

            {reportsLoading ? (
              <div style={{ padding: '18px 0' }}>
                <LoadingSpinner size="small" message="Loading reports..." />
              </div>
            ) : filteredReports.length === 0 ? (
              <div style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>No reports found.</div>
            ) : (
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {filteredReports.map((r) => {
                  const parsed = safeJsonParse(r.reportContent || '');
                  const isStructured = parsed && typeof parsed === 'object';
                  const summary = isStructured ? parsed.summary || parsed : null;

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
                          <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Report</div>
                          <div style={{ marginTop: 4, fontWeight: 900, color: '#0f172a', fontSize: 16 }}>{r.reportType || 'Report'}</div>
                        </div>
                        <div style={{ color: '#64748b', fontSize: 12, fontWeight: 800 }}>Generated: {formatDate(r.generatedAt)}</div>
                      </div>

                      <div style={{ height: 1, background: '#e2e8f0' }} />

                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Format</div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{r.format || '—'}</div>
                        </div>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>By</div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{getStaffDisplayName(r.generatedByStaffId, staffNameMap)}</div>
                        </div>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Report ID</div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>{r.id}</div>
                        </div>
                      </div>

                      {summary && typeof summary === 'object' ? (
                        <div style={{ display: 'grid', gap: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Report Summary</div>
                          <div style={{ display: 'grid', gap: 4, fontSize: 13, color: '#0f172a' }}>
                            {summary.totalVisits != null ? (
                              <div>
                                <span style={{ fontWeight: 900 }}>Total Visits:</span> {summary.totalVisits}
                              </div>
                            ) : null}
                            {summary.totalDiagnoses != null ? (
                              <div>
                                <span style={{ fontWeight: 900 }}>Total Diagnoses:</span> {summary.totalDiagnoses}
                              </div>
                            ) : null}
                            {summary.activeDiagnoses && Array.isArray(summary.activeDiagnoses) ? (
                              <div>
                                <span style={{ fontWeight: 900 }}>Active Diagnoses:</span>
                                <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyleType: 'disc' }}>
                                  {summary.activeDiagnoses.slice(0, 3).map((item: any, i: number) => (
                                    <li key={i} style={{ marginBottom: 2 }}>
                                      {item.diseaseName || item}
                                    </li>
                                  ))}
                                  {summary.activeDiagnoses.length > 3 && <li>…</li>}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <details>
                        <summary style={{ cursor: 'pointer', fontWeight: 900, color: '#1d4ed8', fontSize: 13 }}>Show raw content</summary>
                        <div style={{ marginTop: 10, padding: 10, background: '#f8fafc', borderRadius: 8, overflowX: 'auto' }}>
                          <pre style={{ margin: 0, fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', whiteSpace: 'pre-wrap' }}>
                            {isStructured ? JSON.stringify(parsed, null, 2) : r.reportContent}
                          </pre>
                        </div>
                      </details>

                      <button
                        type="button"
                        onClick={() => handleDownloadReport(r)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #dbeafe',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          cursor: 'pointer',
                          fontWeight: 900,
                          fontSize: 13,
                        }}
                      >
                        Download ({r.format?.toLowerCase() || 'txt'})
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'diagnoses' && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Patient Diagnoses</div>
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
                {diagnosesLoading ? 'Loading...' : 'Load'}
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

        {tab === 'records' && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Patient Medical Records</div>
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
                {recordsLoading ? 'Loading...' : 'Load'}
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
