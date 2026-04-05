import type { NextApiRequest, NextApiResponse } from 'next';
import { getResearchSession, updateResearchSession } from '@/lib/db/research-storage';

/**
 * Vision extraction results endpoint
 * GET: Retrieve saved vision extractions for a session
 * PUT: Save vision extraction results to a session
 */

export interface VisionExtraction {
  imageId: string;
  filename: string;
  contentType: string;
  extractedText: string;
  analysis?: string;
  visionModel: string;
  atlasModel?: string;
  extractedAt: string;
  tokens?: {
    visionInput?: number;
    visionOutput?: number;
    atlasInput?: number;
    atlasOutput?: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  if (req.method === 'GET') {
    try {
      const session = await getResearchSession(id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Vision extractions are stored in data_sources.visionExtractions
      const dataSources = typeof session.data_sources === 'string' 
        ? JSON.parse(session.data_sources) 
        : (session.data_sources || {});
      
      return res.status(200).json({ 
        visionExtractions: dataSources.visionExtractions || [],
        attachments: dataSources.attachments || [],
      });
    } catch (error) {
      console.error('[Vision] Error fetching vision data:', error);
      return res.status(500).json({ error: 'Failed to fetch vision data' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { visionExtraction, attachment } = req.body;

      const session = await getResearchSession(id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Get existing data_sources
      const dataSources = typeof session.data_sources === 'string'
        ? JSON.parse(session.data_sources)
        : (session.data_sources || {});

      // Add vision extraction if provided
      if (visionExtraction) {
        if (!dataSources.visionExtractions) {
          dataSources.visionExtractions = [];
        }
        // Check for duplicate by imageId
        const existingIdx = dataSources.visionExtractions.findIndex(
          (v: VisionExtraction) => v.imageId === visionExtraction.imageId
        );
        if (existingIdx >= 0) {
          dataSources.visionExtractions[existingIdx] = visionExtraction;
        } else {
          dataSources.visionExtractions.push(visionExtraction);
        }
      }

      // Add attachment metadata if provided
      if (attachment) {
        if (!dataSources.attachments) {
          dataSources.attachments = [];
        }
        // Check for duplicate by filename
        const existingIdx = dataSources.attachments.findIndex(
          (a: any) => a.filename === attachment.filename
        );
        if (existingIdx >= 0) {
          dataSources.attachments[existingIdx] = attachment;
        } else {
          dataSources.attachments.push(attachment);
        }
      }

      // Update session with new data_sources
      const updated = await updateResearchSession(id, { 
        data_sources: dataSources,
      });
      
      console.log('[Vision] Saved vision data for session:', id, {
        extractionsCount: dataSources.visionExtractions?.length || 0,
        attachmentsCount: dataSources.attachments?.length || 0,
      });

      return res.status(200).json({ 
        success: true,
        visionExtractions: dataSources.visionExtractions,
        attachments: dataSources.attachments,
      });
    } catch (error) {
      console.error('[Vision] Error saving vision data:', error);
      return res.status(500).json({ error: 'Failed to save vision data' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
