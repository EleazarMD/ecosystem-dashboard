/**
 * Knowledge Graph Orchestration Types
 * 
 * Shared types for KG orchestration requests and responses to ensure
 * consistency between API endpoints and UI components.
 */

// Base orchestration request structure
export interface OrchestrationRequest {
  query: string;
  context?: {
    pageType?: string;
    section?: string;
    entityId?: string;
    entityType?: string;
    viewMode?: string;
    features?: string[];
    source?: string;
    user?: string;
  };
  options?: {
    mode?: 'comprehensive' | 'quick' | 'focused';
    maxAgents?: number;
    timeout?: number;
    includeEvidence?: boolean;
    includeRecommendations?: boolean;
  };
}

// Agent-specific result structure
export interface AgentResult {
  agent: string;
  success: boolean;
  result: any;
  executionTime?: number;
  error?: string;
}

// Evidence item structure
export interface Evidence {
  type: 'document' | 'memory' | 'entity' | 'relationship';
  source: string;
  content: string;
  confidence: number;
  metadata?: Record<string, any>;
}

// Recommendation structure
export interface Recommendation {
  type: 'action' | 'troubleshooting' | 'optimization' | 'information';
  title: string;
  description: string;
  action?: string;
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

// Normalized orchestration result
export interface OrchestrationResult {
  answer: string;
  summary: string;
  confidence: number;
  sources: string[];
  data: AgentResult[];
  evidence: Evidence[];
  recommendations: Recommendation[];
  executionPlan?: any;
  agentsUsed: string[];
}

// Complete orchestration response
export interface OrchestrationResponse {
  success: boolean;
  executionId: string;
  query: string;
  result: OrchestrationResult;
  metadata: {
    executionTime: number;
    agentsInvolved: number;
    mode: string;
    timestamp: string;
  };
  error?: string;
}

// Raw orchestrator response (what we receive from the KG service)
export interface RawOrchestratorResponse {
  success?: boolean;
  executionId?: string;
  result?: {
    answer?: string;
    summary?: string;
    confidence?: number;
    sources?: string[];
    data?: any[];
    evidence?: any[];
    recommendations?: any[];
    agentsUsed?: string[];
  };
  answer?: string;
  summary?: string;
  confidence?: number;
  sources?: string[];
  data?: any[];
  evidence?: any[];
  recommendations?: any[];
  agentsUsed?: string[];
  executionPlan?: any;
  plan?: any;
  error?: string;
}

// Memory-specific result structure for better type safety
export interface MemoryResult {
  count?: number;
  message?: string;
  synthetic?: boolean;
  analysis?: string;
  suggestions?: string[];
  memories?: any[];
}

// Utility functions for response normalization
export class OrchestrationResponseNormalizer {
  static normalize(rawResponse: RawOrchestratorResponse, query: string, executionId: string): OrchestrationResult {
    // Extract data from nested result or top-level
    const resultData = rawResponse.result || rawResponse;
    
    // Normalize answer/summary
    const answer = resultData.answer || resultData.summary || 'No response received';
    const summary = resultData.summary || resultData.answer || this.generateSummaryFromData(resultData.data);
    
    // Normalize confidence
    const confidence = resultData.confidence || (answer !== 'No response received' ? 0.8 : 0.0);
    
    // Normalize sources
    const sources = resultData.sources || resultData.agentsUsed || [];
    
    // Normalize data array
    const data = this.normalizeDataArray(resultData.data || []);
    
    // Normalize evidence
    const evidence = this.normalizeEvidence(resultData.evidence || []);
    
    // Normalize recommendations
    const recommendations = this.normalizeRecommendations(resultData.recommendations || []);
    
    // Normalize agents used
    const agentsUsed = resultData.agentsUsed || sources || [];

    return {
      answer,
      summary,
      confidence,
      sources,
      data,
      evidence,
      recommendations,
      executionPlan: resultData.executionPlan || rawResponse.executionPlan || rawResponse.plan,
      agentsUsed
    };
  }

  private static generateSummaryFromData(data: any[]): string {
    if (!data || data.length === 0) {
      return 'No results found';
    }

    // Try to extract meaningful summary from agent results
    for (const item of data) {
      if (item.agent === 'memory' && item.result?.result?.result?.result) {
        const memResult = item.result.result.result.result as MemoryResult;
        if (memResult.count !== undefined) {
          return `${memResult.message || memResult.count + ' memories found'}${memResult.synthetic ? ' (synthetic data)' : ''}`;
        }
        if (memResult.analysis) {
          return `${memResult.analysis}. ${memResult.suggestions?.join('. ') || ''}`;
        }
      }
    }

    return `Query processed with ${data.length} agent result${data.length !== 1 ? 's' : ''}`;
  }

  private static normalizeDataArray(data: any[]): AgentResult[] {
    if (!Array.isArray(data)) return [];
    
    return data.map(item => ({
      agent: item.agent || 'unknown',
      success: item.success !== false,
      result: item.result || item,
      executionTime: item.executionTime,
      error: item.error
    }));
  }

  private static normalizeEvidence(evidence: any[]): Evidence[] {
    if (!Array.isArray(evidence)) return [];
    
    return evidence.map(item => ({
      type: item.type || 'document',
      source: item.source || 'unknown',
      content: item.content || item.text || String(item),
      confidence: item.confidence || 0.8,
      metadata: item.metadata || {}
    }));
  }

  private static normalizeRecommendations(recommendations: any[]): Recommendation[] {
    if (!Array.isArray(recommendations)) return [];
    
    return recommendations.map(item => ({
      type: item.type || 'information',
      title: item.title || 'Recommendation',
      description: item.description || item.content || String(item),
      action: item.action,
      priority: item.priority || 'medium',
      metadata: item.metadata || {}
    }));
  }
}

// Type guards for runtime validation
export function isOrchestrationResponse(obj: any): obj is OrchestrationResponse {
  return obj && 
    typeof obj.success === 'boolean' &&
    typeof obj.executionId === 'string' &&
    typeof obj.query === 'string' &&
    obj.result &&
    typeof obj.result.answer === 'string' &&
    obj.metadata &&
    typeof obj.metadata.executionTime === 'number';
}

export function isValidOrchestrationRequest(obj: any): obj is OrchestrationRequest {
  return obj && 
    typeof obj.query === 'string' && 
    obj.query.trim().length > 0;
}
