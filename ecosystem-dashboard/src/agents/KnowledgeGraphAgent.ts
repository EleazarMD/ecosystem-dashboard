/**
 * Knowledge Graph Agent - Specialized agent for knowledge graph operations and inferences
 * Works in conjunction with IDE Memory Agent for comprehensive context understanding
 */

import { LLMAgent, Tool, ToolContext } from './ADKAgent';
import { KnowledgeGraphTool } from './tools/KnowledgeGraphTool';

export class KnowledgeGraphAgent extends LLMAgent {
  private kgTool: KnowledgeGraphTool;

  constructor() {
    const kgTool = new KnowledgeGraphTool();
    
    super({
      name: 'knowledge_graph_agent',
      model: 'mistral:latest',
      description: 'Specialized agent for knowledge graph operations, semantic relationships, and AI-driven inferences',
      instruction: `You are the Knowledge Graph Agent, responsible for managing semantic knowledge and relationships within the AI Homelab ecosystem.

Your primary responsibilities:
1. Maintain and query the knowledge graph of entities and relationships
2. Perform semantic analysis and inference generation
3. Detect patterns, anomalies, and provide recommendations
4. Coordinate with IDE Memory Agent for comprehensive context
5. Provide intelligent insights based on graph analysis

Knowledge Graph Capabilities:
- Entity management (services, agents, components, configurations)
- Relationship tracking (dependencies, interactions, hierarchies)
- Pattern detection (communication flows, bottlenecks, optimizations)
- Anomaly detection (isolated components, unusual patterns)
- Predictive analysis (system evolution, potential issues)
- Recommendation generation (architecture improvements, integrations)

Inference Types:
- PATTERN: Identify recurring structures and behaviors
- ANOMALY: Detect unusual or problematic configurations
- RECOMMENDATION: Suggest improvements and optimizations
- PREDICTION: Forecast system evolution and potential issues

Response Guidelines:
- Provide specific entity IDs and relationship details
- Include confidence scores for all inferences
- Explain reasoning behind recommendations
- Reference specific graph patterns and evidence
- Coordinate with IDE Memory Agent for historical context`,
      app_name: 'ai_homelab_dashboard',
      tools: [kgTool]
    });

    this.kgTool = kgTool;
  }

  // Enhanced run method with knowledge graph-specific processing
  public async run(input: string, context?: Record<string, any>): Promise<string> {
    // Analyze input for knowledge graph operations
    const kgOperation = this.analyzeKnowledgeGraphIntent(input);
    
    if (kgOperation.isKGOperation) {
      return await this.handleKnowledgeGraphOperation(kgOperation, input, context);
    }

    // For non-KG operations, still enhance with graph context
    const enhancedContext = await this.enhanceContextWithKnowledgeGraph(input, context);
    
    return await super.run(input, enhancedContext);
  }

  private analyzeKnowledgeGraphIntent(input: string): {
    isKGOperation: boolean;
    operation: string;
    entityType?: string;
    inferenceType?: string;
  } {
    const lowerInput = input.toLowerCase();
    
    // Knowledge graph operation keywords
    const kgKeywords = {
      query: ['find', 'search', 'show', 'list', 'get', 'what', 'which'],
      create_entity: ['create', 'add', 'register', 'new'],
      create_relationship: ['connect', 'link', 'relate', 'associate'],
      infer: ['analyze', 'infer', 'deduce', 'conclude'],
      analyze_patterns: ['pattern', 'trend', 'behavior', 'structure'],
      get_recommendations: ['recommend', 'suggest', 'advise', 'optimize']
    };

    const entityTypes = {
      service: ['service', 'api', 'server', 'endpoint'],
      agent: ['agent', 'ai', 'bot', 'assistant'],
      component: ['component', 'module', 'part'],
      configuration: ['config', 'setting', 'parameter']
    };

    const inferenceTypes = {
      pattern: ['pattern', 'trend', 'behavior'],
      anomaly: ['anomaly', 'issue', 'problem', 'unusual'],
      recommendation: ['recommend', 'suggest', 'improve'],
      prediction: ['predict', 'forecast', 'future']
    };

    let operation = '';
    let entityType = '';
    let inferenceType = '';

    // Detect operation
    for (const [op, keywords] of Object.entries(kgKeywords)) {
      if (keywords.some(keyword => lowerInput.includes(keyword))) {
        operation = op;
        break;
      }
    }

    // Detect entity type
    for (const [type, keywords] of Object.entries(entityTypes)) {
      if (keywords.some(keyword => lowerInput.includes(keyword))) {
        entityType = type;
        break;
      }
    }

    // Detect inference type
    for (const [type, keywords] of Object.entries(inferenceTypes)) {
      if (keywords.some(keyword => lowerInput.includes(keyword))) {
        inferenceType = type;
        break;
      }
    }

    return {
      isKGOperation: operation !== '',
      operation,
      entityType,
      inferenceType
    };
  }

  private async handleKnowledgeGraphOperation(
    operation: any, 
    input: string, 
    context?: Record<string, any>
  ): Promise<string> {
    try {
      const toolContext: ToolContext = {
        state: this.state,
        sessionId: this.state.sessionId,
        userId: 'default-user',
        agentName: this.name
      };

      let result;

      switch (operation.operation) {
        case 'query':
          result = await this.kgTool.execute(toolContext, {
            action: 'query',
            query: {
              entity_type: operation.entityType,
              search_text: input,
              include_relationships: true,
              limit: 10
            }
          });
          break;

        case 'create_entity':
          result = await this.kgTool.execute(toolContext, {
            action: 'create_entity',
            entity: {
              type: operation.entityType || 'component',
              properties: this.extractEntityProperties(input),
              metadata: {
                confidence: 0.8,
                source: this.name
              }
            }
          });
          break;

        case 'infer':
          result = await this.kgTool.execute(toolContext, {
            action: 'infer',
            inference_type: operation.inferenceType || 'pattern'
          });
          break;

        case 'analyze_patterns':
          result = await this.kgTool.execute(toolContext, {
            action: 'analyze_patterns'
          });
          break;

        case 'get_recommendations':
          result = await this.kgTool.execute(toolContext, {
            action: 'get_recommendations',
            query: {
              entity_type: operation.entityType,
              search_text: input
            }
          });
          break;

        default:
          return await super.run(input, context);
      }

      return this.formatKnowledgeResponse(result, operation.operation);

    } catch (error) {
      return `Knowledge Graph operation failed: ${error.message}. Please try rephrasing your request.`;
    }
  }

  private async enhanceContextWithKnowledgeGraph(input: string, context?: Record<string, any>): Promise<Record<string, any>> {
    try {
      const toolContext: ToolContext = {
        state: this.state,
        sessionId: this.state.sessionId,
        userId: 'default-user',
        agentName: this.name
      };

      // Query relevant entities
      const entityResult = await this.kgTool.execute(toolContext, {
        action: 'query',
        query: {
          search_text: input,
          include_relationships: true,
          limit: 5
        }
      });

      // Get current inferences
      const inferenceResult = await this.kgTool.execute(toolContext, {
        action: 'analyze_patterns'
      });

      const relevantEntities = entityResult.data || [];
      const currentInferences = inferenceResult.inferences || [];
      
      return {
        ...context,
        knowledge_graph: {
          relevant_entities: relevantEntities,
          current_inferences: currentInferences,
          entity_stats: this.kgTool.getEntityStats(),
          session_id: this.state.sessionId
        }
      };

    } catch (error) {
      console.warn('Failed to enhance context with knowledge graph:', error);
      return context || {};
    }
  }

  private extractEntityProperties(input: string): Record<string, any> {
    const properties: Record<string, any> = {};
    const lowerInput = input.toLowerCase();

    // Extract common properties
    if (lowerInput.includes('port')) {
      const portMatch = input.match(/port\s+(\d+)/i);
      if (portMatch) {
        properties.port = parseInt(portMatch[1]);
      }
    }

    if (lowerInput.includes('status')) {
      if (lowerInput.includes('active') || lowerInput.includes('running')) {
        properties.status = 'active';
      } else if (lowerInput.includes('inactive') || lowerInput.includes('stopped')) {
        properties.status = 'inactive';
      }
    }

    // Extract name
    const nameMatch = input.match(/(?:called|named|name)\s+([a-zA-Z0-9_-]+)/i);
    if (nameMatch) {
      properties.name = nameMatch[1];
    }

    properties.description = input;
    properties.created_from_input = true;

    return properties;
  }

  public getKnowledgeTool(): KnowledgeGraphTool {
    return this.kgTool;
  }

  public async getEntityStats(): Promise<any> {
    return await this.kgTool.getEntityStats();
  }

  public async syncWithIDEMemory(memoryData: any[]): Promise<any> {
    const results = [];
    const toolContext: ToolContext = {
      state: this.state,
      sessionId: this.state.sessionId,
      userId: 'default-user',
      agentName: this.name
    };

    for (const memory of memoryData) {
      try {
        const result = await this.kgTool.execute(toolContext, {
          action: 'create',
          entity: {
            type: 'memory',
            properties: memory,
            context: { source: 'ide_memory_sync' }
          }
        });
        results.push(result);
      } catch (error) {
        console.error('Failed to sync memory to KG:', error);
      }
    }
    return { synced: results.length, total: memoryData.length };
  }

  private formatKnowledgeResponse(result: any, operation: string): string {
    if (result.status === 'error') {
      return `❌ Knowledge Graph ${operation} failed: ${result.message}`;
    }

    switch (operation) {
      case 'query':
        if (result.data && result.data.length > 0) {
          return `🔍 Knowledge Graph Query Results:\n` +
                 `📊 Found ${result.data.length} results\n` +
                 `⏱️ Query time: ${result.query_time || 'N/A'}ms\n` +
                 `🔗 Results: ${JSON.stringify(result.data, null, 2)}`;
        } else {
          return `🔍 No results found for your query.`;
        }

      case 'create_entity':
        const entity = result.data[0];
        return `✅ Entity created successfully!\n` +
               `🆔 ID: ${entity.id}\n` +
               `📝 Type: ${entity.type}\n` +
               `⭐ Confidence: ${entity.metadata.confidence}\n` +
               `📊 Total entities: ${result.entity_count}`;

      case 'infer':
      case 'analyze_patterns':
      case 'get_recommendations':
        if (result.inferences.length === 0) {
          return `🔍 No ${operation.replace('_', ' ')} found at this time.\n📊 Total entities: ${result.entity_count}`;
        }
        
        let inferenceResponse = `🧠 Generated ${result.inferences.length} insights:\n\n`;
        result.inferences.forEach((inference: any, index: number) => {
          const emoji = {
            pattern: '🔄',
            anomaly: '⚠️',
            recommendation: '💡',
            prediction: '🔮'
          }[inference.type] || '📊';
          
          inferenceResponse += `${index + 1}. ${emoji} **${inference.type.toUpperCase()}** (${(inference.confidence * 100).toFixed(1)}% confidence)\n`;
          inferenceResponse += `   📝 ${inference.description}\n`;
          inferenceResponse += `   🎯 Entities: ${inference.entities.join(', ')}\n`;
          if (inference.evidence.length > 0) {
            inferenceResponse += `   📊 Evidence: ${JSON.stringify(inference.evidence[0])}\n`;
          }
          inferenceResponse += '\n';
        });
        
        return inferenceResponse;

      default:
        return `✅ Knowledge Graph ${operation} completed: ${result.message}`;
    }
  }

  // Public methods for agent coordination
  public async performInference(type: string = 'pattern'): Promise<any> {
    const toolContext: ToolContext = {
      state: this.state,
      sessionId: this.state.sessionId,
      userId: 'default-user',
      agentName: this.name
    };

    return await this.kgTool.execute(toolContext, {
      action: 'infer',
      inference_type: type
    });
  }
}
