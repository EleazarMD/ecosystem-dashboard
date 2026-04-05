/**
 * Conversation Compaction API
 * 
 * POST /api/memory/conversations/compact - Run compaction (admin/cron)
 * GET  /api/memory/conversations/compact - Get compaction stats
 * 
 * RFI Retention Policy:
 *   Hot  (0-30 days)  → Full messages retained
 *   Warm (31-90 days) → LLM summary generated, low-importance messages removed
 *   Cold (91-180 days) → Only preserved (high-importance) messages + summary
 *   Archived (180+ days) → Facts extracted to PIC, raw content purged
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const API_KEY = process.env.DASHBOARD_API_KEY || 'ai-gateway-api-key-2024';
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const PIC_URL = process.env.PIC_URL || 'http://localhost:8404';

const HOT_DAYS = 30;
const WARM_DAYS = 90;
const COLD_DAYS = 180;

function validateApiKey(req: NextApiRequest): boolean {
  const apiKey = req.headers['x-api-key'] as string;
  return apiKey === API_KEY;
}

async function generateSummary(messages: Array<{role: string; content: string}>): Promise<string> {
  try {
    const transcript = messages
      .slice(0, 50) // Cap to avoid token overflow
      .map(m => `${m.role}: ${m.content.substring(0, 300)}`)
      .join('\n');

    const response = await fetch(`${AI_GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'minimax-m2.5',
        messages: [
          {
            role: 'system',
            content: 'Summarize this conversation in 2-4 sentences. Focus on: key topics discussed, decisions made, action items, and facts learned about the user. Be concise.',
          },
          { role: 'user', content: transcript },
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.warn('[Compaction] Summary generation failed:', response.status);
      return '';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.warn('[Compaction] Summary error:', error);
    return '';
  }
}

async function extractTopics(summary: string): Promise<string[]> {
  if (!summary) return [];
  // Simple keyword extraction — no LLM needed
  const stopwords = new Set(['the', 'a', 'an', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'that', 'this', 'it', 'not', 'but', 'and', 'or', 'if', 'then', 'than', 'so', 'no', 'up', 'out', 'just', 'also', 'very', 'what', 'which', 'who', 'how', 'when', 'where', 'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some', 'any', 'user', 'discussed', 'conversation']);

  const words = summary.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (w.length > 3 && !stopwords.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

async function extractFactsToPIC(
  conversationId: string,
  userId: string,
  summary: string,
): Promise<void> {
  if (!summary) return;

  try {
    await fetch(`${PIC_URL}/api/pic/learn`, {
      method: 'POST',
      headers: {
        'X-PIC-Admin-Key': process.env.PIC_ADMIN_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        observation_type: 'conversation_summary',
        category: 'other',
        key: `conversation_${conversationId.substring(0, 8)}`,
        value: summary.substring(0, 500),
        context: `Extracted from archived conversation ${conversationId}`,
        source_agent: 'compaction-engine',
        source_action: 'archive_compaction',
      }),
    });
  } catch (error) {
    console.warn('[Compaction] PIC extraction error:', error);
  }
}

interface CompactionStats {
  hot_to_warm: number;
  warm_to_cold: number;
  cold_to_archived: number;
  messages_removed: number;
  summaries_generated: number;
  facts_extracted: number;
  errors: string[];
}

async function runCompaction(): Promise<CompactionStats> {
  const stats: CompactionStats = {
    hot_to_warm: 0,
    warm_to_cold: 0,
    cold_to_archived: 0,
    messages_removed: 0,
    summaries_generated: 0,
    facts_extracted: 0,
    errors: [],
  };

  const now = new Date();
  const hotCutoff = new Date(now.getTime() - HOT_DAYS * 86400000);
  const warmCutoff = new Date(now.getTime() - WARM_DAYS * 86400000);
  const coldCutoff = new Date(now.getTime() - COLD_DAYS * 86400000);

  // ── Hot → Warm (30+ days old) ────────────────────────────────────
  try {
    const hotConvs = await pool.query(
      `SELECT id, user_id, title FROM workspace.ai_conversations
       WHERE retention_tier = 'hot' AND last_message_at < $1
       ORDER BY last_message_at ASC LIMIT 50`,
      [hotCutoff.toISOString()]
    );

    for (const conv of hotConvs.rows) {
      try {
        // Get messages for summary
        const msgs = await pool.query(
          `SELECT role, content FROM workspace.ai_messages
           WHERE conversation_id = $1 ORDER BY created_at ASC`,
          [conv.id]
        );

        if (msgs.rows.length === 0) continue;

        // Generate LLM summary
        const summary = await generateSummary(msgs.rows);
        const topics = await extractTopics(summary);

        if (summary) {
          stats.summaries_generated++;
        }

        // Mark high-importance messages as preserved
        await pool.query(
          `UPDATE workspace.ai_messages SET is_preserved = true
           WHERE conversation_id = $1 AND importance_score >= 70`,
          [conv.id]
        );

        // Delete low-importance messages (keep preserved ones)
        const deleted = await pool.query(
          `DELETE FROM workspace.ai_messages
           WHERE conversation_id = $1 AND is_preserved = false
           AND importance_score < 40`,
          [conv.id]
        );
        stats.messages_removed += deleted.rowCount || 0;

        // Update conversation to warm tier
        await pool.query(
          `UPDATE workspace.ai_conversations
           SET retention_tier = 'warm', summary = $2, topics = $3,
               compacted_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [conv.id, summary, topics]
        );

        stats.hot_to_warm++;
      } catch (err: any) {
        stats.errors.push(`Hot→Warm ${conv.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    stats.errors.push(`Hot→Warm query: ${err.message}`);
  }

  // ── Warm → Cold (90+ days old) ───────────────────────────────────
  try {
    const warmConvs = await pool.query(
      `SELECT id, user_id, summary FROM workspace.ai_conversations
       WHERE retention_tier = 'warm' AND last_message_at < $1
       ORDER BY last_message_at ASC LIMIT 50`,
      [warmCutoff.toISOString()]
    );

    for (const conv of warmConvs.rows) {
      try {
        // Remove all non-preserved messages
        const deleted = await pool.query(
          `DELETE FROM workspace.ai_messages
           WHERE conversation_id = $1 AND is_preserved = false`,
          [conv.id]
        );
        stats.messages_removed += deleted.rowCount || 0;

        // Update to cold tier
        await pool.query(
          `UPDATE workspace.ai_conversations
           SET retention_tier = 'cold', compacted_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [conv.id]
        );

        stats.warm_to_cold++;
      } catch (err: any) {
        stats.errors.push(`Warm→Cold ${conv.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    stats.errors.push(`Warm→Cold query: ${err.message}`);
  }

  // ── Cold → Archived (180+ days old) ──────────────────────────────
  try {
    const coldConvs = await pool.query(
      `SELECT id, user_id, summary FROM workspace.ai_conversations
       WHERE retention_tier = 'cold' AND last_message_at < $1
       ORDER BY last_message_at ASC LIMIT 50`,
      [coldCutoff.toISOString()]
    );

    for (const conv of coldConvs.rows) {
      try {
        // Extract remaining facts to PIC before purge
        if (conv.summary) {
          await extractFactsToPIC(conv.id, conv.user_id, conv.summary);
          stats.facts_extracted++;
        }

        // Delete ALL messages
        const deleted = await pool.query(
          `DELETE FROM workspace.ai_messages WHERE conversation_id = $1`,
          [conv.id]
        );
        stats.messages_removed += deleted.rowCount || 0;

        // Archive (keep metadata + summary only)
        await pool.query(
          `UPDATE workspace.ai_conversations
           SET retention_tier = 'archived', archived = true,
               compacted_at = NOW(), updated_at = NOW(),
               expires_at = NOW() + INTERVAL '365 days'
           WHERE id = $1`,
          [conv.id]
        );

        stats.cold_to_archived++;
      } catch (err: any) {
        stats.errors.push(`Cold→Archive ${conv.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    stats.errors.push(`Cold→Archive query: ${err.message}`);
  }

  return stats;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateApiKey(req)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  try {
    if (req.method === 'GET') {
      // Return current retention tier stats
      const result = await pool.query(`
        SELECT 
          retention_tier,
          COUNT(*) as count,
          SUM(message_count) as total_messages,
          MIN(last_message_at) as oldest,
          MAX(last_message_at) as newest
        FROM workspace.ai_conversations
        GROUP BY retention_tier
        ORDER BY 
          CASE retention_tier 
            WHEN 'hot' THEN 1 WHEN 'warm' THEN 2 
            WHEN 'cold' THEN 3 WHEN 'archived' THEN 4 
          END
      `);

      return res.status(200).json({
        tiers: result.rows,
        policy: {
          hot_days: HOT_DAYS,
          warm_days: WARM_DAYS,
          cold_days: COLD_DAYS,
        },
      });
    }

    if (req.method === 'POST') {
      const dryRun = req.query.dry_run === 'true';

      if (dryRun) {
        // Show what would be compacted
        const now = new Date();
        const hotCutoff = new Date(now.getTime() - HOT_DAYS * 86400000);
        const warmCutoff = new Date(now.getTime() - WARM_DAYS * 86400000);
        const coldCutoff = new Date(now.getTime() - COLD_DAYS * 86400000);

        const preview = await pool.query(`
          SELECT retention_tier, COUNT(*) as count
          FROM workspace.ai_conversations
          WHERE 
            (retention_tier = 'hot' AND last_message_at < $1)
            OR (retention_tier = 'warm' AND last_message_at < $2)
            OR (retention_tier = 'cold' AND last_message_at < $3)
          GROUP BY retention_tier
        `, [hotCutoff.toISOString(), warmCutoff.toISOString(), coldCutoff.toISOString()]);

        return res.status(200).json({ dry_run: true, would_compact: preview.rows });
      }

      console.log('[Compaction] Starting compaction run...');
      const stats = await runCompaction();
      console.log(`[Compaction] Complete: ${JSON.stringify(stats)}`);

      return res.status(200).json({ success: true, stats });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[Compaction] Error:', error.message);
    return res.status(500).json({ error: 'Compaction failed', details: error.message });
  }
}
