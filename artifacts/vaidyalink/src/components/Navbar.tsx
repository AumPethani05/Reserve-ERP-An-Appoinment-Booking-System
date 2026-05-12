import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.startsWith(path);

  const navBtn = (active: boolean) => ({
    background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
    border: 'none', color: '#fff', padding: '8px 14px', borderRadius: 8,
    fontWeight: 500, cursor: 'pointer', fontSize: 14,
  });

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--color-primary)',
      boxShadow: '0 2px 16px rgba(0,55,64,0.18)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--color-primary-fixed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--color-primary)',
          }}>V</div>
          <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.03em' }}>VaidyaLink</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {user ? (
            <>
              <Link href="/businesses">
                <button style={navBtn(isActive('/businesses'))}>Browse</button>
              </Link>
              {user.role === 'patient' && (
                <Link href="/appointments">
                  <button style={navBtn(isActive('/appointments'))}>My Bookings</button>
                </Link>
              )}
              {user.role === 'provider' && (
                <Link href="/dashboard">
                  <button style={navBtn(isActive('/dashboard'))}>Dashboard</button>
                </Link>
              )}
              {user.role === 'admin' && (
                <Link href="/admin">
                  <button style={navBtn(isActive('/admin'))}>Admin</button>
                </Link>
              )}
              <div style={{ position: 'relative', marginLeft: 4 }}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#fff',
                  }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--color-primary-fixed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'var(--color-primary)',
                  }}>{user.full_name[0]?.toUpperCase()}</div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{user.full_name.split(' ')[0]}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                </button>
                {menuOpen && (
                  <div style={{
                    position: 'absolute', top: '110%', right: 0, minWidth: 200,
                    background: '#fff', borderRadius: 12, boxShadow: 'var(--shadow-modal)',
                    border: '1px solid var(--color-outline-variant)', overflow: 'hidden', zIndex: 100,
                  }} onClick={() => setMenuOpen(false)}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-surface-container)' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-on-surface)' }}>{user.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>{user.email}</div>
                      <div style={{ fontSize: 11, marginTop: 4, background: 'var(--color-surface-container)', padding: '2px 8px', borderRadius: 999, display: 'inline-block', textTransform: 'capitalize', color: 'var(--color-primary)', fontWeight: 600 }}>{user.role}</div>
                    </div>
                    {user.role === 'provider' && (
                      <Link href="/dashboard/resources">
                        <button style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-on-surface)', fontWeight: 500 }}>
                          🏗️ Manage Resources
                        </button>
                      </Link>
                    )}
                    {user.role === 'patient' && (
                      <Link href="/appointments">
                        <button style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-on-surface)', fontWeight: 500 }}>
                          📅 My Bookings
                        </button>
                      </Link>
                    )}
                    <button
                      onClick={logout}
                      style={{
                        width: '100%', textAlign: 'left', padding: '10px 16px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: 14, color: 'var(--color-error)', fontWeight: 500,
                        borderTop: '1px solid var(--color-surface-container)',
                      }}>Sign Out</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/businesses">
                <button style={navBtn(isActive('/businesses'))}>Browse</button>
              </Link>
              <Link href="/login">
                <button style={{
                  background: 'transparent', border: '1.5px solid rgba(255,255,255,0.4)',
                  color: '#fff', padding: '7px 18px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
                }}>Sign In</button>
              </Link>
              <Link href="/signup">
                <button style={{
                  background: '#fff', border: 'none',
                  color: 'var(--color-primary)', padding: '7px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14,
                }}>Get Started</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
