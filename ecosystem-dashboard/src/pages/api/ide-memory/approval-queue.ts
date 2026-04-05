/**
 * AI Truth Engine - Approval Queue Management API
 * 
 * Manages the queue of AI-generated memory corrections awaiting human approval.
 * Provides real-time access to pending corrections with evidence and confidence scores.
 * 
 * @module api/ide-memory/approval-queue
 * @version 1.0.0
 * @updated 2025-08-15
 */

import { NextApiRequest, NextApiResponse } from 'next';

// AI Truth Engine configuration
const AI_TRUTH_ENGINE_URL = process.env.AI_TRUTH_ENGINE_URL || 'http://localhost:3001';

// Cache for approval queue data (30 seconds for real-time updates)
let approvalQueueCache: {
  data: any;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 30 * 1000; // 30 seconds

// Types for approval workflow
interface PendingCorrection {
  id: string;
  memory_id: string;
  memory_title: string;
  correction_type: 'accuracy' | 'consistency' | 'compliance' | 'optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  evidence_count: number;
  workspace: string;
  created_at: string;
  current_content: string;
  proposed_content: string;
  reasoning: string;
  evidence: Array<{
    type: string;
    content: string;
    confidence: number;
  }>;
}

interface ApprovalQueueResponse {
  pending_corrections: PendingCorrection[];
  queue_stats: {
    total_pending: number;
    by_priority: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    by_type: {
      accuracy: number;
      consistency: number;
      compliance: number;
      optimization: number;
    };
  };
  metadata: {
    last_updated: string;
    queue_health: 'healthy' | 'warning' | 'critical';
    processing_rate: number;
    estimated_review_time: number;
  };
}

const calculateQueueStats = (corrections: PendingCorrection[]) => {
  return {
    total_pending: corrections.length,
    by_priority: {
      critical: corrections.filter(c => c.priority === 'critical').length,
      high: corrections.filter(c => c.priority === 'high').length,
      medium: corrections.filter(c => c.priority === 'medium').length,
      low: corrections.filter(c => c.priority === 'low').length,
    },
    by_type: {
      accuracy: corrections.filter(c => c.correction_type === 'accuracy').length,
      consistency: corrections.filter(c => c.correction_type === 'consistency').length,
      compliance: corrections.filter(c => c.correction_type === 'compliance').length,
      optimization: corrections.filter(c => c.correction_type === 'optimization').length,
    }
  };
};

const getQueueHealth = (stats: any): 'healthy' | 'warning' | 'critical' => {
  if (stats.by_priority.critical > 0) return 'critical';
  if (stats.total_pending > 10 || stats.by_priority.high > 5) return 'warning';
  return 'healthy';
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priority, correction_type, workspace, limit = 20, offset = 0 } = req.query;

    console.log('[approval-queue] Fetching corrections with filters:', {
      priority,
      correction_type,
      workspace,
      limit,
      offset
    });

    // Fetch real approval data from the Dashboard Approval API
    let sampleCorrections: PendingCorrection[] = [];
    
    try {
      const approvalApiResponse = await fetch('http://localhost:8767/api/approvals/pending');
      if (approvalApiResponse.ok) {
        const approvalData = await approvalApiResponse.json();
        
        // Transform the real API data to match our interface
        sampleCorrections = approvalData.approvals?.map((approval: any) => ({
          id: approval.approval_id,
          memory_id: approval.memory_id,
          memory_title: approval.memory_id || `Memory ${approval.approval_id.slice(0, 8)}`,
          correction_type: approval.metadata?.correction_category || 'accuracy',
          priority: approval.priority || 'medium',
          confidence_score: approval.metadata?.confidence_score || 0.8,
          evidence_count: approval.metadata?.evidence_sources?.length || 0,
          workspace: approval.workspace || 'Unknown',
          created_at: approval.created_at,
          current_content: approval.original_content || '',
          proposed_content: approval.proposed_content || '',
          reasoning: approval.metadata?.ai_reasoning || approval.correction_reason || 'No reasoning provided',
          evidence: approval.metadata?.evidence_sources?.map((source: string) => ({
            type: 'documentation',
            content: source,
            confidence: 0.8
          })) || []
        })) || [];
        
        console.log('[approval-queue] Fetched real approval data:', sampleCorrections.length, 'corrections');
      } else {
        throw new Error(`Approval API returned ${approvalApiResponse.status}`);
      }
    } catch (error) {
      console.error('[approval-queue] Failed to fetch real approval data, using fallback:', error);
      // Fallback to empty array if API is unavailable
      sampleCorrections = [];
    }

    // Filter corrections based on query parameters
    let filteredCorrections = sampleCorrections;
    
    if (priority && typeof priority === 'string') {
      filteredCorrections = filteredCorrections.filter(c => c.priority === priority);
    }
    
    if (correction_type && typeof correction_type === 'string' && correction_type !== 'all') {
      filteredCorrections = filteredCorrections.filter(c => c.correction_type === correction_type);
    }
    
    if (workspace && typeof workspace === 'string') {
      filteredCorrections = filteredCorrections.filter(c => c.workspace === workspace);
    }

    // Calculate statistics
    const queueStats = calculateQueueStats(filteredCorrections);
    const queueHealth = getQueueHealth(queueStats);

    // Estimate processing metrics
    const processingRate = 2.5; // corrections per hour
    const estimatedReviewTime = Math.max(5, filteredCorrections.length * 15); // minutes

    const response: ApprovalQueueResponse = {
      pending_corrections: filteredCorrections,
      queue_stats: queueStats,
      metadata: {
        last_updated: new Date().toISOString(),
        queue_health: queueHealth,
        processing_rate: processingRate,
        estimated_review_time: estimatedReviewTime
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Approval queue API error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch approval queue data. AI Truth Engine may be unavailable.' 
    });
  }
}
