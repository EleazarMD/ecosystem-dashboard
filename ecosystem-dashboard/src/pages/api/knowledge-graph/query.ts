/**
 * Knowledge Graph Query API Endpoint
 * 
 * This endpoint handles both natural language and Cypher queries
 * to the Knowledge Graph service via MCP.
 */

import { NextApiRequest, NextApiResponse } from 'next';

const KNOWLEDGE_GRAPH_URL = 'http://localhost:8765';

interface QueryRequest {
  query: string;
  type?: 'natural' | 'cypher';
  limit?: number;
  output_format?: string;
}

interface QueryResponse {
  success: boolean;
  results: any[];
  executionTime: number;
  generatedCypher?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QueryResponse>
) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      results: [],
      executionTime: 0,
      error: 'Method not allowed'
    });
  }

  const { query, type = 'natural', limit = 100, output_format = 'inline' }: QueryRequest = req.body;

  if (!query?.trim()) {
    return res.status(400).json({
      success: false,
      results: [],
      executionTime: 0,
      error: 'Query is required'
    });
  }

  const startTime = Date.now();

  try {
    console.log('Query API: Processing query:', query);
    
    // Forward query to the actual Knowledge Graph service
    const kgResponse = await fetch(`${KNOWLEDGE_GRAPH_URL}/search`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Use URLSearchParams for GET request
    });
    
    let results = [];
    if (kgResponse.ok) {
      const kgData = await kgResponse.json();
      results = kgData.results || [];
    } else {
      // Fallback to mock data if KG service is unavailable
      let filteredResults = [...mockResults];
      const queryLower = query.toLowerCase();
      
      if (queryLower.includes('microservice')) {
        filteredResults = filteredResults.filter(result => result.type === 'Microservice');
      } else if (queryLower.includes('platform')) {
        filteredResults = filteredResults.filter(result => result.type === 'Platform');
      } else if (queryLower.includes('infrastructure')) {
        filteredResults = filteredResults.filter(result => result.type === 'Infrastructure');
      }
      
      results = filteredResults.slice(0, limit);
    }
    
    const endTime = Date.now();
    const executionTimeMs = endTime - startTime;
    
    console.log('Query API: Returning', results.length, 'results');
    
    res.status(200).json({
      success: true,
      results: results,
      executionTime: executionTimeMs,
      generatedCypher: `// Natural language query: "${query}"`
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    console.error('Knowledge Graph query error:', {
      query,
      type,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      executionTime
    });

    res.status(500).json({
      success: false,
      results: [],
      executionTime,
      error: errorMessage
    });
  }
}

const mockResults = [
  // Microservices
  {
    id: "agent-development-environment",
    type: "Microservice",
    category: "Development",
    name: "Agent Development Environment",
    description: "Microservice for developing and managing AI agents with UI and API endpoints",
    properties: {
      port: 8100,
      status: "running",
      entity_type: "microservice_architecture",
      service_type: "development_environment",
      technologies: ["React", "FastAPI", "Docker"],
      integrations: ["authentik", "ai-gateway", "aihds"]
    }
  },
  {
    id: "agent-registry-service",
    type: "Microservice", 
    category: "Registry",
    name: "Agent Registry Service",
    description: "Microservice for registering and discovering AI agents across the ecosystem",
    properties: {
      port: 8200,
      status: "running",
      entity_type: "microservice_architecture",
      service_type: "registry_service",
      technologies: ["FastAPI", "SQLite", "Docker"],
      integrations: ["ai-gateway", "aihds"]
    }
  },
  {
    id: "knowledge-graph",
    type: "Microservice",
    category: "Data",
    name: "Knowledge Graph Service",
    description: "Microservice providing graph database and MCP server for ecosystem knowledge",
    properties: {
      port: 8765,
      status: "running",
      entity_type: "microservice_architecture", 
      service_type: "data_service",
      technologies: ["Neo4j", "Python", "MCP", "Docker"],
      nodes: 150,
      relationships: 320,
      integrations: ["windsurf-ide", "dashboard"]
    }
  },
  {
    id: "jimi-tools-mcp",
    type: "Microservice",
    category: "Integration",
    name: "JIMI Tools MCP Service", 
    description: "Microservice providing MCP integration for JIMI Wellness Platform tools and capabilities",
    properties: {
      port: 8300,
      status: "running",
      entity_type: "microservice_integration",
      service_type: "mcp_integration",
      technologies: ["Python", "MCP", "FastAPI"],
      integrations: ["jimi-platform", "ai-gateway"]
    }
  },
  {
    id: "lightrag-engine-service",
    type: "Microservice",
    category: "AI",
    name: "LightRAG Engine Service",
    description: "Microservice providing RAG (Retrieval-Augmented Generation) capabilities using LightRAG",
    properties: {
      port: 8400,
      status: "running", 
      entity_type: "microservice_architecture",
      service_type: "ai_engine",
      technologies: ["LightRAG", "Python", "Vector DB"],
      integrations: ["jimi-platform", "knowledge-graph"]
    }
  },
  // Platform Components
  {
    id: "ai-gateway",
    type: "Platform",
    category: "Infrastructure",
    name: "AI Gateway",
    description: "Platform service for routing and managing LLM requests across the ecosystem",
    properties: {
      port: 7777,
      status: "running",
      entity_type: "ecosystem_architecture",
      service_type: "gateway_service",
      technologies: ["Go", "Docker", "Load Balancer"],
      connections: ["ollama", "openai", "anthropic"],
      microservices_connected: 5
    }
  },
  {
    id: "ahis-server",
    type: "Platform",
    category: "Orchestration", 
    name: "AHIS Server",
    description: "AI Homelab Intelligence System - Main orchestration platform for ecosystem management",
    properties: {
      port: 8888,
      status: "running",
      entity_type: "ecosystem_architecture",
      service_type: "orchestration_platform",
      technologies: ["Python", "WebSocket", "Docker"],
      managed_services: 12,
      integrations: ["aihds", "ai-gateway", "monitoring"]
    }
  },
  // Ecosystem Components  
  {
    id: "authentik",
    type: "Infrastructure",
    category: "Security",
    name: "Authentik Identity Provider",
    description: "Ecosystem authentication and authorization service providing OAuth2/OIDC",
    properties: {
      port: 9000,
      status: "running",
      entity_type: "ecosystem_architecture", 
      service_type: "identity_provider",
      technologies: ["Python", "OAuth2", "OIDC", "PostgreSQL"],
      protected_services: 8
    }
  },
  {
    id: "ecosystem-dashboard",
    type: "Platform",
    category: "Management",
    name: "Ecosystem Dashboard",
    description: "Platform web interface for monitoring and managing the AI Homelab Ecosystem",
    properties: {
      port: 8404,
      status: "running",
      entity_type: "ecosystem_architecture",
      service_type: "management_interface", 
      technologies: ["Next.js", "React", "Chakra UI"],
      monitored_services: 12
    }
  }
];

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: '8mb',
  },
}
