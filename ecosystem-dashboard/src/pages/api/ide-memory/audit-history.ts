/**
 * IDE Memory Audit History API
 * 
 * Provides access to audit trail for memory corrections and writebacks.
 * Supports filtering and pagination for audit entries.
 * 
 * @module pages/api/ide-memory/audit-history
 * @version 1.0.0
 * @updated 2025-08-15
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

interface AuditEntry {
  id: string;
  correction_id: string;
  memory_id: string;
  action: 'writeback' | 'backup' | 'rollback';
  reviewer: string;
  timestamp: string;
  files_affected: string[];
  content_changes: {
    original: string;
    modified: string;
    diff_summary: string;
  };
  metadata: {
    evidence_sources: string[];
    confidence_score: number;
    workspace: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { memory_id, limit = '50', offset = '0' } = req.query;
    const auditLogPath = path.join(process.cwd(), 'logs', 'ide-memory-writeback.log');

    // Check if audit log exists
    try {
      await fs.access(auditLogPath);
    } catch {
      return res.status(200).json({
        audit_entries: [],
        total: 0,
        message: 'No audit history found'
      });
    }

    // Read and parse audit log
    const logContent = await fs.readFile(auditLogPath, 'utf-8');
    let entries = logContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line) as AuditEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is AuditEntry => entry !== null);

    // Filter by memory_id if provided
    if (memory_id && typeof memory_id === 'string') {
      entries = entries.filter(entry => entry.memory_id === memory_id);
    }

    // Sort by timestamp (newest first)
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    const paginatedEntries = entries.slice(offsetNum, offsetNum + limitNum);

    res.status(200).json({
      audit_entries: paginatedEntries,
      total: entries.length,
      limit: limitNum,
      offset: offsetNum
    });

  } catch (error: any) {
    console.error('[Audit History API] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
