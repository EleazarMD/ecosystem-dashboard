/**
 * useChildApprovals Hook
 * 
 * Fetches and manages child approval requests for parents.
 * Integrates with the main approval system for unified management.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface ChildApprovalRequest {
  id: string;
  action_type: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  priority: string;
  title: string;
  summary: string;
  agent_name: string;
  created_at: string;
  expires_at?: string;
  risk_level: string;
  isChildRequest: boolean;
  childId: string;
  childName: string;
  childEmail: string;
  requestType: string;
  serviceId?: string;
  details?: Record<string, any>;
  respondedAt?: string;
  responseNotes?: string;
}

export interface ChildApprovalCounts {
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  total: number;
}

interface UseChildApprovalsResult {
  approvals: ChildApprovalRequest[];
  counts: ChildApprovalCounts;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  approve: (approvalId: string, notes?: string, expiresInHours?: number) => Promise<boolean>;
  reject: (approvalId: string, notes?: string) => Promise<boolean>;
}

export function useChildApprovals(options?: {
  status?: string;
  childId?: string;
  includeExpired?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}): UseChildApprovalsResult {
  const { data: session } = useSession();
  const [approvals, setApprovals] = useState<ChildApprovalRequest[]>([]);
  const [counts, setCounts] = useState<ChildApprovalCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    const user = session?.user as any;
    if (!user?.isParent && user?.accountType !== 'admin') {
      setApprovals([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options?.status) params.set('status', options.status);
      if (options?.childId) params.set('childId', options.childId);
      if (options?.includeExpired) params.set('includeExpired', 'true');

      const response = await fetch(`/api/approvals/child-requests?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch child approvals');
      }

      const data = await response.json();
      setApprovals(data.approvals || []);
      setCounts(data.counts || { pending: 0, approved: 0, rejected: 0, expired: 0, total: 0 });
    } catch (err) {
      console.error('[useChildApprovals] Error:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [session, options?.status, options?.childId, options?.includeExpired]);

  // Initial fetch
  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Auto-refresh
  useEffect(() => {
    if (!options?.autoRefresh) return;

    const interval = setInterval(fetchApprovals, options.refreshInterval || 30000);
    return () => clearInterval(interval);
  }, [fetchApprovals, options?.autoRefresh, options?.refreshInterval]);

  const approve = useCallback(async (
    approvalId: string,
    notes?: string,
    expiresInHours?: number
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/approvals/child-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId,
          action: 'approve',
          notes,
          expiresInHours,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve');
      }

      // Update local state
      setApprovals(prev =>
        prev.map(a =>
          a.id === approvalId ? { ...a, status: 'approved' as const } : a
        )
      );
      setCounts(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        approved: prev.approved + 1,
      }));

      return true;
    } catch (err) {
      console.error('[useChildApprovals] Approve error:', err);
      return false;
    }
  }, []);

  const reject = useCallback(async (
    approvalId: string,
    notes?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/approvals/child-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId,
          action: 'reject',
          notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject');
      }

      // Update local state
      setApprovals(prev =>
        prev.map(a =>
          a.id === approvalId ? { ...a, status: 'rejected' as const } : a
        )
      );
      setCounts(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        rejected: prev.rejected + 1,
      }));

      return true;
    } catch (err) {
      console.error('[useChildApprovals] Reject error:', err);
      return false;
    }
  }, []);

  return {
    approvals,
    counts,
    isLoading,
    error,
    refresh: fetchApprovals,
    approve,
    reject,
  };
}

export default useChildApprovals;
