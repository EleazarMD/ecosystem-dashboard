/**
 * Sensitive Data Classification and Wall-Garden
 * 
 * Classifies documents and data by sensitivity level and enforces
 * access controls for LLM/agent access.
 */

export type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'restricted';

export interface ClassifiedDocument {
  id: string;
  path?: string;
  content?: string;
  sensitivity: SensitivityLevel;
  classification: ClassificationResult;
  accessControl: AccessControl;
}

export interface ClassificationResult {
  level: SensitivityLevel;
  reasons: string[];
  confidence: number;
  detectedPatterns: string[];
}

export interface AccessControl {
  allowLLMAccess: boolean;
  allowAgentAccess: boolean;
  requiresApproval: boolean;
  allowedUsers?: string[];
  allowedTenants?: string[];
  redactBeforeAccess: boolean;
}

/**
 * Patterns that indicate sensitive content
 */
const SENSITIVITY_PATTERNS: Array<{
  pattern: RegExp;
  level: SensitivityLevel;
  reason: string;
}> = [
  // Restricted - Never expose to LLM
  {
    pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i,
    level: 'restricted',
    reason: 'Private key detected',
  },
  {
    pattern: /-----BEGIN\s+PGP\s+PRIVATE\s+KEY\s+BLOCK-----/i,
    level: 'restricted',
    reason: 'PGP private key detected',
  },
  {
    pattern: /password\s*[:=]\s*["']?[^\s"']{8,}/i,
    level: 'restricted',
    reason: 'Password in plaintext',
  },
  {
    pattern: /api[_-]?key\s*[:=]\s*["']?[a-zA-Z0-9_-]{20,}/i,
    level: 'restricted',
    reason: 'API key detected',
  },
  {
    pattern: /secret[_-]?key\s*[:=]\s*["']?[a-zA-Z0-9_-]{20,}/i,
    level: 'restricted',
    reason: 'Secret key detected',
  },
  {
    pattern: /sk-[a-zA-Z0-9]{32,}/,
    level: 'restricted',
    reason: 'OpenAI API key detected',
  },
  {
    pattern: /sk-ant-[a-zA-Z0-9-]{32,}/,
    level: 'restricted',
    reason: 'Anthropic API key detected',
  },
  {
    pattern: /ghp_[a-zA-Z0-9]{36}/,
    level: 'restricted',
    reason: 'GitHub token detected',
  },
  {
    pattern: /xox[baprs]-[a-zA-Z0-9-]{10,}/,
    level: 'restricted',
    reason: 'Slack token detected',
  },
  {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/,
    level: 'restricted',
    reason: 'SSN pattern detected',
  },
  {
    pattern: /\b\d{16}\b/,
    level: 'restricted',
    reason: 'Credit card number pattern',
  },
  
  // Confidential - Requires approval
  {
    pattern: /confidential|proprietary|trade\s+secret/i,
    level: 'confidential',
    reason: 'Confidentiality marker',
  },
  {
    pattern: /do\s+not\s+(share|distribute|forward)/i,
    level: 'confidential',
    reason: 'Distribution restriction',
  },
  {
    pattern: /internal\s+use\s+only/i,
    level: 'confidential',
    reason: 'Internal use marker',
  },
  {
    pattern: /salary|compensation|payroll/i,
    level: 'confidential',
    reason: 'Compensation data',
  },
  {
    pattern: /medical|diagnosis|prescription|health\s+record/i,
    level: 'confidential',
    reason: 'Medical information (PHI)',
  },
  {
    pattern: /attorney[- ]client|legal\s+privilege/i,
    level: 'confidential',
    reason: 'Legal privilege',
  },
  
  // Internal - Limited LLM access
  {
    pattern: /internal|draft|wip|work\s+in\s+progress/i,
    level: 'internal',
    reason: 'Internal document marker',
  },
  {
    pattern: /employee\s+id|staff\s+number/i,
    level: 'internal',
    reason: 'Employee identifier',
  },
  {
    pattern: /meeting\s+notes|minutes/i,
    level: 'internal',
    reason: 'Internal meeting content',
  },
];

/**
 * File path patterns that indicate sensitivity
 */
const SENSITIVE_PATH_PATTERNS: Array<{
  pattern: RegExp;
  level: SensitivityLevel;
  reason: string;
}> = [
  { pattern: /\.env/, level: 'restricted', reason: 'Environment file' },
  { pattern: /credentials?\./, level: 'restricted', reason: 'Credentials file' },
  { pattern: /secrets?\./, level: 'restricted', reason: 'Secrets file' },
  { pattern: /\.ssh\//, level: 'restricted', reason: 'SSH directory' },
  { pattern: /\.gnupg\//, level: 'restricted', reason: 'GPG directory' },
  { pattern: /\.aws\//, level: 'restricted', reason: 'AWS config' },
  { pattern: /\.kube\//, level: 'restricted', reason: 'Kubernetes config' },
  { pattern: /auth-profiles\.json/, level: 'restricted', reason: 'Auth profiles' },
  { pattern: /sessions\.json/, level: 'confidential', reason: 'Session data' },
  { pattern: /\/private\//, level: 'confidential', reason: 'Private directory' },
  { pattern: /\/confidential\//, level: 'confidential', reason: 'Confidential directory' },
];

/**
 * Classify content by sensitivity level
 */
export function classifyContent(content: string, path?: string): ClassificationResult {
  const detectedPatterns: string[] = [];
  const reasons: string[] = [];
  let highestLevel: SensitivityLevel = 'public';
  
  const levelPriority: Record<SensitivityLevel, number> = {
    public: 0,
    internal: 1,
    confidential: 2,
    restricted: 3,
  };
  
  // Check content patterns
  for (const { pattern, level, reason } of SENSITIVITY_PATTERNS) {
    if (pattern.test(content)) {
      detectedPatterns.push(pattern.source);
      reasons.push(reason);
      if (levelPriority[level] > levelPriority[highestLevel]) {
        highestLevel = level;
      }
    }
  }
  
  // Check path patterns
  if (path) {
    for (const { pattern, level, reason } of SENSITIVE_PATH_PATTERNS) {
      if (pattern.test(path)) {
        detectedPatterns.push(pattern.source);
        reasons.push(reason);
        if (levelPriority[level] > levelPriority[highestLevel]) {
          highestLevel = level;
        }
      }
    }
  }
  
  // Calculate confidence based on number of patterns matched
  const confidence = Math.min(1, detectedPatterns.length * 0.25);
  
  return {
    level: highestLevel,
    reasons,
    confidence,
    detectedPatterns,
  };
}

/**
 * Get access control rules based on sensitivity level
 */
export function getAccessControl(
  level: SensitivityLevel,
  userId?: string,
  tenantId?: string
): AccessControl {
  switch (level) {
    case 'restricted':
      return {
        allowLLMAccess: false,
        allowAgentAccess: false,
        requiresApproval: true,
        redactBeforeAccess: true,
        allowedUsers: userId ? [userId] : [],
        allowedTenants: tenantId ? [tenantId] : [],
      };
      
    case 'confidential':
      return {
        allowLLMAccess: false,
        allowAgentAccess: true,  // Agent can access but not LLM directly
        requiresApproval: true,
        redactBeforeAccess: true,
        allowedUsers: userId ? [userId] : [],
        allowedTenants: tenantId ? [tenantId] : [],
      };
      
    case 'internal':
      return {
        allowLLMAccess: true,
        allowAgentAccess: true,
        requiresApproval: false,
        redactBeforeAccess: false,
        allowedUsers: undefined,  // All authenticated users
        allowedTenants: tenantId ? [tenantId] : undefined,
      };
      
    case 'public':
    default:
      return {
        allowLLMAccess: true,
        allowAgentAccess: true,
        requiresApproval: false,
        redactBeforeAccess: false,
      };
  }
}

/**
 * Redact sensitive content before LLM access
 */
export function redactSensitiveContent(content: string): string {
  let redacted = content;
  
  // Redact API keys
  redacted = redacted.replace(/sk-[a-zA-Z0-9]{32,}/g, '[REDACTED_OPENAI_KEY]');
  redacted = redacted.replace(/sk-ant-[a-zA-Z0-9-]{32,}/g, '[REDACTED_ANTHROPIC_KEY]');
  redacted = redacted.replace(/ghp_[a-zA-Z0-9]{36}/g, '[REDACTED_GITHUB_TOKEN]');
  redacted = redacted.replace(/xox[baprs]-[a-zA-Z0-9-]{10,}/g, '[REDACTED_SLACK_TOKEN]');
  
  // Redact private keys
  redacted = redacted.replace(
    /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
    '[REDACTED_PRIVATE_KEY]'
  );
  
  // Redact passwords
  redacted = redacted.replace(
    /password\s*[:=]\s*["']?[^\s"']{8,}/gi,
    'password=[REDACTED]'
  );
  
  // Redact SSN
  redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');
  
  // Redact credit card numbers
  redacted = redacted.replace(/\b\d{16}\b/g, '[REDACTED_CC]');
  redacted = redacted.replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '[REDACTED_CC]');
  
  return redacted;
}

/**
 * Check if a user can access classified content
 */
export function canAccess(
  document: ClassifiedDocument,
  userId: string,
  tenantId?: string,
  isAdmin: boolean = false
): { allowed: boolean; reason?: string } {
  const { accessControl, sensitivity } = document;
  
  // Admins can access everything except restricted
  if (isAdmin && sensitivity !== 'restricted') {
    return { allowed: true };
  }
  
  // Check user allowlist
  if (accessControl.allowedUsers && accessControl.allowedUsers.length > 0) {
    if (!accessControl.allowedUsers.includes(userId)) {
      return { allowed: false, reason: 'User not in allowlist' };
    }
  }
  
  // Check tenant allowlist
  if (accessControl.allowedTenants && accessControl.allowedTenants.length > 0) {
    if (!tenantId || !accessControl.allowedTenants.includes(tenantId)) {
      return { allowed: false, reason: 'Tenant not in allowlist' };
    }
  }
  
  // Restricted content requires explicit approval
  if (sensitivity === 'restricted') {
    return { allowed: false, reason: 'Restricted content requires explicit approval' };
  }
  
  return { allowed: true };
}

/**
 * Prepare content for LLM access with appropriate safeguards
 */
export function prepareForLLM(
  content: string,
  path?: string,
  userId?: string,
  tenantId?: string
): {
  content: string;
  allowed: boolean;
  classification: ClassificationResult;
  warnings: string[];
} {
  const classification = classifyContent(content, path);
  const accessControl = getAccessControl(classification.level, userId, tenantId);
  const warnings: string[] = [];
  
  if (!accessControl.allowLLMAccess) {
    return {
      content: '[ACCESS DENIED: This content is classified as ' + classification.level + ']',
      allowed: false,
      classification,
      warnings: ['Content blocked due to sensitivity level: ' + classification.level],
    };
  }
  
  let processedContent = content;
  
  if (accessControl.redactBeforeAccess) {
    processedContent = redactSensitiveContent(content);
    warnings.push('Sensitive content has been redacted');
  }
  
  if (classification.level !== 'public') {
    warnings.push(`Content classified as ${classification.level}: ${classification.reasons.join(', ')}`);
  }
  
  return {
    content: processedContent,
    allowed: true,
    classification,
    warnings,
  };
}
