/**
 * Content Filter Service
 * 
 * Provides AI conversation guardrails for child accounts.
 * Filters both user input and AI output based on parental control settings.
 */

import { Pool } from 'pg';
import {
  ContentFilterLevel,
  ContentFilterRule,
  ContentFilterResult,
  FilterSeverity,
  ParentalControlsConfig,
} from './child-account-types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// Cache for filter rules (refreshed every 5 minutes)
let filterRulesCache: ContentFilterRule[] = [];
let cacheLastUpdated: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

// ============================================================
// Filter Rules Management
// ============================================================

export async function loadFilterRules(): Promise<ContentFilterRule[]> {
  const now = Date.now();
  
  if (filterRulesCache.length > 0 && (now - cacheLastUpdated) < CACHE_TTL_MS) {
    return filterRulesCache;
  }
  
  try {
    const result = await pool.query(`
      SELECT 
        id, rule_name as "ruleName", rule_type as "ruleType", pattern,
        is_regex as "isRegex", filter_level as "filterLevel",
        applies_to as "appliesTo", action, replacement_text as "replacementText",
        category, severity, description, is_active as "isActive",
        is_system as "isSystem", created_at as "createdAt", updated_at as "updatedAt"
      FROM content_filter_rules
      WHERE is_active = true
      ORDER BY severity DESC, rule_name
    `);
    
    filterRulesCache = result.rows;
    cacheLastUpdated = now;
    
    return filterRulesCache;
  } catch (error) {
    console.warn('[Content Filter] Failed to load filter rules from database, using empty rules:', error.message);
    // Return empty rules if table doesn't exist - allows system to work without database rules
    filterRulesCache = [];
    cacheLastUpdated = now;
    return [];
  }
}

export function invalidateFilterRulesCache(): void {
  cacheLastUpdated = 0;
}

// ============================================================
// Content Filtering
// ============================================================

export async function filterContent(
  content: string,
  filterLevel: ContentFilterLevel,
  direction: 'input' | 'output' = 'input',
  customBlockedTopics?: string[]
): Promise<ContentFilterResult> {
  const rules = await loadFilterRules();
  const violations: ContentFilterResult['violations'] = [];
  const warnings: string[] = [];
  let filteredContent = content;
  
  // Get rules applicable to this filter level and direction
  const applicableRules = rules.filter(rule => 
    rule.filterLevel.includes(filterLevel) &&
    (rule.appliesTo === 'all' || rule.appliesTo === direction)
  );
  
  for (const rule of applicableRules) {
    const matches = findMatches(content, rule);
    
    if (matches.length > 0) {
      for (const match of matches) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          category: rule.category || 'general',
          severity: rule.severity,
          matchedText: match,
          action: rule.action,
        });
        
        // Apply action
        switch (rule.action) {
          case 'block':
            // Content will be blocked entirely
            break;
          case 'warn':
            warnings.push(`Warning: Content may contain ${rule.category || 'inappropriate'} material`);
            break;
          case 'replace':
            if (rule.replacementText) {
              filteredContent = filteredContent.replace(
                new RegExp(escapeRegex(match), 'gi'),
                rule.replacementText
              );
            }
            break;
          case 'log':
            // Just log, don't modify
            break;
        }
      }
    }
  }
  
  // Check custom blocked topics from parental controls
  if (customBlockedTopics && customBlockedTopics.length > 0) {
    for (const topic of customBlockedTopics) {
      const topicRegex = new RegExp(`\\b${escapeRegex(topic)}\\b`, 'gi');
      if (topicRegex.test(content)) {
        violations.push({
          ruleId: 'custom-blocked-topic',
          ruleName: `Blocked Topic: ${topic}`,
          category: 'custom',
          severity: 'medium',
          matchedText: topic,
          action: 'block',
        });
      }
    }
  }
  
  // Determine if content passes
  const hasBlockingViolation = violations.some(v => v.action === 'block');
  const hasCriticalViolation = violations.some(v => v.severity === 'critical');
  
  return {
    passed: !hasBlockingViolation && !hasCriticalViolation,
    filteredContent: hasBlockingViolation ? undefined : filteredContent,
    violations,
    warnings,
  };
}

function findMatches(content: string, rule: ContentFilterRule): string[] {
  const matches: string[] = [];
  
  try {
    if (rule.isRegex) {
      const regex = new RegExp(rule.pattern, 'gi');
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push(match[0]);
      }
    } else {
      // Exact phrase matching (case-insensitive)
      const lowerContent = content.toLowerCase();
      const lowerPattern = rule.pattern.toLowerCase();
      
      if (lowerContent.includes(lowerPattern)) {
        matches.push(rule.pattern);
      }
    }
  } catch (error) {
    console.error(`[ContentFilter] Invalid regex pattern in rule ${rule.ruleName}:`, error);
  }
  
  return matches;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// Child Account Content Filtering
// ============================================================

export async function filterChildContent(
  childUserId: string,
  content: string,
  direction: 'input' | 'output' = 'input'
): Promise<ContentFilterResult & { shouldLog: boolean; alertParent: boolean }> {
  // Get child's parental controls
  const configResult = await pool.query(`
    SELECT 
      content_filter_level as "contentFilterLevel",
      blocked_topics as "blockedTopics",
      log_all_conversations as "logAllConversations",
      alert_on_blocked_content as "alertOnBlockedContent"
    FROM parental_controls_config
    WHERE child_user_id = $1 AND is_active = true
  `, [childUserId]);
  
  if (configResult.rows.length === 0) {
    // No parental controls, use strict defaults
    const result = await filterContent(content, 'strict', direction);
    return {
      ...result,
      shouldLog: true,
      alertParent: !result.passed,
    };
  }
  
  const config = configResult.rows[0];
  const result = await filterContent(
    content,
    config.contentFilterLevel,
    direction,
    config.blockedTopics
  );
  
  return {
    ...result,
    shouldLog: config.logAllConversations,
    alertParent: config.alertOnBlockedContent && !result.passed,
  };
}

// ============================================================
// System Prompt Injection for Child Accounts
// ============================================================

export function getChildSafetySystemPrompt(
  childName: string,
  config: ParentalControlsConfig
): string {
  const allowedTopicsStr = config.allowedTopics.join(', ');
  const blockedTopicsStr = config.blockedTopics.join(', ');
  
  return `
IMPORTANT SAFETY GUIDELINES - CHILD USER ACCOUNT

You are interacting with ${childName}, a minor user with parental controls enabled.

STRICT RULES:
1. Keep all responses age-appropriate and educational
2. Never discuss or generate content about: ${blockedTopicsStr}
3. Focus conversations on: ${allowedTopicsStr}
4. If asked about inappropriate topics, politely redirect to appropriate subjects
5. Never share personal information or ask for personal details
6. Do not provide advice on circumventing parental controls
7. If the user seems distressed, suggest talking to a parent or trusted adult
8. Keep responses concise and easy to understand
9. Encourage learning, creativity, and positive activities
10. If unsure whether content is appropriate, err on the side of caution

RESPONSE STYLE:
- Be friendly, encouraging, and supportive
- Use age-appropriate language
- Explain concepts clearly
- Encourage curiosity and learning
- Be patient with questions
- ALWAYS respond in English only - never use other languages like Chinese, Spanish, etc.

If asked to do something that violates these guidelines, respond with:
"I'd love to help, but that's not something I can assist with. Let's talk about something else! What are you learning about in school, or is there a fun project you're working on?"
`.trim();
}

// ============================================================
// Activity Logging
// ============================================================

export async function logChildActivity(
  childUserId: string,
  activityType: string,
  options: {
    serviceId?: string;
    conversationId?: string;
    userMessage?: string;
    aiResponse?: string;
    wasFiltered?: boolean;
    filterReason?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<string> {
  const result = await pool.query(`
    SELECT log_child_activity($1, $2, $3, $4, $5, $6, $7, $8, $9) as id
  `, [
    childUserId,
    activityType,
    options.serviceId || null,
    options.conversationId || null,
    options.userMessage || null,
    options.aiResponse || null,
    options.wasFiltered || false,
    options.filterReason || null,
    JSON.stringify(options.metadata || {}),
  ]);
  
  return result.rows[0].id;
}

// ============================================================
// Access Control Checks
// ============================================================

export async function checkChildAccess(childUserId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remainingMinutes?: number;
}> {
  // Check if within allowed hours
  const hoursResult = await pool.query(
    `SELECT 
      is_within_allowed_hours($1) as allowed,
      pc.allowed_hours_start,
      pc.allowed_hours_end
    FROM parental_controls_config pc
    WHERE pc.child_user_id = $1::uuid`,
    [childUserId]
  );
  
  if (hoursResult.rows[0] && !hoursResult.rows[0].allowed) {
    const startTime = hoursResult.rows[0].allowed_hours_start;
    const endTime = hoursResult.rows[0].allowed_hours_end;
    return {
      allowed: false,
      reason: `You can use this between ${startTime?.substring(0, 5) || '6:00'} and ${endTime?.substring(0, 5) || '21:00'}. Come back during your allowed hours! 🕐`,
    };
  }
  
  // Check daily usage limit
  const limitResult = await pool.query(
    `SELECT is_within_daily_limit($1) as allowed`,
    [childUserId]
  );
  
  if (!limitResult.rows[0].allowed) {
    return {
      allowed: false,
      reason: 'Daily usage limit reached. Please try again tomorrow.',
    };
  }
  
  // Get remaining minutes
  const usageResult = await pool.query(`
    SELECT 
      pc.daily_usage_limit_minutes - COALESCE(du.total_minutes, 0) as remaining
    FROM parental_controls_config pc
    LEFT JOIN child_daily_usage du ON du.child_user_id = pc.child_user_id AND du.usage_date = CURRENT_DATE
    WHERE pc.child_user_id = $1 AND pc.is_active = true
  `, [childUserId]);
  
  const remainingMinutes = usageResult.rows[0]?.remaining ?? 120;
  
  return {
    allowed: true,
    remainingMinutes,
  };
}

export async function checkServiceAccess(
  childUserId: string,
  serviceId: string
): Promise<{
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
}> {
  const result = await pool.query(`
    SELECT 
      allowed_services as "allowedServices",
      blocked_services as "blockedServices"
    FROM parental_controls_config
    WHERE child_user_id = $1 AND is_active = true
  `, [childUserId]);
  
  if (result.rows.length === 0) {
    // No config, use defaults - block most services
    return {
      allowed: false,
      requiresApproval: false,
      reason: 'Parental controls not configured',
    };
  }
  
  const config = result.rows[0];
  
  // Check if blocked
  if (config.blockedServices.includes(serviceId)) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: 'This service is blocked by parental controls',
    };
  }
  
  // Check if allowed
  if (config.allowedServices.includes(serviceId) || config.allowedServices.includes('*')) {
    return {
      allowed: true,
      requiresApproval: false,
    };
  }
  
  // Not explicitly allowed or blocked - requires approval
  return {
    allowed: false,
    requiresApproval: true,
    reason: 'This service requires parental approval',
  };
}

// ============================================================
// Parental Alerts
// ============================================================

export async function sendParentalAlert(
  childUserId: string,
  alertType: 'blocked_content' | 'usage_limit' | 'suspicious_activity',
  details: Record<string, any>
): Promise<void> {
  // Get parent info
  const parentResult = await pool.query(`
    SELECT p.id, p.email, p.name, c.name as child_name
    FROM users c
    JOIN users p ON c.parent_user_id = p.id
    WHERE c.id = $1
  `, [childUserId]);
  
  if (parentResult.rows.length === 0) return;
  
  const { id: parentId, email: parentEmail, name: parentName, child_name: childName } = parentResult.rows[0];
  
  // Log the alert
  await pool.query(`
    INSERT INTO child_activity_log (
      child_user_id, activity_type, metadata
    ) VALUES ($1, 'parental_alert', $2)
  `, [childUserId, JSON.stringify({ alertType, details, parentNotified: true })]);
  
  // TODO: Send actual notification (email, push, etc.)
  console.log(`[ParentalAlert] Alert for ${childName}: ${alertType}`, details);
  
  // Create an approval request if needed
  if (alertType === 'blocked_content' && details.requestApproval) {
    await pool.query(`
      INSERT INTO parental_approval_requests (
        child_user_id, parent_user_id, request_type, request_data
      ) VALUES ($1, $2, 'conversation', $3)
    `, [childUserId, parentId, JSON.stringify({
      title: 'Blocked Content Alert',
      description: `${childName} attempted to access blocked content`,
      details,
    })]);
  }
}

// ============================================================
// Update Daily Usage
// ============================================================

export async function updateDailyUsage(
  childUserId: string,
  minutesToAdd: number,
  serviceId?: string
): Promise<void> {
  await pool.query(`
    INSERT INTO child_daily_usage (
      child_user_id, usage_date, total_minutes, first_activity_at, last_activity_at,
      service_usage
    ) VALUES (
      $1, CURRENT_DATE, $2, NOW(), NOW(),
      CASE WHEN $3 IS NOT NULL THEN jsonb_build_object($3, $2) ELSE '{}'::jsonb END
    )
    ON CONFLICT (child_user_id, usage_date) 
    DO UPDATE SET 
      total_minutes = child_daily_usage.total_minutes + $2,
      last_activity_at = NOW(),
      service_usage = CASE 
        WHEN $3 IS NOT NULL THEN 
          child_daily_usage.service_usage || jsonb_build_object(
            $3, 
            COALESCE((child_daily_usage.service_usage->>$3)::int, 0) + $2
          )
        ELSE child_daily_usage.service_usage
      END
  `, [childUserId, minutesToAdd, serviceId || null]);
}
