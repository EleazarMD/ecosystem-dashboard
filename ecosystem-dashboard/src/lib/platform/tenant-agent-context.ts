/**
 * Tenant Agent Context
 * 
 * Provides tenant-aware context for GooseMind and other agents.
 * Routes agent requests to tenant-specific data stores:
 * - Knowledge Base (ChromaDB)
 * - Knowledge Graph (Neo4j)
 * - Workspace (PostgreSQL)
 * - Email/Calendar (credentials + data)
 */

import { TenantDataService, getTenantDataManager } from './tenant-data-service';
import { TenantChromaDBManager, createTenantChromaDB } from './tenant-chromadb';
import { TenantNeo4jManager, createTenantNeo4j } from './tenant-neo4j';

// ============================================================
// Types
// ============================================================

export interface AgentContext {
  tenantId: string;
  tenantSlug: string;
  userId?: string;
  sessionId?: string;
  
  // Feature access
  features: {
    voiceEnabled: boolean;
    kbEnabled: boolean;
    emailEnabled: boolean;
    calendarEnabled: boolean;
    workspaceEnabled: boolean;
  };
  
  // LLM configuration
  llm: {
    defaultModel: string;
    allowedModels: string[];
    maxTokens: number;
  };
  
  // Data access
  dataAccess: {
    chromaDb: TenantChromaDBManager;
    neo4j: TenantNeo4jManager;
    dataService: TenantDataService;
  };
}

export interface KnowledgeHubQuery {
  query: string;
  sources?: ('kb' | 'email' | 'calendar' | 'workspace')[];
  limit?: number;
  includeMetadata?: boolean;
}

export interface KnowledgeHubResult {
  results: Array<{
    source: string;
    content: string;
    relevance: number;
    metadata?: Record<string, any>;
  }>;
  totalResults: number;
  queryTime: number;
}

// ============================================================
// Tenant Agent Context Builder
// ============================================================

export class TenantAgentContextBuilder {
  private tenantId: string;
  private userId?: string;
  private sessionId?: string;
  
  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }
  
  withUser(userId: string): this {
    this.userId = userId;
    return this;
  }
  
  withSession(sessionId: string): this {
    this.sessionId = sessionId;
    return this;
  }
  
  async build(): Promise<AgentContext> {
    const dataManager = getTenantDataManager();
    const dataService = await dataManager.getService(this.tenantId);
    const context = dataService.getTenantContext();
    
    // Get tenant config for feature access
    const tenantConfig = await this.getTenantConfig();
    
    return {
      tenantId: this.tenantId,
      tenantSlug: context.tenantSlug,
      userId: this.userId,
      sessionId: this.sessionId,
      
      features: {
        voiceEnabled: tenantConfig.agentAccess?.voiceEnabled ?? false,
        kbEnabled: tenantConfig.enabledFeatures?.includes('knowledge-base') ?? 
                   tenantConfig.enabledFeatures?.includes('*') ?? true,
        emailEnabled: tenantConfig.enabledServices?.includes('email-sync') ??
                      tenantConfig.enabledServices?.includes('*') ?? false,
        calendarEnabled: tenantConfig.enabledServices?.includes('calendar-sync') ??
                         tenantConfig.enabledServices?.includes('*') ?? false,
        workspaceEnabled: tenantConfig.enabledFeatures?.includes('workspace') ??
                          tenantConfig.enabledFeatures?.includes('*') ?? true,
      },
      
      llm: {
        defaultModel: tenantConfig.defaultLLM || 'ministral-14b',
        allowedModels: tenantConfig.enabledLLMs || ['ministral-14b'],
        maxTokens: tenantConfig.limits?.maxTokensPerMonth || 100000,
      },
      
      dataAccess: {
        chromaDb: createTenantChromaDB(dataService),
        neo4j: createTenantNeo4j(dataService),
        dataService,
      },
    };
  }
  
  private async getTenantConfig(): Promise<any> {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
    });
    
    const result = await pool.query(
      `SELECT config, limits FROM tenants WHERE id = $1`,
      [this.tenantId]
    );
    
    if (result.rows.length === 0) {
      return {};
    }
    
    return {
      ...result.rows[0].config,
      limits: result.rows[0].limits,
    };
  }
}

// ============================================================
// Knowledge Hub - Unified Query Interface
// ============================================================

export class TenantKnowledgeHub {
  private context: AgentContext;
  
  constructor(context: AgentContext) {
    this.context = context;
  }
  
  /**
   * Query all knowledge sources for a tenant
   */
  async query(request: KnowledgeHubQuery): Promise<KnowledgeHubResult> {
    const startTime = Date.now();
    const sources = request.sources || ['kb', 'email', 'calendar', 'workspace'];
    const limit = request.limit || 10;
    
    const results: KnowledgeHubResult['results'] = [];
    
    // Query each enabled source
    const queries = sources.map(async (source) => {
      switch (source) {
        case 'kb':
          if (this.context.features.kbEnabled) {
            return this.queryKnowledgeBase(request.query, limit);
          }
          break;
        case 'email':
          if (this.context.features.emailEnabled) {
            return this.queryEmailGraph(request.query, limit);
          }
          break;
        case 'calendar':
          if (this.context.features.calendarEnabled) {
            return this.queryCalendar(request.query, limit);
          }
          break;
        case 'workspace':
          if (this.context.features.workspaceEnabled) {
            return this.queryWorkspace(request.query, limit);
          }
          break;
      }
      return [];
    });
    
    const queryResults = await Promise.all(queries);
    
    // Flatten and sort by relevance
    for (const resultSet of queryResults) {
      if (resultSet) {
        results.push(...resultSet);
      }
    }
    
    results.sort((a, b) => b.relevance - a.relevance);
    const topResults = results.slice(0, limit);
    
    return {
      results: topResults,
      totalResults: results.length,
      queryTime: Date.now() - startTime,
    };
  }
  
  /**
   * Query Knowledge Base (ChromaDB)
   */
  private async queryKnowledgeBase(query: string, limit: number): Promise<KnowledgeHubResult['results']> {
    const chromaResult = await this.context.dataAccess.chromaDb.queryKB(query, limit);
    
    return chromaResult.ids.map((id, i) => ({
      source: 'kb',
      content: chromaResult.documents[i],
      relevance: chromaResult.distances ? 1 - chromaResult.distances[i] : 0.5,
      metadata: chromaResult.metadatas[i],
    }));
  }
  
  /**
   * Query Email Graph (Neo4j + ChromaDB)
   */
  private async queryEmailGraph(query: string, limit: number): Promise<KnowledgeHubResult['results']> {
    // Search email embeddings
    const chromaResult = await this.context.dataAccess.chromaDb.searchEmails(query, limit);
    
    return chromaResult.ids.map((id, i) => ({
      source: 'email',
      content: chromaResult.documents[i],
      relevance: chromaResult.distances ? 1 - chromaResult.distances[i] : 0.5,
      metadata: {
        ...chromaResult.metadatas[i],
        emailId: id,
      },
    }));
  }
  
  /**
   * Query Calendar Events
   */
  private async queryCalendar(query: string, limit: number): Promise<KnowledgeHubResult['results']> {
    // Query calendar events from Neo4j
    const labels = this.context.dataAccess.dataService.getNeo4jLabels();
    
    // For now, return empty - calendar integration to be implemented
    return [];
  }
  
  /**
   * Query Workspace Content
   */
  private async queryWorkspace(query: string, limit: number): Promise<KnowledgeHubResult['results']> {
    // Query workspace embeddings
    const collections = this.context.dataAccess.dataService.getCollections();
    const chromaResult = await this.context.dataAccess.chromaDb.queryCollection(
      collections.workspacePages,
      query,
      limit
    );
    
    return chromaResult.ids.map((id, i) => ({
      source: 'workspace',
      content: chromaResult.documents[i],
      relevance: chromaResult.distances ? 1 - chromaResult.distances[i] : 0.5,
      metadata: chromaResult.metadatas[i],
    }));
  }
  
  /**
   * Add fact to KB
   */
  async learnFact(content: string, options?: {
    category?: string;
    source?: string;
    requiresApproval?: boolean;
  }): Promise<{ success: boolean; factId?: string }> {
    if (!this.context.features.kbEnabled) {
      return { success: false };
    }
    
    const factId = `fact_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Add to ChromaDB
    const chromaSuccess = await this.context.dataAccess.chromaDb.addKBFact({
      id: factId,
      content,
      category: options?.category,
      source: options?.source || 'agent',
    });
    
    // Add to Neo4j
    const neo4jSuccess = await this.context.dataAccess.neo4j.addFact({
      id: factId,
      content,
      category: options?.category,
      source: options?.source || 'agent',
    });
    
    return {
      success: chromaSuccess && neo4jSuccess,
      factId,
    };
  }
  
  /**
   * Get KB statistics
   */
  async getStats(): Promise<{
    kbFacts: number;
    kbMemories: number;
    emails: number;
    contacts: number;
    events: number;
  }> {
    const [chromaStats, neo4jStats] = await Promise.all([
      this.context.dataAccess.chromaDb.getCollectionStats(),
      this.context.dataAccess.neo4j.getGraphStats(),
    ]);
    
    return {
      kbFacts: chromaStats.kbFacts || 0,
      kbMemories: chromaStats.kbMemories || 0,
      emails: neo4jStats.Email || 0,
      contacts: neo4jStats.Person || 0,
      events: neo4jStats.Event || 0,
    };
  }
}

// ============================================================
// GooseMind Integration
// ============================================================

export interface GooseMindTenantConfig {
  tenantId: string;
  tenantSlug: string;
  
  // Agent settings
  model: string;
  voiceEnabled: boolean;
  
  // Data access
  knowledgeHub: TenantKnowledgeHub;
  
  // Tool configuration
  enabledTools: string[];
  
  // System prompt additions
  tenantContext: string;
}

/**
 * Create GooseMind configuration for a tenant
 */
export async function createGooseMindTenantConfig(
  tenantId: string,
  userId?: string
): Promise<GooseMindTenantConfig> {
  const builder = new TenantAgentContextBuilder(tenantId);
  if (userId) {
    builder.withUser(userId);
  }
  
  const context = await builder.build();
  const knowledgeHub = new TenantKnowledgeHub(context);
  
  // Build enabled tools based on features
  const enabledTools: string[] = ['search_kb', 'learn_fact'];
  
  if (context.features.emailEnabled) {
    enabledTools.push('search_emails', 'get_contact_info');
  }
  
  if (context.features.calendarEnabled) {
    enabledTools.push('get_events', 'create_event', 'check_availability');
  }
  
  if (context.features.workspaceEnabled) {
    enabledTools.push('search_workspace', 'create_page', 'update_page');
  }
  
  // Build tenant context for system prompt
  const stats = await knowledgeHub.getStats();
  const tenantContext = `
You are assisting a user in the "${context.tenantSlug}" workspace.
Available knowledge: ${stats.kbFacts} facts, ${stats.kbMemories} memories
Email access: ${context.features.emailEnabled ? `${stats.emails} emails, ${stats.contacts} contacts` : 'disabled'}
Calendar access: ${context.features.calendarEnabled ? `${stats.events} events` : 'disabled'}
Workspace access: ${context.features.workspaceEnabled ? 'enabled' : 'disabled'}
`.trim();
  
  return {
    tenantId: context.tenantId,
    tenantSlug: context.tenantSlug,
    model: context.llm.defaultModel,
    voiceEnabled: context.features.voiceEnabled,
    knowledgeHub,
    enabledTools,
    tenantContext,
  };
}

// ============================================================
// Factory Functions
// ============================================================

export function createAgentContext(tenantId: string): TenantAgentContextBuilder {
  return new TenantAgentContextBuilder(tenantId);
}

export function createKnowledgeHub(context: AgentContext): TenantKnowledgeHub {
  return new TenantKnowledgeHub(context);
}
