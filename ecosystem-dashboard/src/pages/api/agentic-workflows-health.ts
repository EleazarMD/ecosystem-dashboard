import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_API_URL || 'http://localhost:3000';

// This interface should match the response from GET /api/v1/workflows/health
export interface AgenticWorkflowsHealthResponse {
  status: string;
  timestamp: string;
  registeredDomains: string[];
  activeWorkflowsCount: number;
  // Add any other relevant fields
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AgenticWorkflowsHealthResponse | { message: string; error?: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    const response = await axios.get<AgenticWorkflowsHealthResponse>(
      `${AI_GATEWAY_URL}/api/v1/workflows/health`,
      {
        timeout: 10000, // 10 seconds timeout
      }
    );
    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error fetching agentic workflows health from AI Gateway:', error);
    let errorMessage = 'Failed to fetch agentic workflows health.';
    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = `AI Gateway returned status: ${error.response.status} for health check.`;
        console.error('AI Gateway response error data:', error.response.data);
        return res.status(error.response.status || 500).json({
          message: error.response.data?.message || errorMessage,
          error: error.response.data?.error || error.message 
        });
      } else if (error.request) {
        errorMessage = 'No response received from AI Gateway for health check.';
      } else {
        errorMessage = `Axios error fetching agentic workflows health: ${error.message}`;
      }
    }
    res.status(500).json({ message: errorMessage, error: error.message });
  }
}
