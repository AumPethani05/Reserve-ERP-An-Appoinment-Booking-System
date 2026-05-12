import { useState, useEffect } from 'react';
import { Link, useSearch } from 'wouter';
import { api } from '@/lib/api';
import { PageSpinner } from '@/components/Spinner';

interface Service { id: number; name: string; price: number; duration_minutes: number; }
interface Resource { id: number; name: string; type: string; color: string; }
interface Business {
  id: number; business_name: string; specialty: string; city: string; state: string;
  category: string; rating: number | string; total_reviews: number; description: string;
  user: { full_name: string; avatar_url?: string };
  services: Service[];
  resources: Resource[];
}

const CATEGORIES = [
  { value: '', label: 'All', icon: '✦' },
  { value: 'sports', label: 'Sports & Turf', icon: '⚽' },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { value: 'beauty', label: 'Beauty', icon: '💅' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'wellness', label: 'Wellness', icon: '🧘' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'professional', label: 'Professional', icon: '💼' },
  { value: 'doctor', label: 'Doctors', icon: '🩺' },
  { value: 'dentist', label: 'Dentists', icon: '🦷' },
  { value: 'other', label: 'Other', icon: '🔲' },
];

const CAT_COLORS: Record<string, string> = {
  sports: '#16a34a', healthcare: '#0d9488', beauty: '#ec4899', fitness: '#7c3aed',
  wellness: '#0891b2', education: '#d97706', professional: '#6366f1', doctor: '#0d9488',
  dentist: '#0891b2', other: '#64748b',
};

const RESOURCE_ICONS: Record<string, string> = {
  turf: '⚽', court: '🏸', room: '🏠', chair: '💺', lane: '🏊',
  station: '💪', seat: '💺', table: '🪑', bay: '🔧', field: '🌿',
  equipment: '🔧', staff: '👤', other: '🔲',
};

function StarRating({ rating }: { rating: number | string }) {
  const r = Number(rating);
  return (
    <span style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>
      {'★'.repeat(Math.round(r))}{'☆'.repeat(5 - Math.round(r))} {r.toFixed(1)}
    </span>
  );
}

function BusinessCard({ biz }: { biz: Business }) {
  const minPrice = biz.services.length > 0 ? Math.min(...biz.services.map(s => Number(s.price))) : null;
  const initials = biz.business_name.slice(0, 2).toUpperCase();
  const catColor = CAT_COLORS[biz.category] || '#64748b';

  return (
    <div style={{
      background: '#fff', borderRadius: 16, overflow: 'hidden',
      border: '1px solid var(--color-surface-container-high)', boxShadow: 'var(--shadow-card)',
      transition: 'transform 0.2s, box-shadow 0.2s', display: 'flex', flexDirection: 'column',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'; }}>

      <div style={{ background: `linear-gradient(135deg, ${catColor} 0%, ${catColor}aa 100%)`, padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Manrope, sans-serif', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {biz.user.avatar_url ? <img src={biz.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{biz.business_name}</h3>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{biz.specialty}</p>
        </div>
        <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '3px 10px', borderRadius: 999, fontWeight: 600, flexShrink: 0, textTransform: 'capitalize' }}>
          {biz.category}
        </span>
      </div>

      <div style={{ padding: '14px 18px', flex: 1 }}>
        {biz.total_reviews > 0 && (
          <div style={{ marginBottom: 8 }}>
            <StarRating rating={biz.rating} />
            <span style={{ fontSize: 12, color: 'var(--color-outline)', marginLeft: 4 }}>({biz.total_reviews})</span>
          </div>
        )}
        {(biz.city || biz.state) && (
          <p style={{ fontSize: 13, color: 'var(--color-outline)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            📍 {[biz.city, biz.state].filter(Boolean).join(', ')}
          </p>
        )}
        {biz.description && (
          <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {biz.description}
          </p>
        )}

        {/* Resources preview */}
        {biz.resources.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {biz.resources.slice(0, 4).map(r => (
              <span key={r.id} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 6,
                background: `${r.color || catColor}18`, color: r.color || catColor, fontWeight: 600,
                border: `1px solid ${r.color || catColor}30`,
              }}>
                {RESOURCE_ICONS[r.type] || '🔲'} {r.name}
              </span>
            ))}
            {biz.resources.length > 4 && (
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', color: 'var(--color-outline)' }}>
                +{biz.resources.length - 4} more
              </span>
            )}
          </div>
        )}

        {minPrice !== null && (
          <p style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600 }}>
            Starting from ₹{minPrice.toLocaleString('en-IN')}
          </p>
        )}
      </div>

      <div style={{ padding: '10px 18px 14px', borderTop: '1px solid var(--color-surface-container)' }}>
        <Link href={`/businesses/${biz.id}`}>
          <button style={{
            width: '100%', background: catColor, color: '#fff', border: 'none',
            borderRadius: 8, padding: '9px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>View & Book</button>
        </Link>
      </div>
    </div>
  );
}

export default function BusinessesPage() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initialCategory = params.get('category') || '';

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { setCategory(initialCategory); }, [initialCategory]);
  useEffect(() => { fetchBusinesses(); }, [search, category, page]);

  async function fetchBusinesses() {
    setLoading(true);
    try {
      const qp = new URLSearchParams({ page: String(page), limit: '12' });
      if (search) qp.set('search', search);
      if (category) qp.set('category', category);
      const data = await api.get<{ providers: Business[]; pagination: { totalPages: number; total: number } }>(`/providers?${qp}`);
      setBusinesses(data.providers);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  function handleSearch(e: React.FormEvent) { e.preventDefault(); setPage(1); fetchBusinesses(); }

  const activeCat = CATEGORIES.find(c => c.value === category);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 28, color: 'var(--color-primary)', marginBottom: 6 }}>
          {activeCat && activeCat.value ? `${activeCat.icon} ${activeCat.label}` : 'Find Businesses'}
        </h1>
        <p style={{ color: 'var(--color-outline)', fontSize: 15 }}>
          {total > 0 ? `${total} verified business${total !== 1 ? 'es' : ''} available` : 'Browse verified businesses and book appointments instantly'}
        </p>
      </div>

      {/* Category filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => { setCategory(c.value); setPage(1); }}
            style={{
              padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${category === c.value ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
              background: category === c.value ? 'var(--color-primary)' : '#fff',
              color: category === c.value ? '#fff' : 'var(--color-on-surface)',
              transition: 'all 0.15s',
            }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 24, border: '1px solid var(--color-surface-container-high)', boxShadow: 'var(--shadow-card)' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search by name, specialty, city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: '1 1 240px', padding: '9px 14px', borderRadius: 8,
              border: '1.5px solid var(--color-outline-variant)', fontSize: 14, outline: 'none',
            }}
          />
          <button type="submit" style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            Search
          </button>
        </form>
      </div>

      {loading ? <PageSpinner /> : businesses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-outline)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 16 }}>No businesses found. Try a different search or category.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>
            {businesses.map(b => <BusinessCard key={b.id} biz={b} />)}
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
