import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';

const QWEN_TTS_API = process.env.QWEN_TTS_API || 'http://localhost:4200';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({ multiples: false });
    
    const [fields, files] = await form.parse(req);
    
    const text = Array.isArray(fields.text) ? fields.text[0] : fields.text;
    const language = Array.isArray(fields.language) ? fields.language[0] : fields.language || 'Auto';
    const refText = Array.isArray(fields.ref_text) ? fields.ref_text[0] : fields.ref_text || '';
    const temperature = Array.isArray(fields.temperature) ? fields.temperature[0] : fields.temperature || '0.7';
    const topP = Array.isArray(fields.top_p) ? fields.top_p[0] : fields.top_p || '0.9';
    
    const referenceAudio = Array.isArray(files.reference_audio) 
      ? files.reference_audio[0] 
      : files.reference_audio;

    if (!text || !referenceAudio) {
      return res.status(400).json({ error: 'Text and reference audio are required' });
    }

    // Create form data for the backend
    const formData = new FormData();
    formData.append('text', text);
    formData.append('language', language);
    formData.append('ref_text', refText);
    formData.append('temperature', temperature);
    formData.append('top_p', topP);
    formData.append('reference_audio', fs.createReadStream(referenceAudio.filepath), {
      filename: referenceAudio.originalFilename || 'audio.wav',
      contentType: referenceAudio.mimetype || 'audio/wav',
    });

    console.log('🎤 Voice Clone Request:', { textLength: text.length, language });

    const response = await fetch(`${QWEN_TTS_API}/api/tts/voice-clone`, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders(),
    });

    // Clean up temp file
    fs.unlink(referenceAudio.filepath, () => {});

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Voice clone error:', errorText);
      return res.status(response.status).json({ error: 'Voice clone failed', details: errorText });
    }

    const audioBuffer = await response.arrayBuffer();
    
    console.log('✅ Voice cloned successfully:', { size: audioBuffer.byteLength });

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.byteLength.toString());
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('❌ Voice clone API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
