/**
 * POST /api/nova/tts
 *
 * Server-side proxy to Qwen TTS /api/tts/synthesize (port 4200).
 * Same endpoint the iOS QwenTTSService uses — no parameters changed.
 * Returns audio/wav binary; client creates a Blob URL and plays it.
 *
 * Body:    { text: string, voice_id?: string }
 * Response: audio/wav (16-bit PCM, mono, 24 kHz)
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const QWEN_TTS_URL = process.env.QWEN_TTS_URL || 'http://127.0.0.1:4200';
const DEFAULT_VOICE = process.env.NOVA_TTS_VOICE || 'american_female_warm';

export const config = { api: { responseLimit: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, voice_id } = req.body ?? {};
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text is required' });

  try {
    const upstream = await fetch(`${QWEN_TTS_URL}/api/tts/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 3000), voice_id: voice_id || DEFAULT_VOICE }),
    });

    if (!upstream.ok) {
      const err = await upstream.text().catch(() => 'Qwen TTS unavailable');
      console.error('[Nova/tts] upstream error:', upstream.status, err);
      return res.status(502).json({ error: 'TTS service error', detail: err });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', buf.byteLength);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buf);
  } catch (error: any) {
    console.error('[Nova/tts] error:', error.message);
    return res.status(500).json({ error: 'Internal error', detail: error.message });
  }
}
