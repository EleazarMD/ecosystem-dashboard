/**
 * Knowledge Graph Reasoning Provider Component
 * 
 * This component provides a standardized way to integrate Knowledge Graph
 * reasoning capabilities into any part of the ecosystem dashboard.
 * 
 * @module KGReasoningProvider
 * @implements AI Homelab Ecosystem UI Standards v2.0
 */

import React, { useState, useCallback } from 'react';
import { KGMCPClient, MCPError } from '@/lib/kg-mcp-client';
import logger from '@/lib/logger';
import kgMCPMonitoring from '@/lib/kg-mcp-monitoring';

// Define component props
interface KGReasoningProviderProps {
  /**
   * Initial context to provide for reasoning
   */
  initialContext?: string;
  
  /**
   * Detail level for reasoning responses
   */
  detailLevel?: 'low' | 'medium' | 'high';
  
  /**
   * Optional callback when reasoning results are ready
   */
  onResult?: (result: any) => void;
  
  /**
   * Optional callback for errors
   */
  onError?: (error: MCPError) => void;
  
  /**
   * Whether to render the provider's UI
   */
  renderUI?: boolean;
  
  /**
   * Optional className for styling
   */
  className?: string;
  
  /**
   * Children components
   */
  children?: React.ReactNode;
}

/**
 * Knowledge Graph Reasoning Provider Component
 */
const KGReasoningProvider: React.FC<KGReasoningProviderProps> = ({
  initialContext = '',
  detailLevel = 'medium',
  onResult,
  onError,
  renderUI = true,
  className = '',
  children
}) => {
  // State for the reasoning provider
  const [question, setQuestion] = useState<string>('');
  const [context, setContext] = useState<string>(initialContext);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<MCPError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [kgClient] = useState<KGMCPClient>(() => new KGMCPClient());
  
  /**
   * Execute reasoning query against the Knowledge Graph
   * 
   * @param questionText Question to ask
   * @param contextText Optional context to provide
   * @param detail Detail level for response
   */
  const executeReasoning = useCallback(async (
    questionText: string,
    contextText: string = context,
    detail: 'low' | 'medium' | 'high' = detailLevel
  ) => {
    if (!questionText) return;
    
    setIsLoading(true);
    setError(null);
    
    // Start monitoring
    const operationMetrics = kgMCPMonitoring.startOperation(
      'apply_reasoning',
      `reason_${Date.now()}`
    );
    
    try {
      logger.info('[KG-REASON] Executing reasoning query', { 
        question: questionText,
        context: contextText ? '[context provided]' : '[no context]',
        detail_level: detail,
        request_id: operationMetrics.requestId
      });
      
      // Execute the reasoning query
      const reasoningResult = await kgClient.reasonOverKnowledgeGraph(
        questionText,
        {
          context: contextText,
          detail_level: detail
        }
      );
      
      // Update state with result
      setResult(reasoningResult);
      
      // Call onResult callback if provided
      if (onResult) {
        onResult(reasoningResult);
      }
      
      // Complete monitoring with success
      kgMCPMonitoring.completeOperation(
        operationMetrics.requestId,
        'success'
      );
      
      return reasoningResult;
    } catch (err: any) {
      // Handle error
      logger.error('[KG-REASON] Error executing reasoning query', { 
        error: err,
        request_id: operationMetrics.requestId 
      });
      
      const mcpError = err instanceof MCPError ? 
        err : 
        new MCPError(
          err.message || 'Unknown error during reasoning',
          err.code || 'REASONING_ERROR',
          err.statusCode || 500
        );
      
      // Update error state
      setError(mcpError);
      
      // Call onError callback if provided
      if (onError) {
        onError(mcpError);
      }
      
      // Complete monitoring with error
      kgMCPMonitoring.completeOperation(
        operationMetrics.requestId,
        'error',
        {
          code: mcpError.code,
          message: mcpError.message
        }
      );
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [context, detailLevel, kgClient, onError, onResult]);
  
  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    executeReasoning(question, context, detailLevel);
  }, [question, context, detailLevel, executeReasoning]);
  
  // Render UI if requested
  if (renderUI) {
    return (
      <div className={`kg-reasoning-provider ${className}`}>
        <form onSubmit={handleSubmit} className="kg-reasoning-form">
          <div className="form-group">
            <label htmlFor="kg-question">Question for Knowledge Graph</label>
            <input
              type="text"
              id="kg-question"
              className="form-control"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about the ecosystem..."
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="kg-context">Context (Optional)</label>
            <textarea
              id="kg-context"
              className="form-control"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Provide additional context to improve reasoning..."
              rows={3}
            />
          </div>
          
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !question.trim()}
            >
              {isLoading ? 'Processing...' : 'Get Insights'}
            </button>
            
            <div className="detail-level-selector">
              <label>Detail Level:</label>
              <div className="btn-group">
                {['low', 'medium', 'high'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`btn btn-sm ${detailLevel === level ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    onClick={() => setContext(level as any)}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>
        
        {error && (
          <div className="kg-reasoning-error alert alert-danger">
            <h4>Error</h4>
            <p>{error.message}</p>
            {error.code && <p>Code: {error.code}</p>}
          </div>
        )}
        
        {result && (
          <div className="kg-reasoning-result">
            <h3>Knowledge Graph Insights</h3>
            <div className="result-content">
              <p className="result-text">{result.result}</p>
              
              {result.confidence && (
                <div className="result-confidence">
                  <span>Confidence: </span>
                  <div 
                    className="confidence-bar" 
                    style={{
                      width: `${Math.round(result.confidence * 100)}%`,
                      backgroundColor: result.confidence > 0.8 ? '#28a745' : result.confidence > 0.5 ? '#ffc107' : '#dc3545'
                    }}
                  />
                  <span>{Math.round(result.confidence * 100)}%</span>
                </div>
              )}
              
              {result.sources && result.sources.length > 0 && (
                <div className="result-sources">
                  <h4>Sources</h4>
                  <ul>
                    {result.sources.map((source: string, index: number) => (
                      <li key={index}>{source}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        {children}
      </div>
    );
  }
  
  // If not rendering UI, just return children with context
  return (
    <div className={`kg-reasoning-context ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            executeReasoning,
            reasoningResult: result,
            reasoningError: error,
            isLoading
          });
        }
        return child;
      })}
    </div>
  );
};

export default KGReasoningProvider;
