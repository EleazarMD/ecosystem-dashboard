/**
 * API endpoint for comprehensive system overview via Ollama AI Agent
 * 
 * Provides unified analytics across all dashboard resources
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ollamaAIAgent } from '@/lib/agent/OllamaAIAgent';

export interface SystemOverviewResponse {
  success: boolean;
  overview: {
    timestamp: string;
    services: {
      knowledgeGraph: { status: string; data?: any };
      ahis: { status: string; data?: any };
      aiGateway: { status: string; data?: any };
      kubernetes: { status: string; data?: any };
    };
    overallHealth: 'healthy' | 'degraded' | 'critical';
    activeServices: number;
    totalServices: number;
  };
  insights?: any[];
  recommendations?: string[];
  agentResponse?: string;
  processingTime?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SystemOverviewResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      overview: {
        timestamp: new Date().toISOString(),
        services: {
          knowledgeGraph: { status: 'unknown' },
          ahis: { status: 'unknown' },
          aiGateway: { status: 'unknown' },
          kubernetes: { status: 'unknown' }
        },
        overallHealth: 'critical',
        activeServices: 0,
        totalServices: 4
      },
      error: 'Method not allowed'
    });
  }

  const startTime = Date.now();

  try {
    // Generate comprehensive system overview
    const overviewResponse = await ollamaAIAgent.generateSystemOverview();
    
    const processingTime = Date.now() - startTime;

    if (overviewResponse.success) {
      res.status(200).json({
        success: true,
        overview: overviewResponse.data?.overview || {
          timestamp: new Date().toISOString(),
          services: {
            knowledgeGraph: { status: 'unknown' },
            ahis: { status: 'unknown' },
            aiGateway: { status: 'unknown' },
            kubernetes: { status: 'unknown' }
          },
          overallHealth: 'critical',
          activeServices: 0,
          totalServices: 4
        },
        insights: overviewResponse.insights,
        recommendations: overviewResponse.recommendations,
        agentResponse: overviewResponse.response,
        processingTime
      });
    } else {
      res.status(503).json({
        success: false,
        overview: {
          timestamp: new Date().toISOString(),
          services: {
            knowledgeGraph: { status: 'unknown' },
            ahis: { status: 'unknown' },
            aiGateway: { status: 'unknown' },
            kubernetes: { status: 'unknown' }
          },
          overallHealth: 'critical',
          activeServices: 0,
          totalServices: 4
        },
        error: overviewResponse.error || 'Agent unavailable',
        processingTime
      });
    }

  } catch (error) {
    console.error('System overview API error:', error);
    
    const processingTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      overview: {
        timestamp: new Date().toISOString(),
        services: {
          knowledgeGraph: { status: 'error' },
          ahis: { status: 'error' },
          aiGateway: { status: 'error' },
          kubernetes: { status: 'error' }
        },
        overallHealth: 'critical',
        activeServices: 0,
        totalServices: 4
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime
    });
  }
}
