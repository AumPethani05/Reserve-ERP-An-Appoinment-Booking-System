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
    const services = await pool.query('SELECT * FROM services WHERE provider_id = $1 ORDER BY created_at DESC', [provResult.rows[0].id]);
    return res.json({ services: services.rows });
  } catch (err) {
    req.log?.error({ err }, 'Get services error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  try {
    const provResult = await pool.query('SELECT id FROM providers WHERE user_id = $1', [auth.userId]);
    if (!provResult.rows.length) return res.status(404).json({ error: 'Provider not found' });
    const { name, duration_minutes, price, description } = req.body;
    if (!name || !duration_minutes || price === undefined) return res.status(400).json({ error: 'name, duration_minutes, price required' });
    const result = await pool.query(
      'INSERT INTO services (provider_id, name, duration_minutes, price, description) VALUES ($1, $2, $3, $4, $5)',
      [provResult.rows[0].id, name, duration_minutes, price, description || null]
    );
    const insertId = (result.result as any).insertId;
    const serviceSelect = await pool.query('SELECT * FROM services WHERE id = $1', [insertId]);
    return res.status(201).json({ service: serviceSelect.rows[0] });
  } catch (err) {
    req.log?.error({ err }, 'Create service error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  try {
    const provResult = await pool.query('SELECT id FROM providers WHERE user_id = $1', [auth.userId]);
    if (!provResult.rows.length) return res.status(404).json({ error: 'Provider not found' });
    const { name, duration_minutes, price, description } = req.body;
    await pool.query(
      'UPDATE services SET name=$1, duration_minutes=$2, price=$3, description=$4, updated_at=NOW() WHERE id=$5 AND provider_id=$6',
      [name, duration_minutes, price, description || null, req.params.id, provResult.rows[0].id]
    );
    const result = await pool.query('SELECT * FROM services WHERE id=$1 AND provider_id=$2', [req.params.id, provResult.rows[0].id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Service not found' });
    return res.json({ service: result.rows[0] });
  } catch (err) {
    req.log?.error({ err }, 'Update service error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  try {
    const provResult = await pool.query('SELECT id FROM providers WHERE user_id = $1', [auth.userId]);
    if (!provResult.rows.length) return res.status(404).json({ error: 'Provider not found' });
    await pool.query('UPDATE services SET is_active=false, updated_at=NOW() WHERE id=$1 AND provider_id=$2', [req.params.id, provResult.rows[0].id]);
    return res.json({ message: 'Service deactivated' });
  } catch (err) {
    req.log?.error({ err }, 'Delete service error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
