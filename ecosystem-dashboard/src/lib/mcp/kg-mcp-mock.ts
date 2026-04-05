/**
 * Knowledge Graph MCP Mock Implementation
 * 
 * This module provides mock implementations of Knowledge Graph MCP functions
 * for development and testing purposes, following the AI Homelab Ecosystem
 * architecture standards.
 * 
 * @module lib/mcp/kg-mcp-mock
 */

import { AIMetrics, AIGatewayStatus, AIModel, ModelProvider, ModelType } from '@/types/aiGateway';

/**
 * Generate mock AI Gateway metrics data
 */
export const generateMockMetrics = (): AIMetrics => {
  const now = new Date();
  const timePoints = Array.from({ length: 24 }, (_, i) => {
    const date = new Date(now);
    date.setHours(date.getHours() - 23 + i);
    return date.toISOString();
  });
  
  return {
    requestsPerMinute: timePoints.map((timestamp, i) => ({
      timestamp,
      value: Math.floor(10 + Math.random() * 40 + Math.sin(i / 3) * 15)
    })),
    responseTimeMs: timePoints.map((timestamp, i) => ({
      timestamp,
      value: Math.floor(200 + Math.random() * 300 + Math.sin(i / 2) * 100)
    })),
    tokenUsage: timePoints.map((timestamp, i) => ({
      timestamp,
      prompt: Math.floor(1000 + Math.random() * 3000 + Math.sin(i / 4) * 1000),
      completion: Math.floor(800 + Math.random() * 1500 + Math.sin(i / 3) * 500)
    })),
    errorRate: timePoints.map((timestamp, i) => ({
      timestamp,
      value: Number((0.1 + Math.random() * 0.3 + Math.sin(i / 5) * 0.2).toFixed(2))
    })),
    modelUsage: [
      { model: 'gpt-3.5-turbo', requests: 1250 + Math.floor(Math.random() * 300), tokens: 450000 + Math.floor(Math.random() * 50000) },
      { model: 'gpt-4', requests: 320 + Math.floor(Math.random() * 100), tokens: 180000 + Math.floor(Math.random() * 30000) },
      { model: 'claude-instant', requests: 580 + Math.floor(Math.random() * 200), tokens: 210000 + Math.floor(Math.random() * 40000) },
      { model: 'llama2', requests: 420 + Math.floor(Math.random() * 150), tokens: 175000 + Math.floor(Math.random() * 35000) },
    ]
  };
};

/**
 * Generate mock AI Gateway status data
 */
export const generateMockStatus = (): AIGatewayStatus => {
  return {
    isOnline: true,
    version: '2.1.0',
    uptime: 1209600, // 2 weeks in seconds
    requestRate: 42.7,
    models: 4,
    lastUpdated: new Date(Date.now() - 60000) // 1 minute ago
  };
};

/**
 * Generate mock AI models data
 */
export const generateMockModels = (): AIModel[] => {
  return [
    {
      id: 'gpt-3.5-turbo',
      provider: ModelProvider.OPENAI,
      type: ModelType.CHAT,
      capabilities: ['function_calling', 'json_mode', 'streaming'],
      configured: true
    },
    {
      id: 'gpt-4',
      provider: ModelProvider.OPENAI,
      type: ModelType.CHAT,
      capabilities: ['function_calling', 'json_mode', 'vision', 'streaming'],
      configured: true
    },
    {
      id: 'claude-instant',
      provider: ModelProvider.ANTHROPIC,
      type: ModelType.CHAT,
      capabilities: ['structured_output', 'streaming'],
      configured: true
    },
    {
      id: 'llama2',
      provider: ModelProvider.OLLAMA,
      type: ModelType.CHAT,
      capabilities: ['streaming'],
      configured: true
    }
  ];
};

/**
 * Knowledge Graph MCP service with minimal fallbacks
 * Modified to provide limited fallbacks only for UI rendering purposes while
 * clearly marking responses as non-production data
 */
export const kgMcpMock = {
  query: (query: string) => {
    console.warn('⚠️ [KG-GATEWAY] Using MINIMAL fallback for KG query. This is NOT production data!');
    return {
      answer: `[NON-PRODUCTION DATA] System is configured to use real KG service. Please verify AI Gateway connection.`,
      confidence: 0,
      reasoning: 'The system is configured to use the real Knowledge Graph service. This is a fallback to prevent UI crashes only.',
      mock: true,
      sources: [{
        title: 'Configuration Notice',
        url: '',
        content: 'This response indicates the system should be using the real Knowledge Graph service.'
      }]
    };
  },
  
  search: (query: string) => {
    console.warn('⚠️ [KG-GATEWAY] Using MINIMAL fallback for KG search. This is NOT production data!');
    return {
      results: [
        {
          title: '[NON-PRODUCTION DATA] Real KG service required',
          description: 'The system is configured to use the real Knowledge Graph service. This is a fallback to prevent UI crashes only.',
          url: '',
          score: 0
        }
      ],
      query: query,
      totalResults: 1,
      mock: true
    };
  },
  
  visualize: (query: string) => {
    console.warn('⚠️ [KG-GATEWAY] Using MINIMAL fallback for KG visualization. This is NOT production data!');
    return {
      mermaid: `graph TD\n  A[System Notice] -->|Connection Required| B[Real KG Service]\n  B -->|Verify| C[AI Gateway Connection]`,
      query: query,
      mock: true
    };
  },
  
  getAIGatewayMetrics: (timeRange: string = '24h') => {
    console.warn('⚠️ [KG-GATEWAY] Using MINIMAL fallback for AI Gateway metrics. This is NOT production data!');
    return {
      requestsPerMinute: [],
      responseTimeMs: [],
      tokenUsage: [],
      errorRate: [],
      modelUsage: [],
      mock: true,
      notice: 'System is configured to use real KG service. Please verify AI Gateway connection.'
    };
  },
  
  getAIGatewayStatus: () => {
    console.warn('⚠️ [KG-GATEWAY] Using MINIMAL fallback for AI Gateway status. This is NOT production data!');
    return {
      isOnline: false,
      version: 'Unknown',
      uptime: 0,
      requestRate: 0,
      models: 0,
      lastUpdated: new Date(),
      mock: true,
      notice: 'System is configured to use real KG service. Please verify AI Gateway connection.'
    };
  },
  
  getAIGatewayModels: () => {
    console.warn('⚠️ [KG-GATEWAY] Using MINIMAL fallback for AI Gateway models. This is NOT production data!');
    return [
      {
        id: 'not-available',
        provider: 'System Notice',
        type: 'NOTICE',
        capabilities: ['System is configured to use real KG service. Please verify AI Gateway connection.'],
        configured: false,
        mock: true
      }
    ];
  }
};

export default kgMcpMock;
