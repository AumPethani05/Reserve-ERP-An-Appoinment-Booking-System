import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Activity, BookOpen, Eye, GitFork, Scale, Settings, Star } from 'lucide-react';

const CATEGORIES = [
  { value: 'sports', label: 'Sports & Turf', icon: '⚽', desc: 'Book football turfs, cricket nets, badminton courts', color: '#16a34a' },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥', desc: 'Doctors, clinics, diagnostics & more', color: '#0d9488' },
  { value: 'beauty', label: 'Beauty & Salon', icon: '💅', desc: 'Hair, skin care, spa & beauty treatments', color: '#ec4899' },
  { value: 'fitness', label: 'Fitness & Gym', icon: '💪', desc: 'Gyms, yoga studios, personal trainers', color: '#7c3aed' },
  { value: 'wellness', label: 'Wellness & Spa', icon: '🧘', desc: 'Massage, meditation, holistic therapies', color: '#0891b2' },
  { value: 'education', label: 'Education', icon: '📚', desc: 'Tutoring, coaching classes, skill workshops', color: '#d97706' },
  { value: 'professional', label: 'Professional', icon: '💼', desc: 'Lawyers, accountants, consultants', color: '#6366f1' },
  { value: 'other', label: 'More Services', icon: '✦', desc: 'All other appointment-based services', color: '#64748b' },
];

const stats = [
  { value: '500+', label: 'Verified Businesses' },
  { value: '50K+', label: 'Happy Customers' },
  { value: '4.9★', label: 'Average Rating' },
  { value: '8+', label: 'Sectors' },
];

const features = [
  { icon: '🗓️', title: 'Instant Booking', description: 'Book any appointment in seconds with real-time slot availability across all resource types.' },
  { icon: '🏢', title: 'Any Business', description: 'Sports turfs, clinics, salons, gyms — any appointment-based business on one platform.' },
  { icon: '📊', title: 'Business ERP', description: 'Manage resources, schedules, bookings and invoices from a powerful business dashboard.' },
  { icon: '🔒', title: 'Secure & Reliable', description: 'Data protected with industry-grade security. Atomic bookings prevent double-booking.' },
];

const aboutLinks = [
  { icon: BookOpen, label: 'Readme', href: 'https://github.com/AumPethani05/Reserve-ERP-An-Appoinment-Booking-System/blob/main/README.md' },
  { icon: Scale, label: 'MIT license', href: 'https://github.com/AumPethani05/Reserve-ERP-An-Appoinment-Booking-System/blob/main/LICENSE' },
  { icon: Activity, label: 'Activity', href: 'https://github.com/AumPethani05/Reserve-ERP-An-Appoinment-Booking-System/pulse' },
];

const aboutStats = [
  { icon: Star, value: '0 stars' },
  { icon: Eye, value: '0 watching' },
  { icon: GitFork, value: '0 forks' },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div style={{ animation: 'fade-in 0.4s ease' }}>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, #065f46 100%)',
        color: '#fff', padding: '80px 24px 100px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.07,
          backgroundImage: 'radial-gradient(circle at 20% 80%, #b3ecf9 0%, transparent 50%), radial-gradient(circle at 80% 20%, #97d0dc 0%, transparent 50%)',
        }} />
        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 999, padding: '6px 18px', marginBottom: 24,
            fontSize: 13, fontWeight: 600, letterSpacing: 0.5,
          }}>
            <span>✦</span> Universal Appointment Booking Platform
          </div>
          <h1 style={{
            fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(2rem, 5vw, 3.6rem)',
            fontWeight: 800, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-0.03em',
          }}>
            Book <span style={{ color: '#6ee7b7' }}>Any Appointment</span>,<br />
            Anywhere, Instantly
          </h1>
          <p style={{ fontSize: 18, opacity: 0.88, marginBottom: 36, lineHeight: 1.7, maxWidth: 580, margin: '0 auto 36px' }}>
            From sports turfs to doctor clinics, salons to gyms — VaidyaLink connects you to every appointment-based business in your city.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/businesses">
              <button style={{
                background: '#fff', color: 'var(--color-primary)', border: 'none',
                padding: '14px 34px', borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)', transition: 'transform 0.15s',
              }}>
                {user ? 'Browse Businesses' : 'Find & Book Now'}
              </button>
            </Link>
            <Link href={user ? '/dashboard' : '/signup?role=provider'}>
              <button style={{
                background: 'rgba(255,255,255,0.12)', color: '#fff',
                border: '1.5px solid rgba(255,255,255,0.35)',
                padding: '14px 34px', borderRadius: 10, fontWeight: 600, fontSize: 16, cursor: 'pointer',
              }}>
                {user?.role === 'provider' ? 'Go to Dashboard' : 'List Your Business'}
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: '#fff', borderBottom: '1px solid var(--color-surface-container)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, textAlign: 'center' }}>
            {stats.map(stat => (
              <div key={stat.label}>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 32, fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>{stat.value}</div>
                <div style={{ fontSize: 13, color: 'var(--color-outline)', fontWeight: 500, marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Grid */}
      <section style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 30, fontFamily: 'Manrope, sans-serif', marginBottom: 12, color: 'var(--color-on-surface)' }}>
            What are you looking for?
          </h2>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 16 }}>
            Discover businesses across every sector
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {CATEGORIES.map(cat => (
            <Link key={cat.value} href={`/businesses?category=${cat.value}`}>
              <div style={{
                background: '#fff', borderRadius: 16, padding: '24px 20px',
                border: `1.5px solid ${cat.color}22`,
                boxShadow: 'var(--shadow-card)', cursor: 'pointer',
                transition: 'transform 0.18s, box-shadow 0.18s, border-color 0.18s',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)';
                  (e.currentTarget as HTMLElement).style.borderColor = cat.color;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
                  (e.currentTarget as HTMLElement).style.borderColor = `${cat.color}22`;
                }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                }}>
                  {cat.icon}
                </div>
                <div>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--color-on-surface)', marginBottom: 4 }}>
                    {cat.label}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-outline)', lineHeight: 1.5 }}>{cat.desc}</p>
                </div>
                <span style={{ fontSize: 12, color: cat.color, fontWeight: 600, marginTop: 'auto' }}>Browse →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '64px 24px', background: 'var(--color-surface-container-low)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 30, fontFamily: 'Manrope, sans-serif', marginBottom: 12 }}>Why VaidyaLink?</h2>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 16 }}>One platform for every appointment-based business</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {features.map(f => (
              <div key={f.title} style={{
                background: '#fff', borderRadius: 16, padding: '28px 24px',
                border: '1px solid var(--color-surface-container-high)',
                boxShadow: 'var(--shadow-card)',
              }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontFamily: 'Manrope, sans-serif', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', lineHeight: 1.7 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '64px 24px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 30, fontFamily: 'Manrope, sans-serif', marginBottom: 12 }}>How it works</h2>
        <p style={{ color: 'var(--color-outline)', marginBottom: 48, fontSize: 16 }}>Book any appointment in 3 simple steps</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, position: 'relative' }}>
          {[
            { step: '1', title: 'Find a Business', desc: 'Search by category, city, or name. Browse verified listings.' },
            { step: '2', title: 'Pick a Slot', desc: 'Choose your resource, date, and available time slot.' },
            { step: '3', title: 'Confirm & Go', desc: 'Instant confirmation with digital invoice. That\'s it!' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--color-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Manrope, sans-serif', fontSize: 22, fontWeight: 800,
              }}>{s.step}</div>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 17, fontWeight: 700 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--color-outline)', lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #065f46 100%)',
          color: '#fff', padding: '64px 24px', textAlign: 'center',
        }}>
          <h2 style={{ fontSize: 30, fontFamily: 'Manrope, sans-serif', marginBottom: 12 }}>Ready to get started?</h2>
          <p style={{ fontSize: 16, opacity: 0.85, marginBottom: 36 }}>
            Join thousands of customers and businesses on VaidyaLink
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup">
              <button style={{ background: '#fff', color: 'var(--color-primary)', border: 'none', padding: '13px 30px', borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
                Sign Up as Customer
              </button>
            </Link>
            <Link href="/signup?role=provider">
              <button style={{ background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', padding: '13px 30px', borderRadius: 10, fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
                Register Your Business
              </button>
            </Link>
          </div>
        </section>
      )}

      {/* GitHub-style About */}
      <section style={{ padding: '56px 24px 24px', background: 'var(--color-surface-container-low)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: '100%',
            maxWidth: 380,
            background: '#0d1117',
            color: '#c9d1d9',
            borderRadius: 12,
            border: '1px solid #30363d',
            padding: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ color: '#f0f6fc', fontSize: 30, fontFamily: 'Manrope, sans-serif', fontWeight: 700 }}>About</h2>
              <Settings size={18} color="#8b949e" aria-hidden="true" />
            </div>
            <p style={{ color: '#8b949e', fontSize: 21, fontStyle: 'italic', lineHeight: 1.45, marginBottom: 18 }}>
              No description, website, or topics provided.
            </p>
            <div style={{ display: 'grid', gap: 12 }}>
              {aboutLinks.map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#c9d1d9', textDecoration: 'underline', textUnderlineOffset: 3, fontSize: 22 }}
                >
                  <item.icon size={20} color="#8b949e" />
                  {item.label}
                </a>
              ))}
              {aboutStats.map(item => (
                <div key={item.value} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22 }}>
                  <item.icon size={20} color="#8b949e" />
                  {item.value}
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #30363d', marginTop: 18 }} />
          </div>
        </div>
      </section>

      <footer style={{ background: 'var(--color-surface-container-low)', borderTop: '1px solid var(--color-surface-container)', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--color-outline)' }}>
          © {new Date().getFullYear()} VaidyaLink — Universal Appointment ERP Platform. Built with care.
        </div>
      </footer>
    </div>
  );
}
