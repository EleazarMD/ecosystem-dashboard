/**
 * Tenant ChromaDB Manager
 * 
 * Manages tenant-scoped ChromaDB collections for:
 * - Knowledge Base (facts, memories, conversations)
 * - Email embeddings
 * - Workspace content
 */

import { TenantDataService, TenantCollections } from './tenant-data-service';

// ============================================================
// Types
// ============================================================

export interface ChromaCollection {
  name: string;
  metadata?: Record<string, any>;
}

export interface ChromaDocument {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export interface ChromaQueryResult {
  ids: string[];
  documents: string[];
  metadatas: Record<string, any>[];
  distances?: number[];
}

// ============================================================
// Tenant ChromaDB Manager
// ============================================================

export class TenantChromaDBManager {
  private tenantService: TenantDataService;
  private baseUrl: string;
  
  constructor(tenantService: TenantDataService) {
    this.tenantService = tenantService;
    this.baseUrl = tenantService.getTenantContext().urls.chromaDb;
  }
  
  // --------------------------------------------------------
  // Collection Management
  // --------------------------------------------------------
  
  /**
   * Get all collection names for this tenant
   */
  getCollectionNames(): TenantCollections {
    return this.tenantService.getCollections();
  }
  
  /**
   * Create all required collections for a new tenant
   */
  async initializeTenantCollections(): Promise<void> {
    const collections = this.getCollectionNames();
    
    for (const [key, name] of Object.entries(collections)) {
      await this.createCollection(name, {
        tenant: this.tenantService.getTenantContext().tenantSlug,
        type: key,
        created: new Date().toISOString(),
      });
    }
  }
  
  /**
   * Create a single collection
   */
  async createCollection(name: string, metadata?: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          metadata: {
            ...metadata,
            tenant_id: this.tenantService.getTenantContext().tenantId,
          },
        }),
      });
      
      if (response.status === 409) {
        // Collection already exists
        return true;
      }
      
      return response.ok;
    } catch (error) {
      console.error(`[TenantChromaDB] Failed to create collection ${name}:`, error);
      return false;
    }
  }
  
  /**
   * Delete all collections for a tenant (for cleanup/archival)
   */
  async deleteTenantCollections(): Promise<void> {
    const collections = this.getCollectionNames();
    
    for (const name of Object.values(collections)) {
      await this.deleteCollection(name);
    }
  }
  
  /**
   * Delete a single collection
   */
  async deleteCollection(name: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/collections/${name}`, {
        method: 'DELETE',
      });
      return response.ok || response.status === 404;
    } catch (error) {
      console.error(`[TenantChromaDB] Failed to delete collection ${name}:`, error);
      return false;
    }
  }
  
  // --------------------------------------------------------
  // Knowledge Base Operations
  // --------------------------------------------------------
  
  /**
   * Add a fact to the KB
   */
  async addKBFact(fact: {
    id: string;
    content: string;
    source?: string;
    category?: string;
    confidence?: number;
  }): Promise<boolean> {
    const collections = this.getCollectionNames();
    return this.addDocument(collections.kbFacts, {
      id: fact.id,
      content: fact.content,
      metadata: {
        source: fact.source || 'manual',
        category: fact.category || 'general',
        confidence: fact.confidence || 1.0,
        created: new Date().toISOString(),
      },
    });
  }
  
  /**
   * Add a memory/conversation summary
   */
  async addKBMemory(memory: {
    id: string;
    content: string;
    conversationId?: string;
    summary?: string;
  }): Promise<boolean> {
    const collections = this.getCollectionNames();
    return this.addDocument(collections.kbMemories, {
      id: memory.id,
      content: memory.content,
      metadata: {
        conversationId: memory.conversationId,
        summary: memory.summary,
        created: new Date().toISOString(),
      },
    });
  }
  
  /**
   * Query KB for relevant facts
   */
  async queryKB(query: string, limit: number = 10): Promise<ChromaQueryResult> {
    const collections = this.getCollectionNames();
    
    // Query both facts and memories
    const [facts, memories] = await Promise.all([
      this.queryCollection(collections.kbFacts, query, limit),
      this.queryCollection(collections.kbMemories, query, limit),
    ]);
    
    // Merge and sort by distance
    return this.mergeResults([facts, memories], limit);
  }
  
  // --------------------------------------------------------
  // Email Operations
  // --------------------------------------------------------
  
  /**
   * Add email embedding
   */
  async addEmailEmbedding(email: {
    id: string;
    content: string;
    subject?: string;
    from?: string;
    to?: string[];
    date?: string;
  }): Promise<boolean> {
    const collections = this.getCollectionNames();
    return this.addDocument(collections.emailEmbeddings, {
      id: email.id,
      content: email.content,
      metadata: {
        subject: email.subject,
        from: email.from,
        to: email.to?.join(','),
        date: email.date,
      },
    });
  }
  
  /**
   * Search emails semantically
   */
  async searchEmails(query: string, limit: number = 10): Promise<ChromaQueryResult> {
    const collections = this.getCollectionNames();
    return this.queryCollection(collections.emailEmbeddings, query, limit);
  }
  
  // --------------------------------------------------------
  // Generic Operations
  // --------------------------------------------------------
  
  /**
   * Add document to a collection
   */
  async addDocument(collectionName: string, doc: ChromaDocument): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/collections/${collectionName}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [doc.id],
          documents: [doc.content],
          metadatas: [doc.metadata || {}],
        }),
      });
      return response.ok;
    } catch (error) {
      console.error(`[TenantChromaDB] Failed to add document:`, error);
      return false;
    }
  }
  
  /**
   * Query a collection
   */
  async queryCollection(
    collectionName: string,
    query: string,
    limit: number = 10
  ): Promise<ChromaQueryResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/collections/${collectionName}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_texts: [query],
          n_results: limit,
        }),
      });
      
      if (!response.ok) {
        return { ids: [], documents: [], metadatas: [] };
      }
      
      const data = await response.json();
      return {
        ids: data.ids?.[0] || [],
        documents: data.documents?.[0] || [],
        metadatas: data.metadatas?.[0] || [],
        distances: data.distances?.[0],
      };
    } catch (error) {
      console.error(`[TenantChromaDB] Query failed:`, error);
      return { ids: [], documents: [], metadatas: [] };
    }
  }
  
  /**
   * Merge multiple query results
   */
  private mergeResults(results: ChromaQueryResult[], limit: number): ChromaQueryResult {
    const combined: Array<{
      id: string;
      document: string;
      metadata: Record<string, any>;
      distance: number;
    }> = [];
    
    for (const result of results) {
      for (let i = 0; i < result.ids.length; i++) {
        combined.push({
          id: result.ids[i],
          document: result.documents[i],
          metadata: result.metadatas[i],
          distance: result.distances?.[i] || 0,
        });
      }
    }
    
    // Sort by distance (lower is better)
    combined.sort((a, b) => a.distance - b.distance);
    const top = combined.slice(0, limit);
    
    return {
      ids: top.map(x => x.id),
      documents: top.map(x => x.document),
      metadatas: top.map(x => x.metadata),
      distances: top.map(x => x.distance),
    };
  }
  
  /**
   * Get collection stats
   */
  async getCollectionStats(): Promise<Record<string, number>> {
    const collections = this.getCollectionNames();
    const stats: Record<string, number> = {};
    
    for (const [key, name] of Object.entries(collections)) {
      try {
        const response = await fetch(`${this.baseUrl}/api/v1/collections/${name}`);
        if (response.ok) {
          const data = await response.json();
          stats[key] = data.count || 0;
        } else {
          stats[key] = 0;
        }
      } catch {
        stats[key] = 0;
      }
    }
    
    return stats;
  }
}

// ============================================================
// Factory
// ============================================================

export function createTenantChromaDB(tenantService: TenantDataService): TenantChromaDBManager {
  return new TenantChromaDBManager(tenantService);
}
