/**
 * Knowledge Graph Overview API Endpoint
 * 
 * This endpoint provides summary statistics and overview data
 * for the Knowledge Graph dashboard.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodeTypes: Record<string, number>;
  relationshipTypes: Record<string, number>;
}

interface GraphOverview {
  stats: GraphStats;
  nodes: any[];
  edges: any[];
  lastUpdated: string;
}

const KG_API_BASE = process.env.KG_API_URL || 'http://localhost:8765/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GraphOverview | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract authorization headers from the request
  const authHeaders: Record<string, string> = {};
  if (req.headers.authorization) {
    authHeaders.Authorization = req.headers.authorization;
  }
  if (req.headers['x-api-key']) {
    authHeaders['X-API-Key'] = req.headers['x-api-key'] as string;
  }

  try {
    // Get basic graph statistics
    const statsQuery = `
      MATCH (n)
      WITH labels(n) as nodeLabels
      UNWIND nodeLabels as label
      RETURN label, count(*) as count
      ORDER BY count DESC
    `;

    const relationshipStatsQuery = `
      MATCH ()-[r]->()
      RETURN type(r) as relationshipType, count(*) as count
      ORDER BY count DESC
    `;

    const totalCountsQuery = `
      MATCH (n)
      OPTIONAL MATCH ()-[r]->()
      RETURN count(DISTINCT n) as totalNodes, count(r) as totalEdges
    `;

    // Sample nodes for visualization
    const sampleNodesQuery = `
      MATCH (n)
      RETURN n
      ORDER BY rand()
      LIMIT 50
    `;

    // Sample relationships
    const sampleEdgesQuery = `
      MATCH (n)-[r]->(m)
      RETURN n, r, m
      ORDER BY rand()
      LIMIT 30
    `;

    // Execute queries sequentially to avoid overwhelming the backend
    let nodeTypesResponse, relationshipTypesResponse, totalCountsResponse, sampleNodesResponse, sampleEdgesResponse;
    
    try {
      nodeTypesResponse = await axios.post(`${KG_API_BASE}/v1/query`, { 
        query: statsQuery.trim(),
        format: 'json'
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json', ...authHeaders }
      });
    } catch (error) {
      console.error('Error fetching node types:', error instanceof Error ? error.message : error);
      nodeTypesResponse = { data: { result: [] } };
    }
    
    try {
      relationshipTypesResponse = await axios.post(`${KG_API_BASE}/v1/query`, { 
        query: relationshipStatsQuery.trim(),
        format: 'json'
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json', ...authHeaders }
      });
    } catch (error) {
      console.error('Error fetching relationship types:', error instanceof Error ? error.message : error);
      relationshipTypesResponse = { data: { result: [] } };
    }
    
    try {
      totalCountsResponse = await axios.post(`${KG_API_BASE}/v1/query`, { 
        query: totalCountsQuery.trim(),
        format: 'json'
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json', ...authHeaders }
      });
    } catch (error) {
      console.error('Error fetching total counts:', error instanceof Error ? error.message : error);
      totalCountsResponse = { data: { result: [{ totalNodes: 0, totalEdges: 0 }] } };
    }
    
    try {
      sampleNodesResponse = await axios.post(`${KG_API_BASE}/v1/query`, { 
        query: sampleNodesQuery.trim(),
        format: 'json'
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json', ...authHeaders }
      });
    } catch (error) {
      console.error('Error fetching sample nodes:', error instanceof Error ? error.message : error);
      sampleNodesResponse = { data: { result: [] } };
    }
    
    try {
      sampleEdgesResponse = await axios.post(`${KG_API_BASE}/v1/query`, { 
        query: sampleEdgesQuery.trim(),
        format: 'json'
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json', ...authHeaders }
      });
    } catch (error) {
      console.error('Error fetching sample edges:', error instanceof Error ? error.message : error);
      sampleEdgesResponse = { data: { result: [] } };
    }

    // Process results
    const nodeTypeResults = nodeTypesResponse.data.result || [];
    const relationshipTypeResults = relationshipTypesResponse.data.result || [];
    const totalCountsResults = totalCountsResponse.data.result || [];
    const sampleNodeResults = sampleNodesResponse.data.result || [];
    const sampleEdgeResults = sampleEdgesResponse.data.result || [];

    // Process node types
    const nodeTypes: Record<string, number> = {};
    nodeTypeResults.forEach((result: any) => {
      if (result.label && result.count) {
        nodeTypes[result.label] = result.count;
      }
    });

    // Process relationship types
    const relationshipTypes: Record<string, number> = {};
    relationshipTypeResults.forEach((result: any) => {
      if (result.relationshipType && result.count) {
        relationshipTypes[result.relationshipType] = result.count;
      }
    });

    // Get total counts
    const totalCounts = totalCountsResults?.[0] || { totalNodes: 0, totalEdges: 0 };

    // Process sample nodes
    const nodes = sampleNodeResults.map((result: any, index: number) => {
      const node = result.n || result;
      return {
        id: node.identity || `node_${index}`,
        label: node.properties?.title || node.properties?.name || `Node ${index}`,
        type: node.labels?.[0] || 'Unknown',
        properties: node.properties || {}
      };
    });

    // Process sample edges
    const edges = sampleEdgeResults.map((result: any, index: number) => {
      const relationship = result.r || result;
      return {
        id: relationship.identity || `edge_${index}`,
        source: relationship.start || result.n?.identity || `node_${index}_source`,
        target: relationship.end || result.m?.identity || `node_${index}_target`,
        type: relationship.type || 'RELATED_TO',
        properties: relationship.properties || {}
      };
    });

    const overview: GraphOverview = {
      stats: {
        totalNodes: totalCounts.totalNodes || Object.values(nodeTypes).reduce((sum, count) => sum + count, 0),
        totalEdges: totalCounts.totalEdges || Object.values(relationshipTypes).reduce((sum, count) => sum + count, 0),
        nodeTypes,
        relationshipTypes
      },
      nodes,
      edges,
      lastUpdated: new Date().toISOString()
    };

    res.status(200).json(overview);

  } catch (error) {
    console.error('Knowledge Graph overview error:', {
      error: error instanceof Error ? error.message : 'Failed to fetch graph overview',
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Return fallback data structure
    res.status(200).json({
      stats: {
        totalNodes: 0,
        totalEdges: 0,
        nodeTypes: {},
        relationshipTypes: {}
      },
      nodes: [],
      edges: [],
      lastUpdated: new Date().toISOString()
    });
  }
}

export const config = {
  api: {
    responseLimit: '8mb',
  },
}
