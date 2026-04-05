/**
 * AI Truth Engine - Approval Workflow Hooks
 * 
 * React hooks for managing the human oversight approval workflow.
 * Provides real-time queue management, decision processing, and statistics.
 * 
 * @module hooks/useApprovalWorkflow
 * @version 1.0.0
 * @updated 2025-08-15
 */

import { useState, useEffect, useCallback } from 'react';

// Types
interface PendingCorrection {
  id: string;
  memory_id: string;
  memory_title: string;
  correction_type: 'factual' | 'consistency' | 'compliance' | 'optimization';
  original_content: string;
  proposed_content: string;
  ai_reasoning: string;
  evidence_sources: string[];
  confidence_score: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  workspace: string;
  affected_files: string[];
  impact_assessment: {
    scope: 'local' | 'workspace' | 'ecosystem';
    risk_level: 'low' | 'medium' | 'high';
    dependencies: string[];
  };
}

interface ApprovalQueueData {
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
      factual: number;
      consistency: number;
      compliance: number;
      optimization: number;
    };
    average_confidence: number;
    oldest_pending: string;
  };
  metadata: {
    last_updated: string;
    queue_health: 'healthy' | 'warning' | 'critical';
    processing_rate: number;
    estimated_review_time: number;
  };
}

interface ApprovalStats {
  overview: {
    total_corrections_processed: number;
    approval_rate: number;
    rejection_rate: number;
    modification_rate: number;
    average_processing_time_minutes: number;
    current_queue_size: number;
  };
  accuracy_metrics: {
    ai_accuracy_score: number;
    human_agreement_rate: number;
    correction_effectiveness: number;
    false_positive_rate: number;
  };
  processing_trends: {
    daily_throughput: number[];
    weekly_approval_rates: number[];
    correction_type_distribution: {
      factual: number;
      consistency: number;
      compliance: number;
      optimization: number;
    };
  };
  reviewer_metrics: {
    active_reviewers: number;
    average_review_time: number;
    top_reviewers: Array<{
      name: string;
      decisions_count: number;
      accuracy_score: number;
    }>;
  };
  system_health: {
    queue_health: 'healthy' | 'warning' | 'critical';
    processing_efficiency: number;
    ai_engine_uptime: number;
    last_system_check: string;
  };
}

interface ApprovalDecision {
  correction_id: string;
  decision: 'approve' | 'reject' | 'modify';
  human_comments?: string;
  modified_content?: string;
  reviewer_id: string;
  reviewer_name: string;
}

// Hook for managing approval queue
export const useApprovalQueue = (filters?: {
  priority?: string;
  type?: string;
  workspace?: string;
}) => {
  const [data, setData] = useState<ApprovalQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.workspace) params.append('workspace', filters.workspace);

      // Use fetch with timeout and error suppression for offline mode
      let response;
      try {
        response = await fetch(`http://localhost:8767/api/approvals/pending?${params}`, {
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
      } catch (fetchError) {
        // Network error - API is offline, return empty data
        console.info('📊 Approval API offline - showing empty queue');
        setData({
          pending_corrections: [],
          queue_stats: {
            total_pending: 0,
            by_priority: { critical: 0, high: 0, medium: 0, low: 0 },
            by_type: { factual: 0, consistency: 0, compliance: 0, optimization: 0 },
            average_confidence: 0,
            oldest_pending: new Date().toISOString()
          },
          metadata: {
            last_updated: new Date().toISOString(),
            queue_health: 'warning',
            processing_rate: 0,
            estimated_review_time: 0
          }
        });
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        // Return empty queue data instead of throwing
        console.warn('Approval API not available:', response.statusText);
        setData({
          pending_corrections: [],
          queue_stats: {
            total_pending: 0,
            by_priority: { critical: 0, high: 0, medium: 0, low: 0 },
            by_type: { factual: 0, consistency: 0, compliance: 0, optimization: 0 },
            average_confidence: 0,
            oldest_pending: new Date().toISOString()
          },
          metadata: {
            last_updated: new Date().toISOString(),
            queue_health: 'warning',
            processing_rate: 0,
            estimated_review_time: 0
          }
        });
        setLoading(false);
        return;
      }

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        console.warn('Approval API returned non-JSON response');
        setData({
          pending_corrections: [],
          queue_stats: {
            total_pending: 0,
            by_priority: { critical: 0, high: 0, medium: 0, low: 0 },
            by_type: { factual: 0, consistency: 0, compliance: 0, optimization: 0 },
            average_confidence: 0,
            oldest_pending: new Date().toISOString()
          },
          metadata: {
            last_updated: new Date().toISOString(),
            queue_health: 'warning',
            processing_rate: 0,
            estimated_review_time: 0
          }
        });
        setLoading(false);
        return;
      }

      const rawData = await response.json();
      
      // Transform API response to match expected format
      const queueData: ApprovalQueueData = {
        pending_corrections: rawData.approvals?.map((approval: any) => {
          console.log('Processing approval:', approval.approval_id, approval);
          return {
            id: approval.approval_id,
            memory_id: approval.memory_id,
            memory_title: approval.memory_id || `Memory ${approval.approval_id.slice(0, 8)}`,
            correction_type: approval.metadata?.correction_category || approval.correction_type || 'factual',
            original_content: approval.original_content || '',
            proposed_content: approval.proposed_content || '',
            ai_reasoning: approval.metadata?.ai_reasoning || approval.correction_reason || 'No reasoning provided',
            evidence_sources: approval.metadata?.evidence_sources || [],
            confidence_score: approval.metadata?.confidence_score || 0.8,
            priority: approval.priority || 'medium',
            created_at: approval.created_at,
            workspace: approval.workspace || 'Unknown',
            affected_files: approval.metadata?.impact_assessment?.dependencies || [],
            impact_assessment: approval.metadata?.impact_assessment || {
              scope: 'local',
              risk_level: 'low',
              dependencies: []
            }
          };
        }) || [],
        queue_stats: {
          total_pending: rawData.count || 0,
          by_priority: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
          },
          by_type: {
            factual: 0,
            consistency: 0,
            compliance: 0,
            optimization: 0
          },
          average_confidence: 0.8,
          oldest_pending: rawData.approvals?.[0]?.created_at || new Date().toISOString()
        },
        metadata: {
          last_updated: rawData.timestamp || new Date().toISOString(),
          queue_health: 'healthy',
          processing_rate: 0,
          estimated_review_time: 0
        }
      };
      
      setData(queueData);
    } catch (err) {
      // Suppress error state for expected offline conditions
      console.info('📊 Approval queue unavailable:', err instanceof Error ? err.message : 'Service offline');
      // Set empty data on network error
      setData({
        pending_corrections: [],
        queue_stats: {
          total_pending: 0,
          by_priority: { critical: 0, high: 0, medium: 0, low: 0 },
          by_type: { factual: 0, consistency: 0, compliance: 0, optimization: 0 },
          average_confidence: 0,
          oldest_pending: new Date().toISOString()
        },
        metadata: {
          last_updated: new Date().toISOString(),
          queue_health: 'warning',
          processing_rate: 0,
          estimated_review_time: 0
        }
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchQueue();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchQueue, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [fetchQueue]);

  return {
    data,
    loading,
    error,
    refetch: fetchQueue
  };
};

// Hook for processing approval decisions
export const useApprovalDecision = () => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processDecision = useCallback(async (decision: ApprovalDecision) => {
    try {
      setProcessing(true);
      setError(null);

      const response = await fetch(`http://localhost:8767/api/approvals/${decision.correction_id}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: decision.decision === 'approve' ? 'approved' : 'rejected',
          approved_by: decision.reviewer_id,
          reviewer_id: decision.reviewer_id,
          reviewer_name: decision.reviewer_name,
          comments: decision.human_comments,
          modified_content: decision.modified_content
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to process decision: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Approval decision error:', err);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    processDecision,
    processing,
    error
  };
};

// Hook for approval workflow statistics
export const useApprovalStats = () => {
  const [data, setData] = useState<ApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use fetch with timeout and error suppression for offline mode
      let response;
      try {
        response = await fetch('http://localhost:8767/api/approvals/stats', {
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
      } catch (fetchError) {
        // Network error - API is offline, return default stats
        console.info('📊 Approval Stats API offline - showing defaults');
        setData({
          overview: {
            total_corrections_processed: 0,
            approval_rate: 0,
            rejection_rate: 0,
            modification_rate: 0,
            average_processing_time_minutes: 0,
            current_queue_size: 0
          },
          accuracy_metrics: {
            ai_accuracy_score: 0,
            human_agreement_rate: 0,
            correction_effectiveness: 0,
            false_positive_rate: 0
          },
          processing_trends: {
            daily_throughput: [],
            weekly_approval_rates: [],
            correction_type_distribution: {
              factual: 0,
              consistency: 0,
              compliance: 0,
              optimization: 0
            }
          },
          reviewer_metrics: {
            active_reviewers: 0,
            average_review_time: 0,
            top_reviewers: []
          },
          system_health: {
            queue_health: 'warning',
            processing_efficiency: 0,
            ai_engine_uptime: 0,
            last_system_check: new Date().toISOString()
          }
        });
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        console.warn('Approval stats API not available:', response.statusText);
        // Return default stats
        setData({
          overview: {
            total_corrections_processed: 0,
            approval_rate: 0,
            rejection_rate: 0,
            modification_rate: 0,
            average_processing_time_minutes: 0,
            current_queue_size: 0
          },
          accuracy_metrics: {
            ai_accuracy_score: 0,
            human_agreement_rate: 0,
            correction_effectiveness: 0,
            false_positive_rate: 0
          },
          processing_trends: {
            daily_throughput: [],
            weekly_approval_rates: [],
            correction_type_distribution: {
              factual: 0,
              consistency: 0,
              compliance: 0,
              optimization: 0
            }
          },
          reviewer_metrics: {
            active_reviewers: 0,
            average_review_time: 0,
            top_reviewers: []
          },
          system_health: {
            queue_health: 'warning',
            processing_efficiency: 0,
            ai_engine_uptime: 0,
            last_system_check: new Date().toISOString()
          }
        });
        setLoading(false);
        return;
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        console.warn('Stats API returned non-JSON response');
        setData({
          overview: {
            total_corrections_processed: 0,
            approval_rate: 0,
            rejection_rate: 0,
            modification_rate: 0,
            average_processing_time_minutes: 0,
            current_queue_size: 0
          },
          accuracy_metrics: {
            ai_accuracy_score: 0,
            human_agreement_rate: 0,
            correction_effectiveness: 0,
            false_positive_rate: 0
          },
          processing_trends: {
            daily_throughput: [],
            weekly_approval_rates: [],
            correction_type_distribution: {
              factual: 0,
              consistency: 0,
              compliance: 0,
              optimization: 0
            }
          },
          reviewer_metrics: {
            active_reviewers: 0,
            average_review_time: 0,
            top_reviewers: []
          },
          system_health: {
            queue_health: 'warning',
            processing_efficiency: 0,
            ai_engine_uptime: 0,
            last_system_check: new Date().toISOString()
          }
        });
        setLoading(false);
        return;
      }

      const statsData = await response.json();
      setData(statsData);
    } catch (err) {
      // Suppress error state for expected offline conditions
      console.info('📊 Approval stats unavailable:', err instanceof Error ? err.message : 'Service offline');
      // Set default stats on network error
      setData({
        overview: {
          total_corrections_processed: 0,
          approval_rate: 0,
          rejection_rate: 0,
          modification_rate: 0,
          average_processing_time_minutes: 0,
          current_queue_size: 0
        },
        accuracy_metrics: {
          ai_accuracy_score: 0,
          human_agreement_rate: 0,
          correction_effectiveness: 0,
          false_positive_rate: 0
        },
        processing_trends: {
          daily_throughput: [],
          weekly_approval_rates: [],
          correction_type_distribution: {
            factual: 0,
            consistency: 0,
            compliance: 0,
            optimization: 0
          }
        },
        reviewer_metrics: {
          active_reviewers: 0,
          average_review_time: 0,
          top_reviewers: []
        },
        system_health: {
          queue_health: 'warning',
          processing_efficiency: 0,
          ai_engine_uptime: 0,
          last_system_check: new Date().toISOString()
        }
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    
    // Set up polling for stats updates
    const interval = setInterval(fetchStats, 60000); // Poll every minute
    
    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    data,
    loading,
    error,
    refetch: fetchStats
  };
};

// Hook for bulk approval operations
export const useBulkApproval = () => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { processDecision } = useApprovalDecision();

  const processBulkDecisions = useCallback(async (
    correctionIds: string[],
    decision: 'approve' | 'reject',
    reviewerId: string,
    reviewerName: string,
    comments?: string
  ) => {
    try {
      setProcessing(true);
      setError(null);

      const results = [];
      
      for (const correctionId of correctionIds) {
        const decisionData: ApprovalDecision = {
          correction_id: correctionId,
          decision,
          human_comments: comments,
          reviewer_id: reviewerId,
          reviewer_name: reviewerName
        };

        const result = await processDecision(decisionData);
        results.push(result);
      }

      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Bulk approval error:', err);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [processDecision]);

  return {
    processBulkDecisions,
    processing,
    error
  };
};

// Hook for real-time queue notifications
export const useQueueNotifications = () => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'new_correction' | 'high_priority' | 'queue_warning';
    message: string;
    timestamp: string;
  }>>([]);

  const addNotification = useCallback((notification: {
    type: 'new_correction' | 'high_priority' | 'queue_warning';
    message: string;
  }) => {
    const newNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...notification,
      timestamp: new Date().toISOString()
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep last 10
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    clearNotification,
    clearAllNotifications
  };
};
