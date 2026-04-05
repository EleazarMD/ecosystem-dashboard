/**
 * TypeScript interfaces for the AHIS onboarding process
 */

/**
 * Project registration data
 */
export interface ProjectRegistrationData {
  name: string;
  description: string;
  domain: string;
  repository_url?: string;
  path: string;
  owner?: string;
  tags?: string[];
}

/**
 * Project registration response
 */
export interface ProjectRegistrationResponse {
  success: boolean;
  project_id: string;
  message?: string;
  error?: string;
}

/**
 * Service configuration for port registration
 */
export interface ServiceConfig {
  name: string;
  port: number;
  description: string;
  service_type: string;
}

/**
 * Port registration request
 */
export interface PortRegistrationRequest {
  project_id: string;
  services: ServiceConfig[];
}

/**
 * Port registration response
 */
export interface PortRegistrationResponse {
  success: boolean;
  registered_services: {
    name: string;
    port: number;
    status: string;
  }[];
  message?: string;
  error?: string;
}

/**
 * Available port response
 */
export interface AvailablePortsResponse {
  success: boolean;
  available_ports: number[];
  reserved_ranges?: {
    start: number;
    end: number;
    description: string;
  }[];
  error?: string;
}

/**
 * Configuration update
 */
export interface ConfigUpdate {
  file_path: string;
  key: string;
  value: string;
  description?: string;
}

/**
 * Configuration update request
 */
export interface ConfigUpdateRequest {
  project_id: string;
  dryRun: boolean;
  updates: ConfigUpdate[];
}

/**
 * Configuration update response
 */
export interface ConfigUpdateResponse {
  success: boolean;
  updated_files: {
    file_path: string;
    status: string;
    changes?: {
      key: string;
      old_value?: string;
      new_value: string;
    }[];
  }[];
  message?: string;
  error?: string;
}

/**
 * Compliance scan initiation response
 */
export interface ComplianceScanInitiationResponse {
  success: boolean;
  scan_id: string;
  message?: string;
  error?: string;
}

/**
 * Compliance issue
 */
export interface ComplianceIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  file_path?: string;
  line_number?: number;
  recommendation?: string;
}

/**
 * Compliance scan status response
 */
export interface ComplianceScanStatusResponse {
  success: boolean;
  scan_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  issues?: ComplianceIssue[];
  summary?: {
    total_issues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  message?: string;
  error?: string;
}

/**
 * Documentation setup options
 */
export interface DocumentationSetupOptions {
  generate_readme?: boolean;
  generate_api_docs?: boolean;
  generate_architecture_docs?: boolean;
  generate_usage_docs?: boolean;
  custom_template?: string;
}

/**
 * Documentation setup request
 */
export interface DocumentationSetupRequest {
  project_id: string;
  options?: DocumentationSetupOptions;
}

/**
 * Documentation setup response
 */
export interface DocumentationSetupInitiationResponse {
  success: boolean;
  operation_id: string;
  message?: string;
  error?: string;
}

/**
 * Documentation file
 */
export interface DocumentationFile {
  file_path: string;
  file_type: string;
  description: string;
}

/**
 * Documentation setup status response
 */
export interface DocumentationSetupStatusResponse {
  success: boolean;
  operation_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  generated_files?: DocumentationFile[];
  summary?: {
    total_files: number;
    readme: boolean;
    api_docs: boolean;
    architecture_docs: boolean;
    usage_docs: boolean;
  };
  message?: string;
  error?: string;
}
