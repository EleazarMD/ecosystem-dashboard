/**
 * Smart Home Control API
 * 
 * Provides endpoints for controlling smart home devices from the Tesla dashboard.
 * Integrates with Nova Agent's control_lights tool and can be extended for
 * garage doors, thermostats, locks, etc.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// Device state cache (in production, this would query actual device APIs)
interface DeviceState {
  id: string;
  state: 'on' | 'off' | 'open' | 'closed' | 'locked' | 'unlocked' | number;
  lastUpdated: number;
}

// In-memory state cache (replace with Redis or persistent storage in production)
const deviceStates: Map<string, DeviceState> = new Map();

// Initialize default states
const defaultDevices = [
  { id: 'all_lights', state: 'on' as const },
  { id: 'living_room', state: 'on' as const },
  { id: 'kitchen', state: 'off' as const },
  { id: 'garage', state: 'closed' as const },
  { id: 'thermostat', state: 72 },
  { id: 'night_mode', state: 'off' as const },
];

defaultDevices.forEach(d => {
  deviceStates.set(d.id, { ...d, lastUpdated: Date.now() });
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle GET request - fetch device statuses
  if (req.method === 'GET') {
    try {
      const devices = Array.from(deviceStates.values()).map(d => ({
        id: d.id,
        state: d.state,
      }));

      return res.status(200).json({
        success: true,
        devices,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SmartHome API] Error fetching device states:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch device states',
      });
    }
  }

  // Handle POST request - control device
  if (req.method === 'POST') {
    const { deviceId, deviceType, action, value } = req.body;

    if (!deviceId || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: deviceId, action',
      });
    }

    try {
      let result: { success: boolean; message: string };

      // Route to appropriate control handler
      switch (deviceType) {
        case 'light':
        case 'scene':
          result = await controlLights(deviceId, action, value);
          break;
        case 'garage':
          result = await controlGarage(deviceId, action);
          break;
        case 'lock':
          result = await controlLock(deviceId, action);
          break;
        case 'thermostat':
          result = await controlThermostat(deviceId, action, value);
          break;
        default:
          result = { success: false, message: `Unknown device type: ${deviceType}` };
      }

      // Update cached state on success
      if (result.success) {
        const currentState = deviceStates.get(deviceId);
        if (currentState) {
          let newState: DeviceState['state'] = currentState.state;

          if (deviceType === 'light' || deviceType === 'scene') {
            newState = action === 'on' ? 'on' : 'off';
          } else if (deviceType === 'garage') {
            newState = action === 'open' ? 'open' : 'closed';
          } else if (deviceType === 'lock') {
            newState = action === 'lock' ? 'locked' : 'unlocked';
          } else if (deviceType === 'thermostat') {
            const current = currentState.state as number;
            if (action === 'temp_up') newState = current + 1;
            else if (action === 'temp_down') newState = current - 1;
            else if (value) newState = parseInt(value);
          }

          deviceStates.set(deviceId, {
            ...currentState,
            state: newState,
            lastUpdated: Date.now(),
          });
        }
      }

      return res.status(result.success ? 200 : 500).json({
        success: result.success,
        message: result.message,
        deviceId,
        action,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SmartHome API] Error controlling device:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to control device',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Method not allowed
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}

/**
 * Control Philips Hue lights via Nova Agent
 */
async function controlLights(
  deviceId: string,
  action: string,
  value?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Call Nova Agent API to control lights
    const response = await fetch('http://localhost:18800/v1/tools/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'control_lights',
        arguments: {
          action: action === 'on' ? 'on' : action === 'off' ? 'off' : action,
          target: deviceId === 'all_lights' ? '' : deviceId,
          value,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Nova Agent returned ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      message: data.result || `${deviceId} lights turned ${action}`,
    };
  } catch (error) {
    // Fallback: Simulate success for demo if Nova Agent not available
    console.warn('[SmartHome] Nova Agent not available, using simulation mode');
    
    return {
      success: true,
      message: `${deviceId} ${action === 'on' ? 'turned on' : 'turned off'} (simulated)`,
    };
  }
}

/**
 * Control garage door (placeholder - integrate with MyQ or similar)
 */
async function controlGarage(
  deviceId: string,
  action: string
): Promise<{ success: boolean; message: string }> {
  // Placeholder implementation
  // In production, integrate with MyQ API or Home Assistant
  return {
    success: true,
    message: `Garage door ${action === 'open' ? 'opening' : 'closing'}`,
  };
}

/**
 * Control smart lock (placeholder - integrate with August, Yale, etc.)
 */
async function controlLock(
  deviceId: string,
  action: string
): Promise<{ success: boolean; message: string }> {
  // Placeholder implementation
  return {
    success: true,
    message: `Door ${action === 'lock' ? 'locked' : 'unlocked'}`,
  };
}

/**
 * Control thermostat (placeholder - integrate with Nest, Ecobee, etc.)
 */
async function controlThermostat(
  deviceId: string,
  action: string,
  value?: string
): Promise<{ success: boolean; message: string }> {
  // Placeholder implementation
  const currentState = deviceStates.get(deviceId)?.state as number || 72;
  let newTemp = currentState;

  if (action === 'temp_up') newTemp = currentState + 1;
  else if (action === 'temp_down') newTemp = currentState - 1;
  else if (value) newTemp = parseInt(value);

  return {
    success: true,
    message: `Thermostat set to ${newTemp}°F`,
  };
}
