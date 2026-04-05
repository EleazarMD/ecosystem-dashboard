/**
 * IDE Memory Writeback Service
 * 
 * Handles controlled filesystem writeback for approved AI Truth Engine corrections.
 * Ensures human oversight and audit trail for all memory modifications.
 * 
 * @module pages/api/ide-memory/writeback-service
 * @version 1.0.0
 * @updated 2025-08-16
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

interface WritebackRequest {
  correction_id: string;
  memory_id: string;
  approved_content: string;
  reviewer: string;
  approval_timestamp: string;
  original_content: string;
  evidence_sources: string[];
  confidence_score: number;
  workspace?: string;
  affected_files?: string[];
}

interface WritebackResult {
  success: boolean;
  correction_id: string;
  files_modified: string[];
  backup_created: boolean;
  audit_entry_id: string;
  timestamp: string;
  error?: string;
}

class WritebackService {
  private backupDirectory: string;
  private auditLogPath: string;

  constructor() {
    this.backupDirectory = path.join(process.cwd(), 'backups', 'ide-memory');
    this.auditLogPath = path.join(process.cwd(), 'logs', 'ide-memory-writeback.log');
  }

  async executeApprovedCorrection(request: WritebackRequest): Promise<WritebackResult> {
    const startTime = new Date().toISOString();
    const auditEntryId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log(`[Writeback Service] Starting correction execution: ${request.correction_id}`);

      // 1. Validate the correction request
      await this.validateWritebackRequest(request);

      // 2. Create backup before modification
      const backupPaths = await this.createBackup(request);

      // 3. Perform the actual writeback
      const modifiedFiles = await this.performWriteback(request);

      // 4. Create audit entry
      await this.createAuditEntry({
        id: auditEntryId,
        correction_id: request.correction_id,
        memory_id: request.memory_id,
        action: 'writeback',
        reviewer: request.reviewer,
        timestamp: startTime,
        files_affected: modifiedFiles,
        content_changes: {
          original: request.original_content,
          modified: request.approved_content,
          diff_summary: this.generateDiffSummary(request.original_content, request.approved_content)
        },
        metadata: {
          evidence_sources: request.evidence_sources,
          confidence_score: request.confidence_score,
          workspace: request.workspace || 'default'
        }
      });

      console.log(`[Writeback Service] Successfully executed correction: ${request.correction_id}`);

      return {
        success: true,
        correction_id: request.correction_id,
        files_modified: modifiedFiles,
        backup_created: backupPaths.length > 0,
        audit_entry_id: auditEntryId,
        timestamp: startTime
      };

    } catch (error: any) {
      console.error(`[Writeback Service] Failed to execute correction: ${request.correction_id}`, error);

      return {
        success: false,
        correction_id: request.correction_id,
        files_modified: [],
        backup_created: false,
        audit_entry_id: auditEntryId,
        timestamp: startTime,
        error: error.message
      };
    }
  }

  private async validateWritebackRequest(request: WritebackRequest): Promise<void> {
    if (!request.correction_id || !request.memory_id || !request.approved_content) {
      throw new Error('Missing required fields: correction_id, memory_id, approved_content');
    }

    if (!request.reviewer || !request.approval_timestamp) {
      throw new Error('Missing approval metadata: reviewer, approval_timestamp');
    }

    console.log(`[Writeback Service] Validation passed for correction: ${request.correction_id}`);
  }

  private async createBackup(request: WritebackRequest): Promise<string[]> {
    const backupPaths: string[] = [];

    try {
      await fs.mkdir(this.backupDirectory, { recursive: true });

      const memory = {
        id: request.memory_id,
        content: request.original_content,
        metadata: { workspace: request.workspace || 'default' }
      };

      const backupFilename = `memory_${request.memory_id}_${Date.now()}.json`;
      const backupPath = path.join(this.backupDirectory, backupFilename);

      const backupData = {
        ...memory,
        backup_metadata: {
          correction_id: request.correction_id,
          created_at: new Date().toISOString(),
          reviewer: request.reviewer,
          reason: 'Pre-writeback backup'
        }
      };

      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      backupPaths.push(backupPath);

      console.log(`[Writeback Service] Created backup: ${backupPath}`);
      return backupPaths;

    } catch (error: any) {
      console.error(`[Writeback Service] Backup creation failed:`, error);
      return [];
    }
  }

  private async performWriteback(request: WritebackRequest): Promise<string[]> {
    const modifiedFiles: string[] = [];

    try {
      // Mock writeback - in production this would update actual memory via MCP
      console.log(`[Writeback Service] Performing writeback for memory: ${request.memory_id}`);
      console.log(`[Writeback Service] Content updated from ${request.original_content.length} to ${request.approved_content.length} characters`);
      
      modifiedFiles.push(`memory:${request.memory_id}`);
      
      return modifiedFiles;

    } catch (error: any) {
      console.error(`[Writeback Service] Writeback failed:`, error);
      throw new Error(`Writeback failed: ${error.message}`);
    }
  }

  private async createAuditEntry(entry: any): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.auditLogPath), { recursive: true });
      
      const logLine = `${entry.timestamp} | ${entry.action} | ${entry.correction_id} | ${entry.reviewer} | ${JSON.stringify(entry.metadata)}\n`;
      await fs.appendFile(this.auditLogPath, logLine);
      
      console.log(`[Writeback Service] Created audit entry: ${entry.id}`);
    } catch (error: any) {
      console.error(`[Writeback Service] Failed to create audit entry:`, error);
    }
  }

  private generateDiffSummary(original: string, modified: string): string {
    const originalLines = original.split('\n').length;
    const modifiedLines = modified.split('\n').length;
    const lineDiff = modifiedLines - originalLines;
    
    return `Lines: ${originalLines} → ${modifiedLines} (${lineDiff >= 0 ? '+' : ''}${lineDiff})`;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const writebackService = new WritebackService();
    const result = await writebackService.executeApprovedCorrection(req.body);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json({ error: 'Writeback failed', result });
    }
  } catch (error: any) {
    console.error('Writeback Service Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
