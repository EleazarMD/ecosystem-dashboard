/**
 * Story Intelligence Events API
 * GET /api/story-intelligence/events - List events from knowledge graph
 * POST /api/story-intelligence/events - Ingest new event
 * 
 * Provides access to the Neo4j knowledge graph for story events
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const STORY_INTELLIGENCE_URL = process.env.STORY_INTELLIGENCE_URL || 'http://100.108.41.22:8036';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // List events with optional filters
      const { category, limit = '20', offset = '0' } = req.query;
      
      let url = `${STORY_INTELLIGENCE_URL}/events?limit=${limit}&offset=${offset}`;
      if (category) {
        url += `&category=${category}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const events = await response.json();
      return res.status(200).json(events);
    }

    if (req.method === 'POST') {
      // Ingest new event
      const { title, content, category, source_urls, event_date } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'title and content required' });
      }

      const response = await fetch(`${STORY_INTELLIGENCE_URL}/events/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          category: category || 'science',
          source_urls: source_urls || [],
          event_date
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to ingest event: ${response.status}`);
      }

      const result = await response.json();
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Story Intelligence Events API error:', error);
    return res.status(500).json({
      error: 'Story Intelligence service unavailable',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
