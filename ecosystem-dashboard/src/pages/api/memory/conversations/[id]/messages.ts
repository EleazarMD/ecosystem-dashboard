/**
 * Conversation Messages API
 * 
 * GET  /api/memory/conversations/[id]/messages - Get messages for a conversation
 * POST /api/memory/conversations/[id]/messages - Append message to conversation
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const API_KEY = process.env.DASHBOARD_API_KEY || 'ai-gateway-api-key-2024';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveOrCreateConversation(rawId: string, userId: string): Promise<string | null> {
  // Try UUID match first
  if (UUID_RE.test(rawId)) {
    const r = await pool.query(
      `SELECT id FROM workspace.ai_conversations WHERE id = $1 AND user_id = $2`,
      [rawId, userId]
    );
    if (r.rows[0]) return r.rows[0].id;
  }
  // Lookup by external_id
  const r = await pool.query(
    `SELECT id FROM workspace.ai_conversations
     WHERE user_id = $1 AND config->>'external_id' = $2
     ORDER BY created_at DESC LIMIT 1`,
    [userId, rawId]
  );
  if (r.rows[0]) return r.rows[0].id;

  // Auto-create for fire-and-forget sync from Nova
  const created = await pool.query(
    `INSERT INTO workspace.ai_conversations
     (title, user_id, source, config, importance_score, retention_tier)
     VALUES ($1, $2, 'nova', $3, 50, 'hot')
     RETURNING id`,
    [`Nova Conversation ${rawId.substring(0, 8)}`, userId, JSON.stringify({ external_id: rawId })]
  );
  return created.rows[0]?.id || null;
}

// ---------------------------------------------------------------------------
// Inline redaction — sanitize critical PII before storage
// ---------------------------------------------------------------------------
const CRITICAL_REDACTIONS: Array<{pattern: RegExp; replacement: string}> = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED:SSN]' },
  { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '[REDACTED:CARD]' },
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"]?(\S{4,})['"]?/gi, replacement: '[REDACTED:PASSWORD]' },
  { pattern: /(?:api[_-]?key|apikey|secret|token)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi, replacement: '[REDACTED:API_KEY]' },
  { pattern: /Bearer\s+[a-zA-Z0-9_\-.]+/gi, replacement: '[REDACTED:BEARER]' },
];

function sanitizeContent(content: string): string {
  let sanitized = content;
  for (const r of CRITICAL_REDACTIONS) {
    sanitized = sanitized.replace(r.pattern, r.replacement);
  }
  return sanitized;
}

// ---------------------------------------------------------------------------
// Location extraction — strip iOS [User location: ...] prefix, return structured data
// ---------------------------------------------------------------------------
const LOCATION_PREFIX_RE = /^\[User location:\s*([^,\]]+),\s*([A-Z]{2}),\s*(\d{5})\]\s*\n*/i;

function extractAndStripLocation(content: string): { cleanContent: string; location: { city: string; state: string; zip: string } | null } {
  const match = content.match(LOCATION_PREFIX_RE);
  if (!match) return { cleanContent: content, location: null };
  return {
    cleanContent: content.replace(LOCATION_PREFIX_RE, '').trim(),
    location: { city: match[1].trim(), state: match[2].trim(), zip: match[3].trim() },
  };
}

const IMPORTANCE_KEYWORDS = {
  high: ['remember', 'important', 'never forget', 'always', 'critical', 'must', 'decision', 'agreed'],
  medium: ['prefer', 'like', 'want', 'need', 'should'],
  low: ['hello', 'hi', 'thanks', 'okay', 'ok', 'bye', 'goodbye'],
};

function calculateImportance(content: string, role: string, hasToolCalls: boolean): number {
  let score = 50;
  const lower = content.toLowerCase();

  // Tool calls are generally important
  if (hasToolCalls) score += 15;

  // Check for high-importance keywords
  for (const keyword of IMPORTANCE_KEYWORDS.high) {
    if (lower.includes(keyword)) {
      score += 10;
      break;
    }
  }

  // Check for medium-importance keywords
  for (const keyword of IMPORTANCE_KEYWORDS.medium) {
    if (lower.includes(keyword)) {
      score += 5;
      break;
    }
  }

  // Check for low-importance keywords (reduce score)
  for (const keyword of IMPORTANCE_KEYWORDS.low) {
    if (lower === keyword || lower.startsWith(keyword + ' ') || lower.startsWith(keyword + ',')) {
      score -= 10;
      break;
    }
  }

  // Longer messages tend to be more important
  if (content.length > 500) score += 10;
  else if (content.length < 20) score -= 10;

  // User messages with questions are important
  if (role === 'user' && content.includes('?')) score += 5;

  return Math.max(0, Math.min(100, score));
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
  if (!validateApiKey(req)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const userId = getUserId(req);
  const conversationId = req.query.id as string;

  if (!conversationId) {
    return res.status(400).json({ error: 'Conversation ID required' });
  }

  try {
    // Resolve conversation ID (UUID or external string ID, auto-create if needed)
    const resolvedId = await resolveOrCreateConversation(conversationId, userId);
    if (!resolvedId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (req.method === 'GET') {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await pool.query(
        `SELECT id, role, content, model, tokens_used, cost, created_at, 
                metadata, importance_score, is_preserved
         FROM workspace.ai_messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC
         LIMIT $2 OFFSET $3`,
        [resolvedId, limit, offset]
      );

      return res.status(200).json({
        messages: result.rows,
        conversation_id: resolvedId,
      });
    }

    if (req.method === 'POST') {
      const { role, content, model, tokens_used, cost, metadata, tool_calls } = req.body;

      if (!role || !content) {
        return res.status(400).json({ error: 'role and content are required' });
      }

      if (!['user', 'assistant', 'system'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Extract location prefix (iOS injects [User location: City, ST, ZIP])
      // Strip from content, store at conversation level on first occurrence
      const { cleanContent, location } = extractAndStripLocation(content);
      if (location) {
        await pool.query(
          `UPDATE workspace.ai_conversations
           SET config = config || $2::jsonb
           WHERE id = $1 AND NOT (config ? 'location')`,
          [resolvedId, JSON.stringify({ location })]
        );
      }

      // Sanitize critical PII before storage
      const safeContent = sanitizeContent(cleanContent);

      // Calculate importance score
      const importanceScore = calculateImportance(safeContent, role, !!tool_calls);
      const isPreserved = importanceScore >= 70;

      // Insert message
      const result = await pool.query(
        `INSERT INTO workspace.ai_messages 
         (conversation_id, role, content, model, tokens_used, cost, metadata, importance_score, is_preserved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, role, content, created_at, importance_score, is_preserved`,
        [
          resolvedId,
          role,
          safeContent,
          model || null,
          tokens_used || 0,
          cost || 0,
          JSON.stringify(metadata || {}),
          importanceScore,
          isPreserved,
        ]
      );

      // Update conversation stats
      await pool.query(
        `UPDATE workspace.ai_conversations 
         SET last_message_at = NOW(), 
             updated_at = NOW(),
             message_count = message_count + 1,
             total_tokens = total_tokens + $2
         WHERE id = $1`,
        [resolvedId, tokens_used || 0]
      );

      // Update conversation importance (rolling average)
      await pool.query(
        `UPDATE workspace.ai_conversations 
         SET importance_score = (
           SELECT COALESCE(AVG(importance_score)::INTEGER, 50)
           FROM workspace.ai_messages 
           WHERE conversation_id = $1
         )
         WHERE id = $1`,
        [resolvedId]
      );

      return res.status(201).json({
        message: result.rows[0],
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[ConversationMemory] Messages error:', error.message);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
}
