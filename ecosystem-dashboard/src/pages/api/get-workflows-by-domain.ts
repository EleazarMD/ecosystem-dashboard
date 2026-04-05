import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_API_URL || 'http://localhost:3000';

export interface WorkflowInfo {
  name: string;
  domain: string;
  endpoint: string;
}

export interface AvailableWorkflowsResponse {
  domain: string;
  workflows: WorkflowInfo[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AvailableWorkflowsResponse | { message: string; error?: string }>,
) {
  const { domain } = req.query;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  if (!domain || typeof domain !== 'string' || !['aq', 'eq', 'wq'].includes(domain)) {
    return res.status(400).json({
      message: 'Invalid or missing domain query parameter. Must be one of: aq, eq, wq.',
    });
  }

  try {
    const response = await axios.get<AvailableWorkflowsResponse>(
      `${AI_GATEWAY_URL}/api/v1/${domain}/workflows`,
      {
        timeout: 10000, // 10 seconds timeout
      }
    );
    res.status(200).json(response.data);
  } catch (error: any) {
    console.error(`Error fetching workflows for domain ${domain} from AI Gateway:`, error);
    let errorMessage = `Failed to fetch workflows for domain ${domain}.`;
    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = `AI Gateway returned status: ${error.response.status} for domain ${domain}.`;
        console.error('AI Gateway response error data:', error.response.data);
      } else if (error.request) {
        errorMessage = `No response received from AI Gateway for domain ${domain}.`;
      } else {
        errorMessage = `Axios error fetching workflows for domain ${domain}: ${error.message}`;
      }
    }
    res.status(500).json({ message: errorMessage, error: error.message });
  }
}
