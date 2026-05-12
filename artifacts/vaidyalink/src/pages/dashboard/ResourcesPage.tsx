import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { PageSpinner } from '@/components/Spinner';
import Spinner from '@/components/Spinner';
import { toast } from 'sonner';

interface Resource {
  id: number; name: string; type: string; description?: string;
  is_active: boolean; capacity: number; color: string;
}

const RESOURCE_TYPES = [
  { value: 'turf', label: 'Turf', icon: '⚽' },
  { value: 'court', label: 'Court', icon: '🏸' },
  { value: 'room', label: 'Room', icon: '🏠' },
  { value: 'chair', label: 'Chair / Station', icon: '💺' },
  { value: 'lane', label: 'Lane', icon: '🏊' },
  { value: 'field', label: 'Field', icon: '🌿' },
  { value: 'table', label: 'Table', icon: '🪑' },
  { value: 'bay', label: 'Bay', icon: '🔧' },
  { value: 'equipment', label: 'Equipment', icon: '🏋️' },
  { value: 'staff', label: 'Staff Member', icon: '👤' },
  { value: 'other', label: 'Other', icon: '🔲' },
];

const TYPE_ICONS: Record<string, string> = Object.fromEntries(RESOURCE_TYPES.map(t => [t.value, t.icon]));

const PRESET_COLORS = ['#0d9488', '#16a34a', '#dc2626', '#2563eb', '#7c3aed', '#d97706', '#ec4899', '#0891b2', '#65a30d', '#6366f1'];

const emptyForm = { name: '', type: 'room', description: '', capacity: 1, color: '#0d9488' };

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [slotDays, setSlotDays] = useState(14);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api.get<{ resources: Resource[] }>('/resources')
      .then(d => setResources(d.resources))
      .catch(() => toast.error('Failed to load resources'))
      .finally(() => setLoading(false));
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(r: Resource) {
    setEditingId(r.id);
    setForm({ name: r.name, type: r.type, description: r.description || '', capacity: r.capacity, color: r.color });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        const data = await api.put<{ resource: Resource }>(`/resources/${editingId}`, form);
        setResources(prev => prev.map(r => r.id === editingId ? data.resource : r));
        toast.success('Resource updated');
      } else {
        const data = await api.post<{ resource: Resource }>('/resources', form);
        setResources(prev => [data.resource, ...prev]);
        toast.success('Resource added');
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally { setSaving(false); }
  }

  async function handleToggleActive(r: Resource) {
    const action = r.is_active ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this resource?`)) return;
    try {
      if (r.is_active) {
        await api.delete(`/resources/${r.id}`);
        setResources(prev => prev.map(item => item.id === r.id ? { ...item, is_active: false } : item));
        toast.success('Resource deactivated');
      } else {
        const data = await api.put<{ resource: Resource }>(`/resources/${r.id}`, { is_active: true });
        setResources(prev => prev.map(item => item.id === r.id ? { ...item, is_active: true } : item));
        toast.success('Resource reactivated');
      }
    } catch { toast.error(`Failed to ${action} resource`); }
  }

  async function generateSlots(id: number) {
    setGeneratingId(id);
    try {
      const data = await api.post<{ message: string; count: number }>(`/resources/${id}/generate-slots`, { days: slotDays });
      toast.success(data.message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate slots');
    } finally { setGeneratingId(null); }
  }

  async function generateAllSlots() {
    setGeneratingAll(true);
    try {
      const data = await api.post<{ message: string; count: number }>('/resources/generate-all-slots', { days: slotDays });
      toast.success(data.message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate slots');
    } finally { setGeneratingAll(false); }
  }

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--color-outline-variant)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 24, color: 'var(--color-primary)', marginBottom: 4 }}>Resources</h1>
          <p style={{ color: 'var(--color-outline)', fontSize: 14 }}>Manage your bookable resources — turfs, rooms, chairs, staff etc.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {resources.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, color: 'var(--color-outline)', fontWeight: 600 }}>Generate for</label>
                <select
                  value={slotDays}
                  onChange={e => setSlotDays(Number(e.target.value))}
                  style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--color-outline-variant)', fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                </select>
              </div>
              <button
                onClick={generateAllSlots}
                disabled={generatingAll}
                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                {generatingAll ? <><Spinner size={15} color="#fff" /> Generating…</> : '⚡ Generate All Slots'}
              </button>
            </>
          )}
          <button
            onClick={openAdd}
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            + Add Resource
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid var(--color-surface-container-high)', marginBottom: 24, boxShadow: 'var(--shadow-card)' }}>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, marginBottom: 20, color: 'var(--color-primary)' }}>
            {editingId ? 'Edit Resource' : 'Add New Resource'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 5 }}>Resource Name *</label>
              <input
                style={inputStyle}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Turf A, Chair 3, Room 101"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 5 }}>Type *</label>
              <select style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 5 }}>Capacity (people at once)</label>
              <input
                type="number" min={1} max={100} style={inputStyle}
                value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 5 }}>Color Label</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(c => (
                  <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid var(--color-on-surface)' : '3px solid transparent', transition: 'border 0.1s' }} />
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: 5 }}>Description</label>
            <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving || !form.name} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, opacity: !form.name ? 0.6 : 1 }}>
              {saving ? <Spinner size={18} color="#fff" /> : null} {editingId ? 'Save Changes' : 'Add Resource'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(emptyForm); setEditingId(null); }} style={{ background: 'var(--color-surface-container)', color: 'var(--color-on-surface)', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <PageSpinner /> : resources.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', borderRadius: 16, border: '1px solid var(--color-surface-container-high)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏗️</div>
          <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>No resources yet</p>
          <p style={{ color: 'var(--color-outline)', fontSize: 14, marginBottom: 20 }}>Add your bookable resources — turfs, rooms, chairs, staff members, or any asset customers can book.</p>
          <button onClick={openAdd} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>+ Add First Resource</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {resources.map(r => (
            <div key={r.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--color-surface-container-high)', overflow: 'hidden' }}>
              {/* Color bar */}
              <div style={{ height: 5, background: r.color || 'var(--color-primary)' }} />
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, background: `${r.color || 'var(--color-primary)'}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                  }}>
                    {TYPE_ICONS[r.type] || '🔲'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{r.name}</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: r.color, fontWeight: 600, textTransform: 'capitalize', background: `${r.color}18`, padding: '2px 8px', borderRadius: 999 }}>{r.type}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-outline)', background: 'var(--color-surface-container)', padding: '2px 8px', borderRadius: 999 }}>Cap: {r.capacity}</span>
                      {!r.is_active && <span style={{ fontSize: 11, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 999 }}>Inactive</span>}
                    </div>
                  </div>
                </div>

                {r.description && <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', lineHeight: 1.5, marginBottom: 12 }}>{r.description}</p>}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => generateSlots(r.id)}
                    disabled={generatingId === r.id || !r.is_active}
                    style={{
                      flex: 1, padding: '7px', background: r.is_active ? '#16a34a' : 'var(--color-surface-container)',
                      color: r.is_active ? '#fff' : 'var(--color-outline)', border: 'none', borderRadius: 7, fontWeight: 600,
                      cursor: r.is_active ? 'pointer' : 'not-allowed', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                    }}>
                    {generatingId === r.id ? <><Spinner size={13} color="#fff" /> …</> : '⚡ Generate Slots'}
                  </button>
                  <button onClick={() => openEdit(r)} style={{ padding: '7px 12px', background: 'var(--color-surface-container)', color: 'var(--color-on-surface)', border: 'none', borderRadius: 7, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                  {r.is_active ? (
                    <button onClick={() => handleToggleActive(r)} style={{ padding: '7px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 7, fontWeight: 600, cursor: 'pointer', fontSize: 12 }} title="Deactivate">✕</button>
                  ) : (
                    <button onClick={() => handleToggleActive(r)} style={{ padding: '7px 12px', background: '#d1fae5', color: '#059669', border: 'none', borderRadius: 7, fontWeight: 600, cursor: 'pointer', fontSize: 12 }} title="Re-activate">✓ Activate</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
