/**
 * Child TTS API - Text-to-Speech for Kids Portal
 * 
 * Provides read-aloud functionality for books, chat responses, and documents
 * Integrates with parental controls and usage tracking
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Chatterbox TTS - Local self-hosted TTS service
// CPU version runs on 4123, GPU version on 5003
const CHATTERBOX_URL = process.env.CHATTERBOX_TTS_URL || 'http://localhost:4123';

import { ALL_TTS_VOICES, getVoiceById, getDefaultVoiceForTheme, getChatterboxParams } from '@/lib/platform/tts-voices-config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;

  try {
    // Check if user is a child and if TTS is allowed
    const userResult = await pool.query(`
      SELECT u.account_type, pc.allowed_services, pc.blocked_services, pc.is_active
      FROM users u
      LEFT JOIN parental_controls_config pc ON pc.child_user_id = u.id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Check parental controls for TTS access
    if (user.account_type === 'child' && user.is_active) {
      const allowedServices = user.allowed_services || [];
      const blockedServices = user.blocked_services || [];

      if (blockedServices.includes('tts') || blockedServices.includes('read-aloud')) {
        return res.status(403).json({ 
          error: 'Read aloud is not available right now',
          reason: 'blocked_by_parent'
        });
      }

      // If allowedServices is set and doesn't include TTS, block
      if (allowedServices.length > 0 && 
          !allowedServices.includes('tts') && 
          !allowedServices.includes('read-aloud') &&
          !allowedServices.includes('*')) {
        return res.status(403).json({ 
          error: 'Read aloud is not available right now',
          reason: 'not_in_allowed_list'
        });
      }
    }

    const { text, voiceId, speed, pitch, sourceType, sourceId } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Limit text length for children (prevent abuse)
    const maxLength = 5000;
    const cleanText = text.slice(0, maxLength);

    // Get user's theme for voice selection
    const themeResult = await pool.query(
      'SELECT theme FROM child_accounts WHERE user_id = $1',
      [userId]
    );
    const userTheme = themeResult.rows[0]?.theme || null;

    // Get user's TTS preferences or use defaults
    let preferences = {
      voice_id: voiceId || 'default',
      speed: speed || 1.0,
      pitch: pitch || 1.0,
    };

    const prefsResult = await pool.query(`
      SELECT voice_id, speed, pitch FROM child_learning.tts_preferences
      WHERE child_user_id = $1
    `, [userId]);

    if (prefsResult.rows.length > 0) {
      const userPrefs = prefsResult.rows[0];
      preferences = {
        voice_id: voiceId || userPrefs.voice_id || 'Zephyr',
        speed: speed || userPrefs.speed || 1.0,
        pitch: pitch || userPrefs.pitch || 1.0,
      };
    }

    // Validate voice exists in our voice configuration
    const validVoice = getVoiceById(preferences.voice_id);
    if (!validVoice) {
      // Get default voice based on user's theme
      const defaultVoice = getDefaultVoiceForTheme(userTheme);
      preferences.voice_id = defaultVoice.id;
    }

    // Check cache first
    const contentHash = crypto.createHash('sha256').update(cleanText).digest('hex');
    const cacheResult = await pool.query(`
      SELECT audio_url, audio_duration_seconds 
      FROM child_learning.tts_cache
      WHERE content_hash = $1 AND voice_id = $2 AND speed = $3 AND pitch = $4
        AND expires_at > NOW()
    `, [contentHash, preferences.voice_id, preferences.speed, preferences.pitch]);

    if (cacheResult.rows.length > 0) {
      // Update cache access count
      await pool.query(`
        UPDATE child_learning.tts_cache 
        SET access_count = access_count + 1, last_accessed_at = NOW()
        WHERE content_hash = $1 AND voice_id = $2
      `, [contentHash, preferences.voice_id]);

      // Log usage
      await logTTSUsage(userId, cleanText.length, cacheResult.rows[0].audio_duration_seconds, 
        preferences.voice_id, sourceType, sourceId);

      return res.status(200).json({
        audioUrl: cacheResult.rows[0].audio_url,
        duration: cacheResult.rows[0].audio_duration_seconds,
        cached: true,
      });
    }

    // Get voice-specific Chatterbox parameters
    const voiceConfig = validVoice || getDefaultVoiceForTheme(userTheme);
    const chatterboxParams = getChatterboxParams(voiceConfig);

    console.log('[Child TTS] Calling Chatterbox at:', CHATTERBOX_URL);
    console.log('[Child TTS] Voice config:', voiceConfig?.id, 'Params:', chatterboxParams);
    console.log('[Child TTS] Text length:', cleanText.length);

    // Call Chatterbox TTS (local, self-hosted)
    let ttsResponse;
    try {
      ttsResponse = await fetch(`${CHATTERBOX_URL}/v1/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: cleanText,
          voice: preferences.voice_id === 'default' ? undefined : preferences.voice_id,
          // Character-specific Chatterbox parameters
          exaggeration: chatterboxParams.exaggeration,
          cfg_weight: chatterboxParams.cfg_weight,
          temperature: chatterboxParams.temperature,
        }),
      });
      console.log('[Child TTS] Chatterbox response status:', ttsResponse.status);
    } catch (fetchError) {
      console.error('[Child TTS] Fetch error:', fetchError);
      return res.status(200).json({
        text: cleanText,
        useBrowserTTS: true,
        error: 'Chatterbox connection failed',
      });
    }

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('[Child TTS] Chatterbox error:', ttsResponse.status, errorText);
      
      // Fallback: return text for browser TTS
      return res.status(200).json({
        text: cleanText,
        useBrowserTTS: true,
        voice: preferences.voice_id,
        speed: preferences.speed,
        pitch: preferences.pitch,
      });
    }

    // Get audio as base64
    const audioBuffer = await ttsResponse.arrayBuffer();
    console.log('[Child TTS] Audio buffer size:', audioBuffer.byteLength);
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    // Chatterbox returns WAV format, not MP3
    const audioDataUrl = `data:audio/wav;base64,${audioBase64}`;
    console.log('[Child TTS] Audio data URL length:', audioDataUrl.length);

    // Estimate duration (rough: ~150 words per minute, ~5 chars per word)
    const estimatedDuration = (cleanText.length / 5 / 150) * 60;

    // Cache the audio (store as data URL for simplicity)
    await pool.query(`
      INSERT INTO child_learning.tts_cache (content_hash, voice_id, speed, pitch, audio_url, audio_duration_seconds)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (content_hash, voice_id, speed, pitch) 
      DO UPDATE SET access_count = child_learning.tts_cache.access_count + 1, last_accessed_at = NOW()
    `, [contentHash, preferences.voice_id, preferences.speed, preferences.pitch, audioDataUrl, estimatedDuration]);

    // Log usage
    await logTTSUsage(userId, cleanText.length, estimatedDuration, preferences.voice_id, sourceType, sourceId);

    return res.status(200).json({
      audioUrl: audioDataUrl,
      duration: estimatedDuration,
      cached: false,
    });

  } catch (error) {
    console.error('[Child TTS] Error:', error);
    // Return browser TTS fallback instead of 500 error
    return res.status(200).json({ 
      text: req.body.text || 'Error generating speech',
      useBrowserTTS: true,
      error: String(error),
    });
  }
}

async function logTTSUsage(
  userId: string,
  textLength: number,
  duration: number,
  voiceId: string,
  sourceType?: string,
  sourceId?: string
): Promise<void> {
  try {
    await pool.query(`
      INSERT INTO child_learning.tts_usage (child_user_id, text_length, audio_duration_seconds, voice_id, source_type, source_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, textLength, duration, voiceId, sourceType || 'unknown', sourceId]);
  } catch (error) {
    console.error('[Child TTS] Failed to log usage:', error);
  }
}
