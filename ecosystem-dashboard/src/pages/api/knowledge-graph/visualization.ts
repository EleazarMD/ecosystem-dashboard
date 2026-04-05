import { NextApiRequest, NextApiResponse } from 'next';
import { KGGateway } from '../../../lib/kg-gateway';

/**
 * Knowledge Graph Visualization API
 * 
 * This endpoint attempts to fetch real visualization data from the Knowledge Graph
 * service via the AI Gateway in the k3d cluster. If the connection fails,
 * it returns a 503 error with a clear "No real data available" message.
 */

const defaultGateway = new KGGateway();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { focus, depth = '2', limit = '100', relationTypes, format = 'json' } = req.query;

    console.log('[KG API] Attempting to fetch real Knowledge Graph visualization data');
    
    // Attempt to get visualization data from the Knowledge Graph service
    const visualizationQuery = `
      MATCH (n)-[r]-(m)
      RETURN n, r, m
      LIMIT ${limit}
    `;
    
    try {
      const kgResponse = await defaultGateway.executeQuery(visualizationQuery, {
        format: 'json',
        limit: parseInt(limit as string, 10)
      });
      
      console.log('[KG API] Successfully received KG response:', {
        hasResult: !!kgResponse.result,
        confidence: kgResponse.confidence,
        mock: kgResponse.mock
      });
      
      // Transform KG response into visualization format
      const visualizationData = transformKGResponseToVisualization(kgResponse, {
        focus,
        depth,
        limit,
        relationTypes,
        format
      });
      
      return res.status(200).json(visualizationData);
      
    } catch (kgError: any) {
      console.warn('[KG API] Knowledge Graph service unavailable:', kgError.message);
      
      // Return structured error when KG service is unavailable
      return res.status(503).json({
        error: 'No real data available',
        code: 'KG_SERVICE_UNAVAILABLE',
        source: 'knowledge-graph-visualization-api',
        details: {
          message: `Knowledge Graph service connection failed: ${kgError.message}`,
          kgError: kgError.code || 'UNKNOWN_ERROR',
          focus,
          depth,
          limit,
          relationTypes,
          format
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('[KG API] Visualization error:', error);

    return res.status(503).json({
      error: 'No real data available',
      code: 'API_ERROR',
      source: 'knowledge-graph-visualization-api',
      details: {
        message: error instanceof Error ? error.message : 'Unknown API error'
      },
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Transform Knowledge Graph response into visualization format
 */
function transformKGResponseToVisualization(kgResponse: any, queryParams: any) {
  // If it's a mock response, indicate that in metadata
  if (kgResponse.mock) {
    console.log('[KG API] Received mock response from KGGateway');
  }
  
  // Try to extract nodes and relationships from the KG response
  let nodes: any[] = [];
  let links: any[] = [];
  
  try {
    // Parse the result if it's a string
    let data = kgResponse.data || kgResponse.result;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        console.warn('[KG API] Could not parse KG result as JSON:', data);
        // Create minimal visualization from text response
        return createMinimalVisualization(kgResponse, queryParams);
      }
    }
    
    // Extract nodes and relationships from various possible formats
    if (data && Array.isArray(data)) {
      data.forEach((record: any, index: number) => {
        // Handle Neo4j-style records
        if (record.n && record.m && record.r) {
          // Add nodes
          if (!nodes.find(n => n.id === record.n.identity || n.id === record.n.id)) {
            nodes.push({
              id: record.n.identity || record.n.id || `node_${index}_n`,
              name: record.n.properties?.name || record.n.labels?.[0] || `Node ${index}`,
              type: record.n.labels?.[0] || 'Unknown',
              category: record.n.properties?.category || 'General',
              properties: record.n.properties || {}
            });
          }
          
          if (!nodes.find(n => n.id === record.m.identity || n.id === record.m.id)) {
            nodes.push({
              id: record.m.identity || record.m.id || `node_${index}_m`,
              name: record.m.properties?.name || record.m.labels?.[0] || `Node ${index}`,
              type: record.m.labels?.[0] || 'Unknown',
              category: record.m.properties?.category || 'General',
              properties: record.m.properties || {}
            });
          }
          
          // Add relationship
          links.push({
            source: record.n.identity || record.n.id || `node_${index}_n`,
            target: record.m.identity || record.m.id || `node_${index}_m`,
            type: record.r.type || 'CONNECTED_TO',
            properties: record.r.properties || {}
          });
        }
      });
    }
    
    // If no nodes extracted, create minimal visualization
    if (nodes.length === 0) {
      return createMinimalVisualization(kgResponse, queryParams);
    }
    
  } catch (transformError) {
    console.warn('[KG API] Error transforming KG response:', transformError);
    return createMinimalVisualization(kgResponse, queryParams);
  }
  
  return {
    nodes,
    links,
    nodeTypes: Array.from(new Set(nodes.map(n => n.type))),
    linkTypes: Array.from(new Set(links.map(l => l.type))),
    metadata: {
      source: kgResponse.mock ? 'mock_data' : 'knowledge_graph_service',
      timestamp: new Date().toISOString(),
      nodeCount: nodes.length,
      relationshipCount: links.length,
      queryTimeMs: 0, // Could be extracted from kgResponse if available
      confidence: kgResponse.confidence || 1.0,
      mock: !!kgResponse.mock,
      queryParams
    }
  };
}

/**
 * Create minimal visualization when KG data can't be parsed
 */
function createMinimalVisualization(kgResponse: any, queryParams: any) {
  return {
    nodes: [
      {
        id: 'kg-service',
        name: 'Knowledge Graph Service',
        type: 'Service',
        category: 'Infrastructure',
        properties: {
          status: kgResponse.mock ? 'mock' : 'connected',
          response: kgResponse.result?.substring(0, 100) || 'No response data'
        }
      }
    ],
    links: [],
    nodeTypes: ['Service'],
    linkTypes: [],
    metadata: {
      source: kgResponse.mock ? 'mock_data' : 'knowledge_graph_service',
      timestamp: new Date().toISOString(),
      nodeCount: 1,
      relationshipCount: 0,
      queryTimeMs: 0,
      confidence: kgResponse.confidence || 0.5,
      mock: !!kgResponse.mock,
      queryParams,
      note: 'Minimal visualization - could not parse full KG response'
    }
  };
}
