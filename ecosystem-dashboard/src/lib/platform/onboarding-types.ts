/**
 * Onboarding Types for New User/Tenant Provisioning
 * 
 * Defines the complete data model for the multi-step onboarding wizard:
 * - User identity & account creation
 * - Email configuration (IMAP/OAuth2)
 * - Docker infrastructure provisioning
 * - Local LLM configuration
 * - Cloud provider setup (optional, blocked by default)
 * - ExoMind iOS app pairing
 * - Security & compliance validation
 * 
 * Aligned with:
 * - Chapter 19d: Multi-Tenant Data Isolation
 * - Chapter 23: Zero-Tolerance JIT Security
 * - Chapter 2: AI Gateway dual-port architecture
 * - Chapter 9: OpenClaw sandboxed containers
 */

import { TenantTier } from './tenant-types';

// ============================================================
// Onboarding Steps
// ============================================================

export type OnboardingStepId =
  | 'identity'
  | 'email'
  | 'infrastructure'
  | 'local-llms'
  | 'cloud-providers'
  | 'exomind'
  | 'security'
  | 'review';

export interface OnboardingStepMeta {
  id: OnboardingStepId;
  label: string;
  description: string;
  icon: string;
  required: boolean;
  skippableFor?: AccountType[];
}

export const ONBOARDING_STEPS: OnboardingStepMeta[] = [
  {
    id: 'identity',
    label: 'Account',
    description: 'Create your identity and tenant',
    icon: '👤',
    required: true,
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Connect your email account',
    icon: '📧',
    required: false,
    skippableFor: ['child'],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    description: 'Provision Docker containers & storage',
    icon: '🐳',
    required: true,
  },
  {
    id: 'local-llms',
    label: 'Local AI Models',
    description: 'Configure local LLM endpoints',
    icon: '🧠',
    required: true,
  },
  {
    id: 'cloud-providers',
    label: 'Cloud AI (Optional)',
    description: 'Add cloud provider API keys',
    icon: '☁️',
    required: false,
  },
  {
    id: 'exomind',
    label: 'ExoMind App',
    description: 'Pair your iOS device',
    icon: '📱',
    required: false,
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Review zero-tolerance security policies',
    icon: '🔒',
    required: true,
  },
  {
    id: 'review',
    label: 'Review & Activate',
    description: 'Confirm settings and activate',
    icon: '✅',
    required: true,
  },
];

// ============================================================
// Account Types
// ============================================================

export type AccountType = 'adult' | 'child';

export type ContentFilterLevel = 'strict' | 'moderate' | 'standard' | 'none';

// ============================================================
// Step 1: Identity & Account
// ============================================================

export interface IdentityFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  accountType: AccountType;
  dateOfBirth?: string;
  parentUserId?: string;
  tenantMode: 'create' | 'join';
  tenantName?: string;
  tenantSlug?: string;
  existingTenantId?: string;
  tier: TenantTier;
}

export const IDENTITY_DEFAULTS: IdentityFormData = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  accountType: 'adult',
  tenantMode: 'create',
  tenantName: '',
  tenantSlug: '',
  tier: 'free',
};

// ============================================================
// Step 2: Email Configuration
// ============================================================

export type EmailProvider = 'icloud' | 'gmail' | 'outlook' | 'custom-imap';
export type EmailAuthMethod = 'oauth2' | 'app-password' | 'imap-credentials';

export interface EmailProviderConfig {
  id: EmailProvider;
  name: string;
  icon: string;
  imapServer: string;
  imapPort: number;
  smtpServer: string;
  smtpPort: number;
  preferredAuth: EmailAuthMethod;
  appPasswordUrl?: string;
  oauthSupported: boolean;
  saasRecommendation: string;
}

export const EMAIL_PROVIDERS: EmailProviderConfig[] = [
  {
    id: 'icloud',
    name: 'iCloud Mail',
    icon: '🍎',
    imapServer: 'imap.mail.me.com',
    imapPort: 993,
    smtpServer: 'smtp.mail.me.com',
    smtpPort: 587,
    preferredAuth: 'app-password',
    appPasswordUrl: 'https://appleid.apple.com/account/manage',
    oauthSupported: false,
    saasRecommendation: 'Generate an app-specific password from Apple ID settings. Never use your main Apple ID password.',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: '📮',
    imapServer: 'imap.gmail.com',
    imapPort: 993,
    smtpServer: 'smtp.gmail.com',
    smtpPort: 587,
    preferredAuth: 'oauth2',
    appPasswordUrl: 'https://myaccount.google.com/apppasswords',
    oauthSupported: true,
    saasRecommendation: 'OAuth2 is recommended for Gmail. If OAuth2 is unavailable, use an app-specific password with 2FA enabled.',
  },
  {
    id: 'outlook',
    name: 'Outlook / Microsoft 365',
    icon: '📬',
    imapServer: 'outlook.office365.com',
    imapPort: 993,
    smtpServer: 'smtp.office365.com',
    smtpPort: 587,
    preferredAuth: 'oauth2',
    oauthSupported: true,
    saasRecommendation: 'OAuth2 via Microsoft Identity Platform is strongly recommended. Basic auth is deprecated by Microsoft.',
  },
  {
    id: 'custom-imap',
    name: 'Custom IMAP',
    icon: '⚙️',
    imapServer: '',
    imapPort: 993,
    smtpServer: '',
    smtpPort: 587,
    preferredAuth: 'imap-credentials',
    oauthSupported: false,
    saasRecommendation: 'Use TLS/SSL connections. Ensure your provider supports modern authentication.',
  },
];

export interface EmailFormData {
  provider: EmailProvider | null;
  authMethod: EmailAuthMethod;
  emailAddress: string;
  imapServer: string;
  imapPort: number;
  smtpServer: string;
  smtpPort: number;
  username: string;
  password: string;
  oauthToken?: string;
  connectionTested: boolean;
  connectionStatus: 'untested' | 'testing' | 'success' | 'failed';
  connectionError?: string;
  skipEmail: boolean;
}

export const EMAIL_DEFAULTS: EmailFormData = {
  provider: null,
  authMethod: 'app-password',
  emailAddress: '',
  imapServer: '',
  imapPort: 993,
  smtpServer: '',
  smtpPort: 587,
  username: '',
  password: '',
  connectionTested: false,
  connectionStatus: 'untested',
  skipEmail: false,
};

// ============================================================
// Step 3: Docker Infrastructure
// ============================================================

export interface InfrastructureFormData {
  diskAllocationGB: number;
  provisionAIGateway: boolean;
  provisionOpenClaw: boolean;
  openClawResourceProfile: 'starter' | 'pro' | 'enterprise';
  networkIsolation: boolean;
  volumeNames: {
    data: string;
    models: string;
    logs: string;
  };
  containerNames: {
    aiGateway: string;
    openClaw: string;
  };
  provisioningStatus: ProvisioningStatus;
}

export interface ProvisioningStatus {
  overall: 'pending' | 'running' | 'completed' | 'failed';
  steps: ProvisioningStep[];
}

export interface ProvisioningStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  message?: string;
  durationMs?: number;
}

export function getDefaultInfrastructure(slug: string, tier: TenantTier): InfrastructureFormData {
  const diskMap: Record<TenantTier, number> = {
    free: 2,
    basic: 25,
    premium: 500,
  };

  return {
    diskAllocationGB: diskMap[tier],
    provisionAIGateway: true,
    provisionOpenClaw: true,
    openClawResourceProfile: tier === 'premium' ? 'enterprise' : tier === 'basic' ? 'pro' : 'starter',
    networkIsolation: true,
    volumeNames: {
      data: `aihl-${slug}-data`,
      models: `aihl-${slug}-models`,
      logs: `aihl-${slug}-logs`,
    },
    containerNames: {
      aiGateway: `${slug}-ai-gateway`,
      openClaw: `${slug}-openclaw`,
    },
    provisioningStatus: {
      overall: 'pending',
      steps: [
        { id: 'volumes', name: 'Create Docker volumes', status: 'pending' },
        { id: 'network', name: 'Configure network isolation', status: 'pending' },
        { id: 'ai-gateway', name: 'Provision AI Gateway container', status: 'pending' },
        { id: 'openclaw', name: 'Provision OpenClaw container', status: 'pending' },
        { id: 'health', name: 'Run health checks', status: 'pending' },
      ],
    },
  };
}

// ============================================================
// Step 4: Local LLM Configuration
// ============================================================

export interface LocalLLMConfig {
  id: string;
  name: string;
  purpose: string;
  endpoint: string;
  port: number;
  modelType: 'chat' | 'vision' | 'tts' | 'stt' | 'embedding';
  status: 'available' | 'loading' | 'unavailable' | 'checking';
  isDefault: boolean;
  contextWindow?: number;
  description: string;
}

export const DEFAULT_LOCAL_LLMS: LocalLLMConfig[] = [
  {
    id: 'minimax',
    name: 'MiniMax',
    purpose: 'General chat & reasoning',
    endpoint: '/v1/chat/completions',
    port: 8123,
    modelType: 'chat',
    status: 'checking',
    isDefault: true,
    contextWindow: 32768,
    description: 'High-quality general-purpose language model for chat, reasoning, and creative tasks.',
  },
  {
    id: 'qwen-vision',
    name: 'Qwen Vision LM',
    purpose: 'Multimodal (image + text)',
    endpoint: '/v1/chat/completions',
    port: 8124,
    modelType: 'vision',
    status: 'checking',
    isDefault: false,
    contextWindow: 32768,
    description: 'Vision-language model that can understand images, charts, documents, and screenshots.',
  },
  {
    id: 'qwen-tts',
    name: 'Qwen TTS',
    purpose: 'Text-to-Speech',
    endpoint: '/v1/tts/synthesize',
    port: 5003,
    modelType: 'tts',
    status: 'checking',
    isDefault: false,
    description: 'High-fidelity text-to-speech synthesis with multiple voice options.',
  },
];

export interface LocalLLMFormData {
  models: LocalLLMConfig[];
  defaultChatModel: string;
  defaultVisionModel: string;
  defaultTTSModel: string;
  allModelsChecked: boolean;
}

export const LOCAL_LLM_DEFAULTS: LocalLLMFormData = {
  models: [...DEFAULT_LOCAL_LLMS],
  defaultChatModel: 'minimax',
  defaultVisionModel: 'qwen-vision',
  defaultTTSModel: 'qwen-tts',
  allModelsChecked: false,
};

// ============================================================
// Step 5: Cloud Providers (Optional, Blocked by Default)
// ============================================================

export interface CloudProviderConfig {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  blocked: boolean;
  apiKey: string;
  apiKeyValid: boolean | null;
  validationStatus: 'unchecked' | 'checking' | 'valid' | 'invalid';
  models: string[];
  estimatedCost: string;
  description: string;
}

export const DEFAULT_CLOUD_PROVIDERS: CloudProviderConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    icon: '🟣',
    enabled: false,
    blocked: true,
    apiKey: '',
    apiKeyValid: null,
    validationStatus: 'unchecked',
    models: ['claude-sonnet-4', 'claude-haiku-4-5', 'claude-opus-4'],
    estimatedCost: '$3-15 per 1M tokens',
    description: 'Advanced reasoning and analysis. Best for complex tasks, coding, and research.',
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    icon: '🔵',
    enabled: false,
    blocked: true,
    apiKey: '',
    apiKeyValid: null,
    validationStatus: 'unchecked',
    models: ['gemini-2-5-flash', 'gemini-2-5-pro'],
    estimatedCost: '$0.15-7 per 1M tokens',
    description: 'Multimodal AI with strong search integration. Good for research and content generation.',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    icon: '🟢',
    enabled: false,
    blocked: true,
    apiKey: '',
    apiKeyValid: null,
    validationStatus: 'unchecked',
    models: ['gpt-4o', 'gpt-4o-mini', 'o3', 'o3-mini'],
    estimatedCost: '$2.50-60 per 1M tokens',
    description: 'Industry-leading language models. Best for general intelligence and reasoning.',
  },
];

export interface CloudProviderFormData {
  localFirst: boolean;
  providers: CloudProviderConfig[];
  acknowledgedCosts: boolean;
}

export const CLOUD_PROVIDER_DEFAULTS: CloudProviderFormData = {
  localFirst: true,
  providers: [...DEFAULT_CLOUD_PROVIDERS],
  acknowledgedCosts: false,
};

// ============================================================
// Step 6: ExoMind iOS App
// ============================================================

export interface ExoMindFormData {
  generateEndpoint: boolean;
  tenantEndpointUrl: string;
  tenantApiKey: string;
  tailscaleAuthKey: string;
  pushNotificationsEnabled: boolean;
  apnsToken: string;
  websocketEndpoint: string;
  qrCodeData: string;
  pairingStatus: 'unpaired' | 'pairing' | 'paired' | 'failed';
  skipPairing: boolean;
}

export const EXOMIND_DEFAULTS: ExoMindFormData = {
  generateEndpoint: true,
  tenantEndpointUrl: '',
  tenantApiKey: '',
  tailscaleAuthKey: '',
  pushNotificationsEnabled: false,
  apnsToken: '',
  websocketEndpoint: '',
  qrCodeData: '',
  pairingStatus: 'unpaired',
  skipPairing: false,
};

// ============================================================
// Step 7: Security & Compliance
// ============================================================

export interface SecurityFormData {
  zeroToleranceAccepted: boolean;
  jitAccessAcknowledged: boolean;
  auditLoggingAcknowledged: boolean;
  contentFilterLevel: ContentFilterLevel;
  parentalControlsEnabled: boolean;
  parentalControls: {
    dailyUsageLimitMinutes: number;
    allowedHoursStart: string;
    allowedHoursEnd: string;
    logAllConversations: boolean;
    alertOnBlockedContent: boolean;
  };
  dataIsolationAcknowledged: boolean;
  networkSecurityAcknowledged: boolean;
}

export const SECURITY_DEFAULTS: SecurityFormData = {
  zeroToleranceAccepted: false,
  jitAccessAcknowledged: false,
  auditLoggingAcknowledged: false,
  contentFilterLevel: 'none',
  parentalControlsEnabled: false,
  parentalControls: {
    dailyUsageLimitMinutes: 120,
    allowedHoursStart: '08:00',
    allowedHoursEnd: '21:00',
    logAllConversations: true,
    alertOnBlockedContent: true,
  },
  dataIsolationAcknowledged: false,
  networkSecurityAcknowledged: false,
};

// ============================================================
// Complete Onboarding State
// ============================================================

export interface OnboardingState {
  currentStep: number;
  completedSteps: Set<OnboardingStepId>;
  identity: IdentityFormData;
  email: EmailFormData;
  infrastructure: InfrastructureFormData;
  localLLMs: LocalLLMFormData;
  cloudProviders: CloudProviderFormData;
  exomind: ExoMindFormData;
  security: SecurityFormData;
}

export interface OnboardingValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

// ============================================================
// API Request/Response Types
// ============================================================

export interface OnboardingSubmitRequest {
  identity: IdentityFormData;
  email: EmailFormData;
  infrastructure: InfrastructureFormData;
  localLLMs: LocalLLMFormData;
  cloudProviders: CloudProviderFormData;
  exomind: ExoMindFormData;
  security: SecurityFormData;
}

export interface OnboardingSubmitResponse {
  success: boolean;
  tenantId?: string;
  userId?: string;
  tenantSlug?: string;
  tenantApiKey?: string;
  exomindEndpoint?: string;
  provisioningSteps: ProvisioningStep[];
  error?: string;
}
