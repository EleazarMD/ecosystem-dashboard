/**
 * Conversation Memory API
 * 
 * Backend-only conversation storage with RFI (Recency, Frequency, Importance) retention.
 * iOS and Nova are thin clients - all conversation data lives here.
 * 
 * GET  /api/memory/conversations - List user's conversations
 * POST /api/memory/conversations - Create new conversation
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
  if (!validateApiKey(req)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const userId = getUserId(req);

  try {
    if (req.method === 'GET') {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const tier = req.query.tier as string; // optional: hot, warm, cold
      const includeArchived = req.query.include_archived === 'true';

      let query = `
        SELECT 
          id, title, user_id, source, importance_score, summary, topics,
          retention_tier, message_count, total_tokens,
          created_at, updated_at, last_message_at
        FROM workspace.ai_conversations
        WHERE user_id = $1
      `;
      const params: any[] = [userId];
      let paramIndex = 2;

      if (!includeArchived) {
        query += ` AND retention_tier != 'archived'`;
      }

      if (tier) {
        query += ` AND retention_tier = $${paramIndex}`;
        params.push(tier);
        paramIndex++;
      }

      query += ` ORDER BY last_message_at DESC NULLS LAST, updated_at DESC`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Get total count for pagination
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM workspace.ai_conversations WHERE user_id = $1 AND retention_tier != 'archived'`,
        [userId]
      );

      // Convert timestamps to Unix epoch (seconds) for iOS compatibility
      const conversations = result.rows.map(row => ({
        ...row,
        created_at: row.created_at ? new Date(row.created_at).getTime() / 1000 : null,
        updated_at: row.updated_at ? new Date(row.updated_at).getTime() / 1000 : null,
        last_message_at: row.last_message_at ? new Date(row.last_message_at).getTime() / 1000 : null,
      }));

      return res.status(200).json({
        conversations,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
      });
    }

    if (req.method === 'POST') {
      const { title, source = 'nova', config = {}, external_id, session_context } = req.body;

      // If external_id provided (e.g. Nova's conversation_id), check if already exists
      if (external_id) {
        const existing = await pool.query(
          `SELECT id, title, user_id, source, created_at FROM workspace.ai_conversations
           WHERE user_id = $1 AND config->>'external_id' = $2`,
          [userId, external_id]
        );
        if (existing.rows.length > 0) {
          return res.status(200).json({ conversation: existing.rows[0], existing: true });
        }
      }

      // Merge config: external_id + session_context (client, audio_mode, device, location)
      // session_context fields are nullable — clients without location simply omit it
      const mergedConfig: Record<string, any> = {
        ...config,
        ...(external_id ? { external_id } : {}),
      };
      if (session_context && typeof session_context === 'object') {
        const { client, audio_mode, device, app_version, location, timezone, started_at } = session_context;
        if (client) mergedConfig.client = client;
        if (audio_mode) mergedConfig.audio_mode = audio_mode;
        if (device) mergedConfig.device = device;
        if (app_version) mergedConfig.app_version = app_version;
        if (timezone) mergedConfig.timezone = timezone;
        if (started_at) mergedConfig.started_at = started_at;
        // Location is optional — iOS sends it, Tesla/Dashboard don't
        if (location && typeof location === 'object') {
          mergedConfig.location = location;
        }
      }

      const result = await pool.query(
        `INSERT INTO workspace.ai_conversations 
         (title, user_id, source, config, importance_score, retention_tier)
         VALUES ($1, $2, $3, $4, 50, 'hot')
         RETURNING id, title, user_id, source, created_at`,
        [title || 'New Conversation', userId, source, JSON.stringify(mergedConfig)]
      );

      const convId = result.rows[0].id;
      const clientTag = mergedConfig.client || 'unknown';
      console.log(`[ConversationMemory] Created ${convId} (ext: ${external_id || 'none'}, client: ${clientTag}) for user ${userId}`);

      return res.status(201).json({
        conversation: result.rows[0],
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[ConversationMemory] Error:', error.message);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
}
