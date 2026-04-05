/**
 * Single Conversation API
 * 
 * GET    /api/memory/conversations/[id] - Get conversation with messages
 * PATCH  /api/memory/conversations/[id] - Update conversation metadata
 * DELETE /api/memory/conversations/[id] - Delete conversation (user-initiated)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const API_KEY = process.env.DASHBOARD_API_KEY || 'ai-gateway-api-key-2024';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveConversationId(rawId: string, userId: string): Promise<string | null> {
  if (UUID_RE.test(rawId)) {
    const r = await pool.query(
      `SELECT id FROM workspace.ai_conversations WHERE id = $1 AND user_id = $2`,
      [rawId, userId]
    );
    return r.rows[0]?.id || null;
  }
  // Lookup by external_id stored in config JSONB
  const r = await pool.query(
    `SELECT id FROM workspace.ai_conversations
     WHERE user_id = $1 AND config->>'external_id' = $2
     ORDER BY created_at DESC LIMIT 1`,
    [userId, rawId]
  );
  return r.rows[0]?.id || null;
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
    const resolvedId = await resolveConversationId(conversationId, userId);
    if (!resolvedId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (req.method === 'GET') {
      // Get conversation metadata
      const convResult = await pool.query(
        `SELECT * FROM workspace.ai_conversations WHERE id = $1`,
        [resolvedId]
      );

      if (convResult.rows.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const conversation = convResult.rows[0];

      // Get messages (respect retention tier)
      let messagesQuery = `
        SELECT id, role, content, model, tokens_used, cost, created_at, 
               metadata, importance_score, is_preserved
        FROM workspace.ai_messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
      `;

      // For warm/cold tiers, only return preserved messages
      if (conversation.retention_tier === 'warm' || conversation.retention_tier === 'cold') {
        messagesQuery = `
          SELECT id, role, content, model, tokens_used, cost, created_at, 
                 metadata, importance_score, is_preserved
          FROM workspace.ai_messages
          WHERE conversation_id = $1 AND is_preserved = true
          ORDER BY created_at ASC
        `;
      }

      const messagesResult = await pool.query(messagesQuery, [resolvedId]);

      return res.status(200).json({
        conversation: {
          ...conversation,
          messages: messagesResult.rows,
        },
      });
    }

    if (req.method === 'PATCH') {
      const { title, importance_score, topics, archived } = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(title);
      }
      if (importance_score !== undefined) {
        updates.push(`importance_score = $${paramIndex++}`);
        values.push(Math.max(0, Math.min(100, importance_score)));
      }
      if (topics !== undefined) {
        updates.push(`topics = $${paramIndex++}`);
        values.push(topics);
      }
      if (archived !== undefined) {
        updates.push(`archived = $${paramIndex++}`);
        values.push(archived);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updates.push(`updated_at = NOW()`);
      values.push(resolvedId);

      const result = await pool.query(
        `UPDATE workspace.ai_conversations 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      return res.status(200).json({ conversation: result.rows[0] });
    }

    if (req.method === 'DELETE') {
      // Soft delete by archiving, or hard delete if requested
      const hardDelete = req.query.hard === 'true';

      if (hardDelete) {
        // Log for audit before deletion
        console.log(`[ConversationMemory] Hard delete conversation ${conversationId} by user ${userId}`);
        
        await pool.query(
          `DELETE FROM workspace.ai_conversations 
           WHERE id = $1`,
          [resolvedId]
        );
      } else {
        await pool.query(
          `UPDATE workspace.ai_conversations 
           SET retention_tier = 'archived', archived = true, updated_at = NOW()
           WHERE id = $1`,
          [resolvedId]
        );
      }

      return res.status(200).json({ success: true, deleted: conversationId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[ConversationMemory] Error:', error.message);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
}
