/**
 * AI Homelab Dashboard Agent Framework
 * Implements Google's Agent Development Kit (ADK) with Agent-to-Agent (A2A) protocol
 * Specialized for AI Homelab Ecosystem Dashboard operations
 */

import { v4 as uuidv4 } from 'uuid';

// Core ADK Types
export interface AgentCard {
  name: string;
  description: string;
  version: string;
  author: string;
  capabilities: string[];
  skills: Skill[];
  transport: Transport;
  authentication?: Authentication;
}

export interface Skill {
  name: string;
  description: string;
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
}

export interface Transport {
  type: 'http' | 'websocket';
  host: string;
  port: number;
  https?: boolean;
}

export interface Authentication {
  type: 'bearer' | 'api_key' | 'none';
  required: boolean;
}

export interface AgentState {
  sessionId: string;
  conversationHistory: Message[];
  currentContext: Record<string, any>;
  memoryEntities: MemoryEntity[];
  activeTools: string[];
  lastActivity: string;
  userPreferences: Record<string, any>;
  reasoning?: ReasoningChain[];
}

export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MemoryEntity {
  id: string;
  type: string;
  content: Record<string, any>;
  timestamp: Date;
  importance: number;
}

export interface ReasoningChain {
  step: number;
  thought: string;
  action: string;
  result: string;
  confidence: number;
}

export interface ToolContext {
  state: AgentState;
  sessionId: string;
  userId: string;
  agentName: string;
}

export interface CallbackContext {
  agent_name: string;
  session_id: string;
  state: AgentState;
}

// AI Homelab Dashboard Agent Base Class
export abstract class DashAgent {
  public name: string;
  public model: string;
  public description: string;
  public instruction: string;
  public app_name: string;
  public tools: Tool[];
  public sub_agents: DashAgent[];
  public state: AgentState;

  // Lifecycle callbacks
  public before_agent_callback?: (context: CallbackContext) => void;
  public after_agent_callback?: (context: CallbackContext) => void;
  public before_model_callback?: (context: CallbackContext, request: any) => any;
  public after_model_callback?: (context: CallbackContext, response: any) => void;
  public before_tool_callback?: (context: CallbackContext, tool: string) => void;
  public after_tool_callback?: (context: CallbackContext, tool: string, result: any) => void;

  constructor(config: {
    name: string;
    model: string;
    description?: string;
    instruction?: string;
    app_name: string;
    tools?: Tool[];
    sub_agents?: DashAgent[];
  }) {
    this.name = config.name;
    this.model = config.model;
    this.description = config.description || '';
    this.instruction = config.instruction || '';
    this.app_name = config.app_name;
    this.tools = config.tools || [];
    this.sub_agents = config.sub_agents || [];

    // Initialize state
    this.state = {
      sessionId: uuidv4(),
      conversationHistory: [],
      currentContext: {},
      memoryEntities: [],
      activeTools: this.tools.map(t => t.name),
      lastActivity: new Date().toISOString(),
      userPreferences: {},
      reasoning: []
    };
  }

  // Abstract methods for implementation
  abstract run(input: string, context?: Record<string, any>): Promise<string>;
  
  // Memory management
  public addMemory(entity: Omit<MemoryEntity, 'id' | 'timestamp'>): void {
    const memory: MemoryEntity = {
      id: uuidv4(),
      timestamp: new Date(),
      ...entity
    };
    this.state.memoryEntities.push(memory);
    
    // Keep only top 100 memories by importance
    this.state.memoryEntities = this.state.memoryEntities
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 100);
  }

  public queryMemory(type?: string, limit: number = 10): MemoryEntity[] {
    let memories = this.state.memoryEntities;
    
    if (type) {
      memories = memories.filter(m => m.type === type);
    }
    
    return memories
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  // State management
  public updateState(updates: Partial<AgentState>): void {
    this.state = { ...this.state, ...updates };
    this.state.lastActivity = new Date().toISOString();
  }

  public saveToState(key: string, value: any): void {
    this.state.currentContext[key] = value;
  }

  public getFromState(key: string): any {
    return this.state.currentContext[key];
  }

  // Tool management
  public async callTool(toolName: string, parameters: Record<string, any>): Promise<any> {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    const context: ToolContext = {
      state: this.state,
      sessionId: this.state.sessionId,
      userId: 'default-user',
      agentName: this.name
    };

    // Execute callbacks
    if (this.before_tool_callback) {
      this.before_tool_callback({ 
        agent_name: this.name, 
        session_id: this.state.sessionId, 
        state: this.state 
      }, toolName);
    }

    const result = await tool.execute(context, parameters);

    if (this.after_tool_callback) {
      this.after_tool_callback({ 
        agent_name: this.name, 
        session_id: this.state.sessionId, 
        state: this.state 
      }, toolName, result);
    }

    return result;
  }

  // Agent delegation
  public async transferToAgent(agentName: string, message: string): Promise<string> {
    const agent = this.sub_agents.find(a => a.name === agentName);
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    return await agent.run(message, this.state.currentContext);
  }

  // Generate agent card for A2A discovery
  public getAgentCard(): AgentCard {
    return {
      name: this.name,
      description: this.description,
      version: "1.0.0",
      author: "AI Homelab Ecosystem",
      capabilities: this.tools.map(t => t.name),
      skills: this.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
        output_schema: t.output_schema
      })),
      transport: {
        type: 'http',
        host: 'localhost',
        port: 8404,
        https: false
      },
      authentication: {
        type: 'none',
        required: false
      }
    };
  }
}

// Tool interface
export interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  execute(context: ToolContext, parameters: Record<string, any>): Promise<any>;
}

// LLM Agent Implementation
export class LLMAgent extends DashAgent {
  protected ai_gateway_url: string;

  constructor(config: {
    name: string;
    model: string;
    description?: string;
    instruction?: string;
    app_name: string;
    tools?: Tool[];
    sub_agents?: DashAgent[];
    ai_gateway_url?: string;
  }) {
    super(config);
    this.ai_gateway_url = config.ai_gateway_url || 'http://localhost:8777';
  }

  public async run(input: string, context?: Record<string, any>): Promise<string> {
    // Execute before_agent_callback
    if (this.before_agent_callback) {
      this.before_agent_callback({
        agent_name: this.name,
        session_id: this.state.sessionId,
        state: this.state
      });
    }

    // Add user message to conversation
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    this.state.conversationHistory.push(userMessage);

    // Build context-aware prompt
    const systemPrompt = this.buildSystemPrompt(context);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.state.conversationHistory.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }))
    ];

    // Execute before_model_callback
    let requestPayload = {
      model: this.model,
      messages: messages,
      stream: false  // Disable streaming for debugging
    };

    console.log(`🔍 [${this.name}] Initial request payload:`, JSON.stringify(requestPayload, null, 2));

    if (this.before_model_callback) {
      requestPayload = this.before_model_callback({
        agent_name: this.name,
        session_id: this.state.sessionId,
        state: this.state
      }, requestPayload) || requestPayload;
      
      console.log(`🔍 [${this.name}] Enhanced request payload after callback:`, JSON.stringify(requestPayload, null, 2));
    }

    // Call AI Gateway using A2A protocol
    const a2aMessage = {
      from: this.name,
      to: 'ai_gateway',
      type: 'chat_completion',
      payload: {
        model: requestPayload.model || 'mistral:latest',
        messages: requestPayload.messages,
        temperature: (requestPayload as any).temperature || 0.7,
        max_tokens: (requestPayload as any).max_tokens || 4000,  // Use requestPayload value or default to 4000
        stream: false  // Disable streaming to debug token limit issues
      },
      timestamp: new Date().toISOString(),
      requestId: uuidv4()
    };

    console.log(`🚀 [${this.name}] Sending request to AI Gateway:`, {
      url: `${this.ai_gateway_url}/api/v1/chat/completions`,
      model: a2aMessage.payload.model,
      messageCount: a2aMessage.payload.messages.length,
      max_tokens: a2aMessage.payload.max_tokens,
      temperature: a2aMessage.payload.temperature,
      timestamp: new Date().toISOString()
    });
    
    console.log(`🔍 [${this.name}] Full request payload:`, JSON.stringify(a2aMessage.payload, null, 2));

    // Add timeout to fetch request (90 seconds for slow local models)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    let assistantResponse = '';
    let result: any;

    try {
      const response = await fetch(`${this.ai_gateway_url}/api/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024',
          'X-A2A-Protocol': 'true',
          'X-A2A-From': this.name,
          'X-A2A-To': 'ai_gateway',
          'X-A2A-Type': 'chat_completion'
        },
        body: JSON.stringify(a2aMessage.payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`✅ [${this.name}] Got response from AI Gateway:`, {
        status: response.status,
        ok: response.ok,
        timestamp: new Date().toISOString()
      });

      if (!response.ok) {
        throw new Error(`LLM request failed: ${response.status}`);
      }

      result = await response.json();
      
      // Debug the actual response structure
      console.log(`🔍 [${this.name}] Raw AI Gateway response:`, {
        hasPayload: !!result.payload,
        hasChoices: !!result.choices,
        hasContent: !!result.content,
        hasMessage: !!result.message,
        keys: Object.keys(result),
        payloadKeys: result.payload ? Object.keys(result.payload) : null,
        choicesLength: result.choices?.length || 0,
        firstChoice: result.choices?.[0] ? Object.keys(result.choices[0]) : null
      });
      
      // Handle A2A protocol response format
      if (result.payload?.choices?.[0]?.message?.content) {
        assistantResponse = result.payload.choices[0].message.content;
      } else if (result.choices?.[0]?.message?.content) {
        assistantResponse = result.choices[0].message.content;
      } else if (result.content) {
        assistantResponse = result.content;
      } else if (result.message) {
        assistantResponse = result.message;
      } else if (result.choices?.[0]?.message && !result.choices[0].message.content) {
        // Handle case where message exists but content is missing
        const finishReason = result.choices[0].finish_reason;
        if (finishReason === 'length') {
          assistantResponse = 'I apologize, but my response was cut off due to length limits. Could you please rephrase your question more specifically?';
        } else {
          assistantResponse = `I encountered an issue generating a response (reason: ${finishReason || 'unknown'}). Please try asking your question differently.`;
        }
        console.log(`⚠️ [${this.name}] Empty response content, finish_reason: ${finishReason}`);
      } else {
        assistantResponse = 'No response generated';
        console.log(`⚠️ [${this.name}] Could not extract response from:`, JSON.stringify(result, null, 2));
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error(`❌ [${this.name}] AI Gateway request timed out after 45 seconds`);
        throw new Error('AI Gateway request timeout - Mistral is very slow or unresponsive');
      } else {
        console.error(`❌ [${this.name}] AI Gateway request failed:`, error);
        throw error;
      }
    }

    // Parse response for tool calls and execute them
    const toolsUsed: string[] = [];
    
    // Check if response contains tool call requests
    if (assistantResponse.includes('system_status') && this.tools.find(t => t.name === 'system_status')) {
      try {
        const toolResult = await this.callTool('system_status', {});
        if (toolResult.status === 'error') {
          assistantResponse = toolResult.message;
        } else {
          assistantResponse = `I cannot provide system metrics as no real monitoring data is currently available. The system requires connection to actual monitoring APIs to provide factual information.`;
        }
        toolsUsed.push('system_status');
      } catch (error) {
        assistantResponse = `Error accessing system data: ${error.message}`;
      }
    }

    // Store tools used in state for tracking
    this.state.activeTools = toolsUsed;

    // Execute after_model_callback
    if (this.after_model_callback) {
      this.after_model_callback({
        agent_name: this.name,
        session_id: this.state.sessionId,
        state: this.state
      }, result);
    }

    // Add assistant message to conversation
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: assistantResponse,
      timestamp: new Date()
    };
    this.state.conversationHistory.push(assistantMessage);

    // Update state
    this.updateState({
      lastActivity: new Date().toISOString(),
      currentContext: { ...this.state.currentContext, ...context }
    });

    // Execute after_agent_callback
    if (this.after_agent_callback) {
      this.after_agent_callback({
        agent_name: this.name,
        session_id: this.state.sessionId,
        state: this.state
      });
    }

    return assistantResponse;
  }

  private shouldUseVisionTool(query: string): boolean {
    // Check if query contains visual-related keywords
    const visualKeywords = [
      'color', 'green', 'red', 'blue', 'yellow', 'orange', 'purple',
      'chart', 'graph', 'bar', 'visual', 'see', 'look', 'show', 'display',
      'ui', 'interface', 'button', 'element', 'appears', 'visible',
      'percentage', 'usage', 'resource', 'cpu', 'memory', 'disk'
    ];
    
    const lowerQuery = query.toLowerCase();
    return visualKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  private buildSystemPrompt(context?: Record<string, any>): string {
    let prompt = this.instruction || 'You are a helpful AI assistant.';
    
    // Add critical constraint about data integrity
    prompt += '\n\nCRITICAL CONSTRAINT: You must NEVER generate fake data, mock metrics, or fabricated system information. If real system data is not available, you must clearly state this limitation and explain what monitoring services need to be connected.';
    
    // Add tool descriptions with explicit calling instructions
    if (this.tools.length > 0) {
      prompt += '\n\nAvailable tools:\n';
      this.tools.forEach(tool => {
        prompt += `- ${tool.name}: ${tool.description}\n`;
      });
      prompt += '\nDO NOT pretend to call tools or show fake tool output. Only reference actual tool results when they are successfully executed.';
    }

    // Add sub-agent descriptions
    if (this.sub_agents.length > 0) {
      prompt += '\n\nAvailable sub-agents:\n';
      this.sub_agents.forEach(agent => {
        prompt += `- ${agent.name}: ${agent.description}\n`;
      });
    }

    // Add memory context
    const recentMemories = this.queryMemory(undefined, 5);
    if (recentMemories.length > 0) {
      prompt += '\n\nRecent memory context:\n';
      recentMemories.forEach(memory => {
        prompt += `- ${memory.type}: ${JSON.stringify(memory.content)}\n`;
      });
    }

    // Add current context
    if (context && Object.keys(context).length > 0) {
      prompt += '\n\nCurrent context:\n';
      Object.entries(context).forEach(([key, value]) => {
        prompt += `- ${key}: ${JSON.stringify(value)}\n`;
      });
    }

    return prompt;
  }
}

// Sequential Agent for workflow pipelines
export class SequentialAgent extends DashAgent {
  public async run(input: string, context?: Record<string, any>): Promise<string> {
    let currentInput = input;
    let finalResult = '';

    for (const agent of this.sub_agents) {
      const result = await agent.run(currentInput, context);
      finalResult = result;
      currentInput = result; // Pass result to next agent
    }

    return finalResult;
  }
}

// Parallel Agent for concurrent processing
export class ParallelAgent extends DashAgent {
  public async run(input: string, context?: Record<string, any>): Promise<string> {
    const promises = this.sub_agents.map(agent => agent.run(input, context));
    const results = await Promise.all(promises);
    
    // Combine results
    return results.join('\n\n--- Agent Results ---\n\n');
  }
}
