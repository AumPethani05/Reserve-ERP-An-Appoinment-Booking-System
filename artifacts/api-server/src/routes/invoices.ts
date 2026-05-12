import { Router, Request, Response } from 'express';
import { pool } from '@workspace/db';
import { requireRole, requireAuth } from '../lib/auth.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  try {
    const provResult = await pool.query('SELECT id FROM providers WHERE user_id = $1', [auth.userId]);
    if (!provResult.rows.length) return res.status(404).json({ error: 'Provider not found' });
    const result = await pool.query(
      `SELECT i.*,
         u.full_name as patient_full_name, u.email as patient_email,
         s.name as service_name,
         sl.date as slot_date, sl.start_time
       FROM invoices i
       JOIN appointments a ON a.id = i.appointment_id
       JOIN users u ON u.id = i.patient_id
       JOIN services s ON s.id = a.service_id
       JOIN slots sl ON sl.id = a.slot_id
       WHERE i.provider_id = $1
       ORDER BY i.created_at DESC`,
      [provResult.rows[0].id]
    );
    const invoices = result.rows.map((r: Record<string, unknown>) => ({
      id: r.id, amount: r.amount, tax: r.tax, total: r.total, status: r.status,
      payment_method: r.payment_method, payment_reference: r.payment_reference, paid_at: r.paid_at, created_at: r.created_at,
      appointment: {
        patient: { full_name: r.patient_full_name, email: r.patient_email },
        service: { name: r.service_name },
        slot: { date: r.slot_date, start_time: r.start_time },
      },
    }));
    return res.json({ invoices });
  } catch (err) {
    req.log?.error({ err }, 'Get invoices error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/pay', async (req: Request, res: Response) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  try {
    const { id } = req.params;
    const { payment_method } = req.body;
    const invResult = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (!invResult.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = invResult.rows[0];
    if (invoice.patient_id !== auth.userId) return res.status(403).json({ error: 'Not authorized' });
    const payment_reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await pool.query('UPDATE invoices SET status=$1, payment_method=$2, payment_reference=$3, paid_at=NOW(), updated_at=NOW() WHERE id=$4',
      ['paid', payment_method || 'card', payment_reference, id]);
    return res.json({ message: 'Payment successful', invoice: { id: invoice.id, total: invoice.total, status: 'paid', payment_reference } });
  } catch (err) {
    req.log?.error({ err }, 'Payment error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
