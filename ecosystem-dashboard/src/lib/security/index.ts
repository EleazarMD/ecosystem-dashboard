/**
 * Security Module Index
 * 
 * Centralized security utilities for AI Homelab Dashboard
 */

// Prompt Injection Defense
export {
  analyzePrompt,
  wrapExternalContent,
  validateResponse,
  getSecuritySystemPrompt,
  type PromptGuardResult,
  type PromptThreat,
  type PromptThreatType,
} from './prompt-guard';

// Data Classification and Wall-Garden
export {
  classifyContent,
  getAccessControl,
  redactSensitiveContent,
  canAccess,
  prepareForLLM,
  type SensitivityLevel,
  type ClassifiedDocument,
  type ClassificationResult,
  type AccessControl,
} from './data-classification';

// API Authentication
export {
  validateAPIAuth,
  withAPIAuth,
  withUserScope,
  getInternalServiceHeaders,
  checkRateLimit,
  withRateLimit,
  type APIAuthContext,
  type APIAuthResult,
} from './api-auth';

