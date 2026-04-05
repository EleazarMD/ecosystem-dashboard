/**
 * Clinical Feedback Analytics API
 * Provides aggregated analysis data for the feedback dashboard
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  host: '127.0.0.1',
  port: 5435,
  database: 'clinical_kb',
  user: 'clinical_kb',
  password: 'clinical_kb_secure_d0de835df82a2727',
  max: 5,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.query;

  try {
    switch (type) {
      case 'issue-summary':
        return await getIssueSummary(req, res);
      case 'rating-trends':
        return await getRatingTrends(req, res);
      case 'critical-queue':
        return await getCriticalQueue(req, res);
      case 'improvement-candidates':
        return await getImprovementCandidates(req, res);
      default:
        return await getOverviewStats(req, res);
    }
  } catch (error) {
    console.error('[Clinical Analytics] Error:', error);
    return res.status(500).json({ error: 'Analytics query failed' });
  }
}

async function getOverviewStats(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_feedback,
        SUM(CASE WHEN overall_vote = 1 THEN 1 ELSE 0 END) as upvotes,
        SUM(CASE WHEN overall_vote = -1 THEN 1 ELSE 0 END) as downvotes,
        SUM(CASE WHEN would_use_clinically = true THEN 1 ELSE 0 END) as would_use,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
        AVG(quick_answer_rating) as avg_quick_answer,
        AVG(key_actions_rating) as avg_key_actions,
        AVG(drug_options_rating) as avg_drug_options,
        AVG(algorithm_rating) as avg_algorithm,
        AVG(safety_rating) as avg_safety,
        AVG(monitoring_rating) as avg_monitoring,
        AVG(sources_rating) as avg_sources
      FROM query_feedback
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);

    const stats = result.rows[0];
    const total = parseInt(stats.total_feedback) || 0;

    return res.status(200).json({
      total_feedback: total,
      upvotes: parseInt(stats.upvotes) || 0,
      downvotes: parseInt(stats.downvotes) || 0,
      approval_rate: total > 0 ? (parseInt(stats.upvotes) || 0) / total : 0,
      would_use_clinically_rate: total > 0 ? (parseInt(stats.would_use) || 0) / total : 0,
      critical_issues_count: parseInt(stats.critical_count) || 0,
      avg_component_ratings: {
        quick_answer: parseFloat(stats.avg_quick_answer) || 0,
        key_actions: parseFloat(stats.avg_key_actions) || 0,
        drug_options: parseFloat(stats.avg_drug_options) || 0,
        algorithm: parseFloat(stats.avg_algorithm) || 0,
        safety: parseFloat(stats.avg_safety) || 0,
        monitoring: parseFloat(stats.avg_monitoring) || 0,
        sources: parseFloat(stats.avg_sources) || 0,
      },
    });
  } catch (error) {
    console.error('[Analytics] Overview stats error:', error);
    return res.status(200).json({
      total_feedback: 0,
      upvotes: 0,
      downvotes: 0,
      approval_rate: 0,
      would_use_clinically_rate: 0,
      critical_issues_count: 0,
      avg_component_ratings: {},
    });
  }
}

async function getIssueSummary(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await pool.query(`
      SELECT 
        fit.component,
        fit.issue_code,
        fit.display_name,
        fit.severity,
        COUNT(*) as occurrence_count,
        CASE 
          WHEN fit.severity = 'critical' THEN 'finetune'
          WHEN fit.issue_code IN ('too_verbose', 'formatting', 'unnecessary_step') THEN 'prompt'
          ELSE 'finetune'
        END as recommended_action
      FROM query_feedback qf
      CROSS JOIN LATERAL (
        SELECT jsonb_array_elements_text(
          COALESCE(qf.quick_answer_issues, '[]'::jsonb) ||
          COALESCE(qf.key_actions_issues, '[]'::jsonb) ||
          COALESCE(qf.drug_options_issues, '[]'::jsonb) ||
          COALESCE(qf.safety_issues, '[]'::jsonb) ||
          COALESCE(qf.monitoring_issues, '[]'::jsonb) ||
          COALESCE(qf.sources_issues, '[]'::jsonb)
        ) AS issue_code
      ) issues
      JOIN feedback_issue_types fit ON fit.issue_code = issues.issue_code
      WHERE qf.created_at > NOW() - INTERVAL '7 days'
      GROUP BY fit.component, fit.issue_code, fit.display_name, fit.severity
      ORDER BY 
        CASE fit.severity 
          WHEN 'critical' THEN 1 
          WHEN 'moderate' THEN 2 
          ELSE 3 
        END,
        occurrence_count DESC
      LIMIT 20
    `);

    return res.status(200).json({ issues: result.rows });
  } catch (error) {
    console.error('[Analytics] Issue summary error:', error);
    return res.status(200).json({ issues: [] });
  }
}

async function getRatingTrends(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        AVG(quick_answer_rating) as quick_answer,
        AVG(key_actions_rating) as key_actions,
        AVG(drug_options_rating) as drug_options,
        AVG(safety_rating) as safety,
        AVG(sources_rating) as sources,
        COUNT(*) as feedback_count
      FROM query_feedback
      WHERE created_at > NOW() - INTERVAL '30 days'
        AND (quick_answer_rating IS NOT NULL OR key_actions_rating IS NOT NULL)
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `);

    return res.status(200).json({ 
      trends: result.rows.map(row => ({
        date: row.date,
        quick_answer: parseFloat(row.quick_answer) || 0,
        key_actions: parseFloat(row.key_actions) || 0,
        drug_options: parseFloat(row.drug_options) || 0,
        safety: parseFloat(row.safety) || 0,
        sources: parseFloat(row.sources) || 0,
        count: parseInt(row.feedback_count),
      }))
    });
  } catch (error) {
    console.error('[Analytics] Rating trends error:', error);
    return res.status(200).json({ trends: [] });
  }
}

async function getCriticalQueue(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await pool.query(`
      SELECT 
        qs.session_id,
        qs.query_text,
        qs.query_type,
        qf.severity,
        qf.feedback_category,
        qf.feedback_text,
        qf.expected_answer,
        qf.created_at
      FROM query_sessions qs
      JOIN query_feedback qf ON qs.session_id = qf.session_id
      WHERE qf.severity = 'critical'
         OR qf.overall_vote = -1
         OR qf.expected_answer IS NOT NULL
      ORDER BY 
        CASE qf.severity WHEN 'critical' THEN 1 ELSE 2 END,
        qf.created_at DESC
      LIMIT 10
    `);

    return res.status(200).json({ queue: result.rows });
  } catch (error) {
    console.error('[Analytics] Critical queue error:', error);
    return res.status(200).json({ queue: [] });
  }
}

async function getImprovementCandidates(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get sessions where users provided expected answers (prime fine-tuning candidates)
    const result = await pool.query(`
      SELECT 
        qs.session_id,
        qs.query_text,
        qs.query_type,
        qs.response_text,
        qf.expected_answer,
        qf.missing_information,
        qf.incorrect_information,
        qf.feedback_category,
        qf.severity,
        CASE 
          WHEN qf.feedback_category IN ('hallucination', 'wrong_drug', 'missing_contraindication') 
            THEN 'finetune_priority'
          WHEN qf.feedback_category IN ('formatting', 'too_verbose') 
            THEN 'prompt_engineering'
          ELSE 'finetune_candidate'
        END as improvement_type
      FROM query_sessions qs
      JOIN query_feedback qf ON qs.session_id = qf.session_id
      WHERE qf.expected_answer IS NOT NULL
         OR qf.missing_information IS NOT NULL
         OR qf.incorrect_information IS NOT NULL
      ORDER BY 
        CASE qf.severity WHEN 'critical' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
        qf.created_at DESC
      LIMIT 20
    `);

    return res.status(200).json({ 
      candidates: result.rows,
      summary: {
        finetune_priority: result.rows.filter(r => r.improvement_type === 'finetune_priority').length,
        finetune_candidate: result.rows.filter(r => r.improvement_type === 'finetune_candidate').length,
        prompt_engineering: result.rows.filter(r => r.improvement_type === 'prompt_engineering').length,
      }
    });
  } catch (error) {
    console.error('[Analytics] Improvement candidates error:', error);
    return res.status(200).json({ candidates: [], summary: {} });
  }
}
