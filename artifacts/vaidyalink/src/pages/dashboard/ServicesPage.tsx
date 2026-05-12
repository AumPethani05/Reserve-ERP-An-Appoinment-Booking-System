import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { PageSpinner } from '@/components/Spinner';
import Spinner from '@/components/Spinner';

interface Service { id: number; name: string; duration_minutes: number; price: number; description?: string; is_active: boolean; }

const emptyForm = { name: '', duration_minutes: 30, price: 0, description: '' };

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchServices(); }, []);

  async function fetchServices() {
    setLoading(true);
    try {
      const data = await api.get<{ services: Service[] }>('/services');
      setServices(data.services);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      if (editId) {
        const data = await api.put<{ service: Service }>(`/services/${editId}`, form);
        setServices(prev => prev.map(s => s.id === editId ? data.service : s));
      } else {
        const data = await api.post<{ service: Service }>('/services', form);
        setServices(prev => [data.service, ...prev]);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Deactivate this service?')) return;
    try {
      await api.delete(`/services/${id}`);
      setServices(prev => prev.filter(s => s.id !== id));
    } catch { alert('Failed to delete'); }
  }

  function openEdit(s: Service) {
    setEditId(s.id);
    setForm({ name: s.name, duration_minutes: s.duration_minutes, price: Number(s.price), description: s.description || '' });
    setShowForm(true);
  }

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--color-outline-variant)', fontSize: 14, outline: 'none' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 24, color: 'var(--color-primary)' }}>Services</h1>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm); }}
          style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          {showForm ? '✕ Close' : '+ Add Service'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '22px', border: '1px solid var(--color-surface-container-high)', marginBottom: 24, boxShadow: 'var(--shadow-card)' }}>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, marginBottom: 16, color: 'var(--color-primary)' }}>{editId ? 'Edit Service' : 'New Service'}</h2>
          {error && <div style={{ background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 5 }}>Service Name *</label>
              <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Consultation" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 5 }}>Duration (min) *</label>
              <input type="number" style={inputStyle} value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} min={5} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 5 }}>Price (₹) *</label>
              <input type="number" style={inputStyle} value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} min={0} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 5 }}>Description</label>
            <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving || !form.name}
              style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, opacity: !form.name ? 0.6 : 1 }}>
              {saving ? <Spinner size={18} color="#fff" /> : null} {editId ? 'Save Changes' : 'Add Service'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
              style={{ background: 'var(--color-surface-container)', color: 'var(--color-on-surface)', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? <PageSpinner /> : services.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-outline)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🩺</div>
          <p>No services yet. Add your first service above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {services.map(s => (
            <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--color-surface-container-high)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</p>
                <p style={{ fontSize: 13, color: 'var(--color-outline)', marginTop: 3 }}>⏱ {s.duration_minutes} min{s.description ? ` · ${s.description}` : ''}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: 16 }}>₹{Number(s.price).toLocaleString('en-IN')}</span>
                <button onClick={() => openEdit(s)} style={{ background: 'var(--color-surface-container)', border: 'none', padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleDelete(s.id)} style={{ background: 'var(--color-error-container)', color: 'var(--color-error)', border: 'none', padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
