/**
 * News Stories Feed API for iOS App
 * GET /api/news/stories/feed
 * 
 * Optimized endpoint for mobile consumption with grouping and filtering.
 * Returns stories grouped by date with full metadata for audio playback.
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

interface StoryItem {
  id: string;
  title: string;
  headline: string;
  summary: string;
  category: string;
  style_guide: string;
  word_count: number;
  reading_time_minutes: number;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  has_audio: boolean;
  status: string;
  created_at: string;
  published_at: string | null;
  // Formatted fields for display
  created_date: string;
  created_time: string;
  duration_formatted: string | null;
}

interface GroupedStories {
  date: string;
  date_label: string;
  stories: StoryItem[];
  total_duration_seconds: number;
  story_count: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      category,
      limit = '50',
      offset = '0',
      audio_only = 'false',
      group_by = 'date', // 'date' | 'category' | 'none'
      days = '30', // How many days back to fetch
    } = req.query;

    let query = `
      SELECT 
        id,
        title,
        headline,
        summary,
        category,
        style_guide,
        word_count,
        reading_time_minutes,
        audio_url,
        audio_duration_seconds,
        status,
        created_at,
        published_at
      FROM news.daily_stories
      WHERE status IN ('published', 'ready')
        AND created_at >= NOW() - INTERVAL '${parseInt(days as string)} days'
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (category && category !== 'all') {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (audio_only === 'true') {
      query += ` AND audio_url IS NOT NULL`;
    }

    query += ` ORDER BY created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string) || 50);
    params.push(parseInt(offset as string) || 0);

    const result = await pool.query(query, params);

    // Transform stories with formatted fields
    const stories: StoryItem[] = result.rows.map(row => {
      const createdAt = new Date(row.created_at);
      const durationSecs = row.audio_duration_seconds;
      
      return {
        id: row.id,
        title: row.title,
        headline: row.headline || row.title,
        summary: row.summary || '',
        category: row.category,
        style_guide: row.style_guide,
        word_count: row.word_count,
        reading_time_minutes: row.reading_time_minutes,
        audio_url: row.audio_url,
        audio_duration_seconds: durationSecs,
        has_audio: !!row.audio_url,
        status: row.status,
        created_at: row.created_at,
        published_at: row.published_at,
        // Formatted for display
        created_date: createdAt.toISOString().split('T')[0],
        created_time: createdAt.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        duration_formatted: durationSecs 
          ? `${Math.floor(durationSecs / 60)}:${String(durationSecs % 60).padStart(2, '0')}`
          : null,
      };
    });

    // Group stories if requested
    let response: any = { success: true };

    if (group_by === 'date') {
      const grouped = groupByDate(stories);
      response.groups = grouped;
      response.total_stories = stories.length;
      response.total_with_audio = stories.filter(s => s.has_audio).length;
    } else if (group_by === 'category') {
      const grouped = groupByCategory(stories);
      response.groups = grouped;
      response.total_stories = stories.length;
    } else {
      response.stories = stories;
      response.total = stories.length;
    }

    // Get available categories for filtering
    const categoriesResult = await pool.query(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM news.daily_stories
      WHERE status IN ('published', 'ready')
        AND created_at >= NOW() - INTERVAL '${parseInt(days as string)} days'
      GROUP BY category
      ORDER BY count DESC
    `);
    response.available_categories = categoriesResult.rows;

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching news feed:', error);
    return res.status(500).json({
      error: 'Failed to fetch news feed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function groupByDate(stories: StoryItem[]): GroupedStories[] {
  const groups: Map<string, StoryItem[]> = new Map();
  
  for (const story of stories) {
    const date = story.created_date;
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(story);
  }

  const result: GroupedStories[] = [];
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  for (const [date, dateStories] of groups) {
    let dateLabel = date;
    if (date === today) {
      dateLabel = 'Today';
    } else if (date === yesterday) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }

    const totalDuration = dateStories.reduce(
      (sum, s) => sum + (s.audio_duration_seconds || 0), 
      0
    );

    result.push({
      date,
      date_label: dateLabel,
      stories: dateStories,
      total_duration_seconds: totalDuration,
      story_count: dateStories.length,
    });
  }

  return result;
}

function groupByCategory(stories: StoryItem[]): { category: string; stories: StoryItem[]; count: number }[] {
  const groups: Map<string, StoryItem[]> = new Map();
  
  for (const story of stories) {
    const cat = story.category || 'uncategorized';
    if (!groups.has(cat)) {
      groups.set(cat, []);
    }
    groups.get(cat)!.push(story);
  }

  return Array.from(groups.entries()).map(([category, catStories]) => ({
    category,
    stories: catStories,
    count: catStories.length,
  }));
}
