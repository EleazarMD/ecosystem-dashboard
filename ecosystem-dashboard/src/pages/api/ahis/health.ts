/**
 * AHIS Health Check API Endpoint
 * 
 * Proxies health check requests to the AHIS server running in k3d cluster
 * Follows the AHIS Dashboard Integration Handoff specifications
 */

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// AHIS server configuration from handoff guide
const AHIS_BASE_URL = process.env.AHIS_BASE_URL || 'http://ahis-server.aihomelab-core.svc.cluster.local:8888';
const AHIS_FALLBACK_URL = process.env.AHIS_FALLBACK_URL || 'http://localhost:8888';

// Circuit breaker to prevent infinite retries
let circuitBreakerState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
  openUntil: 0
};

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
const CIRCUIT_BREAKER_RESET_TIME = 60000; // 1 minute

// Health check response interface
interface AHISHealthResponse {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  service: string;
  uptime: number;
  dependencies: {
    database: { status: string };
    'port-registry': { status: string };
    'project-registry': { status: string };
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check circuit breaker
  const now = Date.now();
  if (circuitBreakerState.isOpen && now < circuitBreakerState.openUntil) {
    console.log('Circuit breaker is open, returning cached error response');
    return res.status(503).json({
      status: 'offline',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: 'development',
      service: 'ahis-server',
      uptime: 0,
      dependencies: {
        database: { status: 'unknown' },
        'port-registry': { status: 'unknown' },
        'project-registry': { status: 'unknown' }
      },
      endpoint: 'circuit-breaker-open',
      responseTime: 0,
      dashboardConnected: false,
      lastChecked: new Date().toISOString(),
      healthScore: 0,
      connectionInfo: {
        primary: false,
        fallback: false,
        endpoint: 'circuit-breaker',
        method: 'none'
      },
      error: 'Circuit breaker open - too many failures',
      message: 'AHIS health checks temporarily disabled due to repeated failures',
      connectionError: true,
      usingMockData: true,
      circuitBreakerOpen: true
    });
  }

  try {
    // Try primary AHIS endpoint first (k3d cluster)
    let response;
    let endpoint = AHIS_BASE_URL;
    
    try {
      response = await axios.get(`${AHIS_BASE_URL}/health`, {
        timeout: 2000, // Reduced timeout to fail faster
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AI-Homelab-Dashboard/1.0'
        }
      });
      
      // Reset circuit breaker on success
      circuitBreakerState.failures = 0;
      circuitBreakerState.isOpen = false;
      
    } catch (primaryError) {
      console.warn('Primary AHIS endpoint failed, trying fallback:', primaryError);
      
      // Try fallback endpoint (localhost)
      endpoint = AHIS_FALLBACK_URL;
      response = await axios.get(`${AHIS_FALLBACK_URL}/health`, {
        timeout: 2000, // Reduced timeout to fail faster
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AI-Homelab-Dashboard/1.0'
        }
      });
      
      // Reset circuit breaker on fallback success
      circuitBreakerState.failures = 0;
      circuitBreakerState.isOpen = false;
    }
    
    // Process the response
    const healthData: AHISHealthResponse = response.data;
    
    // Enhance the response with dashboard-specific information
    const enhancedResponse = {
      ...healthData,
      endpoint,
      responseTime: Date.now() - Date.parse(healthData.timestamp),
      dashboardConnected: true,
      lastChecked: new Date().toISOString(),
      // Calculate overall health score
      healthScore: calculateHealthScore(healthData),
      // Add connection metadata
      connectionInfo: {
        primary: endpoint === AHIS_BASE_URL,
        fallback: endpoint === AHIS_FALLBACK_URL,
        endpoint,
        method: 'HTTP'
      }
    };
    
    return res.status(200).json(enhancedResponse);
  } catch (error) {
    console.error('Error fetching AHIS health:', error);
    
    // Update circuit breaker state
    circuitBreakerState.failures++;
    circuitBreakerState.lastFailure = Date.now();
    
    if (circuitBreakerState.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      circuitBreakerState.isOpen = true;
      circuitBreakerState.openUntil = Date.now() + CIRCUIT_BREAKER_RESET_TIME;
      console.log(`Circuit breaker opened after ${circuitBreakerState.failures} failures. Will reset at ${new Date(circuitBreakerState.openUntil)}`);
    }
    
    // Return graceful error response with mock data for development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('ECONNREFUSED') || 
                             errorMessage.includes('timeout') || 
                             errorMessage.includes('ENOTFOUND');
    
    // Provide mock health data when AHIS is unavailable
    const mockHealthData = {
      status: 'offline',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: 'development',
      service: 'ahis-server',
      uptime: 0,
      dependencies: {
        database: { status: 'unknown' },
        'port-registry': { status: 'unknown' },
        'project-registry': { status: 'unknown' }
      },
      endpoint: 'unavailable',
      responseTime: 0,
      dashboardConnected: false,
      lastChecked: new Date().toISOString(),
      healthScore: 0,
      connectionInfo: {
        primary: false,
        fallback: false,
        endpoint: 'none',
        method: 'none'
      },
      error: 'AHIS server unavailable',
      message: errorMessage,
      connectionError: isConnectionError,
      usingMockData: true
    };
    
    return res.status(503).json(mockHealthData);
  }
}

/**
 * Calculate overall health score based on AHIS health data
 */
function calculateHealthScore(healthData: AHISHealthResponse): number {
  let score = 0;
  
  // Base score for service being up
  if (healthData.status === 'ok') {
    score += 40;
  }
  
  // Score for each dependency
  const dependencies = healthData.dependencies;
  const depCount = Object.keys(dependencies).length;
  const healthyDeps = Object.values(dependencies).filter(dep => dep.status === 'ok').length;
  
  if (depCount > 0) {
    score += (healthyDeps / depCount) * 60;
  }
  
  return Math.round(score);
}

export default handler;
