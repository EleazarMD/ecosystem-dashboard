import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_INTERNAL_URL || 'http://localhost:7777';
const AI_GATEWAY_ADMIN_KEY = process.env.AI_GATEWAY_ADMIN_KEY || 'ai-gateway-admin-key-2024';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method } = req;

  try {
    if (method === 'GET') {
      // Get all API keys
      const response = await fetch(
        `${AI_GATEWAY_URL}/api/v1/security/api-keys`,
        {
          headers: {
            'X-Admin-Key': AI_GATEWAY_ADMIN_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`AI Gateway responded with ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    } else if (method === 'POST') {
      // Create new API key
      const { name, permissions, rateLimit, expiresIn, description, scopes, tenantId } = req.body;

      const response = await fetch(
        `${AI_GATEWAY_URL}/api/v1/security/api-keys`,
        {
          method: 'POST',
          headers: {
            'X-Admin-Key': AI_GATEWAY_ADMIN_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            permissions,
            rateLimit,
            expiresIn,
            description,
            scopes,
            tenantId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`AI Gateway responded with ${response.status}`);
      }

      const data = await response.json();
      return res.status(201).json(data);
    } else if (method === 'PUT') {
      // Update API key
      const { id, isActive, permissions, rateLimit } = req.body;

      const response = await fetch(
        `${AI_GATEWAY_URL}/api/v1/security/api-keys/${id}`,
        {
          method: 'PUT',
          headers: {
            'X-Admin-Key': AI_GATEWAY_ADMIN_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive, permissions, rateLimit }),
        }
      );

      if (!response.ok) {
        throw new Error(`AI Gateway responded with ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    } else if (method === 'DELETE') {
      // Revoke API key
      const { id } = req.query;

      const response = await fetch(
        `${AI_GATEWAY_URL}/api/v1/security/api-keys/${id}`,
        {
          method: 'DELETE',
          headers: {
            'X-Admin-Key': AI_GATEWAY_ADMIN_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`AI Gateway responded with ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('[API] API Keys error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
