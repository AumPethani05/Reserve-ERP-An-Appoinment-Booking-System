import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { PageSpinner } from '@/components/Spinner';


const NAV_ITEMS = [
  { path: '/dashboard', icon: '📊', label: 'Overview' },
  { path: '/dashboard/appointments', icon: '📅', label: 'Appointments' },
  { path: '/dashboard/services', icon: '🩺', label: 'Services' },
  { path: '/dashboard/resources', icon: '🏥', label: 'Resources' },
  { path: '/dashboard/schedule', icon: '⏰', label: 'Schedule' },
  { path: '/dashboard/invoices', icon: '🧾', label: 'Invoices' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'provider') {
        navigate('/login');
      } else if (!user.provider?.is_onboarded) {
        navigate('/onboarding');
      }
    }
  }, [user, loading, navigate]);

  if (loading) return <PageSpinner />;
  if (!user || user.role !== 'provider') return null;

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, background: 'var(--color-primary)', display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 64, height: 'calc(100vh - 64px)', overflowY: 'auto',
      }}>
        <div style={{ padding: '24px 16px 16px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', marginBottom: 12, textTransform: 'uppercase', paddingLeft: 12 }}>Provider Dashboard</p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NAV_ITEMS.map(item => {
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                    fontWeight: isActive ? 700 : 500, fontSize: 14,
                    transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
        <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{user.full_name}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{user.email}</p>
            <span style={{ display: 'inline-block', marginTop: 6, background: 'rgba(179,236,249,0.25)', color: 'var(--color-primary-fixed)', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
              Provider
            </span>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--color-surface)' }}>
        {(user.provider?.is_onboarded && !user.provider?.is_approved) && (
          <div style={{
            background: '#e0f2fe', borderBottom: '1px solid #bae6fd',
            padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <span style={{ fontSize: 20 }}>ℹ️</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#0369a1', margin: 0 }}>Account Pending Approval</p>
              <p style={{ fontSize: 13, color: '#075985', margin: 0 }}>Your profile is being reviewed by our team. You won't appear in public search results until approved, but you can still set up your services and schedule.</p>
            </div>
          </div>
        )}
        <div style={{ padding: '28px 32px', animation: 'fade-in 0.25s ease' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
