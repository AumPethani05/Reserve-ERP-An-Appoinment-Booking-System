import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { PageSpinner } from '@/components/Spinner';
import { toast } from 'sonner';

interface Schedule { id: number; day_of_week: number; start_time: string; end_time: string; slot_duration: number; is_active: boolean; }

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [pendingForm, setPendingForm] = useState<Record<number, { start_time: string; end_time: string; slot_duration: number; enabled: boolean }>>({});

  useEffect(() => {
    api.get<{ schedules: Schedule[] }>('/schedule')
      .then(d => {
        setSchedules(d.schedules);
        const map: typeof pendingForm = {};
        DAYS.forEach((_, i) => {
          const s = d.schedules.find(sc => sc.day_of_week === i);
          map[i] = s ? { start_time: s.start_time, end_time: s.end_time, slot_duration: s.slot_duration, enabled: !!s.is_active } : { start_time: '09:00', end_time: '17:00', slot_duration: 30, enabled: false };
        });
        setPendingForm(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveDay(day: number) {
    const f = pendingForm[day];
    setSaving(day);
    try {
        const data = await api.post<{ schedule: Schedule; slots_generated: boolean }>('/schedule', {
          day_of_week: day,
          start_time: f.start_time,
          end_time: f.end_time,
          slot_duration: f.slot_duration,
          is_active: f.enabled
        });
        setSchedules(prev => {
          const filtered = prev.filter(s => s.day_of_week !== day);
          return [...filtered, data.schedule].sort((a, b) => a.day_of_week - b.day_of_week);
        });
        if (!f.enabled) {
          toast.success(`${DAYS[day]} schedule deactivated`);
        } else {
          toast.success(data.slots_generated ? `${DAYS[day]} schedule saved & slots generated` : `${DAYS[day]} schedule saved`);
        }
    } catch { toast.error('Failed to update schedule'); } finally { setSaving(null); }
  }

  function update(day: number, field: string, value: unknown) {
    setPendingForm(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  }

  if (loading) return <PageSpinner />;

  const inputStyle = { padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--color-outline-variant)', fontSize: 13, outline: 'none', background: '#fff' };

  return (
    <div>
      <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 24, color: 'var(--color-primary)', marginBottom: 8 }}>Working Schedule</h1>
      <p style={{ color: 'var(--color-outline)', fontSize: 14, marginBottom: 24 }}>Set your working hours for each day. Slots will be generated based on your schedule.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DAYS.map((day, i) => {
          const f = pendingForm[i] || { start_time: '09:00', end_time: '17:00', slot_duration: 30, enabled: false };
          const hasSchedule = schedules.some(s => s.day_of_week === i);
          return (
            <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--color-surface-container-high)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
                <input type="checkbox" id={`day-${i}`} checked={f.enabled} onChange={e => update(i, 'enabled', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--color-primary)' }} />
                <label htmlFor={`day-${i}`} style={{ fontWeight: 700, fontSize: 14, cursor: 'pointer', userSelect: 'none' }}>{day}</label>
                {hasSchedule && schedules.find(s => s.day_of_week === i)?.is_active && <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>Active</span>}
                {hasSchedule && !schedules.find(s => s.day_of_week === i)?.is_active && <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>Inactive</span>}
              </div>
              {f.enabled ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 12, color: 'var(--color-outline)', fontWeight: 600 }}>From</label>
                    <input type="time" style={inputStyle} value={f.start_time} onChange={e => update(i, 'start_time', e.target.value)} />
                    <label style={{ fontSize: 12, color: 'var(--color-outline)', fontWeight: 600 }}>To</label>
                    <input type="time" style={inputStyle} value={f.end_time} onChange={e => update(i, 'end_time', e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 12, color: 'var(--color-outline)', fontWeight: 600 }}>Slot</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.slot_duration} onChange={e => update(i, 'slot_duration', Number(e.target.value))}>
                      {[15, 20, 30, 45, 60].map(d => <option key={d} value={d}>{d} min</option>)}
                    </select>
                  </div>
                  <button onClick={() => saveDay(i)} disabled={saving === i}
                    style={{ marginLeft: 'auto', background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '7px 18px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                    {saving === i ? '…' : 'Save'}
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                  <span style={{ fontSize: 13, color: 'var(--color-outline)' }}>Day off</span>
                  {hasSchedule && (
                    <button onClick={() => saveDay(i)} disabled={saving === i}
                      style={{ marginLeft: 'auto', background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '7px 18px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                      {saving === i ? '…' : 'Deactivate'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
