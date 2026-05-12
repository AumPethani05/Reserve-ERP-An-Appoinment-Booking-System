import { Router, Request, Response } from 'express';
import { pool } from '@workspace/db';
import { requireAuth } from '../lib/auth.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    const { provider_id, slot_id, service_id, resource_id, notes } = req.body;
    if (!provider_id || !slot_id || !service_id) return res.status(400).json({ error: 'provider_id, slot_id, service_id required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const slotResult = await client.query(
        `SELECT sl.* FROM slots sl 
         LEFT JOIN resources r ON r.id = sl.resource_id 
         WHERE sl.id = $1 AND (r.id IS NULL OR r.is_active = true) FOR UPDATE`,
        [slot_id]
      );
      if (slotResult.rows.length === 0 || slotResult.rows[0].status !== 'available') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Slot is no longer available' });
      }

      const serviceResult = await client.query('SELECT * FROM services WHERE id = $1', [service_id]);
      if (serviceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Service not found' });
      }
      const service = serviceResult.rows[0];

      const effectiveResourceId = resource_id || slotResult.rows[0].resource_id || null;

      await client.query(
        'UPDATE slots SET status = $1, locked_by = $2, locked_at = NOW(), updated_at = NOW() WHERE id = $3',
        ['booked', auth.userId, slot_id]
      );

      const apptResult = await client.query(
        `INSERT INTO appointments (patient_id, provider_id, slot_id, service_id, resource_id, status, notes)
         VALUES ($1, $2, $3, $4, $5, 'upcoming', $6)`,
        [auth.userId, provider_id, slot_id, service_id, effectiveResourceId, notes || null]
      );
      const apptInsertId = (apptResult.result as any).insertId;
      const apptSelect = await client.query('SELECT * FROM appointments WHERE id = $1', [apptInsertId]);
      const appointment = apptSelect.rows[0];

      const amount = Number(service.price);
      const tax = amount * 0.18;
      const total = amount + tax;
      const invoiceResult = await client.query(
        `INSERT INTO invoices (appointment_id, patient_id, provider_id, amount, tax, total, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
        [appointment.id, auth.userId, provider_id, amount, tax, total]
      );
      const invoiceInsertId = (invoiceResult.result as any).insertId;
      const invoiceSelect = await client.query('SELECT * FROM invoices WHERE id = $1', [invoiceInsertId]);
      const invoice = invoiceSelect.rows[0];

      await client.query('COMMIT');

      return res.status(201).json({
        message: 'Appointment booked successfully',
        appointment: {
          id: appointment.id,
          status: appointment.status,
          resource_id: effectiveResourceId,
          slot: slotResult.rows[0],
          invoice_id: invoice.id,
          total: invoice.total,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    req.log?.error({ err }, 'Create booking error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    const status = req.query.status as string;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '10');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE a.patient_id = $1';
    const params: unknown[] = [auth.userId];
    if (status) {
      whereClause += ` AND a.status = $2`;
      params.push(status);
    }
    params.push(limit, offset);

    const countResult = await pool.query(`SELECT COUNT(*) as count FROM appointments a ${whereClause}`, params.slice(0, status ? 2 : 1));
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT a.*,
         p.business_name as provider_business_name, p.specialty as provider_specialty, p.category as provider_category,
         u_prov.full_name as provider_full_name, u_prov.avatar_url as provider_avatar_url,
         s.name as service_name, s.price as service_price, s.duration_minutes,
         sl.date as slot_date, sl.start_time as slot_start_time, sl.end_time as slot_end_time,
         r.name as resource_name, r.type as resource_type, r.color as resource_color,
         i.id as invoice_id, i.total as invoice_total, i.status as invoice_status
       FROM appointments a
       JOIN providers p ON p.id = a.provider_id
       JOIN users u_prov ON u_prov.id = p.user_id
       JOIN services s ON s.id = a.service_id
       JOIN slots sl ON sl.id = a.slot_id
       LEFT JOIN resources r ON r.id = a.resource_id
       LEFT JOIN invoices i ON i.appointment_id = a.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

    const appointments = result.rows.map((r: Record<string, unknown>) => ({
      id: r.id, status: r.status, notes: r.notes, created_at: r.created_at,
      provider: {
        business_name: r.provider_business_name,
        specialty: r.provider_specialty,
        category: r.provider_category,
        user: { full_name: r.provider_full_name, avatar_url: r.provider_avatar_url },
      },
      service: { name: r.service_name, price: r.service_price, duration_minutes: r.duration_minutes },
      slot: { date: r.slot_date, start_time: r.slot_start_time, end_time: r.slot_end_time },
      resource: r.resource_name ? { name: r.resource_name, type: r.resource_type, color: r.resource_color } : null,
      invoice: r.invoice_id ? { id: r.invoice_id, total: r.invoice_total, status: r.invoice_status } : null,
    }));

    return res.json({ appointments, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    req.log?.error({ err }, 'Get bookings error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    const { id } = req.params;
    const { status, cancellation_reason } = req.body;

    const apptResult = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (apptResult.rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    const appointment = apptResult.rows[0];

    if (appointment.patient_id !== auth.userId && auth.role !== 'provider' && auth.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (status === 'cancelled') {
        await client.query(
          'UPDATE appointments SET status = $1, cancellation_reason = $2, updated_at = NOW() WHERE id = $3',
          ['cancelled', cancellation_reason || null, id]
        );
        await client.query(
          'UPDATE slots SET status = $1, locked_by = NULL, locked_at = NULL, updated_at = NOW() WHERE id = $2',
          ['available', appointment.slot_id]
        );
        await client.query(
          'UPDATE invoices SET status = $1, updated_at = NOW() WHERE appointment_id = $2',
          ['cancelled', id]
        );
      } else if (status === 'completed') {
        await client.query(
          'UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2',
          ['completed', id]
        );
        await client.query(
          "UPDATE invoices SET status = 'paid', updated_at = NOW() WHERE appointment_id = $1",
          [id]
        );
      } else if (status === 'confirmed') {
        await client.query(
          'UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2',
          ['confirmed', id]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return res.json({ message: `Appointment ${status}`, appointment });
  } catch (err) {
    req.log?.error({ err }, 'Update booking error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
