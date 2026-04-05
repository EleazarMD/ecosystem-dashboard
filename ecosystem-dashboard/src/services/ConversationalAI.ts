/**
 * Google ADK UI-Style Conversational AI Service
 * Implements NLU pipeline, session memory, and context-aware dialogue
 */

interface Entity {
  type: string;
  value: string;
  confidence: number;
  start: number;
  end: number;
}

interface Intent {
  name: string;
  confidence: number;
  parameters: Record<string, any>;
}

interface ConversationTurn {
  id: string;
  timestamp: Date;
  userInput: string;
  agentResponse: string;
  entities: Entity[];
  intent: Intent;
  context: Record<string, any>;
}

interface SessionState {
  sessionId: string;
  userId: string;
  agentId: string;
  startTime: Date;
  lastActivity: Date;
  conversationHistory: ConversationTurn[];
  userPreferences: Record<string, any>;
  contextVariables: Record<string, any>;
  currentIntent: string | null;
  isVoiceActive: boolean;
}

export class ConversationalAI {
  private sessions: Map<string, SessionState> = new Map();
  private intentPatterns: Map<string, RegExp[]> = new Map();
  private entityExtractors: Map<string, (text: string) => Entity[]> = new Map();

  constructor() {
    this.initializeIntentPatterns();
    this.initializeEntityExtractors();
  }

  /**
   * Initialize intent recognition patterns (Google ADK style)
   */
  private initializeIntentPatterns() {
    this.intentPatterns.set('agent.query', [
      /what can you do/i,
      /help me/i,
      /how do you work/i,
      /what are your capabilities/i
    ]);

    this.intentPatterns.set('agent.switch', [
      /switch to (\w+) agent/i,
      /talk to (\w+)/i,
      /use (\w+) agent/i,
      /change agent to (\w+)/i
    ]);

    this.intentPatterns.set('system.status', [
      /system status/i,
      /health check/i,
      /how is everything/i,
      /system health/i
    ]);

    this.intentPatterns.set('data.query', [
      /show me data/i,
      /get information about/i,
      /query (\w+)/i,
      /search for/i
    ]);

    this.intentPatterns.set('voice.control', [
      /enable voice/i,
      /start listening/i,
      /voice on/i,
      /disable voice/i,
      /stop listening/i,
      /voice off/i
    ]);
  }

  /**
   * Initialize entity extractors (Google ADK style NER)
   */
  private initializeEntityExtractors() {
    // Agent name extractor
    this.entityExtractors.set('agent', (text: string): Entity[] => {
      const agentNames = ['orchestrator', 'graph-query', 'vector-search', 'documentation', 'reasoning', 'memory', 'integration'];
      const entities: Entity[] = [];
      
      agentNames.forEach(agent => {
        const regex = new RegExp(`\\b${agent}\\b`, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          entities.push({
            type: 'agent',
            value: agent,
            confidence: 0.95,
            start: match.index,
            end: match.index + match[0].length
          });
        }
      });
      
      return entities;
    });

    // System component extractor
    this.entityExtractors.set('system_component', (text: string): Entity[] => {
      const components = ['dashboard', 'knowledge-graph', 'database', 'api', 'service', 'health', 'status'];
      const entities: Entity[] = [];
      
      components.forEach(component => {
        const regex = new RegExp(`\\b${component}\\b`, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          entities.push({
            type: 'system_component',
            value: component,
            confidence: 0.9,
            start: match.index,
            end: match.index + match[0].length
          });
        }
      });
      
      return entities;
    });
  }

  /**
   * Create or get existing session (Google ADK session management)
   */
  public getOrCreateSession(sessionId: string, userId: string, agentId: string): SessionState {
    if (!this.sessions.has(sessionId)) {
      const session: SessionState = {
        sessionId,
        userId,
        agentId,
        startTime: new Date(),
        lastActivity: new Date(),
        conversationHistory: [],
        userPreferences: {},
        contextVariables: {},
        currentIntent: null,
        isVoiceActive: false
      };
      this.sessions.set(sessionId, session);
    }
    
    const session = this.sessions.get(sessionId)!;
    session.lastActivity = new Date();
    return session;
  }

  /**
   * Extract entities from text using NLU pipeline
   */
  private extractEntities(text: string): Entity[] {
    const allEntities: Entity[] = [];
    
    this.entityExtractors.forEach((extractor, type) => {
      const entities = extractor(text);
      allEntities.push(...entities);
    });
    
    return allEntities;
  }

  /**
   * Detect intent from user input (Google ADK intent matching)
   */
  private detectIntent(text: string, entities: Entity[]): Intent {
    let bestIntent: Intent = {
      name: 'default.unknown',
      confidence: 0.1,
      parameters: {}
    };

    this.intentPatterns.forEach((patterns, intentName) => {
      patterns.forEach(pattern => {
        const match = text.match(pattern);
        if (match) {
          const confidence = 0.8 + (entities.length * 0.05); // Higher confidence with more entities
          if (confidence > bestIntent.confidence) {
            bestIntent = {
              name: intentName,
              confidence: Math.min(confidence, 0.95),
              parameters: this.extractParameters(match, entities)
            };
          }
        }
      });
    });

    return bestIntent;
  }

  /**
   * Extract parameters from matched intent
   */
  private extractParameters(match: RegExpMatchArray, entities: Entity[]): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    // Add captured groups from regex
    if (match.length > 1) {
      parameters.captured = match.slice(1);
    }
    
    // Add entities as parameters
    entities.forEach(entity => {
      if (!parameters[entity.type]) {
        parameters[entity.type] = [];
      }
      parameters[entity.type].push(entity.value);
    });
    
    return parameters;
  }

  /**
   * Generate context-aware response (Google ADK conversational flow)
   */
  private generateResponse(session: SessionState, intent: Intent, entities: Entity[], userInput: string): string {
    const context = {
      conversationLength: session.conversationHistory.length,
      lastIntent: session.currentIntent,
      agentId: session.agentId,
      entities: entities,
      userPreferences: session.userPreferences
    };

    switch (intent.name) {
      case 'agent.query':
        return this.generateAgentCapabilitiesResponse(session.agentId, context);
      
      case 'agent.switch':
        const targetAgent = entities.find(e => e.type === 'agent')?.value;
        if (targetAgent) {
          return `Switching to ${targetAgent} agent. How can I help you with ${targetAgent} operations?`;
        }
        return "Which agent would you like to switch to? Available agents: Orchestrator, Graph Query, Vector Search, Documentation, Reasoning, Memory, and Integration.";
      
      case 'system.status':
        return this.generateSystemStatusResponse(context);
      
      case 'data.query':
        return this.generateDataQueryResponse(intent.parameters, context);
      
      case 'voice.control':
        return this.generateVoiceControlResponse(userInput, context);
      
      default:
        return this.generateDefaultResponse(session, userInput, context);
    }
  }

  /**
   * Generate agent capabilities response
   */
  private generateAgentCapabilitiesResponse(agentId: string, context: any): string {
    const capabilities = {
      'orchestrator': 'I coordinate complex multi-agent workflows and can delegate tasks to specialized agents.',
      'graph-query': 'I can query the knowledge graph, traverse relationships, and find connected data.',
      'vector-search': 'I perform semantic searches and similarity matching across your data.',
      'documentation': 'I process and analyze documents, extract entities, and provide insights.',
      'reasoning': 'I perform logical reasoning, pattern detection, and causal analysis.',
      'memory': 'I manage IDE memories, synchronize data, and handle memory operations.',
      'integration': 'I handle API integrations, data transformations, and system connections.'
    };

    const capability = capabilities[agentId as keyof typeof capabilities] || 'I\'m a specialized AI agent ready to help you.';
    
    if (context.conversationLength === 0) {
      return `Hello! I'm the ${agentId} agent. ${capability} What would you like to do today?`;
    } else {
      return `${capability} Is there something specific you'd like me to help you with?`;
    }
  }

  /**
   * Generate system status response
   */
  private generateSystemStatusResponse(context: any): string {
    return "Let me check the system status for you. All core services are operational: Knowledge Graph API, Memory Backend, and Agent Network are healthy. Would you like detailed metrics for any specific component?";
  }

  /**
   * Generate data query response
   */
  private generateDataQueryResponse(parameters: any, context: any): string {
    const systemComponents = parameters.system_component || [];
    if (systemComponents.length > 0) {
      return `I'll query the ${systemComponents.join(', ')} for you. What specific information are you looking for?`;
    }
    return "What data would you like me to query? I can search the knowledge graph, check system metrics, or analyze your memories.";
  }

  /**
   * Generate voice control response
   */
  private generateVoiceControlResponse(userInput: string, context: any): string {
    if (userInput.toLowerCase().includes('enable') || userInput.toLowerCase().includes('on')) {
      return "Voice mode enabled! You can now speak naturally and I'll respond with voice. Try asking me about system status or agent capabilities.";
    } else {
      return "Voice mode disabled. You can still type your questions and I'll respond in text.";
    }
  }

  /**
   * Generate default response with context awareness
   */
  private generateDefaultResponse(session: SessionState, userInput: string, context: any): string {
    const responses = [
      "I understand you're asking about something, but I need a bit more context. Could you be more specific?",
      "That's interesting! Can you tell me more about what you're trying to accomplish?",
      "I'm here to help! Could you rephrase that or give me more details about what you need?",
      `As the ${session.agentId} agent, I'm ready to assist. What specific task can I help you with?`
    ];
    
    return responses[context.conversationLength % responses.length];
  }

  /**
   * Process conversational turn (main Google ADK pipeline)
   */
  public async processConversation(
    sessionId: string,
    userId: string,
    agentId: string,
    userInput: string,
    isVoice: boolean = false
  ): Promise<{
    response: string;
    intent: Intent;
    entities: Entity[];
    context: Record<string, any>;
    sessionState: SessionState;
  }> {
    // Get or create session
    const session = this.getOrCreateSession(sessionId, userId, agentId);
    session.isVoiceActive = isVoice;

    // NLU Pipeline
    const entities = this.extractEntities(userInput);
    const intent = this.detectIntent(userInput, entities);
    
    // Generate context-aware response
    const response = this.generateResponse(session, intent, entities, userInput);
    
    // Create conversation turn
    const conversationTurn: ConversationTurn = {
      id: `turn-${Date.now()}`,
      timestamp: new Date(),
      userInput,
      agentResponse: response,
      entities,
      intent,
      context: {
        isVoice,
        sessionLength: session.conversationHistory.length,
        previousIntent: session.currentIntent
      }
    };

    // Update session state
    session.conversationHistory.push(conversationTurn);
    session.currentIntent = intent.name;
    session.contextVariables = {
      ...session.contextVariables,
      lastEntities: entities,
      lastIntent: intent.name,
      conversationTurns: session.conversationHistory.length
    };

    return {
      response,
      intent,
      entities,
      context: conversationTurn.context,
      sessionState: session
    };
  }

  /**
   * Get session history for context
   */
  public getSessionHistory(sessionId: string): ConversationTurn[] {
    const session = this.sessions.get(sessionId);
    return session?.conversationHistory || [];
  }

  /**
   * Clear session (for agent switching)
   */
  public clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Update user preferences
   */
  public updateUserPreferences(sessionId: string, preferences: Record<string, any>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.userPreferences = { ...session.userPreferences, ...preferences };
    }
  }
}

export const conversationalAI = new ConversationalAI();
