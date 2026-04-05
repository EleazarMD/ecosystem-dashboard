/**
 * IDE Memory Tool - Real persistence backend for IDE memory operations
 * Connects to actual memory storage service for persistent context
 */

import { Tool, ToolContext } from '../ADKAgent';
import { KGMCPClient } from '../../lib/kg-mcp-client';

export interface IDEMemoryEntry {
  id: string;
  type: 'architectural' | 'contextual' | 'preference' | 'session' | 'project';
  content: Record<string, any>;
  tags: string[];
  importance: number;
  timestamp: Date;
  project_id?: string;
  session_id?: string;
}

export interface IDEMemoryQuery {
  type?: string;
  tags?: string[];
  project_id?: string;
  session_id?: string;
  importance_threshold?: number;
  limit?: number;
  search_text?: string;
}

export class IDEMemoryTool implements Tool {
  public name = 'ide_memory';
  public description = 'Query and manage IDE memories, memory entries, memory data, and memory statistics. Use for questions about memories, memory count, memory creation, memory history, IDE context, preferences, and architectural decisions. Supports time-based filtering for recent memories.';
  
  public input_schema = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'query', 'update', 'delete', 'sync'],
        description: 'Memory operation to perform'
      },
      memory_entry: {
        type: 'object',
        description: 'Memory entry for create/update operations'
      },
      query: {
        type: 'object',
        description: 'Query parameters for search operations'
      },
      memory_id: {
        type: 'string',
        description: 'Memory ID for update/delete operations'
      }
    },
    required: ['action']
  };

  public output_schema = {
    type: 'object',
    properties: {
      status: { type: 'string' },
      data: { type: 'array' },
      message: { type: 'string' },
      memory_count: { type: 'number' }
    }
  };

  private kgClient: KGMCPClient;
  private readonly MEMORY_COLLECTION = 'ide_memories';

  constructor() {
    try {
      this.kgClient = new KGMCPClient();
    } catch (error: any) {
      console.warn('[IDEMemoryTool] KG client unavailable, using fallback storage');
      // Fallback to local storage for development
      this.kgClient = null as any;
    }
  }

  public async execute(context: ToolContext, parameters: Record<string, any>): Promise<any> {
    const { action, memory_entry, query, memory_id } = parameters;
    const startTime = Date.now();

    try {
      let result;
      
      switch (action) {
        case 'create':
          result = await this.createMemory(memory_entry, context);
          break;
        
        case 'query':
          result = await this.queryMemories(query || {}, context);
          break;
        
        case 'update':
          result = await this.updateMemory(memory_id, memory_entry, context);
          break;
        
        case 'delete':
          result = await this.deleteMemory(memory_id, context);
          break;
        
        case 'sync':
          result = await this.syncWithKnowledgeGraph(context);
          break;
        
        default:
          throw new Error(`Unknown IDE Memory action: ${action}`);
      }

      return {
        ...result,
        execution_time: Date.now() - startTime
      };

    } catch (error: any) {
      console.error(`[IDEMemoryTool] ${action} failed:`, error);
      
      return {
        status: 'error',
        message: `IDE Memory operation failed: ${error.message}`,
        data: [],
        memory_count: 0,
        execution_time: Date.now() - startTime
      };
    }
  }

  private async createMemory(entry: Partial<IDEMemoryEntry>, context: ToolContext): Promise<any> {
    const memory: IDEMemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: entry.type || 'contextual',
      content: entry.content || {},
      tags: entry.tags || [],
      importance: entry.importance || 0.5,
      timestamp: new Date(),
      project_id: entry.project_id || context.agentName,
      session_id: entry.session_id || context.sessionId,
      ...entry
    };

    try {
      if (this.kgClient) {
        // Store in Knowledge Graph as a memory entity
        await this.kgClient.executeTool('create_entity', {
          type: 'ide_memory',
          properties: {
            memory_id: memory.id,
            memory_type: memory.type,
            content: JSON.stringify(memory.content),
            tags: memory.tags,
            importance: memory.importance,
            project_id: memory.project_id,
            session_id: memory.session_id,
            created_at: memory.timestamp.toISOString(),
            agent_source: context.agentName
          }
        });
      }
      
      // Also store in browser localStorage as backup
      this.storeInLocalStorage(memory);
      
      const totalCount = await this.getMemoryCount();
      
      return {
        status: 'success',
        message: `Memory created with ID: ${memory.id}`,
        data: [memory],
        memory_count: totalCount
      };
      
    } catch (error: any) {
      // Fallback to local storage only
      this.storeInLocalStorage(memory);
      
      return {
        status: 'success',
        message: `Memory created locally with ID: ${memory.id} (KG storage failed)`,
        data: [memory],
        memory_count: await this.getMemoryCount(),
        warning: `Knowledge Graph storage failed: ${error.message}`
      };
    }
  }

  private async queryMemories(query: IDEMemoryQuery, context: ToolContext): Promise<any> {
    try {
      let results: IDEMemoryEntry[] = [];
      
      if (this.kgClient) {
        // Query from Knowledge Graph
        const kgQuery = this.buildKGQuery(query);
        const kgResult = await this.kgClient.queryKnowledgeGraph(kgQuery, {
          output_format: 'json',
          limit: query.limit || 50
        });
        
        if (kgResult && kgResult.data) {
          results = kgResult.data.map((entity: any) => this.parseKGEntity(entity));
        }
      }
      
      // Fallback to local storage if KG query fails or returns no results
      if (results.length === 0) {
        results = this.queryLocalStorage(query);
      }
      
      // Apply additional filtering
      results = this.applyQueryFilters(results, query);
      
      // Sort by importance and timestamp
      results.sort((a, b) => {
        if (a.importance !== b.importance) {
          return b.importance - a.importance;
        }
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
      
      // Apply limit
      if (query.limit) {
        results = results.slice(0, query.limit);
      }
      
      const totalCount = await this.getMemoryCount();
      
      return {
        status: 'success',
        message: `Found ${results.length} memories`,
        data: results,
        memory_count: totalCount
      };
      
    } catch (error: any) {
      // Fallback to local storage
      const localResults = this.queryLocalStorage(query);
      
      return {
        status: 'success',
        message: `Found ${localResults.length} memories (local storage)`,
        data: localResults,
        memory_count: localResults.length,
        warning: `Knowledge Graph query failed: ${error.message}`
      };
    }
  }

  private async updateMemory(memoryId: string, updates: Partial<IDEMemoryEntry>, context: ToolContext): Promise<any> {
    try {
      // First, get the existing memory
      const existing = await this.getMemoryById(memoryId);
      if (!existing) {
        throw new Error(`Memory not found: ${memoryId}`);
      }
      
      const updated: IDEMemoryEntry = {
        ...existing,
        ...updates,
        id: memoryId, // Preserve ID
        timestamp: new Date() // Update timestamp
      };
      
      if (this.kgClient) {
        // Update in Knowledge Graph
        await this.kgClient.executeTool('update_entity', {
          entity_id: memoryId,
          properties: {
            content: JSON.stringify(updated.content),
            tags: updated.tags,
            importance: updated.importance,
            updated_at: updated.timestamp.toISOString()
          }
        });
      }
      
      // Update in local storage
      this.updateInLocalStorage(updated);
      
      const totalCount = await this.getMemoryCount();
      
      return {
        status: 'success',
        message: `Memory updated: ${memoryId}`,
        data: [updated],
        memory_count: totalCount
      };
      
    } catch (error: any) {
      throw new Error(`Failed to update memory ${memoryId}: ${error.message}`);
    }
  }

  private async deleteMemory(memoryId: string, context: ToolContext): Promise<any> {
    try {
      // Get the memory before deletion
      const deleted = await this.getMemoryById(memoryId);
      if (!deleted) {
        throw new Error(`Memory not found: ${memoryId}`);
      }
      
      if (this.kgClient) {
        // Delete from Knowledge Graph
        await this.kgClient.executeTool('delete_entity', {
          entity_id: memoryId
        });
      }
      
      // Delete from local storage
      this.deleteFromLocalStorage(memoryId);
      
      const totalCount = await this.getMemoryCount();
      
      return {
        status: 'success',
        message: `Memory deleted: ${memoryId}`,
        data: [deleted],
        memory_count: totalCount
      };
      
    } catch (error: any) {
      throw new Error(`Failed to delete memory ${memoryId}: ${error.message}`);
    }
  }

  private async syncWithKnowledgeGraph(context: ToolContext): Promise<any> {
    try {
      if (!this.kgClient) {
        return {
          status: 'error',
          message: 'Knowledge Graph client not available',
          data: [],
          memory_count: 0
        };
      }
      
      // Get all local memories
      const localMemories = await this.getAllLocalMemories();
      let syncedCount = 0;
      const errors: string[] = [];
      
      for (const memory of localMemories) {
        try {
          // Check if memory exists in KG
          const existsInKG = await this.checkMemoryInKG(memory.id);
          
          if (!existsInKG) {
            // Create in KG
            await this.kgClient.executeTool('create_entity', {
              type: 'ide_memory',
              properties: {
                memory_id: memory.id,
                memory_type: memory.type,
                content: JSON.stringify(memory.content),
                tags: memory.tags,
                importance: memory.importance,
                project_id: memory.project_id,
                session_id: memory.session_id,
                created_at: memory.timestamp.toISOString()
              }
            });
            syncedCount++;
          }
        } catch (error: any) {
          errors.push(`${memory.id}: ${error.message}`);
        }
      }
      
      const totalCount = await this.getMemoryCount();
      
      return {
        status: 'success',
        message: `Synced ${syncedCount} memories with Knowledge Graph`,
        data: localMemories.filter(m => m.type === 'architectural'),
        memory_count: totalCount,
        sync_details: {
          synced: syncedCount,
          errors: errors.length,
          error_details: errors
        }
      };
      
    } catch (error: any) {
      return {
        status: 'error',
        message: `Sync failed: ${error.message}`,
        data: [],
        memory_count: 0
      };
    }
  }

  // Helper methods for local storage fallback
  private async queryLocalStorage(query: IDEMemoryQuery): Promise<IDEMemoryEntry[]> {
    try {
      // Use API endpoint to read memory files from server
      const response = await fetch('/api/ide-memory/list');
      if (!response.ok) {
        console.warn('[IDEMemoryTool] Failed to fetch memory data from API');
        return [];
      }
      
      const memoryData = await response.json();
      const memories: IDEMemoryEntry[] = memoryData.map((memory: any) => ({
        id: memory.id,
        content: memory.content,
        type: 'contextual' as const,
        importance: 5,
        tags: [],
        project_id: memory.metadata?.workspace || 'default',
        session_id: 'backup-session',
        created_at: memory.backup_metadata?.created_at || new Date().toISOString(),
        updated_at: memory.backup_metadata?.created_at || new Date().toISOString()
      }));
      
      console.log(`[IDEMemoryTool] Found ${memories.length} memories from API`);
      return memories;
    } catch (error) {
      console.warn('[IDEMemoryTool] Local storage query failed:', error);
      return [];
    }
  }
  
  private storeInLocalStorage(memory: IDEMemoryEntry): void {
    try {
      const key = `ide_memory_${memory.id}`;
      localStorage.setItem(key, JSON.stringify(memory));
    } catch (error) {
      console.warn('[IDEMemoryTool] Failed to store in localStorage:', error);
    }
  }
  
  private updateInLocalStorage(memory: IDEMemoryEntry): void {
    this.storeInLocalStorage(memory);
  }
  
  private deleteFromLocalStorage(memoryId: string): void {
    try {
      const key = `ide_memory_${memoryId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('[IDEMemoryTool] Failed to delete from localStorage:', error);
    }
  }
  
  // Note: Legacy localStorage scan logic removed; queryLocalStorage already fetches via API fallback.
  
  private async getAllLocalMemories(): Promise<IDEMemoryEntry[]> {
    return await this.queryLocalStorage({});
  }
  
  private applyQueryFilters(memories: IDEMemoryEntry[], query: IDEMemoryQuery): IDEMemoryEntry[] {
    let results = [...memories];
    
    if (query.type) {
      results = results.filter(m => m.type === query.type);
    }
    
    if (query.tags && query.tags.length > 0) {
      results = results.filter(m => 
        query.tags!.some(tag => m.tags.includes(tag))
      );
    }
    
    if (query.project_id) {
      results = results.filter(m => m.project_id === query.project_id);
    }
    
    if (query.session_id) {
      results = results.filter(m => m.session_id === query.session_id);
    }
    
    if (query.importance_threshold) {
      results = results.filter(m => m.importance >= query.importance_threshold!);
    }
    
    if (query.search_text) {
      const searchLower = query.search_text.toLowerCase();
      results = results.filter(m => 
        JSON.stringify(m.content).toLowerCase().includes(searchLower) ||
        m.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    return results;
  }
  
  private buildKGQuery(query: IDEMemoryQuery): string {
    let cypher = 'MATCH (m:ide_memory)';
    const conditions: string[] = [];
    
    if (query.type) {
      conditions.push(`m.memory_type = '${query.type}'`);
    }
    
    if (query.project_id) {
      conditions.push(`m.project_id = '${query.project_id}'`);
    }
    
    if (query.session_id) {
      conditions.push(`m.session_id = '${query.session_id}'`);
    }
    
    if (query.importance_threshold) {
      conditions.push(`m.importance >= ${query.importance_threshold}`);
    }
    
    if (conditions.length > 0) {
      cypher += ' WHERE ' + conditions.join(' AND ');
    }
    
    cypher += ' RETURN m ORDER BY m.importance DESC, m.created_at DESC';
    
    if (query.limit) {
      cypher += ` LIMIT ${query.limit}`;
    }
    
    return cypher;
  }
  
  private parseKGEntity(entity: any): IDEMemoryEntry {
    return {
      id: entity.memory_id || entity.id,
      type: entity.memory_type || 'contextual',
      content: typeof entity.content === 'string' ? JSON.parse(entity.content) : entity.content,
      tags: entity.tags || [],
      importance: entity.importance || 0.5,
      timestamp: new Date(entity.created_at || entity.timestamp),
      project_id: entity.project_id,
      session_id: entity.session_id
    };
  }
  
  private async getMemoryById(memoryId: string): Promise<IDEMemoryEntry | null> {
    try {
      if (this.kgClient) {
        const result = await this.kgClient.queryKnowledgeGraph(
          `MATCH (m:ide_memory {memory_id: '${memoryId}'}) RETURN m`,
          { output_format: 'json' }
        );
        
        if (result && result.data && result.data.length > 0) {
          return this.parseKGEntity(result.data[0]);
        }
      }
      
      // Fallback to local storage
      const key = `ide_memory_${memoryId}`;
      const memoryData = localStorage.getItem(key);
      if (memoryData) {
        const memory = JSON.parse(memoryData);
        memory.timestamp = new Date(memory.timestamp);
        return memory;
      }
      
      return null;
    } catch (error) {
      console.warn('[IDEMemoryTool] Failed to get memory by ID:', error);
      return null;
    }
  }
  
  private async checkMemoryInKG(memoryId: string): Promise<boolean> {
    try {
      if (!this.kgClient) return false;
      
      const result = await this.kgClient.queryKnowledgeGraph(
        `MATCH (m:ide_memory {memory_id: '${memoryId}'}) RETURN count(m) as count`,
        { output_format: 'json' }
      );
      
      return result && result.data && result.data[0] && result.data[0].count > 0;
    } catch (error) {
      return false;
    }
  }
  
  private async getMemoryCount(): Promise<number> {
    try {
      if (this.kgClient) {
        const result = await this.kgClient.queryKnowledgeGraph(
          'MATCH (m:ide_memory) RETURN count(m) as total',
          { output_format: 'json' }
        );
        
        if (result && result.data && result.data[0]) {
          return result.data[0].total || 0;
        }
      }
      
      // Fallback to local storage count
      return (await this.getAllLocalMemories()).length;
    } catch (error) {
      return (await this.getAllLocalMemories()).length;
    }
  }
  
  // Helper methods for agent integration
  public async getProjectMemories(projectId: string): Promise<IDEMemoryEntry[]> {
    const result = await this.queryMemories({ project_id: projectId }, {} as ToolContext);
    return result.data || [];
  }
  
  public async getMemoryStats(): Promise<{ total: number; by_type: Record<string, number>; by_project: Record<string, number>; service_health: boolean }> {
    try {
      const allMemories = await this.queryMemories({}, {} as ToolContext);
      const memories = allMemories.data || [];
      
      const by_type: Record<string, number> = {};
      const by_project: Record<string, number> = {};
      
      memories.forEach((m: IDEMemoryEntry) => {
        by_type[m.type] = (by_type[m.type] || 0) + 1;
        const project = m.project_id || 'default';
        by_project[project] = (by_project[project] || 0) + 1;
      });
      
      return {
        total: memories.length,
        by_type,
        by_project,
        service_health: this.kgClient !== null
      };
    } catch (error) {
      return {
        total: 0,
        by_type: {},
        by_project: {},
        service_health: false
      };
    }
  }
}
