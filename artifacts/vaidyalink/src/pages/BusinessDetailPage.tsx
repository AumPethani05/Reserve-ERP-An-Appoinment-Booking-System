import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { PageSpinner } from '@/components/Spinner';
import Spinner from '@/components/Spinner';
import { toast } from 'sonner';

interface Service { id: number; name: string; price: number; duration_minutes: number; description?: string; }
interface Resource { id: number; name: string; type: string; description?: string; color: string; capacity: number; }
interface Schedule { day_of_week: number; start_time: string; end_time: string; }
interface Slot { id: number; start_time: string; end_time: string; resource_id: number | null; resource_name?: string; resource_color?: string; }
interface Business {
  id: number; business_name: string; specialty: string; city?: string; state?: string;
  address?: string; category: string; rating: number | string; total_reviews: number;
  description?: string;
  user: { full_name: string; email: string; phone: string; avatar_url?: string };
  services: Service[];
  resources: Resource[];
  schedules: Schedule[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const RESOURCE_ICONS: Record<string, string> = {
  turf: '⚽', court: '🏸', room: '🏠', chair: '💺', lane: '🏊',
  station: '💪', seat: '💺', table: '🪑', bay: '🔧', field: '🌿',
  equipment: '🔧', staff: '👤', other: '🔲',
};
const CAT_COLORS: Record<string, string> = {
  sports: '#16a34a', healthcare: '#0d9488', beauty: '#ec4899', fitness: '#7c3aed',
  wellness: '#0891b2', education: '#d97706', professional: '#6366f1', doctor: '#0d9488',
  dentist: '#0891b2', other: '#64748b',
};

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

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [biz, setBiz] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [showBooking, setShowBooking] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    if (user?.phone) setContactPhone(user.phone);
  }, [user]);

  useEffect(() => {
    api.get<{ provider: Business }>(`/providers/${id}`)
      .then(d => setBiz(d.provider))
      .catch(() => setError('Business not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!selectedDate || !id) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    const qp = new URLSearchParams({ date: selectedDate });
    if (selectedResource) qp.set('resource_id', String(selectedResource.id));
    api.get<{ slots: Slot[] }>(`/providers/${id}/slots?${qp}`)
      .then(d => setSlots(d.slots))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, id, selectedResource]);

  async function handleBook() {
    if (!selectedService || !selectedSlot || !biz) return;
    setBookingError('');
    setShowContactModal(true);
  }

  async function finalizeBooking() {
    if (!selectedService || !selectedSlot || !biz) return;
    setSubmitting(true);
    setBookingError('');
    try {
      const result = await api.post<{ appointment: { id: number } }>('/payments/test-checkout', {
        service_id: selectedService.id,
        slot_id: selectedSlot.id,
        provider_id: Number(id),
        notes: notes || undefined,
        phone: contactPhone || undefined,
      });
      
      toast.success('Booking confirmed! Invoice sent to your email.');
      navigate(`/booking/success?appointment_id=${result.appointment.id}`);
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
      setSubmitting(false);
      setShowContactModal(false);
    }
  }

  if (loading) return <PageSpinner />;
  if (error || !biz) return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <p style={{ color: 'var(--color-error)' }}>{error || 'Not found'}</p>
      <Link href="/businesses"><button style={{ marginTop: 16, padding: '10px 20px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Browse Businesses</button></Link>
    </div>
  );

  const catColor = CAT_COLORS[biz.category] || '#0d9488';
  const initials = biz.business_name.slice(0, 2).toUpperCase();
  const today = new Date().toISOString().split('T')[0];
  const hasResources = biz.resources.length > 1;
  const step1Done = !!selectedService;
  const step2Done = !hasResources || !!selectedResource;
  const step3Done = !!selectedDate && !!selectedSlot;

  // Group slots by resource if multi-resource
  const slotsByResource: Record<string, Slot[]> = {};
  if (!selectedResource) {
    for (const sl of slots) {
      const key = sl.resource_name || 'General';
      if (!slotsByResource[key]) slotsByResource[key] = [];
      slotsByResource[key].push(sl);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', animation: 'fade-in 0.3s ease' }}>
      <Link href="/businesses">
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: catColor, fontWeight: 600, cursor: 'pointer', marginBottom: 24, fontSize: 14 }}>
          ← Back to Businesses
        </button>
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        {/* Left: Info */}
        <div>
          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${catColor} 0%, ${catColor}cc 100%)`,
            borderRadius: 16, padding: '28px', marginBottom: 20, display: 'flex', gap: 20, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: 'Manrope, sans-serif', flexShrink: 0,
            }}>
              {biz.user.avatar_url ? <img src={biz.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials}
            </div>
            <div>
              <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 22, color: '#fff', marginBottom: 4 }}>{biz.business_name}</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{biz.specialty}</p>
              {(biz.city || biz.state) && (
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6 }}>📍 {[biz.address, biz.city, biz.state].filter(Boolean).join(', ')}</p>
              )}
              {biz.total_reviews > 0 && (
                <p style={{ color: '#fef08a', fontSize: 13, marginTop: 6 }}>
                  {'★'.repeat(Math.round(Number(biz.rating)))} {Number(biz.rating).toFixed(1)} ({biz.total_reviews} reviews)
                </p>
              )}
              <span style={{ marginTop: 8, display: 'inline-block', fontSize: 11, background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '3px 10px', borderRadius: 999, fontWeight: 600, textTransform: 'capitalize' }}>
                {biz.category}
              </span>
            </div>
          </div>

          {/* Description */}
          {biz.description && (
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', marginBottom: 20, border: '1px solid var(--color-surface-container-high)' }}>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, marginBottom: 10, color: catColor }}>About</h2>
              <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', lineHeight: 1.75 }}>{biz.description}</p>
            </div>
          )}

          {/* Resources */}
          {biz.resources.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', marginBottom: 20, border: '1px solid var(--color-surface-container-high)' }}>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, marginBottom: 14, color: catColor }}>
                Available Resources ({biz.resources.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {biz.resources.map(r => (
                  <div key={r.id} style={{
                    padding: '12px', borderRadius: 10,
                    border: `1.5px solid ${r.color || catColor}30`,
                    background: `${r.color || catColor}08`,
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{RESOURCE_ICONS[r.type] || '🔲'}</div>
                    <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-on-surface)', marginBottom: 2 }}>{r.name}</p>
                    <p style={{ fontSize: 11, color: r.color || catColor, fontWeight: 600, textTransform: 'capitalize' }}>{r.type}</p>
                    {r.description && <p style={{ fontSize: 11, color: 'var(--color-outline)', marginTop: 4, lineHeight: 1.4 }}>{r.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          {biz.services.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', marginBottom: 20, border: '1px solid var(--color-surface-container-high)' }}>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, marginBottom: 14, color: catColor }}>Packages & Pricing</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {biz.services.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--color-surface-container-low)', borderRadius: 10 }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>⏱ {s.duration_minutes} min{s.description ? ` · ${s.description}` : ''}</p>
                    </div>
                    <span style={{ fontWeight: 700, color: catColor, fontSize: 15 }}>₹{Number(s.price).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Working Hours */}
          {biz.schedules.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid var(--color-surface-container-high)' }}>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, marginBottom: 14, color: catColor }}>Business Hours</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
                {biz.schedules.map(sc => (
                  <div key={sc.day_of_week} style={{ background: 'var(--color-surface-container-low)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: catColor, marginBottom: 4 }}>{DAYS[sc.day_of_week]}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-outline)' }}>{sc.start_time} – {sc.end_time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Booking Panel */}
        <div style={{ position: 'sticky', top: 80 }}>
          {!showBooking ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid var(--color-surface-container-high)', boxShadow: 'var(--shadow-card)' }}>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 18, color: catColor, marginBottom: 6 }}>Book an Appointment</h2>
              <p style={{ fontSize: 14, color: 'var(--color-outline)', marginBottom: 20 }}>
                {biz.resources.length > 0 ? `${biz.resources.length} resource${biz.resources.length !== 1 ? 's' : ''} available to book` : 'Select a service and time slot'}
              </p>
              {biz.services.length === 0 ? (
                <p style={{ color: 'var(--color-outline)', fontSize: 14 }}>No services listed yet.</p>
              ) : !user ? (
                <div>
                  <p style={{ color: 'var(--color-outline)', fontSize: 14, marginBottom: 16 }}>Sign in to book an appointment</p>
                  <Link href="/login">
                    <button style={{ width: '100%', background: catColor, color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      Sign In to Book
                    </button>
                  </Link>
                </div>
              ) : (
                <button
                  onClick={() => setShowBooking(true)}
                  style={{ width: '100%', background: catColor, color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
                  Book Now
                </button>
              )}
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--color-surface-container)' }}>
                <p style={{ fontSize: 13, color: 'var(--color-outline)', marginBottom: 8 }}>Contact</p>
                <p style={{ fontSize: 14 }}>📧 {biz.user.email}</p>
                {biz.user.phone && <p style={{ fontSize: 14, marginTop: 4 }}>📞 {biz.user.phone}</p>}
              </div>
            </div>
          ) : (
            /* Inline Booking Form */
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid var(--color-surface-container-high)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, color: catColor }}>Book Appointment</h2>
                <button onClick={() => setShowBooking(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--color-outline)' }}>✕</button>
              </div>

              {bookingError && <div style={{ background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{bookingError}</div>}

              {/* Step 1: Service */}
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-outline)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {step1Done ? '✓ ' : ''}Select Package
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {biz.services.map(s => (
                    <div key={s.id} onClick={() => setSelectedService(s)} style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      border: `2px solid ${selectedService?.id === s.id ? catColor : 'var(--color-outline-variant)'}`,
                      background: selectedService?.id === s.id ? `${catColor}12` : '#fff',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-outline)' }}>⏱ {s.duration_minutes} min</p>
                      </div>
                      <span style={{ fontWeight: 700, color: catColor, fontSize: 13 }}>₹{Number(s.price).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Resource (only if multiple) */}
              {hasResources && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-outline)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {step2Done ? '✓ ' : ''}Select Resource
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                    {biz.resources.map(r => (
                      <div key={r.id} onClick={() => setSelectedResource(r)} style={{
                        padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                        border: `2px solid ${selectedResource?.id === r.id ? (r.color || catColor) : 'var(--color-outline-variant)'}`,
                        background: selectedResource?.id === r.id ? `${r.color || catColor}12` : '#fff',
                      }}>
                        <div style={{ fontSize: 18 }}>{RESOURCE_ICONS[r.type] || '🔲'}</div>
                        <p style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: 'var(--color-on-surface)' }}>{r.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Date & Slot */}
              {step1Done && step2Done && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-outline)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {step3Done ? '✓ ' : ''}Pick Date & Time
                  </p>
                  <input
                    type="date" min={today} value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-outline-variant)', fontSize: 13, marginBottom: 10, outline: 'none' }}
                  />
                  {selectedDate && (
                    slotsLoading ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--color-outline)' }}><Spinner size={16} /> Loading…</div>
                    : slots.length === 0 ? <p style={{ fontSize: 13, color: 'var(--color-outline)', background: 'var(--color-surface-container-low)', padding: 10, borderRadius: 8 }}>No slots available. Try another date.</p>
                    : selectedResource ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {slots.map(sl => (
                          <button key={sl.id} onClick={() => setSelectedSlot(sl)} style={{
                            padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            border: `2px solid ${selectedSlot?.id === sl.id ? catColor : 'var(--color-outline-variant)'}`,
                            background: selectedSlot?.id === sl.id ? catColor : '#fff',
                            color: selectedSlot?.id === sl.id ? '#fff' : 'var(--color-on-surface)',
                          }}>{sl.start_time}</button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {Object.entries(slotsByResource).map(([resName, resSlots]) => (
                          <div key={resName}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-outline)', marginBottom: 4 }}>{resName}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {resSlots.map(sl => (
                                <button key={sl.id} onClick={() => setSelectedSlot(sl)} style={{
                                  padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                  border: `2px solid ${selectedSlot?.id === sl.id ? catColor : 'var(--color-outline-variant)'}`,
                                  background: selectedSlot?.id === sl.id ? catColor : '#fff',
                                  color: selectedSlot?.id === sl.id ? '#fff' : 'var(--color-on-surface)',
                                }}>{sl.start_time}</button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Notes */}
              {step3Done && (
                <textarea
                  placeholder="Notes (optional)"
                  value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-outline-variant)', fontSize: 13, resize: 'vertical', outline: 'none', marginBottom: 12 }}
                />
              )}

              {/* Summary & Confirm */}
              {selectedService && selectedSlot && (
                <div style={{ background: 'var(--color-surface-container-low)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12 }}>
                  <p style={{ fontWeight: 700, color: catColor, marginBottom: 6 }}>Booking Summary</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, color: 'var(--color-on-surface-variant)' }}>
                    <span>Package: <strong>{selectedService.name}</strong></span>
                    {selectedResource && <span>Resource: <strong>{selectedResource.name}</strong></span>}
                    <span>Date: <strong>{selectedDate}</strong></span>
                    <span>Time: <strong>{selectedSlot.start_time} – {selectedSlot.end_time}</strong></span>
                    <div style={{ borderTop: '1px solid var(--color-outline-variant)', marginTop: 4, paddingTop: 4 }}>
                      <span>Total: <strong style={{ color: catColor, fontSize: 14 }}>₹{(Number(selectedService.price) * 1.18).toFixed(0)}</strong> <span style={{ fontSize: 11 }}>incl. GST</span></span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleBook}
                disabled={!step1Done || !step2Done || !step3Done || submitting}
                style={{
                  width: '100%', padding: '12px', background: catColor, color: '#fff',
                  border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15,
                  cursor: (!step1Done || !step2Done || !step3Done || submitting) ? 'not-allowed' : 'pointer',
                  opacity: (!step1Done || !step2Done || !step3Done) ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                {submitting ? <><Spinner size={18} color="#fff" /> Booking…</> : 'Confirm Booking'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Details Modal (Mock Razorpay Style) */}
      {showContactModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            width: '100%', maxWidth: 480, background: '#fff', borderRadius: 12,
            overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            animation: 'slide-up 0.3s ease-out',
          }}>
            {/* Modal Header */}
            <div style={{ padding: '24px', position: 'relative', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
              <button onClick={() => setShowContactModal(false)} style={{ position: 'absolute', right: 16, top: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>Edit contact details</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>Enter mobile number to continue</p>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '32px 24px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8,
                background: '#f8fafc',
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                  🇮🇳 +91 ▾
                </span>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="8830657194"
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    fontSize: 15, fontWeight: 500, color: '#1e293b', letterSpacing: 0.5
                  }}
                />
              </div>

              <button
                onClick={finalizeBooking}
                disabled={submitting}
                style={{
                  width: '100%', marginTop: 24, padding: '14px',
                  background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10,
                  fontWeight: 700, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}>
                {submitting ? 'Processing...' : 'Continue'}
              </button>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                Secured by <strong style={{ color: '#64748b' }}>Razorpay</strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
