/**
 * Tesla Relay Proxy - Vehicle Commands
 * 
 * Proxies command requests to Tesla Relay Service (port 18810)
 * Commands are routed through the approval engine based on security tier
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const TESLA_RELAY_URL = process.env.TESLA_RELAY_URL || 'http://localhost:18810';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { vin } = req.query;
  const { command, params } = req.body;

  if (!vin || typeof vin !== 'string') {
    return res.status(400).json({ error: 'VIN required' });
  }

  if (!command) {
    return res.status(400).json({ error: 'Command required' });
  }

  try {
    const response = await fetch(`${TESLA_RELAY_URL}/vehicles/${vin}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, params }),
    });
    
    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error: any) {
    console.error('[Tesla Relay Proxy] Command error:', error.message);
    return res.status(500).json({ error: 'Failed to execute command via Tesla Relay' });
  }
}
