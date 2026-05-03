/**
 * Human-in-the-Loop Approval System Types
 * 
 * Defines the data structures for AI Agent action approvals.
 * All consequential AI actions (calendar events, emails, etc.) require
 * human approval via the mobile dashboard before execution.
 */

// Action categories that require approval
export type ApprovalActionType = 
  | 'calendar_event_create'
  | 'calendar_event_update'
  | 'calendar_event_delete'
  | 'calendar_invite_send'
  | 'email_draft_create'
  | 'email_send'
  | 'email_reply'
  | 'email_forward'
  | 'contact_create'
  | 'contact_update'
  | 'reminder_create'
  | 'task_create'
  | 'document_share'
  | 'file_delete'
  | 'automation_trigger'
  | 'external_api_call'
  | 'system_setting_change'
  | 'knowledge_graph_add'
  | 'knowledge_graph_update'
  | 'knowledge_graph_delete'
  // Child account approval types
  | 'child_conversation_access'
  | 'child_service_access'
  | 'child_extended_time'
  | 'child_content_unlock'
  | 'child_feature_request'
  // Cloud service / AI research types
  | 'deep_research_request'
  | 'news_story_generation'
  | 'podcast_generation'
  | 'cloud_api_call'
  | 'llm_inference_request'
  // OpenClaw gateway infrastructure types
  | 'openclaw_gateway_provider_endpoint'
  | 'openclaw_gateway_provider_toggle'
  | 'openclaw_gateway_project_create'
  | 'openclaw_gateway_service_create'
  // PIC memory injection types
  | 'pic_memory_injection'
  | 'pic_identity_update'
  | 'pic_preference_update'
  | 'pic_goal_update'
  | 'pic_relationship_update'
  // Tesla vehicle control types
  | 'tesla_door_unlock'
  | 'tesla_trunk_open'
  | 'tesla_climate_control'
  | 'tesla_charging_control'
  | 'tesla_navigation_send'
  | 'tesla_sentry_toggle'
  | 'tesla_honk_flash';

// Priority levels for approval requests
export type ApprovalPriority = 'critical' | 'high' | 'normal' | 'low';

// Urgency tiers for expiration policy
export type ApprovalUrgency = 'non_urgent' | 'medium' | 'urgent';

// Default expiration hours per urgency tier
export const URGENCY_EXPIRY_DEFAULTS: Record<ApprovalUrgency, number | null> = {
  non_urgent: null,  // Never expires
  medium: 72,        // 3 days
  urgent: 24,        // Same day
};

// Urgency display info
export const URGENCY_INFO: Record<ApprovalUrgency, { label: string; color: string; description: string }> = {
  non_urgent: { label: 'Non-Urgent', color: 'gray', description: 'No expiration - can wait indefinitely' },
  medium: { label: 'Medium', color: 'yellow', description: 'Expires in a few days' },
  urgent: { label: 'Urgent', color: 'red', description: 'Must be addressed today' },
};

// Status of an approval request
export type ApprovalStatus = 
  | 'pending'      // Awaiting human review
  | 'approved'     // Human approved the action
  | 'rejected'     // Human rejected the action
  | 'expired'      // Approval window expired
  | 'executed'     // Action was executed after approval
  | 'failed'       // Execution failed after approval
  | 'cancelled';   // User or system cancelled the request

// The agent that initiated the action
export interface AgentSource {
  id: string;
  name: string;
  type: 'workspace-ai' | 'email-agent' | 'calendar-agent' | 'automation' | 'goose' | 'openclaw' | 'custom';
  conversation_id?: string;
  session_id?: string;
}

// Calendar event action payload
export interface CalendarEventPayload {
  calendar_id?: string;
  calendar_name?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    response_status?: 'needsAction' | 'accepted' | 'declined' | 'tentative';
  }>;
  reminders?: Array<{
    method: 'email' | 'popup' | 'sms';
    minutes_before: number;
  }>;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    until?: string;
    count?: number;
  };
  all_day?: boolean;
  timezone?: string;
  event_id?: string; // For updates/deletes
}

// Email action payload
export interface EmailPayload {
  to: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  subject: string;
  body: string;
  body_html?: string;
  attachments?: Array<{
    filename: string;
    content_type: string;
    size_bytes: number;
    url?: string;
  }>;
  reply_to_id?: string;
  thread_id?: string;
  draft_id?: string;
  labels?: string[];
  priority?: 'high' | 'normal' | 'low';
  send_at?: string; // Scheduled send time
}

// Generic payload for other action types
export interface GenericActionPayload {
  action: string;
  target?: string;
  parameters?: Record<string, unknown>;
  description?: string;
}

// Knowledge graph action payload
export interface KnowledgeGraphPayload {
  entity_type: 'person' | 'organization' | 'location' | 'event' | 'concept' | 'project' | 'document' | 'custom';
  entity_id?: string; // For updates/deletes
  name: string;
  properties: Record<string, unknown>;
  relationships?: Array<{
    type: string;
    target_id: string;
    target_name?: string;
    properties?: Record<string, unknown>;
  }>;
  source?: string; // Where this data came from
  confidence?: number; // AI confidence in the data
  tags?: string[];
}

// OpenClaw Gateway infrastructure action payload
export interface OpenClawGatewayPayload {
  action: 'add_endpoint' | 'toggle_provider' | 'create_project' | 'create_service';
  // Provider endpoint actions
  provider?: string;
  endpoint_type?: string;
  url?: string;
  is_active?: boolean;
  // Project/service actions
  projectId?: string;
  serviceId?: string;
  name?: string;
  description?: string;
  // Execution details
  execution_url: string;
  execution_method: 'POST' | 'PATCH' | 'PUT';
  execution_headers?: Record<string, string>;
}

// PIC Memory Injection payload
export interface PicMemoryPayload {
  memory_type: 'observation' | 'identity' | 'preference' | 'goal' | 'relationship';
  key: string;
  value: string | Record<string, unknown>;
  category?: string;
  source_agent: string;
  source_action?: string;
  risk_category: 'identity' | 'family' | 'health' | 'financial' | 'relationship' | 'credentials' | 'general';
  original_source?: string; // e.g., "MEMORY.md", "voice_conversation"
  context?: string;
}

// Tesla vehicle control payload
export interface TeslaControlPayload {
  vin: string;
  vehicle_name?: string;
  command: string;
  params?: Record<string, unknown>;
  // For navigation
  destination?: string;
  latitude?: number;
  longitude?: number;
  // Risk context
  location?: { lat: number; lon: number }; // Vehicle location at time of command
  battery_level?: number;
  state?: string; // online, asleep, etc.
}

// Union type for all payloads
export type ApprovalPayload = 
  | CalendarEventPayload 
  | EmailPayload 
  | KnowledgeGraphPayload
  | GenericActionPayload
  | ResearchRequestPayload
  | CloudApiCallPayload
  | LlmInferencePayload
  | OpenClawGatewayPayload
  | PicMemoryPayload
  | TeslaControlPayload;

// Risk assessment for an action
export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  reversible: boolean;
  external_impact: boolean; // Does this affect people outside the household?
  financial_impact: boolean;
  privacy_impact: boolean;
}

// Cost attribution for cloud services
export interface CostAttribution {
  estimated_cost: number; // USD
  cost_breakdown: CostBreakdownItem[];
  billing_account?: string;
  cost_center?: string;
  monthly_budget?: number;
  monthly_spent?: number;
  budget_remaining?: number;
  cost_confidence: 'exact' | 'estimated' | 'unknown';
}

export interface CostBreakdownItem {
  service: string;
  provider: CloudProvider;
  operation: string;
  unit_cost: number;
  quantity: number;
  subtotal: number;
  pricing_tier?: string;
}

// Cloud service providers
export type CloudProvider = 
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'perplexity'
  | 'brave'
  | 'firecrawl'
  | 'elevenlabs'
  | 'aws'
  | 'azure'
  | 'local'
  | 'other';

// Cloud service metadata for informed decisions
export interface CloudServiceInfo {
  provider: CloudProvider;
  service_name: string;
  endpoint?: string;
  region?: string;
  model?: string;
  model_version?: string;
  
  // Data handling
  data_retention_days?: number;
  data_used_for_training: boolean;
  data_encrypted_in_transit: boolean;
  data_encrypted_at_rest: boolean;
  
  // Compliance
  compliance_certifications?: string[]; // SOC2, HIPAA, GDPR, etc.
  data_residency?: string; // US, EU, etc.
  
  // Rate limits
  rate_limit_remaining?: number;
  rate_limit_reset?: string;
  
  // Latency
  expected_latency_ms?: number;
}

// Research request payload with cost info
export interface ResearchRequestPayload {
  query: string;
  research_mode: 'quick_query' | 'deep_research' | 'news_story' | 'analysis';
  
  // Models to be used
  models: Array<{
    provider: CloudProvider;
    model: string;
    purpose: string;
    estimated_tokens?: number;
    estimated_cost?: number;
  }>;
  
  // External services
  external_services: Array<{
    service: string;
    provider: CloudProvider;
    purpose: string;
    estimated_calls?: number;
    estimated_cost?: number;
  }>;
  
  // Data sources
  data_sources?: string[];
  
  // Output
  expected_output_type: 'report' | 'analysis' | 'story' | 'summary';
  expected_word_count?: number;
  
  // Context
  parent_session_id?: string;
  project_id?: string;
}

// Cloud API call payload
export interface CloudApiCallPayload {
  service: CloudServiceInfo;
  operation: string;
  request_summary: string;
  
  // What data is being sent
  data_categories: DataCategory[];
  data_volume_bytes?: number;
  contains_pii: boolean;
  pii_types?: string[]; // email, name, phone, etc.
  
  // Expected response
  expected_response_type: string;
  
  // Alternatives
  local_alternative_available: boolean;
  local_alternative_name?: string;
  local_alternative_tradeoffs?: string;
}

// Categories of data being processed
export type DataCategory = 
  | 'personal_identifiable'
  | 'financial'
  | 'health'
  | 'location'
  | 'communications'
  | 'behavioral'
  | 'biometric'
  | 'professional'
  | 'public'
  | 'synthetic';

// LLM inference request payload
export interface LlmInferencePayload {
  provider: CloudProvider;
  model: string;
  model_version?: string;
  
  // Token estimates
  input_tokens: number;
  estimated_output_tokens: number;
  context_window_used: number;
  context_window_max: number;
  
  // Cost
  input_cost_per_1k: number;
  output_cost_per_1k: number;
  estimated_total_cost: number;
  
  // Purpose
  purpose: string;
  task_type: 'generation' | 'analysis' | 'classification' | 'extraction' | 'embedding' | 'other';
  
  // Data sensitivity
  prompt_contains_pii: boolean;
  prompt_data_categories: DataCategory[];
  
  // Alternatives
  cheaper_alternative?: {
    model: string;
    provider: CloudProvider;
    estimated_cost: number;
    quality_tradeoff: string;
  };
  local_alternative?: {
    model: string;
    estimated_cost: number;
    quality_tradeoff: string;
  };
}

// Main approval request interface
export interface ApprovalRequest {
  id: string;
  action_type: ApprovalActionType;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  urgency: ApprovalUrgency;
  
  // Source information
  agent: AgentSource;
  user_id: string;
  
  // Action details
  title: string;
  summary: string;
  payload: ApprovalPayload;
  
  // AI reasoning
  ai_reasoning?: string;
  ai_confidence?: number; // 0-1 confidence score
  context?: string; // User request that triggered this
  
  // Risk assessment
  risk: RiskAssessment;
  
  // Cost attribution (for cloud services)
  cost?: CostAttribution;
  
  // Cloud service info (for informed decisions)
  cloud_services?: CloudServiceInfo[];
  
  // Timestamps
  created_at: string;
  expires_at?: string;
  reviewed_at?: string;
  executed_at?: string;
  
  // Review information
  reviewed_by?: string;
  review_device?: string;
  rejection_reason?: string;
  
  // Execution tracking
  execution_result?: {
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
    error?: string;
    actual_cost?: number; // Track actual cost after execution
  };
  
  // Notification tracking
  notifications_sent: Array<{
    channel: 'push' | 'email' | 'sms' | 'dashboard';
    sent_at: string;
    delivered?: boolean;
  }>;
}

// Summary for quick mobile view
export interface ApprovalSummary {
  id: string;
  action_type: ApprovalActionType;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  urgency: ApprovalUrgency;
  title: string;
  summary: string;
  agent_name: string;
  risk_level: RiskAssessment['level'];
  created_at: string;
  expires_at?: string;
}

// Batch approval/rejection
export interface BatchApprovalAction {
  ids: string[];
  action: 'approve' | 'reject';
  reason?: string;
}

// Approval statistics
export interface ApprovalStats {
  total_pending: number;
  total_today: number;
  approved_today: number;
  rejected_today: number;
  expired_today: number;
  avg_review_time_ms: number;
  by_action_type: Record<ApprovalActionType, number>;
  by_agent: Record<string, number>;
  by_risk_level: Record<RiskAssessment['level'], number>;
}

// Urgency-based expiration settings
export interface UrgencyExpirySettings {
  non_urgent: number | null;  // null = never expires
  medium: number;             // hours until expiration
  urgent: number;             // hours until expiration
}

// Settings for approval behavior
export interface ApprovalSettings {
  user_id: string;
  
  // Global settings
  enabled: boolean;
  auto_approve_low_risk: boolean;
  expiry_hours: number;
  
  // Urgency-based expiration (overrides expiry_hours)
  urgency_expiry_hours: UrgencyExpirySettings;
  
  // Notification preferences
  push_notifications: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  quiet_hours_start?: string; // HH:MM format
  quiet_hours_end?: string;
  
  // Per-action-type settings
  action_settings: Record<ApprovalActionType, {
    enabled: boolean;
    auto_approve?: boolean;
    expiry_hours?: number;
    notify_channels: ('push' | 'email' | 'sms' | 'dashboard')[];
  }>;
  
  // Trusted agents (can bypass approval)
  trusted_agents: string[];
  
  // Risk threshold for auto-approval
  auto_approve_risk_threshold: 'low' | 'medium' | 'none';
}

// WebSocket events for real-time updates
export type ApprovalWebSocketEvent = 
  | { type: 'new_approval'; data: ApprovalRequest }
  | { type: 'approval_updated'; data: ApprovalRequest }
  | { type: 'approval_expired'; data: { id: string } }
  | { type: 'stats_updated'; data: ApprovalStats };

// API response types
export interface ApprovalListResponse {
  approvals: ApprovalSummary[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface ApprovalDetailResponse {
  approval: ApprovalRequest;
}

export interface ApprovalActionResponse {
  success: boolean;
  approval: ApprovalRequest;
  message?: string;
}

// Helper type guards
export function isCalendarPayload(payload: ApprovalPayload): payload is CalendarEventPayload {
  return 'start_time' in payload && 'end_time' in payload && 'title' in payload;
}

export function isEmailPayload(payload: ApprovalPayload): payload is EmailPayload {
  return 'to' in payload && 'subject' in payload && 'body' in payload;
}

export function isGenericPayload(payload: ApprovalPayload): payload is GenericActionPayload {
  return 'action' in payload;
}

export function isKnowledgeGraphPayload(payload: ApprovalPayload): payload is KnowledgeGraphPayload {
  return 'entity_type' in payload && 'name' in payload && 'properties' in payload;
}

export function isResearchRequestPayload(payload: ApprovalPayload): payload is ResearchRequestPayload {
  return 'research_mode' in payload && 'models' in payload && 'query' in payload;
}

export function isCloudApiCallPayload(payload: ApprovalPayload): payload is CloudApiCallPayload {
  return 'service' in payload && 'operation' in payload && 'data_categories' in payload;
}

export function isLlmInferencePayload(payload: ApprovalPayload): payload is LlmInferencePayload {
  return 'provider' in payload && 'model' in payload && 'input_tokens' in payload;
}

export function isPicMemoryPayload(payload: ApprovalPayload): payload is PicMemoryPayload {
  return 'memory_type' in payload && 'key' in payload && 'source_agent' in payload && 'risk_category' in payload;
}

// Action type display names
export const ACTION_TYPE_LABELS: Record<ApprovalActionType, string> = {
  calendar_event_create: 'Create Calendar Event',
  calendar_event_update: 'Update Calendar Event',
  calendar_event_delete: 'Delete Calendar Event',
  calendar_invite_send: 'Send Calendar Invite',
  email_draft_create: 'Create Email Draft',
  email_send: 'Send Email',
  email_reply: 'Reply to Email',
  email_forward: 'Forward Email',
  contact_create: 'Create Contact',
  contact_update: 'Update Contact',
  reminder_create: 'Create Reminder',
  task_create: 'Create Task',
  document_share: 'Share Document',
  file_delete: 'Delete File',
  automation_trigger: 'Trigger Automation',
  external_api_call: 'External API Call',
  system_setting_change: 'Change System Setting',
  knowledge_graph_add: 'Add to Knowledge Graph',
  knowledge_graph_update: 'Update Knowledge Graph',
  knowledge_graph_delete: 'Delete from Knowledge Graph',
  // Child account approval labels
  child_conversation_access: 'Child Chat Access',
  child_service_access: 'Child Service Access',
  child_extended_time: 'Extended Screen Time',
  child_content_unlock: 'Unlock Content',
  child_feature_request: 'Feature Request',
  // Cloud service / AI research labels
  deep_research_request: 'Deep Research Request',
  news_story_generation: 'News Story Generation',
  podcast_generation: 'Podcast Generation',
  cloud_api_call: 'Cloud API Call',
  llm_inference_request: 'LLM Inference Request',
  // OpenClaw gateway labels
  openclaw_gateway_provider_endpoint: 'Gateway Provider Endpoint',
  openclaw_gateway_provider_toggle: 'Gateway Provider Toggle',
  openclaw_gateway_project_create: 'Gateway Project Create',
  openclaw_gateway_service_create: 'Gateway Service Create',
  // PIC memory injection labels
  pic_memory_injection: 'Memory Injection',
  pic_identity_update: 'Identity Update',
  pic_preference_update: 'Preference Update',
  pic_goal_update: 'Goal Update',
  pic_relationship_update: 'Relationship Update',
};

// Cloud provider display names and info
export const CLOUD_PROVIDER_INFO: Record<CloudProvider, {
  name: string;
  color: string;
  icon?: string;
  data_policy_url?: string;
}> = {
  openai: { name: 'OpenAI', color: 'green', data_policy_url: 'https://openai.com/policies/privacy-policy' },
  anthropic: { name: 'Anthropic', color: 'orange', data_policy_url: 'https://www.anthropic.com/privacy' },
  google: { name: 'Google', color: 'blue', data_policy_url: 'https://policies.google.com/privacy' },
  perplexity: { name: 'Perplexity', color: 'purple', data_policy_url: 'https://www.perplexity.ai/privacy' },
  brave: { name: 'Brave', color: 'orange', data_policy_url: 'https://brave.com/privacy/browser/' },
  firecrawl: { name: 'Firecrawl', color: 'red', data_policy_url: 'https://firecrawl.dev/privacy' },
  elevenlabs: { name: 'ElevenLabs', color: 'cyan', data_policy_url: 'https://elevenlabs.io/privacy' },
  aws: { name: 'AWS', color: 'yellow', data_policy_url: 'https://aws.amazon.com/privacy/' },
  azure: { name: 'Azure', color: 'blue', data_policy_url: 'https://privacy.microsoft.com/' },
  local: { name: 'Local (Free)', color: 'green' },
  other: { name: 'Other', color: 'gray' },
};

// Model pricing reference (per 1K tokens, USD)
export const MODEL_PRICING: Record<string, { input: number; output: number; provider: CloudProvider }> = {
  'gpt-4o': { input: 0.0025, output: 0.01, provider: 'openai' },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006, provider: 'openai' },
  'gpt-4-turbo': { input: 0.01, output: 0.03, provider: 'openai' },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015, provider: 'anthropic' },
  'claude-3-opus': { input: 0.015, output: 0.075, provider: 'anthropic' },
  'claude-3-haiku': { input: 0.00025, output: 0.00125, provider: 'anthropic' },
  'gemini-2.5-flash': { input: 0.000075, output: 0.0003, provider: 'google' },
  'gemini-2.5-pro': { input: 0.00125, output: 0.005, provider: 'google' },
  'sonar-pro': { input: 0.003, output: 0.015, provider: 'perplexity' },
  'sonar-deep-research': { input: 0.005, output: 0.02, provider: 'perplexity' },
  'qwen3-32b': { input: 0, output: 0, provider: 'local' },
  'llama-3.1-70b': { input: 0, output: 0, provider: 'local' },
};

// Risk level colors for UI
export const RISK_LEVEL_COLORS: Record<RiskAssessment['level'], string> = {
  low: 'green',
  medium: 'yellow',
  high: 'orange',
  critical: 'red',
};

// Priority colors for UI
export const PRIORITY_COLORS: Record<ApprovalPriority, string> = {
  low: 'gray',
  normal: 'blue',
  high: 'orange',
  critical: 'red',
};
