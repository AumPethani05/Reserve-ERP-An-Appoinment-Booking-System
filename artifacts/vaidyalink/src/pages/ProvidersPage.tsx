import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { api } from '@/lib/api';
import { PageSpinner } from '@/components/Spinner';

interface Service { id: number; name: string; price: number; duration_minutes: number; }
interface Provider {
  id: number; business_name: string; specialty: string; city: string; state: string;
  category: string; rating: number; total_reviews: number; description: string;
  user: { full_name: string; avatar_url?: string };
  services: Service[];
}

const categories = [
  { value: '', label: 'All' },
  { value: 'doctor', label: 'Doctors' },
  { value: 'dentist', label: 'Dentists' },
  { value: 'physio', label: 'Physio' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'lab', label: 'Labs' },
  { value: 'other', label: 'Other' },
];

function StarRating({ rating }: { rating: number | string }) {
  const r = Number(rating);
  return (
    <span style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>
      {'★'.repeat(Math.round(r))}{'☆'.repeat(5 - Math.round(r))} {r.toFixed(1)}
    </span>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  const minPrice = provider.services.length > 0 ? Math.min(...provider.services.map(s => Number(s.price))) : null;
  const initials = provider.business_name.slice(0, 2).toUpperCase();

  return (
    <div style={{
      background: '#fff', borderRadius: 16, overflow: 'hidden',
      border: '1px solid var(--color-surface-container-high)', boxShadow: 'var(--shadow-card)',
      transition: 'transform 0.2s, box-shadow 0.2s', display: 'flex', flexDirection: 'column',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-dropdown)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'; }}>
      <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)', padding: '24px 20px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: 'var(--color-primary-fixed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Manrope, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--color-primary)', flexShrink: 0,
        }}>
          {provider.user.avatar_url ? <img src={provider.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials}
        </div>
        <div>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{provider.business_name}</h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{provider.specialty}</p>
        </div>
      </div>
      <div style={{ padding: '16px 20px', flex: 1 }}>
        {provider.total_reviews > 0 ? (
          <div style={{ marginBottom: 8 }}>
            <StarRating rating={provider.rating} />
            <span style={{ fontSize: 12, color: 'var(--color-outline)', marginLeft: 4 }}>({provider.total_reviews})</span>
          </div>
        ) : null}
        {(provider.city || provider.state) && (
          <p style={{ fontSize: 13, color: 'var(--color-outline)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            📍 {[provider.city, provider.state].filter(Boolean).join(', ')}
          </p>
        )}
        {provider.description && (
          <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {provider.description}
          </p>
        )}
        {minPrice !== null && (
          <p style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600 }}>
            Starting from ₹{minPrice.toLocaleString('en-IN')}
          </p>
        )}
      </div>
      <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--color-surface-container)' }}>
        <Link href={`/providers/${provider.id}`}>
          <button style={{
            width: '100%', background: 'var(--color-primary)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>View Profile & Book</button>
        </Link>
      </div>
    </div>
  );
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProviders();
  }, [search, category, page]);

  async function fetchProviders() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      const data = await api.get<{ providers: Provider[]; pagination: { totalPages: number } }>(`/providers?${params}`);
      setProviders(data.providers);
      setTotalPages(data.pagination.totalPages);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchProviders();
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 28, color: 'var(--color-primary)', marginBottom: 8 }}>Find Healthcare Providers</h1>
        <p style={{ color: 'var(--color-outline)', fontSize: 15 }}>Browse verified providers and book appointments instantly</p>
      </div>

      {/* Search & Filters */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 28, border: '1px solid var(--color-surface-container-high)', boxShadow: 'var(--shadow-card)' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search by name, specialty, city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: '1 1 240px', padding: '10px 14px', borderRadius: 8,
              border: '1.5px solid var(--color-outline-variant)', fontSize: 14, outline: 'none',
            }}
          />
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--color-outline-variant)', fontSize: 14, background: '#fff', cursor: 'pointer', outline: 'none' }}>
            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <button type="submit" style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, cursor: 'pointer' }}>
            Search
          </button>
        </form>
      </div>

      {loading ? <PageSpinner /> : providers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-outline)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 16 }}>No providers found. Try a different search.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>
            {providers.map(p => <ProviderCard key={p.id} provider={p} />)}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid var(--color-outline-variant)', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>
                ← Prev
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 14, color: 'var(--color-outline)' }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid var(--color-outline-variant)', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
