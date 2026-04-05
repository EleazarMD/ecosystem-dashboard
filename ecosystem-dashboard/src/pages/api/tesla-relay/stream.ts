/**
 * Tesla Relay SSE Stream Proxy
 * 
 * Proxies Server-Sent Events from Tesla Relay Service to the dashboard.
 * Allows real-time vehicle data updates in the browser.
 */

import { NextApiRequest, NextApiResponse } from 'next';

const TESLA_RELAY_URL = process.env.TESLA_RELAY_URL || 'http://localhost:18810';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id = 'default' } = req.query;

  try {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Connect to Tesla Relay SSE stream
    const streamUrl = `${TESLA_RELAY_URL}/stream?user_id=${user_id}`;
    
    const response = await fetch(streamUrl, {
      headers: {
        'Accept': 'text/event-stream',
      },
    });

    if (!response.ok) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Failed to connect to Tesla Relay' })}\n\n`);
      res.end();
      return;
    }

    // Stream the response to the client
    const reader = response.body?.getReader();
    if (!reader) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'No response body' })}\n\n`);
      res.end();
      return;
    }

    // Handle client disconnect
    req.on('close', () => {
      reader.cancel();
      res.end();
    });

    // Read and forward chunks
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Forward the chunk to the client
      const chunk = new TextDecoder().decode(value);
      res.write(chunk);
      
      // Flush to ensure immediate delivery (Node.js streams)
      const nodeRes = res as any;
      if (typeof nodeRes.flush === 'function') {
        nodeRes.flush();
      }
    }

    res.end();
  } catch (error) {
    console.error('[Tesla Relay SSE Proxy] Error:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
    res.end();
  }
}
