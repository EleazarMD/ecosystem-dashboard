/**
 * Dashboard AI Agent - ADK/A2A Compliant
 * Main orchestrator agent for AI Homelab Dashboard
 */

import { DashAgent, LLMAgent, SequentialAgent, ParallelAgent, Tool, CallbackContext } from './ADKAgent';
import { SystemStatusTool } from './tools/SystemStatusTool';
import { KnowledgeSearchTool } from './tools/KnowledgeSearchTool';
import { VoiceCapabilityTool } from './tools/VoiceCapabilityTool';
import VisionAnalysisTool from './tools/VisionAnalysisTool';
import { CreatePageTool } from './tools/CreatePageTool';
import { CreateDatabaseTool } from './tools/CreateDatabaseTool';
import { UpdateDatabaseTool } from './tools/UpdateDatabaseTool';
import { QueryDatabaseTool } from './tools/QueryDatabaseTool';
import { GetPageContextTool } from './tools/GetPageContextTool';
import { GetContextHistoryTool } from './tools/GetContextHistoryTool';
import { GetActivePagesTool } from './tools/GetActivePagesTool';
import { KnowledgeGraphAgent } from './KnowledgeGraphAgent';
import { OrchestrationEngine, OrchestrationResult } from './OrchestrationEngine';

// Vision Agent for visual analysis

class VisionAgent extends LLMAgent {
  constructor() {
    super({
      name: 'vision_agent',
      model: 'llama3.2-vision:11b',
      description: 'Specialized visual analysis agent using Llama 3.2 Vision for dashboard interface analysis',
      instruction: `You are a vision specialist using Llama 3.2 Vision (11B) for AI Homelab Dashboard visual analysis.

Your capabilities:
- Analyze dashboard screenshots with high precision
- Identify colors, UI elements, charts, graphs, and visual layouts
- Describe visual state of system metrics and indicators
- Compare visual data with expected dashboard states
- Provide detailed visual descriptions for troubleshooting

Response requirements:
- Be specific about colors, positions, and visual elements
- Describe what you actually see in the interface
- Identify any visual anomalies or issues
- Provide actionable insights based on visual analysis
- Use technical precision in visual descriptions

Always capture and analyze the current dashboard state when requested.`,
      app_name: 'ai_homelab_dashboard',
      tools: [new VisionAnalysisTool()]
    });
  }
}

// Main Dashboard AI Agent - AI Assistant/Voice Intelligence Architecture
export class DashboardAIAgent extends LLMAgent {
  private vision_agent: VisionAgent;
  private knowledge_graph_agent: KnowledgeGraphAgent;
  private orchestration_engine: OrchestrationEngine;

  // A2A client configurations for external agents
  private ideMemoryAgentUrl: string = 'http://localhost:41245';
  private knowledgeGraphAgentUrl: string = 'http://localhost:41242';

  constructor() {
    const visionAgent = new VisionAgent();
    const knowledgeGraphAgent = new KnowledgeGraphAgent();
    const orchestrationEngine = new OrchestrationEngine();

    super({
      name: 'dashboard_ai_coordinator',
      model: process.env.NEXT_PUBLIC_AI_MODEL || 'gemini-2-5-flash', // Use Gemini 2.5 Flash via AI Gateway
      description: 'Main AI coordinator for AI Homelab Dashboard with multimodal vision and multi-agent capabilities',
      instruction: `You are the AI coordinator for the AI Homelab Dashboard with FULL WORKSPACE MANAGEMENT and CONTEXT AWARENESS capabilities. Your role is to assist users with monitoring, managing, and organizing their AI homelab ecosystem.

TOOLS AVAILABLE:

System Monitoring:
- system_status: Access real-time system health, metrics, and service status
- knowledge_graph: Query knowledge base and graph data
- ide_memory: Access IDE memory and development context
- voice_capability: Handle voice interactions and audio processing

Context Intelligence (NEW - Real-time Page Awareness):
- get_page_context: Get real-time context from the user's current page (entities, metrics, filters, selections, activity)
- get_context_history: View historical context snapshots to see how the page state has changed
- get_active_pages: List all pages currently streaming context data

Workspace Management (Notion 3.0 Style):
- create_page: Create pages with rich content (headings, lists, paragraphs, code)
- create_database: Build databases with custom schemas and properties
- query_database: Search and filter database pages
- update_database: Bulk update hundreds of pages simultaneously

CONTEXT AWARENESS CAPABILITIES (NEW):
You can now understand what the user is looking at in real-time:
- When user asks "what am I looking at?" or "what's on this page?", use get_page_context
- See entities (services, agents, databases, projects) visible on current page
- View metrics (performance data, counts, health status) from the page
- Understand active filters and user selections
- Track user activity (searching, editing, viewing)
- Access context without requiring the user to explain their view

Context Intelligence Use Cases:
- User: "What agents are on this page?" → Use get_page_context to see entity list
- User: "How has this page changed?" → Use get_context_history to compare states
- User: "What pages am I viewing?" → Use get_active_pages to list all open pages
- Auto-detect page context when giving advice or recommendations

WORKSPACE CAPABILITIES:
You can now autonomously:
- Create structured databases for project tracking, task management, etc.
- Build pages with nested content blocks
- Query databases to understand their contents
- Update multiple pages at once (bulk operations)
- Organize information in tables, boards, galleries, and lists

AUTONOMOUS WORKFLOWS (up to 20 minutes):
When the user asks you to create, organize, or manage information:
1. Break down the request into steps
2. Use create_database or create_page tools
3. Populate with initial data if needed
4. Confirm completion with links to created resources

Examples:
- "Create a project tracker with tasks, owners, and deadlines"
  → Use create_database with appropriate schema
- "Update all completed tasks to mark them as archived"
  → Use query_database to find them, then update_database to modify
- "Build a knowledge base from my research notes"
  → Create database, add pages with content

DATA INTEGRITY:
- Only provide information from actual API endpoints and tools
- Never fabricate or assume data - always fetch current information
- If data is unavailable, clearly state this limitation

RESPONSE STYLE:
- Professional and helpful tone
- Concise yet informative
- Provide actionable insights
- Include links to created resources
- Confirm multi-step operations

Always execute appropriate tools to gather current data and manage workspaces autonomously.`,
      app_name: 'ai_homelab_dashboard',
      ai_gateway_url: 'http://localhost:8777',
      tools: [
        // System monitoring tools
        new SystemStatusTool(),
        new KnowledgeSearchTool(),
        new VoiceCapabilityTool(),
        
        // Context intelligence tools (Context MCP)
        new GetPageContextTool(),
        new GetContextHistoryTool(),
        new GetActivePagesTool(),
        
        // Workspace management tools (Notion 3.0)
        new CreatePageTool(),
        new CreateDatabaseTool(),
        new QueryDatabaseTool(),
        new UpdateDatabaseTool(),
        
        // Vision tools
        ...visionAgent.tools
      ],
      sub_agents: [visionAgent, knowledgeGraphAgent]
    });

    this.vision_agent = visionAgent;
    this.knowledge_graph_agent = knowledgeGraphAgent;
    this.orchestration_engine = orchestrationEngine;

    // Register agents with orchestration engine
    this.setupOrchestration();

    // Set up callbacks
    this.setupCallbacks();

    // Auto-register with ADK UI (bypass AHIS requirements)
    this.autoRegisterWithADK();
  }

  private setupOrchestration(): void {
    // Register all agents with the orchestration engine
    this.orchestration_engine.registerAgent(this.vision_agent);
    this.orchestration_engine.registerAgent(this.knowledge_graph_agent);
    
    // Setup AI Assistant/Voice orchestration patterns with Knowledge Graph intelligence
    console.log('🎯 AI Assistant with Context Awareness & Workspace Management Architecture initialized');
    console.log('   Layer 1: Direct tools for fast operations (status, search, workspace)');
    console.log('   Layer 2: Vision and specialized agents for complex analysis');
    console.log('   Layer 3: Knowledge Graph multi-agent intelligence via A2A protocol');
    console.log('   🆕 Context Tools: get_page_context, get_context_history, get_active_pages');
    console.log('   🆕 Workspace Tools: create_page, create_database, query_database, update_database');
    
    // Warm up the model for faster responses
    this.warmupModel();
  }

  /**
   * Check AI Gateway availability for voice and AI features
   */
  private async warmupModel(): Promise<void> {
    console.log('🔍 Checking AI Gateway availability...');
    
    // Check if AI Gateway is available
    try {
      const healthCheck = await fetch(`${this.ai_gateway_url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (healthCheck.ok) {
        console.log('✅ AI Gateway is available');
      } else {
        console.log('⚠️ AI Gateway health check failed - voice assistant may not work');
        console.log('💡 Make sure AI Gateway is running on port 8777');
      }
    } catch (error) {
      console.log('❌ AI Gateway is not running - voice assistant will fail');
      console.log('💡 Start AI Gateway service on port 8777 for voice functionality');
    }
  }

  private setupCallbacks(): void {
    // Before agent callback - security and logging
    this.before_agent_callback = (context: CallbackContext) => {
      console.log(`🤖 [${context.agent_name}] Starting interaction`, {
        session: context.session_id,
        timestamp: new Date().toISOString()
      });
      
      // Update last activity
      context.state.lastActivity = new Date().toISOString();
    };

    // After agent callback - memory and analytics
    this.after_agent_callback = (context: CallbackContext) => {
      console.log(`✅ [${context.agent_name}] Interaction completed`, {
        session: context.session_id,
        memory_count: context.state.memoryEntities.length,
        conversation_length: context.state.conversationHistory.length
      });

      // Add interaction analytics to memory
      this.addMemory({
        type: 'interaction_analytics',
        content: {
          agent_name: context.agent_name,
          session_id: context.session_id,
          timestamp: new Date().toISOString(),
          memory_count: context.state.memoryEntities.length,
          conversation_length: context.state.conversationHistory.length
        },
        importance: 0.4
      });
    };

    // Before model callback - request enhancement
    this.before_model_callback = (context: CallbackContext, request: any) => {
      console.log(`🧠 [${context.agent_name}] Processing with model: ${request.model}`);
      
      // Add request analytics
      context.state.currentContext.request_metadata = {
        model: request.model,
        message_count: request.messages?.length || 0,
        timestamp: new Date().toISOString()
      };

      // Enhance request with proper token limits and temperature
      const enhancedRequest = {
        ...request,
        max_tokens: 2000,  // Increased from default 500
        temperature: 0.3   // Consistent temperature for dashboard responses
      };

      console.log(`🔧 [${context.agent_name}] Enhanced request with max_tokens: ${enhancedRequest.max_tokens}, temperature: ${enhancedRequest.temperature}`);

      return enhancedRequest;
    };

    // After model callback - response processing
    this.after_model_callback = (context: CallbackContext, response: any) => {
      const confidence = this.calculateResponseConfidence(response);
      
      console.log(`🎯 [${context.agent_name}] Response confidence: ${(confidence * 100).toFixed(1)}%`);
      
      // Store confidence in state
      context.state.currentContext.response_confidence = confidence;
    };

    // Tool callbacks
    this.before_tool_callback = (context: CallbackContext, toolName: string) => {
      console.log(`🔧 [${context.agent_name}] Using tool: ${toolName}`);
    };

    this.after_tool_callback = (context: CallbackContext, toolName: string, result: any) => {
      console.log(`⚡ [${context.agent_name}] Tool ${toolName} completed`);
      
      // Add tool usage to memory
      this.addMemory({
        type: 'tool_usage',
        content: {
          tool_name: toolName,
          result_status: result.status || 'unknown',
          timestamp: new Date().toISOString()
        },
        importance: 0.6
      });
    };
  }

  // Enhanced run method with orchestration support
  public async runWithDashboardContext(
    input: string, 
    dashboardContext?: Record<string, any>
  ): Promise<{
    response: string;
    confidence: number;
    toolsUsed: string[];
    processingTime: number;
    agentUsed: string;
    orchestrationResult?: OrchestrationResult;
  }> {
    const startTime = Date.now();
    const toolsUsed: string[] = [];

    try {
      // Inject dashboard context into agent state
      if (dashboardContext) {
        this.updateState({
          currentContext: {
            ...this.state.currentContext,
            dashboardContext
          }
        });
      }

      // Analyze input to determine orchestration strategy
      const orchestrationDecision = await this.analyzeOrchestrationStrategy(input);
      let response: string;
      let agentUsed = this.name;
      let orchestrationResult: OrchestrationResult | undefined;

      // Execute using orchestration patterns or direct routing
      if (orchestrationDecision.useOrchestration) {
        orchestrationResult = await this.orchestration_engine.executePattern(
          orchestrationDecision.pattern,
          input,
          dashboardContext
        );
        response = orchestrationResult.final_response;
        agentUsed = orchestrationDecision.pattern;
      } else if (orchestrationDecision.shouldDelegate) {
        response = await this.transferToAgent(orchestrationDecision.targetAgent, input);
        agentUsed = orchestrationDecision.targetAgent;
      } else {
        response = await this.run(input, dashboardContext);
      }

      // Calculate metrics
      const processingTime = Date.now() - startTime;
      const confidence = this.state.currentContext.response_confidence || 0.75;
      
      // Track tool usage
      const recentToolUsage = this.queryMemory('tool_usage', 5);
      recentToolUsage.forEach(usage => {
        const toolName = usage.content.tool_name;
        if (!toolsUsed.includes(toolName)) {
          toolsUsed.push(toolName);
        }
      });

      return {
        response,
        confidence,
        toolsUsed,
        processingTime,
        agentUsed,
        orchestrationResult
      };

    } catch (error) {
      console.error('❌ Dashboard AI Agent error:', error);
      
      return {
        response: 'I encountered an issue processing your request. Please try again or rephrase your question.',
        confidence: 0.0,
        toolsUsed: [],
        processingTime: Date.now() - startTime,
        agentUsed: this.name,
        orchestrationResult: undefined
      };
    }
  }

  private async analyzeOrchestrationStrategy(input: string): Promise<{
    useOrchestration: boolean;
    pattern: string;
    shouldDelegate: boolean;
    targetAgent: string;
    reasoning: string;
  }> {
    const lowerInput = input.toLowerCase();
    
    // Orchestration pattern detection
    if ((lowerInput.includes('remember') || lowerInput.includes('memory')) && 
        (lowerInput.includes('knowledge') || lowerInput.includes('graph'))) {
      return {
        useOrchestration: true,
        pattern: 'memory_kg_coordination',
        shouldDelegate: false,
        targetAgent: '',
        reasoning: 'Input requires both memory and knowledge graph coordination'
      };
    }
    
    if (lowerInput.includes('analyze') && 
        (lowerInput.includes('comprehensive') || lowerInput.includes('detailed'))) {
      return {
        useOrchestration: true,
        pattern: 'hybrid_intelligence',
        shouldDelegate: false,
        targetAgent: '',
        reasoning: 'Input requires comprehensive analysis using multiple agents'
      };
    }
    
    if (lowerInput.includes('visual') || lowerInput.includes('screenshot') || 
        lowerInput.includes('interface') || lowerInput.includes('ui')) {
      return {
        useOrchestration: true,
        pattern: 'vision_analysis',
        shouldDelegate: false,
        targetAgent: '',
        reasoning: 'Input requires visual analysis workflow'
      };
    }
    
    // Rule-based routing for single agents
    if (lowerInput.includes('status') || lowerInput.includes('health') || 
        lowerInput.includes('metric') || lowerInput.includes('system')) {
      return {
        useOrchestration: true,
        pattern: 'sequential_analysis',
        shouldDelegate: false,
        targetAgent: '',
        reasoning: 'Input contains system/status keywords - using sequential analysis'
      };
    }
    
    if (lowerInput.includes('help') || lowerInput.includes('how to') || 
        lowerInput.includes('documentation') || lowerInput.includes('explain')) {
      return {
        useOrchestration: false,
        pattern: '',
        shouldDelegate: true,
        targetAgent: 'documentation_agent',
        reasoning: 'Input is asking for help or documentation'
      };
    }
    
    if (lowerInput.includes('voice') || lowerInput.includes('speak') || 
        lowerInput.includes('audio') || lowerInput.includes('listen')) {
      return {
        useOrchestration: false,
        pattern: '',
        shouldDelegate: true,
        targetAgent: 'voice_agent',
        reasoning: 'Input relates to voice/audio functionality'
      };
    }

    // Default to handling directly
    return {
      useOrchestration: false,
      pattern: '',
      shouldDelegate: false,
      targetAgent: this.name,
      reasoning: 'General query - handle directly'
    };
  }

  // AI Assistant/Voice Intelligence Decision Logic
  async run(input: string, context?: Record<string, any>): Promise<string> {
    try {
      // Analyze query complexity and determine processing layer
      const queryAnalysis = this.analyzeQueryComplexity(input);
      
      console.log(`🎯 Query Analysis: ${queryAnalysis.layer} (complexity: ${queryAnalysis.complexity})`);

      switch (queryAnalysis.layer) {
        case 'layer1':
          console.log('🚀 Executing Layer 1: Direct Operations...');
          const layer1Result = await this.handleTier1DirectOperations(input, context, queryAnalysis);
          console.log('✅ Layer 1 completed, result length:', layer1Result.length);
          return layer1Result;
          
        case 'layer2':
          console.log('🚀 Executing Layer 2: Specialized Analysis...');
          return await this.handleTier2SpecializedAnalysis(input, context, queryAnalysis);
          
        case 'layer3':
          console.log('🚀 Executing Layer 3: Knowledge Graph Intelligence...');
          return await this.handleTier3TruthValidation(input, context, queryAnalysis);
          
        default:
          console.log('🚀 Executing default handler...');
          return await super.run(input, context);
      }
    } catch (error) {
      console.error('🚨 AI Assistant Intelligence Error:', error);
      
      // Return the detailed error message if it's already formatted
      if (error.message && error.message.includes('❌')) {
        return error.message;
      }
      
      return `❌ **AI Assistant Error**: ${error.message}\n\nThe AI Assistant encountered an unexpected issue while processing your request. Please try again or check the service logs for more details.`;
    }
  }

  private analyzeQueryComplexity(input: string): {
    layer: 'layer1' | 'layer2' | 'layer3',
    complexity: 'simple' | 'moderate' | 'complex',
    reasoning: string,
    requiresValidation: boolean
  } {
    const inputLower = input.toLowerCase();
    
    // Layer 3 indicators (Knowledge Graph Intelligence)
    const layer3Keywords = [
      'verify', 'validate', 'check consistency', 'fact check', 'cross-reference',
      'audit', 'compliance', 'approve', 'critical', 'ecosystem-wide', 'risk assessment'
    ];
    
    // Layer 2 indicators (Specialized Analysis)
    const layer2Keywords = [
      'analyze', 'infer', 'pattern', 'relationship', 'semantic', 'complex',
      'orchestrate', 'coordinate', 'vision', 'visual', 'screenshot'
    ];
    
    // Layer 1 indicators (Direct Operations)
    const layer1Keywords = [
      'status', 'health', 'list', 'show', 'get', 'simple', 'quick', 'lookup'
    ];

    if (layer3Keywords.some(keyword => inputLower.includes(keyword))) {
      return {
        layer: 'layer3',
        complexity: 'complex',
        reasoning: 'Requires Knowledge Graph multi-agent intelligence',
        requiresValidation: true
      };
    }

    if (layer2Keywords.some(keyword => inputLower.includes(keyword))) {
      return {
        layer: 'layer2',
        complexity: 'moderate',
        reasoning: 'Requires specialized agent analysis',
        requiresValidation: false
      };
    }

    return {
      layer: 'layer1',
      complexity: 'simple',
      reasoning: 'Simple query suitable for direct tool execution',
      requiresValidation: false
    };
  }

  private async handleTier1DirectOperations(input: string, context: any, analysis: any): Promise<string> {
    console.log('⚡ Layer 1: Direct Operations - executing tools directly');
    
    // Ecosystem queries: Route based on complexity
    if (input.toLowerCase().includes('memor') || input.toLowerCase().includes('knowledge') || 
        input.toLowerCase().includes('graph') || input.toLowerCase().includes('relationship') || 
        input.toLowerCase().includes('entity') || input.toLowerCase().includes('ecosystem') ||
        input.toLowerCase().includes('component') || input.toLowerCase().includes('service')) {
      
      // Determine if this needs intelligent processing or simple data query
      const needsIntelligentProcessing = this.requiresIntelligentProcessing(input);
      
      if (needsIntelligentProcessing) {
        console.log('🧠 Complex query - routing via AI Gateway to Knowledge Graph Orchestrator');
        return await this.routeViaAIGateway(input, context);
      } else {
        console.log('📊 Simple data query - using Knowledge Graph API directly');
        return await this.queryKnowledgeGraphAPI(input);
      }
    }
    
    // Fallback to agent processing
    return await super.run(input, context);
  }

  private requiresIntelligentProcessing(input: string): boolean {
    // Complex queries that need AI reasoning and orchestration
    const complexPatterns = [
      /analyze|analysis|compare|relationship|pattern|trend/i,
      /why|how|explain|reason|cause/i,
      /recommend|suggest|optimize|improve/i,
      /correlate|connect|link|associate/i,
      /summarize|overview|report/i
    ];
    
    return complexPatterns.some(pattern => pattern.test(input));
  }

  private async routeViaAIGateway(input: string, context: any): Promise<string> {
    console.log('🔄 Routing complex query via AI Gateway to Knowledge Graph Orchestrator');
    
    try {
      // Use AI Gateway to route to Knowledge Graph Orchestrator for intelligent processing
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch('http://localhost:8777/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'default-key'}`,
          'X-Target-Service': 'knowledge-graph-orchestrator'
        },
        body: JSON.stringify({
          model: 'gemma3',
          messages: [
            {
              role: 'system',
              content: 'You are the Knowledge Graph Orchestrator. Process complex queries requiring AI reasoning and knowledge synthesis.'
            },
            {
              role: 'user', 
              content: input
            }
          ],
          max_tokens: 2000,
          temperature: 0.3
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI Gateway request failed: ${response.status}`);
      }

      const result = await response.json();
      return result.choices?.[0]?.message?.content || 'No response from Knowledge Graph Orchestrator';
      
    } catch (error) {
      console.error('❌ AI Gateway routing failed:', error);
      
      if (error.name === 'AbortError') {
        return `❌ **AI Gateway Timeout**: The AI Gateway service (port 8777) didn't respond within 5 seconds. This could indicate:\n\n• AI Gateway service is overloaded\n• Network connectivity issues\n• Service configuration problems\n\nPlease check the AI Gateway service status or try again in a moment.`;
      }
      
      return `❌ **AI Gateway Error**: Failed to route query through AI Gateway (${error.message}). The AI Gateway service on port 8777 may be unavailable or misconfigured.\n\nPlease check:\n• AI Gateway service is running\n• Port 8777 is accessible\n• Service configuration is correct`;
    }
  }

  private async queryKnowledgeGraphAPI(input: string): Promise<string> {
    console.log('📊 Querying Knowledge Graph API directly for simple data query');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
      
      const response = await fetch('http://localhost:8765/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: input,
          type: 'natural_language'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Knowledge Graph API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Extract the actual response text from different possible structures
        const responseText = result.data?.answer || 
                            result.data?.result || 
                            result.response?.text ||
                            result.data?.text ||
                            'Query completed successfully';
        
        // If there's a warning about fallback mode, include it
        if (result.warning) {
          return `${responseText}\n\n⚠️ Note: ${result.warning}`;
        }
        
        return responseText;
      } else {
        return `Knowledge Graph query failed: ${result.error}`;
      }
      
    } catch (error) {
      console.error('❌ Knowledge Graph API query failed:', error);
      
      if (error.name === 'AbortError') {
        return `❌ **Knowledge Graph Timeout**: The Knowledge Graph API (port 8765) didn't respond within 8 seconds. This could indicate:\n\n• Knowledge Graph service is processing a complex query\n• Database is under heavy load\n• Network connectivity issues\n\nPlease try again or check the Knowledge Graph service status.`;
      }
      
      if (error.message?.includes('Failed to fetch')) {
        return `❌ **Knowledge Graph Unavailable**: Cannot connect to Knowledge Graph service on port 8765.\n\nThis could mean:\n• Knowledge Graph service is not running\n• Port 8765 is not accessible\n• Network connectivity issues\n\nPlease check if the Knowledge Graph service is running and accessible.`;
      }
      
      return `❌ **Knowledge Graph Error**: ${error.message}\n\nThe Knowledge Graph API encountered an issue. Please check the service logs or try again.`;
    }
  }

  private async callA2AAgent(agentUrl: string, payload: any): Promise<string> {
    console.log(`🔄 Making A2A call to ${agentUrl} with payload:`, payload);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${agentUrl}/a2a/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: payload.type,
          payload: payload
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`A2A call failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ A2A response from ${agentUrl}:`, result);
      
      if (result.success === false) {
        throw new Error(result.error || 'A2A agent returned error');
      }

      // Ensure we return a string, not an object
      if (typeof result.response === 'string') {
        return result.response;
      } else if (typeof result.result === 'string') {
        return result.result;
      } else if (result.response && typeof result.response === 'object') {
        return JSON.stringify(result.response);
      } else if (result.result && typeof result.result === 'object') {
        return JSON.stringify(result.result);
      } else {
        return JSON.stringify(result);
      }
    } catch (error: any) {
      console.error(`❌ A2A call to ${agentUrl} failed:`, error);
      
      if (error.name === 'AbortError') {
        throw new Error(`❌ **A2A Agent Timeout**: Agent at ${agentUrl} didn't respond within 5 seconds. The agent may be overloaded or unresponsive.`);
      }
      
      throw new Error(`❌ **A2A Agent Error**: Failed to communicate with agent at ${agentUrl}. ${error.message}`);
    }
  }

  private extractTimeRange(input: string): any {
    const inputLower = input.toLowerCase();
    
    // Extract time ranges from natural language
    if (inputLower.includes('48 hours') || inputLower.includes('48h')) {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
      return { since_timestamp: since.toISOString() };
    }
    
    if (inputLower.includes('24 hours') || inputLower.includes('24h') || inputLower.includes('last day')) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return { since_timestamp: since.toISOString() };
    }
    
    if (inputLower.includes('week') || inputLower.includes('7 days')) {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return { since_timestamp: since.toISOString() };
    }
    
    if (inputLower.includes('hour') || inputLower.includes('1h')) {
      const since = new Date(Date.now() - 60 * 60 * 1000);
      return { since_timestamp: since.toISOString() };
    }
    
    // Default to last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return { since_timestamp: since.toISOString() };
  }

  private getTimeDescription(input: string): string {
    const inputLower = input.toLowerCase();
    
    if (inputLower.includes('48 hours') || inputLower.includes('48h')) {
      return 'last 48 hours';
    }
    if (inputLower.includes('24 hours') || inputLower.includes('24h') || inputLower.includes('last day')) {
      return 'last 24 hours';
    }
    if (inputLower.includes('week') || inputLower.includes('7 days')) {
      return 'last week';
    }
    if (inputLower.includes('hour') || inputLower.includes('1h')) {
      return 'last hour';
    }
    
    return 'recent period';
  }

  private async handleTier2SpecializedAnalysis(input: string, context: any, analysis: any): Promise<string> {
    console.log('🤖 Layer 2: Specialized Analysis');
    
    // Determine which specialized agents to use
    if (input.toLowerCase().includes('visual') || input.toLowerCase().includes('screenshot')) {
      const result = await this.orchestration_engine.executePattern('vision_analysis', input, context);
      return result.final_response;
    }
    
    if (input.toLowerCase().includes('memory') && input.toLowerCase().includes('graph')) {
      const result = await this.orchestration_engine.executePattern('memory_kg_coordination', input, context);
      return result.final_response;
    }
    
    if (input.toLowerCase().includes('analyze') || input.toLowerCase().includes('pattern')) {
      const result = await this.orchestration_engine.executePattern('hybrid_intelligence', input, context);
      return result.final_response;
    }
    
    // Default to sequential analysis
    const result = await this.orchestration_engine.executePattern('sequential_analysis', input, context);
    return result.final_response;
  }

  private async handleTier3TruthValidation(input: string, context: any, analysis: any): Promise<string> {
    console.log('🔍 Layer 3: Knowledge Graph Intelligence & Validation');
    
    try {
      // Step 1: Gather contextual data via A2A protocol from Knowledge Graph agents
      const memoryData = await this.callA2AAgent(this.ideMemoryAgentUrl, {
        type: 'memory_query',
        query: input,
        requester: 'dashboard_ai_agent'
      });
      
      // Step 2: Get comprehensive analysis from Knowledge Graph multi-agent system
      const kgValidation = await this.callA2AAgent(this.knowledgeGraphAgentUrl, {
        type: 'comprehensive_analysis',
        query: input,
        context: {
          memory_data: memoryData,
          dashboard_context: context,
          validation_required: true
        },
        requester: 'dashboard_ai_agent'
      });
      
      // Step 3: Format response with Knowledge Graph intelligence
      return this.formatKnowledgeGraphResponse(kgValidation, memoryData);
      
    } catch (error) {
      console.error('🚨 Knowledge Graph Intelligence Error:', error);
      return `Knowledge Graph analysis failed: ${error.message}. Falling back to direct processing.`;
    }
  }

  private formatKnowledgeGraphResponse(kgResponse: any, memoryData: any): string {
    try {
      const response = typeof kgResponse === 'string' ? kgResponse : JSON.stringify(kgResponse);
      return `✅ **Knowledge Graph Intelligence Response**\n\n${response}\n\n*Source: Knowledge Graph Multi-Agent System*\n*Contextual Memory Integration: Active*`;
    } catch (error) {
      return `⚠️ **Knowledge Graph Analysis**\n\nResponse processing issue: ${error.message}\n\n*Fallback to direct dashboard processing recommended.*`;
    }
  }

  private calculateResponseConfidence(response: any): number {
    // Simple confidence calculation based on response characteristics
    const content = response.message?.content || '';
    
    if (content.length < 10) return 0.3;
    if (content.includes('I don\'t know') || content.includes('unclear')) return 0.4;
    if (content.includes('specific') && content.includes('data')) return 0.9;
    if (content.length > 100) return 0.8;
    
    return 0.75; // Default confidence
  }

  // Export agent state for persistence
  public exportSession(): any {
    return {
      agent_name: this.name,
      session_id: this.state.sessionId,
      state: this.state,
      sub_agents: this.sub_agents.map(agent => ({
        name: agent.name,
        state: agent.state
      }))
    };
  }

  // Import agent state from persistence
  public importSession(sessionData: any): void {
    if (sessionData.state) {
      this.state = sessionData.state;
    }
    
    // Restore sub-agent states
    if (sessionData.sub_agents) {
      sessionData.sub_agents.forEach((agentData: any) => {
        const agent = this.sub_agents.find(a => a.name === agentData.name);
        if (agent && agentData.state) {
          agent.state = agentData.state;
        }
      });
    }
  }

  // Enhanced methods for IDE Memory and Knowledge Graph integration
  public async syncMemoryWithKnowledgeGraph(): Promise<any> {
    try {
      // Get architectural memories from IDE Memory Agent via A2A
      const memoryStats = await this.callA2AAgent(this.ideMemoryAgentUrl, {
        type: 'memory_query',
        query: 'get memory statistics',
        requester: 'dashboard_ai_agent'
      });
      
      const projectMemories = await this.callA2AAgent(this.ideMemoryAgentUrl, {
        type: 'memory_query',
        query: 'get project memories for dashboard',
        requester: 'dashboard_ai_agent'
      });
      
      // Sync with Knowledge Graph Agent
      const syncResult = await this.knowledge_graph_agent.syncWithIDEMemory(
        JSON.parse(projectMemories)
      );
      
      // Sync back to IDE Memory
      await this.callA2AAgent(this.ideMemoryAgentUrl, {
        type: 'memory_sync',
        payload: syncResult,
        requester: 'dashboard_ai_agent'
      });
      
      return {
        status: 'success',
        memory_stats: memoryStats,
        kg_sync_results: syncResult,
        message: 'Memory and Knowledge Graph synchronization completed'
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Sync failed: ${error.message}`
      };
    }
  }

  public async getOrchestrationStatus(): Promise<any> {
    return {
      available_patterns: this.orchestration_engine.getAvailablePatterns(),
      registered_agents: this.orchestration_engine.getRegisteredAgents(),
      memory_stats: await this.callA2AAgent(this.ideMemoryAgentUrl, {
        type: 'memory_query',
        query: 'get memory statistics',
        requester: 'dashboard_ai_agent'
      }),
      kg_stats: await this.knowledge_graph_agent.getEntityStats()
    };
  }

  public async executeOrchestrationPattern(
    patternName: string,
    input: string,
    context?: Record<string, any>
  ): Promise<OrchestrationResult> {
    return await this.orchestration_engine.executePattern(patternName, input, context);
  }

  // Method to get comprehensive system insights
  public async getSystemInsights(): Promise<any> {
    try {
      const orchestrationResult = await this.orchestration_engine.executePattern(
        'hybrid_intelligence',
        'Provide comprehensive system insights and recommendations',
        { include_all_context: true }
      );
      
      return {
        status: 'success',
        insights: orchestrationResult,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to generate system insights: ${error.message}`
      };
    }
  }

  /**
   * Auto-register with ADK UI system (bypasses AHIS requirements)
   * Makes the agent visible in Agentic Control Dashboard
   */
  private async autoRegisterWithADK(): Promise<void> {
    try {
      console.log('🔌 Auto-registering DashboardAIAgent with ADK UI...');
      
      // Create agent registration payload for ADK UI
      const agentRegistration = {
        id: this.name,
        name: 'Dashboard AI Coordinator',
        type: 'dashboard-ai',
        status: 'active',
        health: 'healthy',
        version: '2.1.0',
        description: this.description,
        capabilities: [
          'system-monitoring',
          'multi-agent-orchestration', 
          'vision-analysis',
          'knowledge-graph-queries',
          'voice-interaction',
          'real-time-insights'
        ],
        tools: this.tools.map(tool => tool.name),
        sub_agents: this.sub_agents.map(agent => ({
          name: agent.name,
          type: agent.constructor.name,
          status: 'active'
        })),
        orchestration_patterns: [
          'memory_kg_coordination',
          'hybrid_intelligence', 
          'vision_analysis',
          'sequential_analysis'
        ],
        ai_gateway_url: this.ai_gateway_url,
        model: this.model,
        app_name: this.app_name,
        lastActivity: new Date().toISOString(),
        registeredAt: new Date().toISOString(),
        intelligence_layers: {
          layer1: 'Direct Operations (fast)',
          layer2: 'Specialized Analysis (moderate)', 
          layer3: 'Knowledge Graph Intelligence (complex)'
        }
      };

      // Register directly with browser storage for ADK UI visibility
      // This bypasses AHIS server dependency
      if (typeof window !== 'undefined') {
        const existingAgents = JSON.parse(localStorage.getItem('adk_registered_agents') || '[]');
        
        // Remove any existing registration of this agent
        const filteredAgents = existingAgents.filter((agent: any) => agent.id !== this.name);
        
        // Add current registration
        filteredAgents.push(agentRegistration);
        
        localStorage.setItem('adk_registered_agents', JSON.stringify(filteredAgents));
        
        console.log('✅ DashboardAIAgent registered with ADK UI');
        console.log(`   Agent ID: ${this.name}`);
        console.log(`   Capabilities: ${agentRegistration.capabilities.length}`);
        console.log(`   Sub-agents: ${agentRegistration.sub_agents.length}`);
        console.log(`   Tools: ${agentRegistration.tools.length}`);
      }

      // Also attempt API registration (non-blocking)
      this.attemptAPIRegistration(agentRegistration).catch(error => {
        console.warn('⚠️ API registration failed (non-critical):', error.message);
      });

    } catch (error) {
      console.error('❌ Failed to auto-register DashboardAIAgent:', error);
      // Non-blocking - agent still functions without registration
    }
  }

  /**
   * Attempt API registration (non-blocking, uses existing registration endpoint)
   */
  private async attemptAPIRegistration(agentData: any): Promise<void> {
    try {
      // Register agent using existing endpoint (used by ADE UI Client SDK)
      const response = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: agentData.id,
          name: agentData.name,
          type: agentData.type,
          version: agentData.version,
          description: agentData.description,
          system_instructions: `You are DashAI, the primary AI assistant for the AI Homelab Dashboard ecosystem. Your role is to:

1. **Dashboard Assistance**: Help users navigate and understand the AI Homelab Dashboard interface
2. **System Monitoring**: Provide insights on agent status, performance, and health metrics  
3. **Agent Coordination**: Facilitate communication between different agents in the ecosystem
4. **User Guidance**: Offer contextual help and recommendations for dashboard features
5. **Knowledge Integration**: Access and synthesize information from the Knowledge Graph

As an ADK/A2A compliant agent, you can communicate with other agents and access the agent registry. Always be helpful, informative, and focused on the AI Homelab ecosystem.`,
          model: agentData.model,
          temperature: 0.7,
          max_tokens: 2000,
          capabilities: agentData.capabilities,
          tools: agentData.tools,
          sub_agents: agentData.sub_agents,
          session_memory: true,
          voice_enabled: true,
          adk_version: agentData.adk_version,
          a2a_enabled: true,
          agent_class: 'LlmAgent',
          project: agentData.app_name,
          specialization: 'dashboard',
          status: 'active'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Agent ${result.action} successfully`);
      } else {
        const error = await response.json();
        console.warn('⚠️ Agent registration failed:', error.error);
      }
    } catch (error) {
      // Silent fail - registration via localStorage is sufficient
      console.warn('⚠️ Agent registration failed (non-critical):', error.message);
    }
  }

  /**
   * Get agent registration status for ADK UI
   */
  public getRegistrationStatus(): any {
    return {
      isRegistered: true,
      agentId: this.name,
      registrationTime: new Date().toISOString(),
      capabilities: [
        'system-monitoring',
        'multi-agent-orchestration',
        'vision-analysis', 
        'knowledge-graph-queries',
        'voice-interaction',
        'real-time-insights'
      ],
      metadata: {
        name: 'Dashboard AI Coordinator',
        version: '2.1.0',
        model: this.model,
        layers: 3,
        sub_agents: this.sub_agents.length,
        tools: this.tools.length
      }
    };
  }
}
