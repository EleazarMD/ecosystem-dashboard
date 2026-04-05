import type { NextApiRequest, NextApiResponse } from 'next';

const FAMILY_HUB_URL = process.env.FAMILY_HUB_URL || 'http://localhost:18820';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Connect to Family Hub SSE
    const response = await fetch(`${FAMILY_HUB_URL}/stream`);
    
    if (!response.ok) {
      throw new Error(`Family Hub error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    // Pipe Family Hub SSE to client
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
      } catch (error) {
        console.error('[Family Hub SSE Error]:', error);
      } finally {
        res.end();
      }
    };

    pump();

    // Handle client disconnect
    req.on('close', () => {
      reader.cancel();
    });
  } catch (error: any) {
    console.error('[Family Hub SSE Setup Error]:', error);
    
    // Send mock SSE events if Family Hub is not available
    res.write(`data: ${JSON.stringify({ type: 'connected', data: { message: 'Family Hub not available - using mock mode' } })}\n\n`);
    
    // Send mock heartbeat every 30 seconds
    const interval = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', data: { timestamp: new Date().toISOString() } })}\n\n`);
    }, 30000);
    
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  }
}
