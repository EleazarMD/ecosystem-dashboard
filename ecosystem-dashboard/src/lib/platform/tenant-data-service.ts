/**
 * Tenant Data Service
 * 
 * Manages tenant-scoped data access across all data stores:
 * - ChromaDB (vector embeddings)
 * - Neo4j (knowledge graph)
 * - PostgreSQL (relational data)
 * 
 * Implements namespace isolation with future migration path to full isolation.
 */

import { Pool } from 'pg';

// ============================================================
// Types
// ============================================================

export interface TenantDataConfig {
  tenantId: string;
  tenantSlug: string;
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  
  // Data store endpoints (can be overridden for full isolation)
  chromaDbUrl?: string;
  neo4jUrl?: string;
  postgresUrl?: string;
}

export interface TenantCollections {
  // Knowledge Base
  kbFacts: string;
  kbMemories: string;
  kbConversations: string;
  
  // Email
  emailEmbeddings: string;
  emailAttachments: string;
  
  // Workspace
  workspacePages: string;
  workspaceBlocks: string;
}

export interface TenantNeo4jLabels {
  // Core entities
  Person: string;
  Organization: string;
  
  // Email entities
  Email: string;
  EmailThread: string;
  Topic: string;
  Sentiment: string;
  
  // Calendar entities
  Event: string;
  Calendar: string;
  
  // Knowledge entities
  Fact: string;
  Memory: string;
  Concept: string;
}

export interface TenantDatabaseTables {
  // Workspace
  workspacePages: string;
  workspaceBlocks: string;
  workspaceDatabases: string;
  
  // Calendar
  calendarEvents: string;
  calendarCredentials: string;
  
  // Email
  emailMessages: string;
  emailCredentials: string;
  
  // KB
  kbFacts: string;
  kbApprovals: string;
}

// ============================================================
// Tenant Data Service
// ============================================================

export class TenantDataService {
  private config: TenantDataConfig;
  
  constructor(config: TenantDataConfig) {
    this.config = config;
  }
  
  // --------------------------------------------------------
  // Namespace Generation
  // --------------------------------------------------------
  
  /**
   * Get tenant-prefixed ChromaDB collection names
   */
  getCollections(): TenantCollections {
    const prefix = this.config.tenantSlug;
    return {
      kbFacts: `${prefix}_kb_facts`,
      kbMemories: `${prefix}_kb_memories`,
      kbConversations: `${prefix}_kb_conversations`,
      emailEmbeddings: `${prefix}_email_embeddings`,
      emailAttachments: `${prefix}_email_attachments`,
      workspacePages: `${prefix}_workspace_pages`,
      workspaceBlocks: `${prefix}_workspace_blocks`,
    };
  }
  
  /**
   * Get tenant-prefixed Neo4j labels
   */
  getNeo4jLabels(): TenantNeo4jLabels {
    const prefix = this.config.tenantSlug;
    return {
      Person: `${prefix}_Person`,
      Organization: `${prefix}_Organization`,
      Email: `${prefix}_Email`,
      EmailThread: `${prefix}_EmailThread`,
      Topic: `${prefix}_Topic`,
      Sentiment: `${prefix}_Sentiment`,
      Event: `${prefix}_Event`,
      Calendar: `${prefix}_Calendar`,
      Fact: `${prefix}_Fact`,
      Memory: `${prefix}_Memory`,
      Concept: `${prefix}_Concept`,
    };
  }
  
  /**
   * Get database table references with tenant_id filtering
   */
  getDatabaseTables(): TenantDatabaseTables {
    // Tables use tenant_id FK rather than prefixes
    return {
      workspacePages: 'workspace.pages',
      workspaceBlocks: 'workspace.blocks',
      workspaceDatabases: 'workspace.databases',
      calendarEvents: 'calendar.events',
      calendarCredentials: 'calendar.credentials',
      emailMessages: 'email.messages',
      emailCredentials: 'email.credentials',
      kbFacts: 'knowledge.facts',
      kbApprovals: 'knowledge.approvals',
    };
  }
  
  // --------------------------------------------------------
  // Data Store URLs (for full isolation support)
  // --------------------------------------------------------
  
  getChromaDbUrl(): string {
    return this.config.chromaDbUrl || 'http://100.108.41.22:8000';
  }
  
  getNeo4jUrl(): string {
    return this.config.neo4jUrl || 'bolt://100.108.41.22:7687';
  }
  
  getPostgresUrl(): string {
    return this.config.postgresUrl || 'postgresql://eleazar@localhost/ecosystem_unified';
  }
  
  // --------------------------------------------------------
  // Tenant Context for Queries
  // --------------------------------------------------------
  
  /**
   * Get tenant context for injecting into queries
   */
  getTenantContext() {
    return {
      tenantId: this.config.tenantId,
      tenantSlug: this.config.tenantSlug,
      tier: this.config.tier,
      collections: this.getCollections(),
      labels: this.getNeo4jLabels(),
      tables: this.getDatabaseTables(),
      urls: {
        chromaDb: this.getChromaDbUrl(),
        neo4j: this.getNeo4jUrl(),
        postgres: this.getPostgresUrl(),
      },
    };
  }
  
  // --------------------------------------------------------
  // SQL Query Helpers
  // --------------------------------------------------------
  
  /**
   * Add tenant filter to a SQL query
   */
  addTenantFilter(baseQuery: string, alias?: string): string {
    const col = alias ? `${alias}.tenant_id` : 'tenant_id';
    if (baseQuery.toLowerCase().includes('where')) {
      return `${baseQuery} AND ${col} = '${this.config.tenantId}'`;
    }
    return `${baseQuery} WHERE ${col} = '${this.config.tenantId}'`;
  }
  
  /**
   * Get tenant ID for INSERT statements
   */
  getTenantIdForInsert(): string {
    return this.config.tenantId;
  }
}

// ============================================================
// Tenant Data Manager (Singleton)
// ============================================================

export class TenantDataManager {
  private static instance: TenantDataManager;
  private services: Map<string, TenantDataService> = new Map();
  private pool: Pool;
  
  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
    });
  }
  
  static getInstance(): TenantDataManager {
    if (!TenantDataManager.instance) {
      TenantDataManager.instance = new TenantDataManager();
    }
    return TenantDataManager.instance;
  }
  
  /**
   * Get or create TenantDataService for a tenant
   */
  async getService(tenantId: string): Promise<TenantDataService> {
    if (this.services.has(tenantId)) {
      return this.services.get(tenantId)!;
    }
    
    // Load tenant config from database
    const result = await this.pool.query(
      `SELECT id, slug, tier, config FROM tenants WHERE id = $1`,
      [tenantId]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }
    
    const tenant = result.rows[0];
    const config: TenantDataConfig = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tier: tenant.tier,
      // Override URLs from tenant config if using full isolation
      chromaDbUrl: tenant.config?.dataStores?.chromaDb,
      neo4jUrl: tenant.config?.dataStores?.neo4j,
      postgresUrl: tenant.config?.dataStores?.postgres,
    };
    
    const service = new TenantDataService(config);
    this.services.set(tenantId, service);
    return service;
  }
  
  /**
   * Get service by tenant slug
   */
  async getServiceBySlug(slug: string): Promise<TenantDataService> {
    // Check cache first
    const cachedServices = Array.from(this.services.entries());
    for (const [_, service] of cachedServices) {
      if (service.getTenantContext().tenantSlug === slug) {
        return service;
      }
    }
    
    // Load from database
    const result = await this.pool.query(
      `SELECT id FROM tenants WHERE slug = $1`,
      [slug]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`Tenant not found: ${slug}`);
    }
    
    return this.getService(result.rows[0].id);
  }
  
  /**
   * Clear cached service (for config updates)
   */
  clearCache(tenantId?: string) {
    if (tenantId) {
      this.services.delete(tenantId);
    } else {
      this.services.clear();
    }
  }
}

// ============================================================
// Export singleton accessor
// ============================================================

export function getTenantDataManager(): TenantDataManager {
  return TenantDataManager.getInstance();
}
