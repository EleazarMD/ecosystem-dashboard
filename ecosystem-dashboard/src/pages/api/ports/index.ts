import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import getConfig from 'next/config';

type PortsResponse = {
  success: boolean;
  data?: any;
  count?: number;
  error?: string;
};

/**
 * API endpoint to get all registered ports
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PortsResponse>
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
    const response = await axios.get(`${serverUrl}/api/ports`);

    // Return the ports
    return res.status(200).json({
      success: true,
      data: response.data.data,
      count: response.data.count
    });
  } catch (error: any) {
    console.error('Error fetching ports:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
