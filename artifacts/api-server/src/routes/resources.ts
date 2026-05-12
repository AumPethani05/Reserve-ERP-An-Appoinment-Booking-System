import { Router, Request, Response } from 'express';
import { pool } from '@workspace/db';
import { requireRole } from '../lib/auth.js';

const router = Router();

const VALID_TYPES = ['turf', 'court', 'room', 'chair', 'lane', 'station', 'seat', 'table', 'bay', 'field', 'equipment', 'staff', 'other'];

function getProviderId(userId: number) {
  return pool.query('SELECT id FROM providers WHERE user_id = $1', [userId]);
}

function parseIntParam(value: string | string[]): number | null {
  const str = Array.isArray(value) ? value[0] : value;
  if (!str) return null;
  const n = parseInt(str, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

router.get('/', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  try {
    const provResult = await getProviderId(auth.userId);
    if (!provResult.rows.length) return res.status(404).json({ error: 'Provider not found' });
    const resources = await pool.query(
      'SELECT * FROM resources WHERE provider_id = $1 ORDER BY name ASC',
      [provResult.rows[0].id]
    );
    return res.json({ resources: resources.rows });
  } catch (err) {
    req.log?.error({ err }, 'Get resources error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  try {
    const provResult = await getProviderId(auth.userId);
    if (!provResult.rows.length) return res.status(404).json({ error: 'Provider not found' });
    const { name, type, description, capacity, color } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    const result = await pool.query(
      'INSERT INTO resources (provider_id, name, type, description, capacity, color) VALUES ($1, $2, $3, $4, $5, $6)',
      [provResult.rows[0].id, name, type, description || null, capacity || 1, color || '#0d9488']
    );
    const insertId = (result.result as any).insertId;
    const selectResult = await pool.query('SELECT * FROM resources WHERE id=$1', [insertId]);
    return res.status(201).json({ resource: selectResult.rows[0] });
  } catch (err) {
    req.log?.error({ err }, 'Create resource error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  const resourceId = parseIntParam(req.params.id);
  if (!resourceId) return res.status(400).json({ error: 'Invalid resource id' });
  try {
    const provResult = await getProviderId(auth.userId);
    if (!provResult.rows.length) return res.status(404).json({ error: 'Provider not found' });
    const { name, type, description, capacity, color, is_active } = req.body;
    if (type && !VALID_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    await pool.query(
      `UPDATE resources SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        description = COALESCE($3, description),
        capacity = COALESCE($4, capacity),
        color = COALESCE($5, color),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
       WHERE id = $7 AND provider_id = $8`,
      [name || null, type || null, description ?? null, capacity || null, color || null, is_active ?? null, resourceId, provResult.rows[0].id]
    );
    const result = await pool.query('SELECT * FROM resources WHERE id=$1 AND provider_id=$2', [resourceId, provResult.rows[0].id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Resource not found' });
    return res.json({ resource: result.rows[0] });
  } catch (err) {
    req.log?.error({ err }, 'Update resource error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  const resourceId = parseIntParam(req.params.id);
  if (!resourceId) return res.status(400).json({ error: 'Invalid resource id' });
  try {
    const provResult = await getProviderId(auth.userId);
    if (!provResult.rows.length) return res.status(404).json({ error: 'Provider not found' });
    await pool.query(
      'UPDATE resources SET is_active = false, updated_at = NOW() WHERE id = $1 AND provider_id = $2',
      [resourceId, provResult.rows[0].id]
    );
    return res.json({ message: 'Resource deactivated' });
  } catch (err) {
    req.log?.error({ err }, 'Delete resource error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate slots for a specific resource for the next N days
router.post('/:id/generate-slots', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  const resourceId = parseIntParam(req.params.id);
  if (!resourceId) return res.status(400).json({ error: 'Invalid resource id' });
  try {
    const provResult = await getProviderId(auth.userId);
    if (!provResult.rows.length) return res.status(404).json({ error: 'Provider not found' });
    const providerId: number = provResult.rows[0].id;

    const resourceResult = await pool.query(
      'SELECT * FROM resources WHERE id = $1 AND provider_id = $2 AND is_active = true',
      [resourceId, providerId]
    );
    if (!resourceResult.rows.length) return res.status(404).json({ error: 'Resource not found' });

    const { days = 14, start_time, end_time, slot_duration = 60 } = req.body;
    const schedulesResult = await pool.query(
      'SELECT * FROM schedules WHERE provider_id = $1 AND is_active = true',
      [providerId]
    );

    const scheduleMap: Record<number, { start_time: string; end_time: string; slot_duration: number }> = {};
    for (const sc of schedulesResult.rows) {
      scheduleMap[sc.day_of_week] = {
        start_time: start_time || sc.start_time,
        end_time: end_time || sc.end_time,
        slot_duration: slot_duration || sc.slot_duration,
      };
    }

    const today = new Date();
    const dates: string[] = [];
    const startTimes: string[] = [];
    const endTimes: string[] = [];

    for (let d = 0; d < Math.min(Number(days) || 14, 60); d++) {
      const dt = new Date(today);
      dt.setDate(today.getDate() + d);
      const dateStr = dt.toISOString().split('T')[0];
      const dow = dt.getDay();
      const sched = scheduleMap[dow];
      if (!sched) continue;

      const [sh, sm] = sched.start_time.split(':').map(Number);
      const [eh, em] = sched.end_time.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      const dur = Number(sched.slot_duration) || 60;

      for (let t = startMin; t + dur <= endMin; t += dur) {
        const s = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
        const e = `${String(Math.floor((t + dur) / 60)).padStart(2, '0')}:${String((t + dur) % 60).padStart(2, '0')}`;
        dates.push(dateStr);
        startTimes.push(s);
        endTimes.push(e);
      }
    }

    if (dates.length > 0) {
      const placeholders = dates.map(() => '(?, ?, ?, ?, "available", ?)').join(', ');
      const flatValues: any[] = [];
      for (let i = 0; i < dates.length; i++) {
        flatValues.push(providerId, dates[i], startTimes[i], endTimes[i], resourceId);
      }
      await pool.query(
        `INSERT IGNORE INTO slots (provider_id, date, start_time, end_time, status, resource_id) VALUES ${placeholders}`,
        flatValues
      );
    }

    return res.json({ message: `Generated ${dates.length} slots`, count: dates.length });
  } catch (err) {
    req.log?.error({ err }, 'Generate slots error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate slots for ALL resources of this provider
router.post('/generate-all-slots', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  try {
    const provResult = await getProviderId(auth.userId);
    if (!provResult.rows.length) return res.status(404).json({ error: 'Provider not found' });
    const providerId: number = provResult.rows[0].id;

    const resourcesResult = await pool.query(
      'SELECT * FROM resources WHERE provider_id = $1 AND is_active = true',
      [providerId]
    );
    const schedulesResult = await pool.query(
      'SELECT * FROM schedules WHERE provider_id = $1 AND is_active = true',
      [providerId]
    );

    const scheduleMap: Record<number, { start_time: string; end_time: string; slot_duration: number }> = {};
    for (const sc of schedulesResult.rows) scheduleMap[sc.day_of_week] = sc;

    const { days = 14 } = req.body;
    const today = new Date();
    let totalInserted = 0;

    for (const resource of resourcesResult.rows) {
      const dates: string[] = [];
      const startTimes: string[] = [];
      const endTimes: string[] = [];

      for (let d = 0; d < Math.min(Number(days) || 14, 60); d++) {
        const dt = new Date(today);
        dt.setDate(today.getDate() + d);
        const dateStr = dt.toISOString().split('T')[0];
        const dow = dt.getDay();
        const sched = scheduleMap[dow];
        if (!sched) continue;

        const [sh, sm] = sched.start_time.split(':').map(Number);
        const [eh, em] = sched.end_time.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        const dur = Number(sched.slot_duration) || 60;

        for (let t = startMin; t + dur <= endMin; t += dur) {
          const s = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
          const e = `${String(Math.floor((t + dur) / 60)).padStart(2, '0')}:${String((t + dur) % 60).padStart(2, '0')}`;
          dates.push(dateStr);
          startTimes.push(s);
          endTimes.push(e);
        }
      }

      if (dates.length > 0) {
        const placeholders = dates.map(() => '(?, ?, ?, ?, "available", ?)').join(', ');
        const flatValues: any[] = [];
        for (let i = 0; i < dates.length; i++) {
          flatValues.push(providerId, dates[i], startTimes[i], endTimes[i], resource.id);
        }
        await pool.query(
          `INSERT IGNORE INTO slots (provider_id, date, start_time, end_time, status, resource_id) VALUES ${placeholders}`,
          flatValues
        );
        totalInserted += dates.length;
      }
    }

    return res.json({
      message: `Generated ${totalInserted} slots across ${resourcesResult.rows.length} resources`,
      count: totalInserted,
    });
  } catch (err) {
    req.log?.error({ err }, 'Generate all slots error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
