import { Router, Request, Response } from 'express';
import { pool } from '@workspace/db';
import { requireRole } from '../lib/auth.js';

const router = Router();

router.get('/stats', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'admin');
  if (!auth) return;
  try {
    const [totalUsers, patients, providers, approved, pending, totalAppts, revenue, recentSignups] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'patient'"),
      pool.query("SELECT COUNT(*) as count FROM providers"),
      pool.query("SELECT COUNT(*) as count FROM providers WHERE is_approved = true"),
      pool.query("SELECT COUNT(*) as count FROM providers WHERE is_approved = false"),
      pool.query('SELECT COUNT(*) as count FROM appointments'),
      pool.query("SELECT COALESCE(SUM(total),0) as revenue FROM invoices WHERE status = 'paid'"),
      pool.query("SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10"),
    ]);
    return res.json({
      stats: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalPatients: parseInt(patients.rows[0].count),
        totalProviders: parseInt(providers.rows[0].count),
        approvedProviders: parseInt(approved.rows[0].count),
        pendingProviders: parseInt(pending.rows[0].count),
        totalAppointments: parseInt(totalAppts.rows[0].count),
        totalRevenue: Number(revenue.rows[0].revenue),
      },
      recentSignups: recentSignups.rows,
    });
  } catch (err) {
    req.log?.error({ err }, 'Admin stats error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/providers', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'admin');
  if (!auth) return;
  try {
    const result = await pool.query(
      `SELECT p.*, u.full_name, u.email, u.phone, u.created_at as user_created_at
       FROM providers p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC`
    );
    const providers = result.rows.map((r: Record<string, unknown>) => ({
      ...r, user: { full_name: r.full_name, email: r.email, phone: r.phone, created_at: r.user_created_at },
    }));
    return res.json({ providers });
  } catch (err) {
    req.log?.error({ err }, 'Admin providers error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/providers', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'admin');
  if (!auth) return;
  try {
    const { provider_id, is_approved } = req.body;
    if (provider_id == null || typeof is_approved !== 'boolean') return res.status(400).json({ error: 'Invalid request body' });
    await pool.query('UPDATE providers SET is_approved=$1, updated_at=NOW() WHERE id=$2', [is_approved, provider_id]);
    const result = await pool.query('SELECT * FROM providers WHERE id=$1', [provider_id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Provider not found' });
    return res.json({ message: `Provider ${is_approved ? 'approved' : 'rejected'}`, provider: result.rows[0] });
  } catch (err) {
    req.log?.error({ err }, 'Admin update provider error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
