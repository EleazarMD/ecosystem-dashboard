/**
 * AIHDS SDK Integration Types for Dashboard Onboarding
 */

/**
 * Agent detection response
 */
export interface AgentDetectionResponse {
  success: boolean;
  hasAgents: boolean;
  agentTypes: string[];
  agentFiles: string[];
  recommendedSDKVersion: string;
  message?: string;
  error?: string;
}

/**
 * AIHDS SDK integration request
 */
export interface AIHDSIntegrationRequest {
  project_id: string;
  language: 'python' | 'javascript' | 'typescript';
  sdkVersion: string;
  agentTypes: string[];
  forceInstall?: boolean;
}

/**
 * AIHDS SDK integration response
 */
export interface AIHDSIntegrationResponse {
  success: boolean;
  sdkInstalled: boolean;
  configurationCreated: boolean;
  templateFiles: string[];
  nextSteps: string[];
  message?: string;
  error?: string;
}

/**
 * AIHDS SDK validation request
 */
export interface AIHDSValidationRequest {
  project_id: string;
  project_path: string;
}

/**
 * AIHDS SDK validation issue
 */
export interface AIHDSValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'installation' | 'configuration' | 'usage' | 'best_practices';
  description: string;
  file_path?: string;
  recommendation: string;
  autoFixable: boolean;
}

/**
 * AIHDS SDK validation response
 */
export interface AIHDSValidationResponse {
  success: boolean;
  isValid: boolean;
  sdkInstalled: boolean;
  configurationComplete: boolean;
  usageDetected: boolean;
  bestPracticesFollowed: boolean;
  issues: AIHDSValidationIssue[];
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    infos: number;
  };
  message?: string;
  error?: string;
}

/**
 * AIHDS SDK onboarding step data
 */
export interface AIHDSOnboardingStepData {
  agentDetection: AgentDetectionResponse | null;
  sdkIntegration: AIHDSIntegrationResponse | null;
  validation: AIHDSValidationResponse | null;
}
