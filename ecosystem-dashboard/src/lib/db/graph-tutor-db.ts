/**
 * Graph Tutor Database - Caching layer for LLM-generated educational content
 * Stores synthesized materials to avoid repeated inference
 */

import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'ecosystem_unified',
  user: process.env.POSTGRES_USER || 'eleazar',
  password: process.env.POSTGRES_PASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export interface TutorContent {
  explanation: string;
  keyPoints: string[];
  examples: string[];
  studyQuestions: string[];
  relatedTopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: string;
}

export interface CachedTutorEntry {
  id: string;
  node_id: string;
  node_name: string;
  node_type: string;
  document_id?: string;
  workspace_id?: string;
  content: TutorContent;
  content_hash: string;
  model_used: string;
  created_at: Date;
  accessed_at: Date;
  access_count: number;
}

/**
 * Initialize the graph_tutor_cache table
 */
export async function initTutorCacheTable(): Promise<void> {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS graph_tutor_cache (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      node_id VARCHAR(255) NOT NULL,
      node_name VARCHAR(500) NOT NULL,
      node_type VARCHAR(100) NOT NULL,
      document_id VARCHAR(500),
      workspace_id VARCHAR(255),
      content JSONB NOT NULL,
      content_hash VARCHAR(64) NOT NULL,
      model_used VARCHAR(100) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      access_count INTEGER DEFAULT 1,
      UNIQUE(content_hash)
    );
    
    CREATE INDEX IF NOT EXISTS idx_tutor_cache_node ON graph_tutor_cache(node_id, workspace_id);
    CREATE INDEX IF NOT EXISTS idx_tutor_cache_hash ON graph_tutor_cache(content_hash);
    CREATE INDEX IF NOT EXISTS idx_tutor_cache_document ON graph_tutor_cache(document_id);
  `;

  try {
    await pool.query(createTableSQL);
    console.log('[Graph Tutor DB] Cache table initialized');
  } catch (error) {
    console.error('[Graph Tutor DB] Failed to initialize table:', error);
    throw error;
  }
}

/**
 * Generate a hash for cache lookup based on node properties
 */
export function generateContentHash(
  nodeId: string,
  nodeName: string,
  nodeType: string,
  documentId?: string,
  connectedNodeNames?: string[]
): string {
  const input = JSON.stringify({
    nodeId,
    nodeName: nodeName.toLowerCase().trim(),
    nodeType,
    documentId,
    connections: connectedNodeNames?.sort() || [],
  });
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 32);
}

/**
 * Get cached tutor content if available
 */
export async function getCachedTutorContent(
  contentHash: string
): Promise<TutorContent | null> {
  try {
    const result = await pool.query(
      `UPDATE graph_tutor_cache 
       SET accessed_at = NOW(), access_count = access_count + 1
       WHERE content_hash = $1
       RETURNING content`,
      [contentHash]
    );

    if (result.rows.length > 0) {
      console.log('[Graph Tutor DB] Cache HIT for hash:', contentHash.slice(0, 8));
      return result.rows[0].content as TutorContent;
    }

    console.log('[Graph Tutor DB] Cache MISS for hash:', contentHash.slice(0, 8));
    return null;
  } catch (error) {
    console.error('[Graph Tutor DB] Cache lookup error:', error);
    return null;
  }
}

/**
 * Store tutor content in cache
 */
export async function cacheTutorContent(
  nodeId: string,
  nodeName: string,
  nodeType: string,
  content: TutorContent,
  contentHash: string,
  modelUsed: string,
  documentId?: string,
  workspaceId?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO graph_tutor_cache 
       (node_id, node_name, node_type, document_id, workspace_id, content, content_hash, model_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (content_hash) DO UPDATE SET
         accessed_at = NOW(),
         access_count = graph_tutor_cache.access_count + 1`,
      [nodeId, nodeName, nodeType, documentId, workspaceId, JSON.stringify(content), contentHash, modelUsed]
    );
    console.log('[Graph Tutor DB] Cached content for:', nodeName);
  } catch (error) {
    console.error('[Graph Tutor DB] Cache store error:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalAccesses: number;
  oldestEntry: Date | null;
  mostAccessed: { name: string; count: number } | null;
}> {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_entries,
        SUM(access_count) as total_accesses,
        MIN(created_at) as oldest_entry
      FROM graph_tutor_cache
    `);

    const mostAccessed = await pool.query(`
      SELECT node_name, access_count 
      FROM graph_tutor_cache 
      ORDER BY access_count DESC 
      LIMIT 1
    `);

    return {
      totalEntries: parseInt(stats.rows[0].total_entries) || 0,
      totalAccesses: parseInt(stats.rows[0].total_accesses) || 0,
      oldestEntry: stats.rows[0].oldest_entry,
      mostAccessed: mostAccessed.rows[0] 
        ? { name: mostAccessed.rows[0].node_name, count: mostAccessed.rows[0].access_count }
        : null,
    };
  } catch (error) {
    console.error('[Graph Tutor DB] Stats error:', error);
    return { totalEntries: 0, totalAccesses: 0, oldestEntry: null, mostAccessed: null };
  }
}

/**
 * Clear old cache entries (older than specified days)
 */
export async function clearOldCache(daysOld: number = 30): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM graph_tutor_cache 
       WHERE accessed_at < NOW() - INTERVAL '${daysOld} days'
       RETURNING id`
    );
    console.log(`[Graph Tutor DB] Cleared ${result.rowCount} old cache entries`);
    return result.rowCount || 0;
  } catch (error) {
    console.error('[Graph Tutor DB] Clear cache error:', error);
    return 0;
  }
}

export { pool };
