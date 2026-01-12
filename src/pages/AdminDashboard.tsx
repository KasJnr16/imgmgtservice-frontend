import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 32, color: '#0f172a' }}>Admin Dashboard</h2>
      <p style={{ margin: '0 0 24px', color: '#475569', lineHeight: 1.6 }}>
        System administration and user management for ABC Healthcare.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e6efff',
            background: 'white',
            padding: 20,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onClick={() => navigate('/user-management')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.04)';
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>User Management</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            Manage user accounts, roles, and permissions.
          </p>
        </div>

        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e6efff',
            background: 'white',
            padding: 20,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onClick={() => navigate('/admin/image-review')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.04)';
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>Image Review</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            Browse images and filter by patient, type, and tag.
          </p>
        </div>

        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e6efff',
            background: 'white',
            padding: 20,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>System Settings</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            Configure system-wide settings and integrations.
          </p>
        </div>

        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e6efff',
            background: 'white',
            padding: 20,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>Audit Logs</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            View system activity and security audit logs.
          </p>
        </div>

        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e6efff',
            background: 'white',
            padding: 20,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onClick={() => navigate('/admin/analytics')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.04)';
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>Reports & Analytics</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            Generate system usage reports and analytics.
          </p>
        </div>

        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e6efff',
            background: 'white',
            padding: 20,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>Backup & Restore</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            Manage data backup and recovery operations.
          </p>
        </div>

        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e6efff',
            background: 'white',
            padding: 20,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: 18 }}>Security</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            Manage security policies and access controls.
          </p>
        </div>
      </div>
    </div>
  );
}
