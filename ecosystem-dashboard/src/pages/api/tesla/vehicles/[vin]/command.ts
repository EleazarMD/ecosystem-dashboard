/**
 * Tesla Vehicle Command Endpoint
 * 
 * POST /api/tesla/vehicles/[vin]/command
 * Executes a command on a specific vehicle
 * 
 * Body: { command: string, params?: object }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { refreshTeslaToken } from '../../auth/refresh';

const TESLA_API_BASE = 'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1';

const ALLOWED_COMMANDS = [
  'wake_up',
  'door_unlock',
  'door_lock',
  'honk_horn',
  'flash_lights',
  'charge_start',
  'charge_stop',
  'set_charge_limit',
  'set_charging_amps',
  'auto_conditioning_start',
  'auto_conditioning_stop',
  'set_temps',
  'actuate_trunk',
  'set_sentry_mode',
  'remote_start_drive',
];

async function getValidToken(userId: string): Promise<string | null> {
  const result = await pool.query(`
    SELECT access_token, refresh_token, expires_at
    FROM tesla_tokens
    WHERE user_id = $1
  `, [userId]);

  if (result.rows.length === 0) return null;
  
  const token = result.rows[0];
  const isExpired = new Date(token.expires_at) < new Date();

  if (isExpired && token.refresh_token) {
    console.log('[Tesla] Token expired, attempting refresh...');
    const newToken = await refreshTeslaToken(userId);
    return newToken;
  }

  return isExpired ? null : token.access_token;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { vin } = req.query;
  const { command, params } = req.body;

  if (!vin || typeof vin !== 'string') {
    return res.status(400).json({ error: 'VIN required' });
  }

  if (!command || !ALLOWED_COMMANDS.includes(command)) {
    return res.status(400).json({ 
      error: 'Invalid command',
      allowed: ALLOWED_COMMANDS,
    });
  }

  const userId = 'default';

  try {
    const accessToken = await getValidToken(userId);
    if (!accessToken) {
      return res.status(401).json({ error: 'Not connected' });
    }

    // Build command payload
    const commandPayload: any = {};
    if (params) {
      Object.assign(commandPayload, params);
    }

    // Try the command endpoint
    const response = await fetch(`${TESLA_API_BASE}/vehicles/${vin}/command/${command}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commandPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Tesla API] Command error:', response.status, errorText);
      
      // Check if this is a Vehicle Command Protocol error
      if (errorText.includes('Vehicle Command Protocol required')) {
        return res.status(403).json({ 
          error: 'Virtual key pairing required',
          message: 'Tesla requires virtual key pairing for vehicle commands. Please pair the virtual key from your vehicle touchscreen: Controls > Locks > Keys > Add Key',
          details: errorText,
          requiresVirtualKey: true,
        });
      }
      
      return res.status(response.status).json({ error: 'Tesla API error', details: errorText });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[Tesla Command] Error:', error.message);
    return res.status(500).json({ error: 'Failed to execute command' });
  }
}
