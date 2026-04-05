/**
 * IDE Memory Writeback Service Hook
 * 
 * React hook for managing approved AI Truth Engine corrections writeback.
 * Handles API communication, state management, and error handling.
 * 
 * @module hooks/useWritebackService
 * @version 1.0.0
 * @updated 2025-08-15
 */

import { useState, useCallback } from 'react';

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

interface WritebackState {
  processing: boolean;
  error: string | null;
  lastResult: WritebackResult | null;
}

export const useWritebackService = () => {
  const [state, setState] = useState<WritebackState>({
    processing: false,
    error: null,
    lastResult: null
  });

  /**
   * Execute approved correction writeback
   */
  const executeWriteback = useCallback(async (request: WritebackRequest): Promise<WritebackResult> => {
    setState(prev => ({ ...prev, processing: true, error: null }));

    try {
      console.log(`[Writeback Hook] Executing writeback for correction: ${request.correction_id}`);

      const response = await fetch('/api/ide-memory/writeback-service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const result = data.result as WritebackResult;

      setState(prev => ({
        ...prev,
        processing: false,
        lastResult: result,
        error: result.success ? null : result.error || 'Writeback failed'
      }));

      console.log(`[Writeback Hook] Writeback completed:`, result);
      return result;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to execute writeback';
      console.error(`[Writeback Hook] Writeback failed:`, error);

      setState(prev => ({
        ...prev,
        processing: false,
        error: errorMessage,
        lastResult: null
      }));

      throw error;
    }
  }, []);

  /**
   * Get audit history for a memory
   */
  const getAuditHistory = useCallback(async (memoryId: string) => {
    try {
      const response = await fetch(`/api/ide-memory/audit-history?memory_id=${memoryId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audit history: ${response.statusText}`);
      }

      const data = await response.json();
      return data.audit_entries || [];

    } catch (error: any) {
      console.error(`[Writeback Hook] Failed to get audit history:`, error);
      throw error;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    setState({
      processing: false,
      error: null,
      lastResult: null
    });
  }, []);

  return {
    // State
    processing: state.processing,
    error: state.error,
    lastResult: state.lastResult,

    // Actions
    executeWriteback,
    getAuditHistory,
    clearError,
    reset
  };
};

export default useWritebackService;
