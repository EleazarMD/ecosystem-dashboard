/**
 * API endpoint for audit trail management and tracking
 * Provides visibility into correction lifecycle and system changes
 */

import { NextApiRequest, NextApiResponse } from 'next';

interface AuditEntry {
  id: string;
  correction_id: string;
  action: 'approve' | 'reject' | 'modify';
  timestamp: string;
  user_id: string;
  comments?: string;
  writeback_status: {
    ide_memory: boolean;
    knowledge_graph: boolean;
    filesystem: boolean;
  };
  verification_status: 'pending' | 'verified' | 'failed';
  success: boolean;
  error?: string;
  impact_metrics?: {
    files_affected: number;
    memories_updated: number;
    entities_modified: number;
  };
}

// In-memory audit storage (replace with persistent database in production)
const auditTrail: AuditEntry[] = [];

const generateMockAuditEntries = () => {
  const mockEntries: AuditEntry[] = [
    {
      id: 'audit_1723747200_abc123',
      correction_id: 'correction_demo_1723747096_1',
      action: 'approve',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      user_id: 'human_oversight',
      comments: 'MCP integration status is accurate - approved for immediate application',
      writeback_status: {
        ide_memory: true,
        knowledge_graph: true,
        filesystem: true
      },
      verification_status: 'verified',
      success: true,
      impact_metrics: {
        files_affected: 2,
        memories_updated: 1,
        entities_modified: 3
      }
    },
    {
      id: 'audit_1723747500_def456',
      correction_id: 'correction_health_1723747200',
      action: 'modify',
      timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      user_id: 'human_oversight',
      comments: 'Health score correction modified to include more context about optimization opportunities',
      writeback_status: {
        ide_memory: true,
        knowledge_graph: false,
        filesystem: true
      },
      verification_status: 'pending',
      success: false,
      error: 'Knowledge Graph update failed - connection timeout',
      impact_metrics: {
        files_affected: 1,
        memories_updated: 1,
        entities_modified: 0
      }
    },
    {
      id: 'audit_1723747800_ghi789',
      correction_id: 'correction_workflow_1723747300',
      action: 'reject',
      timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
      user_id: 'human_oversight',
      comments: 'Workflow description needs more technical detail before approval',
      writeback_status: {
        ide_memory: false,
        knowledge_graph: false,
        filesystem: false
      },
      verification_status: 'verified',
      success: true,
      impact_metrics: {
        files_affected: 0,
        memories_updated: 0,
        entities_modified: 0
      }
    }
  ];

  // Add mock entries if audit trail is empty
  if (auditTrail.length === 0) {
    auditTrail.push(...mockEntries);
  }
};

const calculateAuditStats = () => {
  const stats = {
    total_actions: auditTrail.length,
    by_action: {
      approve: auditTrail.filter(entry => entry.action === 'approve').length,
      reject: auditTrail.filter(entry => entry.action === 'reject').length,
      modify: auditTrail.filter(entry => entry.action === 'modify').length
    },
    success_rate: auditTrail.length > 0 
      ? auditTrail.filter(entry => entry.success).length / auditTrail.length 
      : 0,
    verification_status: {
      verified: auditTrail.filter(entry => entry.verification_status === 'verified').length,
      pending: auditTrail.filter(entry => entry.verification_status === 'pending').length,
      failed: auditTrail.filter(entry => entry.verification_status === 'failed').length
    },
    writeback_health: {
      ide_memory: auditTrail.filter(entry => entry.writeback_status.ide_memory).length,
      knowledge_graph: auditTrail.filter(entry => entry.writeback_status.knowledge_graph).length,
      filesystem: auditTrail.filter(entry => entry.writeback_status.filesystem).length
    },
    recent_activity: auditTrail
      .filter(entry => new Date(entry.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000))
      .length
  };

  return stats;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { 
        limit = 20, 
        offset = 0, 
        action_filter, 
        user_filter, 
        success_filter,
        verification_filter 
      } = req.query;

      // Generate mock data for demonstration
      generateMockAuditEntries();

      // Apply filters
      let filteredEntries = [...auditTrail];

      if (action_filter && action_filter !== 'all') {
        filteredEntries = filteredEntries.filter(entry => entry.action === action_filter);
      }

      if (user_filter && user_filter !== 'all') {
        filteredEntries = filteredEntries.filter(entry => entry.user_id === user_filter);
      }

      if (success_filter === 'true') {
        filteredEntries = filteredEntries.filter(entry => entry.success);
      } else if (success_filter === 'false') {
        filteredEntries = filteredEntries.filter(entry => !entry.success);
      }

      if (verification_filter && verification_filter !== 'all') {
        filteredEntries = filteredEntries.filter(entry => entry.verification_status === verification_filter);
      }

      // Sort by timestamp (newest first)
      filteredEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      const paginatedEntries = filteredEntries.slice(
        parseInt(offset as string), 
        parseInt(offset as string) + parseInt(limit as string)
      );

      const stats = calculateAuditStats();

      res.status(200).json({
        audit_entries: paginatedEntries,
        total_count: filteredEntries.length,
        stats,
        metadata: {
          last_updated: new Date().toISOString(),
          audit_health: stats.success_rate > 0.8 ? 'healthy' : 'needs_attention',
          pending_verifications: stats.verification_status.pending
        }
      });

    } catch (error) {
      console.error('[audit-trail] Error fetching audit trail:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }

  } else if (req.method === 'POST') {
    // Add new audit entry
    try {
      const auditEntry: AuditEntry = req.body;
      
      if (!auditEntry.id || !auditEntry.correction_id || !auditEntry.action) {
        return res.status(400).json({ error: 'Missing required audit entry fields' });
      }

      auditTrail.push(auditEntry);
      console.log('[audit-trail] Added new entry:', auditEntry.id);

      res.status(201).json({ 
        success: true, 
        audit_id: auditEntry.id,
        message: 'Audit entry created successfully' 
      });

    } catch (error) {
      console.error('[audit-trail] Error creating audit entry:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
