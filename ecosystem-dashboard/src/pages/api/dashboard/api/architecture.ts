/**
 * API Route: /api/dashboard/api/architecture
 * 
 * Proxies requests to the AHIS server for architecture visualization data
 */

import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

// Mock data for development or when AHIS server is unavailable
const mockArchitectureData = {
  success: true,
  data: {
    components: [
      { id: 'ahis', name: 'AHIS Server', type: 'infrastructure', status: 'active' },
      { id: 'dashboard', name: 'Dashboard', type: 'platform', status: 'active' },
      { id: 'ai-gateway', name: 'AI Gateway', type: 'platform', status: 'active' },
      { id: 'knowledge-base', name: 'Knowledge Base', type: 'platform', status: 'development' },
      { id: 'port-registry', name: 'Port Registry', type: 'tool', status: 'active' },
      { id: 'progress-tracker', name: 'Progress Tracker', type: 'tool', status: 'active' }
    ],
    relationships: [
      { source: 'dashboard', target: 'ahis', type: 'depends-on' },
      { source: 'dashboard', target: 'ai-gateway', type: 'connects-to' },
      { source: 'ahis', target: 'port-registry', type: 'manages' },
      { source: 'ahis', target: 'progress-tracker', type: 'manages' },
      { source: 'ai-gateway', target: 'knowledge-base', type: 'uses' }
    ]
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  const AHIS_SERVER_HOST = process.env.NEXT_PUBLIC_AHIS_SERVER_HOST || 'localhost';
  const AHIS_SERVER_PORT = process.env.NEXT_PUBLIC_AHIS_SERVER_PORT || '8888';
  const AHIS_SERVER_URL = `http://${AHIS_SERVER_HOST}:${AHIS_SERVER_PORT}`;
  
  try {
    // Construct the AHIS API URL
    const apiUrl = `${AHIS_SERVER_URL}/api/dashboard/api/architecture`;
    
    // Forward the request to the AHIS server
    const response = await axios.get(apiUrl);
    
    // Return the response data
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error proxying to AHIS server for architecture data:', error);
    
    // Return mock data in case of error
    console.warn('Using mock architecture data as fallback');
    return res.status(200).json(mockArchitectureData);
  }
}
