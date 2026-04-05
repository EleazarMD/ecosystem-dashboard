/**
 * Batch Audio Generation for News Stories
 * POST /api/news/stories/generate-audio-batch
 * 
 * Automatically generates audio for all stories without audio using voice rotation.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const QWEN_TTS_URL = process.env.QWEN_TTS_URL || 'http://localhost:4200';
const NEWS_AUDIO_DIR = process.env.NEWS_AUDIO_DIR || '/home/eleazar/Projects/AIHomelab/data/audio/news-stories';

function getNewsPool() {
  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'ecosystem_unified',
    user: process.env.POSTGRES_USER || 'eleazar',
    password: process.env.POSTGRES_PASSWORD || '',
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    limit = 10,
    category,
    status = 'published',
  } = req.body;

  const newsPool = getNewsPool();

  try {
    // Fetch stories without audio
    let query = `
      SELECT id, title, headline, category
      FROM news.daily_stories
      WHERE audio_url IS NULL
        AND full_narrative IS NOT NULL
        AND status = $1
    `;
    const params: any[] = [status];
    let paramIndex = 2;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await newsPool.query(query, params);
    const stories = result.rows;

    if (stories.length === 0) {
      await newsPool.end();
      return res.status(200).json({
        success: true,
        message: 'No stories need audio generation',
        processed: 0,
        results: [],
      });
    }

    console.log(`🎙️ Starting batch audio generation for ${stories.length} stories`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Process each story
    for (const story of stories) {
      try {
        console.log(`\n📝 Processing: ${story.headline || story.title}`);
        
        // Call the individual generate-audio endpoint
        const response = await fetch(`http://localhost:8404/api/news/stories/${story.id}/generate-audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Voice will be auto-selected based on category
          }),
        });

        if (response.ok) {
          const data = await response.json();
          successCount++;
          results.push({
            id: story.id,
            title: story.title,
            category: story.category,
            success: true,
            audioUrl: data.audioUrl,
            duration: data.durationSeconds,
            voiceId: data.voiceId,
          });
          console.log(`✅ Success: ${story.headline || story.title} (${data.voiceId})`);
        } else {
          const errorText = await response.text();
          failCount++;
          results.push({
            id: story.id,
            title: story.title,
            category: story.category,
            success: false,
            error: errorText,
          });
          console.error(`❌ Failed: ${story.headline || story.title}`);
        }

        // Small delay to avoid overwhelming the TTS service
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        failCount++;
        results.push({
          id: story.id,
          title: story.title,
          category: story.category,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`❌ Error processing ${story.title}:`, error);
      }
    }

    await newsPool.end();

    console.log(`\n✅ Batch complete: ${successCount} succeeded, ${failCount} failed`);

    return res.status(200).json({
      success: true,
      processed: stories.length,
      succeeded: successCount,
      failed: failCount,
      results,
    });

  } catch (error) {
    console.error('❌ Batch audio generation error:', error);
    await newsPool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
