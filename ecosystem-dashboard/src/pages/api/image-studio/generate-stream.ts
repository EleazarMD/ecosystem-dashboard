import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    prompt,
    negativePrompt,
    model = 'hidream-i1-full-nf4',
    width = 1024,
    height = 1024,
    steps = 20,
    cfgScale = 7,
    seed = -1,
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Get user safety level from session
  const userSettings = (session.user as any).settings || {};
  const userSafetyLevel = userSettings.safety_level || 'standard';

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const aiGatewayUrl = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
    const apiKey = process.env.AI_GATEWAY_API_KEY || 'dev-key';

    // Call AI Gateway streaming endpoint
    const response = await fetch(`${aiGatewayUrl}/api/v1/images/generate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        prompt,
        negativePrompt,
        model,
        width,
        height,
        steps,
        cfgScale,
        seed,
        userId: session.user.id,
        userSafetyLevel,
      }),
    });

    if (!response.ok) {
      sendEvent('error', { error: `AI Gateway error: ${response.status}` });
      return res.end();
    }

    const reader = response.body?.getReader();
    if (!reader) {
      sendEvent('error', { error: 'No response stream' });
      return res.end();
    }

    const decoder = new TextDecoder();
    let buffer = '';

    // Stream events from AI Gateway to client
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          res.write(line + '\n');
        }
      }
    }

    // Flush any remaining buffer
    if (buffer.trim()) {
      res.write(buffer + '\n');
    }

  } catch (error: any) {
    console.error('[generate-stream] Error:', error.message);
    sendEvent('error', { error: error.message });
  }

  res.end();
}
