/**
 * Research Lab Poller Initialization Endpoint
 * 
 * This endpoint is called on dashboard mount to initialize background
 * processing for deep research sessions. Currently a stub that returns
 * success - actual polling is handled by individual research sessions.
 */

import { NextApiRequest, NextApiResponse } from 'next';

interface StartPollerResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StartPollerResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // Research polling is handled per-session via SSE connections
    // This endpoint serves as a health check / initialization signal
    console.log('[research-lab/start-poller] Poller initialization requested');

    return res.status(200).json({
      success: true,
      message: 'Research poller ready - sessions use per-request SSE',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[research-lab/start-poller] Error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
