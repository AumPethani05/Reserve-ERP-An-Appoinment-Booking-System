import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { PageSpinner } from '@/components/Spinner';
import { format } from 'date-fns';

interface Invoice {
  id: number; amount: number; tax: number; total: number; status: string;
  payment_method?: string; paid_at?: string; created_at: string;
  appointment: {
    patient: { full_name: string; email: string };
    service: { name: string };
    slot: { date: string | Date; start_time: string };
  };
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef3c7', color: '#b45309' },
  paid: { bg: '#dcfce7', color: '#15803d' },
  cancelled: { bg: '#fee2e2', color: '#b91c1c' },
  refunded: { bg: '#f3e8ff', color: '#7c3aed' },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ invoices: Invoice[] }>('/invoices')
      .then(d => setInvoices(d.invoices))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.total), 0);
  const pending = invoices.filter(i => i.status === 'pending');

  return (
    <div>
      <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 24, color: 'var(--color-primary)', marginBottom: 20 }}>Invoices</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: '💰', color: '#15803d' },
          { label: 'Total Invoices', value: String(invoices.length), icon: '🧾', color: 'var(--color-primary)' },
          { label: 'Pending', value: String(pending.length), icon: '⏳', color: '#b45309' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid var(--color-surface-container-high)' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? <PageSpinner /> : invoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-outline)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🧾</div>
          <p>No invoices yet. They are auto-generated when bookings are made.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--color-surface-container-high)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 120px 120px', gap: 12, padding: '12px 20px', background: 'var(--color-surface-container-low)', fontSize: 12, fontWeight: 700, color: 'var(--color-outline)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Patient / Service</span>
            <span>Date</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Method</span>
          </div>
          {invoices.map((inv, i) => {
            const sc = STATUS_COLORS[inv.status] || STATUS_COLORS.pending;
            const rawDate = inv.appointment.slot.date;
            const slotDate = rawDate instanceof Date ? rawDate : new Date(String(rawDate).substring(0, 10) + 'T00:00:00');
            return (
              <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 120px 120px', gap: 12, padding: '14px 20px', borderBottom: i < invoices.length - 1 ? '1px solid var(--color-surface-container)' : 'none', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{inv.appointment.patient.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>{inv.appointment.service.name}</p>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{format(slotDate, 'MMM d, yyyy')}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>{inv.appointment.slot.start_time}</p>
                </div>
                <div>
                  <p style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: 15 }}>₹{Number(inv.total).toLocaleString('en-IN')}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-outline)', marginTop: 2 }}>+₹{Number(inv.tax).toFixed(2)} tax</p>
                </div>
                <span style={{ ...sc, display: 'inline-block', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{inv.status}</span>
                <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', textTransform: 'capitalize' }}>{inv.payment_method || '—'}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
