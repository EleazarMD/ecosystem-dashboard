/**
 * Conversation Search API
 * 
 * GET /api/memory/conversations/search - Semantic search across conversations
 * 
 * Searches both PostgreSQL (full-text) and ChromaDB (vector embeddings).
 * Returns ranked results with context snippets.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const CHROMADB_URL = process.env.CHROMADB_URL || 'http://localhost:8101';
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const API_KEY = process.env.DASHBOARD_API_KEY || 'ai-gateway-api-key-2024';

interface SearchResult {
  conversation_id: string;
  title: string;
  snippet: string;
  relevance_score: number;
  created_at: string;
  source: 'postgres' | 'vector';
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(`${AI_GATEWAY_URL}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      console.warn('[ConversationSearch] Embedding generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.warn('[ConversationSearch] Embedding error:', error);
    return null;
  }
}

async function searchChromaDB(
  embedding: number[],
  userId: string,
  limit: number
): Promise<SearchResult[]> {
  try {
    const response = await fetch(`${CHROMADB_URL}/api/v1/collections/nova_conversation_memory/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_embeddings: [embedding],
        n_results: limit,
        where: { user_id: userId },
        include: ['documents', 'metadatas', 'distances'],
      }),
    });

    if (!response.ok) {
      console.warn('[ConversationSearch] ChromaDB query failed:', response.status);
      return [];
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    if (data.documents?.[0]) {
      for (let i = 0; i < data.documents[0].length; i++) {
        const metadata = data.metadatas?.[0]?.[i] || {};
        const distance = data.distances?.[0]?.[i] || 1;
        
        results.push({
          conversation_id: metadata.conversation_id || '',
          title: metadata.title || 'Untitled',
          snippet: data.documents[0][i]?.substring(0, 200) || '',
          relevance_score: Math.max(0, 1 - distance), // Convert distance to similarity
          created_at: metadata.timestamp || '',
          source: 'vector',
        });
      }
    }

    return results;
  } catch (error) {
    console.warn('[ConversationSearch] ChromaDB error:', error);
    return [];
  }
}

async function searchPostgres(
  query: string,
  userId: string,
  fromDate: Date,
  toDate: Date,
  limit: number
): Promise<SearchResult[]> {
  // Split query into individual terms for OR matching
  const terms = query.trim().split(/\s+/).filter(t => t.length >= 2);

  // If no valid search terms (e.g. "*", "?"), return recent conversations instead
  if (terms.length === 0) {
    return browseRecent(userId, limit);
  }

  // Build ILIKE conditions: match ANY term in content, title, or summary
  const conditions = terms.map((_, i) =>
    `(m.content ILIKE '%' || $${i + 4} || '%' OR c.title ILIKE '%' || $${i + 4} || '%' OR c.summary ILIKE '%' || $${i + 4} || '%')`
  ).join(' OR ');

  const result = await pool.query(
    `SELECT DISTINCT ON (c.id)
       c.id as conversation_id,
       c.title,
       m.content as snippet,
       c.importance_score as relevance_score,
       c.created_at, c.message_count
     FROM workspace.ai_conversations c
     JOIN workspace.ai_messages m ON m.conversation_id = c.id
     WHERE c.user_id = $1
       AND c.retention_tier != 'archived'
       AND c.created_at >= $2
       AND c.created_at <= $3
       AND (${conditions})
     ORDER BY c.id, c.importance_score DESC, c.last_message_at DESC
     LIMIT $${terms.length + 4}`,
    [userId, fromDate.toISOString(), toDate.toISOString(), ...terms, limit]
  );

  return result.rows.map(row => ({
    conversation_id: row.conversation_id,
    title: row.title,
    snippet: row.snippet?.substring(0, 200) || '',
    relevance_score: row.relevance_score / 100,
    created_at: row.created_at,
    message_count: row.message_count,
    source: 'postgres' as const,
  }));
}

async function browseRecent(
  userId: string,
  limit: number
): Promise<SearchResult[]> {
  // Return most recent conversations with their first user message as snippet
  const result = await pool.query(
    `SELECT c.id as conversation_id, c.title, c.importance_score,
            c.created_at, c.message_count,
            (SELECT content FROM workspace.ai_messages
             WHERE conversation_id = c.id AND role = 'user'
             ORDER BY created_at ASC LIMIT 1) as snippet
     FROM workspace.ai_conversations c
     WHERE c.user_id = $1
       AND c.retention_tier != 'archived'
       AND c.message_count > 0
     ORDER BY c.last_message_at DESC NULLS LAST
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map(row => ({
    conversation_id: row.conversation_id,
    title: row.title,
    snippet: row.snippet?.substring(0, 200) || '',
    relevance_score: row.importance_score / 100,
    created_at: row.created_at,
    source: 'postgres' as const,
  }));
}

function validateApiKey(req: NextApiRequest): boolean {
  const apiKey = req.headers['x-api-key'] as string;
  return apiKey === API_KEY;
}

function getUserId(req: NextApiRequest): string {
  return (req.headers['x-user-id'] as string) || 
         (req.query.user_id as string) || 
         'default';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!validateApiKey(req)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const userId = getUserId(req);
  const query = req.query.q as string;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

  // Time interval: supports days_back, from_date, to_date
  // days_back=7 → last 7 days from now
  // from_date=2026-03-01&to_date=2026-03-15 → specific window
  // from_days=7&to_days=90 → between 1 week and 3 months ago
  const now = new Date();
  let fromDate: Date;
  let toDate: Date = now;

  if (req.query.from_date && req.query.to_date) {
    fromDate = new Date(req.query.from_date as string);
    toDate = new Date(req.query.to_date as string);
  } else if (req.query.from_days && req.query.to_days) {
    // "between X and Y days ago" — from_days is the farther boundary
    const fromDays = Math.min(parseInt(req.query.from_days as string) || 180, 365);
    const toDays = Math.max(parseInt(req.query.to_days as string) || 0, 0);
    fromDate = new Date(now.getTime() - fromDays * 86400000);
    toDate = new Date(now.getTime() - toDays * 86400000);
  } else {
    const daysBack = Math.min(parseInt(req.query.days_back as string) || 30, 180);
    fromDate = new Date(now.getTime() - daysBack * 86400000);
  }

  if (!query) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  try {
    // Run both searches in parallel
    const [postgresResults, embedding] = await Promise.all([
      searchPostgres(query, userId, fromDate, toDate, limit),
      generateEmbedding(query),
    ]);

    let vectorResults: SearchResult[] = [];
    if (embedding) {
      vectorResults = await searchChromaDB(embedding, userId, limit);
    }

    // Merge and deduplicate results
    const seen = new Set<string>();
    const mergedResults: SearchResult[] = [];

    // Interleave results, preferring vector search for semantic matches
    const allResults = [...vectorResults, ...postgresResults];
    allResults.sort((a, b) => b.relevance_score - a.relevance_score);

    for (const result of allResults) {
      if (!seen.has(result.conversation_id)) {
        seen.add(result.conversation_id);
        mergedResults.push(result);
        if (mergedResults.length >= limit) break;
      }
    }

    console.log(`[ConversationSearch] Query "${query}" for user ${userId}: ${mergedResults.length} results`);

    return res.status(200).json({
      results: mergedResults,
      query,
      time_window: { from: fromDate.toISOString(), to: toDate.toISOString() },
      sources: {
        postgres: postgresResults.length,
        vector: vectorResults.length,
      },
    });
  } catch (error: any) {
    console.error('[ConversationSearch] Error:', error.message);
    return res.status(500).json({ error: 'Search failed', details: error.message });
  }
}
