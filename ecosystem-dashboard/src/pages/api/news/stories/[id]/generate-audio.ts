import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const QWEN_TTS_URL = process.env.QWEN_TTS_URL || 'http://localhost:4200';

// Permanent storage location for news audio files (outside of public/ to survive rebuilds)
const NEWS_AUDIO_DIR = process.env.NEWS_AUDIO_DIR || '/home/eleazar/Projects/AIHomelab/data/audio/news-stories';

// Get Qwen TTS endpoint from AI Inferencing database
async function getQwenTTSEndpoint(): Promise<{ baseUrl: string }> {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'ai_gateway_db',
    user: 'eleazar',
    password: '',
  });

  try {
    const result = await pool.query(
      'SELECT base_url FROM provider_endpoints WHERE endpoint_id = $1 AND is_active = true',
      ['qwen-tts-clone']
    );
    await pool.end();
    return { baseUrl: result.rows[0]?.base_url || QWEN_TTS_URL };
  } catch (error) {
    await pool.end();
    return { baseUrl: QWEN_TTS_URL };
  }
}

// Get database pool for news stories
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

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Story ID is required' });
  }

  const { voice, speed = 1.0 } = req.body;

  const newsPool = getNewsPool();

  try {
    // Fetch the story with category for voice selection
    const storyResult = await newsPool.query(
      'SELECT id, title, headline, full_narrative, category FROM news.daily_stories WHERE id = $1',
      [id]
    );

    if (storyResult.rows.length === 0) {
      await newsPool.end();
      return res.status(404).json({ error: 'Story not found' });
    }

    const story = storyResult.rows[0];
    const text = story.full_narrative;

    if (!text || text.trim().length === 0) {
      await newsPool.end();
      return res.status(400).json({ error: 'Story has no content to generate audio from' });
    }

    // Fetch voice settings from news pipeline settings
    let voiceSettings = null;
    try {
      const settingsResult = await newsPool.query(
        `SELECT settings FROM news.pipeline_settings WHERE user_id = $1`,
        ['eleazar']
      );
      if (settingsResult.rows.length > 0) {
        voiceSettings = settingsResult.rows[0].settings?.voice;
      }
    } catch (e) {
      console.log('Could not fetch voice settings, using defaults');
    }

    // Select voice based on settings and category if not provided
    let selectedVoice = voice;
    let selectedProvider = 'qwen';
    if (!selectedVoice) {
      const { selectVoiceForStory } = await import('@/lib/news/voice-rotation');
      const voiceSelection = await selectVoiceForStory(story.category || 'general', newsPool, voiceSettings);
      selectedVoice = voiceSelection.voiceId;
      selectedProvider = voiceSelection.provider;
      console.log(`🎯 Auto-selected voice for ${story.category}: ${selectedVoice} (${selectedProvider}, mode: ${voiceSettings?.selection_mode || 'default'})`);
    }

    console.log(`🎙️ Generating audio for story: ${story.headline || story.title}`);
    console.log(`   Category: ${story.category}`);
    console.log(`   Text length: ${text.length} characters`);
    console.log(`   Voice: ${selectedVoice}`);

    // Get TTS endpoint
    const { baseUrl } = await getQwenTTSEndpoint();

    // Clean text for TTS (remove markdown)
    const cleanedText = text
      .replace(/##\s*/g, '')
      .replace(/###\s*/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[([0-9]+)\]/g, '')
      .trim();

    // Call Qwen TTS API
    const ttsResponse = await fetch(`${baseUrl}/api/tts/clone-from-library`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: cleanedText,
        voice_id: selectedVoice,
        language: 'English',
        temperature: 0.4,
        top_p: 0.85,
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('❌ TTS generation failed:', errorText);
      await newsPool.end();
      return res.status(500).json({ 
        error: 'Audio generation failed', 
        message: errorText 
      });
    }

    // Get audio buffer
    const audioBuffer = await ttsResponse.arrayBuffer();
    
    // Calculate duration (assuming 24kHz, 16-bit mono WAV)
    // WAV header is 44 bytes, then data
    const dataSize = audioBuffer.byteLength - 44;
    const durationSeconds = Math.round(dataSize / (24000 * 2)); // 24kHz, 16-bit

    // Save audio file to permanent storage directory
    if (!fs.existsSync(NEWS_AUDIO_DIR)) {
      fs.mkdirSync(NEWS_AUDIO_DIR, { recursive: true });
    }
    
    const audioFilename = `${id}.wav`;
    const audioFilePath = path.join(NEWS_AUDIO_DIR, audioFilename);
    fs.writeFileSync(audioFilePath, Buffer.from(audioBuffer));
    
    // URL path for the audio file (served via API endpoint)
    const audioUrl = `/api/news/stories/${id}/audio`;

    // Update story with audio URL and voice_id
    await newsPool.query(
      'UPDATE news.daily_stories SET audio_url = $1, audio_duration_seconds = $2, voice_id = $3 WHERE id = $4',
      [audioUrl, durationSeconds, selectedVoice, id]
    );

    await newsPool.end();

    console.log(`✅ Audio generated successfully: ${durationSeconds}s, saved to ${audioFilePath}`);

    return res.status(200).json({
      success: true,
      audioUrl,
      durationSeconds,
      voiceId: selectedVoice,
      storyId: id,
    });

  } catch (error) {
    console.error('❌ Audio generation error:', error);
    await newsPool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
