/**
 * Knowledge Graph Data Hook
 * 
 * This hook fetches visualization data from the Knowledge Graph service via local API endpoints.
 * It supports parameters for focus entity, depth, limit, and relationship types.
 */

import { useState, useEffect } from 'react';

interface GraphDataOptions {
  focusEntity?: string;
  depth?: number;
  limit?: number;
  relationTypes?: string[];
}

interface Node {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
}

interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

interface GraphData {
  nodes: Node[];
  relationships: Relationship[];
  metadata: {
    nodeCount: number;
    relationshipCount: number;
    queryTimeMs: number;
  };
}

export const useGraphData = (options: GraphDataOptions = {}) => {
  const { focusEntity, depth = 2, limit = 100, relationTypes = [] } = options;
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchGraphData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (focusEntity) params.append('focus', focusEntity);
        params.append('depth', depth.toString());
        params.append('limit', limit.toString());
        if (relationTypes.length > 0) {
          relationTypes.forEach(type => params.append('relationTypes', type));
        }
        
        // Make request to the local Knowledge Graph API
        const response = await fetch(
          `/api/knowledge-graph/visualization?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const responseData = await response.json();
          setData(responseData);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.message || errorData.error || 'Failed to fetch graph data');
        }
      } catch (err) {
        console.error('Error fetching Knowledge Graph data:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchGraphData();
  }, [focusEntity, depth, limit, relationTypes]);
  
  return { data, loading, error };
};
