import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { api } from '@/lib/api';
import { PageSpinner } from '@/components/Spinner';

interface AdminStats {
  totalUsers: number; totalPatients: number; totalProviders: number;
  approvedProviders: number; pendingProviders: number;
  totalAppointments: number; totalRevenue: number;
}
interface AdminProvider {
  id: number; business_name: string; specialty: string; city?: string; state?: string;
  is_approved: boolean; is_onboarded: boolean; created_at: string;
  user: { full_name: string; email: string; phone?: string };
}
interface RecentUser { id: number; full_name: string; email: string; role: string; created_at: string; }

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [tab, setTab] = useState<'overview' | 'providers'>('overview');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) navigate('/login');
  }, [user, authLoading]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    Promise.all([
      api.get<{ stats: AdminStats; recentSignups: RecentUser[] }>('/admin/stats'),
      api.get<{ providers: AdminProvider[] }>('/admin/providers'),
    ]).then(([statsData, provData]) => {
      setStats(statsData.stats);
      setRecentUsers(statsData.recentSignups);
      setProviders(provData.providers);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  async function toggleApproval(providerId: number, approved: boolean) {
    setUpdating(providerId);
    try {
      await api.patch('/admin/providers', { provider_id: providerId, is_approved: approved });
      setProviders(prev => prev.map(p => p.id === providerId ? { ...p, is_approved: approved } : p));
    } catch { alert('Failed to update'); } finally { setUpdating(null); }
  }

  if (authLoading || loading) return <PageSpinner />;
  if (!user || user.role !== 'admin') return null;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 26, color: 'var(--color-primary)', marginBottom: 4 }}>Admin Panel</h1>
        <p style={{ color: 'var(--color-outline)', fontSize: 14 }}>Platform management and oversight</p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 32 }}>
          {[
            { icon: '👥', label: 'Total Users', value: stats.totalUsers, color: 'var(--color-primary)' },
            { icon: '🧑', label: 'Patients', value: stats.totalPatients, color: '#0369a1' },
            { icon: '🩺', label: 'Providers', value: stats.totalProviders, color: '#6d28d9' },
            { icon: '✅', label: 'Approved', value: stats.approvedProviders, color: '#15803d' },
            { icon: '⏳', label: 'Pending Approval', value: stats.pendingProviders, color: '#b45309' },
            { icon: '📅', label: 'Appointments', value: stats.totalAppointments, color: '#be185d' },
            { icon: '💰', label: 'Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, color: '#047857', isString: true },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid var(--color-surface-container-high)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 22, fontWeight: 800, color: s.color }}>{s.isString ? s.value : String(s.value)}</p>
              <p style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--color-surface-container)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {(['overview', 'providers'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 22px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, textTransform: 'capitalize',
            background: tab === t ? '#fff' : 'transparent', color: tab === t ? 'var(--color-primary)' : 'var(--color-outline)',
            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s',
          }}>{t === 'overview' ? 'Recent Users' : 'Manage Providers'}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--color-surface-container-high)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-surface-container)', fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>Recent Sign-ups</div>
          {recentUsers.map((u, i) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: i < recentUsers.length - 1 ? '1px solid var(--color-surface-container)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>
                  {u.full_name[0]}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-outline)' }}>{u.email}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, fontWeight: 600, textTransform: 'capitalize', background: u.role === 'provider' ? '#ede9fe' : '#e0f2fe', color: u.role === 'provider' ? '#6d28d9' : '#0369a1' }}>{u.role}</span>
                <p style={{ fontSize: 11, color: 'var(--color-outline)', marginTop: 4 }}>{new Date(u.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'providers' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--color-surface-container-high)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-surface-container)', fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>All Providers</div>
          {providers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-outline)' }}>No providers registered yet.</div>
          ) : (
            providers.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < providers.length - 1 ? '1px solid var(--color-surface-container)' : 'none', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{p.business_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>{p.specialty}{p.city ? ` · ${p.city}` : ''}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-outline)' }}>{p.user.email}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, fontWeight: 600, background: p.is_onboarded ? '#dcfce7' : '#fef3c7', color: p.is_onboarded ? '#15803d' : '#b45309' }}>
                    {p.is_onboarded ? 'Onboarded' : 'Not Onboarded'}
                  </span>
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, fontWeight: 600, background: p.is_approved ? '#dcfce7' : '#fee2e2', color: p.is_approved ? '#15803d' : '#b91c1c' }}>
                    {p.is_approved ? 'Approved' : 'Pending'}
                  </span>
                  {p.is_approved ? (
                    <button onClick={() => toggleApproval(p.id, false)} disabled={updating === p.id}
                      style={{ background: 'var(--color-error-container)', color: 'var(--color-error)', border: 'none', padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      Revoke
                    </button>
                  ) : (
                    <button onClick={() => toggleApproval(p.id, true)} disabled={updating === p.id}
                      style={{ background: 'var(--color-success-container)', color: 'var(--color-success)', border: 'none', padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      {updating === p.id ? '…' : 'Approve'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
