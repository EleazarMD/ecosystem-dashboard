import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_API_URL || 'http://localhost:3000';

export interface StartWorkflowResponse {
  success: boolean;
  workflowId?: string;
  status?: string;
  result?: any;
  message?: string; // For errors
  error?: string; // For detailed error messages
  details?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StartWorkflowResponse>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  const { domain, workflow } = req.query;
  const context = req.body || {};

  if (!domain || typeof domain !== 'string' || !['aq', 'eq', 'wq'].includes(domain)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or missing domain query parameter. Must be one of: aq, eq, wq.',
    });
  }

  if (!workflow || typeof workflow !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid or missing workflow query parameter.' 
    });
  }

  try {
    const response = await axios.post<StartWorkflowResponse>(
      `${AI_GATEWAY_URL}/api/v1/${domain}/workflows/${workflow}`,
      context,
      {
        timeout: 30000, // 30 seconds timeout, workflows can take time
      }
    );
    res.status(200).json(response.data);
  } catch (error: any) {
    console.error(`Error starting workflow ${workflow} for domain ${domain} via AI Gateway:`, error);
    let errorMessage = `Failed to start workflow ${workflow} for domain ${domain}.`;
    let errorDetails = null;
    if (axios.isAxiosError(error)) {
        if (error.response) {
            errorMessage = error.response.data?.message || `AI Gateway returned status: ${error.response.status} for starting workflow ${workflow}.`;
            errorDetails = error.response.data?.details;
            return res.status(error.response.status || 500).json({
                success: false,
                message: errorMessage,
                error: error.response.data?.error || error.message,
                details: errorDetails
            });
        } else if (error.request) {
            errorMessage = `No response received from AI Gateway when starting workflow ${workflow}.`;
        } else {
            errorMessage = `Axios error starting workflow ${workflow}: ${error.message}`;
        }
    }
    res.status(500).json({ 
        success: false, 
        message: errorMessage, 
        error: error.message 
    });
  }
}
