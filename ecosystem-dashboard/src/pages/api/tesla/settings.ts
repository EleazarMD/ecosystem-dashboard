/**
 * Tesla Dashboard Settings API
 * GET /api/tesla/settings - Get current settings
 * PUT /api/tesla/settings - Update settings
 * 
 * Manages Tesla dashboard configuration including:
 * - noVNC browser connection (host, password, display)
 * - Quick Launch bookmarks (user-customizable)
 * - Display preferences (theme, browser height)
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

export interface TeslaBookmark {
  id: string;
  label: string;
  url: string;
  icon: string;
  color: string;
}

export interface TeslaDashboardSettings {
  vnc: {
    host: string;
    password: string;
    autoConnect: boolean;
    resize: 'scale' | 'remote' | 'off';
    quality: number;
    showDotCursor: boolean;
    viewOnly: boolean;
  };
  bookmarks: TeslaBookmark[];
  display: {
    browserHeightPercent: number;
    theme: 'auto' | 'light' | 'dark';
    novaWidthPercent: number;
  };
}

export const DEFAULT_TESLA_SETTINGS: TeslaDashboardSettings = {
  vnc: {
    host: 'vnc.hyperspaceanalytics.com',
    password: '',
    autoConnect: true,
    resize: 'scale',
    quality: 6,
    showDotCursor: true,
    viewOnly: false,
  },
  bookmarks: [
    { id: 'youtube', label: 'YouTube', url: 'https://youtube.com', icon: 'Play', color: 'red.400' },
    { id: 'amazon', label: 'Amazon', url: 'https://amazon.com', icon: 'ShoppingCart', color: 'orange.400' },
    { id: 'coursera', label: 'Coursera', url: 'https://coursera.org', icon: 'BookOpen', color: 'blue.400' },
    { id: 'maps', label: 'Maps', url: 'https://maps.google.com', icon: 'Map', color: 'green.400' },
    { id: 'news', label: 'News', url: 'https://news.google.com', icon: 'Newspaper', color: 'purple.400' },
    { id: 'markets', label: 'Markets', url: 'https://finance.yahoo.com', icon: 'TrendingUp', color: 'teal.400' },
  ],
  display: {
    browserHeightPercent: 60,
    theme: 'auto',
    novaWidthPercent: 33,
  },
};

// Ensure table exists
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tesla_dashboard_settings (
      user_id TEXT PRIMARY KEY,
      settings JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = 'eleazar';

  try {
    await ensureTable();
  } catch (err) {
    console.error('Failed to ensure tesla_dashboard_settings table:', err);
  }

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
      `SELECT settings FROM tesla_dashboard_settings WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO tesla_dashboard_settings (user_id, settings) VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, JSON.stringify(DEFAULT_TESLA_SETTINGS)]
      );
      return res.status(200).json({ settings: DEFAULT_TESLA_SETTINGS });
    }

    // Merge with defaults to ensure new fields are present
    const merged = deepMerge(DEFAULT_TESLA_SETTINGS, result.rows[0].settings);
    return res.status(200).json({ settings: merged });
  } catch (error) {
    console.error('Error fetching Tesla settings:', error);
    return res.status(200).json({ settings: DEFAULT_TESLA_SETTINGS });
  }
}

async function updateSettings(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const updates = req.body;

    const currentResult = await pool.query(
      `SELECT settings FROM tesla_dashboard_settings WHERE user_id = $1`,
      [userId]
    );

    const currentSettings = currentResult.rows[0]?.settings || DEFAULT_TESLA_SETTINGS;

    // For bookmarks, replace entirely rather than deep merge
    let newSettings;
    if (updates.bookmarks) {
      newSettings = { ...deepMerge(currentSettings, updates), bookmarks: updates.bookmarks };
    } else {
      newSettings = deepMerge(currentSettings, updates);
    }

    await pool.query(
      `INSERT INTO tesla_dashboard_settings (user_id, settings, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         settings = $2,
         updated_at = NOW()`,
      [userId, JSON.stringify(newSettings)]
    );

    console.log(`🚗 Tesla dashboard settings updated for ${userId}`);

    return res.status(200).json({
      success: true,
      settings: newSettings,
    });
  } catch (error) {
    console.error('Error updating Tesla settings:', error);
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
