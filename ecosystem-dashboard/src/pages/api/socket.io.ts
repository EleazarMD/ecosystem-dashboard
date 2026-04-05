import { NextApiRequest, NextApiResponse } from 'next';
import httpProxy from 'http-proxy';
import logger from '@/lib/logger';

// Create a proxy server instance
const proxy = httpProxy.createProxyServer({
  // Use AHIS environment variables
  target: `http://${process.env.NEXT_PUBLIC_AHIS_SERVER_HOST || 'localhost'}:${process.env.NEXT_PUBLIC_AHIS_SERVER_PORT || '8888'}`,
  changeOrigin: true,
  ws: true, // Enable WebSocket support
});

// Add error handling to the proxy
proxy.on('error', (err, req, res: any) => {
  logger.error('Socket.IO proxy error:', err);
  if (res && typeof res.writeHead === 'function' && typeof res.end === 'function') {
    res.writeHead(500, {
      'Content-Type': 'text/plain',
    });
    res.end('Socket.IO proxy error: ' + err.message);
  }
});

// This API route cannot be handled like regular Next.js API routes
// because it needs to support WebSocket connections
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Disable the default body parser to allow the proxy to handle the body
  // @ts-ignore - NextApiRequest doesn't have socket property
  if (req.socket && req.socket.server) {
    // @ts-ignore - NextApiRequest doesn't have socket property
    const server = req.socket.server;
    
    if (!server.proxied) {
      // Log proxy setup
      logger.info(`Setting up Socket.IO proxy to AHIS server at ${process.env.NEXT_PUBLIC_AHIS_SERVER_HOST || 'localhost'}:${process.env.NEXT_PUBLIC_AHIS_SERVER_PORT || '8888'}`);
      server.proxied = true;
    }
    
    // Let http-proxy handle the request
    return new Promise<void>((resolve, reject) => {
      proxy.web(req, res, {
        target: `http://${process.env.NEXT_PUBLIC_AHIS_SERVER_HOST || 'localhost'}:${process.env.NEXT_PUBLIC_AHIS_SERVER_PORT || '8888'}`,
      }, (err) => {
        if (err) {
          logger.error('Socket.IO proxy web request error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } else {
    res.status(500).json({ error: 'Socket server not available' });
  }
}

// Required for WebSocket support
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
