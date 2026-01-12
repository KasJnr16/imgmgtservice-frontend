import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/auth';
import { setToken } from '../utils/authStorage';
import axios from 'axios';

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login({ email: email.trim(), password });
      setToken(res.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const statusText = err.response?.statusText;

        if (!err.response) {
          setError('Login failed due to a network error. Ensure the API Gateway is running on http://localhost:4004 and the CRA proxy is enabled (package.json "proxy").');
        } else {
          setError(`Login failed (${status}${statusText ? ` ${statusText}` : ''}). Please check your credentials and try again.`);
        }
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 32, color: '#0f172a' }}>Welcome back</h2>
        <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>Sign in to ABC Healthcare Image Management</p>
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
        <label style={{ display: 'block', fontWeight: 900, color: '#0f172a', marginBottom: 8 }} htmlFor="email">
          Email
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
            padding: '12px 14px',
            borderRadius: 14,
            border: '1px solid #dbeafe',
            background: '#f8fafc',
            fontSize: 14,
            marginBottom: 16,
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
          onBlur={(e) => (e.target.style.borderColor = '#dbeafe')}
        />

        <label style={{ display: 'block', fontWeight: 900, color: '#0f172a', marginBottom: 8 }} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 14,
            border: '1px solid #dbeafe',
            background: '#f8fafc',
            fontSize: 14,
            marginBottom: 16,
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
          onBlur={(e) => (e.target.style.borderColor = '#dbeafe')}
        />

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#dc2626',
              padding: 12,
              borderRadius: 12,
              marginBottom: 16,
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
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div style={{ marginTop: 20, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
          No account?{' '}
          <Link
            to="/signup"
            style={{
              color: '#1d4ed8',
              fontWeight: 900,
              textDecoration: 'none',
            }}
          >
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
}
