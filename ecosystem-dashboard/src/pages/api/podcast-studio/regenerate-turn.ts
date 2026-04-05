import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '@/lib/db/podcast-studio-db';
import fs from 'fs';
import path from 'path';

/**
 * API endpoint to regenerate a single turn's audio
 * Stores the clip separately and updates the episode's segments metadata
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    episodeId,
    turnIndex,
    text,
    speaker,
    voiceId,
    voiceProvider,
    ttsModel,
    language,
    speakerGender,
  } = req.body;

  if (!episodeId || turnIndex === undefined || !text || !speaker) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    console.log(`🔄 Regenerating turn ${turnIndex} for episode ${episodeId}`);

    // 1. Fetch current episode segments
    const episodeQuery = await pool.query(
      'SELECT segments, project_id FROM podcast.audio_generations WHERE id = $1',
      [episodeId]
    );

    if (episodeQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const episode = episodeQuery.rows[0];
    let segments = episode.segments || { turns: [], totalDuration: 0, version: 1 };

    // 2. Generate new audio for this turn using TTS
    const audioBuffer = await generateTurnAudio({
      text,
      speaker,
      voiceId,
      voiceProvider: voiceProvider || 'gemini',
      ttsModel: ttsModel || 'gemini-2.5-flash-preview-tts',
      language: language || 'english',
      speakerGender,
    });

    // 3. Save audio clip to disk
    const episodeDir = path.join(process.cwd(), 'public', 'audio', 'episodes', episodeId);
    if (!fs.existsSync(episodeDir)) {
      fs.mkdirSync(episodeDir, { recursive: true });
    }

    const turnFileName = `turn_${turnIndex}.mp3`;
    const turnFilePath = path.join(episodeDir, turnFileName);
    fs.writeFileSync(turnFilePath, audioBuffer);

    const audioPath = `/audio/episodes/${episodeId}/${turnFileName}`;
    const duration = await getAudioDuration(audioBuffer);

    console.log(`✅ Saved turn ${turnIndex} audio: ${audioPath} (${duration}s)`);

    // 4. Update segments metadata
    if (!segments.turns) segments.turns = [];
    
    // Calculate new start/end times
    let cumulativeTime = 0;
    for (let i = 0; i < segments.turns.length; i++) {
      if (i < turnIndex) {
        cumulativeTime += segments.turns[i].duration || 0;
      }
    }

    const updatedTurn = {
      index: turnIndex,
      speaker,
      text,
      audioPath,
      duration,
      startTime: cumulativeTime,
      endTime: cumulativeTime + duration,
      voiceId: voiceId || 'unknown',
      voiceProvider: voiceProvider || 'gemini',
      lastModified: new Date().toISOString(),
    };

    // Insert or update turn in segments
    if (segments.turns[turnIndex]) {
      segments.turns[turnIndex] = updatedTurn;
    } else {
      segments.turns[turnIndex] = updatedTurn;
    }

    // Recalculate cumulative times for all subsequent turns
    cumulativeTime = updatedTurn.endTime;
    for (let i = turnIndex + 1; i < segments.turns.length; i++) {
      segments.turns[i].startTime = cumulativeTime;
      segments.turns[i].endTime = cumulativeTime + (segments.turns[i].duration || 0);
      cumulativeTime = segments.turns[i].endTime;
    }

    segments.totalDuration = cumulativeTime;
    segments.version = (segments.version || 1) + 1;

    // 5. Update database
    await pool.query(
      'UPDATE podcast.audio_generations SET segments = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(segments), episodeId]
    );

    console.log(`✅ Updated episode ${episodeId} segments (version ${segments.version})`);

    return res.status(200).json({
      success: true,
      turn: updatedTurn,
      segments,
    });
  } catch (error) {
    console.error('❌ Error regenerating turn:', error);
    return res.status(500).json({
      error: 'Failed to regenerate turn',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Generate audio for a single turn using TTS
 */
async function generateTurnAudio(params: {
  text: string;
  speaker: string;
  voiceId: string;
  voiceProvider: string;
  ttsModel: string;
  language: string;
  speakerGender?: string;
}): Promise<Buffer> {
  const { text, voiceId, voiceProvider, ttsModel, language, speakerGender } = params;

  console.log(`🎙️ Generating audio with ${voiceProvider} (${ttsModel})`);

  if (voiceProvider === 'gemini' || ttsModel.startsWith('gemini-')) {
    // Use Gemini TTS
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY || '',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Generate speech for: ${text}`,
          }],
        }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceId,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini TTS failed: ${response.statusText}`);
    }

    const data = await response.json();
    const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      throw new Error('No audio data in Gemini response');
    }

    return Buffer.from(audioBase64, 'base64');
  } else {
    // Use Qwen TTS via gateway
    const response = await fetch('/api/ai-gateway/qwen-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: voiceId,
        language,
        gender: speakerGender,
      }),
    });

    if (!response.ok) {
      throw new Error(`Qwen TTS failed: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

/**
 * Get audio duration from buffer (simplified - would use ffprobe in production)
 */
async function getAudioDuration(buffer: Buffer): Promise<number> {
  // TODO: Use ffprobe or audio library to get actual duration
  // For now, estimate based on file size (rough approximation)
  const estimatedDuration = buffer.length / 16000; // ~16KB per second for MP3
  return Math.max(0.1, estimatedDuration);
}
