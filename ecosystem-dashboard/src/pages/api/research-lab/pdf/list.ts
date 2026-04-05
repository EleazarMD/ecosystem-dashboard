/**
 * PDF List API Endpoint
 * Lists all PDF documents saved in a workspace
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getPDFAnalysisService } from '../../../../lib/research/pdf-analysis-service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workspace_id, limit } = req.query;
    const workspaceId = (workspace_id as string) || 'default';
    const docLimit = parseInt(limit as string) || 50;

    console.log(`[PDF List] Listing documents in workspace ${workspaceId}`);

    const pdfService = getPDFAnalysisService();
    const documents = await pdfService.listDocuments(workspaceId, docLimit);

    return res.status(200).json({
      success: true,
      workspace_id: workspaceId,
      documents,
      total: documents.length,
    });

  } catch (error: any) {
    console.error('[PDF List] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
