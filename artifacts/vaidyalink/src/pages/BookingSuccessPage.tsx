import { useEffect, useState } from 'react';
import { Link, useSearch } from 'wouter';
import { api } from '@/lib/api';
import { PageSpinner } from '@/components/Spinner';

interface AppointmentSummary {
  id: number;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  service_name: string;
  service_price: number;
  business_name: string;
  address: string;
  city: string;
  patient_name: string;
  invoice_id: number;
  total: number;
  tax: number;
  payment_reference: string;
  paid_at: string;
}

function formatINR(n: number) {
  return '₹' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BookingSuccessPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const appointmentId = params.get('appointment_id');

  const [appt, setAppt] = useState<AppointmentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appointmentId) { setLoading(false); return; }
    api.get<{ appointment: AppointmentSummary }>(`/payments/appointment/${appointmentId}`)
      .then(d => setAppt(d.appointment))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [appointmentId]);

  if (loading) return <PageSpinner />;

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Success hero */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg,#16a34a,#15803d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px', fontSize: 36, boxShadow: '0 8px 24px rgba(22,163,74,0.3)',
          }}>✓</div>
          <h1 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--color-primary)', marginBottom: 8 }}>
            Booking Confirmed!
          </h1>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 14, lineHeight: 1.7 }}>
            Payment received. A receipt has been sent to your email.
          </p>
        </div>

        {appt ? (
          <>
            {/* Appointment Details */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--color-surface-container-high)', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ background: 'var(--color-primary)', padding: '12px 20px' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Appointment Details
                </p>
              </div>
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Business', appt.business_name],
                  ['Service', appt.service_name],
                  ['Date', formatDate(appt.date)],
                  ['Time', `${appt.start_time} – ${appt.end_time}`],
                  ['Location', [appt.address, appt.city].filter(Boolean).join(', ') || '—'],
                  ['Appointment ID', `#${appt.id}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--color-outline)', flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface)', textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Receipt */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--color-surface-container-high)', overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ background: 'var(--color-primary)', padding: '12px 20px' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Payment Receipt
                </p>
              </div>
              <div style={{ padding: '18px 20px' }}>
                {[
                  ['Invoice #', `INV-${String(appt.invoice_id).padStart(6, '0')}`],
                  ['Payment ID', appt.payment_reference],
                  ['Paid On', new Date(appt.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })],
                  ['Method', 'Razorpay'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--color-outline)' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface)', fontFamily: label === 'Payment ID' ? 'monospace' : 'inherit', maxWidth: '55%', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px dashed var(--color-outline-variant)', margin: '12px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--color-outline)' }}>{appt.service_name}</span>
                  <span style={{ fontSize: 13, color: 'var(--color-on-surface)' }}>{formatINR(Number(appt.total) - Number(appt.tax))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--color-outline)' }}>GST (18%)</span>
                  <span style={{ fontSize: 13, color: 'var(--color-on-surface)' }}>{formatINR(Number(appt.tax))}</span>
                </div>
                <div style={{ borderTop: '2px solid var(--color-primary)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-on-surface)' }}>Total Paid</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>{formatINR(Number(appt.total))}</span>
                </div>
                <div style={{ background: '#ecfdf5', borderRadius: 8, padding: '10px 14px', marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>✓ Payment Successful via Razorpay</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--color-surface-container-high)', padding: '20px 24px', marginBottom: 24, textAlign: 'center' }}>
            <p style={{ color: 'var(--color-outline)', fontSize: 14 }}>
              Appointment #{appointmentId} confirmed. Check your email for the full receipt.
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/appointments">
            <button style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              View My Appointments
            </button>
          </Link>
          <Link href="/businesses">
            <button style={{ background: '#fff', color: 'var(--color-primary)', border: '1.5px solid var(--color-primary)', padding: '12px 28px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              Browse More
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}
