import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import getConfig from 'next/config';

type AnalysisResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * API endpoint to analyze port assignments and generate migration recommendations
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalysisResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get the server runtime config
    const { serverRuntimeConfig } = getConfig();
    // Use AHIS server URL from configuration
    const serverUrl = serverRuntimeConfig.ahisServerUrl || 'http://localhost:8888';

    // Call the AHIS JSON-RPC endpoint
    const endpoint = '/ahis';
    const response = await axios.post(`${serverUrl}${endpoint}`, {
      jsonrpc: '2.0',
      id: 'analyze-ports-' + Date.now(),
      method: 'port_registry',
      params: {
        action: 'analyze_ports'
      }
    });

    // Check if the response contains an error
    if (response.data.error) {
      return res.status(400).json({
        success: false,
        error: response.data.error.message || 'Failed to analyze port assignments'
      });
    }

    // Return the analysis results
    return res.status(200).json({
      success: true,
      data: response.data.result.analysis
    });
  } catch (error: any) {
    console.error('Error analyzing port assignments:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
