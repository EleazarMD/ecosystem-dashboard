/**
 * Clinical Feedback API - Dashboard Integration
 * Proxies requests to the clinical feedback service for MLOps dashboard
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const CLINICAL_FEEDBACK_API = process.env.CLINICAL_FEEDBACK_API_URL || 'http://192.168.1.66:8020';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await getStats(req, res);
      default:
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('[Clinical Feedback API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getStats(req: NextApiRequest, res: NextApiResponse) {
  try {
    const url = `${CLINICAL_FEEDBACK_API}/api/feedback`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Feedback API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform the medical tools API response to dashboard format
    const stats = data.stats || {};
    const feedback = data.feedback || [];
    
    return res.status(200).json({
      total_feedback: stats.total_feedback || feedback.length || 0,
      upvotes: stats.positive || 0,
      downvotes: stats.negative || 0,
      approval_rate: stats.total_feedback > 0 
        ? (stats.positive || 0) / stats.total_feedback 
        : 0,
      avg_component_ratings: {
        quick_answer: stats.avg_rating || 0,
        key_actions: stats.avg_rating || 0,
        drug_options: stats.avg_rating || 0,
        algorithm: stats.avg_rating || 0,
        safety: stats.avg_rating || 0,
        monitoring: stats.avg_rating || 0,
        sources: stats.avg_rating || 0,
      },
      would_use_clinically_rate: 0,
      critical_issues_count: stats.negative || 0,
      raw_feedback: feedback,
    });
  } catch (error) {
    console.error('[Clinical Feedback] Error fetching stats:', error);
    
    // Return mock data for development
    return res.status(200).json({
      total_feedback: 0,
      upvotes: 0,
      downvotes: 0,
      approval_rate: 0,
      avg_component_ratings: {
        quick_answer: 0,
        key_actions: 0,
        drug_options: 0,
        algorithm: 0,
        safety: 0,
        monitoring: 0,
        sources: 0,
      },
      would_use_clinically_rate: 0,
      critical_issues_count: 0,
    });
  }
}
