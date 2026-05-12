import { Router, Request, Response } from 'express';
import { pool } from '@workspace/db';
import { requireRole } from '../lib/auth.js';

const router = Router();

router.get('/stats', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;

  try {
    const provResult = await pool.query('SELECT * FROM providers WHERE user_id = $1', [auth.userId]);
    if (provResult.rows.length === 0) return res.status(404).json({ error: 'Provider profile not found' });
    const provider = provResult.rows[0];

    const today = new Date().toISOString().split('T')[0];

    const [totalAppts, upcomingCount, completedCount, revenueResult, todayTotal, todayBooked, todayAppts] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM appointments WHERE provider_id = $1', [provider.id]),
      pool.query("SELECT COUNT(*) as count FROM appointments WHERE provider_id = $1 AND status = 'upcoming'", [provider.id]),
      pool.query("SELECT COUNT(*) as count FROM appointments WHERE provider_id = $1 AND status = 'completed'", [provider.id]),
      pool.query("SELECT COALESCE(SUM(total), 0) as revenue FROM invoices WHERE provider_id = $1 AND status = 'paid'", [provider.id]),
      pool.query(
        'SELECT COUNT(*) as count FROM slots sl LEFT JOIN resources r ON r.id = sl.resource_id WHERE sl.provider_id = $1 AND sl.date = $2 AND (r.id IS NULL OR r.is_active = true OR sl.status = "booked")',
        [provider.id, today]
      ),
      pool.query(
        "SELECT COUNT(*) as count FROM slots WHERE provider_id = $1 AND date = $2 AND status = 'booked'",
        [provider.id, today]
      ),
      pool.query(
        `SELECT a.*, u.full_name as patient_full_name, u.email as patient_email,
           sl.date as slot_date, sl.start_time, sl.end_time,
           i.total as invoice_total, i.status as invoice_status
         FROM appointments a
         JOIN users u ON u.id = a.patient_id
         JOIN slots sl ON sl.id = a.slot_id
         LEFT JOIN invoices i ON i.appointment_id = a.id
         WHERE a.provider_id = $1 AND a.status = 'upcoming' AND sl.date = $2
         ORDER BY sl.start_time`,
        [provider.id, today]
      ),
    ]);

    const todaySlotsTotal = parseInt(todayTotal.rows[0].count);
    const todaySlotsBooked = parseInt(todayBooked.rows[0].count);

    return res.json({
      stats: {
        totalAppointments: parseInt(totalAppts.rows[0].count),
        upcomingCount: parseInt(upcomingCount.rows[0].count),
        completedCount: parseInt(completedCount.rows[0].count),
        revenue: Number(revenueResult.rows[0].revenue),
        todaySlotsTotal,
        todaySlotsBooked,
        occupancyRate: todaySlotsTotal > 0 ? Math.round((todaySlotsBooked / todaySlotsTotal) * 100) : 0,
      },
      todayAppointments: todayAppts.rows.map((r: Record<string, unknown>) => ({
        id: r.id, status: r.status,
        patient: { full_name: r.patient_full_name, email: r.patient_email },
        slot: { date: r.slot_date, start_time: r.start_time, end_time: r.end_time },
        invoice: r.invoice_total ? { total: r.invoice_total, status: r.invoice_status } : null,
      })),
    });
  } catch (err) {
    req.log?.error({ err }, 'Dashboard stats error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/appointments', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;

  try {
    const provResult = await pool.query('SELECT * FROM providers WHERE user_id = $1', [auth.userId]);
    if (provResult.rows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    const provider = provResult.rows[0];

    const status = req.query.status as string;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '10');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE a.provider_id = $1';
    const params: unknown[] = [provider.id];
    if (status) { whereClause += ` AND a.status = $2`; params.push(status); }

    const countResult = await pool.query(`SELECT COUNT(*) as count FROM appointments a ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);
    params.push(limit, offset);

    const result = await pool.query(
      `SELECT a.*, 
         u.full_name as patient_full_name, u.email as patient_email, u.phone as patient_phone,
         s.name as service_name, s.price as service_price,
         sl.date as slot_date, sl.start_time as slot_start_time, sl.end_time as slot_end_time,
         i.total as invoice_total, i.status as invoice_status
       FROM appointments a
       JOIN users u ON u.id = a.patient_id
       JOIN services s ON s.id = a.service_id
       JOIN slots sl ON sl.id = a.slot_id
       LEFT JOIN invoices i ON i.appointment_id = a.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const appointments = result.rows.map((r: Record<string, unknown>) => ({
      id: r.id, status: r.status,
      patient: { full_name: r.patient_full_name, email: r.patient_email, phone: r.patient_phone },
      service: { name: r.service_name, price: r.service_price },
      slot: { date: r.slot_date, start_time: r.slot_start_time, end_time: r.slot_end_time },
      invoice: r.invoice_total ? { total: r.invoice_total, status: r.invoice_status } : null,
    }));

    return res.json({ appointments, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    req.log?.error({ err }, 'Dashboard appointments error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
