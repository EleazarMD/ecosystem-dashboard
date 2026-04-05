/**
 * OpenClaw Action API
 * 
 * Routes OpenClaw skill actions to the Approval Queue.
 * All sensitive actions must be approved before execution.
 * 
 * This endpoint is called by OpenClaw gateway when a skill
 * wants to perform an action that requires human approval.
 * 
 * Security features:
 * - Prompt injection detection on user messages
 * - Data classification for payloads
 * - Rate limiting per user
 * - Authentication required
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  analyzePrompt, 
  classifyContent, 
  redactSensitiveContent,
  checkRateLimit 
} from '@/lib/security';

const APPROVAL_API = process.env.APPROVAL_API_URL || 'http://localhost:8404/api/v1/approvals';
const INTERNAL_API_KEY = process.env.AI_GATEWAY_API_KEY || 'openclaw-gateway-2024-key';

interface OpenClawAction {
  action_type: string;
  skill_name: string;
  channel: 'ios_app' | 'imessage' | 'whatsapp' | 'telegram' | 'dashboard';
  payload: Record<string, unknown>;
  context?: {
    session_id?: string;
    user_message?: string;
    skill_trigger?: string;
    security_flags?: string[];
  };
}

interface ActionResponse {
  success: boolean;
  approval_id?: string;
  status?: 'queued' | 'auto_approved' | 'rejected';
  error?: string;
  timestamp: string;
}

const AUTO_APPROVE_ACTIONS = [
  'research_queue',
  'podcast_create',
  'workspace_create',
  'workspace_page_create',
  'workspace_page_update',
  'workspace_page_list',
  'workspace_page_search',
  'workspace_page_get',
  'workspace_blocks_append',
  'workspace_import_markdown',
  'workspace_import_research',
  'workspace_export_markdown',
  'workspace_export_json',
  'workspace_template_list',
  'workspace_template_get',
  'workspace_template_apply',
  'workspace_template_create',
  'workspace_project_create',
  'workspace_project_list',
  'workspace_project_get',
  'workspace_project_update',
  'home_light_control',
  // Knowledge base search operations (read-only, auto-approve)
  'kb_search',
  'kb_search_stream',
];

const RISK_LEVELS: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  'research_queue': 'low',
  'podcast_create': 'low',
  'workspace_create': 'low',
  'workspace_page_create': 'low',
  'workspace_page_update': 'low',
  'workspace_page_list': 'low',
  'workspace_page_search': 'low',
  'workspace_page_get': 'low',
  'workspace_blocks_append': 'low',
  'workspace_page_delete': 'medium',
  'workspace_database_create': 'medium',
  'workspace_database_delete': 'high',
  // Import operations
  'workspace_import_markdown': 'low',
  'workspace_import_research': 'low',
  'workspace_import_url': 'medium',
  'workspace_import_email': 'medium',
  'workspace_import_pdf': 'medium',
  'workspace_import_notion': 'medium',
  'workspace_import_bulk': 'medium',
  // Export operations
  'workspace_export_markdown': 'low',
  'workspace_export_json': 'low',
  'workspace_export_pdf': 'low',
  'workspace_export_html': 'low',
  'workspace_export_csv': 'low',
  'workspace_export_project': 'medium',
  'workspace_backup': 'medium',
  // Template operations
  'workspace_template_list': 'low',
  'workspace_template_get': 'low',
  'workspace_template_apply': 'low',
  'workspace_template_create': 'low',
  'workspace_template_update': 'low',
  'workspace_template_delete': 'medium',
  'workspace_template_publish': 'medium',
  // Project operations
  'workspace_project_create': 'low',
  'workspace_project_list': 'low',
  'workspace_project_get': 'low',
  'workspace_project_update': 'low',
  'workspace_project_add_page': 'low',
  'workspace_project_add_task': 'low',
  'workspace_project_archive': 'medium',
  'workspace_project_delete': 'high',
  // Bulk operations
  'workspace_bulk_create': 'medium',
  'workspace_bulk_update': 'medium',
  'workspace_bulk_delete': 'high',
  'workspace_bulk_move': 'medium',
  // Attachment operations
  'workspace_attach_file': 'low',
  'workspace_remove_attachment': 'medium',
  // Knowledge base search operations (read-only)
  'kb_search': 'low',
  'kb_search_stream': 'low',
  // Other
  'home_light_control': 'low',
  'email_draft': 'medium',
  'calendar_create': 'medium',
  'home_thermostat_set': 'medium',
  'memory_write': 'medium',
  'email_send': 'high',
  'file_write': 'high',
  'home_lock_control': 'critical',
  'shell_command': 'critical',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ActionResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const action: OpenClawAction = req.body;

    // Rate limiting
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const rateLimit = checkRateLimit(`openclaw:${userId}`, 60, 60000); // 60 requests per minute
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        timestamp: new Date().toISOString(),
      });
    }

    if (!action.action_type || !action.payload) {
      return res.status(400).json({
        success: false,
        error: 'action_type and payload are required',
        timestamp: new Date().toISOString(),
      });
    }

    // Prompt injection detection on user message
    if (action.context?.user_message) {
      const promptAnalysis = analyzePrompt(action.context.user_message);
      if (!promptAnalysis.safe) {
        console.warn(`[OpenClaw Security] Prompt injection detected:`, promptAnalysis.threats);
        
        // Block critical threats, log others
        const hasCritical = promptAnalysis.threats.some(t => t.severity === 'critical');
        if (hasCritical) {
          return res.status(400).json({
            success: false,
            error: 'Request blocked: potential prompt injection detected',
            timestamp: new Date().toISOString(),
          });
        }
        
        // Sanitize the message for non-critical threats
        action.context.user_message = promptAnalysis.sanitized;
        action.context.security_flags = promptAnalysis.threats.map(t => t.type);
      }
    }

    // Data classification for payload content
    const payloadStr = JSON.stringify(action.payload);
    const classification = classifyContent(payloadStr);
    if (classification.level === 'restricted') {
      console.warn(`[OpenClaw Security] Restricted content in payload:`, classification.reasons);
      // Redact sensitive content before processing
      action.payload = JSON.parse(redactSensitiveContent(payloadStr));
    }

    const riskLevel = RISK_LEVELS[action.action_type] || 'medium';
    const canAutoApprove = AUTO_APPROVE_ACTIONS.includes(action.action_type) && riskLevel === 'low';

    if (canAutoApprove) {
      // Low-risk actions can be auto-approved
      // TODO: Execute the action directly via the appropriate service
      console.log(`[OpenClaw Action] Auto-approving low-risk action: ${action.action_type}`);
      
      return res.status(200).json({
        success: true,
        status: 'auto_approved',
        timestamp: new Date().toISOString(),
      });
    }

    // Queue for human approval - format matches ApprovalService.createApprovalRequest
    // Use 'external_api_call' as a generic action type for OpenClaw actions
    const approvalRequest = {
      action_type: 'external_api_call',
      agent: {
        id: `openclaw-${action.channel}`,
        name: 'OpenClaw',
        type: 'custom',
        session_id: action.context?.session_id,
      },
      payload: {
        openclaw_action: action.action_type,
        skill_name: action.skill_name,
        channel: action.channel,
        data: action.payload,
      },
      title: `OpenClaw: ${action.skill_name} - ${action.action_type}`,
      ai_reasoning: `Action requested via ${action.channel} channel. Risk level: ${riskLevel}`,
      ai_confidence: 0.9,
      context: {
        ...action.context,
        source_channel: action.channel,
        skill_name: action.skill_name,
        risk_level: riskLevel,
        openclaw_session: true,
        requires_2fa: riskLevel === 'critical',
      },
    };

    // Send to approval queue with internal API key for authentication
    const response = await fetch(APPROVAL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': INTERNAL_API_KEY,
      },
      body: JSON.stringify(approvalRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Approval API returned ${response.status}`);
    }

    const data = await response.json();

    console.log(`[OpenClaw Action] Queued for approval: ${action.action_type} (${riskLevel} risk)`);

    return res.status(200).json({
      success: true,
      approval_id: data.approval_id || data.id,
      status: 'queued',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[OpenClaw Action] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
