/**
 * API Key Status Endpoint
 * GET /api/ai-inferencing/providers/[providerId]/api-key/status
 * Returns masked API key status and usage information
 */

import { NextApiRequest, NextApiResponse } from 'next';

// Mock API key storage (in production, this would be encrypted database storage)
const mockAPIKeyStorage = new Map<string, {
  configured: boolean;
  valid: boolean;
  masked: string;
  lastUsed: string;
  usageCount: number;
  rateLimit: {
    remaining: number;
    resetAt: string;
  };
}>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { providerId } = req.query;

  if (!providerId || typeof providerId !== 'string') {
    return res.status(400).json({ error: 'Provider ID is required' });
  }

  // Check API key authentication
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== 'ai-gateway-api-key-2024') {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  try {
    // Get API key status from storage
    const keyStatus = mockAPIKeyStorage.get(providerId);

    if (!keyStatus) {
      return res.status(200).json({
        configured: false,
        valid: false
      });
    }

    return res.status(200).json(keyStatus);
  } catch (error) {
    console.error(`Error fetching API key status for ${providerId}:`, error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch API key status'
    });
  }
}
