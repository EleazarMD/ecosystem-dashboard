import type { NextApiRequest, NextApiResponse } from 'next';
import { getResearchSession, updateResearchSession } from '@/lib/db/research-storage';

/**
 * GET/PUT endpoint for research session analysis
 * GET: Retrieve saved analysis for a session
 * PUT: Save analysis results to a session
 */
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
      
      // Handle case where analysis might be stored as string
      let analysis = session.analysis;
      if (typeof analysis === 'string') {
        try {
          analysis = JSON.parse(analysis);
        } catch {
          console.error('[Analysis] Failed to parse analysis string');
          analysis = null;
        }
      }
      
      console.log('[Analysis] GET for session:', id, {
        hasAnalysis: !!analysis,
        topicsCount: analysis?.topics?.length || 0,
      });
      
      return res.status(200).json({ analysis: analysis || null });
    } catch (error) {
      console.error('Error fetching analysis:', error);
      return res.status(500).json({ error: 'Failed to fetch analysis' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { analysis } = req.body;

      if (!analysis) {
        return res.status(400).json({ error: 'analysis is required' });
      }

      const session = await getResearchSession(id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const updated = await updateResearchSession(id, { analysis });
      
      console.log('[Analysis] Saved analysis for session:', id, {
        topics: analysis.topics?.length || 0,
        gaps: analysis.gaps?.length || 0,
      });

      return res.status(200).json({ 
        success: true, 
        analysis: updated?.analysis || analysis 
      });
    } catch (error) {
      console.error('Error saving analysis:', error);
      return res.status(500).json({ error: 'Failed to save analysis' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
