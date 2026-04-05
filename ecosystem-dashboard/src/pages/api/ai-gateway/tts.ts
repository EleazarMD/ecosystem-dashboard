import type { NextApiRequest, NextApiResponse } from 'next';

const AI_INFERENCING_URL = process.env.AI_INFERENCING_URL || 'http://localhost:9000';
const QWEN_TTS_URL = process.env.QWEN_TTS_URL || 'http://100.108.41.22:4200';

// Voice mapping: Gemini voice names to Qwen TTS library voice IDs
const VOICE_MAPPING: Record<string, string> = {
  // Default/fallback
  'Puck': 'american_male_anchor',
  'Kore': 'british_female_refined',
  'Aoede': 'british_female_warm',
  'Leda': 'british_female_anchor',
  'Zephyr': 'american_male_narrator',
  // Direct mappings for library voices
  'american_male_anchor': 'american_male_anchor',
  'american_male_executive': 'american_male_executive',
  'american_male_narrator': 'american_male_narrator',
  'american_female_warm': 'american_female_warm',
  'american_female_confident': 'american_female_confident',
  'american_female_sophisticated': 'american_female_sophisticated',
  'british_female_anchor': 'british_female_anchor',
  'british_female_refined': 'british_female_refined',
  'british_female_warm': 'british_female_warm',
  'mexican_female_warm': 'mexican_female_warm',
  'mexican_female_passionate': 'mexican_female_passionate',
  'mexican_male_warm': 'mexican_male_warm',
  'mexican_male_narrator': 'mexican_male_narrator',
  'mexican_male_professional': 'mexican_male_professional',
  'spanish_female_elegant': 'spanish_female_elegant',
};

// Get Qwen TTS endpoint info from AI Inferencing database
async function getQwenTTSEndpoint(): Promise<{ baseUrl: string; apiKey: string }> {
  const { Pool } = require('pg');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'ai_gateway_db',
    user: 'eleazar',
    password: '',
  });

  try {
    // Get endpoint URL from provider_endpoints
    const endpointResult = await pool.query(
      'SELECT base_url FROM provider_endpoints WHERE endpoint_id = $1 AND is_active = true',
      ['qwen-tts-clone']
    );
    
    // Get API key from api_keys_multi_tenant
    const keyResult = await pool.query(
      'SELECT metadata FROM api_keys_multi_tenant WHERE provider = $1 AND is_active = true',
      ['qwen-tts']
    );
    
    await pool.end();
    
    const baseUrl = endpointResult.rows[0]?.base_url || QWEN_TTS_URL;
    const apiKey = keyResult.rows[0]?.metadata?.api_key || 'qwen-tts-local';
    
    return { baseUrl, apiKey };
  } catch (error) {
    await pool.end();
    // Fallback to environment variable
    return { baseUrl: QWEN_TTS_URL, apiKey: 'qwen-tts-local' };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, voice = 'american_male_anchor', language = 'English', temperature = 0.4, top_p = 0.85 } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Map voice name to Qwen TTS library voice ID
    const voiceId = VOICE_MAPPING[voice] || voice;
    
    // Detect language from voice ID
    const detectedLanguage = voiceId.includes('mexican') || voiceId.includes('spanish') ? 'Spanish' : language;

    console.log('🎙️ TTS Request (Qwen3):', {
      textLength: text.length,
      voice,
      voiceId,
      language: detectedLanguage,
    });

    // Get Qwen TTS endpoint from AI Inferencing database
    const { baseUrl, apiKey } = await getQwenTTSEndpoint();

    // Call Qwen TTS API for voice cloning
    const response = await fetch(`${baseUrl}/api/tts/clone-from-library`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-Service-ID': 'voice-studio',
        'X-Project-ID': 'podcast-studio',
      },
      body: JSON.stringify({
        text,
        voice_id: voiceId,
        language: detectedLanguage,
        temperature,
        top_p,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Qwen TTS error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return res.status(response.status).json({
        error: `TTS generation failed: ${response.statusText}`,
        details: errorText,
      });
    }

    // Qwen TTS returns WAV directly
    const audioBuffer = await response.arrayBuffer();

    console.log('✅ TTS generated successfully (Qwen3):', {
      wavSize: audioBuffer.byteLength,
      voiceId,
    });

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.byteLength.toString());
    res.setHeader('X-TTS-Provider', 'qwen3');
    res.setHeader('X-Voice-ID', voiceId);
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('❌ TTS API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
