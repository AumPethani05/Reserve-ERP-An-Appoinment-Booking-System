import { useState } from 'react';
import { Link, useSearch } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import Spinner from '@/components/Spinner';

export default function SignupPage() {
  const { signup } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const defaultRole = params.get('role') === 'provider' ? 'provider' : 'patient';

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', role: defaultRole });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await signup(form);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1.5px solid var(--color-outline-variant)', fontSize: 15, outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 24, color: '#fff', margin: '0 auto 16px',
          }}>V</div>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 26, color: 'var(--color-primary)' }}>Create your account</h1>
          <p style={{ color: 'var(--color-outline)', fontSize: 14, marginTop: 6 }}>Join VaidyaLink — it's free</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-surface-container-high)' }}>
          {error && (
            <div style={{ background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* Role toggle */}
          <div style={{ display: 'flex', background: 'var(--color-surface-container)', borderRadius: 10, padding: 4, marginBottom: 20 }}>
            {[
              { value: 'patient', label: '🙋 Customer', desc: 'Book appointments' },
              { value: 'provider', label: '🏢 Business', desc: 'Accept bookings' },
            ].map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => update('role', r.value)}
                style={{
                  flex: 1, padding: '10px 8px', border: 'none', borderRadius: 8, cursor: 'pointer',
                  background: form.role === r.value ? '#fff' : 'transparent',
                  color: form.role === r.value ? 'var(--color-primary)' : 'var(--color-outline)',
                  boxShadow: form.role === r.value ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s', textAlign: 'center',
                }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.label}</div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 1 }}>{r.desc}</div>
              </button>
            ))}
          </div>

          {form.role === 'provider' && (
            <div style={{ background: 'var(--color-primary-fixed)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--color-primary)', fontWeight: 500 }}>
              🏢 Register as a business to list your resources and start accepting bookings. You can add turfs, rooms, chairs, or any bookable resource.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {[
              { field: 'full_name', label: form.role === 'provider' ? 'Your Full Name' : 'Full Name', type: 'text', placeholder: form.role === 'provider' ? 'Rajesh Nair' : 'Priya Sharma' },
              { field: 'email', label: 'Email address', type: 'email', placeholder: 'you@example.com' },
              { field: 'phone', label: 'Phone number', type: 'tel', placeholder: '+91 98765 43210' },
              { field: 'password', label: 'Password', type: 'password', placeholder: '8+ characters' },
            ].map(({ field, label, type, placeholder }) => (
              <div key={field} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>{label}</label>
                <input
                  type={type}
                  required
                  value={form[field as keyof typeof form]}
                  onChange={e => update(field, e.target.value)}
                  placeholder={placeholder}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'}
                />
              </div>
            ))}
            <div style={{ marginBottom: 8 }} />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', background: 'var(--color-primary)', color: '#fff',
                border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.75 : 1,
              }}>
              {loading ? <Spinner size={20} color="#fff" /> : null}
              {loading ? 'Creating account…' : form.role === 'provider' ? 'Register My Business' : 'Create Account'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--color-outline)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
