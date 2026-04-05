import type { NextApiRequest, NextApiResponse } from 'next';

const QWEN_TTS_API = process.env.QWEN_TTS_API || 'http://100.108.41.22:4200';

// Get Qwen TTS endpoint from AI Inferencing database
async function getQwenTTSBaseUrl(): Promise<string> {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'ai_gateway_db',
      user: 'eleazar',
      password: '',
    });

    const result = await pool.query(
      'SELECT base_url FROM provider_endpoints WHERE endpoint_id = $1 AND is_active = true',
      ['qwen-tts-clone']
    );
    await pool.end();
    
    return result.rows[0]?.base_url || QWEN_TTS_API;
  } catch (error) {
    return QWEN_TTS_API;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get base URL from AI Inferencing database
  const baseUrl = await getQwenTTSBaseUrl();
  
  // Handle GET requests for health check and preset voices
  if (req.method === 'GET') {
    const { action } = req.query;

    try {
      if (action === 'health') {
        const response = await fetch(`${baseUrl}/health`);
        if (response.ok) {
          const data = await response.json();
          return res.status(200).json(data);
        }
        return res.status(response.status).json({ status: 'error' });
      }

      if (action === 'preset-voices') {
        const response = await fetch(`${baseUrl}/api/preset-voices`);
        if (response.ok) {
          const data = await response.json();
          return res.status(200).json(data);
        }
        return res.status(response.status).json({ presets: {} });
      }

      if (action === 'voices') {
        const response = await fetch(`${baseUrl}/api/voices`);
        if (response.ok) {
          const data = await response.json();
          return res.status(200).json(data);
        }
        return res.status(response.status).json({ voices: [] });
      }

      // Get library voices (Gemini TTS cloned voices)
      if (action === 'library-voices') {
        const response = await fetch(`${baseUrl}/api/library-voices`);
        if (response.ok) {
          const data = await response.json();
          return res.status(200).json(data);
        }
        return res.status(response.status).json({ voices: {}, count: 0 });
      }

      // Demo endpoint for library voices (serves pre-cloned Qwen3 samples)
      if (action === 'library-demo') {
        const { voice_id } = req.query;
        if (!voice_id || typeof voice_id !== 'string') {
          return res.status(400).json({ error: 'voice_id is required' });
        }
        const response = await fetch(`${baseUrl}/api/library-voices/${voice_id}/demo`);
        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Content-Disposition', `inline; filename=${voice_id}_demo.wav`);
          res.setHeader('X-Voice-Source', response.headers.get('X-Voice-Source') || 'qwen3-cloned');
          return res.send(Buffer.from(audioBuffer));
        }
        return res.status(response.status).json({ error: 'Voice not found' });
      }

      // Preview endpoint for library voices (serves Gemini TTS samples directly)
      if (action === 'library-preview') {
        const { voice_id } = req.query;
        if (!voice_id || typeof voice_id !== 'string') {
          return res.status(400).json({ error: 'voice_id is required' });
        }
        const response = await fetch(`${baseUrl}/api/library-voices/${voice_id}/preview`);
        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Content-Disposition', `inline; filename=${voice_id}_preview.wav`);
          return res.send(Buffer.from(audioBuffer));
        }
        return res.status(response.status).json({ error: 'Voice not found' });
      }

      // Get pre-cloned voice profile audio (Qwen3 cloned samples)
      if (action === 'profile-preview') {
        const { voice_id } = req.query;
        if (!voice_id || typeof voice_id !== 'string') {
          return res.status(400).json({ error: 'voice_id is required' });
        }
        const response = await fetch(`${baseUrl}/api/voices/profiles/${voice_id}`);
        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Content-Disposition', `inline; filename=${voice_id}_profile.wav`);
          return res.send(Buffer.from(audioBuffer));
        }
        return res.status(response.status).json({ error: 'Profile not found' });
      }

      // List all voice profiles with their status
      if (action === 'voice-profiles') {
        const response = await fetch(`${baseUrl}/api/voices/profiles`);
        if (response.ok) {
          const data = await response.json();
          return res.status(200).json(data);
        }
        return res.status(response.status).json({ profiles: [], count: 0 });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
      console.error('❌ Qwen TTS GET error:', error);
      return res.status(500).json({ error: 'Service unavailable' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      text, 
      voice, 
      speaker,
      language = 'Auto',
      mode = 'synthesize', // 'synthesize', 'voice-design', 'custom-voice', 'voice-clone'
      voice_description,
      instruct,
      temperature = 0.7,
      top_p = 0.9,
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log('🎙️ Qwen TTS Request:', {
      textLength: text.length,
      mode,
      voice: voice || speaker,
      language,
    });

    let endpoint: string;
    let body: any;

    switch (mode) {
      case 'voice-design':
        endpoint = `${baseUrl}/api/tts/voice-design`;
        body = {
          text,
          voice_description: voice_description || instruct || 'Speak in a natural, clear voice',
          language,
          temperature,
          top_p,
        };
        break;

      case 'custom-voice':
        endpoint = `${baseUrl}/api/tts/custom-voice`;
        body = {
          text,
          speaker: speaker || voice || 'ryan',
          instruct,
          language,
          temperature,
          top_p,
        };
        break;

      case 'clone-from-library':
        // Clone voice using Gemini sample as reference audio
        endpoint = `${baseUrl}/api/tts/clone-from-library`;
        body = {
          text,
          voice_id: req.body.voice_id,
          language,
          temperature,
          top_p,
        };
        break;

      case 'synthesize':
      default:
        endpoint = `${baseUrl}/api/tts/synthesize`;
        body = {
          text,
          voice_id: voice,
          language,
          temperature,
          top_p,
        };
        break;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

    // Get the audio buffer
    const audioBuffer = await response.arrayBuffer();

    console.log('✅ Qwen TTS generated successfully:', {
      size: audioBuffer.byteLength,
    });

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.byteLength.toString());
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('❌ Qwen TTS API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
};
