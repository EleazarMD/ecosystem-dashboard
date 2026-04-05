/**
 * A/B Testing Assignment API
 * 
 * Assigns users to experiment variants and retrieves their assignments
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return getUserAssignment(req, res);
    case 'POST':
      return assignUser(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get user's current variant for an experiment
async function getUserAssignment(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { experiment_id, user_id } = req.query;

    if (!experiment_id || !user_id) {
      return res.status(400).json({ error: 'experiment_id and user_id are required' });
    }

    // Check if experiment is running
    const expResult = await pool.query(`
      SELECT * FROM ab_testing.experiments 
      WHERE id = $1 AND status = 'running'
    `, [experiment_id]);

    if (expResult.rows.length === 0) {
      return res.status(404).json({ error: 'Experiment not found or not running' });
    }

    // Get existing assignment or create new one
    const result = await pool.query(`
      SELECT ua.*, v.name as variant_name, v.config as variant_config, v.is_control
      FROM ab_testing.user_assignments ua
      JOIN ab_testing.variants v ON v.id = ua.variant_id
      WHERE ua.experiment_id = $1 AND ua.user_id = $2
    `, [experiment_id, user_id]);

    if (result.rows.length > 0) {
      return res.status(200).json({ assignment: result.rows[0] });
    }

    // No assignment yet - return null (caller should use POST to assign)
    return res.status(200).json({ assignment: null });

  } catch (error) {
    console.error('[A/B Testing] Error getting assignment:', error);
    return res.status(500).json({ error: 'Failed to get assignment' });
  }
}

// Assign user to a variant (or get existing assignment)
async function assignUser(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { experiment_id, user_id, user_theme, user_age } = req.body;

    if (!experiment_id || !user_id) {
      return res.status(400).json({ error: 'experiment_id and user_id are required' });
    }

    // Check if experiment is running and user is eligible
    const expResult = await pool.query(`
      SELECT * FROM ab_testing.experiments 
      WHERE id = $1 AND status = 'running'
    `, [experiment_id]);

    if (expResult.rows.length === 0) {
      return res.status(404).json({ error: 'Experiment not found or not running' });
    }

    const experiment = expResult.rows[0];

    // Check targeting criteria
    const targetThemes = experiment.target_themes || [];
    const targetUserIds = experiment.target_user_ids || [];

    // Theme check
    if (targetThemes.length > 0 && user_theme && !targetThemes.includes(user_theme)) {
      return res.status(200).json({ assignment: null, reason: 'User theme not targeted' });
    }

    // Age check
    if (experiment.target_age_min && user_age && user_age < experiment.target_age_min) {
      return res.status(200).json({ assignment: null, reason: 'User below minimum age' });
    }
    if (experiment.target_age_max && user_age && user_age > experiment.target_age_max) {
      return res.status(200).json({ assignment: null, reason: 'User above maximum age' });
    }

    // Specific user targeting
    if (targetUserIds.length > 0 && !targetUserIds.includes(user_id)) {
      return res.status(200).json({ assignment: null, reason: 'User not in target list' });
    }

    // Traffic percentage check
    if (experiment.traffic_percentage < 100) {
      const hash = hashUserId(user_id + experiment_id);
      if (hash > experiment.traffic_percentage) {
        return res.status(200).json({ assignment: null, reason: 'User not in traffic sample' });
      }
    }

    // Check existing assignment
    const existingResult = await pool.query(`
      SELECT ua.*, v.name as variant_name, v.config as variant_config, v.is_control
      FROM ab_testing.user_assignments ua
      JOIN ab_testing.variants v ON v.id = ua.variant_id
      WHERE ua.experiment_id = $1 AND ua.user_id = $2
    `, [experiment_id, user_id]);

    if (existingResult.rows.length > 0) {
      return res.status(200).json({ assignment: existingResult.rows[0] });
    }

    // Assign to variant using weighted random selection
    const variantsResult = await pool.query(`
      SELECT * FROM ab_testing.variants WHERE experiment_id = $1
    `, [experiment_id]);

    if (variantsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No variants configured for experiment' });
    }

    const variants = variantsResult.rows;
    const totalWeight = variants.reduce((sum: number, v: any) => sum + v.weight, 0);
    const random = Math.random() * totalWeight;
    
    let cumulative = 0;
    let selectedVariant = variants[0];
    for (const variant of variants) {
      cumulative += variant.weight;
      if (random <= cumulative) {
        selectedVariant = variant;
        break;
      }
    }

    // Create assignment
    const assignResult = await pool.query(`
      INSERT INTO ab_testing.user_assignments (experiment_id, variant_id, user_id, assignment_reason)
      VALUES ($1, $2, $3, 'random')
      RETURNING *
    `, [experiment_id, selectedVariant.id, user_id]);

    return res.status(201).json({
      assignment: {
        ...assignResult.rows[0],
        variant_name: selectedVariant.name,
        variant_config: selectedVariant.config,
        is_control: selectedVariant.is_control,
      }
    });

  } catch (error) {
    console.error('[A/B Testing] Error assigning user:', error);
    return res.status(500).json({ error: 'Failed to assign user' });
  }
}

// Simple hash function for consistent user bucketing
function hashUserId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 100);
}
