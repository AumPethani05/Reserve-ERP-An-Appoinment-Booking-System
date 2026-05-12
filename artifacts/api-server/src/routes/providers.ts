import { Router, Request, Response } from 'express';
import { pool } from '@workspace/db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || '';
    const category = (req.query.category as string) || '';
    const city = (req.query.city as string) || '';
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '12');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.business_name IS NOT NULL AND p.is_approved = true';
    const params: unknown[] = [];
    let paramIdx = 1;

    if (search) {
      whereClause += ` AND (p.business_name LIKE $${paramIdx} OR p.specialty LIKE $${paramIdx} OR p.city LIKE $${paramIdx} OR p.description LIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (category) {
      whereClause += ` AND p.category = $${paramIdx}`;
      params.push(category);
      paramIdx++;
    }
    if (city) {
      whereClause += ` AND p.city LIKE $${paramIdx}`;
      params.push(`%${city}%`);
      paramIdx++;
    }

    const countResult = await pool.query(`SELECT COUNT(*) as count FROM providers p ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT p.*, u.full_name as user_full_name, u.avatar_url as user_avatar_url
       FROM providers p
       JOIN users u ON u.id = p.user_id
       ${whereClause}
       ORDER BY p.rating DESC, p.total_reviews DESC
       LIMIT ? OFFSET ?`,
      params
    );

    const providerIds = result.rows.map((r: Record<string, unknown>) => r.id);
    let services: Record<string, unknown>[] = [];
    let resources: Record<string, unknown>[] = [];
    if (providerIds.length > 0) {
      const [servicesResult, resourcesResult] = await Promise.all([
        pool.query(`SELECT * FROM services WHERE provider_id IN (${providerIds.map(() => '?').join(',')}) AND is_active = true`, providerIds),
        pool.query(`SELECT * FROM resources WHERE provider_id IN (${providerIds.map(() => '?').join(',')}) AND is_active = true ORDER BY name`, providerIds),
      ]);
      services = servicesResult.rows;
      resources = resourcesResult.rows;
    }

    const providers = result.rows.map((p: Record<string, unknown>) => ({
      ...p,
      user: { full_name: p.user_full_name, avatar_url: p.user_avatar_url },
      services: services.filter((s: Record<string, unknown>) => s.provider_id === p.id),
      resources: resources.filter((r: Record<string, unknown>) => r.provider_id === p.id),
    }));

    return res.json({ providers, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    req.log?.error({ err }, 'List providers error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, u.full_name as user_full_name, u.email as user_email, u.phone as user_phone, u.avatar_url as user_avatar_url
       FROM providers p JOIN users u ON u.id = p.user_id WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    const p = result.rows[0];

    const [servicesResult, resourcesResult, schedulesResult] = await Promise.all([
      pool.query('SELECT * FROM services WHERE provider_id = $1 AND is_active = true ORDER BY price', [id]),
      pool.query('SELECT * FROM resources WHERE provider_id = $1 AND is_active = true ORDER BY name', [id]),
      pool.query('SELECT * FROM schedules WHERE provider_id = $1 AND is_active = true ORDER BY day_of_week', [id]),
    ]);

    const provider = {
      ...p,
      user: { full_name: p.user_full_name, email: p.user_email, phone: p.user_phone, avatar_url: p.user_avatar_url },
      services: servicesResult.rows,
      resources: resourcesResult.rows,
      schedules: schedulesResult.rows,
    };
    return res.json({ provider });
  } catch (err) {
    req.log?.error({ err }, 'Get provider error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/slots', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const date = req.query.date as string;
    const resourceId = req.query.resource_id as string;
    console.log(`Fetching slots for provider ${id} on date ${date} with resource ${resourceId}`);
    if (!date) return res.status(400).json({ error: 'Date parameter is required' });

    let query = `SELECT sl.*, r.name as resource_name, r.color as resource_color, r.type as resource_type
                 FROM slots sl LEFT JOIN resources r ON r.id = sl.resource_id
                 WHERE sl.provider_id = $1 AND sl.date = $2 AND sl.status = 'available'
                 AND (r.id IS NULL OR r.is_active = true)`;
    const params: unknown[] = [id, date];

    if (resourceId) {
      query += ` AND sl.resource_id = $3`;
      params.push(resourceId);
    }
    query += ' ORDER BY sl.start_time, sl.resource_id';

    const result = await pool.query(query, params);
    return res.json({ slots: result.rows });
  } catch (err) {
    req.log?.error({ err }, 'Get slots error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
