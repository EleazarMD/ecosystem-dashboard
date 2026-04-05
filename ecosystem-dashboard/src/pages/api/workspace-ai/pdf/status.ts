/**
 * PDF Ingestion Task Status API Route
 * Polls the NVIDIA RAG Blueprint for real-time task progress
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const INGESTOR_URL = process.env.INGESTOR_URL || 'http://localhost:8082';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { task_id } = req.query;

  if (!task_id || typeof task_id !== 'string') {
    return res.status(400).json({ error: 'task_id is required' });
  }

  try {
    const response = await fetch(`${INGESTOR_URL}/status?task_id=${encodeURIComponent(task_id)}`);
    
    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ 
        error: 'Failed to get task status',
        details: error 
      });
    }

    const data = await response.json();
    
    // Map Blueprint states to progress percentages
    // States: PENDING, STARTED, FINISHED, FAILED
    let progress = 0;
    let stage = 'Waiting...';
    let status = 'processing';
    
    const state = data.state?.toUpperCase();
    const result = data.result || {};
    const hasFailedDocs = result.failed_documents?.length > 0;
    const hasSuccessDocs = result.documents?.length > 0;
    const messageIndicatesFailure = result.message?.toLowerCase().includes('failed');
    
    switch (state) {
      case 'PENDING':
        progress = 35;
        stage = 'Task queued, waiting for processing...';
        break;
      case 'STARTED':
      case 'RUNNING':
        progress = 50;
        stage = 'Processing PDF (extracting text, tables, charts, OCR)...';
        break;
      case 'PROGRESS':
        progress = data.progress || 60;
        stage = data.message || 'Processing...';
        break;
      case 'FINISHED':
      case 'SUCCESS':
        // Check if it actually succeeded or had failures
        if (messageIndicatesFailure || (hasFailedDocs && !hasSuccessDocs)) {
          progress = 0;
          stage = result.failed_documents?.[0]?.error_message || result.message || 'Ingestion failed';
          status = 'error';
        } else {
          progress = 100;
          stage = 'Ingestion complete!';
          status = 'success';
        }
        break;
      case 'FAILED':
      case 'FAILURE':
        progress = 0;
        stage = result.message || result.failed_documents?.[0]?.error_message || 'Ingestion failed';
        status = 'error';
        break;
      default:
        progress = 40;
        stage = `Processing (${data.state || 'unknown'})...`;
    }

    return res.status(200).json({
      task_id,
      state: data.state,
      progress,
      stage,
      status,
      result: data.result,
    });

  } catch (error: any) {
    console.error('[Task Status] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
