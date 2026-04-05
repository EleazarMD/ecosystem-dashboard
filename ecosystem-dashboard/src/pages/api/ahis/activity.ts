import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API endpoint to fetch activity data from AHIS server
 * This proxies requests to the AHIS server's activity endpoint
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get AHIS server configuration
    const ahisHost = process.env.AHIS_HOST || 'localhost';
    const ahisPort = process.env.AHIS_PORT || '8888';
    const ahisSecure = process.env.AHIS_SECURE === 'true';
    const protocol = ahisSecure ? 'https' : 'http';
    
    // Build the AHIS server activity URL
    const ahisActivityUrl = `${protocol}://${ahisHost}:${ahisPort}/dashboard/api/activity`;
    
    console.log(`[AHIS Activity] Fetching activity data from: ${ahisActivityUrl}`);
    
    // Fetch activity data from AHIS server
    const response = await fetch(ahisActivityUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Homelab-Dashboard/1.0',
      },
      // Add timeout to prevent hanging requests
      signal: (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 10000);
        return controller.signal;
      })() // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`AHIS server responded with status: ${response.status}`);
    }

    const activityData = await response.json();
    
    console.log(`[AHIS Activity] Successfully fetched ${activityData.data?.length || 0} activity items`);
    
    // Return the activity data
    res.status(200).json(activityData);
    
  } catch (error) {
    console.error('[AHIS Activity] Error fetching activity data:', error);
    
    // Return error response
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity data from AHIS server',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
