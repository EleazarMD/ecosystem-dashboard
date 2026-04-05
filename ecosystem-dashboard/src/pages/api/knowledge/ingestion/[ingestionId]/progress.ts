import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Knowledge Graph Ingestion Progress API
 * 
 * Tracks the progress of document ingestion operations
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ingestionId } = req.query;

    if (!ingestionId || typeof ingestionId !== 'string') {
      return res.status(400).json({ error: 'Ingestion ID is required' });
    }

    // Mock progress tracking - in production this would:
    // 1. Query ingestion status from database
    // 2. Check Knowledge Graph ingestion progress
    // 3. Return real-time status and metrics
    
    // Simulate different stages of ingestion
    const now = Date.now();
    const createdTime = now - (Math.random() * 30000); // Up to 30 seconds ago
    const elapsed = now - createdTime;
    
    let status = 'processing';
    let progress = 60;
    
    if (elapsed > 20000) {
      status = 'completed';
      progress = 100;
    } else if (elapsed > 15000) {
      status = 'finalizing';
      progress = 90;
    } else if (elapsed > 10000) {
      status = 'indexing';
      progress = 80;
    } else if (elapsed > 5000) {
      status = 'extracting';
      progress = 70;
    }

    const mockProgress = {
      ingestion_id: ingestionId,
      status,
      progress,
      stage: status,
      processed: Math.floor((progress / 100) * 15),
      total: 15,
      current_document: status === 'completed' ? null : 'architecture.md',
      metrics: {
        documents_processed: Math.floor((progress / 100) * 15),
        nodes_created: Math.floor((progress / 100) * 45),
        relationships_created: Math.floor((progress / 100) * 120),
        embeddings_generated: Math.floor((progress / 100) * 850),
        entities_extracted: Math.floor((progress / 100) * 180)
      },
      timestamps: {
        started: new Date(createdTime).toISOString(),
        last_update: new Date().toISOString(),
        estimated_completion: status === 'completed' ? 
          new Date().toISOString() : 
          new Date(now + ((100 - progress) * 200)).toISOString()
      },
      errors: []
    };

    console.log(`Ingestion progress for ${ingestionId}: ${progress}% (${status})`);

    return res.status(200).json({
      success: true,
      data: mockProgress
    });

  } catch (error: any) {
    console.error('Progress tracking error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get ingestion progress',
      message: error.message
    });
  }
}
