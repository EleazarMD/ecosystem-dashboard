/**
 * Knowledge Graph Visualizer Component
 * 
 * This component integrates with the KG-MCP client to provide interactive
 * Knowledge Graph visualizations within the ecosystem dashboard.
 * 
 * @module KnowledgeGraphVisualizer
 */

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { KGMCPClient } from '@/lib/kg-mcp-client';
import logger from '@/lib/logger';
import kgMCPMonitoring from '@/lib/kg-mcp-monitoring';
import { KGMCPSecurity } from '@/lib/kg-mcp-security';

// Dynamically import Mermaid with no SSR
const Mermaid = dynamic(
  () => import('./Mermaid'),
  { ssr: false }
);

// Define props for the component
interface KnowledgeGraphVisualizerProps {
  /**
   * Initial Cypher query to visualize
   */
  initialQuery?: string;
  
  /**
   * Visualization format
   */
  format?: 'mermaid' | 'dot' | 'json';
  
  /**
   * Height of the visualization
   */
  height?: string;
  
  /**
   * Whether to show the query editor
   */
  showEditor?: boolean;
  
  /**
   * Optional callback when data is loaded
   */
  onDataLoaded?: (data: any) => void;
  
  /**
   * Optional title for the visualization
   */
  title?: string;
  
  /**
   * Optional pre-defined queries for quick selection
   */
  presetQueries?: Array<{
    name: string;
    query: string;
    description?: string;
  }>;
}

/**
 * Knowledge Graph Visualizer Component
 */
const KnowledgeGraphVisualizer: React.FC<KnowledgeGraphVisualizerProps> = ({
  initialQuery = 'MATCH p=(s:Service)-[:CONNECTS_TO]->(t:Service) RETURN p LIMIT 10',
  format = 'mermaid',
  height = '500px',
  showEditor = true,
  onDataLoaded,
  title = 'Knowledge Graph Visualization',
  presetQueries = []
}) => {
  // State
  const [query, setQuery] = useState<string>(initialQuery);
  const [diagram, setDiagram] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [kgClient, setKgClient] = useState<KGMCPClient | null>(null);
  const [data, setData] = useState<any>(null);
  
  // Refs
  const requestIdRef = useRef<string>('');
  
  // Effect to initialize KG client
  useEffect(() => {
    try {
      // Audit security before initializing
      const securityAudit = KGMCPSecurity.auditClientSecurity();
      
      if (!securityAudit.passed) {
        logger.error('[KG-VIZ] Security audit failed', { securityAudit });
        setError(`Security requirements not met: ${securityAudit.summary}`);
        return;
      }
      
      // Initialize client
      const client = new KGMCPClient();
      setKgClient(client);
      
      // Log successful initialization
      logger.info('[KG-VIZ] KG client initialized successfully');
      
      // Load initial visualization
      if (initialQuery) {
        loadVisualization(initialQuery, format, client);
      }
    } catch (err: any) {
      logger.error('[KG-VIZ] Failed to initialize KG client', { error: err });
      setError(`Failed to initialize: ${err.message}`);
    }
    
    // Cleanup
    return () => {
      // Complete any active operations
      if (requestIdRef.current) {
        kgMCPMonitoring.completeOperation(requestIdRef.current, 'success');
        requestIdRef.current = '';
      }
    };
  }, [initialQuery, format]);
  
  /**
   * Load visualization from query
   * 
   * @param queryString Cypher query string
   * @param vizFormat Visualization format
   * @param client KG client instance (optional, uses state if not provided)
   */
  const loadVisualization = async (
    queryString: string, 
    vizFormat: 'mermaid' | 'dot' | 'json' = format,
    client?: KGMCPClient
  ) => {
    const kgClientInstance = client || kgClient;
    
    if (!kgClientInstance) {
      setError('KG client not initialized');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Start monitoring operation
    const operationMetrics = kgMCPMonitoring.startOperation(
      'visualize_knowledge_graph', 
      `viz_${Date.now()}`
    );
    requestIdRef.current = operationMetrics.requestId;
    
    // Log security audit
    KGMCPSecurity.auditOperation('visualize_knowledge_graph', {
      query: queryString.slice(0, 100) + (queryString.length > 100 ? '...' : ''),
      format: vizFormat,
      requestId: operationMetrics.requestId
    });
    
    try {
      const result = await kgClientInstance.visualizeKnowledgeGraph(queryString, vizFormat);
      
      if (result && result.diagram) {
        setDiagram(result.diagram);
        setData(result);
        
        // Notify about data loaded
        if (onDataLoaded) {
          onDataLoaded(result);
        }
        
        // Complete monitoring operation
        kgMCPMonitoring.completeOperation(operationMetrics.requestId, 'success');
        
        logger.info('[KG-VIZ] Visualization loaded successfully', {
          requestId: operationMetrics.requestId,
          format: vizFormat
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      logger.error('[KG-VIZ] Failed to load visualization', { 
        error: err, 
        requestId: operationMetrics.requestId 
      });
      
      setError(`Error: ${err.message}`);
      
      // Complete monitoring operation with error
      kgMCPMonitoring.completeOperation(
        operationMetrics.requestId, 
        'error',
        {
          code: err.code || 'VISUALIZATION_ERROR',
          message: err.message
        }
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Handle query submission
   */
  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadVisualization(query, format);
  };
  
  /**
   * Handle preset query selection
   */
  const selectPresetQuery = (presetQuery: string) => {
    setQuery(presetQuery);
    loadVisualization(presetQuery, format);
  };
  
  /**
   * Render visualization based on format
   */
  const renderVisualization = () => {
    if (isLoading) {
      return (
        <div className="loading-container" style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loading-spinner">
            <span>Loading visualization...</span>
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="error-container" style={{ height, padding: '1rem', color: 'red', border: '1px solid red', borderRadius: '4px' }}>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      );
    }
    
    if (!diagram) {
      return (
        <div className="empty-state" style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc', borderRadius: '4px' }}>
          <p>No visualization data. Enter a query to visualize the Knowledge Graph.</p>
        </div>
      );
    }
    
    switch (format) {
      case 'mermaid':
        return <Mermaid diagram={diagram} />;
        
      case 'dot':
        // This would use a DOT renderer if available
        return (
          <div className="dot-graph">
            <pre>{diagram}</pre>
          </div>
        );
        
      case 'json':
        return (
          <div className="json-data">
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        );
        
      default:
        return <pre>{diagram}</pre>;
    }
  };
  
  return (
    <div className="knowledge-graph-visualizer">
      <div className="visualizer-header">
        <h2>{title}</h2>
      </div>
      
      {showEditor && (
        <div className="query-editor">
          <form onSubmit={handleQuerySubmit}>
            <div className="form-group">
              <label htmlFor="cypher-query">Cypher Query</label>
              <textarea
                id="cypher-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={3}
                className="form-control"
                placeholder="Enter Cypher query (e.g., MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 10)"
              />
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading || !query.trim()}
              >
                {isLoading ? 'Loading...' : 'Visualize'}
              </button>
              
              <select 
                className="form-select"
                onChange={(e) => e.target.value && selectPresetQuery(e.target.value)}
                value=""
              >
                <option value="">Select a preset query...</option>
                {presetQueries.map((preset, index) => (
                  <option key={index} value={preset.query}>
                    {preset.name}
                  </option>
                ))}
              </select>
              
              <select
                className="form-select"
                value={format}
                onChange={(e) => loadVisualization(query, e.target.value as any)}
              >
                <option value="mermaid">Mermaid</option>
                <option value="dot">DOT</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </form>
        </div>
      )}
      
      <div className="visualization-container" style={{ height, overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '1rem' }}>
        {renderVisualization()}
      </div>
    </div>
  );
};

export default KnowledgeGraphVisualizer;
