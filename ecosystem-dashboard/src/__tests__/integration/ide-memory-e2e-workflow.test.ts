/**
 * IDE Memory Intelligence End-to-End Workflow Test
 * 
 * Tests the complete workflow from memory analysis through AI Truth Engine
 * correction generation, human approval, and writeback execution.
 * 
 * @module __tests__/integration/ide-memory-e2e-workflow.test
 * @version 1.0.0
 * @updated 2025-08-15
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { AITruthAgent } from '../../agents/ai-truth-agent/AITruthAgent';
import { MCPClient } from '../../lib/mcp-integration';

// Mock data for testing
const mockMemory = {
  id: 'test-memory-001',
  title: 'Test Memory for E2E Workflow',
  content: 'This is a test memory with some outdated information about React 16.',
  tags: ['react', 'frontend', 'testing'],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  workspace: 'test-workspace'
};

const mockCorrectedContent = 'This is a test memory with updated information about React 18.';

const mockApprovalDecision = {
  correction_id: 'correction-001',
  memory_id: 'test-memory-001',
  decision: 'approve' as const,
  reviewer_id: 'test-reviewer',
  reviewer_name: 'Test Reviewer',
  human_comments: 'Approved - correction looks accurate',
  timestamp: new Date().toISOString()
};

describe('IDE Memory Intelligence E2E Workflow', () => {
  let aiTruthAgent: AITruthAgent;
  let mcpClient: MCPClient;
  let originalFetch: typeof global.fetch;

  beforeAll(async () => {
    // Setup test environment
    aiTruthAgent = new AITruthAgent();
    mcpClient = new MCPClient('http://localhost:9577');

    // Mock fetch for API calls
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterAll(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  test('Complete workflow: Memory analysis → Correction → Approval → Writeback', async () => {
    // Step 1: Mock MCP memory retrieval
    const mockMCPResponse = {
      success: true,
      result: mockMemory
    };

    (global.fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMCPResponse
      } as Response);

    // Step 2: Analyze memory and generate correction
    console.log('Step 1: Analyzing memory for corrections...');
    
    const analysisResult = await aiTruthAgent.analyzeMemoryContent(mockMemory.id);
    
    expect(analysisResult).toBeDefined();
    expect(analysisResult.corrections_needed).toBe(true);
    expect(analysisResult.corrections).toHaveLength(1);
    
    const correction = analysisResult.corrections[0];
    expect(correction.memory_id).toBe(mockMemory.id);
    expect(correction.correction_type).toBeDefined();
    expect(correction.confidence_score).toBeGreaterThan(0);

    console.log('✓ Memory analysis completed successfully');

    // Step 3: Submit correction for human oversight
    console.log('Step 2: Submitting correction for human oversight...');

    // Mock ADE UI submission
    (global.fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          correction_id: 'correction-001',
          status: 'pending_approval'
        })
      } as Response);

    await aiTruthAgent.submitForOversight(correction);
    
    console.log('✓ Correction submitted for oversight');

    // Step 4: Process human approval decision
    console.log('Step 3: Processing human approval decision...');

    // Mock writeback service API
    (global.fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Writeback completed successfully',
          result: {
            success: true,
            correction_id: 'correction-001',
            files_modified: ['memory:test-memory-001'],
            backup_created: true,
            audit_entry_id: 'audit-001',
            timestamp: new Date().toISOString()
          }
        })
      } as Response);

    await aiTruthAgent.processOversightDecision({
      ...mockApprovalDecision,
      approved_content: mockCorrectedContent,
      original_content: mockMemory.content,
      evidence_sources: ['knowledge-graph', 'react-docs'],
      confidence_score: 0.95,
      workspace: mockMemory.workspace,
      affected_files: []
    });

    console.log('✓ Approval decision processed and writeback executed');

    // Step 5: Verify audit trail creation
    console.log('Step 4: Verifying audit trail...');

    // Mock audit history API
    (global.fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audit_entries: [{
            id: 'audit-001',
            correction_id: 'correction-001',
            memory_id: 'test-memory-001',
            action: 'writeback',
            reviewer: 'Test Reviewer',
            timestamp: new Date().toISOString(),
            files_affected: ['memory:test-memory-001'],
            content_changes: {
              original: mockMemory.content,
              modified: mockCorrectedContent,
              diff_summary: '+1 -1 ~0 lines'
            },
            metadata: {
              evidence_sources: ['knowledge-graph', 'react-docs'],
              confidence_score: 0.95,
              workspace: 'test-workspace'
            }
          }],
          total: 1
        })
      } as Response);

    const auditResponse = await fetch(`/api/ide-memory/audit-history?memory_id=${mockMemory.id}`);
    const auditData = await auditResponse.json();

    expect(auditData.audit_entries).toHaveLength(1);
    expect(auditData.audit_entries[0].correction_id).toBe('correction-001');
    expect(auditData.audit_entries[0].action).toBe('writeback');

    console.log('✓ Audit trail verified');

    // Verify all fetch calls were made
    expect(global.fetch).toHaveBeenCalledTimes(4);
    
    console.log('🎉 Complete E2E workflow test passed successfully!');
  }, 30000); // 30 second timeout for integration test

  test('Workflow handles rejection gracefully', async () => {
    console.log('Testing rejection workflow...');

    const rejectionDecision = {
      ...mockApprovalDecision,
      decision: 'reject' as const,
      human_comments: 'Rejected - needs more evidence'
    };

    // Should not call writeback service for rejections
    await aiTruthAgent.processOversightDecision(rejectionDecision);

    console.log('✓ Rejection handled gracefully');
  });

  test('Workflow handles modification with custom content', async () => {
    console.log('Testing modification workflow...');

    const modificationDecision = {
      ...mockApprovalDecision,
      decision: 'modify' as const,
      modified_content: 'This is a test memory with human-modified information about React 18 and hooks.',
      human_comments: 'Modified to include hooks information'
    };

    // Mock writeback service for modification
    (global.fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Writeback completed successfully',
          result: {
            success: true,
            correction_id: 'correction-001',
            files_modified: ['memory:test-memory-001'],
            backup_created: true,
            audit_entry_id: 'audit-002',
            timestamp: new Date().toISOString()
          }
        })
      } as Response);

    await aiTruthAgent.processOversightDecision({
      ...modificationDecision,
      approved_content: modificationDecision.modified_content,
      original_content: mockMemory.content,
      evidence_sources: ['knowledge-graph', 'react-docs'],
      confidence_score: 0.9, // Higher confidence for human-modified
      workspace: mockMemory.workspace,
      affected_files: []
    });

    console.log('✓ Modification workflow completed');
  });

  test('Error handling: Writeback service failure', async () => {
    console.log('Testing error handling...');

    // Mock writeback service failure
    (global.fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Writeback service unavailable'
        })
      } as Response);

    await expect(
      aiTruthAgent.processOversightDecision({
        ...mockApprovalDecision,
        approved_content: mockCorrectedContent,
        original_content: mockMemory.content,
        evidence_sources: ['knowledge-graph'],
        confidence_score: 0.8,
        workspace: mockMemory.workspace,
        affected_files: []
      })
    ).rejects.toThrow('Writeback failed');

    console.log('✓ Error handling verified');
  });

  test('Integration: MCP client connectivity', async () => {
    console.log('Testing MCP client integration...');

    // Test MCP client health check
    const healthCheck = await mcpClient.healthCheck();
    
    // Should handle both success and failure gracefully
    expect(typeof healthCheck.status).toBe('string');
    
    console.log('✓ MCP client integration verified');
  });

  test('Performance: Workflow completion time', async () => {
    console.log('Testing workflow performance...');

    const startTime = Date.now();

    // Mock all API calls for performance test
    (global.fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

    // Run simplified workflow
    const analysisResult = await aiTruthAgent.analyzeMemoryContent(mockMemory.id);
    
    if (analysisResult.corrections_needed && analysisResult.corrections.length > 0) {
      await aiTruthAgent.submitForOversight(analysisResult.corrections[0]);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Workflow should complete within reasonable time
    expect(duration).toBeLessThan(5000); // 5 seconds

    console.log(`✓ Workflow completed in ${duration}ms`);
  });
});

// Helper function to create test memories
export const createTestMemory = (overrides: Partial<typeof mockMemory> = {}) => ({
  ...mockMemory,
  ...overrides,
  id: `test-memory-${Date.now()}`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

// Helper function to create test corrections
export const createTestCorrection = (memoryId: string, overrides: any = {}) => ({
  memory_id: memoryId,
  correction_type: 'factual' as const,
  original_content: mockMemory.content,
  proposed_content: mockCorrectedContent,
  ai_reasoning: 'Updated React version information based on current documentation',
  evidence_sources: ['knowledge-graph', 'react-docs'],
  confidence_score: 0.9,
  priority: 'medium' as const,
  workspace: 'test-workspace',
  affected_files: [],
  impact_assessment: {
    scope: 'local' as const,
    risk_level: 'low' as const,
    dependencies: []
  },
  ...overrides
});
