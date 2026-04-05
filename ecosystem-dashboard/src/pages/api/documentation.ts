/**
 * API Route: /api/documentation
 * 
 * This API route provides access to documentation across the AI Homelab Ecosystem
 * using the AHIS (AI Homelab Infrastructure Server) through the AI Gateway following ecosystem-first design principles.
 * 
 * It includes fallback mock data to ensure the dashboard remains functional even when
 * the AHIS is unavailable.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Build the AHIS URL for documentation requests
function buildAHISServerUrl(): string {
  // Use AHIS environment variables for server connection
  const host = process.env.AHIS_SERVER_HOST || 'localhost';
  const port = parseInt(process.env.AHIS_SERVER_PORT || '8888', 10);
  const secure = process.env.AHIS_SERVER_SECURE === 'true';
  
  const protocol = secure ? 'https' : 'http';
  return `${protocol}://${host}:${port}/dashboard/api/documentation`;
}

// Mock documentation data for fallback when AHIS is unavailable
const mockDocumentationData = {
  success: true,
  data: [
    {
      id: 1,
      title: 'AI Gateway Integration Guide',
      path: '/docs/technical/ai-gateway/integration.md',
      type: 'markdown',
      project: 'ai-gateway',
      summary: 'How to integrate services with the AI Gateway',
      lastUpdated: '2025-04-15T10:30:00Z'
    },
    {
      id: 2,
      title: 'Model Configuration',
      path: '/docs/technical/ai-gateway/models.md',
      type: 'markdown',
      project: 'ai-gateway',
      summary: 'Configure and manage AI models in the Gateway',
      lastUpdated: '2025-04-20T14:45:00Z'
    },
    {
      id: 3,
      title: 'Dashboard Integration',
      path: '/docs/technical/ahis-server/dashboard.md',
      type: 'markdown',
      project: 'ahis-server',
      summary: 'AHIS dashboard integration guide',
      lastUpdated: '2025-04-25T09:15:00Z'
    },
    {
      id: 4,
      title: 'AI Homelab Architecture',
      path: '/docs/architecture/overview.md',
      type: 'markdown',
      project: 'ecosystem',
      summary: 'Overview of the AI Homelab Ecosystem architecture',
      lastUpdated: '2025-04-10T16:20:00Z'
    }
  ]
};

/**
 * Documentation API handler
 * 
 * Retrieves documentation entries from the AHIS through the AI Gateway.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get query parameters
    const { query, project, type, path } = req.query;
    
    // Build headers for Gateway request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (process.env.AI_GATEWAY_AUTH_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.AI_GATEWAY_AUTH_TOKEN}`;
    }
    
    try {
      // Get documentation directly from the AHIS
      const ahisUrl = buildAHISServerUrl();
      const response = await axios.get(ahisUrl, { 
        params: {
          query: query || '',
          project: project || '',
          type: type || '',
          path: path || ''
        },
        headers,
        timeout: 3000 // Set a short timeout to fail fast if AHIS is unavailable
      });
      
      // Check for success
      if (response.data.success === false) {
        throw new Error(response.data.error || 'Unknown error');
      }
      
      // Return the documentation results
      return res.status(200).json({
        success: true,
        data: response.data.result
      });
    } catch (mcpError: unknown) {
      const errorMessage = mcpError instanceof Error ? mcpError.message : 'Unknown error';
      console.warn('AHIS documentation endpoint unavailable, using mock data:', errorMessage);
      
      // Filter mock data based on query parameters
      let filteredData = [...mockDocumentationData.data];
      
      if (query) {
        const searchQuery = String(query).toLowerCase();
        filteredData = filteredData.filter(doc => 
          doc.title.toLowerCase().includes(searchQuery) || 
          doc.summary.toLowerCase().includes(searchQuery)
        );
      }
      
      if (project) {
        filteredData = filteredData.filter(doc => 
          doc.project === project
        );
      }
      
      if (type) {
        filteredData = filteredData.filter(doc => 
          doc.type === type
        );
      }
      
      // Return mock data
      return res.status(200).json({
        success: true,
        data: filteredData,
        source: 'mock' // Indicate this is mock data
      });
    }
  } catch (error: any) {
    console.error('Error in documentation API handler:', error);
    
    // Return mock data as fallback in case of any error
    return res.status(200).json({
      success: true,
      data: mockDocumentationData.data,
      source: 'mock',
      fallback: true
    });
  }
}
