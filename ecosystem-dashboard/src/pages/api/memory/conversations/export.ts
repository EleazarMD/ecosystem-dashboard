/**
 * Conversation Data Export API (GDPR/CCPA Compliance)
 * 
 * GET /api/memory/conversations/export - Export all user conversation data
 * 
 * Returns a JSON archive of all conversations and messages for a user.
 * Includes metadata, retention tier, importance scores, and timestamps.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const API_KEY = process.env.DASHBOARD_API_KEY || 'ai-gateway-api-key-2024';

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
  const format = (req.query.format as string) || 'json';

  try {
    // Get all conversations
    const conversations = await pool.query(
      `SELECT id, title, user_id, source, importance_score, summary, topics,
              retention_tier, message_count, total_tokens,
              created_at, updated_at, last_message_at, compacted_at, config
       FROM workspace.ai_conversations
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // Get all messages grouped by conversation
    const exportData: any[] = [];

    for (const conv of conversations.rows) {
      const messages = await pool.query(
        `SELECT id, role, content, model, tokens_used, cost,
                created_at, importance_score, is_preserved, metadata
         FROM workspace.ai_messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [conv.id]
      );

      exportData.push({
        conversation: {
          id: conv.id,
          external_id: conv.config?.external_id || null,
          title: conv.title,
          source: conv.source,
          importance_score: conv.importance_score,
          summary: conv.summary,
          topics: conv.topics,
          retention_tier: conv.retention_tier,
          message_count: conv.message_count,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          last_message_at: conv.last_message_at,
          compacted_at: conv.compacted_at,
        },
        messages: messages.rows.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          model: m.model,
          tokens_used: m.tokens_used,
          created_at: m.created_at,
          importance_score: m.importance_score,
          is_preserved: m.is_preserved,
        })),
      });
    }

    const exportPayload = {
      export_type: 'conversation_history',
      user_id: userId,
      exported_at: new Date().toISOString(),
      total_conversations: conversations.rows.length,
      total_messages: exportData.reduce((sum, c) => sum + c.messages.length, 0),
      retention_policy: {
        hot_days: 30,
        warm_days: 90,
        cold_days: 180,
        description: 'RFI (Recency, Frequency, Importance) retention with automatic compaction',
      },
      data: exportData,
    };

    console.log(`[ConversationExport] User ${userId}: ${conversations.rows.length} conversations, ${exportPayload.total_messages} messages`);

    if (format === 'download') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="conversation-export-${userId}-${new Date().toISOString().split('T')[0]}.json"`);
    }

    return res.status(200).json(exportPayload);
  } catch (error: any) {
    console.error('[ConversationExport] Error:', error.message);
    return res.status(500).json({ error: 'Export failed', details: error.message });
  }
}
