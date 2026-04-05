/**
 * Child Account & Parental Controls Types
 * 
 * Defines the data models for child account management:
 * - Child user accounts with parental oversight
 * - Content filtering and guardrails
 * - Activity monitoring and logging
 * - Parental approval workflows
 */

// ============================================================
// Account Types
// ============================================================

export type AccountType = 'adult' | 'child';

export type ContentFilterLevel = 'strict' | 'moderate' | 'standard' | 'permissive' | 'unrestricted';

// Llama Guard 3 Safety Categories
export type SafetyCategoryCode = 
  | 'S1'  // Violent Crimes
  | 'S2'  // Non-Violent Crimes
  | 'S3'  // Sex-Related Crimes
  | 'S4'  // Child Sexual Exploitation
  | 'S5'  // Defamation
  | 'S6'  // Specialized Advice
  | 'S7'  // Privacy
  | 'S8'  // Intellectual Property
  | 'S9'  // Indiscriminate Weapons
  | 'S10' // Hate
  | 'S11' // Suicide & Self-Harm
  | 'S12' // Sexual Content
  | 'S13' // Elections
  | 'S14'; // Code Interpreter Abuse

export interface SafetyCategory {
  code: SafetyCategoryCode;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendedForChildren: boolean;
  recommendedForTeens: boolean;
  recommendedForAdults: boolean;
}

export type ApprovalRequestStatus = 'pending' | 'approved' | 'denied' | 'expired';

export type ApprovalRequestType = 
  | 'service_access' 
  | 'conversation' 
  | 'image_generation' 
  | 'data_export' 
  | 'settings_change';

export type ActivityType = 
  | 'conversation' 
  | 'service_access' 
  | 'blocked_attempt' 
  | 'login' 
  | 'logout'
  | 'approval_request';

export type FilterRuleType = 
  | 'blocked_phrase' 
  | 'blocked_topic' 
  | 'blocked_pattern' 
  | 'allowed_override';

export type FilterAction = 'block' | 'warn' | 'log' | 'replace';

export type FilterSeverity = 'low' | 'medium' | 'high' | 'critical';

// ============================================================
// Parental Controls Configuration
// ============================================================

export interface DaySchedule {
  start: string;  // "HH:MM" format
  end: string;    // "HH:MM" format
  minutes: number; // Daily usage limit for this day
}

export interface ParentalControlsConfig {
  id: string;
  childUserId: string;
  parentUserId: string;
  
  // Service Access Controls
  allowedServices: string[];
  blockedServices: string[];
  
  // AI Conversation Guardrails
  contentFilterLevel: ContentFilterLevel;
  safetyCategories: SafetyCategoryCode[]; // Granular Llama Guard 3 categories
  blockedTopics: string[];
  allowedTopics: string[];
  maxConversationLength: number;
  
  // Time Restrictions
  dailyUsageLimitMinutes: number;
  dailyImageGenerationLimit: number;
  allowedHoursStart: string;  // "HH:MM" format (default for all days)
  allowedHoursEnd: string;    // "HH:MM" format (default for all days)
  allowedDays: string[];      // ["monday", "tuesday", ...]
  allowedHoursByDay?: Record<string, DaySchedule>; // Per-day schedule overrides
  
  // Approval Requirements
  requireApprovalForNewConversations: boolean;
  requireApprovalForImageGeneration: boolean;
  requireApprovalForExternalLinks: boolean;
  requireApprovalForDataExport: boolean;
  
  // Monitoring Settings
  logAllConversations: boolean;
  sendDailyActivityReport: boolean;
  alertOnBlockedContent: boolean;
  parentCanViewConversations: boolean;
  
  // Status
  isActive: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Default parental controls for new child accounts
export const DEFAULT_PARENTAL_CONTROLS: Omit<ParentalControlsConfig, 'id' | 'childUserId' | 'parentUserId' | 'createdAt' | 'updatedAt'> = {
  allowedServices: ['workspace', 'goosemind-chat'],
  blockedServices: ['email-client', 'image-studio', 'research-lab'],
  
  contentFilterLevel: 'strict',
  safetyCategories: ['S1', 'S3', 'S4', 'S9', 'S10', 'S11', 'S12'], // Default for young children
  blockedTopics: ['violence', 'adult_content', 'gambling', 'drugs', 'weapons', 'self_harm'],
  allowedTopics: ['education', 'homework', 'creative_writing', 'science', 'math', 'coding', 'art', 'music', 'games'],
  maxConversationLength: 50,
  
  dailyUsageLimitMinutes: 120,
  dailyImageGenerationLimit: 10,
  allowedHoursStart: '08:00',
  allowedHoursEnd: '21:00',
  allowedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  allowedHoursByDay: {},
  
  requireApprovalForNewConversations: false,
  requireApprovalForImageGeneration: true,
  requireApprovalForExternalLinks: true,
  requireApprovalForDataExport: true,
  
  logAllConversations: true,
  sendDailyActivityReport: true,
  alertOnBlockedContent: true,
  parentCanViewConversations: true,
  
  isActive: true,
};

// ============================================================
// Child User Extension
// ============================================================

export interface ChildUserInfo {
  accountType: AccountType;
  dateOfBirth?: string;
  parentUserId?: string;
  parentName?: string;
  parentEmail?: string;
  parentalControls?: ParentalControlsConfig;
  age?: number;
}

// ============================================================
// Activity Logging
// ============================================================

export interface ChildActivityLog {
  id: string;
  childUserId: string;
  
  activityType: ActivityType;
  serviceId?: string;
  conversationId?: string;
  
  userMessage?: string;
  aiResponse?: string;
  wasFiltered: boolean;
  filterReason?: string;
  
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  
  createdAt: string;
}

export interface ChildDailyUsage {
  id: string;
  childUserId: string;
  usageDate: string;
  
  totalMinutes: number;
  conversationCount: number;
  messageCount: number;
  blockedAttempts: number;
  
  serviceUsage: Record<string, number>;  // service_id -> minutes
  
  firstActivityAt?: string;
  lastActivityAt?: string;
}

// ============================================================
// Parental Approval Requests
// ============================================================

export interface ParentalApprovalRequest {
  id: string;
  childUserId: string;
  parentUserId: string;
  
  requestType: ApprovalRequestType;
  requestData: {
    title: string;
    description: string;
    serviceId?: string;
    details?: Record<string, any>;
  };
  
  status: ApprovalRequestStatus;
  respondedAt?: string;
  responseNote?: string;
  expiresAt: string;
  
  createdAt: string;
}

// ============================================================
// Content Filter Rules
// ============================================================

export interface ContentFilterRule {
  id: string;
  
  ruleName: string;
  ruleType: FilterRuleType;
  pattern: string;
  isRegex: boolean;
  
  filterLevel: ContentFilterLevel[];
  appliesTo: 'all' | 'input' | 'output';
  
  action: FilterAction;
  replacementText?: string;
  
  category?: string;
  severity: FilterSeverity;
  description?: string;
  
  isActive: boolean;
  isSystem: boolean;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Content Filter Result
// ============================================================

export interface ContentFilterResult {
  passed: boolean;
  filteredContent?: string;
  violations: {
    ruleId: string;
    ruleName: string;
    category: string;
    severity: FilterSeverity;
    matchedText: string;
    action: FilterAction;
  }[];
  warnings: string[];
}

// ============================================================
// Child Account Summary (for parent dashboard)
// ============================================================

export interface ChildAccountSummary {
  childId: string;
  childName: string;
  childEmail: string;
  dateOfBirth?: string;
  age?: number;
  status: string;
  lastLoginAt?: string;
  
  parentName: string;
  parentId: string;
  
  contentFilterLevel: ContentFilterLevel;
  dailyUsageLimitMinutes: number;
  controlsActive: boolean;
  
  todayUsageMinutes: number;
  todayMessageCount: number;
  todayBlockedAttempts: number;
  pendingApprovals: number;
}

// ============================================================
// API Request/Response Types
// ============================================================

export interface CreateChildAccountRequest {
  name: string;
  email: string;
  password: string;
  dateOfBirth: string;
  parentUserId: string;
  tenantId: string;
  
  // Optional initial controls (uses defaults if not provided)
  controls?: Partial<ParentalControlsConfig>;
}

export interface UpdateParentalControlsRequest {
  childUserId: string;
  controls: Partial<ParentalControlsConfig>;
}

export interface ApprovalDecisionRequest {
  requestId: string;
  decision: 'approved' | 'denied';
  note?: string;
}

export interface ChildActivityQuery {
  childUserId: string;
  startDate?: string;
  endDate?: string;
  activityType?: ActivityType;
  limit?: number;
  offset?: number;
}

// ============================================================
// Service Access Control
// ============================================================

export const CHILD_ALLOWED_SERVICES = [
  'workspace',           // Workspace AI for homework/notes
  'goosemind-chat',      // Chat with content filtering
  'calendar',            // View family calendar
  'read-aloud',          // Text-to-speech for books and content
  'books',               // Digital books library
] as const;

export const CHILD_BLOCKED_SERVICES = [
  'email-client',        // No email access
  'image-studio',        // Requires approval
  'research-lab',        // May access inappropriate content
  'podcast-studio',      // Not age-appropriate
  'admin',               // No admin access
  'platform-settings',   // No platform settings
] as const;

export const CHILD_APPROVAL_REQUIRED_SERVICES = [
  'image-studio',        // Image generation needs approval
] as const;

// ============================================================
// Helper Functions
// ============================================================

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

export function isMinor(dateOfBirth: string): boolean {
  return calculateAge(dateOfBirth) < 18;
}

export function isWithinAllowedHours(config: ParentalControlsConfig): boolean {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);  // "HH:MM"
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  if (!config.allowedDays.includes(currentDay)) {
    return false;
  }
  
  return currentTime >= config.allowedHoursStart && currentTime <= config.allowedHoursEnd;
}

export function getRemainingDailyMinutes(config: ParentalControlsConfig, usedMinutes: number): number {
  return Math.max(0, config.dailyUsageLimitMinutes - usedMinutes);
}

export function canAccessService(
  serviceId: string, 
  config: ParentalControlsConfig
): { allowed: boolean; requiresApproval: boolean; reason?: string } {
  // Check if explicitly blocked
  if (config.blockedServices.includes(serviceId)) {
    return { allowed: false, requiresApproval: false, reason: 'Service is blocked by parental controls' };
  }
  
  // Check if requires approval
  if (CHILD_APPROVAL_REQUIRED_SERVICES.includes(serviceId as any)) {
    return { allowed: true, requiresApproval: true, reason: 'Requires parental approval' };
  }
  
  // Check if explicitly allowed
  if (config.allowedServices.includes(serviceId) || config.allowedServices.includes('*')) {
    return { allowed: true, requiresApproval: false };
  }
  
  // Default: not allowed
  return { allowed: false, requiresApproval: false, reason: 'Service not in allowed list' };
}
