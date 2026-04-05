import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Default configurations
const DEFAULT_CHARGING_CONFIG = {
  enabled: true,
  free_charging_hours: { start: '23:00', end: '06:00' },
  target_charge_limit: 80,
  home_location: { lat: 30.2672, lon: -97.7431, radius_meters: 100 },
  weekday_only: false,
};

const DEFAULT_SECURITY_CONFIG = {
  enabled: true,
  reminder_times: ['22:00', '23:00', '00:00'],
  auto_lock_after_reminders: 3,
  home_location: { lat: 30.2672, lon: -97.7431, radius_meters: 100 },
};

const DEFAULT_MAINTENANCE_CONFIG = {
  enabled: true,
  tire_rotation_interval_miles: 6250,
  tire_rotation_reminder_miles: 500,
  inspection_state: 'TX',
  inspection_reminder_days: 30,
  service_preference: 'mobile',
  last_services: {},
};

const DEFAULT_CALENDAR_CONFIG = {
  enabled: true,
  auto_precondition: false,
  precondition_minutes_before: 15,
  target_temp_f: 72,
  minimum_battery_level: 20,
  excluded_event_types: ['all-day', 'tentative'],
};

const DEFAULT_BATTERY_CONFIG = {
  enabled: true,
  low_battery_threshold: 20,
  critical_battery_threshold: 10,
  alert_when_not_home: true,
};

/**
 * GET /api/tesla/automation/config
 * 
 * Retrieve Tesla automation configuration for a user.
 * Fetches from PIC Neo4j via personal-kg service.
 */
async function getConfig(req: NextApiRequest, res: NextApiResponse) {
  const userId = (req.query.user_id as string) || 'default';

  try {
    // Fetch from PIC service
    const picResponse = await fetch(
      `http://localhost:8765/api/pic/tesla/preferences?user_id=${userId}`
    );

    if (!picResponse.ok) {
      console.error('[Tesla Automation] PIC fetch failed:', picResponse.status);
      
      // Return defaults if PIC unavailable
      return res.status(200).json({
        charging_schedule: DEFAULT_CHARGING_CONFIG,
        security_reminders: DEFAULT_SECURITY_CONFIG,
        maintenance_tracking: DEFAULT_MAINTENANCE_CONFIG,
        calendar_integration: DEFAULT_CALENDAR_CONFIG,
        battery_alerts: DEFAULT_BATTERY_CONFIG,
      });
    }

    const preferences = await picResponse.json();

    return res.status(200).json({
      charging_schedule: preferences.charging_schedule || DEFAULT_CHARGING_CONFIG,
      security_reminders: preferences.security_reminders || DEFAULT_SECURITY_CONFIG,
      maintenance_tracking: preferences.maintenance_tracking || DEFAULT_MAINTENANCE_CONFIG,
      calendar_integration: preferences.calendar_integration || DEFAULT_CALENDAR_CONFIG,
      battery_alerts: preferences.battery_alerts || DEFAULT_BATTERY_CONFIG,
    });
  } catch (error: any) {
    console.error('[Tesla Automation] Error fetching config:', error.message);
    return res.status(500).json({ error: 'Failed to fetch configuration' });
  }
}

/**
 * POST /api/tesla/automation/config
 * 
 * Save Tesla automation configuration for a user.
 * Saves to PIC Neo4j via personal-kg service.
 */
async function saveConfig(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, preference_type, config, enabled } = req.body;

  if (!user_id || !preference_type || !config) {
    return res.status(400).json({ 
      error: 'Missing required fields: user_id, preference_type, config' 
    });
  }

  const validTypes = [
    'charging_schedule',
    'security_reminders',
    'maintenance_tracking',
    'calendar_integration',
    'battery_alerts',
  ];

  if (!validTypes.includes(preference_type)) {
    return res.status(400).json({ 
      error: `Invalid preference_type. Must be one of: ${validTypes.join(', ')}` 
    });
  }

  try {
    // Save to PIC service
    const picResponse = await fetch(
      'http://localhost:8765/api/pic/tesla/preferences',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id,
          preference_type,
          config,
          enabled: enabled !== undefined ? enabled : true,
        }),
      }
    );

    if (!picResponse.ok) {
      const errorText = await picResponse.text();
      console.error('[Tesla Automation] PIC save failed:', errorText);
      return res.status(picResponse.status).json({ error: 'Failed to save configuration' });
    }

    const savedPreference = await picResponse.json();

    return res.status(200).json({
      success: true,
      preference: savedPreference,
    });
  } catch (error: any) {
    console.error('[Tesla Automation] Error saving config:', error.message);
    return res.status(500).json({ error: 'Failed to save configuration' });
  }
}

/**
 * PATCH /api/tesla/automation/config/toggle
 * 
 * Enable or disable a Tesla automation workflow without changing config.
 */
async function toggleConfig(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, preference_type, enabled } = req.body;

  if (!user_id || !preference_type || enabled === undefined) {
    return res.status(400).json({ 
      error: 'Missing required fields: user_id, preference_type, enabled' 
    });
  }

  try {
    const picResponse = await fetch(
      'http://localhost:8765/api/pic/tesla/preferences/toggle',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, preference_type, enabled }),
      }
    );

    if (!picResponse.ok) {
      return res.status(picResponse.status).json({ error: 'Failed to toggle configuration' });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[Tesla Automation] Error toggling config:', error.message);
    return res.status(500).json({ error: 'Failed to toggle configuration' });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return getConfig(req, res);
  } else if (req.method === 'POST') {
    return saveConfig(req, res);
  } else if (req.method === 'PATCH') {
    return toggleConfig(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
