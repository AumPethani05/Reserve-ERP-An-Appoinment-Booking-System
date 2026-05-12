import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { PageSpinner } from '@/components/Spinner';
import { format } from 'date-fns';

interface DashAppt {
  id: number;
  status: string;
  patient: { full_name: string; email: string; phone: string };
  service: { name: string; price: number };
  slot: { date: string | Date; start_time: string; end_time: string };
  invoice: { total: number; status: string } | null;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  upcoming: { bg: '#e0f2fe', color: '#0369a1' },
  completed: { bg: '#dcfce7', color: '#15803d' },
  cancelled: { bg: '#fee2e2', color: '#b91c1c' },
};

export default function DashAppointmentsPage() {
  const [appointments, setAppointments] = useState<DashAppt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => { fetchAppointments(); }, [filter]);

  async function fetchAppointments() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (filter) params.set('status', filter);
      const data = await api.get<{ appointments: DashAppt[] }>(`/dashboard/appointments?${params}`);
      setAppointments(data.appointments);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  async function updateStatus(id: number, status: string) {
    setUpdating(id);
    try {
      await api.patch(`/bookings/${id}`, { status });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch {
      alert('Failed to update status');
    } finally { setUpdating(null); }
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 24, color: 'var(--color-primary)', marginBottom: 20 }}>Appointments</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_OPTIONS.map(o => (
          <button key={o.value} onClick={() => setFilter(o.value)} style={{
            padding: '7px 18px', borderRadius: 999, border: '1.5px solid',
            borderColor: filter === o.value ? 'var(--color-primary)' : 'var(--color-outline-variant)',
            background: filter === o.value ? 'var(--color-primary)' : '#fff',
            color: filter === o.value ? '#fff' : 'var(--color-on-surface)',
            fontWeight: 600, cursor: 'pointer', fontSize: 13,
          }}>{o.label}</button>
        ))}
      </div>

      {loading ? <PageSpinner /> : appointments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-outline)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
          <p>No appointments found.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--color-surface-container-high)', overflow: 'hidden' }}>
          {appointments.map((appt, i) => {
            const sc = STATUS_COLORS[appt.status] || STATUS_COLORS.upcoming;
            const rawDate = appt.slot.date;
            const slotDate = rawDate instanceof Date ? rawDate : new Date(String(rawDate).substring(0, 10) + 'T00:00:00');
            return (
              <div key={appt.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 16, padding: '16px 20px', borderBottom: i < appointments.length - 1 ? '1px solid var(--color-surface-container)' : 'none', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{appt.patient.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-outline)' }}>{appt.patient.email}</p>
                  {appt.patient.phone && <p style={{ fontSize: 12, color: 'var(--color-outline)' }}>{appt.patient.phone}</p>}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{appt.service.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>{format(slotDate, 'MMM d, yyyy')} · {appt.slot.start_time}</p>
                </div>
                <div>
                  {appt.invoice && <p style={{ fontWeight: 700, color: 'var(--color-primary)' }}>₹{Number(appt.invoice.total).toLocaleString('en-IN')}</p>}
                  <span style={{ ...sc, display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{appt.status}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {appt.status === 'upcoming' && (
                    <>
                      <button onClick={() => updateStatus(appt.id, 'completed')} disabled={updating === appt.id}
                        style={{ background: 'var(--color-success-container)', color: 'var(--color-success)', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        ✓ Done
                      </button>
                      <button onClick={() => updateStatus(appt.id, 'cancelled')} disabled={updating === appt.id}
                        style={{ background: 'var(--color-error-container)', color: 'var(--color-error)', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
