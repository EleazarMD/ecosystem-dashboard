/**
 * Knowledge Graph Response Validation Utilities
 * 
 * Provides validation and error handling utilities for KG orchestration responses
 */

import { OrchestrationResponse, OrchestrationRequest } from '@/types/kg-orchestration';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export class KGResponseValidator {
  /**
   * Validate an orchestration request before sending to API
   */
  static validateRequest(request: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!request.query || typeof request.query !== 'string') {
      errors.push({
        field: 'query',
        message: 'Query is required and must be a string',
        code: 'MISSING_QUERY'
      });
    } else if (request.query.trim().length === 0) {
      errors.push({
        field: 'query',
        message: 'Query cannot be empty',
        code: 'EMPTY_QUERY'
      });
    } else if (request.query.length > 1000) {
      warnings.push('Query is very long and may timeout');
    }

    // Optional context validation
    if (request.context) {
      if (request.context.source && typeof request.context.source !== 'string') {
        errors.push({
          field: 'context.source',
          message: 'Context source must be a string',
          code: 'INVALID_CONTEXT_SOURCE'
        });
      }
    }

    // Optional options validation
    if (request.options) {
      if (request.options.mode && !['comprehensive', 'quick', 'focused'].includes(request.options.mode)) {
        errors.push({
          field: 'options.mode',
          message: 'Mode must be one of: comprehensive, quick, focused',
          code: 'INVALID_MODE'
        });
      }

      if (request.options.timeout && (typeof request.options.timeout !== 'number' || request.options.timeout < 1000)) {
        errors.push({
          field: 'options.timeout',
          message: 'Timeout must be a number >= 1000ms',
          code: 'INVALID_TIMEOUT'
        });
      }

      if (request.options.maxAgents && (typeof request.options.maxAgents !== 'number' || request.options.maxAgents < 1)) {
        errors.push({
          field: 'options.maxAgents',
          message: 'MaxAgents must be a positive number',
          code: 'INVALID_MAX_AGENTS'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate an orchestration response from the API
   */
  static validateResponse(response: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check basic structure
    if (!response || typeof response !== 'object') {
      errors.push({
        field: 'response',
        message: 'Response must be an object',
        code: 'INVALID_RESPONSE_TYPE'
      });
      return { isValid: false, errors, warnings };
    }

    // Required fields
    if (typeof response.success !== 'boolean') {
      errors.push({
        field: 'success',
        message: 'Success field is required and must be boolean',
        code: 'MISSING_SUCCESS'
      });
    }

    if (!response.executionId || typeof response.executionId !== 'string') {
      errors.push({
        field: 'executionId',
        message: 'ExecutionId is required and must be a string',
        code: 'MISSING_EXECUTION_ID'
      });
    }

    if (!response.query || typeof response.query !== 'string') {
      errors.push({
        field: 'query',
        message: 'Query is required and must be a string',
        code: 'MISSING_QUERY'
      });
    }

    // Result validation
    if (!response.result || typeof response.result !== 'object') {
      errors.push({
        field: 'result',
        message: 'Result is required and must be an object',
        code: 'MISSING_RESULT'
      });
    } else {
      const result = response.result;

      // Required result fields
      if (typeof result.answer !== 'string') {
        errors.push({
          field: 'result.answer',
          message: 'Result answer must be a string',
          code: 'INVALID_ANSWER'
        });
      }

      if (typeof result.summary !== 'string') {
        errors.push({
          field: 'result.summary',
          message: 'Result summary must be a string',
          code: 'INVALID_SUMMARY'
        });
      }

      if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
        errors.push({
          field: 'result.confidence',
          message: 'Result confidence must be a number between 0 and 1',
          code: 'INVALID_CONFIDENCE'
        });
      }

      if (!Array.isArray(result.sources)) {
        errors.push({
          field: 'result.sources',
          message: 'Result sources must be an array',
          code: 'INVALID_SOURCES'
        });
      }

      if (!Array.isArray(result.data)) {
        errors.push({
          field: 'result.data',
          message: 'Result data must be an array',
          code: 'INVALID_DATA'
        });
      }

      if (!Array.isArray(result.evidence)) {
        errors.push({
          field: 'result.evidence',
          message: 'Result evidence must be an array',
          code: 'INVALID_EVIDENCE'
        });
      }

      if (!Array.isArray(result.recommendations)) {
        errors.push({
          field: 'result.recommendations',
          message: 'Result recommendations must be an array',
          code: 'INVALID_RECOMMENDATIONS'
        });
      }

      if (!Array.isArray(result.agentsUsed)) {
        errors.push({
          field: 'result.agentsUsed',
          message: 'Result agentsUsed must be an array',
          code: 'INVALID_AGENTS_USED'
        });
      }

      // Warnings for empty results
      if (result.answer === 'No response received' || result.summary === 'No results found') {
        warnings.push('Response indicates no results were found');
      }

      if (result.confidence < 0.3) {
        warnings.push('Response has low confidence score');
      }

      if (result.data.length === 0 && result.evidence.length === 0) {
        warnings.push('Response contains no data or evidence');
      }
    }

    // Metadata validation
    if (!response.metadata || typeof response.metadata !== 'object') {
      errors.push({
        field: 'metadata',
        message: 'Metadata is required and must be an object',
        code: 'MISSING_METADATA'
      });
    } else {
      const metadata = response.metadata;

      if (typeof metadata.executionTime !== 'number' || metadata.executionTime < 0) {
        errors.push({
          field: 'metadata.executionTime',
          message: 'Metadata executionTime must be a non-negative number',
          code: 'INVALID_EXECUTION_TIME'
        });
      }

      if (typeof metadata.agentsInvolved !== 'number' || metadata.agentsInvolved < 0) {
        errors.push({
          field: 'metadata.agentsInvolved',
          message: 'Metadata agentsInvolved must be a non-negative number',
          code: 'INVALID_AGENTS_INVOLVED'
        });
      }

      if (!metadata.timestamp || typeof metadata.timestamp !== 'string') {
        errors.push({
          field: 'metadata.timestamp',
          message: 'Metadata timestamp is required and must be a string',
          code: 'INVALID_TIMESTAMP'
        });
      }

      // Performance warnings
      if (metadata.executionTime > 30000) {
        warnings.push('Query took longer than 30 seconds to execute');
      }

      if (metadata.agentsInvolved === 0 && response.success) {
        warnings.push('Successful response but no agents were involved');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Sanitize and normalize a raw response for safe consumption
   */
  static sanitizeResponse(response: any): Partial<OrchestrationResponse> {
    if (!response || typeof response !== 'object') {
      return {
        success: false,
        executionId: `sanitized-${Date.now()}`,
        query: '',
        result: {
          answer: 'Invalid response received',
          summary: 'Response could not be processed',
          confidence: 0,
          sources: [],
          data: [],
          evidence: [],
          recommendations: [],
          agentsUsed: []
        },
        metadata: {
          executionTime: 0,
          agentsInvolved: 0,
          mode: 'unknown',
          timestamp: new Date().toISOString()
        },
        error: 'Response sanitization required'
      };
    }

    // Ensure all required fields exist with safe defaults
    return {
      success: Boolean(response.success),
      executionId: String(response.executionId || `sanitized-${Date.now()}`),
      query: String(response.query || ''),
      result: {
        answer: String(response.result?.answer || 'No answer provided'),
        summary: String(response.result?.summary || response.result?.answer || 'No summary available'),
        confidence: Math.max(0, Math.min(1, Number(response.result?.confidence) || 0)),
        sources: Array.isArray(response.result?.sources) ? response.result.sources : [],
        data: Array.isArray(response.result?.data) ? response.result.data : [],
        evidence: Array.isArray(response.result?.evidence) ? response.result.evidence : [],
        recommendations: Array.isArray(response.result?.recommendations) ? response.result.recommendations : [],
        agentsUsed: Array.isArray(response.result?.agentsUsed) ? response.result.agentsUsed : []
      },
      metadata: {
        executionTime: Math.max(0, Number(response.metadata?.executionTime) || 0),
        agentsInvolved: Math.max(0, Number(response.metadata?.agentsInvolved) || 0),
        mode: String(response.metadata?.mode || 'unknown'),
        timestamp: String(response.metadata?.timestamp || new Date().toISOString())
      },
      error: response.error ? String(response.error) : undefined
    };
  }
}

/**
 * Circuit breaker for KG orchestration calls
 */
export class KGCircuitBreaker {
  private static readonly FAILURE_THRESHOLD = 3;
  private static readonly RESET_TIMEOUT = 60000; // 60 seconds
  private static readonly STORAGE_KEY = 'kg_circuit_breaker';

  static isOpen(): boolean {
    const state = this.getState();
    if (state.failures.length < this.FAILURE_THRESHOLD) {
      return false;
    }

    // Check if we should reset (all failures are old)
    const now = Date.now();
    const recentFailures = state.failures.filter(timestamp => 
      now - timestamp < this.RESET_TIMEOUT
    );

    if (recentFailures.length < this.FAILURE_THRESHOLD) {
      // Reset the circuit breaker
      this.setState({ failures: recentFailures, lastFailure: state.lastFailure });
      return false;
    }

    return true;
  }

  static recordFailure(): void {
    const state = this.getState();
    const now = Date.now();
    
    // Add new failure and filter old ones
    const failures = [...state.failures, now].filter(timestamp => 
      now - timestamp < this.RESET_TIMEOUT
    );

    this.setState({ failures, lastFailure: now });
  }

  static recordSuccess(): void {
    // Reset on success
    this.setState({ failures: [], lastFailure: null });
  }

  static getFailureCount(): number {
    const state = this.getState();
    const now = Date.now();
    return state.failures.filter(timestamp => 
      now - timestamp < this.RESET_TIMEOUT
    ).length;
  }

  private static getState(): { failures: number[], lastFailure: number | null } {
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : { failures: [], lastFailure: null };
    } catch {
      return { failures: [], lastFailure: null };
    }
  }

  private static setState(state: { failures: number[], lastFailure: number | null }): void {
    try {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }
}
