import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

/**
 * Telemetry endpoint that tracks authentication events
 * This follows the AI Homelab Ecosystem monitoring and telemetry standards
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category, action, label, value, metadata } = req.body;

    if (!category || !action) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get environment variables
    const aiGatewayUrl = process.env.AI_GATEWAY_URL || 'http://ai-gateway:8080';

    // Track event through AI Gateway
    await axios.post(`${aiGatewayUrl}/v1/telemetry/track`, {
      service: 'mcp-dashboard',
      category,
      action,
      label: label || 'unknown',
      value: value || 1,
      metadata: metadata || {}
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error tracking event:', error.response?.data || error.message);
    
    // Return success anyway to prevent blocking the client
    return res.status(200).json({ success: true });
  }
}
