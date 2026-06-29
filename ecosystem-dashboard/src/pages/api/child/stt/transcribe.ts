/**
 * Child STT API - Speech-to-Text for Kids Portal
 *
 * Proxies audio to Parakeet STT running on the RTX workstation.
 * Includes parental control checks and usage tracking.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Parakeet STT on RTX workstation — try dedicated STT endpoint first,
// fall back to companion API's voice endpoint
const PARAKEET_STT_URL = process.env.PARAKEET_STT_URL || '';
const RTX_COMPANION_URL = process.env.RTX_COMPANION_URL || 'https://rtx-workstation.tailb64e64.ts.net:8031';

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
    // Check if user is a child and if STT is allowed
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

    // Check parental controls for STT access
    if (user.account_type === 'child' && user.is_active) {
      const allowedServices = user.allowed_services || [];
      const blockedServices = user.blocked_services || [];

      if (blockedServices.includes('stt') || blockedServices.includes('voice-input')) {
        return res.status(403).json({
          error: 'Voice input is not available right now',
          reason: 'blocked_by_parent',
        });
      }

      if (allowedServices.length > 0 &&
          !allowedServices.includes('stt') &&
          !allowedServices.includes('voice-input') &&
          !allowedServices.includes('*')) {
        return res.status(403).json({
          error: 'Voice input is not available right now',
          reason: 'not_in_allowed_list',
        });
      }
    }

    const { audio_base64, mimeType } = req.body;

    if (!audio_base64 || typeof audio_base64 !== 'string') {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    // Limit audio size (base64 encoded, ~10MB max)
    const maxSize = 10 * 1024 * 1024 * 1.37; // base64 overhead ~37%
    if (audio_base64.length > maxSize) {
      return res.status(413).json({ error: 'Audio too long (max 10MB)' });
    }

    console.log('[Child STT] Transcribing audio, size:', audio_base64.length, 'bytes (base64)');

    let transcript = '';

    // Try dedicated Parakeet STT endpoint first
    if (PARAKEET_STT_URL) {
      try {
        const sttResponse = await fetch(`${PARAKEET_STT_URL}/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_base64,
            mime_type: mimeType || 'audio/webm',
          }),
        });

        if (sttResponse.ok) {
          const result = await sttResponse.json();
          transcript = result.text || result.transcript || '';
        }
      } catch (err) {
        console.error('[Child STT] Parakeet STT endpoint failed:', err);
      }
    }

    // Fall back to companion API voice endpoint (extracts transcript only)
    if (!transcript) {
      try {
        const voiceResponse = await fetch(`${RTX_COMPANION_URL}/voice/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_base64,
            mime_type: mimeType || 'audio/webm',
          }),
        });

        if (voiceResponse.ok) {
          const result = await voiceResponse.json();
          transcript = result.text || result.transcript || '';
        } else {
          // Last resort: use voice/chat endpoint and extract transcript
          const chatResponse = await fetch(`${RTX_COMPANION_URL}/voice/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio_base64,
              user_id: `child_${userId}`,
              tts_provider: 'qwen',
              transcribe_only: true,
            }),
          });

          if (chatResponse.ok) {
            const result = await chatResponse.json();
            transcript = result.transcript || '';
          }
        }
      } catch (err) {
        console.error('[Child STT] Companion API failed:', err);
      }
    }

    if (!transcript) {
      return res.status(200).json({
        transcript: '',
        error: 'Could not transcribe audio. Please try again.',
      });
    }

    // Log STT usage
    try {
      await pool.query(`
        INSERT INTO child_learning.activity_log (child_user_id, activity_type, details)
        VALUES ($1, 'stt_usage', $2)
      `, [userId, JSON.stringify({ transcript_length: transcript.length, audio_size: audio_base64.length })]);
    } catch (logErr) {
      console.error('[Child STT] Failed to log usage:', logErr);
    }

    console.log('[Child STT] Transcript:', transcript.substring(0, 100));

    return res.status(200).json({
      transcript,
    });

  } catch (error) {
    console.error('[Child STT] Error:', error);
    return res.status(500).json({
      error: 'Transcription failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
