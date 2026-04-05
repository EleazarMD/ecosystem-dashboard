/**
 * Knowledge Graph MCP Client Test API Endpoint
 * 
 * This API endpoint tests the KG MCP client implementation by exercising
 * all its methods with mock data and returning the results.
 * 
 * Used for: Verifying the KG MCP client functionality without external dependencies
 * 
 * Request: POST /api/test/kg-client
 * Response: Object containing test results and execution details
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { KGMCPClient, MCPError } from '@/lib/kg-mcp-client';
import logger from '@/lib/logger';

// Create global AHIS client mock for testing
// Define the type for our mock client implementation but don't redeclare the global
type AhisClientMock = {
  isConnectedToServer: () => boolean;
  executeCommand: (commandName: string, params: any) => Promise<any>;
};

// Initialization - set up mock AHIS client
// Using type assertion to avoid conflicts with any existing declarations
(global as any).__ahisClient = {
  isConnectedToServer: () => true,
  executeCommand: async (commandName: string, params: any) => {
    logger.info(`[MOCK] Executing command: ${commandName}`, { params });
    
    // Simulate MCP command execution with a mock response
    if (commandName === 'mcp0_kg_reason') {
      return {
        result: `Reasoning about "${params.question}" with detail level ${params.detail_level}`,
        context: params.context || 'No context provided',
        confidence: 0.92,
        sources: ['mock-kg-node-1', 'mock-kg-node-2'],
        status: 'success'
      };
    }
    
    if (commandName === 'mcp0_kg_query') {
      return {
        results: [
          { id: 'node1', type: 'service', name: 'Service A' },
          { id: 'node2', type: 'service', name: 'Service B' }
        ],
        status: 'success',
        query: params.query
      };
    }
    
    if (commandName === 'mcp0_kg_visualize') {
      return {
        diagram: 'graph TD\n  A[Service A] --> B[Service B]\n  B --> C[Service C]',
        format: params.format,
        status: 'success'
      };
    }
    
    // Default mock response
    return {
      result: `Mock response for ${commandName}`,
      status: 'success',
      metadata: {
        source: 'mock-kg-service',
        request_id: '12345-mock-request-id'
      }
    };
  }
};

/**
 * Run a test case and return result object
 */
async function runTest(name: string, testFn: () => Promise<any>) {
  const startTime = Date.now();
  let status = 'success';
  let error = null;
  let result = null;
  
  try {
    result = await testFn();
  } catch (err: any) {
    status = 'error';
    error = {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      requestId: err.requestId
    };
  }
  
  return {
    name,
    status,
    duration: Date.now() - startTime,
    result,
    error
  };
}

/**
 * Test API endpoint handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Force enable AI Gateway for testing
  const _forceAiGateway = true;
  const _kgTimeout = 5000; // 5 seconds for testing
  
  // Test results container
  const testResults = {
    timestamp: new Date().toISOString(),
    testsRun: 0,
    testsPassed: 0,
    tests: [] as any[]
  };
  
  // Set up client
  let client: KGMCPClient;
  try {
    client = new KGMCPClient();
    logger.info('[TEST] Successfully created KGMCPClient instance');
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to initialize KGMCPClient',
      details: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      }
    });
  }
  
  // Run all tests
  
  // Test 1: Reason over Knowledge Graph
  const test1 = await runTest('reasonOverKnowledgeGraph', async () => {
    return await client.reasonOverKnowledgeGraph(
      'What services are connected to the Knowledge Graph?',
      { detail_level: 'medium' }
    );
  });
  testResults.tests.push(test1);
  testResults.testsRun++;
  if (test1.status === 'success') testResults.testsPassed++;
  
  // Test 2: Query Knowledge Graph
  const test2 = await runTest('queryKnowledgeGraph', async () => {
    return await client.queryKnowledgeGraph(
      'MATCH (n:Service)-[:CONNECTS_TO]->(m:Service) RETURN n, m',
      { output_format: 'json' }
    );
  });
  testResults.tests.push(test2);
  testResults.testsRun++;
  if (test2.status === 'success') testResults.testsPassed++;
  
  // Test 3: Visualize Knowledge Graph
  const test3 = await runTest('visualizeKnowledgeGraph', async () => {
    return await client.visualizeKnowledgeGraph(
      'MATCH p=(:Service)-[:CONNECTS_TO]->(:Service) RETURN p',
      'mermaid'
    );
  });
  testResults.tests.push(test3);
  testResults.testsRun++;
  if (test3.status === 'success') testResults.testsPassed++;
  
  // Test 4: Search Knowledge Graph
  const test4 = await runTest('searchKnowledgeGraph', async () => {
    return await client.searchKnowledgeGraph('authentication', {
      category: 'security',
      limit: 5
    });
  });
  testResults.tests.push(test4);
  testResults.testsRun++;
  if (test4.status === 'success') testResults.testsPassed++;
  
  // Return test results
  return res.status(200).json({
    ...testResults,
    allPassed: testResults.testsPassed === testResults.testsRun,
    message: testResults.testsPassed === testResults.testsRun
      ? 'All tests passed successfully'
      : `${testResults.testsPassed}/${testResults.testsRun} tests passed`
  });
}
