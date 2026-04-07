/**
 * Tesla Vehicle Command Endpoint
 * 
 * POST /api/tesla/vehicles/[vin]/command
 * Executes a command on a specific vehicle via Tesla Relay service (port 18810)
 * 
 * Body: { command: string, params?: object }
 * 
 * Supports approval integration for sensitive commands.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const TESLA_RELAY_URL = process.env.TESLA_RELAY_URL || 'http://localhost:18810';

// Commands that require approval before execution
const APPROVAL_REQUIRED_COMMANDS = [
  'door_unlock',
  'actuate_trunk',
  'remote_start_drive',
];

// Commands that are low-risk and can be executed directly
const LOW_RISK_COMMANDS = [
  'wake_up',
  'honk_horn',
  'flash_lights',
  'charge_start',
  'charge_stop',
  'auto_conditioning_start',
  'auto_conditioning_stop',
];

const ALLOWED_COMMANDS = [
  ...LOW_RISK_COMMANDS,
  ...APPROVAL_REQUIRED_COMMANDS,
  'door_lock',
  'set_charge_limit',
  'set_charging_amps',
  'set_temps',
  'set_sentry_mode',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { vin } = req.query;
  const { command, params, approval_id } = req.body;

  if (!vin || typeof vin !== 'string') {
    return res.status(400).json({ error: 'VIN required' });
  }

  if (!command || !ALLOWED_COMMANDS.includes(command)) {
    return res.status(400).json({ 
      error: 'Invalid command',
      allowed: ALLOWED_COMMANDS,
    });
  }

  // Check if approval is required for this command
  if (APPROVAL_REQUIRED_COMMANDS.includes(command) && !approval_id) {
    // Return 403 indicating approval is required
    // The frontend should create an approval request and re-submit with approval_id
    return res.status(403).json({
      error: 'Approval required',
      requires_approval: true,
      command,
      message: `Command '${command}' requires approval before execution. Create an approval request and include approval_id in the request body.`,
    });
  }

  try {
    // Forward command to Tesla Relay
    const response = await fetch(`${TESLA_RELAY_URL}/vehicles/${vin}/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Approval-Id': approval_id || '',
      },
      body: JSON.stringify({ command, params }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Tesla Relay] Command error:', response.status, errorText);
      
      // Handle specific error cases
      if (response.status === 401) {
        return res.status(401).json({ 
          error: 'Tesla account not connected',
          needs_auth: true,
        });
      }
      
      if (response.status === 412) {
        return res.status(412).json({ 
          error: 'Vehicle is asleep',
          message: 'Vehicle is asleep. Wake it first with the wake_up command.',
        });
      }
      
      // Check if this is a Vehicle Command Protocol error
      if (errorText.includes('Vehicle Command Protocol required') || errorText.includes('virtual key')) {
        return res.status(403).json({ 
          error: 'Virtual key pairing required',
          message: 'Tesla requires virtual key pairing for vehicle commands. Please pair the virtual key from your vehicle touchscreen: Controls > Locks > Keys > Add Key',
          details: errorText,
          requiresVirtualKey: true,
        });
      }
      
      return res.status(response.status).json({ error: 'Tesla Relay error', details: errorText });
    }

    const data = await response.json();
    
    // Log successful command execution
    console.log(`[Tesla] Command '${command}' executed on ${vin}${approval_id ? ` (approval: ${approval_id})` : ''}`);
    
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[Tesla Command] Error:', error.message);
    return res.status(500).json({ error: 'Failed to execute command via Tesla Relay' });
  }
}
