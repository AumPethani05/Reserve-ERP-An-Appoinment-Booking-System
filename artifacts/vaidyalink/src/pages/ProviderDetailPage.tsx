import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { PageSpinner } from '@/components/Spinner';

interface Service { id: number; name: string; price: number; duration_minutes: number; description?: string; }
interface Schedule { day_of_week: number; start_time: string; end_time: string; }
interface Provider {
  id: number; business_name: string; specialty: string; city?: string; state?: string;
  address?: string; zip_code?: string; category: string; rating: number; total_reviews: number;
  description?: string;
  user: { full_name: string; email: string; phone: string; avatar_url?: string };
  services: Service[];
  schedules: Schedule[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ provider: Provider }>(`/providers/${id}`)
      .then(d => setProvider(d.provider))
      .catch(() => setError('Provider not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageSpinner />;
  if (error || !provider) return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <p style={{ color: 'var(--color-error)' }}>{error || 'Not found'}</p>
      <Link href="/providers"><button style={{ marginTop: 16, padding: '10px 20px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Back to Providers</button></Link>
    </div>
  );

  const initials = provider.business_name.slice(0, 2).toUpperCase();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', animation: 'fade-in 0.3s ease' }}>
      <Link href="/providers">
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', marginBottom: 24, fontSize: 14 }}>
          ← Back to Providers
        </button>
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
        {/* Left: Info */}
        <div>
          {/* Header Card */}
          <div style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)',
            borderRadius: 16, padding: '28px', marginBottom: 20, display: 'flex', gap: 20, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'var(--color-primary-fixed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'Manrope, sans-serif', flexShrink: 0,
            }}>
              {provider.user.avatar_url ? <img src={provider.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials}
            </div>
            <div>
              <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 22, color: '#fff', marginBottom: 4 }}>{provider.business_name}</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>{provider.specialty}</p>
              {(provider.city || provider.state) && (
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6 }}>📍 {[provider.address, provider.city, provider.state].filter(Boolean).join(', ')}</p>
              )}
              {provider.total_reviews > 0 && (
                <p style={{ color: '#fbbf24', fontSize: 14, marginTop: 6 }}>
                  {'★'.repeat(Math.round(Number(provider.rating)))} {Number(provider.rating).toFixed(1)} ({provider.total_reviews} reviews)
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {provider.description && (
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', marginBottom: 20, border: '1px solid var(--color-surface-container-high)' }}>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, marginBottom: 10, color: 'var(--color-primary)' }}>About</h2>
              <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', lineHeight: 1.75 }}>{provider.description}</p>
            </div>
          )}

          {/* Services */}
          {provider.services.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', marginBottom: 20, border: '1px solid var(--color-surface-container-high)' }}>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, marginBottom: 14, color: 'var(--color-primary)' }}>Services Offered</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {provider.services.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--color-surface-container-low)', borderRadius: 10 }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>⏱ {s.duration_minutes} min{s.description ? ` · ${s.description}` : ''}</p>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 15 }}>₹{Number(s.price).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule */}
          {provider.schedules.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid var(--color-surface-container-high)' }}>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, marginBottom: 14, color: 'var(--color-primary)' }}>Working Hours</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                {provider.schedules.map(sc => (
                  <div key={sc.day_of_week} style={{ background: 'var(--color-surface-container-low)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-primary)', marginBottom: 4 }}>{DAYS[sc.day_of_week]}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-outline)' }}>{sc.start_time} – {sc.end_time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Book CTA */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid var(--color-surface-container-high)', boxShadow: 'var(--shadow-card)', position: 'sticky', top: 80 }}>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 18, color: 'var(--color-primary)', marginBottom: 16 }}>Book an Appointment</h2>
          {provider.services.length === 0 ? (
            <p style={{ color: 'var(--color-outline)', fontSize: 14 }}>This provider hasn't listed services yet.</p>
          ) : user ? (
            <Link href={`/providers/${provider.id}/book`}>
              <button style={{
                width: '100%', background: 'var(--color-primary)', color: '#fff', border: 'none',
                borderRadius: 10, padding: '14px', fontWeight: 700, fontSize: 16, cursor: 'pointer',
              }}>
                Book Now
              </button>
            </Link>
          ) : (
            <div>
              <p style={{ color: 'var(--color-outline)', fontSize: 14, marginBottom: 16 }}>Sign in to book an appointment</p>
              <Link href="/login">
                <button style={{ width: '100%', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  Sign In to Book
                </button>
              </Link>
            </div>
          )}
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--color-surface-container)' }}>
            <p style={{ fontSize: 13, color: 'var(--color-outline)', marginBottom: 8 }}>Contact</p>
            <p style={{ fontSize: 14, color: 'var(--color-on-surface)' }}>📧 {provider.user.email}</p>
            {provider.user.phone && <p style={{ fontSize: 14, color: 'var(--color-on-surface)', marginTop: 4 }}>📞 {provider.user.phone}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
