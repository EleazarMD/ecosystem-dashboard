/**
 * Knowledge Graph Approvals API
 * POST /api/approvals/knowledge-graph - Create knowledge graph approval request
 * 
 * Agent-facing endpoint for routing knowledge graph data additions/updates
 * through the approval system before persisting to the graph.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import ApprovalService from '@/services/ApprovalService';
import type { ApprovalActionType, KnowledgeGraphPayload, AgentSource } from '@/types/approval';

interface KnowledgeGraphApprovalRequest {
  action: 'add' | 'update' | 'delete';
  entity: KnowledgeGraphPayload;
  agent: {
    id: string;
    name: string;
    type?: AgentSource['type'];
    conversation_id?: string;
  };
  reasoning?: string;
  confidence?: number;
  context?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userId = (session.user as any).id;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      action,
      entity,
      agent,
      reasoning,
      confidence,
      context,
    } = req.body as KnowledgeGraphApprovalRequest;

    // Validate required fields
    if (!action || !entity || !agent) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['action', 'entity', 'agent'],
      });
    }

    if (!['add', 'update', 'delete'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        valid_actions: ['add', 'update', 'delete'],
      });
    }

    // Validate entity payload
    if (!entity.entity_type || !entity.name) {
      return res.status(400).json({
        error: 'Invalid entity payload',
        required: ['entity_type', 'name'],
      });
    }

    // For update/delete, entity_id is required
    if ((action === 'update' || action === 'delete') && !entity.entity_id) {
      return res.status(400).json({
        error: `entity_id is required for ${action} action`,
      });
    }

    // Map action to approval action type
    const actionTypeMap: Record<string, ApprovalActionType> = {
      add: 'knowledge_graph_add',
      update: 'knowledge_graph_update',
      delete: 'knowledge_graph_delete',
    };

    const agentSource: AgentSource = {
      id: agent.id,
      name: agent.name,
      type: agent.type || 'workspace-ai',
      conversation_id: agent.conversation_id,
    };

    // Generate a descriptive title
    const actionVerb = action === 'add' ? 'Add' : action === 'update' ? 'Update' : 'Delete';
    const entityTypeLabel = entity.entity_type.charAt(0).toUpperCase() + entity.entity_type.slice(1);
    const title = `${actionVerb} ${entityTypeLabel}: "${entity.name}"`;

    // Build summary with key properties
    let summary = `${actionVerb} ${entity.entity_type} "${entity.name}"`;
    if (entity.relationships && entity.relationships.length > 0) {
      summary += ` with ${entity.relationships.length} relationship(s)`;
    }
    if (entity.source) {
      summary += ` (source: ${entity.source})`;
    }

    // Create the approval request
    const approval = await ApprovalService.createApprovalRequest({
      actionType: actionTypeMap[action],
      payload: entity,
      agent: agentSource,
      userId,
      title,
      aiReasoning: reasoning || summary,
      aiConfidence: confidence ?? entity.confidence,
      context,
    });

    return res.status(201).json({
      success: true,
      approval_id: approval.id,
      status: approval.status,
      message: approval.status === 'approved'
        ? 'Knowledge graph action auto-approved and executed'
        : 'Knowledge graph action queued for approval',
      approval: {
        id: approval.id,
        status: approval.status,
        priority: approval.priority,
        risk_level: approval.risk.level,
        expires_at: approval.expires_at,
      },
    });

  } catch (error) {
    console.error('[Knowledge Graph Approvals API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
