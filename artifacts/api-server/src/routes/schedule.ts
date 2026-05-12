import { Router, Request, Response } from 'express';
import { pool } from '@workspace/db';
import { requireRole } from '../lib/auth.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  try {
    const provResult = await pool.query('SELECT id FROM providers WHERE user_id = $1', [auth.userId]);
    if (!provResult.rows.length) return res.status(404).json({ error: 'Provider not found' });
    const schedules = await pool.query('SELECT * FROM schedules WHERE provider_id = $1 ORDER BY day_of_week', [provResult.rows[0].id]);
    return res.json({ schedules: schedules.rows });
  } catch (err) {
    req.log?.error({ err }, 'Get schedule error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  try {
    const provResult = await pool.query('SELECT id FROM providers WHERE user_id = $1', [auth.userId]);
    if (!provResult.rows.length) return res.status(404).json({ error: 'Provider not found' });
    const { day_of_week, start_time, end_time, slot_duration, is_active } = req.body;
    const providerId = provResult.rows[0].id;
    const active = is_active !== false; // Default to true if not provided

    const existing = await pool.query('SELECT id FROM schedules WHERE provider_id = $1 AND day_of_week = $2', [providerId, day_of_week]);
    let schedule;
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE schedules SET start_time=$1, end_time=$2, slot_duration=$3, is_active=$4, updated_at=NOW() WHERE id=$5',
        [start_time, end_time, slot_duration || 30, active, existing.rows[0].id]
      );
      const result = await pool.query('SELECT * FROM schedules WHERE id=$1', [existing.rows[0].id]);
      schedule = result.rows[0];
    } else {
      const result = await pool.query(
        'INSERT INTO schedules (provider_id, day_of_week, start_time, end_time, slot_duration, is_active) VALUES ($1, $2, $3, $4, $5, $6)',
        [providerId, day_of_week, start_time, end_time, slot_duration || 30, active]
      );
      const insertId = (result.result as any).insertId;
      const selectResult = await pool.query('SELECT * FROM schedules WHERE id=$1', [insertId]);
      schedule = selectResult.rows[0];
    }

    if (!active) {
      // Cleanup future available slots if deactivated
      const mysqlWeekday = (Number(day_of_week) + 6) % 7;
      await pool.query(
        "DELETE FROM slots WHERE provider_id = $1 AND status = 'available' AND WEEKDAY(date) = $2 AND date >= CURDATE()",
        [providerId, mysqlWeekday]
      );
      return res.json({ schedule, slots_generated: false });
    }

    // Auto-generate slots for all active resources based on the new/updated schedule
    const resourcesResult = await pool.query(
      'SELECT id FROM resources WHERE provider_id = $1 AND is_active = true',
      [providerId]
    );

    if (resourcesResult.rows.length > 0) {
      const today = new Date();
      const DAYS = 30;
      const dur = Number(slot_duration) || 30;
      const [sh, sm] = (start_time as string).split(':').map(Number);
      const [eh, em] = (end_time as string).split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      for (const resource of resourcesResult.rows) {
        const dates: string[] = [];
        const startTimes: string[] = [];
        const endTimes: string[] = [];

        for (let d = 0; d < DAYS; d++) {
          const dt = new Date(today);
          dt.setDate(today.getDate() + d);
          if (dt.getDay() !== Number(day_of_week)) continue;
          const dateStr = dt.toISOString().split('T')[0];
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
        }
      }
    }

    return res.status(201).json({ schedule, slots_generated: resourcesResult.rows.length > 0 });
  } catch (err) {
    req.log?.error({ err }, 'Create schedule error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:day', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  try {
    const provResult = await pool.query('SELECT id FROM providers WHERE user_id = $1', [auth.userId]);
    if (!provResult.rows.length) return res.status(404).json({ error: 'Provider not found' });
    const providerId = provResult.rows[0].id;
    const day = parseInt(req.params.day as string);

    await pool.query('DELETE FROM schedules WHERE provider_id = $1 AND day_of_week = $2', [providerId, day]);

    // Cleanup future available slots for this day
    // MySQL WEEKDAY(): 0=Mon, 6=Sun. Our day_of_week: 0=Sun, 1=Mon...
    const mysqlWeekday = (day + 6) % 7;
    await pool.query(
      "DELETE FROM slots WHERE provider_id = $1 AND status = 'available' AND WEEKDAY(date) = $2 AND date >= CURDATE()",
      [providerId, mysqlWeekday]
    );

    return res.json({ message: 'Schedule deactivated' });
  } catch (err) {
    req.log?.error({ err }, 'Delete schedule error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
