/**
 * A/B Testing Experiments API
 * 
 * CRUD operations for A/B test experiments
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
      return getExperiments(req, res);
    case 'POST':
      return createExperiment(req, res, session.user.id);
    case 'PUT':
      return updateExperiment(req, res);
    case 'DELETE':
      return deleteExperiment(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getExperiments(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, type, id } = req.query;

    // Get single experiment with variants
    if (id) {
      const experimentResult = await pool.query(`
        SELECT * FROM ab_testing.experiments WHERE id = $1
      `, [id]);

      if (experimentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Experiment not found' });
      }

      const variantsResult = await pool.query(`
        SELECT * FROM ab_testing.variants WHERE experiment_id = $1 ORDER BY is_control DESC, name
      `, [id]);

      const statsResult = await pool.query(`
        SELECT 
          COUNT(DISTINCT ua.user_id) as enrolled_users,
          COUNT(DISTINCT e.id) as total_events,
          COUNT(DISTINCT e.session_id) as total_sessions
        FROM ab_testing.user_assignments ua
        LEFT JOIN ab_testing.events e ON e.experiment_id = ua.experiment_id AND e.user_id = ua.user_id
        WHERE ua.experiment_id = $1
      `, [id]);

      return res.status(200).json({
        experiment: experimentResult.rows[0],
        variants: variantsResult.rows,
        stats: statsResult.rows[0],
      });
    }

    // Get all experiments with filters
    let query = `
      SELECT 
        e.*,
        COUNT(DISTINCT v.id) as variant_count,
        COUNT(DISTINCT ua.user_id) as enrolled_users
      FROM ab_testing.experiments e
      LEFT JOIN ab_testing.variants v ON v.experiment_id = e.id
      LEFT JOIN ab_testing.user_assignments ua ON ua.experiment_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND e.status = $${params.length}`;
    }

    if (type) {
      params.push(type);
      query += ` AND e.experiment_type = $${params.length}`;
    }

    query += ` GROUP BY e.id ORDER BY e.created_at DESC`;

    const result = await pool.query(query, params);

    return res.status(200).json({ experiments: result.rows });

  } catch (error) {
    console.error('[A/B Testing] Error fetching experiments:', error);
    return res.status(500).json({ error: 'Failed to fetch experiments' });
  }
}

async function createExperiment(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const {
      name,
      description,
      experiment_type,
      target_audience = 'child',
      target_themes = [],
      target_age_min,
      target_age_max,
      target_user_ids = [],
      traffic_percentage = 100,
      primary_metric,
      secondary_metrics = [],
      variants = [],
    } = req.body;

    if (!name || !experiment_type) {
      return res.status(400).json({ error: 'Name and experiment_type are required' });
    }

    // Create experiment
    const experimentResult = await pool.query(`
      INSERT INTO ab_testing.experiments (
        name, description, experiment_type, target_audience,
        target_themes, target_age_min, target_age_max, target_user_ids,
        traffic_percentage, primary_metric, secondary_metrics, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      name, description, experiment_type, target_audience,
      JSON.stringify(target_themes), target_age_min, target_age_max, JSON.stringify(target_user_ids),
      traffic_percentage, primary_metric, JSON.stringify(secondary_metrics), userId
    ]);

    const experiment = experimentResult.rows[0];

    // Create variants if provided
    if (variants.length > 0) {
      for (const variant of variants) {
        await pool.query(`
          INSERT INTO ab_testing.variants (experiment_id, name, description, is_control, weight, config)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          experiment.id,
          variant.name,
          variant.description,
          variant.is_control || false,
          variant.weight || 50,
          JSON.stringify(variant.config || {})
        ]);
      }
    } else {
      // Create default control and variant
      await pool.query(`
        INSERT INTO ab_testing.variants (experiment_id, name, description, is_control, weight, config)
        VALUES 
          ($1, 'Control', 'Current behavior', true, 50, '{}'),
          ($1, 'Variant A', 'Test variant', false, 50, '{}')
      `, [experiment.id]);
    }

    // Fetch created variants
    const variantsResult = await pool.query(`
      SELECT * FROM ab_testing.variants WHERE experiment_id = $1 ORDER BY is_control DESC
    `, [experiment.id]);

    return res.status(201).json({
      experiment,
      variants: variantsResult.rows,
    });

  } catch (error) {
    console.error('[A/B Testing] Error creating experiment:', error);
    return res.status(500).json({ error: 'Failed to create experiment' });
  }
}

async function updateExperiment(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id, ...updates } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Experiment ID is required' });
    }

    // Build dynamic update query
    const allowedFields = [
      'name', 'description', 'status', 'target_themes', 'target_age_min',
      'target_age_max', 'target_user_ids', 'traffic_percentage',
      'primary_metric', 'secondary_metrics', 'start_date', 'end_date'
    ];

    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [id];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        params.push(
          typeof updates[field] === 'object' 
            ? JSON.stringify(updates[field]) 
            : updates[field]
        );
        setClauses.push(`${field} = $${params.length}`);
      }
    }

    const result = await pool.query(`
      UPDATE ab_testing.experiments 
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    return res.status(200).json({ experiment: result.rows[0] });

  } catch (error) {
    console.error('[A/B Testing] Error updating experiment:', error);
    return res.status(500).json({ error: 'Failed to update experiment' });
  }
}

async function deleteExperiment(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Experiment ID is required' });
    }

    // Check if experiment exists and is not running
    const checkResult = await pool.query(
      'SELECT status FROM ab_testing.experiments WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    if (checkResult.rows[0].status === 'running') {
      return res.status(400).json({ error: 'Cannot delete a running experiment. Pause or complete it first.' });
    }

    // Delete experiment (cascades to variants, assignments, events)
    await pool.query('DELETE FROM ab_testing.experiments WHERE id = $1', [id]);

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[A/B Testing] Error deleting experiment:', error);
    return res.status(500).json({ error: 'Failed to delete experiment' });
  }
}
