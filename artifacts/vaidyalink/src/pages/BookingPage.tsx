import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { PageSpinner } from '@/components/Spinner';
import Spinner from '@/components/Spinner';

interface Service { id: number; name: string; price: number; duration_minutes: number; }
interface Slot { id: number; start_time: string; end_time: string; resource_id?: number; resource_name?: string; }
interface Provider { id: number; business_name: string; specialty: string; services: Service[]; }

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (document.getElementById('razorpay-script')) { resolve(true); return; }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}


export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get<{ provider: Provider }>(`/providers/${id}`)
      .then(d => setProvider(d.provider))
      .catch(() => setError('Provider not found'))
      .finally(() => setLoading(false));
    // Detect test mode by peeking at create-order (key_id prefix)
    // We do it lazily on first pay — flag is set after first create-order call
  }, [id, user]);

  useEffect(() => {
    if (!selectedDate || !id) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    api.get<{ slots: Slot[] }>(`/providers/${id}/slots?date=${selectedDate}`)
      .then(d => setSlots(d.slots))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, id]);


  async function handlePayAndBook() {
    if (!selectedService || !selectedSlot || !provider) return;
    setError('');
    setPaying(true);

    try {
      const orderData = await api.post<{
        order_id: string; amount: number; currency: string; key_id: string;
        service_name: string; service_price: number; tax: number; total: number;
      }>('/payments/create-order', {
        service_id: selectedService.id,
        slot_id: selectedSlot.id,
        provider_id: Number(id),
      });

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setError('Payment system failed to load. Please check your connection.');
        setPaying(false);
        return;
      }

      const options: Record<string, unknown> = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: provider.business_name,
        description: `${orderData.service_name} — ${selectedDate} ${selectedSlot.start_time}`,
        theme: { color: '#003740' },
        prefill: { 
          name: user?.full_name, 
          email: user?.email,
          contact: user?.phone || '',
        },
        modal: { ondismiss: () => setPaying(false) },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            const result = await api.post<{ appointment: { id: number } }>('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              provider_id: Number(id),
              slot_id: selectedSlot.id,
              service_id: selectedService.id,
              notes: notes || undefined,
            });
            navigate(`/booking/success?appointment_id=${result.appointment.id}`);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Booking failed after payment. Contact support.');
            setPaying(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initiate payment.');
      setPaying(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  if (loading) return <PageSpinner />;
  if (!provider) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <p style={{ color: 'var(--color-error)' }}>{error || 'Provider not found'}</p>
    </div>
  );

  const step1Done = !!selectedService;
  const step2Done = !!selectedDate && !!selectedSlot;
  const totalAmount = selectedService ? Number(selectedService.price) * 1.18 : 0;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>


      <button onClick={() => window.history.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', marginBottom: 24, fontSize: 14 }}>
        ← Back
      </button>

      <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-container))', borderRadius: 14, padding: '20px 24px', marginBottom: 24, color: '#fff' }}>
        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 20, marginBottom: 4 }}>Book Appointment</h1>
        <p style={{ opacity: 0.85, fontSize: 14 }}>{provider.business_name} · {provider.specialty}</p>
      </div>

      {error && (
        <div style={{ background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14 }}>{error}</div>
      )}

      {/* Step 1 — Select Service */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', marginBottom: 20, border: '1px solid var(--color-surface-container-high)' }}>
        <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, marginBottom: 14, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 24, background: step1Done ? '#16a34a' : 'var(--color-primary)', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
            {step1Done ? '✓' : '1'}
          </span>
          Select a Service
        </h2>
        {provider.services.length === 0 ? (
          <p style={{ color: 'var(--color-outline)', fontSize: 14 }}>No services listed yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {provider.services.map(s => (
              <div key={s.id} onClick={() => setSelectedService(s)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${selectedService?.id === s.id ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
                background: selectedService?.id === s.id ? 'var(--color-primary-fixed)' : '#fff',
                transition: 'all 0.15s',
              }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>⏱ {s.duration_minutes} minutes</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 15 }}>₹{Number(s.price).toLocaleString('en-IN')}</span>
                  <p style={{ fontSize: 11, color: 'var(--color-outline)', marginTop: 2 }}>+18% GST</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2 — Date & Slot */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', marginBottom: 20, border: '1px solid var(--color-surface-container-high)', opacity: step1Done ? 1 : 0.5 }}>
        <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, marginBottom: 14, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 24, background: step2Done ? '#16a34a' : 'var(--color-primary)', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
            {step2Done ? '✓' : '2'}
          </span>
          Choose Date & Time
        </h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>Select Date</label>
          <input
            type="date" min={today} value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            disabled={!step1Done}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--color-outline-variant)', fontSize: 14, outline: 'none', cursor: 'pointer' }}
          />
        </div>
        {selectedDate && (
          slotsLoading
            ? <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Spinner size={20} /><span style={{ fontSize: 13, color: 'var(--color-outline)' }}>Loading slots…</span></div>
            : slots.length === 0
              ? <p style={{ color: 'var(--color-outline)', fontSize: 14, background: 'var(--color-surface-container-low)', padding: '14px', borderRadius: 10 }}>No available slots for this date. Please try another date.</p>
              : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {slots.map(sl => (
                    <button key={sl.id} onClick={() => setSelectedSlot(sl)} style={{
                      padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      border: `2px solid ${selectedSlot?.id === sl.id ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
                      background: selectedSlot?.id === sl.id ? 'var(--color-primary)' : '#fff',
                      color: selectedSlot?.id === sl.id ? '#fff' : 'var(--color-on-surface)',
                      transition: 'all 0.15s',
                    }}>
                      {sl.start_time}
                      {sl.resource_name && (
                        <span style={{ fontSize: 10, opacity: 0.8, display: 'block', marginTop: 1 }}>{sl.resource_name}</span>
                      )}
                    </button>
                  ))}
                </div>
              )
        )}
      </div>

      {/* Step 3 — Notes & Payment */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid var(--color-surface-container-high)', opacity: step1Done && step2Done ? 1 : 0.5 }}>
        <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, marginBottom: 14, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 24, background: 'var(--color-primary)', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>3</span>
          Notes & Payment
        </h2>
        <textarea
          placeholder="Any notes for the provider? (optional)"
          value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--color-outline-variant)', fontSize: 14, resize: 'vertical', outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
        />

        {selectedService && selectedSlot && (
          <div style={{ background: 'var(--color-surface-container-low)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 14 }}>
            <p style={{ fontWeight: 700, marginBottom: 10, color: 'var(--color-primary)' }}>Order Summary</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--color-on-surface-variant)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{selectedService.name}</span>
                <span>₹{Number(selectedService.price).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Date & Time</span>
                <span style={{ fontWeight: 600 }}>{selectedDate} · {selectedSlot.start_time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>GST (18%)</span>
                <span>₹{(Number(selectedService.price) * 0.18).toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-outline-variant)', marginTop: 6, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-on-surface)' }}>Total to Pay</span>
                <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: 16 }}>₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handlePayAndBook}
          disabled={!step1Done || !step2Done || paying}
          style={{
            width: '100%', padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: 16,
            border: 'none', cursor: (!step1Done || !step2Done || paying) ? 'not-allowed' : 'pointer',
            background: (!step1Done || !step2Done) ? 'var(--color-surface-container)' : 'var(--color-primary)',
            color: (!step1Done || !step2Done) ? 'var(--color-outline)' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.15s',
          }}>
          {paying ? (
            <><Spinner size={20} color="#fff" /> Processing…</>
          ) : (
            <>
              <span>🔒</span>
              {step1Done && step2Done ? `Pay ₹${totalAmount.toFixed(2)} & Confirm Booking` : 'Pay & Confirm Booking'}
            </>
          )}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-outline)', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span>🔐</span> Secured by Razorpay · UPI, Cards, Net Banking accepted
        </p>
      </div>
    </div>
  );
}
