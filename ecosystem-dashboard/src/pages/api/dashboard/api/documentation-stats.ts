/**
 * API Route: /api/dashboard/api/documentation-stats
 * 
 * Proxies requests to the AHIS server for documentation statistics
 */

import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

// Mock data for development or when AHIS server is unavailable
const mockDocumentationStats = {
  success: true,
  data: {
    totalDocuments: 42,
    byCategory: [
      { category: 'Technical', count: 18 },
      { category: 'User', count: 12 },
      { category: 'API', count: 8 },
      { category: 'Deployment', count: 4 }
    ],
    recentUpdates: [
      { id: 'doc-1', title: 'AHIS Integration Guide', lastUpdated: new Date().toISOString() },
      { id: 'doc-2', title: 'Port Registry Documentation', lastUpdated: new Date(Date.now() - 86400000).toISOString() },
      { id: 'doc-3', title: 'Dashboard User Guide', lastUpdated: new Date(Date.now() - 172800000).toISOString() }
    ],
    completionRate: 85
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
    const apiUrl = `${AHIS_SERVER_URL}/api/dashboard/api/documentation-stats`;
    
    // Forward the request to the AHIS server
    const response = await axios.get(apiUrl);
    
    // Return the response data
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error proxying to AHIS server for documentation stats:', error);
    
    // Return mock data in case of error
    console.warn('Using mock documentation stats as fallback');
    return res.status(200).json(mockDocumentationStats);
  }
}
