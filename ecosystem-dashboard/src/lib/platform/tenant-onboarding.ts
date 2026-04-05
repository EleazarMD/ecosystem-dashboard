/**
 * Tenant Onboarding Workflow
 * 
 * Handles the complete setup of a new tenant:
 * 1. Create tenant record in PostgreSQL
 * 2. Initialize ChromaDB collections
 * 3. Initialize Neo4j namespace
 * 4. Set up credential storage for integrations
 * 5. Create default workspace
 * 6. Configure agent access
 */

import { Pool } from 'pg';
import { TenantDataService, getTenantDataManager } from './tenant-data-service';
import { TenantChromaDBManager, createTenantChromaDB } from './tenant-chromadb';
import { TenantNeo4jManager, createTenantNeo4j } from './tenant-neo4j';
import { TenantTier, TIER_LIMITS, CreateTenantRequest } from './tenant-types';

// ============================================================
// Types
// ============================================================

export interface OnboardingResult {
  success: boolean;
  tenantId?: string;
  tenantSlug?: string;
  steps: OnboardingStep[];
  error?: string;
}

export interface OnboardingStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
  duration?: number;
}

export interface TenantSetupOptions {
  name: string;
  slug: string;
  ownerEmail: string;
  tier: TenantTier;
  description?: string;
  
  // Optional: skip certain setup steps
  skipChromaDB?: boolean;
  skipNeo4j?: boolean;
  skipWorkspace?: boolean;
}

// ============================================================
// Tenant Onboarding Service
// ============================================================

export class TenantOnboardingService {
  private pool: Pool;
  
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
    });
  }
  
  /**
   * Complete tenant onboarding workflow
   */
  async onboardTenant(options: TenantSetupOptions): Promise<OnboardingResult> {
    const steps: OnboardingStep[] = [
      { name: 'Create tenant record', status: 'pending' },
      { name: 'Initialize ChromaDB collections', status: 'pending' },
      { name: 'Initialize Neo4j namespace', status: 'pending' },
      { name: 'Set up credential storage', status: 'pending' },
      { name: 'Create default workspace', status: 'pending' },
      { name: 'Configure agent access', status: 'pending' },
    ];
    
    let tenantId: string | undefined;
    let tenantSlug: string | undefined;
    
    try {
      // Step 1: Create tenant record
      steps[0].status = 'running';
      const startTime = Date.now();
      
      const tenantResult = await this.createTenantRecord(options);
      tenantId = tenantResult.id;
      tenantSlug = tenantResult.slug;
      
      steps[0].status = 'completed';
      steps[0].duration = Date.now() - startTime;
      steps[0].message = `Tenant ${tenantSlug} created`;
      
      // Get tenant data service
      const dataService = await getTenantDataManager().getService(tenantId);
      
      // Step 2: Initialize ChromaDB collections
      if (!options.skipChromaDB) {
        steps[1].status = 'running';
        const chromaStart = Date.now();
        
        const chromaManager = createTenantChromaDB(dataService);
        await chromaManager.initializeTenantCollections();
        
        steps[1].status = 'completed';
        steps[1].duration = Date.now() - chromaStart;
        steps[1].message = 'ChromaDB collections created';
      } else {
        steps[1].status = 'completed';
        steps[1].message = 'Skipped';
      }
      
      // Step 3: Initialize Neo4j namespace
      if (!options.skipNeo4j) {
        steps[2].status = 'running';
        const neo4jStart = Date.now();
        
        const neo4jManager = createTenantNeo4j(dataService);
        await neo4jManager.initializeTenantNamespace();
        
        steps[2].status = 'completed';
        steps[2].duration = Date.now() - neo4jStart;
        steps[2].message = 'Neo4j namespace initialized';
      } else {
        steps[2].status = 'completed';
        steps[2].message = 'Skipped';
      }
      
      // Step 4: Set up credential storage
      steps[3].status = 'running';
      const credStart = Date.now();
      
      await this.setupCredentialStorage(tenantId);
      
      steps[3].status = 'completed';
      steps[3].duration = Date.now() - credStart;
      steps[3].message = 'Credential tables ready';
      
      // Step 5: Create default workspace
      if (!options.skipWorkspace) {
        steps[4].status = 'running';
        const wsStart = Date.now();
        
        await this.createDefaultWorkspace(tenantId, options.name);
        
        steps[4].status = 'completed';
        steps[4].duration = Date.now() - wsStart;
        steps[4].message = 'Default workspace created';
      } else {
        steps[4].status = 'completed';
        steps[4].message = 'Skipped';
      }
      
      // Step 6: Configure agent access
      steps[5].status = 'running';
      const agentStart = Date.now();
      
      await this.configureAgentAccess(tenantId, options.tier);
      
      steps[5].status = 'completed';
      steps[5].duration = Date.now() - agentStart;
      steps[5].message = 'Agent access configured';
      
      return {
        success: true,
        tenantId,
        tenantSlug,
        steps,
      };
      
    } catch (error) {
      // Mark current step as failed
      const runningStep = steps.find(s => s.status === 'running');
      if (runningStep) {
        runningStep.status = 'failed';
        runningStep.message = error instanceof Error ? error.message : 'Unknown error';
      }
      
      return {
        success: false,
        tenantId,
        tenantSlug,
        steps,
        error: error instanceof Error ? error.message : 'Onboarding failed',
      };
    }
  }
  
  /**
   * Create tenant record in PostgreSQL
   */
  private async createTenantRecord(options: TenantSetupOptions): Promise<{ id: string; slug: string }> {
    const limits = TIER_LIMITS[options.tier];
    
    // Check if owner exists, create if not
    let ownerResult = await this.pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [options.ownerEmail]
    );
    
    let ownerId: string;
    if (ownerResult.rows.length === 0) {
      const newOwner = await this.pool.query(
        `INSERT INTO users (email, name, status)
         VALUES ($1, $2, 'pending')
         RETURNING id`,
        [options.ownerEmail, options.ownerEmail.split('@')[0]]
      );
      ownerId = newOwner.rows[0].id;
    } else {
      ownerId = ownerResult.rows[0].id;
    }
    
    // Create tenant
    const result = await this.pool.query(
      `INSERT INTO tenants (slug, name, description, owner_id, owner_email, tier, status, limits, config)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
       RETURNING id, slug`,
      [
        options.slug,
        options.name,
        options.description || null,
        ownerId,
        options.ownerEmail,
        options.tier,
        JSON.stringify(limits),
        JSON.stringify({
          enabledServices: this.getEnabledServices(options.tier),
          enabledAgents: this.getEnabledAgents(options.tier),
          enabledLLMs: limits.allowedLLMs,
          enabledFeatures: limits.allowedFeatures,
          customSettings: {},
        }),
      ]
    );
    
    // Add owner as tenant admin
    await this.pool.query(
      `INSERT INTO tenant_memberships (tenant_id, user_id, role_id)
       VALUES ($1, $2, 'tenant-admin')`,
      [result.rows[0].id, ownerId]
    );
    
    return {
      id: result.rows[0].id,
      slug: result.rows[0].slug,
    };
  }
  
  /**
   * Set up credential storage tables for integrations
   */
  private async setupCredentialStorage(tenantId: string): Promise<void> {
    // Ensure credential tables exist (they should from schema)
    // Add tenant-specific encryption key reference
    await this.pool.query(
      `INSERT INTO tenant_settings (tenant_id, key, value)
       VALUES ($1, 'encryption_key_id', $2)
       ON CONFLICT (tenant_id, key) DO NOTHING`,
      [tenantId, `tenant_${tenantId.substring(0, 8)}`]
    );
  }
  
  /**
   * Create default workspace for new tenant
   */
  private async createDefaultWorkspace(tenantId: string, tenantName: string): Promise<void> {
    // Create root workspace page
    await this.pool.query(
      `INSERT INTO workspace_pages (tenant_id, title, icon, is_root, created_at)
       VALUES ($1, $2, '🏠', true, NOW())`,
      [tenantId, `${tenantName} Workspace`]
    );
    
    // Create Getting Started page
    await this.pool.query(
      `INSERT INTO workspace_pages (tenant_id, title, icon, content, created_at)
       VALUES ($1, 'Getting Started', '🚀', $2, NOW())`,
      [
        tenantId,
        JSON.stringify({
          blocks: [
            { type: 'heading', content: 'Welcome to your Workspace!' },
            { type: 'paragraph', content: 'This is your personal AI-powered workspace. Here are some things you can do:' },
            { type: 'bullet', content: 'Create pages and organize your thoughts' },
            { type: 'bullet', content: 'Use the AI assistant to help with tasks' },
            { type: 'bullet', content: 'Connect your email and calendar' },
            { type: 'bullet', content: 'Build your personal knowledge base' },
          ],
        }),
      ]
    );
  }
  
  /**
   * Configure agent access based on tier
   */
  private async configureAgentAccess(tenantId: string, tier: TenantTier): Promise<void> {
    const agentConfig = {
      free: {
        gooseMind: false,
        workspaceAI: true,
        pageAgent: true,
        voiceEnabled: false,
      },
      basic: {
        gooseMind: true,
        workspaceAI: true,
        pageAgent: true,
        voiceEnabled: true,
      },
      premium: {
        gooseMind: true,
        workspaceAI: true,
        pageAgent: true,
        voiceEnabled: true,
        customAgents: true,
      },
    };
    
    await this.pool.query(
      `UPDATE tenants 
       SET config = jsonb_set(config, '{agentAccess}', $2::jsonb)
       WHERE id = $1`,
      [tenantId, JSON.stringify(agentConfig[tier])]
    );
  }
  
  /**
   * Get enabled services based on tier
   */
  private getEnabledServices(tier: TenantTier): string[] {
    const services: Record<TenantTier, string[]> = {
      free: ['workspace', 'ai-chat'],
      basic: ['workspace', 'ai-chat', 'email-sync', 'calendar-sync', 'voice', 'exomind-ios'],
      premium: ['workspace', 'ai-chat', 'email-sync', 'calendar-sync', 'voice', 'exomind-ios', 'knowledge-graph', 'research-lab', 'podcast-studio', 'openclaw'],
    };
    return services[tier];
  }
  
  /**
   * Get enabled agents based on tier
   */
  private getEnabledAgents(tier: TenantTier): string[] {
    const agents: Record<TenantTier, string[]> = {
      free: ['workspace-ai', 'page-agent'],
      basic: ['workspace-ai', 'page-agent', 'goose-mind'],
      premium: ['workspace-ai', 'page-agent', 'goose-mind', 'dashboard-ai', 'openclaw-agent'],
    };
    return agents[tier];
  }
  
  /**
   * Clean up a tenant (for archival or deletion)
   */
  async cleanupTenant(tenantId: string): Promise<void> {
    const dataService = await getTenantDataManager().getService(tenantId);
    
    // Clean up ChromaDB
    const chromaManager = createTenantChromaDB(dataService);
    await chromaManager.deleteTenantCollections();
    
    // Clean up Neo4j
    const neo4jManager = createTenantNeo4j(dataService);
    await neo4jManager.cleanupTenantNamespace();
    
    // Mark tenant as archived in PostgreSQL
    await this.pool.query(
      `UPDATE tenants SET status = 'archived' WHERE id = $1`,
      [tenantId]
    );
    
    // Clear cache
    getTenantDataManager().clearCache(tenantId);
  }
}

// ============================================================
// Additional Schema for Tenant Settings
// ============================================================

export const TENANT_SETTINGS_SCHEMA = `
-- Tenant settings key-value store
CREATE TABLE IF NOT EXISTS tenant_settings (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON tenant_settings(tenant_id);

-- Workspace pages with tenant isolation
CREATE TABLE IF NOT EXISTS workspace_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES workspace_pages(id),
    title VARCHAR(500) NOT NULL,
    icon VARCHAR(50),
    cover_image TEXT,
    content JSONB DEFAULT '{}',
    is_root BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_pages_tenant ON workspace_pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspace_pages_parent ON workspace_pages(parent_id);

-- Calendar credentials with encryption
CREATE TABLE IF NOT EXISTS calendar_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'apple', 'google', 'microsoft'
    encrypted_credentials TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_calendar_creds_tenant ON calendar_credentials(tenant_id);

-- Email credentials with encryption
CREATE TABLE IF NOT EXISTS email_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'apple', 'google', 'microsoft'
    email_address VARCHAR(255) NOT NULL,
    encrypted_credentials TEXT NOT NULL,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, email_address)
);

CREATE INDEX IF NOT EXISTS idx_email_creds_tenant ON email_credentials(tenant_id);
`;

// ============================================================
// Factory
// ============================================================

let onboardingService: TenantOnboardingService | null = null;

export function getTenantOnboardingService(): TenantOnboardingService {
  if (!onboardingService) {
    onboardingService = new TenantOnboardingService();
  }
  return onboardingService;
}
