import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_API_URL || 'http://localhost:7777'; // Fixed to use correct AI Gateway port

interface ServiceStatus {
  id: string;
  name: string;
  version: string;
  url: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN' | 'DEGRADED';
  lastSeen: string;
  registeredAt: string;
  metadata?: Record<string, any>;
  errorDetails?: Record<string, any> | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ServiceStatus[] | { message: string; error?: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    const response = await axios.get<ServiceStatus[]>(`${AI_GATEWAY_URL}/api/services/status`, {
      timeout: 10000, // 10 seconds timeout
    });
    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error fetching system health from AI Gateway:', error);
    let errorMessage = 'Failed to fetch system health from AI Gateway.';
    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = `AI Gateway returned status: ${error.response.status}`;
        console.error('AI Gateway response error data:', error.response.data);
      } else if (error.request) {
        errorMessage = 'No response received from AI Gateway.';
      } else {
        errorMessage = `Axios error: ${error.message}`;
      }
    }
    res.status(500).json({ message: errorMessage, error: error.message });
  }
}
