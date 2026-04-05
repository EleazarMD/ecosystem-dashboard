import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import getConfig from 'next/config';

type StatsResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * API endpoint to get port registry statistics
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get the server runtime config
    const { serverRuntimeConfig } = getConfig();
    // Use AHIS server URL from configuration
    const serverUrl = serverRuntimeConfig.ahisServerUrl || 'http://localhost:8888';

    // Call the AHIS API endpoint
    const response = await axios.get(`${serverUrl}/api/ports/stats`);

    // Return the stats
    return res.status(200).json({
      success: true,
      data: response.data.data
    });
  } catch (error: any) {
    console.error('Error fetching port stats:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
