/**
 * IDE Memory Analytics API
 * 
 * Provides advanced analytics for IDE memories including:
 * - Time series validation data
 * - Component relationship strength
 * - Pattern detection metrics
 * - Knowledge Graph health indicators
 * 
 * @module api/ide-memory/analytics
 * @updated 2025-07-18
 * @version 1.0.0
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Path to the intelligent memory proxy script
const MEMORY_PROXY_SCRIPT = '../../../../../../../core/knowledge-graph/scripts/intelligent-memory-proxy.js';

// Verify script exists
const scriptExists = fs.existsSync(MEMORY_PROXY_SCRIPT);
console.log(`[ide-memory/analytics] Script path ${MEMORY_PROXY_SCRIPT} exists: ${scriptExists}`);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[ide-memory/analytics] API handler called with method:', req.method);
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!scriptExists) {
    console.error('[ide-memory/analytics] Memory proxy script not found at path:', MEMORY_PROXY_SCRIPT);
    return res.status(500).json({ error: 'Memory proxy script not found' });
  }

  try {
    const { timeRange = '30d', component } = req.query;
    
    console.log(`[ide-memory/analytics] Query params:`, {
      timeRange: timeRange || 'all',
      component: component || 'all'
    });

    // Get advanced analytics data from the memory proxy
    const analyticsData = await fetchMemoryAnalytics(timeRange as string, component as string);
    
    // Return the analytics data
    return res.status(200).json({
      ...analyticsData,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[ide-memory/analytics] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Fetch memory analytics data from the intelligent memory proxy
 */
async function fetchMemoryAnalytics(timeRange: string, component?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      console.log(`[ide-memory/analytics] Fetching analytics data with timeRange=${timeRange}, component=${component || 'all'}`);
      
      // Prepare MCP message for analytics request
      const mcpMessage = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'ide_memory_analyze', // Using the KG MCP method for memory analysis
          arguments: {
            time_range: timeRange,
            component: component || undefined,
            include_kg_health: true,
            include_pattern_detection: true
          }
        }
      };
      
      console.log('[ide-memory/analytics] Sending MCP message:', JSON.stringify(mcpMessage));
      
      // Execute the intelligent memory proxy script
      const proxyProcess = spawn('node', [MEMORY_PROXY_SCRIPT], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Set timeout (2 minutes)
      const timeout = setTimeout(() => {
        proxyProcess.kill();
        reject(new Error('Memory proxy timeout after 120 seconds'));
      }, 120000);
      
      // Send the MCP message to the script's stdin
      proxyProcess.stdin.write(JSON.stringify(mcpMessage));
      proxyProcess.stdin.end();
      
      // Collect stdout data
      let stdoutData = '';
      proxyProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });
      
      // Collect stderr data
      let stderrData = '';
      proxyProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
        console.error(`[ide-memory/analytics] Stderr: ${data}`);
      });
      
      // Handle process completion
      proxyProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code !== 0) {
          console.error(`[ide-memory/analytics] Process exited with code ${code}`);
          console.error(`[ide-memory/analytics] Stderr: ${stderrData}`);
          
          // If the MCP call fails, return error instead of sample data
          console.error('[ide-memory/analytics] MCP call failed - no fallback data available');
          reject(new Error(`IDE Memory analytics unavailable: Process exited with code ${code}`));
          return;
        }
        
        try {
          // Try to parse the JSON response
          const response = JSON.parse(stdoutData);
          
          if (response.error) {
            console.error(`[ide-memory/analytics] MCP error: ${JSON.stringify(response.error)}`);
            // Return error instead of sample data if MCP returns an error
            reject(new Error(`IDE Memory analytics error: ${JSON.stringify(response.error)}`));
            return;
          }
          
          // Extract result data from the MCP response
          const result = response.result;
          
          if (!result) {
            console.error('[ide-memory/analytics] Invalid MCP response: No result found');
            // Return error instead of sample data if response is invalid
            reject(new Error('IDE Memory analytics: Invalid MCP response - no result found'));
            return;
          }
          
          // Transform the MCP response into the expected format
          const analyticsData = {
            timeSeriesData: result.time_series_data || [],
            relationshipStrength: result.relationship_strength || [],
            patternDetection: result.pattern_detection || [],
            kgHealthMetrics: result.kg_health_metrics || {},
            component: component || 'all',
            timeRange
          };
          
          console.log('[ide-memory/analytics] Successfully fetched analytics data');
          resolve(analyticsData);
        } catch (err: any) {
          console.error(`[ide-memory/analytics] Error parsing MCP response: ${err.message}`);
          console.error(`[ide-memory/analytics] Raw stdout: ${stdoutData}`);
          
          // Return error instead of sample data if JSON parsing fails
          console.error('[ide-memory/analytics] JSON parsing failed - no fallback data available');
          reject(new Error(`IDE Memory analytics: JSON parsing failed - ${err.message}`));
        }
      });
      
      // Handle process errors
      proxyProcess.on('error', (err) => {
        clearTimeout(timeout);
        console.error(`[ide-memory/analytics] Process error: ${err.message}`);
        
        // Return error instead of sample data in case of process error
        reject(new Error(`IDE Memory analytics: Process error - ${err.message}`));
      });
    } catch (err: any) {
      console.error(`[ide-memory/analytics] Unexpected error: ${err.message}`);
      
      // Return error instead of sample data in case of unexpected error
      reject(new Error(`IDE Memory analytics: Unexpected error - ${err.message}`));
    }
  });
}

/**
 * Generate sample analytics data for development purposes
 */
function generateSampleAnalyticsData(timeRange: string, component?: string): any {
  const now = new Date();
  const timeSeriesData = [];
  
  // Determine number of data points based on time range
  let days = 30;
  if (timeRange === '7d') days = 7;
  if (timeRange === '90d') days = 90;
  if (timeRange === '365d') days = 365;
  
  // Generate time series data
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(now.getDate() - (days - i));
    
    timeSeriesData.push({
      date: date.toISOString().split('T')[0],
      validCount: Math.floor(Math.random() * 10) + 5,
      warningCount: Math.floor(Math.random() * 5),
      invalidCount: Math.floor(Math.random() * 3),
      totalMemories: Math.floor(Math.random() * 15) + 8
    });
  }
  
  // Components for relationship strength
  const components = [
    'authentication', 'api-gateway', 'service-mesh', 
    'port-registry', 'memory-management', 'knowledge-graph'
  ];
  
  // Filter by component if specified
  const filteredComponents = component 
    ? components.filter(c => c === component || c === 'knowledge-graph')
    : components;
    
  // Generate relationship strength data
  const relationshipStrength = filteredComponents.map(c => ({
    component: c,
    connections: Math.floor(Math.random() * 20) + 5,
    strength: Math.random().toFixed(2),
    validationScore: (Math.random() * 100).toFixed(1)
  }));
  
  // Generate pattern detection metrics
  const patternDetection = [
    {
      pattern: 'PortAssignment',
      occurrences: Math.floor(Math.random() * 30) + 10,
      validationRate: (75 + Math.random() * 25).toFixed(1)
    },
    {
      pattern: 'ServiceArchitecture',
      occurrences: Math.floor(Math.random() * 20) + 5,
      validationRate: (80 + Math.random() * 20).toFixed(1)
    },
    {
      pattern: 'AuthenticationFlow',
      occurrences: Math.floor(Math.random() * 15) + 3,
      validationRate: (85 + Math.random() * 15).toFixed(1)
    },
    {
      pattern: 'ApiEndpoint',
      occurrences: Math.floor(Math.random() * 40) + 20,
      validationRate: (70 + Math.random() * 30).toFixed(1)
    }
  ];
  
  // Generate KG health metrics
  const kgHealthMetrics = {
    nodeCount: 7340 + Math.floor(Math.random() * 100),
    relationshipCount: 2547 + Math.floor(Math.random() * 50),
    patternConsistency: (85 + Math.random() * 15).toFixed(1),
    queryResponseTime: (15 + Math.random() * 30).toFixed(1),
    lastUpdated: new Date().toISOString()
  };
  
  return {
    timeSeriesData,
    relationshipStrength,
    patternDetection,
    kgHealthMetrics,
    component: component || 'all',
    timeRange
  };
}
