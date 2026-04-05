/**
 * Agent Orchestration Engine - Advanced orchestration patterns for AI Homelab agents
 * Supports in-series, parallel, and hybrid execution patterns
 */

import { DashAgent, ToolContext, CallbackContext } from './ADKAgent';

export interface OrchestrationPattern {
  type: 'series' | 'parallel' | 'hybrid';
  agents: string[];
  conditions?: OrchestrationCondition[];
  timeout?: number;
  fallback_strategy?: 'fail_fast' | 'continue' | 'fallback_agent';
  fallback_agent?: string;
}

export interface OrchestrationCondition {
  agent: string;
  condition: 'success' | 'confidence_threshold' | 'contains_keyword' | 'custom';
  threshold?: number;
  keyword?: string;
  custom_check?: (result: any) => boolean;
}

export interface OrchestrationResult {
  pattern: string;
  results: AgentResult[];
  execution_time: number;
  success: boolean;
  final_response: string;
  metadata: {
    agents_executed: string[];
    failed_agents: string[];
    confidence_scores: Record<string, number>;
    execution_order: string[];
  };
}

export interface AgentResult {
  agent_name: string;
  response: string;
  confidence: number;
  execution_time: number;
  success: boolean;
  tools_used: string[];
  error?: string;
}

export class OrchestrationEngine {
  private agents: Map<string, DashAgent> = new Map();
  private patterns: Map<string, OrchestrationPattern> = new Map();

  constructor() {
    this.initializeDefaultPatterns();
  }

  public registerAgent(agent: DashAgent): void {
    this.agents.set(agent.name, agent);
  }

  public registerPattern(name: string, pattern: OrchestrationPattern): void {
    this.patterns.set(name, pattern);
  }

  private initializeDefaultPatterns(): void {
    // Memory + Knowledge Graph coordination pattern
    this.registerPattern('memory_kg_coordination', {
      type: 'parallel',
      agents: ['ide_memory_agent', 'knowledge_graph_agent'],
      timeout: 10000,
      fallback_strategy: 'continue'
    });

    // Sequential analysis pattern
    this.registerPattern('sequential_analysis', {
      type: 'series',
      agents: ['analysis_agent', 'documentation_agent'],
      conditions: [
        {
          agent: 'analysis_agent',
          condition: 'confidence_threshold',
          threshold: 0.7
        }
      ],
      fallback_strategy: 'continue'
    });

    // Hybrid intelligence pattern
    this.registerPattern('hybrid_intelligence', {
      type: 'hybrid',
      agents: ['ide_memory_agent', 'knowledge_graph_agent', 'analysis_agent'],
      conditions: [
        {
          agent: 'ide_memory_agent',
          condition: 'success'
        },
        {
          agent: 'knowledge_graph_agent',
          condition: 'success'
        }
      ],
      timeout: 15000,
      fallback_strategy: 'fallback_agent',
      fallback_agent: 'analysis_agent'
    });

    // Vision analysis pattern
    this.registerPattern('vision_analysis', {
      type: 'series',
      agents: ['vision_agent', 'analysis_agent'],
      conditions: [
        {
          agent: 'vision_agent',
          condition: 'contains_keyword',
          keyword: 'visual'
        }
      ],
      fallback_strategy: 'continue'
    });
  }

  public async executePattern(
    patternName: string,
    input: string,
    context?: Record<string, any>
  ): Promise<OrchestrationResult> {
    const pattern = this.patterns.get(patternName);
    if (!pattern) {
      throw new Error(`Orchestration pattern not found: ${patternName}`);
    }

    const startTime = Date.now();
    let results: AgentResult[] = [];
    let executionOrder: string[] = [];
    let failedAgents: string[] = [];

    try {
      switch (pattern.type) {
        case 'series':
          results = await this.executeSeriesPattern(pattern, input, context);
          break;
        case 'parallel':
          results = await this.executeParallelPattern(pattern, input, context);
          break;
        case 'hybrid':
          results = await this.executeHybridPattern(pattern, input, context);
          break;
      }

      executionOrder = results.map(r => r.agent_name);
      failedAgents = results.filter(r => !r.success).map(r => r.agent_name);

      const finalResponse = this.synthesizeResponses(results, pattern);
      const confidenceScores = this.calculateConfidenceScores(results);

      return {
        pattern: patternName,
        results,
        execution_time: Date.now() - startTime,
        success: results.some(r => r.success),
        final_response: finalResponse,
        metadata: {
          agents_executed: executionOrder,
          failed_agents: failedAgents,
          confidence_scores: confidenceScores,
          execution_order: executionOrder
        }
      };

    } catch (error) {
      return {
        pattern: patternName,
        results,
        execution_time: Date.now() - startTime,
        success: false,
        final_response: `Orchestration failed: ${error.message}`,
        metadata: {
          agents_executed: executionOrder,
          failed_agents: failedAgents,
          confidence_scores: {},
          execution_order: executionOrder
        }
      };
    }
  }

  private async executeSeriesPattern(
    pattern: OrchestrationPattern,
    input: string,
    context?: Record<string, any>
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    let currentInput = input;
    let currentContext = context || {};

    for (const agentName of pattern.agents) {
      const agent = this.agents.get(agentName);
      if (!agent) {
        results.push({
          agent_name: agentName,
          response: `Agent not found: ${agentName}`,
          confidence: 0,
          execution_time: 0,
          success: false,
          tools_used: [],
          error: 'Agent not registered'
        });
        continue;
      }

      const agentResult = await this.executeAgent(agent, currentInput, currentContext);
      results.push(agentResult);

      // Check conditions
      if (pattern.conditions) {
        const condition = pattern.conditions.find(c => c.agent === agentName);
        if (condition && !this.evaluateCondition(condition, agentResult)) {
          if (pattern.fallback_strategy === 'fail_fast') {
            break;
          }
        }
      }

      // Pass result to next agent if successful
      if (agentResult.success) {
        currentInput = agentResult.response;
        currentContext = { ...currentContext, previous_agent_result: agentResult };
      }
    }

    return results;
  }

  private async executeParallelPattern(
    pattern: OrchestrationPattern,
    input: string,
    context?: Record<string, any>
  ): Promise<AgentResult[]> {
    const agentPromises = pattern.agents.map(agentName => {
      const agent = this.agents.get(agentName);
      if (!agent) {
        return Promise.resolve({
          agent_name: agentName,
          response: `Agent not found: ${agentName}`,
          confidence: 0,
          execution_time: 0,
          success: false,
          tools_used: [],
          error: 'Agent not registered'
        });
      }
      return this.executeAgent(agent, input, context);
    });

    const timeout = pattern.timeout || 30000;
    const timeoutPromise = new Promise<AgentResult[]>((_, reject) => {
      setTimeout(() => reject(new Error('Orchestration timeout')), timeout);
    });

    try {
      return await Promise.race([
        Promise.all(agentPromises),
        timeoutPromise
      ]);
    } catch (error) {
      // Handle partial results in case of timeout
      const partialResults = await Promise.allSettled(agentPromises);
      return partialResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            agent_name: pattern.agents[index],
            response: `Agent execution failed: ${result.reason}`,
            confidence: 0,
            execution_time: timeout,
            success: false,
            tools_used: [],
            error: result.reason
          };
        }
      });
    }
  }

  private async executeHybridPattern(
    pattern: OrchestrationPattern,
    input: string,
    context?: Record<string, any>
  ): Promise<AgentResult[]> {
    // First, execute memory and knowledge graph agents in parallel
    const parallelAgents = pattern.agents.slice(0, 2); // First two agents in parallel
    const seriesAgents = pattern.agents.slice(2); // Remaining agents in series

    // Parallel phase
    const parallelResults = await this.executeParallelPattern(
      { ...pattern, agents: parallelAgents, type: 'parallel' },
      input,
      context
    );

    // Series phase with enhanced context
    const enhancedContext = {
      ...context,
      parallel_results: parallelResults,
      memory_context: parallelResults.find(r => r.agent_name === 'ide_memory_agent'),
      kg_context: parallelResults.find(r => r.agent_name === 'knowledge_graph_agent')
    };

    const seriesResults = await this.executeSeriesPattern(
      { ...pattern, agents: seriesAgents, type: 'series' },
      input,
      enhancedContext
    );

    return [...parallelResults, ...seriesResults];
  }

  private async executeAgent(
    agent: DashAgent,
    input: string,
    context?: Record<string, any>
  ): Promise<AgentResult> {
    const startTime = Date.now();
    
    try {
      const response = await agent.run(input, context);
      const executionTime = Date.now() - startTime;

      // Extract metadata from agent state
      const confidence = agent.state.currentContext.response_confidence || 0.75;
      const toolsUsed = agent.state.activeTools || [];

      return {
        agent_name: agent.name,
        response,
        confidence,
        execution_time: executionTime,
        success: true,
        tools_used: toolsUsed
      };

    } catch (error) {
      return {
        agent_name: agent.name,
        response: `Agent execution failed: ${error.message}`,
        confidence: 0,
        execution_time: Date.now() - startTime,
        success: false,
        tools_used: [],
        error: error.message
      };
    }
  }

  private evaluateCondition(condition: OrchestrationCondition, result: AgentResult): boolean {
    switch (condition.condition) {
      case 'success':
        return result.success;
      
      case 'confidence_threshold':
        return result.confidence >= (condition.threshold || 0.5);
      
      case 'contains_keyword':
        return condition.keyword ? 
          result.response.toLowerCase().includes(condition.keyword.toLowerCase()) : 
          false;
      
      case 'custom':
        return condition.custom_check ? condition.custom_check(result) : true;
      
      default:
        return true;
    }
  }

  private synthesizeResponses(results: AgentResult[], pattern: OrchestrationPattern): string {
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return "All agents failed to provide a response. Please try rephrasing your request.";
    }

    switch (pattern.type) {
      case 'series':
        // Return the last successful response
        return successfulResults[successfulResults.length - 1].response;
      
      case 'parallel':
        // Combine responses with agent attribution
        return successfulResults.map(r => 
          `**${r.agent_name}** (${(r.confidence * 100).toFixed(1)}% confidence):\n${r.response}`
        ).join('\n\n---\n\n');
      
      case 'hybrid':
        // Intelligent synthesis based on agent roles
        const memoryResult = results.find(r => r.agent_name === 'ide_memory_agent');
        const kgResult = results.find(r => r.agent_name === 'knowledge_graph_agent');
        const analysisResult = results.find(r => r.agent_name === 'analysis_agent');

        let synthesis = '';
        
        if (memoryResult?.success) {
          synthesis += `**Memory Context:**\n${memoryResult.response}\n\n`;
        }
        
        if (kgResult?.success) {
          synthesis += `**Knowledge Graph Insights:**\n${kgResult.response}\n\n`;
        }
        
        if (analysisResult?.success) {
          synthesis += `**Analysis:**\n${analysisResult.response}`;
        }

        return synthesis || successfulResults[0].response;
      
      default:
        return successfulResults[0].response;
    }
  }

  private calculateConfidenceScores(results: AgentResult[]): Record<string, number> {
    const scores: Record<string, number> = {};
    results.forEach(result => {
      scores[result.agent_name] = result.confidence;
    });
    return scores;
  }

  // Public methods for pattern management
  public getAvailablePatterns(): string[] {
    return Array.from(this.patterns.keys());
  }

  public getPatternDetails(patternName: string): OrchestrationPattern | undefined {
    return this.patterns.get(patternName);
  }

  public getRegisteredAgents(): string[] {
    return Array.from(this.agents.keys());
  }
}
