import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import axios from 'axios';

// Mock data for development when PROJECT_REGISTRY.yml is not available
const mockProjectRegistry = {
  version: '1.1.0',
  last_updated: '2025-06-01',
  maintainer: '@eleazar',
  projects: [
    {
      id: 'ai-homelab-ecosystem',
      name: 'AI Homelab Ecosystem',
      path: '/Users/eleazar/CascadeProjects/ai-homelab-ecosystem',
      description: 'Main ecosystem repository containing infrastructure, documentation, and shared libraries',
      status: 'active',
      docker_compose_files: [
        'infrastructure/ahis-server/docker-compose.yml',
        'infrastructure/authentik/docker-compose.yml',
      ],
      workflow_compliance: {
        source_workflows_path: 'infrastructure/shared-workflows',
        target_workflows_path: '.windsurf/workflows',
        is_workflow_source: true,
        last_sync: '2025-06-01T10:48:06-05:00',
        compliance_score: 100,
      },
    },
    {
      id: 'ai-gateway',
      name: 'AI Gateway',
      path: '/Users/eleazar/CascadeProjects/ai-gateway',
      description: 'API Gateway for AI services and models',
      status: 'active',
      docker_compose_files: [
        'docker-compose.yml',
        'platforms/ai-gateway/docker-compose.yml',
      ],
      workflow_compliance: {
        target_workflows_path: '.windsurf/workflows',
        is_workflow_source: false,
        last_sync: '2025-06-01T10:00:00-05:00',
        compliance_score: 100,
      },
    },
    {
      id: 'lightrag',
      name: 'LightRAG',
      path: '/Users/eleazar/CascadeProjects/lightrag',
      description: 'Lightweight Retrieval-Augmented Generation system',
      status: 'active',
      docker_compose_files: ['docker-compose.yml'],
      workflow_compliance: {
        target_workflows_path: '.windsurf/workflows',
        is_workflow_source: false,
        last_sync: '2025-05-28T09:30:00-05:00',
        compliance_score: 85,
      },
    },
  ],
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Use AHIS variables for server connection
  const AHIS_SERVER_HOST = process.env.NEXT_PUBLIC_AHIS_SERVER_HOST || 'localhost';
  const AHIS_SERVER_PORT = process.env.NEXT_PUBLIC_AHIS_SERVER_PORT || '8888';
  const AHIS_SERVER_URL = `http://${AHIS_SERVER_HOST}:${AHIS_SERVER_PORT}`;

  try {
    // First try to get data from the AHIS server
    try {
      const apiUrl = `${AHIS_SERVER_URL}/api/project-registry`;
      const response = await axios.get(apiUrl);
      
      if (response.data && response.status === 200) {
        console.log('Successfully fetched project registry from AHIS server');
        return res.status(200).json(response.data);
      }
    } catch (apiError) {
      console.warn('Could not fetch project registry from AHIS server, falling back to local file', apiError);
      // Continue to fallback methods
    }

    // Fallback: Try to read the PROJECT_REGISTRY.yml file
    let registryData;
    try {
      const registryPath = path.join(process.cwd(), '..', '..', 'infrastructure', 'PROJECT_REGISTRY.yml');
      const registryContent = fs.readFileSync(registryPath, 'utf8');
      registryData = yaml.load(registryContent) as any;
      console.log('Successfully loaded PROJECT_REGISTRY.yml');
    } catch (readError) {
      console.log('Could not read PROJECT_REGISTRY.yml, using mock data');
      registryData = mockProjectRegistry;
    }

    // Enhance project data with AHIS integration status
    // This is only used when we're using local file or mock data
    const enhancedProjects = registryData.projects.map((project: any) => ({
      ...project,
      ahis_integration: {
        connected: Math.random() > 0.3, // Mock: 70% connected
        last_seen: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random time in last 24h
        progress_tracking: project.workflow_compliance?.compliance_score > 0,
        port_compliance: true, // Assume all active projects are port compliant
      }
    }));

    res.status(200).json({
      success: true,
      data: {
        ...registryData,
        projects: enhancedProjects,
      }
    });
  } catch (error: any) {
    console.error('Error processing project registry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process project registry',
      error: error.message
    });
  }
}
