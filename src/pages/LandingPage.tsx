import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <section
        style={{
          borderRadius: 18,
          padding: '28px 18px',
          background:
            'radial-gradient(1200px 600px at 10% 0%, rgba(59, 130, 246, 0.18), transparent 60%), radial-gradient(1200px 600px at 90% 10%, rgba(29, 78, 216, 0.18), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.65))',
          border: '1px solid #e6efff',
          boxShadow: '0 18px 46px rgba(15, 23, 42, 0.06)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, alignItems: 'center' }}>
          <div style={{ padding: 6 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 999,
                border: '1px solid #dbeafe',
                background: 'rgba(239, 246, 255, 0.9)',
                color: '#1d4ed8',
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              Secure imaging workspace
            </div>

            <h2 style={{ margin: '14px 0 8px', fontSize: 40, lineHeight: 1.1, color: '#0f172a' }}>
              Manage clinical images with speed, security, and clarity.
            </h2>
            <p style={{ margin: 0, color: '#475569', fontSize: 16, lineHeight: 1.65, maxWidth: 560 }}>
              ABC Healthcare Image Management helps teams authenticate quickly, filter records confidently, and retrieve images fast—built for
              busy clinical workflows.
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 14px',
                  background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
                  color: 'white',
                  borderRadius: 14,
                  textDecoration: 'none',
                  fontWeight: 900,
                  boxShadow: '0 14px 28px rgba(29, 78, 216, 0.22)',
                }}
              >
                Login
              </Link>
              <Link
                to="/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 14px',
                  background: 'white',
                  color: '#1d4ed8',
                  border: '1px solid #dbeafe',
                  borderRadius: 14,
                  textDecoration: 'none',
                  fontWeight: 900,
                }}
              >
                Sign up
              </Link>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', color: '#64748b', fontSize: 13 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.75)', border: '1px solid #e6efff' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: '#3b82f6' }} />
                JWT authentication
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.75)', border: '1px solid #e6efff' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: '#1d4ed8' }} />
                Role-based access
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.75)', border: '1px solid #e6efff' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: '#60a5fa' }} />
                Audit-friendly flows
              </div>
            </div>
          </div>

          <div
            style={{
              borderRadius: 18,
              border: '1px solid #e6efff',
              background: 'linear-gradient(135deg, rgba(29, 78, 216, 0.10), rgba(96, 165, 250, 0.12))',
              padding: 14,
              minHeight: 280,
            }}
          >
            <div style={{ borderRadius: 16, background: 'white', border: '1px solid #e6efff', padding: 14, height: '100%' }}>
              <svg viewBox="0 0 640 420" role="img" aria-label="Illustration of secure healthcare image management" style={{ width: '100%', height: '100%' }}>
                <defs>
                  <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#1d4ed8" stopOpacity="0.20" />
                    <stop offset="1" stopColor="#60a5fa" stopOpacity="0.18" />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#1d4ed8" />
                    <stop offset="1" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>

                <rect x="0" y="0" width="640" height="420" rx="18" fill="url(#g1)" />

                <g opacity="0.35">
                  <circle cx="520" cy="80" r="56" fill="#60a5fa" />
                  <circle cx="120" cy="320" r="72" fill="#1d4ed8" />
                </g>

                <g>
                  <rect x="120" y="92" width="400" height="240" rx="18" fill="#0f172a" opacity="0.90" />
                  <rect x="140" y="112" width="360" height="200" rx="14" fill="#0b1220" />

                  <path
                    d="M170 240 C210 180, 260 175, 300 210 C330 235, 380 255, 420 210 C445 182, 475 175, 505 200"
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.95"
                  />
                  <path d="M210 170 L250 170 L260 155 L275 205 L290 180 L320 180" fill="none" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" opacity="0.95" />

                  <g>
                    <rect x="260" y="322" width="120" height="18" rx="9" fill="#0f172a" opacity="0.55" />
                    <rect x="300" y="340" width="40" height="18" rx="9" fill="#0f172a" opacity="0.35" />
                  </g>

                  <g transform="translate(410, 138)">
                    <circle cx="72" cy="64" r="46" fill="white" opacity="0.10" />
                    <circle cx="72" cy="64" r="38" fill="white" opacity="0.10" />
                    <circle cx="72" cy="64" r="30" fill="white" opacity="0.10" />
                    <circle cx="72" cy="64" r="22" fill="white" opacity="0.10" />
                    <circle cx="72" cy="64" r="14" fill="white" opacity="0.10" />
                  </g>
                </g>

                <g transform="translate(74, 74)">
                  <rect x="0" y="0" width="140" height="66" rx="14" fill="white" opacity="0.92" />
                  <rect x="14" y="18" width="90" height="10" rx="5" fill="#c7d2fe" />
                  <rect x="14" y="36" width="112" height="10" rx="5" fill="#dbeafe" />
                  <circle cx="118" cy="33" r="16" fill="url(#g2)" opacity="0.9" />
                  <path d="M118 25 v16 M110 33 h16" stroke="white" strokeWidth="4" strokeLinecap="round" />
                </g>

                <g transform="translate(420, 286)">
                  <rect x="0" y="0" width="166" height="76" rx="16" fill="white" opacity="0.92" />
                  <path
                    d="M44 46 c0-10 8-18 18-18 h42 c10 0 18 8 18 18 v10 c0 10-8 18-18 18 H62 c-10 0-18-8-18-18 V46z"
                    fill="#dbeafe"
                  />
                  <path
                    d="M84 54 v10"
                    stroke="#1d4ed8"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M78 54 h12"
                    stroke="#1d4ed8"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  <path d="M24 22 h92" stroke="#c7d2fe" strokeWidth="10" strokeLinecap="round" />
                  <path d="M24 22 h52" stroke="#93c5fd" strokeWidth="10" strokeLinecap="round" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section id="services" style={{ padding: '28px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 900, color: '#1d4ed8', fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Services
            </div>
            <h3 style={{ margin: '8px 0 0', fontSize: 24, color: '#0f172a' }}>Everything you need to manage images confidently</h3>
            <p style={{ margin: '10px 0 0', color: '#475569', lineHeight: 1.7, maxWidth: 680 }}>
              Designed for clinicians and admins: secure access, intuitive filtering, and fast retrieval across large collections.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 14,
            marginTop: 16,
          }}
        >
          <div style={{ background: 'white', border: '1px solid #e6efff', borderRadius: 16, padding: 16, boxShadow: '0 18px 40px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(59, 130, 246, 0.12)', border: '1px solid #dbeafe', display: 'grid', placeItems: 'center' }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: '#1d4ed8', display: 'inline-block' }} />
              </div>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Secure system</div>
            </div>
            <div style={{ color: '#475569', lineHeight: 1.65, marginTop: 10 }}>
              Authenticate via JWT, restrict by role, and keep image access aligned with clinical policy.
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e6efff', borderRadius: 16, padding: 16, boxShadow: '0 18px 40px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(29, 78, 216, 0.10)', border: '1px solid #dbeafe', display: 'grid', placeItems: 'center' }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: '#3b82f6', display: 'inline-block' }} />
              </div>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Easy records filtering</div>
            </div>
            <div style={{ color: '#475569', lineHeight: 1.65, marginTop: 10 }}>
              Quickly narrow down patients and studies with clear filters—built for accuracy under time pressure.
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e6efff', borderRadius: 16, padding: 16, boxShadow: '0 18px 40px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(96, 165, 250, 0.16)', border: '1px solid #dbeafe', display: 'grid', placeItems: 'center' }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: '#60a5fa', display: 'inline-block' }} />
              </div>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>Fast retrieval</div>
            </div>
            <div style={{ color: '#475569', lineHeight: 1.65, marginTop: 10 }}>
              Retrieve the right images quickly for review and reporting—optimized for high-volume workflows.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
