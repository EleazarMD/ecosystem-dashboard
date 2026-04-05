/**
 * Child Service Middleware
 * 
 * Provides middleware for child-friendly service routes that:
 * 1. Verifies child account access
 * 2. Routes all AI requests through content filtering
 * 3. Logs all activity for parental oversight
 * 4. Enforces usage limits and time restrictions
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Pool } from 'pg';
import {
  filterChildContent,
  logChildActivity,
  checkChildAccess,
  getChildSafetySystemPrompt,
} from './content-filter-service';
import { ParentalControlsConfig } from './child-account-types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export interface ChildServiceContext {
  userId: string;
  childName: string;
  accountType: string;
  parentalControls: ParentalControlsConfig;
  safetySystemPrompt: string;
  remainingMinutes: number;
}

export interface ChildAIRequest {
  message: string;
  conversationId?: string;
  serviceId: string;
}

export interface ChildAIResponse {
  success: boolean;
  response?: string;
  error?: string;
  blocked?: boolean;
  blockReason?: string;
  remainingMinutes?: number;
}

/**
 * Middleware to verify child account and get context
 */
export async function getChildServiceContext(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<ChildServiceContext | null> {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const user = session.user as any;

  // Get user details and parental controls
  const result = await pool.query(`
    SELECT 
      u.id,
      u.name,
      u.account_type,
      pc.content_filter_level as "contentFilterLevel",
      pc.blocked_topics as "blockedTopics",
      pc.allowed_topics as "allowedTopics",
      pc.allowed_services as "allowedServices",
      pc.blocked_services as "blockedServices",
      pc.max_conversation_length as "maxConversationLength",
      pc.daily_usage_limit_minutes as "dailyUsageLimitMinutes",
      pc.allowed_hours_start as "allowedHoursStart",
      pc.allowed_hours_end as "allowedHoursEnd",
      pc.require_approval_for_new_conversations as "requireApprovalForNewConversations",
      pc.require_approval_for_image_generation as "requireApprovalForImageGeneration",
      pc.log_all_conversations as "logAllConversations",
      pc.alert_on_blocked_content as "alertOnBlockedContent",
      pc.is_active as "isActive"
    FROM users u
    LEFT JOIN parental_controls_config pc ON pc.child_user_id = u.id
    WHERE u.id = $1
  `, [user.id]);

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }

  const userData = result.rows[0];
  
  // For non-child accounts, return minimal context (no restrictions)
  if (userData.account_type !== 'child') {
    return {
      userId: userData.id,
      childName: userData.name,
      accountType: userData.account_type || 'standard',
      parentalControls: null as any,
      safetySystemPrompt: '',
      remainingMinutes: Infinity,
    };
  }

  // Check if child has access
  const accessCheck = await checkChildAccess(user.id);
  if (!accessCheck.allowed) {
    res.status(403).json({ 
      error: accessCheck.reason,
      blocked: true,
      blockReason: accessCheck.reason,
    });
    return null;
  }

  // Build parental controls config
  const parentalControls: ParentalControlsConfig = {
    id: '',
    childUserId: userData.id,
    parentUserId: '',
    contentFilterLevel: userData.contentFilterLevel || 'strict',
    blockedTopics: userData.blockedTopics || [],
    allowedTopics: userData.allowedTopics || [],
    allowedServices: userData.allowedServices || [],
    blockedServices: userData.blockedServices || [],
    maxConversationLength: userData.maxConversationLength || 50,
    dailyUsageLimitMinutes: userData.dailyUsageLimitMinutes || 120,
    allowedHoursStart: userData.allowedHoursStart || '08:00',
    allowedHoursEnd: userData.allowedHoursEnd || '21:00',
    allowedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    requireApprovalForNewConversations: userData.requireApprovalForNewConversations || false,
    requireApprovalForImageGeneration: userData.requireApprovalForImageGeneration || true,
    requireApprovalForExternalLinks: true,
    requireApprovalForDataExport: true,
    logAllConversations: userData.logAllConversations ?? true,
    sendDailyActivityReport: true,
    alertOnBlockedContent: userData.alertOnBlockedContent ?? true,
    parentCanViewConversations: true,
    isActive: userData.isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Generate safety system prompt
  const safetySystemPrompt = getChildSafetySystemPrompt(userData.name, parentalControls);

  return {
    userId: userData.id,
    childName: userData.name,
    accountType: 'child',
    parentalControls,
    safetySystemPrompt,
    remainingMinutes: accessCheck.remainingMinutes || 0,
  };
}

/**
 * Process a child AI request with full content filtering
 */
export async function processChildAIRequest(
  context: ChildServiceContext,
  request: ChildAIRequest,
  aiHandler: (filteredMessage: string, systemPrompt: string) => Promise<string>
): Promise<ChildAIResponse> {
  const { userId, parentalControls, safetySystemPrompt } = context;

  // For non-child accounts, pass through without filtering
  if (context.accountType !== 'child') {
    try {
      const response = await aiHandler(request.message, '');
      return { success: true, response };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Filter input
  const inputFilter = await filterChildContent(userId, request.message, 'input');
  
  if (!inputFilter.passed) {
    // Log blocked attempt
    await logChildActivity(userId, 'blocked_input', {
      serviceId: request.serviceId,
      conversationId: request.conversationId,
      userMessage: request.message,
      wasFiltered: true,
      filterReason: inputFilter.violations.map(v => v.ruleName).join(', '),
    });

    // Alert parent if configured
    if (inputFilter.alertParent) {
      await alertParentOfBlockedContent(userId, request.message, inputFilter.violations);
    }

    return {
      success: false,
      blocked: true,
      blockReason: "I can't help with that topic. Let's talk about something else! What are you learning about or working on?",
    };
  }

  try {
    // Call AI with safety system prompt
    const aiResponse = await aiHandler(
      inputFilter.filteredContent || request.message,
      safetySystemPrompt
    );

    // Filter output
    const outputFilter = await filterChildContent(userId, aiResponse, 'output');
    
    const finalResponse = outputFilter.passed 
      ? (outputFilter.filteredContent || aiResponse)
      : "I'm not sure how to answer that. Can we talk about something else?";

    // Log activity
    if (parentalControls.logAllConversations) {
      await logChildActivity(userId, 'conversation', {
        serviceId: request.serviceId,
        conversationId: request.conversationId,
        userMessage: request.message,
        aiResponse: finalResponse,
        wasFiltered: !outputFilter.passed,
        filterReason: outputFilter.passed ? undefined : 'output_filtered',
      });
    }

    // Update usage
    await updateChildUsage(userId, 1); // 1 minute per interaction

    return {
      success: true,
      response: finalResponse,
      remainingMinutes: context.remainingMinutes - 1,
    };
  } catch (error: any) {
    console.error('[ChildServiceMiddleware] AI request error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Update child's daily usage
 */
async function updateChildUsage(childUserId: string, minutes: number): Promise<void> {
  await pool.query(`
    INSERT INTO child_daily_usage (child_user_id, usage_date, total_minutes, message_count, last_activity_at)
    VALUES ($1, CURRENT_DATE, $2, 1, NOW())
    ON CONFLICT (child_user_id, usage_date)
    DO UPDATE SET 
      total_minutes = child_daily_usage.total_minutes + $2,
      message_count = child_daily_usage.message_count + 1,
      last_activity_at = NOW()
  `, [childUserId, minutes]);
}

/**
 * Alert parent of blocked content
 */
async function alertParentOfBlockedContent(
  childUserId: string,
  content: string,
  violations: any[]
): Promise<void> {
  // Get parent info
  const parentResult = await pool.query(`
    SELECT u.parent_user_id, p.email as parent_email, p.name as parent_name, u.name as child_name
    FROM users u
    JOIN users p ON u.parent_user_id = p.id
    WHERE u.id = $1
  `, [childUserId]);

  if (parentResult.rows.length === 0) return;

  const { parent_user_id, child_name } = parentResult.rows[0];

  // Create notification (could also send email/push)
  await pool.query(`
    INSERT INTO parental_notifications (
      parent_user_id, child_user_id, notification_type, title, message, metadata
    ) VALUES ($1, $2, 'blocked_content', $3, $4, $5)
  `, [
    parent_user_id,
    childUserId,
    `Blocked content from ${child_name}`,
    `${child_name} attempted to discuss a blocked topic.`,
    JSON.stringify({ violations, contentPreview: content.substring(0, 100) }),
  ]);
}

/**
 * Get child-friendly prompt suggestions based on service
 */
export function getChildPromptSuggestions(serviceId: string): string[] {
  const suggestions: Record<string, string[]> = {
    'personal-ai': [
      "Help me with my homework 📚",
      "Tell me a fun fact! 🌟",
      "Let's practice math together 🔢",
      "Can you explain how rainbows work? 🌈",
      "Help me write a story ✍️",
      "What's a cool science experiment I can try? 🔬",
    ],
    'goosemind-voice': [
      "Tell me a joke! 😄",
      "Let's play a word game 🎮",
      "Help me practice spelling 📝",
      "What's the weather like today? ☀️",
      "Read me a short story 📖",
      "Let's learn some new words! 💬",
    ],
    'image-studio': [
      "Draw a friendly dragon 🐉",
      "Create a magical forest 🌲",
      "Make a cute robot 🤖",
      "Design a superhero costume 🦸",
      "Draw my favorite animal 🐾",
      "Create a space adventure scene 🚀",
    ],
    'workspace': [
      "Start a new story ✨",
      "Make a to-do list 📋",
      "Write about my day 📓",
      "Create a poem 🎭",
      "Plan a fun project 🎨",
      "Write a letter to a friend 💌",
    ],
    'calendar': [
      "What's happening today? 📅",
      "Add homework reminder 📚",
      "When is my next activity? 🏃",
      "Set a reminder for practice ⚽",
    ],
    'email': [
      "Check my messages 📬",
      "Write to my teacher 👩‍🏫",
      "Send a thank you note 💝",
    ],
  };

  return suggestions[serviceId] || suggestions['personal-ai'];
}

/**
 * Check if a service is allowed for a child
 */
export async function isServiceAllowedForChild(
  childUserId: string,
  serviceId: string
): Promise<{ allowed: boolean; requiresApproval: boolean; reason?: string }> {
  const result = await pool.query(`
    SELECT 
      allowed_services as "allowedServices",
      blocked_services as "blockedServices",
      require_approval_for_image_generation as "requireApprovalForImageGeneration",
      allowed_hours_start as "allowedHoursStart",
      allowed_hours_end as "allowedHoursEnd"
    FROM parental_controls_config
    WHERE child_user_id = $1 AND is_active = true
  `, [childUserId]);

  if (result.rows.length === 0) {
    // No config = allow with defaults
    return { allowed: true, requiresApproval: serviceId === 'image-studio' };
  }

  const config = result.rows[0];
  const allowedServices = config.allowedServices || [];
  const blockedServices = config.blockedServices || [];

  // Check allowed hours
  const allowedHoursStart = config.allowedHoursStart || '08:00';
  const allowedHoursEnd = config.allowedHoursEnd || '21:00';
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const [startHour, startMinute] = allowedHoursStart.split(':').map(Number);
  const [endHour, endMinute] = allowedHoursEnd.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;
  
  if (currentTime < startTime || currentTime > endTime) {
    const formatTime = (h: number, m: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
    };
    return { 
      allowed: false, 
      requiresApproval: false, 
      reason: `It's outside your allowed hours (${formatTime(startHour, startMinute)} - ${formatTime(endHour, endMinute)}). Come back during your scheduled time! 🌙` 
    };
  }

  // Check if explicitly blocked
  if (blockedServices.includes(serviceId)) {
    return { allowed: false, requiresApproval: false, reason: 'This activity is not available right now.' };
  }

  // Check if allowed (if allowedServices is empty, allow all non-blocked)
  if (allowedServices.length > 0 && !allowedServices.includes(serviceId)) {
    return { allowed: false, requiresApproval: false, reason: 'This activity is not available right now.' };
  }

  // Check if requires approval
  if (serviceId === 'image-studio' && config.requireApprovalForImageGeneration) {
    return { allowed: true, requiresApproval: true };
  }

  return { allowed: true, requiresApproval: false };
}
