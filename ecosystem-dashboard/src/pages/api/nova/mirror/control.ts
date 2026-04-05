/**
 * Nova Mirror Control API
 * 
 * POST /api/nova/mirror/control
 * Controls voice listening state for Tesla Companion Mode (tap-to-talk)
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const NOVA_MIRROR_URL = process.env.NOVA_MIRROR_URL || 'http://localhost:18804';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, userId = 'default' } = req.body;

  // Map dashboard actions to mirror command names
  const actionMap: Record<string, string> = {
    'start': 'start_listening',
    'stop': 'stop_listening',
    'mute': 'mute',
    'unmute': 'unmute'
  };
  
  const command = actionMap[action];
  if (!command) {
    return res.status(400).json({ error: `Invalid action. Must be one of: ${Object.keys(actionMap).join(', ')}` });
  }

  try {
    // Forward API key to mirror service if provided
    const headers: Record<string, string> = {};
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) headers['X-API-Key'] = apiKey;

    const response = await fetch(`${NOVA_MIRROR_URL}/mirror/${userId}/control/${command}`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Nova Mirror Control] Error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Failed to send control command' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Nova Mirror Control] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
