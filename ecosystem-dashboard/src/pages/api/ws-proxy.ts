import { NextApiRequest, NextApiResponse } from 'next';
import httpProxy from 'http-proxy';
import { IncomingMessage, Server as NetServer } from 'http';
import { Socket as NetSocket } from 'net';

// Create a proxy server instance
const proxy = httpProxy.createProxyServer({
  ws: true, // Enable WebSocket proxy
  changeOrigin: true,
  secure: false, // Allow insecure connections (for localhost)
});

// Add error handling to the proxy
proxy.on('error', (err: Error, req: IncomingMessage, res: any) => {
  console.error('AI Homelab WebSocket Proxy error:', err);
  if (res && typeof res.status === 'function') {
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
});

// Add debug event handlers
proxy.on('proxyReq', function (proxyReq, req, res, options) {
  console.log('AI Homelab WebSocket Proxy: proxyReq event', { 
    path: proxyReq.path,
    target: options.target 
  });
});

proxy.on('proxyRes', function (proxyRes, req, res) {
  console.log('AI Homelab WebSocket Proxy: proxyRes event', { 
    statusCode: proxyRes.statusCode,
    headers: proxyRes.headers
  });
});

// @ts-ignore - The http-proxy types don't properly define the proxySocket event
proxy.on('proxySocket', function() {
  const proxySocket = arguments[0];
  console.log('AI Homelab WebSocket Proxy: proxySocket event');
  
  if (proxySocket && typeof proxySocket.on === 'function') {
    proxySocket.on('data', (chunk: Buffer) => {
      console.log('AI Homelab WebSocket Proxy: socket data');
    });
    
    proxySocket.on('close', () => {
      console.log('AI Homelab WebSocket Proxy: socket closed');
    });
  }
});

/**
 * AI Homelab Ecosystem WebSocket Proxy
 * 
 * This implements a proper service mesh integration between the dashboard
 * and AHIS (AI Homelab Infrastructure Server), following ecosystem-first design principles.
 * 
 * Instead of direct browser-to-service connections (which would require CORS),
 * we proxy WebSocket connections through Next.js to maintain proper service
 * boundaries and security within the AI Homelab Cloud infrastructure.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('AI Homelab WebSocket Proxy: Request received', { 
    method: req.method,
    url: req.url,
    headers: req.headers,
    isUpgrade: req.headers.upgrade === 'websocket'
  });

  // Use type assertion since we know these properties exist in a WebSocket context
  const socket = req.socket as unknown as { server: NetServer };
  
  // Return a 400 if it's not a WebSocket upgrade request
  if (!socket.server) {
    console.error('AI Homelab WebSocket Proxy: No server in socket');
    return res.status(400).json({ error: 'This endpoint is only for WebSocket connections' });
  }

  // Use server-side environment variables for internal service communication
  // Use AHIS environment variables for server connection
  const serverPort = process.env.AHIS_SERVER_PORT || 8888;
  const targetUrl = `http://localhost:${serverPort}`;

  console.log(`AI Homelab WebSocket Proxy: Connecting to AHIS at ${targetUrl}`);

  // Return 200 to acknowledge the request
  // The actual WebSocket upgrade will be handled by the proxy
  res.end();

  try {
    // Type assertion to add our custom handler property
    const server = socket.server as NetServer & {
      upgradeHandler?: (req: IncomingMessage, socket: NetSocket, head: Buffer) => void;
    };

    // Only set up the upgrade handler once
    if (!server.upgradeHandler) {
      console.log('AI Homelab WebSocket Proxy: Setting up upgrade handler');
      
      server.upgradeHandler = (req, socket, head) => {
        // Modify the path to match what the AHIS expects
        const originalUrl = req.url || '';
        if (originalUrl.startsWith('/api/ws-proxy')) {
          req.url = originalUrl.replace('/api/ws-proxy', '/ws');
          console.log(`AI Homelab WebSocket Proxy: Rewriting URL from ${originalUrl} to ${req.url}`);
        }

        // Proxy the WebSocket connection
        console.log('AI Homelab WebSocket Proxy: Proxying WebSocket connection', {
          url: req.url,
          target: targetUrl
        });
        
        proxy.ws(req, socket, head, { target: targetUrl, ws: true });
      };

      // Listen for upgrade events
      server.on('upgrade', server.upgradeHandler);
      console.log('AI Homelab WebSocket Proxy: Added upgrade event listener');
    } else {
      console.log('AI Homelab WebSocket Proxy: Upgrade handler already exists');
    }
  } catch (err) {
    console.error('AI Homelab WebSocket Proxy: Error setting up WebSocket proxy:', err);
  }
}

// Disable body parsing, we don't need it for WebSockets
export const config = {
  api: {
    bodyParser: false,
  },
};
