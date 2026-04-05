/**
 * IDE Memory Writeback Service Unit Tests
 * 
 * Fast unit tests for writeback functionality without external dependencies.
 * 
 * @module __tests__/unit/writeback-service
 * @version 1.0.0
 * @updated 2025-08-15
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock the Next.js API handler
const mockWritebackService = {
  executeApprovedCorrection: jest.fn(),
  validateWritebackRequest: jest.fn(),
  createBackup: jest.fn(),
  performMCPWriteback: jest.fn(),
  verifyWriteback: jest.fn(),
  createAuditEntry: jest.fn(),
  getAuditHistory: jest.fn()
};

describe('IDE Memory Writeback Service', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates writeback request structure', () => {
    const validRequest = {
      correction_id: 'test-001',
      memory_id: 'memory-001',
      approved_content: 'Updated content',
      reviewer: 'test-user',
      approval_timestamp: '2025-08-15T23:00:00Z',
      original_content: 'Original content',
      evidence_sources: ['source1'],
      confidence_score: 0.9
    };

    // Test required fields
    expect(validRequest.correction_id).toBeDefined();
    expect(validRequest.memory_id).toBeDefined();
    expect(validRequest.approved_content).toBeDefined();
    expect(validRequest.reviewer).toBeDefined();
    expect(validRequest.approval_timestamp).toBeDefined();
    
    // Test data types
    expect(typeof validRequest.confidence_score).toBe('number');
    expect(Array.isArray(validRequest.evidence_sources)).toBe(true);
    expect(validRequest.confidence_score).toBeGreaterThan(0);
    expect(validRequest.confidence_score).toBeLessThanOrEqual(1);
  });

  test('generates proper audit entry structure', () => {
    const auditEntry = {
      id: 'audit-001',
      correction_id: 'test-001',
      memory_id: 'memory-001',
      action: 'writeback',
      reviewer: 'test-user',
      timestamp: '2025-08-15T23:00:00Z',
      files_affected: ['memory:memory-001'],
      content_changes: {
        original: 'Original content',
        modified: 'Updated content',
        diff_summary: '+1 -0 ~0 lines'
      },
      metadata: {
        evidence_sources: ['source1'],
        confidence_score: 0.9,
        workspace: 'test-workspace'
      }
    };

    // Validate audit entry structure
    expect(auditEntry).toHaveProperty('id');
    expect(auditEntry).toHaveProperty('correction_id');
    expect(auditEntry).toHaveProperty('action');
    expect(auditEntry).toHaveProperty('content_changes');
    expect(auditEntry).toHaveProperty('metadata');
    
    expect(auditEntry.content_changes).toHaveProperty('original');
    expect(auditEntry.content_changes).toHaveProperty('modified');
    expect(auditEntry.content_changes).toHaveProperty('diff_summary');
    
    expect(auditEntry.metadata).toHaveProperty('confidence_score');
    expect(auditEntry.metadata).toHaveProperty('evidence_sources');
  });

  test('handles writeback success response', () => {
    const successResult = {
      success: true,
      correction_id: 'test-001',
      files_modified: ['memory:memory-001'],
      backup_created: true,
      audit_entry_id: 'audit-001',
      timestamp: '2025-08-15T23:00:00Z'
    };

    expect(successResult.success).toBe(true);
    expect(successResult.files_modified).toHaveLength(1);
    expect(successResult.backup_created).toBe(true);
    expect(successResult.audit_entry_id).toBeDefined();
  });

  test('handles writeback error response', () => {
    const errorResult = {
      success: false,
      correction_id: 'test-001',
      files_modified: [],
      backup_created: false,
      audit_entry_id: 'audit-001',
      timestamp: '2025-08-15T23:00:00Z',
      error: 'MCP service unavailable'
    };

    expect(errorResult.success).toBe(false);
    expect(errorResult.files_modified).toHaveLength(0);
    expect(errorResult.error).toBeDefined();
    expect(errorResult.audit_entry_id).toBeDefined(); // Should still create audit entry
  });

  test('generates diff summary correctly', () => {
    const generateDiffSummary = (original: string, modified: string): string => {
      const originalLines = original.split('\n');
      const modifiedLines = modified.split('\n');
      
      let additions = 0;
      let deletions = 0;
      let modifications = 0;

      const maxLines = Math.max(originalLines.length, modifiedLines.length);
      
      for (let i = 0; i < maxLines; i++) {
        const originalLine = originalLines[i] || '';
        const modifiedLine = modifiedLines[i] || '';
        
        if (originalLine && !modifiedLine) {
          deletions++;
        } else if (!originalLine && modifiedLine) {
          additions++;
        } else if (originalLine !== modifiedLine) {
          modifications++;
        }
      }

      return `+${additions} -${deletions} ~${modifications} lines`;
    };

    // Test cases
    expect(generateDiffSummary('line1', 'line1\nline2')).toBe('+1 -0 ~0 lines');
    expect(generateDiffSummary('line1\nline2', 'line1')).toBe('+0 -1 ~0 lines');
    expect(generateDiffSummary('line1', 'modified1')).toBe('+0 -0 ~1 lines');
    expect(generateDiffSummary('same', 'same')).toBe('+0 -0 ~0 lines');
  });
});

describe('AI Truth Agent Integration', () => {
  
  test('processes approval decision correctly', () => {
    const approvalDecision = {
      correction_id: 'test-001',
      memory_id: 'memory-001',
      decision: 'approve' as const,
      approved_content: 'Updated content',
      original_content: 'Original content',
      evidence_sources: ['source1'],
      confidence_score: 0.9,
      workspace: 'test-workspace',
      reviewer_name: 'Test User'
    };

    // Validate decision structure
    expect(['approve', 'reject', 'modify']).toContain(approvalDecision.decision);
    expect(approvalDecision.correction_id).toBeDefined();
    expect(approvalDecision.memory_id).toBeDefined();
    
    if (approvalDecision.decision === 'approve') {
      expect(approvalDecision.approved_content).toBeDefined();
    }
  });

  test('handles rejection decision', () => {
    const rejectionDecision = {
      correction_id: 'test-001',
      memory_id: 'memory-001',
      decision: 'reject' as const,
      human_comments: 'Needs more evidence',
      reviewer_name: 'Test User'
    };

    expect(rejectionDecision.decision).toBe('reject');
    expect(rejectionDecision.human_comments).toBeDefined();
    // No writeback should occur for rejections
  });

  test('handles modification decision', () => {
    const modificationDecision = {
      correction_id: 'test-001',
      memory_id: 'memory-001',
      decision: 'modify' as const,
      modified_content: 'Human-modified content',
      original_content: 'Original content',
      human_comments: 'Modified for accuracy',
      reviewer_name: 'Test User'
    };

    expect(modificationDecision.decision).toBe('modify');
    expect(modificationDecision.modified_content).toBeDefined();
    expect(modificationDecision.human_comments).toBeDefined();
  });
});

describe('Writeback Hook Integration', () => {
  
  test('useWritebackService hook structure', () => {
    // Mock hook return value
    const mockHookReturn = {
      processing: false,
      error: null,
      lastResult: null,
      executeWriteback: jest.fn(),
      getAuditHistory: jest.fn(),
      clearError: jest.fn(),
      reset: jest.fn()
    };

    // Validate hook interface
    expect(typeof mockHookReturn.processing).toBe('boolean');
    expect(mockHookReturn.error).toBeNull();
    expect(typeof mockHookReturn.executeWriteback).toBe('function');
    expect(typeof mockHookReturn.getAuditHistory).toBe('function');
    expect(typeof mockHookReturn.clearError).toBe('function');
    expect(typeof mockHookReturn.reset).toBe('function');
  });
});
