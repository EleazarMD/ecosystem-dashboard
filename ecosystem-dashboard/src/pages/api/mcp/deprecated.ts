/**
 * DEPRECATED MCP API Routes
 * 
 * This file serves as a common handler for all deprecated MCP API routes.
 * These routes are maintained temporarily for backward compatibility but will be removed in a future release.
 * 
 * Users should migrate to the equivalent AHIS API routes.
 */
import { NextApiRequest, NextApiResponse } from 'next';
import logger from '@/lib/logger';

/**
 * Deprecation notice handler for MCP API routes
 */
export default function deprecationHandler(req: NextApiRequest, res: NextApiResponse) {
  const path = req.url || '';
  
  logger.warn(`Deprecated MCP API route accessed: ${path}`, {
    method: req.method,
    query: req.query,
    headers: req.headers,
  });
  
  // Map MCP routes to their AHIS equivalents for the deprecation notice
  const routeMap: Record<string, string> = {
    '/api/mcp/execute': '/api/ahis/execute',
    '/api/mcp/websocket': '/api/ahis/websocket',
    '/api/mcp/compliance': '/api/ahis/compliance',
    '/api/mcp': '/api/ahis',
  };
  
  // Find the closest match for the current path
  const mcpPath = Object.keys(routeMap).find(route => path.includes(route)) || '';
  const ahisPath = mcpPath ? routeMap[mcpPath] : '/api/ahis';
  
  // Return a deprecation notice with migration information
  return res.status(410).json({
    success: false,
    deprecated: true,
    message: 'This MCP API route is deprecated and will be removed in a future release.',
    migration: {
      notice: 'Please update your code to use the equivalent AHIS API route.',
      replacement: ahisPath,
      documentation: '/docs/technical/AHIS_MIGRATION.md'
    }
  });
}

/**
 * Disable body parsing for WebSocket routes
 */
export const config = {
  api: {
    bodyParser: false,
  },
};
