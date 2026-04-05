/**
 * Child TTS Preferences API
 * 
 * Get and update TTS voice/playback preferences for children
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

import { ALL_TTS_VOICES, getVoicesForTheme, getVoiceById, TTSVoice } from '@/lib/platform/tts-voices-config';

// Get voices for a user based on their theme
async function getVoicesForUser(userId: string): Promise<{ id: string; name: string; gender: string; description: string; emoji: string; theme: string | null }[]> {
  try {
    // Get user's theme
    const themeResult = await pool.query(
      'SELECT theme FROM child_accounts WHERE user_id = $1',
      [userId]
    );
    const userTheme = themeResult.rows[0]?.theme || null;
    
    // Get voices for this theme (includes universal voices)
    const voices = getVoicesForTheme(userTheme);
    
    return voices.map(v => ({
      id: v.id,
      name: v.name,
      gender: v.gender,
      description: v.description,
      emoji: v.emoji,
      theme: v.theme,
    }));
  } catch (error) {
    console.log('[TTS Preferences] Error getting voices for user:', error);
    // Return universal voices as fallback
    return ALL_TTS_VOICES.filter(v => v.theme === null).map(v => ({
      id: v.id,
      name: v.name,
      gender: v.gender,
      description: v.description,
      emoji: v.emoji,
      theme: v.theme,
    }));
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;

  switch (req.method) {
    case 'GET':
      return getPreferences(userId, res);
    case 'PUT':
      return updatePreferences(userId, req.body, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getPreferences(userId: string, res: NextApiResponse) {
  try {
    // Get or create preferences
    let result = await pool.query(`
      SELECT * FROM child_learning.tts_preferences WHERE child_user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      // Create default preferences
      result = await pool.query(`
        INSERT INTO child_learning.tts_preferences (child_user_id)
        VALUES ($1)
        RETURNING *
      `, [userId]);
    }

    const prefs = result.rows[0];

    return res.status(200).json({
      preferences: {
        voiceId: prefs.voice_id,
        voiceName: prefs.voice_name,
        voiceGender: prefs.voice_gender,
        speed: parseFloat(prefs.speed),
        pitch: parseFloat(prefs.pitch),
        volume: parseFloat(prefs.volume),
        autoReadChatResponses: prefs.auto_read_chat_responses,
        autoReadBookPages: prefs.auto_read_book_pages,
        highlightWordsWhileReading: prefs.highlight_words_while_reading,
        readingSpeedPreference: prefs.reading_speed_preference,
      },
      availableVoices: await getVoicesForUser(userId),
    });

  } catch (error) {
    console.error('[Child TTS Preferences] Error:', error);
    return res.status(500).json({ error: 'Failed to get preferences' });
  }
}

async function updatePreferences(userId: string, updates: any, res: NextApiResponse) {
  try {
    const allowedFields: Record<string, string> = {
      voiceId: 'voice_id',
      voiceName: 'voice_name',
      voiceGender: 'voice_gender',
      speed: 'speed',
      pitch: 'pitch',
      volume: 'volume',
      autoReadChatResponses: 'auto_read_chat_responses',
      autoReadBookPages: 'auto_read_book_pages',
      highlightWordsWhileReading: 'highlight_words_while_reading',
      readingSpeedPreference: 'reading_speed_preference',
    };

    const setClauses: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbField = allowedFields[key];
      if (dbField && value !== undefined) {
        // Validate voice exists in our configuration
        if (key === 'voiceId') {
          const validVoice = getVoiceById(value as string);
          if (!validVoice && value !== 'default') continue;
        }
        
        // Validate speed/pitch ranges
        if (key === 'speed' || key === 'pitch') {
          const numVal = parseFloat(value as string);
          if (numVal < 0.5 || numVal > 2.0) continue;
        }

        values.push(value);
        setClauses.push(`${dbField} = $${paramIndex++}`);
      }
    }

    if (values.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(userId);

    // Upsert preferences
    await pool.query(`
      INSERT INTO child_learning.tts_preferences (child_user_id)
      VALUES ($${paramIndex})
      ON CONFLICT (child_user_id) DO UPDATE
      SET ${setClauses.join(', ')}
    `, values);

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[Child TTS Preferences] Error updating:', error);
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
}
