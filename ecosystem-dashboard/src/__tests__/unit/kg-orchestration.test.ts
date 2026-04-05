/**
 * Unit Tests for Knowledge Graph Orchestration
 * 
 * Tests for response normalization, validation, and circuit breaker functionality
 */

import { 
  OrchestrationResponseNormalizer, 
  OrchestrationResponse,
  RawOrchestratorResponse 
} from '@/types/kg-orchestration';
import { KGResponseValidator, KGCircuitBreaker } from '@/utils/kg-validation';

describe('OrchestrationResponseNormalizer', () => {
  beforeEach(() => {
    // Reset any stored state
    sessionStorage.clear();
  });

  describe('normalize', () => {
    it('should normalize a complete raw response', () => {
      const rawResponse: RawOrchestratorResponse = {
        success: true,
        executionId: 'test-123',
        result: {
          answer: 'Test answer',
          summary: 'Test summary',
          confidence: 0.9,
          sources: ['agent1', 'agent2'],
          data: [{ agent: 'memory', success: true, result: { count: 5 } }],
          evidence: [{ type: 'document', content: 'test evidence' }],
          recommendations: [{ type: 'action', title: 'Test rec' }],
          agentsUsed: ['memory', 'search']
        }
      };

      const normalized = OrchestrationResponseNormalizer.normalize(rawResponse, 'test query', 'test-123');

      expect(normalized.answer).toBe('Test answer');
      expect(normalized.summary).toBe('Test summary');
      expect(normalized.confidence).toBe(0.9);
      expect(normalized.sources).toEqual(['agent1', 'agent2']);
      expect(normalized.data).toHaveLength(1);
      expect(normalized.evidence).toHaveLength(1);
      expect(normalized.recommendations).toHaveLength(1);
      expect(normalized.agentsUsed).toEqual(['memory', 'search']);
    });

    it('should handle minimal raw response', () => {
      const rawResponse: RawOrchestratorResponse = {
        answer: 'Simple answer'
      };

      const normalized = OrchestrationResponseNormalizer.normalize(rawResponse, 'test query', 'test-123');

      expect(normalized.answer).toBe('Simple answer');
      expect(normalized.summary).toBe('Simple answer');
      expect(normalized.confidence).toBe(0.8);
      expect(normalized.sources).toEqual([]);
      expect(normalized.data).toEqual([]);
      expect(normalized.evidence).toEqual([]);
      expect(normalized.recommendations).toEqual([]);
      expect(normalized.agentsUsed).toEqual([]);
    });

    it('should handle empty response', () => {
      const rawResponse: RawOrchestratorResponse = {};

      const normalized = OrchestrationResponseNormalizer.normalize(rawResponse, 'test query', 'test-123');

      expect(normalized.answer).toBe('No response received');
      expect(normalized.summary).toBe('No results found');
      expect(normalized.confidence).toBe(0.0);
      expect(normalized.sources).toEqual([]);
      expect(normalized.data).toEqual([]);
      expect(normalized.evidence).toEqual([]);
      expect(normalized.recommendations).toEqual([]);
      expect(normalized.agentsUsed).toEqual([]);
    });

    it('should generate summary from memory data when available', () => {
      const rawResponse: RawOrchestratorResponse = {
        result: {
          data: [{
            agent: 'memory',
            result: {
              result: {
                result: {
                  result: {
                    count: 3,
                    message: '3 memories found',
                    synthetic: false
                  }
                }
              }
            }
          }]
        }
      };

      const normalized = OrchestrationResponseNormalizer.normalize(rawResponse, 'test query', 'test-123');

      expect(normalized.summary).toBe('3 memories found');
      expect(normalized.answer).toBe('No response received');
    });

    it('should handle synthetic memory data', () => {
      const rawResponse: RawOrchestratorResponse = {
        result: {
          data: [{
            agent: 'memory',
            result: {
              result: {
                result: {
                  result: {
                    count: 5,
                    synthetic: true
                  }
                }
              }
            }
          }]
        }
      };

      const normalized = OrchestrationResponseNormalizer.normalize(rawResponse, 'test query', 'test-123');

      expect(normalized.summary).toBe('5 memories found (synthetic data)');
    });

    it('should handle memory analysis data', () => {
      const rawResponse: RawOrchestratorResponse = {
        result: {
          data: [{
            agent: 'memory',
            result: {
              result: {
                result: {
                  result: {
                    analysis: 'Memory analysis complete',
                    suggestions: ['Suggestion 1', 'Suggestion 2']
                  }
                }
              }
            }
          }]
        }
      };

      const normalized = OrchestrationResponseNormalizer.normalize(rawResponse, 'test query', 'test-123');

      expect(normalized.summary).toBe('Memory analysis complete. Suggestion 1. Suggestion 2');
    });
  });
});

describe('KGResponseValidator', () => {
  describe('validateRequest', () => {
    it('should validate a complete request', () => {
      const request = {
        query: 'Test query',
        context: {
          source: 'test',
          pageType: 'dashboard'
        },
        options: {
          mode: 'comprehensive' as const,
          timeout: 30000,
          maxAgents: 5
        }
      };

      const result = KGResponseValidator.validateRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject request without query', () => {
      const request = {};

      const result = KGResponseValidator.validateRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_QUERY');
    });

    it('should reject request with empty query', () => {
      const request = { query: '   ' };

      const result = KGResponseValidator.validateRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EMPTY_QUERY');
    });

    it('should warn about long queries', () => {
      const request = { query: 'a'.repeat(1001) };

      const result = KGResponseValidator.validateRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Query is very long and may timeout');
    });

    it('should validate options', () => {
      const request = {
        query: 'Test query',
        options: {
          mode: 'invalid' as any,
          timeout: 500,
          maxAgents: -1
        }
      };

      const result = KGResponseValidator.validateRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.map(e => e.code)).toContain('INVALID_MODE');
      expect(result.errors.map(e => e.code)).toContain('INVALID_TIMEOUT');
      expect(result.errors.map(e => e.code)).toContain('INVALID_MAX_AGENTS');
    });
  });

  describe('validateResponse', () => {
    it('should validate a complete response', () => {
      const response: OrchestrationResponse = {
        success: true,
        executionId: 'test-123',
        query: 'Test query',
        result: {
          answer: 'Test answer',
          summary: 'Test summary',
          confidence: 0.8,
          sources: ['agent1'],
          data: [],
          evidence: [],
          recommendations: [],
          agentsUsed: ['agent1']
        },
        metadata: {
          executionTime: 1000,
          agentsInvolved: 1,
          mode: 'comprehensive',
          timestamp: new Date().toISOString()
        }
      };

      const result = KGResponseValidator.validateResponse(response);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid response structure', () => {
      const response = null;

      const result = KGResponseValidator.validateResponse(response);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_RESPONSE_TYPE');
    });

    it('should validate required fields', () => {
      const response = {
        // Missing required fields
      };

      const result = KGResponseValidator.validateResponse(response);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.map(e => e.code)).toContain('MISSING_SUCCESS');
      expect(result.errors.map(e => e.code)).toContain('MISSING_EXECUTION_ID');
      expect(result.errors.map(e => e.code)).toContain('MISSING_QUERY');
      expect(result.errors.map(e => e.code)).toContain('MISSING_RESULT');
      expect(result.errors.map(e => e.code)).toContain('MISSING_METADATA');
    });

    it('should warn about low confidence', () => {
      const response = {
        success: true,
        executionId: 'test-123',
        query: 'Test query',
        result: {
          answer: 'Test answer',
          summary: 'Test summary',
          confidence: 0.2, // Low confidence
          sources: [],
          data: [],
          evidence: [],
          recommendations: [],
          agentsUsed: []
        },
        metadata: {
          executionTime: 1000,
          agentsInvolved: 0,
          mode: 'comprehensive',
          timestamp: new Date().toISOString()
        }
      };

      const result = KGResponseValidator.validateResponse(response);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Response has low confidence score');
    });

    it('should warn about no results', () => {
      const response = {
        success: true,
        executionId: 'test-123',
        query: 'Test query',
        result: {
          answer: 'No response received',
          summary: 'No results found',
          confidence: 0.8,
          sources: [],
          data: [],
          evidence: [],
          recommendations: [],
          agentsUsed: []
        },
        metadata: {
          executionTime: 1000,
          agentsInvolved: 0,
          mode: 'comprehensive',
          timestamp: new Date().toISOString()
        }
      };

      const result = KGResponseValidator.validateResponse(response);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Response indicates no results were found');
      expect(result.warnings).toContain('Response contains no data or evidence');
    });
  });

  describe('sanitizeResponse', () => {
    it('should sanitize invalid response', () => {
      const response = null;

      const sanitized = KGResponseValidator.sanitizeResponse(response);

      expect(sanitized.success).toBe(false);
      expect(sanitized.result?.answer).toBe('Invalid response received');
      expect(sanitized.result?.summary).toBe('Response could not be processed');
      expect(sanitized.error).toBe('Response sanitization required');
    });

    it('should sanitize partial response', () => {
      const response = {
        success: true,
        result: {
          answer: 'Test answer'
          // Missing other fields
        }
      };

      const sanitized = KGResponseValidator.sanitizeResponse(response);

      expect(sanitized.success).toBe(true);
      expect(sanitized.result?.answer).toBe('Test answer');
      expect(sanitized.result?.summary).toBe('Test answer');
      expect(sanitized.result?.confidence).toBe(0);
      expect(Array.isArray(sanitized.result?.sources)).toBe(true);
      expect(Array.isArray(sanitized.result?.data)).toBe(true);
    });

    it('should clamp confidence values', () => {
      const response = {
        success: true,
        result: {
          confidence: 1.5 // Invalid confidence > 1
        }
      };

      const sanitized = KGResponseValidator.sanitizeResponse(response);

      expect(sanitized.result?.confidence).toBe(1);
    });
  });
});

describe('KGCircuitBreaker', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should start closed', () => {
    expect(KGCircuitBreaker.isOpen()).toBe(false);
    expect(KGCircuitBreaker.getFailureCount()).toBe(0);
  });

  it('should open after threshold failures', () => {
    // Record 3 failures (threshold)
    KGCircuitBreaker.recordFailure();
    KGCircuitBreaker.recordFailure();
    KGCircuitBreaker.recordFailure();

    expect(KGCircuitBreaker.isOpen()).toBe(true);
    expect(KGCircuitBreaker.getFailureCount()).toBe(3);
  });

  it('should reset on success', () => {
    // Record failures
    KGCircuitBreaker.recordFailure();
    KGCircuitBreaker.recordFailure();

    expect(KGCircuitBreaker.getFailureCount()).toBe(2);

    // Record success
    KGCircuitBreaker.recordSuccess();

    expect(KGCircuitBreaker.getFailureCount()).toBe(0);
    expect(KGCircuitBreaker.isOpen()).toBe(false);
  });

  it('should reset after timeout', (done) => {
    // Mock Date.now to control time
    const originalNow = Date.now;
    let mockTime = 1000000;
    Date.now = jest.fn(() => mockTime);

    try {
      // Record 3 failures
      KGCircuitBreaker.recordFailure();
      KGCircuitBreaker.recordFailure();
      KGCircuitBreaker.recordFailure();

      expect(KGCircuitBreaker.isOpen()).toBe(true);

      // Advance time by more than reset timeout (60 seconds)
      mockTime += 61000;

      expect(KGCircuitBreaker.isOpen()).toBe(false);
      expect(KGCircuitBreaker.getFailureCount()).toBe(0);

      done();
    } finally {
      Date.now = originalNow;
    }
  });

  it('should handle storage errors gracefully', () => {
    // Mock sessionStorage to throw errors
    const originalSetItem = sessionStorage.setItem;
    const originalGetItem = sessionStorage.getItem;

    sessionStorage.setItem = jest.fn(() => {
      throw new Error('Storage error');
    });
    sessionStorage.getItem = jest.fn(() => {
      throw new Error('Storage error');
    });

    try {
      // Should not throw errors
      expect(() => KGCircuitBreaker.recordFailure()).not.toThrow();
      expect(() => KGCircuitBreaker.recordSuccess()).not.toThrow();
      expect(() => KGCircuitBreaker.isOpen()).not.toThrow();
      expect(() => KGCircuitBreaker.getFailureCount()).not.toThrow();
    } finally {
      sessionStorage.setItem = originalSetItem;
      sessionStorage.getItem = originalGetItem;
    }
  });
});
