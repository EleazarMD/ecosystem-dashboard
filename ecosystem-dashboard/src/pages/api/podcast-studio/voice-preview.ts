import type { NextApiRequest, NextApiResponse } from 'next';
import { generateTTS } from './tts-providers';

interface VoicePreviewRequest {
  text: string;
  voiceName: string;
  voiceProvider: 'qwen' | 'gemini' | 'openai' | 'library';
  speakingRate?: number;
  pitch?: number;
  ttsModel?: string;
}

// Get Qwen TTS endpoint from AI Inferencing database
async function getQwenTTSBaseUrl(): Promise<string> {
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.AI_GATEWAY_DB || 'ai_gateway_db',
    user: process.env.POSTGRES_USER || 'eleazar',
    password: process.env.POSTGRES_PASSWORD || '',
  });

  const result = await pool.query(
    'SELECT base_url FROM provider_endpoints WHERE endpoint_id = $1 AND is_active = true',
    ['qwen-tts-clone']
  );
  await pool.end();
  
  if (!result.rows[0]?.base_url) {
    throw new Error('Qwen TTS endpoint not configured in AI Inferencing');
  }
  
  return result.rows[0].base_url;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, voiceName, voiceProvider = 'qwen', speakingRate = 1.0, pitch = 0, ttsModel } = req.body as VoicePreviewRequest;
  const useGeminiDirect = ttsModel?.startsWith('gemini-');

  if (!text || !voiceName) {
    return res.status(400).json({ error: 'Missing required fields: text, voiceName' });
  }

  try {
    // Route 1: Direct Gemini TTS (when Gemini model is selected)
    if (useGeminiDirect && voiceProvider === 'gemini') {
      console.log(`🔵 Gemini TTS preview: voice=${voiceName}, model=${ttsModel}`);
      
      const audioBuffer = await generateTTS(
        text,
        voiceName,
        'gemini',
        speakingRate,
        pitch,
        ttsModel
      );

      console.log('✅ Gemini TTS preview generated:', audioBuffer.length, 'bytes');
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', audioBuffer.length);
      return res.send(audioBuffer);

    // Route 2: Qwen TTS (library voices)
    } else if (voiceProvider === 'qwen' || voiceProvider === 'gemini' || voiceProvider === 'library') {
      const baseUrl = await getQwenTTSBaseUrl();
      
      // Map Gemini voice names to Qwen library voice IDs if needed
      const voiceId = voiceName.includes('_') ? voiceName : mapToQwenVoice(voiceName);
      
      console.log('🎙️ Qwen TTS Request:', { text: text.substring(0, 50), voiceId, baseUrl });
      
      // Call Qwen TTS directly
      const response = await fetch(`${baseUrl}/api/tts/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          language: 'Auto',
          temperature: 0.7,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Qwen TTS error:', response.status, errorText);
        return res.status(response.status).json({ 
          error: 'Qwen TTS failed', 
          details: errorText.substring(0, 200) 
        });
      }

      // Return audio directly
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      console.log('✅ Qwen TTS generated:', audioBuffer.length, 'bytes');
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', audioBuffer.length);
      return res.send(audioBuffer);

    } else if (voiceProvider === 'openai') {
      // Use OpenAI TTS as fallback
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
      }

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: voiceName.toLowerCase(),
          speed: speakingRate,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI TTS error:', errorText);
        return res.status(response.status).json({ 
          error: 'OpenAI TTS failed', 
          details: errorText.substring(0, 200) 
        });
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      res.setHeader('Content-Type', 'audio/mp3');
      res.setHeader('Content-Length', audioBuffer.length);
      return res.send(audioBuffer);

    } else {
      return res.status(400).json({ error: `Unknown voice provider: ${voiceProvider}` });
    }
  } catch (error) {
    console.error('Voice preview error:', error);
    return res.status(500).json({ 
      error: 'Voice preview generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Map Gemini voice names to Qwen library voice IDs
// These must match actual voices in the Qwen TTS library
function mapToQwenVoice(geminiVoiceName: string): string {
  const voiceMap: Record<string, string> = {
    'Charon': 'american_male_anchor',
    'Fenrir': 'american_male_gravelly',
    'Orus': 'american_male_narrator',
    'Puck': 'american_male_refined',
    'Kore': 'american_female_warm',
    'Zephyr': 'american_male_smooth',
    'Aoede': 'british_female_warm',
    'Leda': 'british_female_anchor',
    'Elara': 'british_female_refined',
    'Nova': 'american_female_confident',
    'Sulafat': 'mexican_female_warm',
    'Gacrux': 'spanish_female_elegant',
  };
  
  return voiceMap[geminiVoiceName] || 'american_male_refined';
}
