/**
 * AHIS Compliance API Route
 * 
 * This API route provides compliance scanning and validation functionality for the AI Homelab Ecosystem.
 * It follows the ecosystem-first development principles by routing all communication
 * through the Gateway service mesh.
 */
import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import logger from '@/lib/logger';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import getConfig from 'next/config';

// Get server runtime config
const { serverRuntimeConfig } = getConfig();

// Convert exec to Promise-based
const execPromise = util.promisify(exec);

// Define the AHIS client configuration
interface AHISClientConfig {
  host: string;
  port: number;
  secure: boolean;
  basePath: string;
  authToken?: string;
}

// Get Gateway configuration from environment variables or server runtime config
const getGatewayConfig = (): AHISClientConfig => {
  return {
    host: serverRuntimeConfig.AI_GATEWAY_HOST || process.env.AI_GATEWAY_HOST || 'localhost',
    port: parseInt(serverRuntimeConfig.AI_GATEWAY_PORT || process.env.AI_GATEWAY_PORT || '8080', 10),
    secure: serverRuntimeConfig.AI_GATEWAY_SECURE === 'true' || process.env.AI_GATEWAY_SECURE === 'true',
    basePath: serverRuntimeConfig.AI_GATEWAY_BASE_PATH || process.env.AI_GATEWAY_BASE_PATH || '/api',
    authToken: serverRuntimeConfig.AI_GATEWAY_AUTH_TOKEN || process.env.AI_GATEWAY_AUTH_TOKEN
  };
};

// Build a URL for the Gateway
function buildGatewayUrl(path: string): string {
  const config = getGatewayConfig();
  const protocol = config.secure ? 'https' : 'http';
  const basePath = config.basePath.startsWith('/') 
    ? config.basePath 
    : `/${config.basePath}`;
  
  const pathWithoutLeadingSlash = path.startsWith('/') ? path.substring(1) : path;
  
  return `${protocol}://${config.host}:${config.port}${basePath}/${pathWithoutLeadingSlash}`;
}

// Build headers for Gateway requests
function buildGatewayHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add authorization if available
  const config = getGatewayConfig();
  if (config.authToken) {
    headers['Authorization'] = `Bearer ${config.authToken}`;
  }
  
  return headers;
}

/**
 * Run a compliance test for a project
 * 
 * @param projectId - ID of the project to test
 * @param testType - Type of compliance test to run
 * @returns Test results
 */
async function runComplianceTest(projectId: string, testType: string = 'full') {
  try {
    logger.info(`Running ${testType} compliance test for project ${projectId}`);
    
    // Get the project details from the AHIS server
    const projectUrl = buildGatewayUrl(`ahis/projects/${projectId}`);
    const projectResponse = await axios.get(projectUrl, { headers: buildGatewayHeaders() });
    const project = projectResponse.data;
    
    if (!project || !project.path) {
      throw new Error(`Project ${projectId} not found or has no path`);
    }
    
    // Determine the root directory for the project
    const rootDir = project.path;
    
    // Run the compliance test tool
    const complianceToolPath = path.resolve(rootDir, '../../tools/ahis-client-compliance-test.js');
    
    // Execute the compliance test
    const { stdout, stderr } = await execPromise(`node ${complianceToolPath} --project-id=${projectId} --test-type=${testType}`);
    
    if (stderr) {
      logger.warn(`Compliance test warnings: ${stderr}`);
    }
    
    // Parse the results
    const results = JSON.parse(stdout);
    
    return {
      success: true,
      projectId,
      testType,
      results,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    logger.error('Error running compliance test:', error);
    
    return {
      success: false,
      projectId,
      testType,
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * API handler for compliance testing
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { projectId, testType = 'full' } = req.body;
    
    // Validate required fields
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'Project ID is required' });
    }
    
    // Run the compliance test
    const results = await runComplianceTest(projectId, testType);
    
    // Return the results
    return res.status(200).json(results);
  } catch (error: any) {
    logger.error('Error in compliance API route:', error);
    
    // Return error response
    return res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Unknown error',
        code: error.code || 'INTERNAL_ERROR'
      }
    });
  }
}
