/**
 * API Connectivity Test for Agent Integration
 * Tests real API connections for IDE Memory and Knowledge Graph agents
 */

import { KGMCPClient, MCPError } from '../../lib/kg-mcp-client';
import { IDEMemoryAgent } from '../IDEMemoryAgent';
import { KnowledgeGraphAgent } from '../KnowledgeGraphAgent';
import { DashboardAIAgent } from '../DashboardAIAgent';
import { OrchestrationEngine } from '../OrchestrationEngine';

export interface TestResult {
  test_name: string;
  status: 'passed' | 'failed' | 'skipped';
  message: string;
  duration: number;
  error?: any;
  data?: any;
}

export interface ConnectivityTestSuite {
  kg_api_tests: TestResult[];
  ide_memory_tests: TestResult[];
  orchestration_tests: TestResult[];
  integration_tests: TestResult[];
  summary: {
    total_tests: number;
    passed: number;
    failed: number;
    skipped: number;
    overall_status: 'passed' | 'failed' | 'partial';
  };
}

export class ApiConnectivityTester {
  private kgClient: KGMCPClient | null = null;
  private ideMemoryAgent: IDEMemoryAgent;
  private knowledgeGraphAgent: KnowledgeGraphAgent;
  private dashboardAgent: DashboardAIAgent;
  private orchestrationEngine: OrchestrationEngine;

  constructor() {
    this.ideMemoryAgent = new IDEMemoryAgent();
    this.knowledgeGraphAgent = new KnowledgeGraphAgent();
    this.dashboardAgent = new DashboardAIAgent();
    this.orchestrationEngine = new OrchestrationEngine();
  }

  /**
   * Run comprehensive connectivity tests
   */
  public async runConnectivityTests(): Promise<ConnectivityTestSuite> {
    console.log('🧪 Starting API Connectivity Tests...');
    
    const results: ConnectivityTestSuite = {
      kg_api_tests: [],
      ide_memory_tests: [],
      orchestration_tests: [],
      integration_tests: [],
      summary: {
        total_tests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        overall_status: 'failed'
      }
    };

    // Test Knowledge Graph API connectivity
    results.kg_api_tests = await this.testKnowledgeGraphAPI();
    
    // Test IDE Memory agent functionality
    results.ide_memory_tests = await this.testIDEMemoryAgent();
    
    // Test orchestration patterns
    results.orchestration_tests = await this.testOrchestrationPatterns();
    
    // Test end-to-end integration
    results.integration_tests = await this.testEndToEndIntegration();

    // Calculate summary
    const allTests = [
      ...results.kg_api_tests,
      ...results.ide_memory_tests,
      ...results.orchestration_tests,
      ...results.integration_tests
    ];

    results.summary = {
      total_tests: allTests.length,
      passed: allTests.filter(t => t.status === 'passed').length,
      failed: allTests.filter(t => t.status === 'failed').length,
      skipped: allTests.filter(t => t.status === 'skipped').length,
      overall_status: allTests.every(t => t.status === 'passed') ? 'passed' : 
                     allTests.some(t => t.status === 'passed') ? 'partial' : 'failed'
    };

    console.log('🏁 API Connectivity Tests Complete:', results.summary);
    return results;
  }

  /**
   * Test Knowledge Graph API connectivity
   */
  private async testKnowledgeGraphAPI(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: KG Client Initialization
    tests.push(await this.runTest('KG Client Initialization', async () => {
      try {
        this.kgClient = new KGMCPClient({ aiGatewayEnabled: true });
        return { success: true, message: 'KG MCP Client initialized successfully' };
      } catch (error: any) {
        if (error.code === 'GATEWAY_DISABLED') {
          return { success: false, message: 'AI Gateway not enabled - this is expected in test environment', skip: true };
        }
        throw error;
      }
    }));

    // Test 2: Basic KG Query
    tests.push(await this.runTest('Basic KG Query', async () => {
      if (!this.kgClient) {
        return { success: false, message: 'KG Client not initialized', skip: true };
      }

      const result = await this.kgClient.queryKnowledgeGraph(
        'Show me AI Homelab services',
        { limit: 5, output_format: 'json' }
      );
      
      return { 
        success: true, 
        message: 'KG query executed successfully',
        data: result
      };
    }));

    // Test 3: KG Reasoning
    tests.push(await this.runTest('KG Reasoning', async () => {
      if (!this.kgClient) {
        return { success: false, message: 'KG Client not initialized', skip: true };
      }

      const result = await this.kgClient.reasonOverKnowledgeGraph(
        'How do services in the AI Homelab ecosystem interact?',
        { detail_level: 'medium' }
      );
      
      return { 
        success: true, 
        message: 'KG reasoning executed successfully',
        data: result
      };
    }));

    // Test 4: KG Pattern Analysis
    tests.push(await this.runTest('KG Pattern Analysis', async () => {
      if (!this.kgClient) {
        return { success: false, message: 'KG Client not initialized', skip: true };
      }

      const result = await this.kgClient.findPatterns('patterns');
      
      return { 
        success: true, 
        message: 'KG pattern analysis executed successfully',
        data: result
      };
    }));

    return tests;
  }

  /**
   * Test IDE Memory agent functionality
   */
  private async testIDEMemoryAgent(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: Memory Creation
    tests.push(await this.runTest('IDE Memory Creation', async () => {
      const response = await this.ideMemoryAgent.run(
        'Remember this architectural decision: We are using microservices architecture with service mesh',
        { project_id: 'test_project' }
      );
      
      return { 
        success: response.includes('Memory stored successfully'),
        message: response.includes('Memory stored successfully') ? 'Memory created successfully' : 'Memory creation failed',
        data: response
      };
    }));

    // Test 2: Memory Query
    tests.push(await this.runTest('IDE Memory Query', async () => {
      const response = await this.ideMemoryAgent.run(
        'What architectural decisions have been made?',
        { project_id: 'test_project' }
      );
      
      return { 
        success: response.includes('Found') || response.includes('memories'),
        message: 'Memory query executed',
        data: response
      };
    }));

    // Test 3: Memory Stats
    tests.push(await this.runTest('IDE Memory Stats', async () => {
      const stats = await this.ideMemoryAgent.getMemoryStats();
      
      return { 
        success: stats && typeof stats.total === 'number',
        message: `Memory stats retrieved: ${stats.total} total memories`,
        data: stats
      };
    }));

    return tests;
  }

  /**
   * Test orchestration patterns
   */
  private async testOrchestrationPatterns(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: Memory-KG Coordination Pattern
    tests.push(await this.runTest('Memory-KG Coordination Pattern', async () => {
      const result = await this.orchestrationEngine.executePattern(
        'memory_kg_coordination',
        'Analyze the current system architecture and provide insights',
        { test_mode: true }
      );
      
      return { 
        success: result.success && result.results.length > 0,
        message: `Pattern executed with ${result.results.length} agent results`,
        data: result
      };
    }));

    // Test 2: Hybrid Intelligence Pattern
    tests.push(await this.runTest('Hybrid Intelligence Pattern', async () => {
      const result = await this.orchestrationEngine.executePattern(
        'hybrid_intelligence',
        'Provide comprehensive analysis of the AI Homelab ecosystem',
        { test_mode: true }
      );
      
      return { 
        success: result.success,
        message: `Hybrid pattern executed in ${result.execution_time}ms`,
        data: result
      };
    }));

    // Test 3: Sequential Analysis Pattern
    tests.push(await this.runTest('Sequential Analysis Pattern', async () => {
      const result = await this.orchestrationEngine.executePattern(
        'sequential_analysis',
        'Analyze system health and provide documentation',
        { test_mode: true }
      );
      
      return { 
        success: result.success,
        message: `Sequential pattern executed with ${result.metadata.agents_executed.length} agents`,
        data: result
      };
    }));

    return tests;
  }

  /**
   * Test end-to-end integration
   */
  private async testEndToEndIntegration(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: Dashboard Agent with Orchestration
    tests.push(await this.runTest('Dashboard Agent Integration', async () => {
      const result = await this.dashboardAgent.runWithDashboardContext(
        'Analyze the current system and remember key insights',
        { test_mode: true, include_orchestration: true }
      );
      
      return { 
        success: result.response && result.response.length > 0,
        message: `Dashboard agent responded with ${result.agentUsed} in ${result.processingTime}ms`,
        data: result
      };
    }));

    // Test 2: Memory-KG Sync
    tests.push(await this.runTest('Memory-KG Synchronization', async () => {
      const result = await this.dashboardAgent.syncMemoryWithKnowledgeGraph();
      
      return { 
        success: result.status === 'success',
        message: result.message,
        data: result
      };
    }));

    // Test 3: Orchestration Status
    tests.push(await this.runTest('Orchestration Status Check', async () => {
      const status = await this.dashboardAgent.getOrchestrationStatus();
      
      return { 
        success: status.available_patterns && status.registered_agents,
        message: `${status.available_patterns.length} patterns, ${status.registered_agents.length} agents registered`,
        data: status
      };
    }));

    return tests;
  }

  /**
   * Helper method to run individual tests with error handling
   */
  private async runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`  🧪 Running: ${testName}`);
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      if (result.skip) {
        console.log(`  ⏭️  Skipped: ${testName} - ${result.message}`);
        return {
          test_name: testName,
          status: 'skipped',
          message: result.message,
          duration,
          data: result.data
        };
      }
      
      if (result.success) {
        console.log(`  ✅ Passed: ${testName} - ${result.message}`);
        return {
          test_name: testName,
          status: 'passed',
          message: result.message,
          duration,
          data: result.data
        };
      } else {
        console.log(`  ❌ Failed: ${testName} - ${result.message}`);
        return {
          test_name: testName,
          status: 'failed',
          message: result.message,
          duration,
          data: result.data
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`  ❌ Failed: ${testName} - ${error.message}`);
      
      return {
        test_name: testName,
        status: 'failed',
        message: error.message,
        duration,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          statusCode: error.statusCode
        }
      };
    }
  }
}

/**
 * Standalone function to run connectivity tests
 */
export async function runApiConnectivityTests(): Promise<ConnectivityTestSuite> {
  const tester = new ApiConnectivityTester();
  return await tester.runConnectivityTests();
}
