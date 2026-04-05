import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * AI Gateway Alerts API
 * Provides access to alerts and alert rules
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGetAlerts(req, res);
  } else if (req.method === 'POST') {
    return handleAcknowledgeAlert(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetAlerts(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      status = 'active',
      severity,
      limit = '50',
    } = req.query;

    const AI_GATEWAY_URL = process.env.AI_GATEWAY_INTERNAL_URL || 'http://localhost:7777';
    
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    
    if (status) params.append('status', status.toString());
    if (severity) params.append('severity', severity.toString());

    const response = await fetch(
      `${AI_GATEWAY_URL}/api/v1/alerts?${params.toString()}`,
      {
        headers: {
          'X-API-Key': process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024',
        },
      }
    );

    if (!response.ok) {
      console.warn(`[Alerts API] AI Gateway returned ${response.status}`);
      return res.status(200).json({
        alerts: [],
        statistics: {
          activeAlerts: 0,
          totalRules: 0,
          alertsBySeverity: {
            critical: 0,
            warning: 0,
            info: 0,
          },
        },
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[Alerts API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      alerts: [],
    });
  }
}

async function handleAcknowledgeAlert(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { alertId, acknowledgedBy } = req.body;

    if (!alertId || !acknowledgedBy) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const AI_GATEWAY_URL = process.env.AI_GATEWAY_INTERNAL_URL || 'http://localhost:7777';
    
    const response = await fetch(
      `${AI_GATEWAY_URL}/api/v1/alerts/${alertId}/acknowledge`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024',
        },
        body: JSON.stringify({ acknowledgedBy }),
      }
    );

    if (!response.ok) {
      console.warn(`[Alerts API] AI Gateway returned ${response.status}`);
      return res.status(response.status).json({ error: 'Failed to acknowledge alert' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[Alerts API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
