import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signupAndLogin } from '../services/auth';
import { setToken } from '../utils/authStorage';
import axios from 'axios';

function todayIsoDate(): string {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function SignupPage() {
  const navigate = useNavigate();

  const defaultRegisteredDate = useMemo(() => todayIsoDate(), []);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
    const [password, setPassword] = useState('');
  const [role, setRole] = useState('PATIENT');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !name.trim() || !password || !dateOfBirth) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signupAndLogin({
        email: email.trim(),
        name: name.trim(),
        address: address.trim(),
        dateOfBirth,
        registeredDate: defaultRegisteredDate,
        password,
        role: 'PATIENT',
      });
      setToken(res.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const statusText = err.response?.statusText;

        if (!err.response) {
          setError('Sign up failed due to a network/CORS error. Check the browser console and gateway CORS settings.');
        } else {
          setError(`Sign up failed (${status}${statusText ? ` ${statusText}` : ''}). Please verify your details and try again.`);
        }
      } else {
        setError('Sign up failed. Please verify your details and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 32, color: '#0f172a' }}>Create your account</h2>
        <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>Join ABC Healthcare Image Management</p>
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          borderRadius: 18,
          border: '1px solid #e6efff',
          background: 'white',
          padding: 24,
          boxShadow: '0 18px 46px rgba(15, 23, 42, 0.06)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 900, color: '#0f172a', marginBottom: 8 }} htmlFor="name">
              Full name*
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Jane Doe"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 14,
                border: '1px solid #dbeafe',
                background: '#f8fafc',
                fontSize: 15,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.target.style.borderColor = '#dbeafe')}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 900, color: '#0f172a', marginBottom: 8 }} htmlFor="email">
              Email*
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 14,
                border: '1px solid #dbeafe',
                background: '#f8fafc',
                fontSize: 15,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.target.style.borderColor = '#dbeafe')}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 900, color: '#0f172a', marginBottom: 8 }} htmlFor="address">
                Address
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
                placeholder="123 Main St, City, State"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: '1px solid #dbeafe',
                  background: '#f8fafc',
                  fontSize: 15,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.target.style.borderColor = '#dbeafe')}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontWeight: 900, color: '#0f172a', marginBottom: 8 }} htmlFor="dob">
                Date of birth*
              </label>
              <input
                id="dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: '1px solid #dbeafe',
                  background: '#f8fafc',
                  fontSize: 15,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.target.style.borderColor = '#dbeafe')}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 900, color: '#0f172a', marginBottom: 8 }} htmlFor="password">
              Password*
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 14,
                border: '1px solid #dbeafe',
                background: '#f8fafc',
                fontSize: 15,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.target.style.borderColor = '#dbeafe')}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 16,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#dc2626',
              padding: 12,
              borderRadius: 12,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            marginTop: 16,
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
            color: 'white',
            borderRadius: 14,
            border: 'none',
            fontWeight: 900,
            fontSize: 15,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 10px 22px rgba(29, 78, 216, 0.25)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 14px 28px rgba(29, 78, 216, 0.30)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 22px rgba(29, 78, 216, 0.25)';
          }}
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>

        <div style={{ marginTop: 20, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: '#1d4ed8',
              fontWeight: 900,
              textDecoration: 'none',
            }}
          >
            Login
          </Link>
        </div>
      </form>
    </div>
  );
}
