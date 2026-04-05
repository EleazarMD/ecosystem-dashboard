/**
 * Export Story to Podcast Studio
 * POST /api/news/stories/export-to-podcast
 * 
 * Exports a daily news story to Podcast Studio for audio generation.
 * Creates a podcast project and adds the story as research material.
 * Based on Chapter 20: Story Generation Architecture & Migration Plan
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

interface ExportRequest {
  story_id: string;
  project_id?: string; // Existing project ID, or create new
  project_title?: string; // For new project
  generate_audio?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      story_id,
      project_id,
      project_title,
      generate_audio = true,
    } = req.body as ExportRequest;

    if (!story_id) {
      return res.status(400).json({ error: 'story_id required' });
    }

    // Fetch the story
    const storyResult = await pool.query(
      `SELECT 
        id, title, headline, summary, full_narrative, category,
        citations, research_package, word_count, style_guide
       FROM news.daily_stories
       WHERE id = $1`,
      [story_id]
    );

    if (storyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const story = storyResult.rows[0];
    console.log(`📤 Exporting story to Podcast Studio: "${story.title}"`);

    // Get or create podcast project
    let podcastProjectId = project_id;

    if (!podcastProjectId) {
      // Create new podcast project
      const projectResult = await pool.query(
        `INSERT INTO podcast_projects 
         (title, description, status, script_length, script_tone, script_audience, script_style)
         VALUES ($1, $2, 'draft', 'default', 'conversational', 'general', 'co-host')
         RETURNING id`,
        [
          project_title || `Daily News: ${story.title}`,
          `Auto-generated from Daily News Stories - ${story.category}`,
        ]
      );
      podcastProjectId = projectResult.rows[0].id;
      console.log(`📁 Created podcast project: ${podcastProjectId}`);
    }

    // Add story as research material
    const materialResult = await pool.query(
      `INSERT INTO research_materials 
       (project_id, title, type, content, word_count, is_selected, metadata)
       VALUES ($1, $2, 'article', $3, $4, true, $5)
       RETURNING id`,
      [
        podcastProjectId,
        story.title,
        story.full_narrative,
        story.word_count,
        JSON.stringify({
          source: 'daily_news_stories',
          story_id: story.id,
          category: story.category,
          style_guide: story.style_guide,
          citations: story.citations,
          headline: story.headline,
          summary: story.summary,
          imported_at: new Date().toISOString(),
        }),
      ]
    );

    console.log(`📄 Added as research material: ${materialResult.rows[0].id}`);

    // Update story with podcast project reference
    await pool.query(
      `UPDATE news.daily_stories 
       SET podcast_project_id = $1, podcast_exported_at = NOW()
       WHERE id = $2`,
      [podcastProjectId, story_id]
    );

    // Optionally trigger audio generation
    let audioResult = null;
    if (generate_audio) {
      try {
        // Call the podcast studio audio generation endpoint
        const audioResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003'}/api/podcast-studio/generate-audio`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: podcastProjectId,
              script: story.full_narrative,
              voice_config: {
                provider: 'gemini',
                voice: 'Puck',
                speed: 1.0,
              },
            }),
          }
        );

        if (audioResponse.ok) {
          audioResult = await audioResponse.json();
          console.log(`🔊 Audio generation started`);
        }
      } catch (audioError) {
        console.warn('Audio generation request failed:', audioError);
      }
    }

    console.log(`✅ Story exported to Podcast Studio`);

    return res.status(200).json({
      success: true,
      export: {
        story_id,
        podcast_project_id: podcastProjectId,
        material_id: materialResult.rows[0].id,
        audio_generation: audioResult ? 'started' : 'skipped',
      },
      message: 'Story exported to Podcast Studio successfully',
    });

  } catch (error) {
    console.error('❌ Export error:', error);
    return res.status(500).json({
      error: 'Failed to export story',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
