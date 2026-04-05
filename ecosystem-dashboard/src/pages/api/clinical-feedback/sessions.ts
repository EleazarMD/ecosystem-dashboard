/**
 * Clinical Feedback Sessions API
 * Fetches query sessions with feedback for review
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import clinicalPool from '@/lib/db/clinical-kb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { 
    setting, 
    has_feedback, 
    vote_type,
    limit = '50',
    offset = '0'
  } = req.query;

  try {
    let query = `
      SELECT 
        qs.session_id,
        qs.query_text,
        qs.query_type,
        qs.response_text,
        qs.sources_count,
        qs.guideline_count,
        qs.latency_ms,
        qs.created_at,
        cs.name as clinical_setting,
        cs.display_name as setting_display,
        qf.id as feedback_id,
        qf.overall_vote,
        qf.overall_helpful,
        qf.would_use_clinically,
        qf.quick_answer_rating,
        qf.key_actions_rating,
        qf.drug_options_rating,
        qf.safety_rating,
        qf.sources_rating,
        qf.feedback_text,
        qf.expected_answer,
        qf.missing_information,
        qf.incorrect_information,
        qf.feedback_category,
        qf.severity
      FROM query_sessions qs
      LEFT JOIN clinical_settings cs ON qs.clinical_setting_id = cs.id
      LEFT JOIN query_feedback qf ON qs.session_id = qf.session_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (setting) {
      query += ` AND cs.name = $${paramIndex}`;
      params.push(setting);
      paramIndex++;
    }

    if (has_feedback === 'true') {
      query += ` AND qf.id IS NOT NULL`;
    } else if (has_feedback === 'false') {
      query += ` AND qf.id IS NULL`;
    }

    if (vote_type === 'up') {
      query += ` AND qf.overall_vote = 1`;
    } else if (vote_type === 'down') {
      query += ` AND qf.overall_vote = -1`;
    }

    query += ` ORDER BY qs.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await clinicalPool.query(query, params);

    return res.status(200).json({
      sessions: result.rows,
      total: result.rows.length,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('[Clinical Sessions] Error:', error);
    return res.status(200).json({ 
      sessions: [],
      total: 0,
      error: 'Database query failed'
    });
  }
}
