import type { NextApiRequest, NextApiResponse } from 'next';
import { DEFAULT_AUDIO_PRESETS } from '@/lib/audio-presets';

/**
 * API endpoint for managing audio presets
 * 
 * GET: List all audio presets (default + custom)
 * POST: Create a new custom audio preset
 * PUT: Update a custom audio preset
 * DELETE: Delete a custom audio preset
 */

// Use globalThis for persistence across hot reloads
const globalForPresets = globalThis as unknown as {
  customAudioPresets: any[] | undefined;
};

const customAudioPresets = globalForPresets.customAudioPresets ?? [];

if (process.env.NODE_ENV !== 'production') {
  globalForPresets.customAudioPresets = customAudioPresets;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const { userId, type } = req.query;
      
      // Return default presets + any custom presets
      const allPresets = [
        ...DEFAULT_AUDIO_PRESETS,
        ...customAudioPresets.filter(p => !userId || p.userId === userId),
      ];
      
      return res.status(200).json(allPresets);
    }

    if (req.method === 'POST') {
      const preset = req.body;
      
      const newPreset = {
        ...preset,
        id: `custom-audio-${Date.now()}`,
        category: 'custom',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      customAudioPresets.push(newPreset);
      
      return res.status(201).json(newPreset);
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const updates = req.body;
      
      const index = customAudioPresets.findIndex(p => p.id === id);
      if (index === -1) {
        return res.status(404).json({ error: 'Audio preset not found' });
      }
      
      customAudioPresets[index] = {
        ...customAudioPresets[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      return res.status(200).json(customAudioPresets[index]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      const index = customAudioPresets.findIndex(p => p.id === id);
      if (index === -1) {
        return res.status(404).json({ error: 'Audio preset not found' });
      }
      
      customAudioPresets.splice(index, 1);
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ Audio Presets API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
