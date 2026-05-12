import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Spinner from '@/components/Spinner';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'sports', label: '⚽ Sports & Turf' },
  { value: 'healthcare', label: '🏥 Healthcare' },
  { value: 'beauty', label: '💅 Beauty & Salon' },
  { value: 'fitness', label: '💪 Fitness & Gym' },
  { value: 'wellness', label: '🧘 Wellness & Spa' },
  { value: 'education', label: '📚 Education' },
  { value: 'professional', label: '💼 Professional Services' },
  { value: 'doctor', label: '🩺 Doctor / Clinic' },
  { value: 'dentist', label: '🦷 Dentist' },
  { value: 'other', label: '🔲 Other' },
];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1.5px solid var(--color-outline-variant)', fontSize: 15, outline: 'none',
  boxSizing: 'border-box',
};

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user && user.role === 'provider' && user.provider?.is_onboarded) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: '',
    category: 'other',
    specialty: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
  });

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleFinish() {
    if (!form.business_name.trim()) { toast.error('Business name is required'); return; }
    if (!form.specialty.trim()) { toast.error('Please describe your specialty / service type'); return; }
    setSaving(true);
    try {
      await api.post('/onboarding', {
        business_name: form.business_name,
        specialty: form.specialty,
        description: form.description,
        address: form.address,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        category: form.category,
      });
      await api.put('/onboarding', { complete_onboarding: true });
      await refreshUser();
      toast.success('Profile complete! Your account is now pending admin approval.');
      navigate('/dashboard');
    } catch {
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 16, padding: '36px 32px',
    boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-surface-container-high)',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 24, color: '#fff', margin: '0 auto 14px',
          }}>V</div>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 24, color: 'var(--color-primary)', marginBottom: 6 }}>Set up your business profile</h1>
          <p style={{ color: 'var(--color-outline)', fontSize: 14 }}>This information will appear on your public listing</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28, justifyContent: 'center' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14,
                background: step >= s ? 'var(--color-primary)' : 'var(--color-surface-container)',
                color: step >= s ? '#fff' : 'var(--color-outline)',
              }}>{s}</div>
              {s < 2 && <div style={{ width: 48, height: 2, background: step > s ? 'var(--color-primary)' : 'var(--color-outline-variant)', borderRadius: 2 }} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div style={card}>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 17, color: 'var(--color-on-surface)', marginBottom: 20 }}>Basic Information</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>Business Name *</label>
              <input
                style={inputStyle} type="text" placeholder="e.g. Green Valley Sports Turf"
                value={form.business_name} onChange={e => update('business_name', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>Business Category *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value} type="button"
                    onClick={() => update('category', cat.value)}
                    style={{
                      padding: '9px 12px', borderRadius: 8, border: '1.5px solid',
                      borderColor: form.category === cat.value ? 'var(--color-primary)' : 'var(--color-outline-variant)',
                      background: form.category === cat.value ? 'var(--color-primary-fixed)' : '#fff',
                      color: form.category === cat.value ? 'var(--color-primary)' : 'var(--color-on-surface)',
                      fontWeight: form.category === cat.value ? 700 : 500,
                      cursor: 'pointer', fontSize: 13, textAlign: 'left', transition: 'all 0.12s',
                    }}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>Specialty / Service Type *</label>
              <input
                style={inputStyle} type="text" placeholder="e.g. Football & Cricket Turf, Hair & Skin Care…"
                value={form.specialty} onChange={e => update('specialty', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>About Your Business</label>
              <textarea
                style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                placeholder="Tell customers what makes your business special…"
                value={form.description} onChange={e => update('description', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'}
              />
            </div>

            <button
              onClick={() => {
                if (!form.business_name.trim()) { toast.error('Business name is required'); return; }
                if (!form.specialty.trim()) { toast.error('Please describe your specialty'); return; }
                setStep(2);
              }}
              style={{
                width: '100%', padding: '12px', background: 'var(--color-primary)', color: '#fff',
                border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer',
              }}>
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={card}>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 17, color: 'var(--color-on-surface)', marginBottom: 20 }}>Location Details</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>Street Address</label>
              <input
                style={inputStyle} type="text" placeholder="123 Main Street"
                value={form.address} onChange={e => update('address', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>City</label>
                <input
                  style={inputStyle} type="text" placeholder="Mumbai"
                  value={form.city} onChange={e => update('city', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>State</label>
                <input
                  style={inputStyle} type="text" placeholder="Maharashtra"
                  value={form.state} onChange={e => update('state', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'}
                />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>PIN Code</label>
              <input
                style={{ ...inputStyle, maxWidth: 160 }} type="text" placeholder="400001"
                value={form.zip_code} onChange={e => update('zip_code', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1, padding: '12px', background: 'var(--color-surface-container)', color: 'var(--color-on-surface)',
                  border: '1.5px solid var(--color-outline-variant)', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: 'pointer',
                }}>
                ← Back
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                style={{
                  flex: 2, padding: '12px', background: 'var(--color-primary)', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15,
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.75 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                {saving && <Spinner size={18} color="#fff" />}
                {saving ? 'Saving…' : '🚀 Launch My Business'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
