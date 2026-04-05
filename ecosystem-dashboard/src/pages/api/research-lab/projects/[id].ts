import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getResearchProject,
  updateResearchProject,
  deleteResearchProject,
  getProjectSessions,
} from '@/lib/db/research-storage';

/**
 * API endpoint for a specific research project
 * GET: Get project details (optionally with sessions)
 * PUT/PATCH: Update project
 * DELETE: Delete project
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  
  try {
    if (req.method === 'GET') {
      const { includeSessions, sessionLimit } = req.query;
      
      const project = await getResearchProject(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      if (includeSessions === 'true') {
        const sessions = await getProjectSessions(id, sessionLimit ? parseInt(sessionLimit as string) : 50);
        return res.status(200).json({ project, sessions });
      }
      
      return res.status(200).json({ project });
    }
    
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const { name, description, color, icon, status, tags, metadata } = req.body;
      
      const project = await updateResearchProject(id, {
        name,
        description,
        color,
        icon,
        status,
        tags,
        metadata,
      });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      return res.status(200).json({ project });
    }
    
    if (req.method === 'DELETE') {
      const deleted = await deleteResearchProject(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[Project API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
