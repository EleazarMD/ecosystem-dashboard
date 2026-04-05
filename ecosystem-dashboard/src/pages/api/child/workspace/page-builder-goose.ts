/**
 * Goose-Powered Page Builder Agent
 * 
 * Connects to the Goose backend for intelligent natural language understanding
 * and recipe-based workflow execution.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const GOOSE_API_URL = process.env.GOOSE_API_URL || 'http://localhost:8000';

interface GooseRequest {
  agent_id: string;
  session_id: string;
  message: string;
  context: {
    page_id?: string;
    page_title?: string;
    page_blocks?: any[];
    workspace_id?: string;
    child_profile?: any;
  };
}

interface GooseResponse {
  success: boolean;
  message: string;
  actions?: Array<{
    type: string;
    data: any;
  }>;
  options?: Array<{
    id: string;
    label: string;
    value: string;
  }>;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { message, sessionId, currentPage, childProfile } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Prepare Goose request
    const gooseRequest: GooseRequest = {
      agent_id: 'page-builder-agent',
      session_id: sessionId || `page-builder-${Date.now()}`,
      message: message,
      context: {
        page_id: currentPage?.id,
        page_title: currentPage?.title,
        page_blocks: currentPage?.blocks,
        workspace_id: currentPage?.workspaceId,
        child_profile: childProfile,
      },
    };

    // Call Goose backend
    const gooseResponse = await fetch(`${GOOSE_API_URL}/api/goose/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gooseRequest),
    });

    if (!gooseResponse.ok) {
      throw new Error(`Goose API error: ${gooseResponse.statusText}`);
    }

    const result: GooseResponse = await gooseResponse.json();

    // Return Goose response to frontend
    return res.status(200).json({
      success: result.success,
      message: {
        role: 'assistant',
        content: result.message,
        options: result.options,
      },
      actions: result.actions,
      sessionId: gooseRequest.session_id,
    });

  } catch (error) {
    console.error('[PageBuilderGoose] Error:', error);
    return res.status(500).json({
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
