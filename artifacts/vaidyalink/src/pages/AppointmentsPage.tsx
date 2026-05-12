import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, Link } from 'wouter';
import { api } from '@/lib/api';
import { PageSpinner } from '@/components/Spinner';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Appointment {
  id: number;
  status: string;
  notes?: string;
  created_at: string;
  provider: { business_name: string; specialty: string; category: string; user: { full_name: string } };
  service: { name: string; price: number; duration_minutes: number };
  slot: { date: string | Date; start_time: string; end_time: string };
  resource?: { name: string; type: string; color: string } | null;
  invoice: { id: number; total: number; status: string } | null;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  upcoming: { bg: '#e0f2fe', color: '#0369a1' },
  confirmed: { bg: '#dcfce7', color: '#15803d' },
  completed: { bg: '#e0f2fe', color: '#0284c7' },
  cancelled: { bg: '#fee2e2', color: '#b91c1c' },
  no_show: { bg: '#fef3c7', color: '#b45309' },
};

const FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const RESOURCE_ICONS: Record<string, string> = {
  turf: '⚽', court: '🏸', room: '🏠', chair: '💺', lane: '🏊',
  station: '💪', table: '🪑', bay: '🔧', field: '🌿', equipment: '🔧', staff: '👤', other: '🔲',
};

const CAT_COLORS: Record<string, string> = {
  sports: '#16a34a', healthcare: '#0d9488', beauty: '#ec4899', fitness: '#7c3aed',
  wellness: '#0891b2', education: '#d97706', professional: '#6366f1', doctor: '#0d9488', dentist: '#0891b2', other: '#64748b',
};

export default function AppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [cancelling, setCancelling] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchAppointments();
  }, [user, authLoading, filter]);

  async function fetchAppointments() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (filter) params.set('status', filter);
      const data = await api.get<{ appointments: Appointment[] }>(`/bookings?${params}`);
      setAppointments(data.appointments);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function cancelAppointment(id: number) {
    if (!confirm('Cancel this appointment? This cannot be undone.')) return;
    setCancelling(id);
    try {
      await api.patch(`/bookings/${id}`, { status: 'cancelled' });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
      toast.success('Appointment cancelled');
    } catch {
      toast.error('Failed to cancel. Please try again.');
    } finally {
      setCancelling(null);
    }
  }

  if (authLoading || loading) return <PageSpinner />;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 26, color: 'var(--color-primary)', marginBottom: 4 }}>My Bookings</h1>
          <p style={{ color: 'var(--color-outline)', fontSize: 14 }}>Manage your upcoming and past appointments</p>
        </div>
        <Link href="/businesses">
          <button style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            + New Booking
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} style={{
            padding: '7px 16px', borderRadius: 999, border: '1.5px solid',
            borderColor: filter === f.value ? 'var(--color-primary)' : 'var(--color-outline-variant)',
            background: filter === f.value ? 'var(--color-primary)' : '#fff',
            color: filter === f.value ? '#fff' : 'var(--color-on-surface)',
            fontWeight: 600, cursor: 'pointer', fontSize: 13, transition: 'all 0.15s',
          }}>{f.label}</button>
        ))}
      </div>

      {appointments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', borderRadius: 16, border: '1px solid var(--color-surface-container-high)' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📅</div>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 20, color: 'var(--color-primary)', marginBottom: 8 }}>No bookings yet</h2>
          <p style={{ color: 'var(--color-outline)', marginBottom: 24 }}>Browse businesses and book your first appointment</p>
          <Link href="/businesses">
            <button style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Browse Businesses</button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {appointments.map(appt => {
            const statusStyle = STATUS_COLORS[appt.status] || STATUS_COLORS.upcoming;
            const rawDate = appt.slot.date;
            const slotDate = rawDate instanceof Date
              ? rawDate
              : new Date(String(rawDate).substring(0, 10) + 'T00:00:00');
            const dateStr = isNaN(slotDate.getTime()) ? String(rawDate).substring(0, 10) : format(slotDate, 'EEE, MMM d, yyyy');
            const catColor = CAT_COLORS[appt.provider.category] || '#0d9488';
            return (
              <div key={appt.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--color-surface-container-high)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ height: 4, background: catColor }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-surface-container)', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, fontWeight: 700 }}>{appt.provider.business_name}</h3>
                    <p style={{ fontSize: 13, color: 'var(--color-outline)', marginTop: 2 }}>{appt.provider.specialty}</p>
                  </div>
                  <span style={{ ...statusStyle, padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>
                    {appt.status.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--color-outline)', marginBottom: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Package</p>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{appt.service.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>⏱ {appt.service.duration_minutes} min</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--color-outline)', marginBottom: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date & Time</p>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{dateStr}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>{appt.slot.start_time} – {appt.slot.end_time}</p>
                  </div>
                  {appt.resource && (
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--color-outline)', marginBottom: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Resource</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: appt.resource.color }}>
                        {RESOURCE_ICONS[appt.resource.type] || '🔲'} {appt.resource.name}
                      </p>
                    </div>
                  )}
                  {appt.invoice && (
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--color-outline)', marginBottom: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Invoice</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>₹{Number(appt.invoice.total).toLocaleString('en-IN')}</p>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                        background: appt.invoice.status === 'paid' ? '#dcfce7' : '#fef3c7',
                        color: appt.invoice.status === 'paid' ? '#15803d' : '#b45309',
                      }}>{appt.invoice.status}</span>
                    </div>
                  )}
                </div>
                {(appt.status === 'upcoming' || appt.status === 'confirmed') && (
                  <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-surface-container)', display: 'flex', gap: 8 }}>
                    <button onClick={() => cancelAppointment(appt.id)} disabled={cancelling === appt.id}
                      style={{ background: 'var(--color-error-container)', color: 'var(--color-error)', border: 'none', padding: '7px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                      {cancelling === appt.id ? '…' : 'Cancel Appointment'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
