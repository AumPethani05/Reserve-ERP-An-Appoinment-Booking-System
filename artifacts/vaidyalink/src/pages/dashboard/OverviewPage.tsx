import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { PageSpinner } from '@/components/Spinner';
import { format } from 'date-fns';

interface Stats {
  totalAppointments: number;
  upcomingCount: number;
  completedCount: number;
  revenue: number;
  todaySlotsTotal: number;
  todaySlotsBooked: number;
  occupancyRate: number;
}
interface TodayAppt {
  id: number;
  status: string;
  patient: { full_name: string; email: string };
  slot: { date: string; start_time: string; end_time: string };
  invoice: { total: number; status: string } | null;
}

function StatCard({ icon, label, value, sub, color = 'var(--color-primary)' }: { icon: string; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid var(--color-surface-container-high)', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color, background: `${color}18`, padding: '3px 10px', borderRadius: 999 }}>{sub || 'Total'}</span>
      </div>
      <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 28, fontWeight: 800, color, marginBottom: 4 }}>{value}</p>
      <p style={{ fontSize: 13, color: 'var(--color-outline)' }}>{label}</p>
    </div>
  );
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayAppts, setTodayAppts] = useState<TodayAppt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ stats: Stats; todayAppointments: TodayAppt[] }>('/dashboard/stats')
      .then(d => { setStats(d.stats); setTodayAppts(d.todayAppointments); })
      .catch(() => {/* ignore */})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 24, color: 'var(--color-primary)', marginBottom: 4 }}>Dashboard Overview</h1>
        <p style={{ color: 'var(--color-outline)', fontSize: 14 }}>{today}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard icon="📅" label="Total Appointments" value={String(stats?.totalAppointments || 0)} sub="All time" />
        <StatCard icon="⏳" label="Upcoming" value={String(stats?.upcomingCount || 0)} sub="Pending" color="#0369a1" />
        <StatCard icon="✅" label="Completed" value={String(stats?.completedCount || 0)} sub="Done" color="#15803d" />
        <StatCard icon="💰" label="Revenue Earned" value={`₹${(stats?.revenue || 0).toLocaleString('en-IN')}`} sub="Paid" color="#b45309" />
        <StatCard icon="📊" label="Today's Occupancy" value={`${stats?.occupancyRate || 0}%`} sub={`${stats?.todaySlotsBooked || 0}/${stats?.todaySlotsTotal || 0} slots`} />
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--color-surface-container-high)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--color-surface-container)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, color: 'var(--color-primary)' }}>Today's Appointments</h2>
          <span style={{ fontSize: 12, color: 'var(--color-outline)', background: 'var(--color-surface-container-low)', padding: '4px 10px', borderRadius: 999 }}>
            {todayAppts.length} scheduled
          </span>
        </div>
        {todayAppts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-outline)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🌟</div>
            <p style={{ fontSize: 14 }}>No appointments scheduled for today.</p>
          </div>
        ) : (
          <div>
            {todayAppts.map((appt, i) => (
              <div key={appt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderBottom: i < todayAppts.length - 1 ? '1px solid var(--color-surface-container)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: 'var(--color-primary)', fontFamily: 'Manrope, sans-serif', flexShrink: 0 }}>
                    {appt.patient.full_name[0]}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{appt.patient.full_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>{appt.slot.start_time} – {appt.slot.end_time}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {appt.invoice && <p style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 14 }}>₹{Number(appt.invoice.total).toLocaleString('en-IN')}</p>}
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>{appt.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
