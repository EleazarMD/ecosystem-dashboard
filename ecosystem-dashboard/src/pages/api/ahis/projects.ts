/**
 * AHIS Project Registry API Endpoint
 * 
 * Proxies project registry requests to the AHIS server running in k3d cluster
 * Follows the AHIS Dashboard Integration Handoff specifications
 */

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// AHIS server configuration from handoff guide
const AHIS_BASE_URL = process.env.AHIS_BASE_URL || 'http://ahis-server.aihomelab-core.svc.cluster.local:8888';
const AHIS_FALLBACK_URL = process.env.AHIS_FALLBACK_URL || 'http://localhost:8888';

// Project interface based on handoff guide
interface AHISProject {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'development' | 'production';
  type: string;
  repository?: string;
  lastUpdated: string;
  components: string[];
  dependencies: string[];
  health: {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    lastCheck: string;
  };
  metrics: {
    uptime: number;
    requests: number;
    errors: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetProjects(req, res);
  } else if (req.method === 'POST') {
    return handleCreateProject(req, res);
  } else if (req.method === 'PUT') {
    return handleUpdateProject(req, res);
  } else if (req.method === 'DELETE') {
    return handleDeleteProject(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Handle GET /api/ahis/projects - Fetch all projects
 */
async function handleGetProjects(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Try primary AHIS endpoint first (k3d cluster)
    let response;
    let endpoint = AHIS_BASE_URL;
    
    try {
      response = await axios.get(`${AHIS_BASE_URL}/api/ahis/v1/project-registry/projects`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AI-Homelab-Dashboard/1.0'
        }
      });
    } catch (primaryError) {
      console.warn('Primary AHIS endpoint failed, trying fallback:', primaryError);
      
      // Try fallback endpoint (localhost)
      endpoint = AHIS_FALLBACK_URL;
      response = await axios.get(`${AHIS_FALLBACK_URL}/api/ahis/v1/project-registry/projects`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AI-Homelab-Dashboard/1.0'
        }
      });
    }
    
    const projectsData = response.data;
    
    // Enhance projects data with dashboard-specific information
    const enhancedProjects = Array.isArray(projectsData) ? projectsData.map((project: any) => ({
      id: project.id || project.name || 'unknown',
      name: project.name || 'Unknown Project',
      description: project.description || '',
      status: project.status || 'inactive',
      type: project.type || 'service',
      repository: project.repository || '',
      lastUpdated: project.lastUpdated || new Date().toISOString(),
      components: project.components || [],
      dependencies: project.dependencies || [],
      health: {
        score: project.health?.score || 0,
        status: project.health?.status || 'unknown',
        lastCheck: project.health?.lastCheck || new Date().toISOString()
      },
      metrics: {
        uptime: project.metrics?.uptime || 0,
        requests: project.metrics?.requests || 0,
        errors: project.metrics?.errors || 0
      }
    })) : [];
    
    // Calculate summary statistics
    const summary = {
      total: enhancedProjects.length,
      active: enhancedProjects.filter(p => p.status === 'active').length,
      development: enhancedProjects.filter(p => p.status === 'development').length,
      production: enhancedProjects.filter(p => p.status === 'production').length,
      healthy: enhancedProjects.filter(p => p.health.status === 'healthy').length,
      types: [...new Set(enhancedProjects.map(p => p.type))]
    };
    
    return res.status(200).json({
      success: true,
      projects: enhancedProjects,
      summary,
      endpoint,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching AHIS projects:', error);
    
    // Return graceful error response with mock data
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('ECONNREFUSED') || 
                             errorMessage.includes('timeout') || 
                             errorMessage.includes('ENOTFOUND');
    
    // Provide mock projects data when AHIS is unavailable
    const mockProjects: AHISProject[] = [
      {
        id: 'ai-gateway',
        name: 'AI Gateway',
        description: 'Central AI model gateway and proxy service',
        status: 'production',
        type: 'gateway',
        repository: 'https://github.com/ai-homelab/ai-gateway',
        lastUpdated: new Date(Date.now() - 3600000).toISOString(),
        components: ['api-server', 'model-proxy', 'auth-service'],
        dependencies: ['postgresql', 'redis'],
        health: {
          score: 95,
          status: 'healthy',
          lastCheck: new Date().toISOString()
        },
        metrics: {
          uptime: 99.8,
          requests: 15420,
          errors: 12
        }
      },
      {
        id: 'knowledge-graph',
        name: 'Knowledge Graph',
        description: 'Centralized knowledge management and graph database',
        status: 'production',
        type: 'database',
        repository: 'https://github.com/ai-homelab/knowledge-graph',
        lastUpdated: new Date(Date.now() - 1800000).toISOString(),
        components: ['neo4j', 'api-server', 'mcp-server'],
        dependencies: ['neo4j', 'postgresql'],
        health: {
          score: 88,
          status: 'healthy',
          lastCheck: new Date().toISOString()
        },
        metrics: {
          uptime: 99.2,
          requests: 8930,
          errors: 45
        }
      },
      {
        id: 'ecosystem-dashboard',
        name: 'Ecosystem Dashboard',
        description: 'Central monitoring and management dashboard',
        status: 'development',
        type: 'frontend',
        repository: 'https://github.com/ai-homelab/ecosystem-dashboard',
        lastUpdated: new Date().toISOString(),
        components: ['nextjs-app', 'monitoring-widgets'],
        dependencies: ['ahis', 'ai-gateway', 'knowledge-graph'],
        health: {
          score: 75,
          status: 'warning',
          lastCheck: new Date().toISOString()
        },
        metrics: {
          uptime: 95.5,
          requests: 2340,
          errors: 8
        }
      }
    ];
    
    const mockSummary = {
      total: mockProjects.length,
      active: mockProjects.filter(p => p.status === 'active').length,
      development: mockProjects.filter(p => p.status === 'development').length,
      production: mockProjects.filter(p => p.status === 'production').length,
      healthy: mockProjects.filter(p => p.health.status === 'healthy').length,
      types: Array.from(new Set(mockProjects.map(p => p.type)))
    };
    
    return res.status(isConnectionError ? 503 : 500).json({
      success: false,
      projects: mockProjects,
      summary: mockSummary,
      endpoint: 'mock',
      lastUpdated: new Date().toISOString(),
      error: 'AHIS server unavailable',
      message: errorMessage,
      usingMockData: true,
      connectionError: isConnectionError
    });
  }
}

/**
 * Handle POST /api/ahis/projects - Create new project
 */
async function handleCreateProject(req: NextApiRequest, res: NextApiResponse) {
  try {
    const projectData = req.body;
    
    const response = await axios.post(`${AHIS_BASE_URL}/api/ahis/v1/project-registry/projects`, projectData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Homelab-Dashboard/1.0'
      }
    });
    
    return res.status(201).json({
      success: true,
      project: response.data,
      message: 'Project created successfully'
    });
    
  } catch (error) {
    console.error('Error creating AHIS project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handle PUT /api/ahis/projects - Update existing project
 */
async function handleUpdateProject(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const projectData = req.body;
    
    const response = await axios.put(`${AHIS_BASE_URL}/api/ahis/v1/project-registry/projects/${id}`, projectData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Homelab-Dashboard/1.0'
      }
    });
    
    return res.status(200).json({
      success: true,
      project: response.data,
      message: 'Project updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating AHIS project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handle DELETE /api/ahis/projects - Delete project
 */
async function handleDeleteProject(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    
    await axios.delete(`${AHIS_BASE_URL}/api/ahis/v1/project-registry/projects/${id}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'AI-Homelab-Dashboard/1.0'
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting AHIS project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
