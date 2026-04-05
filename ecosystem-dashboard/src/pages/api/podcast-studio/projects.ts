import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  getResearchMaterials,
  pool,
} from '@/lib/db/podcast-studio-db';

/**
 * API endpoint for managing podcast studio projects/notebooks
 * Connected to PostgreSQL database (ecosystem_unified.podcast schema)
 * 
 * GET: List all projects
 * POST: Create a new project
 * DELETE: Delete a project by ID
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      // Get single project by ID or list all
      const { id } = req.query;
      
      if (id && typeof id === 'string') {
        const project = await getProjectById(id);
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }
        // Include research materials count
        const materials = await getResearchMaterials(id);
        return res.status(200).json({
          ...project,
          researchMaterials: materials,
          metadata: {
            ...project.metadata,
            sourceCount: materials.length,
          },
        });
      }
      
      // Return all projects with material counts
      const projects = await getAllProjects();
      const projectsWithCounts = await Promise.all(
        projects.map(async (project) => {
          const materials = await getResearchMaterials(project.id);
          return {
            ...project,
            name: project.title, // NotebookSelector expects 'name'
            researchMaterials: materials,
            metadata: {
              ...project.metadata,
              sourceCount: materials.length,
            },
          };
        })
      );
      
      return res.status(200).json(projectsWithCounts);
    }

    if (req.method === 'POST') {
      // Create a new project
      const { name, title, description, metadata } = req.body;

      const newProject = await createProject({
        title: title || name || 'Untitled Notebook',
        description: description || '',
        status: 'draft',
        created_by: 'admin', // Single-tenant: admin user
        metadata: {
          emoji: metadata?.emoji || '🎙️',
          backgroundColor: metadata?.backgroundColor || '#E8F5E9',
          ...metadata,
        },
        script_length: 'essential',
        script_tone: 'conversational',
        script_audience: 'general',
        script_style: 'co-host',
        include_stories: true,
        include_examples: true,
      });

      return res.status(201).json({
        ...newProject,
        name: newProject.title,
      });
    }

    if (req.method === 'PUT') {
      // Update a project
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Project ID required' });
      }

      const updates = req.body;
      const updatedProject = await updateProject(id, updates);
      
      return res.status(200).json(updatedProject);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Project ID required' });
      }

      // Delete project and cascade to related tables
      await pool.query('DELETE FROM podcast_projects WHERE id = $1', [id]);
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ Podcast projects API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
