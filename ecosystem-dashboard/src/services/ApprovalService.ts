/**
 * Approval Service
 * 
 * Core service for managing AI action approvals.
 * Handles creating approval requests, executing approved actions,
 * and managing the approval workflow.
 * 
 * Uses PostgreSQL for persistent storage.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ApprovalRequest,
  ApprovalSummary,
  ApprovalStats,
  ApprovalSettings,
  ApprovalActionType,
  ApprovalPayload,
  ApprovalPriority,
  AgentSource,
  RiskAssessment,
  CalendarEventPayload,
  EmailPayload,
  CostAttribution,
  CostBreakdownItem,
  CloudProvider,
  CloudServiceInfo,
  ResearchRequestPayload,
} from '@/types/approval';
import { isCalendarPayload, isEmailPayload, MODEL_PRICING } from '@/types/approval';
import pool from '@/lib/db/approvals-db';

// In-memory cache for settings (loaded from DB on first access)
let settingsCache: Map<string, ApprovalSettings> = new Map();

// Event emitter for real-time updates
type ApprovalEventHandler = (event: string, data: any) => void;
const eventHandlers: Set<ApprovalEventHandler> = new Set();

export function onApprovalEvent(handler: ApprovalEventHandler) {
  eventHandlers.add(handler);
  return () => eventHandlers.delete(handler);
}

function emitEvent(event: string, data: any) {
  eventHandlers.forEach(handler => {
    try {
      handler(event, data);
    } catch (err) {
      console.error('[ApprovalService] Event handler error:', err);
    }
  });
}

/**
 * Assess the risk level of an action
 */
function assessRisk(
  actionType: ApprovalActionType,
  payload: ApprovalPayload
): RiskAssessment {
  const factors: string[] = [];
  let level: RiskAssessment['level'] = 'low';
  let externalImpact = false;
  let financialImpact = false;
  let privacyImpact = false;
  let reversible = true;

  // Check for external recipients (emails to non-family)
  if (isEmailPayload(payload)) {
    const emailPayload = payload as EmailPayload;
    externalImpact = true;
    factors.push('Sends email to external recipients');
    
    if (emailPayload.attachments && emailPayload.attachments.length > 0) {
      factors.push('Contains attachments');
      privacyImpact = true;
      level = 'medium';
    }
    
    if (actionType === 'email_send') {
      reversible = false;
      factors.push('Email cannot be unsent');
      level = level === 'low' ? 'medium' : level;
    }
  }

  // Check calendar events with attendees
  if (isCalendarPayload(payload)) {
    const calendarPayload = payload as CalendarEventPayload;
    
    if (calendarPayload.attendees && calendarPayload.attendees.length > 0) {
      externalImpact = true;
      factors.push(`Includes ${calendarPayload.attendees.length} attendee(s)`);
      level = 'medium';
    }
    
    if (actionType === 'calendar_event_delete') {
      factors.push('Deletes existing event');
      level = level === 'low' ? 'medium' : level;
    }
  }

  // High-risk action types
  if (['file_delete', 'system_setting_change', 'external_api_call'].includes(actionType)) {
    level = 'high';
    factors.push('Potentially destructive action');
  }

  // Critical if financial or affects system settings
  if (financialImpact || actionType === 'system_setting_change') {
    level = 'critical';
  }

  return {
    level,
    factors,
    reversible,
    external_impact: externalImpact,
    financial_impact: financialImpact,
    privacy_impact: privacyImpact,
  };
}

/**
 * Determine priority based on action type and context
 */
function determinePriority(
  actionType: ApprovalActionType,
  risk: RiskAssessment,
  payload: ApprovalPayload
): ApprovalPriority {
  // Critical risk = critical priority
  if (risk.level === 'critical') return 'critical';
  
  // Time-sensitive actions
  if (isCalendarPayload(payload)) {
    const calendarPayload = payload as CalendarEventPayload;
    const startTime = new Date(calendarPayload.start_time);
    const hoursUntilEvent = (startTime.getTime() - Date.now()) / (1000 * 60 * 60);
    
    if (hoursUntilEvent < 1) return 'critical';
    if (hoursUntilEvent < 24) return 'high';
  }
  
  // Scheduled emails
  if (isEmailPayload(payload)) {
    const emailPayload = payload as EmailPayload;
    if (emailPayload.send_at) {
      const sendTime = new Date(emailPayload.send_at);
      const hoursUntilSend = (sendTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilSend < 1) return 'high';
    }
  }
  
  // Default based on risk
  return risk.level === 'high' ? 'high' : 'normal';
}

/**
 * Generate a human-readable summary
 */
function generateSummary(
  actionType: ApprovalActionType,
  payload: ApprovalPayload
): string {
  if (isCalendarPayload(payload)) {
    const p = payload as CalendarEventPayload;
    const date = new Date(p.start_time).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    
    if (actionType === 'calendar_event_create') {
      return `Create "${p.title}" on ${date}${p.attendees?.length ? ` with ${p.attendees.length} attendee(s)` : ''}`;
    }
    if (actionType === 'calendar_event_delete') {
      return `Delete event "${p.title}" scheduled for ${date}`;
    }
    if (actionType === 'calendar_invite_send') {
      return `Send invite for "${p.title}" to ${p.attendees?.length || 0} people`;
    }
  }
  
  if (isEmailPayload(payload)) {
    const p = payload as EmailPayload;
    const recipients = p.to.map(r => r.name || r.email).join(', ');
    
    if (actionType === 'email_send') {
      return `Send email "${p.subject}" to ${recipients}`;
    }
    if (actionType === 'email_draft_create') {
      return `Create draft "${p.subject}" for ${recipients}`;
    }
    if (actionType === 'email_reply') {
      return `Reply to thread: "${p.subject}"`;
    }
  }
  
  return `${actionType.replace(/_/g, ' ')}`;
}

/**
 * Create a new approval request
 */
export async function createApprovalRequest(params: {
  actionType: ApprovalActionType;
  payload: ApprovalPayload;
  agent: AgentSource;
  userId: string;
  title?: string;
  aiReasoning?: string;
  aiConfidence?: number;
  context?: string;
}): Promise<ApprovalRequest> {
  const { actionType, payload, agent, userId, title, aiReasoning, aiConfidence, context } = params;
  
  const risk = assessRisk(actionType, payload);
  const priority = determinePriority(actionType, risk, payload);
  const summary = generateSummary(actionType, payload);
  
  // Get user settings for expiry
  const settings = await getSettings(userId);
  const expiryHours = settings.action_settings[actionType]?.expiry_hours || settings.expiry_hours;
  
  const approvalId = uuidv4();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
  
  const approval: ApprovalRequest = {
    id: approvalId,
    action_type: actionType,
    status: 'pending',
    priority,
    agent,
    user_id: userId,
    title: title || generateSummary(actionType, payload),
    summary,
    payload,
    ai_reasoning: aiReasoning,
    ai_confidence: aiConfidence,
    context,
    risk,
    created_at: createdAt,
    expires_at: expiresAt,
    notifications_sent: [],
  };
  
  // Check for auto-approval
  const shouldAutoApprove = checkAutoApproval(approval, settings);
  if (shouldAutoApprove) {
    approval.status = 'approved';
    approval.reviewed_at = new Date().toISOString();
    approval.reviewed_by = 'auto-approval';
  }
  
  // Store the approval in PostgreSQL
  try {
    await pool.query(`
      INSERT INTO approval_requests (
        id, action_type, status, priority, user_id,
        agent_id, agent_name, agent_type, agent_session_id,
        title, summary, payload,
        ai_reasoning, ai_confidence, context,
        risk_level, risk_factors, risk_external_impact, risk_financial_impact, risk_privacy_impact, risk_reversible,
        created_at, expires_at, reviewed_at, reviewed_by,
        notifications_sent
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25,
        $26
      )
    `, [
      approval.id, approval.action_type, approval.status, approval.priority, approval.user_id,
      agent.id, agent.name, agent.type, agent.session_id,
      approval.title, approval.summary, JSON.stringify(payload),
      aiReasoning, aiConfidence, context,
      risk.level, JSON.stringify(risk.factors), risk.external_impact, risk.financial_impact, risk.privacy_impact, risk.reversible,
      createdAt, expiresAt, approval.reviewed_at, approval.reviewed_by,
      JSON.stringify(approval.notifications_sent)
    ]);
  } catch (dbError) {
    console.error('[ApprovalService] Database insert error:', dbError);
    throw dbError;
  }
  
  // Execute if auto-approved
  if (shouldAutoApprove) {
    await executeApprovedAction(approval);
  }
  
  // Emit event for real-time updates
  emitEvent('new_approval', approval);
  
  // Send notifications if pending
  if (approval.status === 'pending') {
    await sendNotifications(approval, settings);
  }
  
  console.log(`[ApprovalService] Created approval ${approval.id} for ${actionType} (status: ${approval.status})`);
  
  return approval;
}

/**
 * Check if an action should be auto-approved
 */
function checkAutoApproval(approval: ApprovalRequest, settings: ApprovalSettings): boolean {
  if (!settings.enabled) return true; // Approval disabled = auto-approve all
  
  // Check if agent is trusted
  if (settings.trusted_agents.includes(approval.agent.id)) {
    return true;
  }
  
  // Check action-specific settings
  const actionSettings = settings.action_settings[approval.action_type];
  if (actionSettings?.auto_approve) {
    return true;
  }
  
  // Check risk threshold
  if (settings.auto_approve_low_risk && approval.risk.level === 'low') {
    return true;
  }
  
  const riskLevels = ['low', 'medium', 'high', 'critical'];
  const thresholdIndex = riskLevels.indexOf(settings.auto_approve_risk_threshold);
  const approvalRiskIndex = riskLevels.indexOf(approval.risk.level);
  
  if (thresholdIndex >= 0 && approvalRiskIndex <= thresholdIndex) {
    return true;
  }
  
  return false;
}

/**
 * Execute an approved action
 */
export async function executeApprovedAction(approval: ApprovalRequest): Promise<void> {
  try {
    console.log(`[ApprovalService] Executing approved action ${approval.id}: ${approval.action_type}`);
    
    let result: any;
    
    switch (approval.action_type) {
      case 'calendar_event_create':
      case 'calendar_event_update':
        result = await executeCalendarAction(approval);
        break;
        
      case 'email_send':
      case 'email_draft_create':
      case 'email_reply':
      case 'email_forward':
        result = await executeEmailAction(approval);
        break;
      
      case 'knowledge_graph_add':
      case 'knowledge_graph_update':
      case 'knowledge_graph_delete':
        result = await executeKnowledgeGraphAction(approval);
        break;
      
      case 'pic_memory_injection':
      case 'pic_identity_update':
      case 'pic_preference_update':
      case 'pic_goal_update':
      case 'pic_relationship_update':
        result = await executePicMemoryAction(approval);
        break;
      
      case 'tesla_door_unlock':
      case 'tesla_trunk_open':
      case 'tesla_climate_control':
      case 'tesla_charging_control':
      case 'tesla_navigation_send':
      case 'tesla_sentry_toggle':
      case 'tesla_honk_flash':
        result = await executeTeslaAction(approval);
        break;
        
      default:
        result = await executeGenericAction(approval);
    }
    
    approval.status = 'executed';
    approval.executed_at = new Date().toISOString();
    approval.execution_result = {
      success: true,
      data: result,
    };
    
    // Update in PostgreSQL
    await pool.query(`
      UPDATE approval_requests 
      SET status = 'executed', executed_at = $1, execution_success = true, execution_result = $2
      WHERE id = $3
    `, [approval.executed_at, JSON.stringify(result), approval.id]);
    
    emitEvent('approval_updated', approval);
    
  } catch (error) {
    console.error(`[ApprovalService] Execution failed for ${approval.id}:`, error);
    
    approval.status = 'failed';
    approval.execution_result = {
      success: false,
      error: (error as Error).message,
    };
    
    // Update in PostgreSQL
    await pool.query(`
      UPDATE approval_requests 
      SET status = 'failed', execution_success = false, execution_error = $1
      WHERE id = $2
    `, [(error as Error).message, approval.id]);
    
    emitEvent('approval_updated', approval);
  }
}

async function executeCalendarAction(approval: ApprovalRequest): Promise<any> {
  const payload = approval.payload as CalendarEventPayload;
  
  // Call the calendar API
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/calendar/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': approval.user_id,
      'X-Approval-Id': approval.id,
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error(`Calendar API error: ${response.statusText}`);
  }
  
  return response.json();
}

async function executeEmailAction(approval: ApprovalRequest): Promise<any> {
  const payload = approval.payload as EmailPayload;
  
  // Determine endpoint based on action type
  const endpoint = approval.action_type === 'email_draft_create'
    ? '/api/email/drafts'
    : '/api/email/send';
  
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': approval.user_id,
      'X-Approval-Id': approval.id,
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error(`Email API error: ${response.statusText}`);
  }
  
  return response.json();
}

async function executeKnowledgeGraphAction(approval: ApprovalRequest): Promise<any> {
  const payload = approval.payload as any; // KnowledgeGraphPayload
  
  // Check if this is from GooseMind learning loop (has goose-mind-learning source)
  const isGooseMindLearning = payload.source === 'goose-mind-learning';
  
  if (isGooseMindLearning) {
    // Call GooseMind's approval callback endpoint
    const gooseMindUrl = process.env.NEXT_PUBLIC_GOOSE_MIND_API || 'https://rtx-workstation.tailb64e64.ts.net:8031';
    
    const response = await fetch(`${gooseMindUrl}/knowledge/approval-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        approval_id: approval.id,
        action_type: approval.action_type,
        status: 'approved',
        payload: payload,
        reviewed_by: approval.reviewed_by || 'mobile',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`GooseMind callback error: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // Default: call local knowledge graph API
  let endpoint = '/api/knowledge-graph/entities';
  let method = 'POST';
  
  if (approval.action_type === 'knowledge_graph_update') {
    endpoint = `/api/knowledge-graph/entities/${payload.entity_id}`;
    method = 'PATCH';
  } else if (approval.action_type === 'knowledge_graph_delete') {
    endpoint = `/api/knowledge-graph/entities/${payload.entity_id}`;
    method = 'DELETE';
  }
  
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': approval.user_id,
      'X-Approval-Id': approval.id,
    },
    body: method !== 'DELETE' ? JSON.stringify(payload) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`Knowledge Graph API error: ${response.statusText}`);
  }
  
  return method === 'DELETE' ? { deleted: true } : response.json();
}

async function executeGenericAction(approval: ApprovalRequest): Promise<any> {
  // Check if this is an OpenClaw action that needs webhook callback
  const isOpenClawAction = approval.agent?.name?.toLowerCase().includes('openclaw') || 
                           approval.payload?.source === 'openclaw';
  
  if (isOpenClawAction) {
    // Send webhook callback to OpenClaw gateway
    const openclawUrl = process.env.OPENCLAW_URL || 'http://localhost:18789';
    const webhookUrl = `${openclawUrl}/webhook/approval-callback`;
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': process.env.INTERNAL_API_KEY || 'internal-key',
        },
        body: JSON.stringify({
          approval_id: approval.id,
          action_type: approval.action_type,
          status: 'approved',
          payload: approval.payload,
          reviewed_by: approval.reviewed_by,
          reviewed_at: approval.reviewed_at,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`OpenClaw webhook failed: ${response.statusText}`);
      }
      
      console.log(`[ApprovalService] OpenClaw webhook sent for ${approval.id}`);
      return response.json();
    } catch (error) {
      console.error(`[ApprovalService] OpenClaw webhook error:`, error);
      // Emit event for retry handling
      emitEvent('webhook_failed', { approval_id: approval.id, error: (error as Error).message });
      throw error;
    }
  }
  
  // For other generic actions, emit an event that other services can handle
  emitEvent('execute_generic_action', approval);
  return { message: 'Action dispatched' };
}

/**
 * Execute PIC memory injection action
 * Routes approved memory to PIC via AI Gateway
 */
async function executePicMemoryAction(approval: ApprovalRequest): Promise<any> {
  const payload = approval.payload as any; // PicMemoryPayload
  
  const aiGatewayUrl = process.env.AI_GATEWAY_URL || 'http://100.108.41.22:8777';
  const aiGatewayKey = process.env.AI_GATEWAY_KEY || 'hermes-core';
  const picAdminKey = process.env.PIC_ADMIN_KEY || 'dev-admin-key-change-in-prod';
  
  // Map action type to PIC endpoint
  let endpoint = '/api/v1/pic/learn';
  let method = 'POST';
  let picPayload: any = {
    observation_type: 'behavior',
    key: payload.key,
    value: payload.value,
    source_agent: payload.source_agent || 'approval-service',
    source_action: `approved_${approval.action_type}`,
  };
  
  // Handle different PIC action types
  switch (approval.action_type) {
    case 'pic_identity_update':
      endpoint = '/api/v1/pic/identity';
      method = 'PATCH';
      picPayload = { [payload.key]: payload.value };
      break;
    case 'pic_preference_update':
      endpoint = '/api/v1/pic/preferences';
      method = 'POST';
      picPayload = {
        key: payload.key,
        value: payload.value,
        category: payload.category,
      };
      break;
    case 'pic_goal_update':
      endpoint = '/api/v1/pic/goals';
      method = 'POST';
      picPayload = {
        title: payload.key,
        description: payload.value,
        status: 'active',
      };
      break;
    case 'pic_relationship_update':
      endpoint = '/api/v1/pic/relationships';
      method = 'POST';
      picPayload = {
        person_name: payload.key,
        relationship_type: payload.category || 'contact',
        notes: payload.value,
      };
      break;
    // pic_memory_injection uses default /learn endpoint
  }
  
  const response = await fetch(`${aiGatewayUrl}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': aiGatewayKey,
      'X-PIC-Admin-Key': picAdminKey,
      'X-Approval-Id': approval.id,
      'X-User-Id': approval.user_id,
    },
    body: JSON.stringify(picPayload),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PIC API error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

/**
 * Execute Tesla vehicle control action
 * Routes approved commands to Tesla Relay service
 */
async function executeTeslaAction(approval: ApprovalRequest): Promise<any> {
  const payload = approval.payload as any; // TeslaControlPayload
  const teslaRelayUrl = process.env.TESLA_RELAY_URL || 'http://localhost:18810';
  
  // Map action type to Tesla command
  const commandMap: Record<string, string> = {
    'tesla_door_unlock': 'door_unlock',
    'tesla_trunk_open': 'actuate_trunk',
    'tesla_climate_control': 'auto_conditioning_start',
    'tesla_charging_control': 'charge_start',
    'tesla_navigation_send': 'navigation_request',
    'tesla_sentry_toggle': 'set_sentry_mode',
    'tesla_honk_flash': 'honk_horn',
  };
  
  const command = commandMap[approval.action_type] || payload.command;
  
  // Build params based on action type
  let params: Record<string, any> = payload.params || {};
  
  switch (approval.action_type) {
    case 'tesla_trunk_open':
      params = { which_trunk: params.which_trunk || 'rear' };
      break;
    case 'tesla_climate_control':
      // If params.action is 'stop', use stop command
      if (params.action === 'stop') {
        commandMap[approval.action_type] = 'auto_conditioning_stop';
      }
      break;
    case 'tesla_charging_control':
      if (params.action === 'stop') {
        commandMap[approval.action_type] = 'charge_stop';
      }
      break;
    case 'tesla_navigation_send':
      if (payload.latitude && payload.longitude) {
        params = {
          lat: payload.latitude,
          lon: payload.longitude,
          order: 1,
        };
      } else {
        params = {
          type: 'share_ext_content_raw',
          value: { 'android.intent.extra.TEXT': payload.destination || '' },
          locale: 'en-US',
          timestamp_ms: Date.now(),
        };
      }
      break;
    case 'tesla_sentry_toggle':
      params = { on: params.on ?? true };
      break;
  }
  
  const response = await fetch(`${teslaRelayUrl}/vehicles/${payload.vin}/command`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Approval-Id': approval.id,
      'X-User-Id': approval.user_id,
    },
    body: JSON.stringify({
      command: commandMap[approval.action_type],
      params,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tesla Relay error: ${response.status} ${error}`);
  }
  
  const result = await response.json();
  console.log(`[ApprovalService] Tesla command executed: ${command} for VIN ${payload.vin}`);
  
  return {
    vin: payload.vin,
    command: commandMap[approval.action_type],
    result,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Send notifications for a pending approval
 */
async function sendNotifications(approval: ApprovalRequest, settings: ApprovalSettings): Promise<void> {
  const channels = settings.action_settings[approval.action_type]?.notify_channels || ['push', 'dashboard'];
  
  // Check quiet hours
  if (settings.quiet_hours_start && settings.quiet_hours_end) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    if (currentTime >= settings.quiet_hours_start && currentTime <= settings.quiet_hours_end) {
      // Only dashboard notifications during quiet hours
      channels.length = 0;
      channels.push('dashboard');
    }
  }
  
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'push':
          await sendPushNotification(approval);
          break;
        case 'email':
          // await sendEmailNotification(approval);
          break;
        case 'sms':
          // await sendSmsNotification(approval);
          break;
      }
      
      approval.notifications_sent.push({
        channel,
        sent_at: new Date().toISOString(),
        delivered: true,
      });
    } catch (error) {
      console.error(`[ApprovalService] Failed to send ${channel} notification:`, error);
      approval.notifications_sent.push({
        channel,
        sent_at: new Date().toISOString(),
        delivered: false,
      });
    }
  }
  
  // Update notifications_sent in PostgreSQL
  await pool.query(`
    UPDATE approval_requests SET notifications_sent = $1 WHERE id = $2
  `, [JSON.stringify(approval.notifications_sent), approval.id]);
}

async function sendPushNotification(approval: ApprovalRequest): Promise<void> {
  console.log(`[ApprovalService] Sending push notification for: ${approval.title}`);
  
  try {
    // Send to iOS devices via APNs using the notifications/send endpoint.
    // Use loopback directly — NEXTAUTH_URL points at the public URL (cloudflare tunnel) which
    // can't be reached from inside the container/service. Internal server-to-server call only.
    const internalBase = process.env.DASHBOARD_INTERNAL_URL
      || `http://127.0.0.1:${process.env.PORT || '8404'}`;
    const response = await fetch(`${internalBase}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.AI_GATEWAY_API_KEY || process.env.INTERNAL_API_KEY || '',
      },
      body: JSON.stringify({
        userId: approval.user_id,
        title: `Approval Required: ${approval.title}`,
        body: approval.summary,
        category: 'APPROVAL_REQUEST',
        threadId: `approval-${approval.id}`,
        priority: approval.priority === 'critical' ? 'high' : 'normal',
        data: {
          route: 'approvals',
          resourceId: approval.id,
          url: `/approvals/${approval.id}`,
          source: approval.agent.name,
          action_type: approval.action_type,
          risk_level: approval.risk.level,
        },
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`[ApprovalService] Push sent to ${result.sent} device(s)`);
    } else {
      console.warn(`[ApprovalService] Push notification failed: ${response.status}`);
    }
  } catch (error) {
    console.error('[ApprovalService] Push notification error:', error);
  }
}
/**
 * Approve an action (async - uses PostgreSQL)
 */
export async function approveApproval(
  approvalId: string,
  reviewerId: string,
  device?: string
): Promise<ApprovalRequest | null> {
  const approval = await getApproval(approvalId);
  
  if (!approval) {
    console.error(`[ApprovalService] Approval not found: ${approvalId}`);
    return null;
  }
  
  if (approval.status !== 'pending') {
    console.error(`[ApprovalService] Cannot approve non-pending approval: ${approval.status}`);
    return null;
  }
  
  const reviewedAt = new Date().toISOString();
  
  // Update in database
  await pool.query(`
    UPDATE approval_requests 
    SET status = 'approved', reviewed_at = $1, reviewed_by = $2, review_device = $3
    WHERE id = $4
  `, [reviewedAt, reviewerId, device, approvalId]);
  
  approval.status = 'approved';
  approval.reviewed_at = reviewedAt;
  approval.reviewed_by = reviewerId;
  approval.review_device = device;
  
  emitEvent('approval_updated', approval);
  
  // Execute the approved action
  await executeApprovedAction(approval);
  
  return approval;
}

/**
 * Reject an action (async - uses PostgreSQL)
 */
export async function rejectApproval(
  approvalId: string,
  reviewerId: string,
  reason?: string,
  device?: string
): Promise<ApprovalRequest | null> {
  const approval = await getApproval(approvalId);
  
  if (!approval) {
    console.error(`[ApprovalService] Approval not found: ${approvalId}`);
    return null;
  }
  
  if (approval.status !== 'pending') {
    console.error(`[ApprovalService] Cannot reject non-pending approval: ${approval.status}`);
    return null;
  }
  
  const reviewedAt = new Date().toISOString();
  
  // Update in database
  await pool.query(`
    UPDATE approval_requests 
    SET status = 'rejected', reviewed_at = $1, reviewed_by = $2, review_device = $3, rejection_reason = $4
    WHERE id = $5
  `, [reviewedAt, reviewerId, device, reason, approvalId]);
  
  approval.status = 'rejected';
  approval.reviewed_at = reviewedAt;
  approval.reviewed_by = reviewerId;
  approval.review_device = device;
  approval.rejection_reason = reason;
  
  emitEvent('approval_updated', approval);
  
  return approval;
}

/**
 * Get pending approvals for a user (async - uses PostgreSQL)
 */
export async function getPendingApprovals(userId: string): Promise<ApprovalSummary[]> {
  try {
    const result = await pool.query(`
      SELECT id, action_type, status, priority, title, summary, 
             agent_name, risk_level, created_at, expires_at
      FROM approval_requests
      WHERE user_id = $1 AND status = 'pending'
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 0 
          WHEN 'high' THEN 1 
          WHEN 'normal' THEN 2 
          WHEN 'low' THEN 3 
        END,
        created_at DESC
    `, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      action_type: row.action_type,
      status: row.status,
      priority: row.priority,
      title: row.title,
      summary: row.summary,
      agent_name: row.agent_name || '',
      agentName: row.agent_name || '',
      risk_level: row.risk_level,
      created_at: row.created_at?.toISOString() || row.created_at,
      expires_at: row.expires_at?.toISOString() || row.expires_at,
    }));
  } catch (error) {
    console.error('[ApprovalService] getPendingApprovals error:', error);
    return [];
  }
}

/**
 * Get approval by ID (async - uses PostgreSQL)
 */
export async function getApproval(approvalId: string): Promise<ApprovalRequest | null> {
  try {
    const result = await pool.query(`
      SELECT * FROM approval_requests WHERE id = $1
    `, [approvalId]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return rowToApprovalRequest(row);
  } catch (error) {
    console.error('[ApprovalService] getApproval error:', error);
    return null;
  }
}

/**
 * Convert database row to ApprovalRequest object
 */
function rowToApprovalRequest(row: any): ApprovalRequest {
  return {
    id: row.id,
    action_type: row.action_type,
    status: row.status,
    priority: row.priority,
    agent: {
      id: row.agent_id,
      name: row.agent_name,
      type: row.agent_type,
      session_id: row.agent_session_id,
    },
    user_id: row.user_id,
    title: row.title,
    summary: row.summary,
    payload: row.payload,
    ai_reasoning: row.ai_reasoning,
    ai_confidence: row.ai_confidence ? parseFloat(row.ai_confidence) : undefined,
    context: row.context,
    risk: {
      level: row.risk_level,
      factors: row.risk_factors || [],
      external_impact: row.risk_external_impact,
      financial_impact: row.risk_financial_impact,
      privacy_impact: row.risk_privacy_impact,
      reversible: row.risk_reversible,
    },
    created_at: row.created_at?.toISOString() || row.created_at,
    expires_at: row.expires_at?.toISOString() || row.expires_at,
    reviewed_at: row.reviewed_at?.toISOString() || row.reviewed_at,
    reviewed_by: row.reviewed_by,
    review_device: row.review_device,
    rejection_reason: row.rejection_reason,
    executed_at: row.executed_at?.toISOString() || row.executed_at,
    execution_result: row.execution_result ? {
      success: row.execution_success,
      data: row.execution_result,
      error: row.execution_error,
    } : undefined,
    notifications_sent: row.notifications_sent || [],
  };
}

/**
 * Get approval statistics (async - uses PostgreSQL)
 */
export async function getApprovalStats(userId: string): Promise<ApprovalStats> {
  try {
    // Get counts
    const countsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as total_today,
        COUNT(*) FILTER (WHERE status = 'approved' AND created_at >= CURRENT_DATE) as approved_today,
        COUNT(*) FILTER (WHERE status = 'rejected' AND created_at >= CURRENT_DATE) as rejected_today,
        COUNT(*) FILTER (WHERE status = 'expired' AND created_at >= CURRENT_DATE) as expired_today,
        AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) * 1000) FILTER (WHERE reviewed_at IS NOT NULL) as avg_review_time_ms
      FROM approval_requests
      WHERE user_id = $1
    `, [userId]);
    
    // Get by action type
    const byActionResult = await pool.query(`
      SELECT action_type, COUNT(*) as count
      FROM approval_requests
      WHERE user_id = $1
      GROUP BY action_type
    `, [userId]);
    
    // Get by agent
    const byAgentResult = await pool.query(`
      SELECT agent_name, COUNT(*) as count
      FROM approval_requests
      WHERE user_id = $1
      GROUP BY agent_name
    `, [userId]);
    
    // Get by risk level
    const byRiskResult = await pool.query(`
      SELECT risk_level, COUNT(*) as count
      FROM approval_requests
      WHERE user_id = $1
      GROUP BY risk_level
    `, [userId]);
    
    const counts = countsResult.rows[0] || {};
    
    const byActionType: Record<string, number> = {};
    for (const row of byActionResult.rows) {
      byActionType[row.action_type] = parseInt(row.count);
    }
    
    const byAgent: Record<string, number> = {};
    for (const row of byAgentResult.rows) {
      byAgent[row.agent_name] = parseInt(row.count);
    }
    
    const byRiskLevel: Record<string, number> = {};
    for (const row of byRiskResult.rows) {
      byRiskLevel[row.risk_level] = parseInt(row.count);
    }
    
    return {
      total_pending: parseInt(counts.total_pending) || 0,
      total_today: parseInt(counts.total_today) || 0,
      approved_today: parseInt(counts.approved_today) || 0,
      rejected_today: parseInt(counts.rejected_today) || 0,
      expired_today: parseInt(counts.expired_today) || 0,
      avg_review_time_ms: parseFloat(counts.avg_review_time_ms) || 0,
      by_action_type: byActionType as any,
      by_agent: byAgent,
      by_risk_level: byRiskLevel as any,
    };
  } catch (error) {
    console.error('[ApprovalService] getApprovalStats error:', error);
    return {
      total_pending: 0,
      total_today: 0,
      approved_today: 0,
      rejected_today: 0,
      expired_today: 0,
      avg_review_time_ms: 0,
      by_action_type: {} as any,
      by_agent: {},
      by_risk_level: {} as any,
    };
  }
}

/**
 * Get default settings
 */
export function getDefaultSettings(userId: string): ApprovalSettings {
  return {
    user_id: userId,
    enabled: true,
    auto_approve_low_risk: false,
    expiry_hours: 24,
    push_notifications: true,
    email_notifications: false,
    sms_notifications: false,
    action_settings: {
      calendar_event_create: { enabled: true, notify_channels: ['push', 'dashboard'] },
      calendar_event_update: { enabled: true, notify_channels: ['push', 'dashboard'] },
      calendar_event_delete: { enabled: true, notify_channels: ['push', 'dashboard'] },
      calendar_invite_send: { enabled: true, notify_channels: ['push', 'dashboard'] },
      email_draft_create: { enabled: true, auto_approve: true, notify_channels: ['dashboard'] },
      email_send: { enabled: true, notify_channels: ['push', 'dashboard'] },
      email_reply: { enabled: true, notify_channels: ['push', 'dashboard'] },
      email_forward: { enabled: true, notify_channels: ['push', 'dashboard'] },
      contact_create: { enabled: true, auto_approve: true, notify_channels: ['dashboard'] },
      contact_update: { enabled: true, auto_approve: true, notify_channels: ['dashboard'] },
      reminder_create: { enabled: true, auto_approve: true, notify_channels: ['dashboard'] },
      task_create: { enabled: true, auto_approve: true, notify_channels: ['dashboard'] },
      document_share: { enabled: true, notify_channels: ['push', 'dashboard'] },
      file_delete: { enabled: true, notify_channels: ['push', 'dashboard'] },
      automation_trigger: { enabled: true, notify_channels: ['push', 'dashboard'] },
      external_api_call: { enabled: true, notify_channels: ['push', 'dashboard'] },
      system_setting_change: { enabled: true, notify_channels: ['push', 'dashboard'] },
      knowledge_graph_add: { enabled: true, notify_channels: ['push', 'dashboard'] },
      knowledge_graph_update: { enabled: true, notify_channels: ['push', 'dashboard'] },
      knowledge_graph_delete: { enabled: true, notify_channels: ['push', 'dashboard'] },
    },
    trusted_agents: [],
    auto_approve_risk_threshold: 'none',
  };
}

/**
 * Get user settings (async - uses PostgreSQL with cache)
 */
export async function getSettings(userId: string): Promise<ApprovalSettings> {
  // Check cache first
  if (settingsCache.has(userId)) {
    return settingsCache.get(userId)!;
  }
  
  try {
    const result = await pool.query(`
      SELECT * FROM approval_settings WHERE user_id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      // Return defaults if no settings exist
      const defaults = getDefaultSettings(userId);
      settingsCache.set(userId, defaults);
      return defaults;
    }
    
    const row = result.rows[0];
    const settings: ApprovalSettings = {
      user_id: row.user_id,
      enabled: row.enabled,
      auto_approve_low_risk: row.auto_approve_low_risk,
      expiry_hours: row.expiry_hours,
      push_notifications: true,
      email_notifications: false,
      sms_notifications: false,
      action_settings: row.action_settings || getDefaultSettings(userId).action_settings,
      trusted_agents: row.trusted_agents || [],
      auto_approve_risk_threshold: row.auto_approve_risk_threshold || 'none',
      quiet_hours_start: row.quiet_hours_start,
      quiet_hours_end: row.quiet_hours_end,
    };
    
    settingsCache.set(userId, settings);
    return settings;
  } catch (error) {
    console.error('[ApprovalService] getSettings error:', error);
    return getDefaultSettings(userId);
  }
}

/**
 * Update user settings (async - uses PostgreSQL)
 */
export async function updateSettings(userId: string, updates: Partial<ApprovalSettings>): Promise<ApprovalSettings> {
  const current = await getSettings(userId);
  const updated = { ...current, ...updates, user_id: userId };
  
  try {
    await pool.query(`
      INSERT INTO approval_settings (user_id, enabled, expiry_hours, auto_approve_low_risk, auto_approve_risk_threshold, trusted_agents, action_settings)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        expiry_hours = EXCLUDED.expiry_hours,
        auto_approve_low_risk = EXCLUDED.auto_approve_low_risk,
        auto_approve_risk_threshold = EXCLUDED.auto_approve_risk_threshold,
        trusted_agents = EXCLUDED.trusted_agents,
        action_settings = EXCLUDED.action_settings,
        updated_at = NOW()
    `, [
      userId,
      updated.enabled,
      updated.expiry_hours,
      updated.auto_approve_low_risk,
      updated.auto_approve_risk_threshold,
      JSON.stringify(updated.trusted_agents),
      JSON.stringify(updated.action_settings)
    ]);
    
    // Update cache
    settingsCache.set(userId, updated);
  } catch (error) {
    console.error('[ApprovalService] updateSettings error:', error);
  }
  
  return updated;
}

/**
 * Check and expire old approvals (async - uses PostgreSQL)
 */
export async function checkExpirations(): Promise<void> {
  try {
    const result = await pool.query(`
      UPDATE approval_requests 
      SET status = 'expired'
      WHERE status = 'pending' AND expires_at < NOW()
      RETURNING id
    `);
    
    for (const row of result.rows) {
      emitEvent('approval_expired', { id: row.id });
      console.log(`[ApprovalService] Expired approval: ${row.id}`);
    }
  } catch (error) {
    console.error('[ApprovalService] checkExpirations error:', error);
  }
}

// Run expiration check every minute (only on server)
if (typeof setInterval !== 'undefined' && typeof window === 'undefined') {
  setInterval(checkExpirations, 60000);
}

/**
 * Estimate cost for a cloud service request
 */
export function estimateCost(params: {
  models?: Array<{ model: string; input_tokens: number; output_tokens: number }>;
  services?: Array<{ service: string; calls: number }>;
}): CostAttribution {
  const breakdown: CostBreakdownItem[] = [];
  let totalCost = 0;

  // Calculate model costs
  if (params.models) {
    for (const model of params.models) {
      const pricing = MODEL_PRICING[model.model];
      if (pricing) {
        const inputCost = (model.input_tokens / 1000) * pricing.input;
        const outputCost = (model.output_tokens / 1000) * pricing.output;
        const subtotal = inputCost + outputCost;
        
        breakdown.push({
          service: model.model,
          provider: pricing.provider,
          operation: 'inference',
          unit_cost: pricing.input + pricing.output,
          quantity: (model.input_tokens + model.output_tokens) / 1000,
          subtotal,
        });
        totalCost += subtotal;
      }
    }
  }

  // Calculate service costs
  if (params.services) {
    const servicePricing: Record<string, { cost: number; provider: CloudProvider }> = {
      'brave_search': { cost: 0.01, provider: 'brave' },
      'brave_news': { cost: 0.01, provider: 'brave' },
      'firecrawl': { cost: 0.05, provider: 'firecrawl' },
      'elevenlabs_tts': { cost: 0.30, provider: 'elevenlabs' }, // per 1000 chars
      'perplexity_search': { cost: 0.005, provider: 'perplexity' },
    };

    for (const service of params.services) {
      const pricing = servicePricing[service.service];
      if (pricing) {
        const subtotal = pricing.cost * service.calls;
        breakdown.push({
          service: service.service,
          provider: pricing.provider,
          operation: 'api_call',
          unit_cost: pricing.cost,
          quantity: service.calls,
          subtotal,
        });
        totalCost += subtotal;
      }
    }
  }

  return {
    estimated_cost: Math.round(totalCost * 10000) / 10000,
    cost_breakdown: breakdown,
    cost_confidence: breakdown.length > 0 ? 'estimated' : 'unknown',
  };
}

/**
 * Get monthly spending for a user
 */
export async function getMonthlySpending(userId: string): Promise<{
  total: number;
  by_provider: Record<string, number>;
  by_action_type: Record<string, number>;
}> {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM((cost->>'estimated_cost')::numeric), 0) as total,
        action_type,
        cost->'cost_breakdown' as breakdown
      FROM approval_requests
      WHERE user_id = $1 
        AND created_at >= date_trunc('month', CURRENT_DATE)
        AND status IN ('executed', 'approved')
      GROUP BY action_type, cost
    `, [userId]);

    const byProvider: Record<string, number> = {};
    const byActionType: Record<string, number> = {};
    let total = 0;

    for (const row of result.rows) {
      const cost = parseFloat(row.total) || 0;
      total += cost;
      byActionType[row.action_type] = (byActionType[row.action_type] || 0) + cost;

      if (row.breakdown) {
        for (const item of row.breakdown) {
          byProvider[item.provider] = (byProvider[item.provider] || 0) + item.subtotal;
        }
      }
    }

    return { total, by_provider: byProvider, by_action_type: byActionType };
  } catch (error) {
    console.error('[ApprovalService] getMonthlySpending error:', error);
    return { total: 0, by_provider: {}, by_action_type: {} };
  }
}

/**
 * Create a research approval request with cost estimation
 */
export async function createResearchApproval(params: {
  userId: string;
  query: string;
  researchMode: 'quick_query' | 'deep_research' | 'news_story' | 'analysis';
  models: Array<{ model: string; purpose: string; estimated_tokens?: number }>;
  externalServices?: Array<{ service: string; purpose: string; calls?: number }>;
  agent: AgentSource;
  context?: string;
}): Promise<ApprovalRequest> {
  const { userId, query, researchMode, models, externalServices, agent, context } = params;

  // Estimate costs
  const modelEstimates = models.map(m => ({
    model: m.model,
    input_tokens: m.estimated_tokens || 2000,
    output_tokens: Math.round((m.estimated_tokens || 2000) * 0.5),
  }));

  const serviceEstimates = externalServices?.map(s => ({
    service: s.service,
    calls: s.calls || 1,
  })) || [];

  const costEstimate = estimateCost({
    models: modelEstimates,
    services: serviceEstimates,
  });

  // Get monthly spending for budget context
  const monthlySpending = await getMonthlySpending(userId);
  costEstimate.monthly_spent = monthlySpending.total;
  costEstimate.monthly_budget = 50; // TODO: Get from user settings
  costEstimate.budget_remaining = costEstimate.monthly_budget - monthlySpending.total;

  // Build cloud services info
  const cloudServices: CloudServiceInfo[] = models.map(m => {
    const pricing = MODEL_PRICING[m.model];
    return {
      provider: pricing?.provider || 'other',
      service_name: m.model,
      model: m.model,
      data_used_for_training: pricing?.provider === 'openai' ? false : false, // Most providers don't train on API data
      data_encrypted_in_transit: true,
      data_encrypted_at_rest: true,
    };
  });

  // Build payload
  const payload: ResearchRequestPayload = {
    query,
    research_mode: researchMode,
    models: models.map(m => ({
      provider: MODEL_PRICING[m.model]?.provider || 'other',
      model: m.model,
      purpose: m.purpose,
      estimated_tokens: m.estimated_tokens,
      estimated_cost: costEstimate.cost_breakdown.find(b => b.service === m.model)?.subtotal,
    })),
    external_services: externalServices?.map(s => ({
      service: s.service,
      provider: getServiceProvider(s.service),
      purpose: s.purpose,
      estimated_calls: s.calls,
      estimated_cost: costEstimate.cost_breakdown.find(b => b.service === s.service)?.subtotal,
    })) || [],
    expected_output_type: researchMode === 'news_story' ? 'story' : 'report',
  };

  // Assess risk
  const risk = assessResearchRisk(researchMode, costEstimate.estimated_cost, models);

  // Create the approval request
  return createApprovalRequest({
    actionType: 'deep_research_request',
    payload,
    agent,
    userId,
    title: `${researchMode.replace('_', ' ')} - ${query.substring(0, 50)}...`,
    aiReasoning: `Executing ${researchMode} using ${models.length} model(s) and ${externalServices?.length || 0} external service(s). Estimated cost: $${costEstimate.estimated_cost.toFixed(4)}`,
    context,
  });
}

function getServiceProvider(service: string): CloudProvider {
  const providers: Record<string, CloudProvider> = {
    'brave_search': 'brave',
    'brave_news': 'brave',
    'firecrawl': 'firecrawl',
    'elevenlabs_tts': 'elevenlabs',
    'perplexity_search': 'perplexity',
  };
  return providers[service] || 'other';
}

function assessResearchRisk(
  mode: string,
  estimatedCost: number,
  models: Array<{ model: string }>
): RiskAssessment {
  const factors: string[] = [];
  let level: RiskAssessment['level'] = 'low';
  let financialImpact = false;
  let externalImpact = false;

  // Cost-based risk
  if (estimatedCost > 1.0) {
    factors.push(`Estimated cost: $${estimatedCost.toFixed(2)}`);
    level = 'medium';
    financialImpact = true;
  }
  if (estimatedCost > 5.0) {
    level = 'high';
  }
  if (estimatedCost > 20.0) {
    level = 'critical';
  }

  // Mode-based risk
  if (mode === 'deep_research') {
    factors.push('Deep research uses multiple external APIs');
    externalImpact = true;
    if (level === 'low') level = 'medium';
  }

  // Check for cloud providers
  const cloudModels = models.filter(m => MODEL_PRICING[m.model]?.provider !== 'local');
  if (cloudModels.length > 0) {
    factors.push(`Uses ${cloudModels.length} cloud model(s)`);
    externalImpact = true;
  }

  return {
    level,
    factors,
    reversible: true,
    external_impact: externalImpact,
    financial_impact: financialImpact,
    privacy_impact: false,
  };
}

export default {
  createApprovalRequest,
  approveApproval,
  rejectApproval,
  getPendingApprovals,
  getApproval,
  getApprovalStats,
  getSettings,
  updateSettings,
  onApprovalEvent,
  executeApprovedAction,
  estimateCost,
  getMonthlySpending,
  createResearchApproval,
};
