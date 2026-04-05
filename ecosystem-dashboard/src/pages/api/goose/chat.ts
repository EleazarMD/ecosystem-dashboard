/**
 * Goose Chat API Endpoint
 * Proxies chat requests to the Goose API server
 * Supports both streaming (SSE) and non-streaming responses
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const GOOSE_API_URL = process.env.GOOSE_API_URL || 'http://localhost:9001';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const isStreaming = req.body.streaming === true;
    const endpoint = isStreaming ? '/api/chat/stream' : '/api/chat';
    
    console.log('[Goose Chat API] Proxying request to Goose backend:', GOOSE_API_URL + endpoint);
    console.log('[Goose Chat API] Streaming:', isStreaming);
    console.log('[Goose Chat API] Request payload:', JSON.stringify(req.body, null, 2));

    // Forward the request to the Goose API server
    const response = await fetch(`${GOOSE_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Goose Chat API] Goose backend error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      
      return res.status(response.status).json({
        error: `Goose API error: ${response.statusText}`,
        detail: errorText,
      });
    }

    // Handle streaming responses (SSE)
    if (isStreaming) {
      console.log('[Goose Chat API] Setting up SSE stream proxy');
      console.log('[Goose Chat API] Response content-type:', response.headers.get('content-type'));
      
      // Check if we got an unexpected redirect
      if (response.redirected) {
        console.error('[Goose Chat API] ⚠️ Response was redirected to:', response.url);
        return res.status(500).json({
          error: 'Unexpected redirect from backend',
          redirectUrl: response.url,
        });
      }
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Pipe the stream from Goose backend to the client
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No readable stream from backend');
      }

      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('[Goose Chat API] Stream complete');
            res.end();
            break;
          }

          // Forward the chunk to the client
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } catch (streamError) {
        console.error('[Goose Chat API] Stream error:', streamError);
        res.end();
      }
      
      return;
    }

    // Handle non-streaming responses (JSON)
    const data = await response.json();
    console.log('[Goose Chat API] Response from Goose:', {
      hasResponse: !!data.response,
      responseLength: data.response?.length || 0,
      hasToolsUsed: !!data.tools_used,
      toolsCount: data.tools_used?.length || 0,
    });

    return res.status(200).json(data);
  } catch (error) {
    console.error('[Goose Chat API] Error:', error);
    return res.status(500).json({
      error: 'Failed to communicate with Goose backend',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
