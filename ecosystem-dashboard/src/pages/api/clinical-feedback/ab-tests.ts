/**
 * Clinical A/B Testing API
 * Manages A/B tests for clinical pipeline versions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.CLINICAL_KB_HOST || '192.168.1.66',
  port: parseInt(process.env.CLINICAL_KB_PORT || '5435'),
  database: 'clinical_kb',
  user: 'clinical_kb',
  password: process.env.CLINICAL_KB_PASSWORD || 'clinical_kb_secure_d0de835df82a2727',
  max: 5,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await getABTests(req, res);
      case 'POST':
        return await createABTest(req, res);
      case 'PUT':
        return await updateABTest(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('[Clinical A/B Tests API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getABTests(req: NextApiRequest, res: NextApiResponse) {
  const { status, id } = req.query;

  try {
    // Check if ab_tests table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ab_tests'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // Return mock data if table doesn't exist
      return res.status(200).json({
        tests: [
          {
            id: 'mock-1',
            name: 'Med42 vs Base Llama',
            description: 'Compare fine-tuned Med42 against base model',
            status: 'running',
            variant_a: { name: 'Control (Base)', traffic: 50, model: 'meta-llama/Llama-3.3-70B-Instruct' },
            variant_b: { name: 'Med42 Fine-tuned', traffic: 50, model: 'm42-health/Llama3-Med42-70B' },
            metrics: {
              total_queries: 0,
              variant_a_score: 0,
              variant_b_score: 0,
              statistical_significance: false
            },
            created_at: new Date().toISOString()
          }
        ],
        note: 'Mock data - ab_tests table not yet created'
      });
    }

    if (id) {
      const result = await pool.query(
        'SELECT * FROM ab_tests WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      // Get metrics for this test
      const metricsResult = await pool.query(`
        SELECT 
          variant,
          COUNT(*) as query_count,
          AVG(overall_score) as avg_score,
          AVG(safety_score) as avg_safety,
          SUM(CASE WHEN thumbs_up THEN 1 ELSE 0 END) as upvotes,
          SUM(CASE WHEN thumbs_up = false THEN 1 ELSE 0 END) as downvotes
        FROM ab_test_results
        WHERE test_id = $1
        GROUP BY variant
      `, [id]);

      return res.status(200).json({
        test: result.rows[0],
        metrics: metricsResult.rows
      });
    }

    let query = 'SELECT * FROM ab_tests';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    return res.status(200).json({ tests: result.rows });
  } catch (error) {
    console.error('[Clinical A/B Tests] Error:', error);
    return res.status(200).json({ 
      tests: [],
      error: 'Database query failed'
    });
  }
}

async function createABTest(req: NextApiRequest, res: NextApiResponse) {
  const {
    name,
    description,
    variant_a_name,
    variant_a_model,
    variant_a_traffic,
    variant_b_name,
    variant_b_model,
    variant_b_traffic,
    clinical_setting,
  } = req.body;

  if (!name || !variant_a_model || !variant_b_model) {
    return res.status(400).json({ 
      error: 'Name and both variant models are required' 
    });
  }

  try {
    const result = await pool.query(`
      INSERT INTO ab_tests (
        name, description, status,
        variant_a_name, variant_a_model, variant_a_traffic,
        variant_b_name, variant_b_model, variant_b_traffic,
        clinical_setting
      ) VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      name,
      description,
      variant_a_name || 'Control',
      variant_a_model,
      variant_a_traffic || 50,
      variant_b_name || 'Variant',
      variant_b_model,
      variant_b_traffic || 50,
      clinical_setting || 'primary_care'
    ]);

    return res.status(201).json({ test: result.rows[0] });
  } catch (error) {
    console.error('[Clinical A/B Tests] Error creating test:', error);
    return res.status(500).json({ error: 'Failed to create A/B test' });
  }
}

async function updateABTest(req: NextApiRequest, res: NextApiResponse) {
  const { id, status } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Test ID is required' });
  }

  try {
    const allowedStatuses = ['draft', 'running', 'paused', 'completed'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(`
      UPDATE ab_tests 
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, status]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    return res.status(200).json({ test: result.rows[0] });
  } catch (error) {
    console.error('[Clinical A/B Tests] Error updating test:', error);
    return res.status(500).json({ error: 'Failed to update A/B test' });
  }
}
