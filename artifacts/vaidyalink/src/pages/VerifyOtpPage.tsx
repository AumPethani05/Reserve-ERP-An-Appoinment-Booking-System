import { useState, useRef, useEffect } from 'react';
import { useSearch, useLocation } from 'wouter';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Spinner from '@/components/Spinner';

export default function VerifyOtpPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const email = params.get('email') || localStorage.getItem('pendingVerificationEmail') || '';
  const [, navigate] = useLocation();
  const { refreshUser, user } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const inputs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handleChange(i: number, v: string) {
    if (!/^[0-9]?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
    if (next.every(d => d !== '') && next.join('').length === 6) {
      verifyOtp(next.join(''));
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  async function verifyOtp(code: string) {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, otp: code });
      const updatedUser = await refreshUser();
      localStorage.removeItem('pendingVerificationEmail');
      setSuccess('Email verified! Redirecting…');
      setTimeout(() => {
        if (updatedUser?.role === 'provider') {
          navigate(!updatedUser.provider?.is_onboarded ? '/onboarding' : '/dashboard');
        } else {
          navigate('/providers');
        }
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setError('');
    setResending(true);
    try {
      await api.post('/auth/resend-otp', { email });
      setSuccess('New OTP sent!');
      setCountdown(60);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setResending(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 24, color: 'var(--color-primary)' }}>Verify your email</h1>
          <p style={{ color: 'var(--color-outline)', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
            We sent a 6-digit code to<br />
            <strong style={{ color: 'var(--color-on-surface)' }}>{email}</strong>
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-surface-container-high)' }}>
          {error && (
            <div style={{ background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'var(--color-success-container)', color: 'var(--color-success)', padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
              {success}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { if (el) inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
                style={{
                  width: 46, height: 54, textAlign: 'center', fontSize: 24, fontWeight: 700,
                  border: '2px solid', borderColor: digit ? 'var(--color-primary)' : 'var(--color-outline-variant)',
                  borderRadius: 10, outline: 'none', background: digit ? 'var(--color-primary-fixed)' : '#fff',
                  color: 'var(--color-primary)', transition: 'all 0.15s',
                }}
              />
            ))}
          </div>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <Spinner size={32} />
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--color-outline)', marginBottom: 8 }}>Didn't receive the code?</p>
            {countdown > 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-outline)' }}>Resend in {countdown}s</p>
            ) : (
              <button
                onClick={resendOtp}
                disabled={resending}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                {resending ? 'Sending…' : 'Resend Code'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
