/**
 * Workspace Search Service
 * Searches within workspace pages and databases
 * Part of Phase 1: Dual-Search Engine
 */

import { Pool } from 'pg';

export interface WorkspaceSearchResult {
  pageId: string;
  title: string;
  excerpt: string;
  lastModified: Date;
  author: string;
  relevanceScore: number;
  blockType: string;
  url: string;
}

export interface WorkspaceSearchFilters {
  dateRange?: [Date, Date];
  authors?: string[];
  blockTypes?: string[];
}

export interface WorkspaceSearchOptions {
  limit?: number;
  filters?: WorkspaceSearchFilters;
}

export class WorkspaceSearchService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'ecosystem_unified',
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    });
  }

  /**
   * Perform basic text search across workspace content
   * Note: This is a simplified version. Full-text search with tsvector will be added in Week 2.
   */
  async search(
    workspaceId: string,
    query: string,
    options?: WorkspaceSearchOptions
  ): Promise<WorkspaceSearchResult[]> {
    const limit = options?.limit || 20;
    
    try {
      // Basic ILIKE search for MVP
      // TODO: Implement full-text search with tsvector in Phase 1 Week 2
      let sql = `
        SELECT 
          b.id as page_id,
          COALESCE(b.properties->>'title', 'Untitled') as title,
          COALESCE(
            SUBSTRING(b.content FROM 1 FOR 200),
            SUBSTRING(b.properties::text FROM 1 FOR 200)
          ) as excerpt,
          b.updated_at as last_modified,
          b.updated_by as author,
          1.0 as relevance_score,
          b.type as block_type
        FROM blocks b
        WHERE b.workspace_id = $1
          AND b.archived = false
          AND (
            b.properties->>'title' ILIKE $2
            OR b.content ILIKE $2
          )
      `;

      const params: any[] = [workspaceId, `%${query}%`];

      // Apply filters
      if (options?.filters?.dateRange) {
        sql += ` AND b.updated_at BETWEEN $${params.length + 1} AND $${params.length + 2}`;
        params.push(options.filters.dateRange[0], options.filters.dateRange[1]);
      }

      if (options?.filters?.authors?.length) {
        sql += ` AND b.updated_by = ANY($${params.length + 1})`;
        params.push(options.filters.authors);
      }

      if (options?.filters?.blockTypes?.length) {
        sql += ` AND b.type = ANY($${params.length + 1})`;
        params.push(options.filters.blockTypes);
      }

      sql += `
        ORDER BY b.updated_at DESC
        LIMIT $${params.length + 1}
      `;
      params.push(limit);

      const result = await this.pool.query(sql, params);

      return result.rows.map(row => ({
        pageId: row.page_id,
        title: row.title || 'Untitled',
        excerpt: row.excerpt || '',
        lastModified: row.last_modified,
        author: row.author,
        relevanceScore: parseFloat(row.relevance_score),
        blockType: row.block_type,
        url: `/workspace/page/${row.page_id}`,
      }));
    } catch (error) {
      console.error('[WorkspaceSearchService] Search error:', error);
      throw new Error(`Workspace search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get recent pages in workspace
   */
  async getRecentPages(workspaceId: string, limit: number = 10): Promise<WorkspaceSearchResult[]> {
    try {
      const sql = `
        SELECT 
          b.id as page_id,
          COALESCE(b.properties->>'title', 'Untitled') as title,
          COALESCE(
            SUBSTRING(b.content FROM 1 FOR 200),
            SUBSTRING(b.properties::text FROM 1 FOR 200)
          ) as excerpt,
          b.updated_at as last_modified,
          b.updated_by as author,
          1.0 as relevance_score,
          b.type as block_type
        FROM blocks b
        WHERE b.workspace_id = $1
          AND b.archived = false
          AND b.type = 'page'
        ORDER BY b.updated_at DESC
        LIMIT $2
      `;

      const result = await this.pool.query(sql, [workspaceId, limit]);

      return result.rows.map(row => ({
        pageId: row.page_id,
        title: row.title || 'Untitled',
        excerpt: row.excerpt || '',
        lastModified: row.last_modified,
        author: row.author,
        relevanceScore: 1.0,
        blockType: row.block_type,
        url: `/workspace/page/${row.page_id}`,
      }));
    } catch (error) {
      console.error('[WorkspaceSearchService] Get recent pages error:', error);
      throw new Error(`Failed to get recent pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Singleton instance
let workspaceSearchServiceInstance: WorkspaceSearchService | null = null;

export function getWorkspaceSearchService(): WorkspaceSearchService {
  if (!workspaceSearchServiceInstance) {
    workspaceSearchServiceInstance = new WorkspaceSearchService();
  }
  return workspaceSearchServiceInstance;
}
