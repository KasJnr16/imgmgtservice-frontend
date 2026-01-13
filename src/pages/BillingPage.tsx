import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getUserRole } from '../utils/authStorage';
import { getBillingCharges, getOutstandingBills, getBillingAccount, payBillingCharge, checkAccountSettled, BillingDTO, BillingAccountDTO } from '../services/billing';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

export default function BillingPage() {
  const navigate = useNavigate();
  const [charges, setCharges] = useState<BillingDTO[]>([]);
  const [outstandingBills, setOutstandingBills] = useState<BillingDTO[]>([]);
  const [billingAccount, setBillingAccount] = useState<BillingAccountDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'outstanding' | 'paid'>('all');
  const { toasts, removeToast, showSuccess, showError } = useToast();

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

      if (!err.response) {
        return `${fallback} (network/CORS error)`;
      }

      return `${fallback} (${status}${statusText ? ` ${statusText}` : ''})${serverMessage ? `: ${serverMessage}` : ''}`;
    }

    return fallback;
  }

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      // Get user ID from JWT
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.id || '';
      const userRole = getUserRole();

      if (!userId) {
        showError('Missing patient id in token. Please log out and log in again.');
        return;
      }

      if (userRole !== 'PATIENT') {
        navigate('/dashboard');
        return;
      }

      // Load billing account first
      console.log('Loading billing account for userId:', userId);
      const accountData = await getBillingAccount(userId);
      console.log('Billing account response:', accountData);
      setBillingAccount(accountData);
      
      // Then load billing charges
      console.log('Loading billing charges for userId:', userId);
      const chargesData = await getBillingCharges(userId);
      console.log('Billing charges response:', chargesData);
      console.log('Sample charge data:', chargesData[0]);
      setCharges(chargesData);
      
      // Load outstanding bills
      console.log('Loading outstanding bills for userId:', userId);
      const outstandingData = await getOutstandingBills(userId);
      console.log('Outstanding bills response:', outstandingData);
      setOutstandingBills(outstandingData);
    } catch (error) {
      console.error('Error loading billing data:', error);
      showError(getErrorMessage(error, 'Failed to load billing information'));
    } finally {
      setLoading(false);
    }
  };

  const handlePayBill = async (billingId: string) => {
    setActionLoading(billingId);
    try {
      await payBillingCharge(billingId);
      showSuccess('Bill paid successfully');
      // Reload data to update status
      await loadBillingData();
    } catch (error) {
      console.error('Error paying bill:', error);
      showError(getErrorMessage(error, 'Failed to pay bill'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckSettled = async () => {
    if (!billingAccount?.patientId) return;
    
    try {
      const isSettled = await checkAccountSettled(billingAccount.patientId);
      showSuccess(isSettled ? 'Account is fully settled' : 'Account has outstanding balance');
    } catch (error) {
      console.error('Error checking account status:', error);
      showError(getErrorMessage(error, 'Failed to check account status'));
    }
  };

  const handleRefreshData = async () => {
    try {
      await loadBillingData();
      showSuccess('Billing data refreshed');
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to refresh billing data'));
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Invalid Date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'Invalid Time';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Time';
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Invalid Time';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const displayCharges = activeTab === 'all' ? charges : activeTab === 'outstanding' ? outstandingBills : charges.filter(charge => charge.paid);
  const totalOutstanding = outstandingBills.reduce((sum, bill) => sum + bill.amountDue, 0);
  const paidBills = charges.filter(charge => charge.paid);
  const totalPaid = paidBills.reduce((sum, bill) => sum + bill.amountDue, 0);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <LoadingSpinner size="large" message="Loading billing information..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 32, color: '#0f172a' }}>My Bills</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: 16 }}>
          View and manage your medical billing statements
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={handleRefreshData}
          style={{
            padding: '10px 20px',
            background: '#f1f5f9',
            color: '#475569',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Refresh Data
        </button>
        
        <button
          onClick={handleCheckSettled}
          disabled={!billingAccount}
          style={{
            padding: '10px 20px',
            background: billingAccount ? '#1d4ed8' : '#e2e8f0',
            color: billingAccount ? 'white' : '#9ca3af',
            border: 'none',
            borderRadius: 8,
            cursor: billingAccount ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Check Account Status
        </button>
      </div>

      {/* Billing Account Summary */}
      {billingAccount && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>
                {billingAccount.accountName}
              </h3>
              <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>
                Account Balance
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {formatCurrency(billingAccount.balance)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                {billingAccount.isSettled ? 'Fully Settled' : 'Payment Required'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e6efff' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'all' ? '#1d4ed8' : 'transparent',
              color: activeTab === 'all' ? 'white' : '#64748b',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            All Bills ({charges.length})
          </button>
          <button
            onClick={() => setActiveTab('outstanding')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'outstanding' ? '#1d4ed8' : 'transparent',
              color: activeTab === 'outstanding' ? 'white' : '#64748b',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Outstanding ({outstandingBills.length}) - {formatCurrency(totalOutstanding)}
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'paid' ? '#1d4ed8' : 'transparent',
              color: activeTab === 'paid' ? 'white' : '#64748b',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Paid ({paidBills.length}) - {formatCurrency(totalPaid)}
          </button>
        </div>
      </div>

      {/* Bills List */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e6efff',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {displayCharges.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>
              {activeTab === 'all' ? 'No billing records' : activeTab === 'outstanding' ? 'No outstanding bills' : 'No paid bills'}
            </h3>
            <p style={{ margin: 0, fontSize: 14 }}>
              {activeTab === 'all' 
                ? 'You have no billing history at this time'
                : activeTab === 'outstanding'
                ? 'All your bills have been paid'
                : 'You have not paid any bills yet'
              }
            </p>
          </div>
        ) : (
          <div>
            {displayCharges.map((charge) => (
              <div
                key={charge.id}
                style={{
                  padding: 20,
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: `${charge.paid ? '#dcfce7' : '#fef3c7'}`,
                      color: charge.paid ? '#166534' : '#92400e',
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      {charge.paid ? 'Paid' : 'Pending'}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      Due: {formatDate(charge.dueDate)}
                    </div>
                  </div>
                  <div style={{ color: '#0f172a', fontSize: 14, fontWeight: 500 }}>
                    {charge.description}
                  </div>
                  {charge.paid && (
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                      Paid on: {charge.paidAt ? formatDate(charge.paidAt) : charge.createdAt ? formatDate(charge.createdAt) : 'Date not available'}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                      {formatCurrency(charge.amountDue)}
                    </div>
                    {!charge.paid && new Date(charge.dueDate) < new Date() && (
                      <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
                        Overdue
                      </div>
                    )}
                  </div>

                  {!charge.paid && (
                    <button
                      onClick={() => handlePayBill(charge.id)}
                      disabled={actionLoading === charge.id}
                      style={{
                        padding: '8px 16px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: actionLoading === charge.id ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {actionLoading === charge.id ? (
                        <>
                          <LoadingSpinner size="small" />
                          Processing...
                        </>
                      ) : (
                        'Pay Now'
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
