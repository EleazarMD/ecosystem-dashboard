/**
 * News Pipeline Settings API
 * GET /api/news/settings - Get current settings
 * PUT /api/news/settings - Update settings
 * 
 * Manages news story generation pipeline configuration including:
 * - Schedule (morning/afternoon times)
 * - Categories enabled
 * - Quality thresholds
 * - Delivery options
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

export interface NewsPipelineSettings {
  pipeline: {
    enabled: boolean;
    paused: boolean;
    pause_until: string | null;
    pause_reason: string | null;
    schedule: {
      morning: { enabled: boolean; time: string; timezone: string };
      afternoon: { enabled: boolean; time: string; timezone: string };
    };
    stories_per_batch: number;
    categories: string[];
    max_daily_cost: number;
  };
  quality: {
    min_sources_per_story: number;
    min_word_count: number;
    max_word_count: number;
    require_firecrawl: boolean;
    deduplication_threshold: number;
    hallucination_check: boolean;
  };
  composition: {
    tone: 'analytical' | 'narrative' | 'investigative';
    complexity: 'executive' | 'general' | 'technical';
    reading_level: 'graduate' | 'undergraduate' | 'general';
    frameworks_enabled: boolean;
    frameworks_auto_select: boolean;
    max_frameworks_per_story: number;
    preferred_frameworks: string[];
    include_executive_summary: boolean;
    include_key_takeaways: boolean;
    include_implications: boolean;
    include_counterarguments: boolean;
  };
  delivery: {
    ios_push_enabled: boolean;
    audio_generation: boolean;
    audio_voice: string;
  };
  voice: {
    enabled: boolean;
    provider: 'qwen' | 'gemini';
    selection_mode: 'manual' | 'rotation' | 'random' | 'category';
    default_voice: string;
    voice_pool: string[];
    category_voices: Record<string, string[]>;
    settings: {
      temperature: number;
      speed: number;
      auto_generate: boolean;
    };
  };
}

const DEFAULT_SETTINGS: NewsPipelineSettings = {
  pipeline: {
    enabled: true,
    paused: false,
    pause_until: null,
    pause_reason: null,
    schedule: {
      morning: { enabled: true, time: '06:00', timezone: 'America/Chicago' },
      afternoon: { enabled: true, time: '14:00', timezone: 'America/Chicago' },
    },
    stories_per_batch: 5,
    categories: ['science', 'business', 'technology', 'healthcare'],
    max_daily_cost: 5.00,
  },
  quality: {
    min_sources_per_story: 3,
    min_word_count: 600,
    max_word_count: 1500,
    require_firecrawl: true,
    deduplication_threshold: 0.85,
    hallucination_check: true,
  },
  composition: {
    tone: 'analytical',
    complexity: 'executive',
    reading_level: 'graduate',
    frameworks_enabled: true,
    frameworks_auto_select: true,
    max_frameworks_per_story: 2,
    preferred_frameworks: ['many_model_thinking', 'prospect_theory', 'porters_five_forces'],
    include_executive_summary: true,
    include_key_takeaways: true,
    include_implications: true,
    include_counterarguments: true,
  },
  delivery: {
    ios_push_enabled: true,
    audio_generation: true,
    audio_voice: 'alloy',
  },
  voice: {
    enabled: true,
    provider: 'qwen',
    selection_mode: 'category',
    default_voice: 'american_male_anchor',
    voice_pool: [
      'american_male_anchor',
      'american_female_confident',
      'american_male_narrator',
      'british_female_sophisticated',
    ],
    category_voices: {
      technology: ['american_male_anchor', 'american_female_confident', 'american_male_narrator', 'american_male_executive'],
      science: ['american_male_narrator', 'british_female_sophisticated', 'american_female_confident', 'american_male_refined'],
      business: ['american_male_executive', 'british_female_sophisticated', 'american_male_anchor', 'british_female_anchor'],
      politics: ['british_female_sophisticated', 'american_male_anchor', 'american_male_narrator', 'american_male_executive'],
      healthcare: ['american_female_warm', 'american_male_executive', 'british_female_sophisticated', 'american_male_narrator'],
    },
    settings: {
      temperature: 0.4,
      speed: 1.0,
      auto_generate: false,
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = 'eleazar'; // TODO: Get from session

  if (req.method === 'GET') {
    return getSettings(res, userId);
  } else if (req.method === 'PUT') {
    return updateSettings(req, res, userId);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function getSettings(res: NextApiResponse, userId: string) {
  try {
    const result = await pool.query(
      `SELECT settings FROM news.pipeline_settings WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return defaults and create record
      await pool.query(
        `INSERT INTO news.pipeline_settings (user_id, settings) VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, JSON.stringify(DEFAULT_SETTINGS)]
      );
      return res.status(200).json({ settings: DEFAULT_SETTINGS });
    }

    return res.status(200).json({ settings: result.rows[0].settings });
  } catch (error) {
    console.error('Error fetching news settings:', error);
    // Return defaults on error
    return res.status(200).json({ settings: DEFAULT_SETTINGS });
  }
}

async function updateSettings(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const updates = req.body;

    // Get current settings
    const currentResult = await pool.query(
      `SELECT settings FROM news.pipeline_settings WHERE user_id = $1`,
      [userId]
    );

    const currentSettings = currentResult.rows[0]?.settings || DEFAULT_SETTINGS;
    
    // Deep merge updates
    const newSettings = deepMerge(currentSettings, updates);

    // Save to database
    await pool.query(
      `INSERT INTO news.pipeline_settings (user_id, settings, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         settings = $2,
         updated_at = NOW()`,
      [userId, JSON.stringify(newSettings)]
    );

    console.log(`📰 News settings updated for ${userId}`);

    return res.status(200).json({ 
      success: true, 
      settings: newSettings,
    });
  } catch (error) {
    console.error('Error updating news settings:', error);
    return res.status(500).json({
      error: 'Failed to update settings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}
