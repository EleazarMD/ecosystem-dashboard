/**
 * Story Intelligence API Proxy
 * GET /api/story-intelligence - Health check and available models
 * POST /api/story-intelligence - Analyze content with Model Thinker frameworks
 * 
 * Proxies requests to the Story Intelligence Pipeline at port 8036
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const STORY_INTELLIGENCE_URL = process.env.STORY_INTELLIGENCE_URL || 'http://100.108.41.22:8036';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Health check and models list
      const [healthRes, modelsRes] = await Promise.all([
        fetch(`${STORY_INTELLIGENCE_URL}/health`),
        fetch(`${STORY_INTELLIGENCE_URL}/models`)
      ]);

      const health = await healthRes.json();
      const models = await modelsRes.json();

      return res.status(200).json({
        status: health.status,
        neo4j: health.neo4j,
        pgvector: health.pgvector,
        models: models.models || [],
        url: STORY_INTELLIGENCE_URL
      });
    }

    if (req.method === 'POST') {
      // Analyze content with Model Thinker frameworks
      const { content, category, models, event_id } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'content required' });
      }

      const response = await fetch(`${STORY_INTELLIGENCE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          category: category || 'science',
          models: models || [],
          event_id
        })
      });

      if (!response.ok) {
        throw new Error(`Story Intelligence API error: ${response.status}`);
      }

      const result = await response.json();
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Story Intelligence API error:', error);
    return res.status(500).json({
      error: 'Story Intelligence service unavailable',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
