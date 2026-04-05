/**
 * Agent Registry Test Suite
 * 
 * Comprehensive testing utilities for Agent Registry Hub ecosystem integration
 * Tests single source of truth, real-time updates, and cross-service communication
 */

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details: string;
  data?: any;
}

interface TestSuiteResults {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
}

class AgentRegistryTestSuite {
  private baseUrl = 'http://localhost:8404';
  private testAgent = {
    agentId: 'test_ecosystem_agent',
    name: 'Ecosystem Test Agent',
    description: 'Test agent for ecosystem integration validation',
    model: 'gemini-2.0-flash-exp',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.95,
    topK: 40,
    sessionMemory: true,
    voiceEnabled: false,
    safetyEnabled: true,
    streamingEnabled: true,
    thinkingBudget: 10000,
    outputKey: 'test_output',
    agentClass: 'LlmAgent' as const,
    safetySettings: [{
      harmCategory: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    }],
    callbacks: {
      beforeModel: false,
      beforeTool: false,
      afterModel: true
    },
    tools: ['test_tool'],
    subAgents: []
  };

  /**
   * Run complete ecosystem integration test suite
   */
  async runCompleteSuite(): Promise<TestSuiteResults> {
    console.log('🧪 Starting Agent Registry Ecosystem Test Suite...');
    const startTime = Date.now();
    const results: TestResult[] = [];

    const tests = [
      () => this.testAHISServerHealth(),
      () => this.testAgentRegistration(),
      () => this.testSingleSourceOfTruth(),
      () => this.testAIGatewayIntegration(),
      () => this.testRuntimeIntegration(),
      () => this.testKnowledgeGraphIntegration(),
      () => this.testRealTimeUpdates(),
      () => this.testCachePerformance(),
      () => this.testErrorRecovery(),
      () => this.testCleanup()
    ];

    for (const test of tests) {
      try {
        const result = await test();
        results.push(result);
        
        if (result.passed) {
          console.log(`✅ ${result.testName} (${result.duration}ms)`);
        } else {
          console.log(`❌ ${result.testName}: ${result.details} (${result.duration}ms)`);
        }
      } catch (error) {
        const errorResult: TestResult = {
          testName: test.name || 'Unknown Test',
          passed: false,
          duration: 0,
          details: error instanceof Error ? error.message : 'Unknown error'
        };
        results.push(errorResult);
        console.log(`❌ ${errorResult.testName}: ${errorResult.details}`);
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;

    const finalResults: TestSuiteResults = {
      totalTests: results.length,
      passed,
      failed,
      duration: totalDuration,
      results
    };

    console.log('\n📊 Test Suite Results:');
    console.log(`   Total Tests: ${finalResults.totalTests}`);
    console.log(`   Passed: ${finalResults.passed}`);
    console.log(`   Failed: ${finalResults.failed}`);
    console.log(`   Duration: ${finalResults.duration}ms`);

    return finalResults;
  }

  /**
   * Test AHIS Server health and connectivity
   */
  private async testAHISServerHealth(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:8888/api/ahis/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      const endTime = Date.now();
      
      if (response.ok) {
        const data = await response.json();
        return {
          testName: 'AHIS Server Health',
          passed: true,
          duration: endTime - startTime,
          details: `Server healthy: ${data.status || 'OK'}`,
          data
        };
      } else {
        return {
          testName: 'AHIS Server Health',
          passed: false,
          duration: endTime - startTime,
          details: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        testName: 'AHIS Server Health',
        passed: false,
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  /**
   * Test agent registration through Agent Registry Hub
   */
  private async testAgentRegistration(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/ahis/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          agent: this.testAgent
        })
      });

      const endTime = Date.now();
      const data = await response.json();

      if (response.ok && data.success) {
        return {
          testName: 'Agent Registration',
          passed: true,
          duration: endTime - startTime,
          details: `Agent registered with version ${data.agent?.version}`,
          data: data.agent
        };
      } else {
        return {
          testName: 'Agent Registration',
          passed: false,
          duration: endTime - startTime,
          details: data.error || 'Registration failed'
        };
      }
    } catch (error) {
      return {
        testName: 'Agent Registration',
        passed: false,
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Registration error'
      };
    }
  }

  /**
   * Test single source of truth by verifying same data across endpoints
   */
  private async testSingleSourceOfTruth(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Fetch from Agent Registry Hub
      const hubResponse = await fetch(`${this.baseUrl}/api/ahis/agents?agentId=${this.testAgent.agentId}`);
      const hubData = await hubResponse.json();

      // Fetch from legacy agent-settings
      const legacyResponse = await fetch(`${this.baseUrl}/api/agent-settings?agentId=${this.testAgent.agentId}`);
      const legacyData = await legacyResponse.json();

      const endTime = Date.now();

      if (hubData.success && hubData.agent && legacyData.success) {
        // Compare key fields
        const hubAgent = hubData.agent;
        const legacySettings = legacyData.settings;
        
        const modelMatch = hubAgent.model === legacySettings.model;
        const tempMatch = hubAgent.temperature === legacySettings.temperature;
        const nameMatch = hubAgent.name === legacySettings.name;

        const allMatch = modelMatch && tempMatch && nameMatch;

        return {
          testName: 'Single Source of Truth',
          passed: allMatch,
          duration: endTime - startTime,
          details: allMatch 
            ? 'Hub and legacy data synchronized' 
            : `Mismatch: model=${modelMatch}, temp=${tempMatch}, name=${nameMatch}`,
          data: { hub: hubAgent, legacy: legacySettings }
        };
      } else {
        return {
          testName: 'Single Source of Truth',
          passed: false,
          duration: endTime - startTime,
          details: 'Failed to fetch from one or both endpoints'
        };
      }
    } catch (error) {
      return {
        testName: 'Single Source of Truth',
        passed: false,
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Comparison failed'
      };
    }
  }

  /**
   * Test AI Gateway configuration update
   */
  private async testAIGatewayIntegration(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Check if routing configuration file was created
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for async updates
      
      // We can't directly check files in browser, so we test the API response
      const response = await fetch(`${this.baseUrl}/api/ai-gateway/agents/configuration-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'agent:updated',
          agentId: this.testAgent.agentId,
          configuration: this.testAgent,
          timestamp: new Date().toISOString()
        })
      });

      const endTime = Date.now();
      
      if (response.ok) {
        const data = await response.json();
        return {
          testName: 'AI Gateway Integration',
          passed: data.success === true,
          duration: endTime - startTime,
          details: data.message || 'AI Gateway configuration updated',
          data
        };
      } else {
        return {
          testName: 'AI Gateway Integration',
          passed: false,
          duration: endTime - startTime,
          details: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      return {
        testName: 'AI Gateway Integration',
        passed: false,
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'AI Gateway test failed'
      };
    }
  }

  /**
   * Test Agent Runtime configuration update
   */
  private async testRuntimeIntegration(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/agentic-control/runtime/configuration-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'agent:configuration:changed',
          agentId: this.testAgent.agentId,
          configuration: this.testAgent,
          changedFields: ['model', 'temperature'],
          timestamp: new Date().toISOString()
        })
      });

      const endTime = Date.now();
      
      if (response.ok) {
        const data = await response.json();
        return {
          testName: 'Runtime Integration',
          passed: data.success === true,
          duration: endTime - startTime,
          details: data.message || 'Runtime configuration updated',
          data
        };
      } else {
        return {
          testName: 'Runtime Integration',
          passed: false,
          duration: endTime - startTime,
          details: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      return {
        testName: 'Runtime Integration',
        passed: false,
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Runtime test failed'
      };
    }
  }

  /**
   * Test Knowledge Graph event logging
   */
  private async testKnowledgeGraphIntegration(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/knowledge-graph/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'AGENT_CONFIGURATION_CHANGE',
          entity: `agent:${this.testAgent.agentId}`,
          event: {
            agentId: this.testAgent.agentId,
            configuration: this.testAgent,
            changedFields: ['model'],
            source: 'test_suite'
          }
        })
      });

      const endTime = Date.now();
      
      if (response.ok) {
        const data = await response.json();
        return {
          testName: 'Knowledge Graph Integration',
          passed: data.success === true,
          duration: endTime - startTime,
          details: 'Event logged to Knowledge Graph',
          data
        };
      } else {
        return {
          testName: 'Knowledge Graph Integration',
          passed: false,
          duration: endTime - startTime,
          details: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      return {
        testName: 'Knowledge Graph Integration',
        passed: false,
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Knowledge Graph test failed'
      };
    }
  }

  /**
   * Test real-time updates (simulated)
   */
  private async testRealTimeUpdates(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Simulate model change and verify propagation
      const updatedAgent = {
        ...this.testAgent,
        model: 'gemini-1.5-pro',
        temperature: 0.9
      };

      const response = await fetch(`${this.baseUrl}/api/ahis/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          agent: updatedAgent
        })
      });

      // Wait for propagation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify update
      const verifyResponse = await fetch(`${this.baseUrl}/api/ahis/agents?agentId=${this.testAgent.agentId}`);
      const verifyData = await verifyResponse.json();

      const endTime = Date.now();

      if (verifyData.success && verifyData.agent.model === 'gemini-1.5-pro') {
        return {
          testName: 'Real-time Updates',
          passed: true,
          duration: endTime - startTime,
          details: 'Configuration change propagated successfully',
          data: verifyData.agent
        };
      } else {
        return {
          testName: 'Real-time Updates',
          passed: false,
          duration: endTime - startTime,
          details: 'Update propagation failed'
        };
      }
    } catch (error) {
      return {
        testName: 'Real-time Updates',
        passed: false,
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Real-time test failed'
      };
    }
  }

  /**
   * Test cache performance
   */
  private async testCachePerformance(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const requests = 5;
      const times: number[] = [];

      for (let i = 0; i < requests; i++) {
        const reqStart = Date.now();
        await fetch(`${this.baseUrl}/api/ahis/agents?agentId=${this.testAgent.agentId}`);
        const reqEnd = Date.now();
        times.push(reqEnd - reqStart);
      }

      const endTime = Date.now();
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const passed = avgTime < 500; // Should be fast due to caching

      return {
        testName: 'Cache Performance',
        passed,
        duration: endTime - startTime,
        details: `Average request time: ${Math.round(avgTime)}ms`,
        data: { times, average: avgTime }
      };
    } catch (error) {
      return {
        testName: 'Cache Performance',
        passed: false,
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Performance test failed'
      };
    }
  }

  /**
   * Test error recovery
   */
  private async testErrorRecovery(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Test with invalid agent data
      const response = await fetch(`${this.baseUrl}/api/ahis/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          agent: { agentId: '', name: '', model: '' } // Invalid data
        })
      });

      const endTime = Date.now();
      const data = await response.json();
      
      // Should fail gracefully
      const passed = !response.ok && data.error;

      return {
        testName: 'Error Recovery',
        passed,
        duration: endTime - startTime,
        details: passed ? 'Invalid data rejected properly' : 'Should have rejected invalid data',
        data
      };
    } catch (error) {
      return {
        testName: 'Error Recovery',
        passed: false,
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Error recovery test failed'
      };
    }
  }

  /**
   * Test cleanup
   */
  private async testCleanup(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Deactivate test agent
      const response = await fetch(`${this.baseUrl}/api/ahis/agents?agentId=${this.testAgent.agentId}`, {
        method: 'DELETE'
      });

      const endTime = Date.now();
      
      if (response.ok) {
        return {
          testName: 'Cleanup',
          passed: true,
          duration: endTime - startTime,
          details: 'Test agent deactivated successfully'
        };
      } else {
        return {
          testName: 'Cleanup',
          passed: false,
          duration: endTime - startTime,
          details: 'Failed to deactivate test agent'
        };
      }
    } catch (error) {
      return {
        testName: 'Cleanup',
        passed: false,
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Cleanup failed'
      };
    }
  }
}

// Export for use in development/testing
export default AgentRegistryTestSuite;

// Global test runner for browser console
if (typeof window !== 'undefined') {
  (window as any).testAgentRegistry = async () => {
    const suite = new AgentRegistryTestSuite();
    return await suite.runCompleteSuite();
  };
}
