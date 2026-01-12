import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { clearToken, isAuthenticated, getUserRole } from '../utils/authStorage';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const authed = isAuthenticated();
  const userRole = getUserRole();

  function onLogout() {
    clearToken();
    navigate('/');
  }

  // Show back button on all pages except dashboard and landing
  const showBackButton = authed && !location.pathname.includes('/dashboard') && location.pathname !== '/';

  function handleBack() {
    navigate(-1);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f9ff' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #e6efff',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
                  boxShadow: '0 10px 24px rgba(29, 78, 216, 0.25)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'white',
                  fontWeight: 800,
                  letterSpacing: 0.5,
                }}
                aria-hidden
              >
                A
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>ABC Healthcare</div>
                <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 700 }}>Image Management</div>
              </div>
            </div>

            <nav style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {showBackButton && (
                <button
                  onClick={handleBack}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #dbeafe',
                    background: 'white',
                    color: '#1d4ed8',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  ← Back
                </button>
              )}

              {!authed && (
                <Link
                  to="/"
                  style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 700, padding: '8px 10px', borderRadius: 10 }}
                >
                  Home
                </Link>
              )}

              {authed ? (
                <>
                  <Link
                    to="/dashboard"
                    style={{
                      textDecoration: 'none',
                      color: '#0f172a',
                      fontWeight: 700,
                      padding: '8px 10px',
                      borderRadius: 10,
                    }}
                  >
                    {userRole === 'ADMIN' ? 'Admin' : userRole === 'PATIENT' ? 'Patient' : 'Staff'} Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={onLogout}
                    style={{
                      border: '1px solid #dbeafe',
                      background: 'white',
                      color: '#1d4ed8',
                      fontWeight: 800,
                      padding: '10px 12px',
                      borderRadius: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    style={{
                      textDecoration: 'none',
                      color: '#1d4ed8',
                      fontWeight: 800,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid #dbeafe',
                      background: 'white',
                    }}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    style={{
                      textDecoration: 'none',
                      color: 'white',
                      fontWeight: 800,
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
                      boxShadow: '0 10px 22px rgba(29, 78, 216, 0.25)',
                    }}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 40px' }}>{children}</main>
    </div>
  );
};

export default Layout;
