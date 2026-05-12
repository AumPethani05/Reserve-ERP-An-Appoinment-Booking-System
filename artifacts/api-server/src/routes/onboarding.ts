import { Router, Request, Response } from 'express';
import { pool } from '@workspace/db';
import { requireRole } from '../lib/auth.js';

const router = Router();

const ALLOWED_PROVIDER_COLUMNS = new Set([
  'business_name', 'specialty', 'description', 'address', 'city',
  'state', 'zip_code', 'category', 'phone', 'email', 'website',
  'consultation_fee', 'rating', 'total_reviews',
]);

router.post('/', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  try {
    const { business_name, specialty, description, address, city, state, zip_code, category } = req.body;
    if (!business_name || !specialty) return res.status(400).json({ error: 'business_name and specialty required' });

    const existing = await pool.query('SELECT id FROM providers WHERE user_id = $1', [auth.userId]);
    let provider;
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE providers SET business_name=$1, specialty=$2, description=$3, address=$4, city=$5, state=$6, zip_code=$7, category=$8, updated_at=NOW()
         WHERE user_id=$9`,
        [business_name, specialty, description || null, address || null, city || null, state || null, zip_code || null, category || 'other', auth.userId]
      );
      const result = await pool.query('SELECT * FROM providers WHERE user_id=$1', [auth.userId]);
      provider = result.rows[0];
    } else {
      await pool.query(
        `INSERT INTO providers (user_id, business_name, specialty, description, address, city, state, zip_code, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [auth.userId, business_name, specialty, description || null, address || null, city || null, state || null, zip_code || null, category || 'other']
      );
      const result = await pool.query('SELECT * FROM providers WHERE user_id=$1', [auth.userId]);
      provider = result.rows[0];
    }
    return res.json({ provider });
  } catch (err) {
    req.log?.error({ err }, 'Onboarding error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  const auth = requireRole(req, res, 'provider');
  if (!auth) return;
  try {
    const { complete_onboarding, ...rest } = req.body;
    const existing = await pool.query('SELECT id FROM providers WHERE user_id = $1', [auth.userId]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Provider not found' });

    if (complete_onboarding) {
      await pool.query('UPDATE providers SET is_onboarded=true, updated_at=NOW() WHERE user_id=$1', [auth.userId]);
    } else {
      const fields = Object.entries(rest).filter(([k, v]) => ALLOWED_PROVIDER_COLUMNS.has(k) && v !== undefined);
      if (fields.length > 0) {
        const setClause = fields.map(([k], i) => `\`${k}\`=$${i + 1}`).join(', ');
        const values = fields.map(([, v]) => v);
        await pool.query(
          `UPDATE providers SET ${setClause}, updated_at=NOW() WHERE user_id=$${fields.length + 1}`,
          [...values, auth.userId]
        );
      }
    }
    const result = await pool.query('SELECT * FROM providers WHERE user_id=$1', [auth.userId]);
    return res.json({ message: 'Updated', provider: result.rows[0] });
  } catch (err) {
    req.log?.error({ err }, 'Update onboarding error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
