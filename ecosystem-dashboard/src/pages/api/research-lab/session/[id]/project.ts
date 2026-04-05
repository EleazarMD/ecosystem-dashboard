import type { NextApiRequest, NextApiResponse } from 'next';
import { assignSessionToProject, getResearchSession } from '@/lib/db/research-storage';

/**
 * API endpoint for assigning a session to a project
 * PUT: Assign session to a project (or remove from project if projectId is null)
 * GET: Get the current project assignment for a session
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  
  try {
    if (req.method === 'GET') {
      const session = await getResearchSession(id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      return res.status(200).json({ 
        session_id: session.session_id,
        project_id: session.project_id || null,
        parent_session_id: session.parent_session_id || null,
        session_type: session.session_type || 'original',
      });
    }
    
    if (req.method === 'PUT') {
      const { projectId } = req.body;
      
      // projectId can be null to remove from project
      const session = await assignSessionToProject(id, projectId || null);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      return res.status(200).json({ 
        session_id: session.session_id,
        project_id: session.project_id,
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[Session Project API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
