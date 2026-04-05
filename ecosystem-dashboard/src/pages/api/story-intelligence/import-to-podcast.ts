/**
 * Import Story Intelligence Events to Podcast Studio
 * POST /api/story-intelligence/import-to-podcast
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const GOOSEMIND_URL = process.env.GOOSEMIND_URL || 'http://100.108.41.22:8030';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category, limit = 5 } = req.body || {};

    console.log('📥 Importing stories from Story Intelligence', { category, limit, goosemindUrl: GOOSEMIND_URL });

    // Fetch stories from GooseMind
    let storiesUrl = `${GOOSEMIND_URL}/api/stories/discover?`;
    if (category) {
      storiesUrl += `category=${category}&`;
    }
    storiesUrl += `limit=${limit}`;

    console.log('Fetching from:', storiesUrl);

    let storiesResponse;
    try {
      storiesResponse = await fetch(storiesUrl, {
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
    } catch (fetchError: any) {
      console.error('Network error fetching from GooseMind:', fetchError);
      
      // Check if it's a timeout
      if (fetchError.name === 'TimeoutError' || fetchError.name === 'AbortError') {
        return res.status(504).json({
          error: 'GooseMind service timeout',
          message: 'The Story Intelligence service took too long to respond. Please try again.',
          details: 'Connection timeout after 30 seconds'
        });
      }
      
      // Network connectivity issue
      return res.status(503).json({
        error: 'GooseMind service unavailable',
        message: 'Cannot connect to Story Intelligence service. Please check if the service is running.',
        details: fetchError.message,
        goosemindUrl: GOOSEMIND_URL
      });
    }

    if (!storiesResponse.ok) {
      const errorText = await storiesResponse.text();
      console.error('GooseMind API error:', storiesResponse.status, errorText);
      return res.status(storiesResponse.status).json({
        error: `GooseMind API returned ${storiesResponse.status}`,
        message: `Failed to fetch stories from Story Intelligence`,
        details: errorText
      });
    }

    let storiesData;
    try {
      storiesData = await storiesResponse.json();
    } catch (parseError) {
      console.error('Failed to parse GooseMind response:', parseError);
      return res.status(502).json({
        error: 'Invalid response from GooseMind',
        message: 'Story Intelligence service returned invalid data',
        details: parseError instanceof Error ? parseError.message : 'JSON parse error'
      });
    }

    const stories = storiesData.stories || [];

    console.log(`Got ${stories.length} stories from GooseMind`);

    if (stories.length === 0) {
      return res.status(200).json({
        success: true,
        imported: 0,
        materials: [],
        message: 'No stories available to import'
      });
    }

    // Transform stories into Podcast Studio research materials format
    const researchMaterials = stories.map((story: any) => ({
      id: `story-intel-${story.id}`,
      title: story.title,
      type: 'article' as const,
      content: story.fullNarrative || story.summary,
      source: 'Story Intelligence Pipeline',
      wordCount: story.fullNarrative?.split(/\s+/).length || 0,
      date: story.createdAt || new Date().toISOString(),
      url: story.sources?.[0]?.url,
      metadata: {
        story_id: story.id,
        category: story.category,
        style: story.style,
        sources: story.sources,
        audio_url: story.audioUrl,
        estimated_read_time: story.estimatedReadTime
      }
    }));

    console.log(`✅ Prepared ${researchMaterials.length} stories for Podcast Studio`);

    return res.status(200).json({
      success: true,
      imported: researchMaterials.length,
      materials: researchMaterials,
      message: `Imported ${researchMaterials.length} stories from Story Intelligence`
    });

  } catch (error) {
    console.error('❌ Import error:', error);
    return res.status(500).json({
      error: 'Failed to import stories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
