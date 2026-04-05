import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import logger from '@/lib/logger';

/**
 * API route for fetching projects from the AHIS server
 * This is a proxy endpoint that forwards requests to the AHIS server
 * and handles error cases with appropriate fallbacks
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Use AHIS variables for server connection
  const AHIS_SERVER_HOST = process.env.NEXT_PUBLIC_AHIS_SERVER_HOST || 'localhost';
  const AHIS_SERVER_PORT = process.env.NEXT_PUBLIC_AHIS_SERVER_PORT || '8888';
  const AHIS_SERVER_URL = `http://${AHIS_SERVER_HOST}:${AHIS_SERVER_PORT}`;

  try {
    // First try to get data from the AHIS/MCP server
    try {
      const apiUrl = `${AHIS_SERVER_URL}/api/projects`;
      logger.info(`Fetching projects from: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        timeout: 5000, // 5 second timeout
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.data && response.status === 200) {
        logger.info('Successfully fetched projects from AHIS/MCP server');
        return res.status(200).json(response.data);
      }
    } catch (apiError: any) {
      logger.warn(`Could not fetch projects from AHIS/MCP server: ${apiError.message}`);
      // Continue to fallback
    }

    // Fallback: Use project registry data as a proxy for projects
    try {
      // Use the internal project-registry endpoint which has its own fallbacks
      const registryResponse = await axios.get(`${req.headers.host?.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/project-registry`);
      
      if (registryResponse.data && registryResponse.data.success) {
        const projects = registryResponse.data.data.projects.map((project: any) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          path: project.path,
          // Add any other fields needed by the UI
        }));
        
        logger.info('Successfully created projects from project registry data');
        return res.status(200).json({
          success: true,
          data: projects
        });
      }
    } catch (registryError: any) {
      logger.warn(`Could not use project registry as fallback: ${registryError.message}`);
    }

    // Final fallback: Return mock data
    const mockProjects = [
      {
        id: 'ai-homelab-ecosystem',
        name: 'AI Homelab Ecosystem',
        description: 'Main ecosystem repository',
        status: 'active',
        path: '/Users/eleazar/CascadeProjects/ai-homelab-ecosystem'
      },
      {
        id: 'ecosystem-dashboard',
        name: 'Ecosystem Dashboard',
        description: 'Dashboard for the AI Homelab Ecosystem',
        status: 'active',
        path: '/Users/eleazar/CascadeProjects/ai-homelab-ecosystem/platforms/ecosystem-dashboard'
      }
    ];

    logger.info('Using mock projects data as final fallback');
    return res.status(200).json({
      success: true,
      data: mockProjects,
      source: 'mock'
    });

  } catch (error: any) {
    logger.error('Error processing projects request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process projects request',
      error: error.message
    });
  }
}
