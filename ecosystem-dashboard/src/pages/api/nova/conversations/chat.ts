/**
 * Nova Text Chat API Proxy
 * 
 * POST /api/nova/conversations/chat - Send a text message and get response
 * Proxies to Nova Agent text chat endpoint (port 18803).
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const NOVA_TEXT_URL = process.env.NOVA_TEXT_URL || 'http://127.0.0.1:18803';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, conversation_id, message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await fetch(`${NOVA_TEXT_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user_id || 'dashboard',
        conversation_id: conversation_id || `conv-${Date.now()}`,
        message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Nova Chat API] Error:', response.status, errorText);
      throw new Error(`Nova API error: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Nova Chat API] Error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to send message',
      details: error.message 
    });
  }
}
