import type { NextApiRequest, NextApiResponse } from 'next';

const NOVA_MIRROR_URL = process.env.NOVA_MIRROR_URL || 'http://localhost:18804';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = (req.query.user_id as string) || 'default';
  const token = req.query.token as string | undefined;
  const vehicleId = req.query.vehicle_id as string | undefined;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Use AbortController for clean cancellation
  const controller = new AbortController();
  
  // Clean up when client disconnects
  req.on('close', () => {
    controller.abort();
  });

  // Build upstream URL with optional privacy parameters
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (vehicleId) params.set('vehicle_id', vehicleId);
  const queryString = params.toString();
  const upstreamUrl = `${NOVA_MIRROR_URL}/mirror/${userId}/stream${queryString ? `?${queryString}` : ''}`;

  try {
    console.log(`[Mirror SSE] Connecting to upstream: ${upstreamUrl}`);
    
    // Forward API key to mirror service for authentication
    const upstreamHeaders: Record<string, string> = { 
      'Accept': 'text/event-stream' 
    };
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) upstreamHeaders['X-API-Key'] = apiKey;
    
    const upstream = await fetch(upstreamUrl, {
      headers: upstreamHeaders,
      signal: controller.signal,
    });

    if (!upstream.ok || !upstream.body) {
      console.error(`[Mirror SSE] Upstream error: status=${upstream.status}`);
      res.write(`event: error\ndata: {"message":"Mirror unavailable","status":${upstream.status}}\n\n`);
      res.end();
      return;
    }
    
    console.log('[Mirror SSE] Connected to upstream, streaming events');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } catch (err: any) {
        // Client disconnected or upstream closed - ignore abort errors
        if (err?.name !== 'AbortError') {
          console.error('[Mirror SSE] Stream error:', err);
        }
      } finally {
        res.end();
      }
    };

    await pump();
  } catch (err: any) {
    // Ignore abort errors from client disconnect
    if (err?.name !== 'AbortError') {
      res.write(`event: error\ndata: {"message":"Failed to connect to mirror"}\n\n`);
    }
    res.end();
  }
}
