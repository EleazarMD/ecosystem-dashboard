/**
 * Conversation Redaction API
 * 
 * POST /api/memory/conversations/redact - Redact sensitive data from stored messages
 * GET  /api/memory/conversations/redact - Preview what would be redacted (dry run)
 * 
 * Scans stored messages for PII, credentials, and sensitive data patterns.
 * Replaces matches with [REDACTED:type] tokens.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const API_KEY = process.env.DASHBOARD_API_KEY || 'ai-gateway-api-key-2024';

interface RedactionPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
  severity: 'critical' | 'high' | 'medium';
}

const REDACTION_PATTERNS: RedactionPattern[] = [
  // Critical — always redact
  { name: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED:SSN]', severity: 'critical' },
  { name: 'credit_card', pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '[REDACTED:CARD]', severity: 'critical' },
  { name: 'api_key_value', pattern: /(?:api[_-]?key|apikey|secret|token|bearer)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi, replacement: '[REDACTED:API_KEY]', severity: 'critical' },
  { name: 'bearer_token', pattern: /Bearer\s+[a-zA-Z0-9_\-.]+/gi, replacement: '[REDACTED:BEARER]', severity: 'critical' },
  { name: 'password_value', pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"]?(\S{4,})['"]?/gi, replacement: '[REDACTED:PASSWORD]', severity: 'critical' },

  // High — redact by default
  { name: 'email_address', pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, replacement: '[REDACTED:EMAIL]', severity: 'high' },
  { name: 'phone_us', pattern: /\b(?:\+1[-.]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: '[REDACTED:PHONE]', severity: 'high' },
  { name: 'ip_address', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, replacement: '[REDACTED:IP]', severity: 'high' },

  // Medium — redact on request
  { name: 'date_of_birth', pattern: /\b(?:dob|date of birth|birthday)\s*[:=]?\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/gi, replacement: '[REDACTED:DOB]', severity: 'medium' },
];

function redactContent(content: string, minSeverity: string = 'high'): { redacted: string; matches: Array<{pattern: string; count: number}> } {
  const severityOrder = { critical: 0, high: 1, medium: 2 };
  const minLevel = severityOrder[minSeverity as keyof typeof severityOrder] ?? 1;

  let redacted = content;
  const matches: Array<{pattern: string; count: number}> = [];

  for (const p of REDACTION_PATTERNS) {
    const level = severityOrder[p.severity];
    if (level > minLevel) continue;

    const found = content.match(p.pattern);
    if (found && found.length > 0) {
      redacted = redacted.replace(p.pattern, p.replacement);
      matches.push({ pattern: p.name, count: found.length });
    }
  }

  return { redacted, matches };
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
  const severity = (req.query.severity as string) || 'high';

  try {
    if (req.method === 'GET') {
      // Dry run — scan for sensitive data without modifying
      const messages = await pool.query(
        `SELECT m.id, m.content, m.conversation_id, m.created_at
         FROM workspace.ai_messages m
         JOIN workspace.ai_conversations c ON c.id = m.conversation_id
         WHERE c.user_id = $1
         ORDER BY m.created_at DESC
         LIMIT 500`,
        [userId]
      );

      let totalMatches = 0;
      const findings: Array<{message_id: string; conversation_id: string; patterns: Array<{pattern: string; count: number}>}> = [];

      for (const msg of messages.rows) {
        const { matches } = redactContent(msg.content, severity);
        if (matches.length > 0) {
          totalMatches += matches.reduce((s, m) => s + m.count, 0);
          findings.push({
            message_id: msg.id,
            conversation_id: msg.conversation_id,
            patterns: matches,
          });
        }
      }

      return res.status(200).json({
        dry_run: true,
        messages_scanned: messages.rows.length,
        messages_with_sensitive_data: findings.length,
        total_matches: totalMatches,
        severity_threshold: severity,
        findings: findings.slice(0, 20), // Limit output
      });
    }

    if (req.method === 'POST') {
      const dryRun = req.query.dry_run === 'true';
      const conversationId = req.body?.conversation_id; // Optional: target specific conversation

      let query = `
        SELECT m.id, m.content
        FROM workspace.ai_messages m
        JOIN workspace.ai_conversations c ON c.id = m.conversation_id
        WHERE c.user_id = $1
      `;
      const params: any[] = [userId];

      if (conversationId) {
        query += ` AND c.id = $2`;
        params.push(conversationId);
      }

      query += ` ORDER BY m.created_at DESC LIMIT 1000`;

      const messages = await pool.query(query, params);

      let redactedCount = 0;
      let totalMatches = 0;

      for (const msg of messages.rows) {
        const { redacted, matches } = redactContent(msg.content, severity);

        if (matches.length > 0) {
          totalMatches += matches.reduce((s, m) => s + m.count, 0);

          if (!dryRun) {
            await pool.query(
              `UPDATE workspace.ai_messages SET content = $1 WHERE id = $2`,
              [redacted, msg.id]
            );
          }
          redactedCount++;
        }
      }

      console.log(`[Redaction] User ${userId}: ${redactedCount}/${messages.rows.length} messages ${dryRun ? 'would be' : 'were'} redacted (${totalMatches} matches)`);

      return res.status(200).json({
        success: !dryRun,
        dry_run: dryRun,
        messages_scanned: messages.rows.length,
        messages_redacted: redactedCount,
        total_matches: totalMatches,
        severity_threshold: severity,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[Redaction] Error:', error.message);
    return res.status(500).json({ error: 'Redaction failed', details: error.message });
  }
}
