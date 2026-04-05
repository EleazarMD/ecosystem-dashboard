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
  // DELETE voice profile
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Voice ID is required' });
    }

    try {
      const response = await fetch(`${QWEN_TTS_API}/api/voices/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to delete voice' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('❌ Delete voice error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST - Save new voice profile
  if (req.method === 'POST') {
    try {
      const form = formidable({ multiples: false });
      const [fields, files] = await form.parse(req);

      const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
      const description = Array.isArray(fields.description) ? fields.description[0] : fields.description || '';
      const language = Array.isArray(fields.language) ? fields.language[0] : fields.language || 'Auto';
      const designInstruct = Array.isArray(fields.design_instruct) ? fields.design_instruct[0] : fields.design_instruct || '';
      const tags = Array.isArray(fields.tags) ? fields.tags[0] : fields.tags || '';

      const referenceAudio = files.reference_audio 
        ? (Array.isArray(files.reference_audio) ? files.reference_audio[0] : files.reference_audio)
        : null;

      if (!name) {
        return res.status(400).json({ error: 'Voice name is required' });
      }

      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('language', language);
      formData.append('design_instruct', designInstruct);
      formData.append('tags', tags);

      if (referenceAudio) {
        formData.append('reference_audio', fs.createReadStream(referenceAudio.filepath), {
          filename: referenceAudio.originalFilename || 'audio.wav',
          contentType: referenceAudio.mimetype || 'audio/wav',
        });
      }

      console.log('💾 Save Voice Request:', { name, language });

      const response = await fetch(`${QWEN_TTS_API}/api/voices`, {
        method: 'POST',
        body: formData as any,
        headers: formData.getHeaders(),
      });

      // Clean up temp file
      if (referenceAudio) {
        fs.unlink(referenceAudio.filepath, () => {});
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Save voice error:', errorText);
        return res.status(response.status).json({ error: 'Failed to save voice', details: errorText });
      }

      const data = await response.json();
      console.log('✅ Voice saved successfully:', data);

      return res.status(200).json(data);
    } catch (error) {
      console.error('❌ Save voice API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
