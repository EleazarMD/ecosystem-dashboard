/**
 * A/B Testing Variants API
 * 
 * CRUD operations for experiment variants
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if user is platform admin
  const userResult = await pool.query(
    'SELECT role FROM users WHERE id = $1',
    [session.user.id]
  );

  if (!userResult.rows[0] || userResult.rows[0].role !== 'platform_admin') {
    return res.status(403).json({ error: 'Forbidden - Platform admin only' });
  }

  switch (req.method) {
    case 'GET':
      return getVariants(req, res);
    case 'POST':
      return createVariant(req, res);
    case 'PUT':
      return updateVariant(req, res);
    case 'DELETE':
      return deleteVariant(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getVariants(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { experiment_id } = req.query;

    if (!experiment_id) {
      return res.status(400).json({ error: 'experiment_id is required' });
    }

    const result = await pool.query(`
      SELECT 
        v.*,
        COUNT(DISTINCT ua.user_id) as enrolled_users,
        COUNT(DISTINCT e.id) as event_count
      FROM ab_testing.variants v
      LEFT JOIN ab_testing.user_assignments ua ON ua.variant_id = v.id
      LEFT JOIN ab_testing.events e ON e.variant_id = v.id
      WHERE v.experiment_id = $1
      GROUP BY v.id
      ORDER BY v.is_control DESC, v.name
    `, [experiment_id]);

    return res.status(200).json({ variants: result.rows });

  } catch (error) {
    console.error('[A/B Testing] Error fetching variants:', error);
    return res.status(500).json({ error: 'Failed to fetch variants' });
  }
}

async function createVariant(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { experiment_id, name, description, is_control, weight, config } = req.body;

    if (!experiment_id || !name) {
      return res.status(400).json({ error: 'experiment_id and name are required' });
    }

    // Check experiment exists and is not running
    const expCheck = await pool.query(
      'SELECT status FROM ab_testing.experiments WHERE id = $1',
      [experiment_id]
    );

    if (expCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    if (expCheck.rows[0].status === 'running') {
      return res.status(400).json({ error: 'Cannot add variants to a running experiment' });
    }

    const result = await pool.query(`
      INSERT INTO ab_testing.variants (experiment_id, name, description, is_control, weight, config)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      experiment_id,
      name,
      description || null,
      is_control || false,
      weight || 50,
      JSON.stringify(config || {})
    ]);

    return res.status(201).json({ variant: result.rows[0] });

  } catch (error) {
    console.error('[A/B Testing] Error creating variant:', error);
    return res.status(500).json({ error: 'Failed to create variant' });
  }
}

async function updateVariant(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id, name, description, weight, config } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Variant ID is required' });
    }

    // Check if parent experiment is running
    const expCheck = await pool.query(`
      SELECT e.status FROM ab_testing.variants v
      JOIN ab_testing.experiments e ON e.id = v.experiment_id
      WHERE v.id = $1
    `, [id]);

    if (expCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    // Allow config updates even when running (for live tuning)
    const setClauses: string[] = [];
    const params: any[] = [id];

    if (name !== undefined) {
      params.push(name);
      setClauses.push(`name = $${params.length}`);
    }
    if (description !== undefined) {
      params.push(description);
      setClauses.push(`description = $${params.length}`);
    }
    if (weight !== undefined) {
      params.push(weight);
      setClauses.push(`weight = $${params.length}`);
    }
    if (config !== undefined) {
      params.push(JSON.stringify(config));
      setClauses.push(`config = $${params.length}`);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await pool.query(`
      UPDATE ab_testing.variants 
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `, params);

    return res.status(200).json({ variant: result.rows[0] });

  } catch (error) {
    console.error('[A/B Testing] Error updating variant:', error);
    return res.status(500).json({ error: 'Failed to update variant' });
  }
}

async function deleteVariant(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Variant ID is required' });
    }

    // Check if parent experiment is running
    const expCheck = await pool.query(`
      SELECT e.status, v.is_control FROM ab_testing.variants v
      JOIN ab_testing.experiments e ON e.id = v.experiment_id
      WHERE v.id = $1
    `, [id]);

    if (expCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    if (expCheck.rows[0].status === 'running') {
      return res.status(400).json({ error: 'Cannot delete variant from a running experiment' });
    }

    if (expCheck.rows[0].is_control) {
      return res.status(400).json({ error: 'Cannot delete the control variant' });
    }

    await pool.query('DELETE FROM ab_testing.variants WHERE id = $1', [id]);

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[A/B Testing] Error deleting variant:', error);
    return res.status(500).json({ error: 'Failed to delete variant' });
  }
}
