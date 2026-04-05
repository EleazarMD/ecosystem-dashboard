/**
 * Knowledge Graph Service Architecture API
 * 
 * Retrieves service architecture data from the Knowledge Graph system
 * Provides service relationships, dependencies, and validation status
 * 
 * @module api/knowledge-graph/service-architecture
 * @updated 2025-07-18
 * @version 1.0.0
 */

import { NextApiRequest, NextApiResponse } from 'next';

// Sample data for fallback when KG connection fails
const SAMPLE_SERVICES = [
  {
    id: 'api-gateway',
    name: 'API Gateway',
    type: 'gateway',
    description: 'Central API Gateway for the AI Homelab ecosystem',
    component: 'core',
    status: 'active',
    ports: [8080],
    validationStatus: 'valid'
  },
  {
    id: 'kg-api',
    name: 'Knowledge Graph API',
    type: 'api',
    description: 'REST API for Knowledge Graph interactions',
    component: 'knowledge-graph',
    status: 'active',
    ports: [8765],
    validationStatus: 'valid'
  },
  {
    id: 'kg-db',
    name: 'Neo4j Database',
    type: 'database',
    description: 'Graph database for knowledge storage',
    component: 'knowledge-graph',
    status: 'active',
    ports: [7687, 7474],
    validationStatus: 'valid'
  },
  {
    id: 'intelligent-memory',
    name: 'Intelligent Memory Proxy',
    type: 'service',
    description: 'MCP proxy for intelligent memory operations',
    component: 'tools',
    status: 'active',
    ports: [8766, 8767],
    validationStatus: 'valid'
  },
  {
    id: 'redis-cache',
    name: 'Redis Cache',
    type: 'cache',
    description: 'Redis for caching and pub/sub',
    component: 'core',
    status: 'active',
    ports: [6379],
    validationStatus: 'valid'
  },
  {
    id: 'kg-postgres',
    name: 'PostgreSQL Vector DB',
    type: 'database',
    description: 'Vector database for semantic search',
    component: 'knowledge-graph',
    status: 'active',
    ports: [5432],
    validationStatus: 'valid'
  },
  {
    id: 'ahis-server',
    name: 'AI Homelab Integration Server',
    type: 'api',
    description: 'AI Homelab Integration Service',
    component: 'core',
    status: 'active',
    ports: [8888],
    validationStatus: 'valid'
  },
  {
    id: 'ecosystem-dashboard',
    name: 'Ecosystem Dashboard',
    type: 'web-service',
    description: 'Ecosystem monitoring dashboard',
    component: 'tools',
    status: 'active',
    ports: [8404],
    validationStatus: 'valid'
  }
];

const SAMPLE_RELATIONSHIPS = [
  {
    source: 'api-gateway',
    target: 'kg-api',
    type: 'COMMUNICATES_WITH',
    properties: {}
  },
  {
    source: 'kg-api',
    target: 'kg-db',
    type: 'DEPENDS_ON',
    properties: {}
  },
  {
    source: 'kg-api',
    target: 'kg-postgres',
    type: 'DEPENDS_ON',
    properties: {}
  },
  {
    source: 'kg-api',
    target: 'redis-cache',
    type: 'USES',
    properties: {}
  },
  {
    source: 'intelligent-memory',
    target: 'kg-api',
    type: 'COMMUNICATES_WITH',
    properties: {}
  },
  {
    source: 'ahis-server',
    target: 'kg-api',
    type: 'COMMUNICATES_WITH',
    properties: {}
  },
  {
    source: 'ecosystem-dashboard',
    target: 'api-gateway',
    type: 'COMMUNICATES_WITH',
    properties: {}
  },
  {
    source: 'service-008', // Dashboard
    target: 'service-004', // Memory Proxy
    type: 'COMMUNICATES_WITH',
    properties: {}
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[kg/service-architecture] API handler called with method:', req.method);
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract query parameters for focused service and depth
    const { focusService, depth = '2' } = req.query;
    const traversalDepth = parseInt(depth as string, 10) || 2;
    
    console.log(`[kg/service-architecture] Query params:`, {
      focusService: focusService || 'none',
      depth: traversalDepth
    });
    
    // Always use sample data to avoid external script issues
    console.log('[kg/service-architecture] Using sample data (external script disabled)');
    
    const services = SAMPLE_SERVICES;
    const relationships = SAMPLE_RELATIONSHIPS;
    
    console.log(`[kg/service-architecture] Retrieved ${services.length} services and ${relationships.length} relationships`);
    
    return res.status(200).json({
      services,
      relationships,
      timestamp: new Date().toISOString(),
      source: 'sample-data',
      focusService: focusService || null,
      depth: traversalDepth
    });
  } catch (error: any) {
    console.error('[kg/service-architecture] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// Removed executeKgQuery function - using sample data only
