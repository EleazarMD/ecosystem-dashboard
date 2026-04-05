/**
 * OpenClaw Status API
 * 
 * Returns the current status of the OpenClaw gateway daemon.
 * Checks if the gateway is reachable by attempting a connection.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';

interface OpenClawStatus {
  running: boolean;
  uptime_seconds: number;
  active_sessions: number;
  memory_entries: number;
  last_activity: string | null;
  version: string;
  channels: {
    ios: boolean;
    imessage: boolean;
    whatsapp: boolean;
    telegram: boolean;
  };
  skills_loaded: number;
  policy_stack: string[];
}

interface StatusResponse {
  success: boolean;
  status?: OpenClawStatus;
  error?: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // Check if OpenClaw gateway is reachable by fetching the root page
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(OPENCLAW_GATEWAY_URL, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // If we get any response, the gateway is running
    // OpenClaw serves HTML on root, so we just check for a successful response
    const isRunning = response.ok || response.status === 200;
    const html = await response.text();
    
    // Extract version from the HTML if possible (OpenClaw embeds it)
    const versionMatch = html.match(/OpenClaw\s+([\d.]+)/i);
    const version = versionMatch ? versionMatch[1] : '2026.2.15';

    return res.status(200).json({
      success: true,
      status: {
        running: isRunning,
        uptime_seconds: 0,
        active_sessions: 0,
        memory_entries: 0,
        last_activity: null,
        version: version,
        channels: {
          ios: false,
          imessage: false,
          whatsapp: false,
          telegram: false,
        },
        skills_loaded: 0,
        policy_stack: [],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // OpenClaw gateway not reachable
    const isAborted = error instanceof Error && error.name === 'AbortError';
    
    return res.status(200).json({
      success: true,
      status: {
        running: false,
        uptime_seconds: 0,
        active_sessions: 0,
        memory_entries: 0,
        last_activity: null,
        version: 'offline',
        channels: {
          ios: false,
          imessage: false,
          whatsapp: false,
          telegram: false,
        },
        skills_loaded: 0,
        policy_stack: [],
      },
      error: isAborted ? 'Connection timeout' : (error instanceof Error ? error.message : 'Unknown error'),
      timestamp: new Date().toISOString(),
    });
  }
}
