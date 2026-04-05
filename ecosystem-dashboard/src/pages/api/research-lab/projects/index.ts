import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createResearchProject,
  getAllResearchProjects,
  getProjectsWithSessionCounts,
} from '@/lib/db/research-storage';

/**
 * API endpoint for research projects
 * GET: List all projects (with optional session counts)
 * POST: Create a new project
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { withCounts, status, limit } = req.query;
      
      if (withCounts === 'true') {
        const projects = await getProjectsWithSessionCounts();
        return res.status(200).json({ projects });
      }
      
      const projects = await getAllResearchProjects(
        status as 'active' | 'archived' | 'completed' | undefined,
        limit ? parseInt(limit as string) : 100
      );
      return res.status(200).json({ projects });
    }
    
    if (req.method === 'POST') {
      const { name, description, color, icon, tags } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Project name is required' });
      }
      
      // Generate a unique project ID
      const projectId = `project-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      const project = await createResearchProject({
        project_id: projectId,
        name: name.trim(),
        description: description?.trim() || undefined,
        color: color || 'purple',
        icon: icon || 'folder',
        tags: tags || [],
      });
      
      return res.status(201).json({ project });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[Projects API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
