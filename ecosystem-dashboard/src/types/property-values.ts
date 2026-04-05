/**
 * Property Value Types
 * Complete type definitions for all 24 property types
 */

// ============================================================================
// BASE TYPES
// ============================================================================

export type PropertyType =
  // Basic types
  | 'text'
  | 'number'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  // Selection types
  | 'select'
  | 'multi_select'
  | 'status'
  // Date/time types
  | 'date'
  // People types
  | 'person'
  | 'people'
  | 'created_by'
  | 'last_edited_by'
  // Advanced types
  | 'files'
  | 'relation'
  | 'rollup'
  | 'formula'
  // Automation types
  | 'button'
  // Metadata types
  | 'created_time'
  | 'last_edited_time'
  | 'unique_id'
  // Location types
  | 'place'
  // Workflow types
  | 'verification';

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  created_at: string;
  updated_at: string;
  last_active_at?: string;
  settings: Record<string, any>;
  archived: boolean;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  user?: User;
  role: 'owner' | 'admin' | 'member' | 'guest';
  permissions: Record<string, boolean>;
  joined_at: string;
  invited_by?: string;
}

// ============================================================================
// PROPERTY VALUE TYPES
// ============================================================================

export interface TextValue {
  text: string;
}

export interface NumberValue {
  number: number;
}

export interface CheckboxValue {
  checkbox: boolean;
}

export interface UrlValue {
  url: string;
}

export interface EmailValue {
  email: string;
}

export interface PhoneValue {
  phone_number: string;
}

export interface SelectOption {
  id: string;
  value: string;
  color: string;
  position: number;
  metadata?: Record<string, any>;
}

export interface SelectValue {
  id: string;
  name: string;
  color: string;
}

export interface MultiSelectValue {
  options: SelectValue[];
}

export interface StatusValue {
  id: string;
  name: string;
  color: string;
  workflow_state?: 'not_started' | 'in_progress' | 'done';
}

export interface DateValue {
  start: string; // ISO 8601
  end?: string; // ISO 8601
  time_zone?: string;
}

export interface PersonValue {
  id: string;
  user: User;
}

export interface PeopleValue {
  people: User[];
}

export interface Place {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
  metadata?: Record<string, any>;
}

export interface PlaceValue {
  place: Place;
}

export interface FileObject {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  thumbnail_url?: string;
  uploaded_by?: string;
  uploaded_at: string;
  metadata?: Record<string, any>;
}

export interface FilesValue {
  files: FileObject[];
}

export interface RelationValue {
  id: string;
  target_page_id: string;
  target_page_title?: string;
}

export interface RelationsValue {
  relations: RelationValue[];
}

export interface RollupValue {
  type: 'number' | 'date' | 'array' | 'unsupported';
  function: 'count' | 'count_values' | 'empty' | 'not_empty' | 'unique' | 
            'show_unique' | 'percent_empty' | 'percent_not_empty' |
            'sum' | 'average' | 'median' | 'min' | 'max' | 'range' |
            'earliest_date' | 'latest_date' | 'date_range' |
            'checked' | 'unchecked' | 'percent_checked' | 'percent_unchecked';
  number?: number;
  date?: DateValue;
  array?: any[];
}

export interface FormulaValue {
  type: 'string' | 'number' | 'boolean' | 'date';
  string?: string;
  number?: number;
  boolean?: boolean;
  date?: DateValue;
}

export interface ButtonAction {
  id: string;
  property_id: string;
  label: string;
  action_type: 'webhook' | 'automation' | 'open_url' | 'create_page' | 
                'update_property' | 'send_email' | 'run_script';
  config: Record<string, any>;
}

export interface ButtonValue {
  action: ButtonAction;
  last_executed_at?: string;
  last_executed_by?: string;
  last_status?: 'success' | 'failure' | 'pending';
}

export interface VerificationValue {
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  verified_by?: User;
  verified_at?: string;
  comments?: string;
  metadata?: Record<string, any>;
}

export interface UniqueIdValue {
  unique_id: string;
  number: number;
  prefix?: string;
}

export interface CreatedTimeValue {
  created_time: string; // ISO 8601
}

export interface CreatedByValue {
  created_by: User;
}

export interface LastEditedTimeValue {
  last_edited_time: string; // ISO 8601
}

export interface LastEditedByValue {
  last_edited_by: User;
}

// ============================================================================
// UNION TYPE FOR ALL PROPERTY VALUES
// ============================================================================

export type PropertyValue =
  | TextValue
  | NumberValue
  | CheckboxValue
  | UrlValue
  | EmailValue
  | PhoneValue
  | SelectValue
  | MultiSelectValue
  | StatusValue
  | DateValue
  | PersonValue
  | PeopleValue
  | PlaceValue
  | FilesValue
  | RelationValue
  | RelationsValue
  | RollupValue
  | FormulaValue
  | ButtonValue
  | VerificationValue
  | UniqueIdValue
  | CreatedTimeValue
  | CreatedByValue
  | LastEditedTimeValue
  | LastEditedByValue;

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface PropertyDefinition {
  id: string;
  database_id: string;
  name: string;
  type: PropertyType;
  config: PropertyConfig;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface PropertyConfig {
  // For select/multi-select/status
  options?: SelectOption[];
  
  // For number
  format?: 'number' | 'number_with_commas' | 'percent' | 'dollar' | 'euro' | 'pound' | 'yen' | 'rupee';
  
  // For formula
  expression?: string;
  
  // For rollup
  relation_property?: string;
  target_property?: string;
  function?: RollupValue['function'];
  
  // For relation
  target_database_id?: string;
  bidirectional?: boolean;
  inverse_property_id?: string;
  
  // For unique_id
  prefix?: string;
  format_string?: string;
  
  // For files
  max_file_size?: number;
  allowed_mime_types?: string[];
  
  // For button
  action?: ButtonAction;
  
  // General
  read_only?: boolean;
  required?: boolean;
  default_value?: any;
}

export interface DatabaseProperty {
  definition: PropertyDefinition;
  value?: PropertyValue;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreatePropertyRequest {
  database_id: string;
  name: string;
  type: PropertyType;
  config?: Partial<PropertyConfig>;
  position?: number;
}

export interface UpdatePropertyRequest {
  name?: string;
  config?: Partial<PropertyConfig>;
  position?: number;
}

export interface SetPropertyValueRequest {
  page_id: string;
  property_id: string;
  value: PropertyValue;
}

export interface GetPropertyValueResponse {
  property_id: string;
  page_id: string;
  value: PropertyValue;
  updated_at: string;
}

// ============================================================================
// RELATION TYPES
// ============================================================================

export interface DatabaseRelation {
  id: string;
  property_id: string;
  source_database_id: string;
  target_database_id: string;
  bidirectional: boolean;
  inverse_property_id?: string;
  created_at: string;
}

export interface RelationLink {
  id: string;
  source_page_id: string;
  target_page_id: string;
  property_id: string;
  created_at: string;
  created_by?: string;
}

// ============================================================================
// BUTTON EXECUTION TYPES
// ============================================================================

export interface ButtonExecution {
  id: string;
  page_block_id: string;
  button_action_id: string;
  executed_by?: string;
  status: 'success' | 'failure' | 'pending';
  result?: Record<string, any>;
  error_message?: string;
  executed_at: string;
}

export interface ExecuteButtonRequest {
  page_id: string;
  button_action_id: string;
}

export interface ExecuteButtonResponse {
  execution_id: string;
  status: 'success' | 'failure' | 'pending';
  result?: Record<string, any>;
  error_message?: string;
}

// ============================================================================
// VERIFICATION TYPES
// ============================================================================

export interface VerificationRecord {
  id: string;
  page_block_id: string;
  property_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  verified_by?: User;
  verified_at?: string;
  comments?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface VerificationHistoryEntry {
  id: string;
  verification_id: string;
  previous_status?: string;
  new_status: string;
  changed_by?: User;
  changed_at: string;
  comments?: string;
}

export interface UpdateVerificationRequest {
  status: 'approved' | 'rejected' | 'needs_review';
  comments?: string;
}

// ============================================================================
// SUGGESTION TYPES
// ============================================================================

export interface PropertySuggestion {
  id: string;
  database_id: string;
  suggested_name: string;
  suggested_type: PropertyType;
  confidence: number;
  reasoning: string;
  config?: Partial<PropertyConfig>;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface AcceptSuggestionRequest {
  suggestion_id: string;
  modifications?: {
    name?: string;
    config?: Partial<PropertyConfig>;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PropertyValueUpdate {
  property_id: string;
  value: PropertyValue;
}

export interface BulkPropertyUpdate {
  page_id: string;
  updates: PropertyValueUpdate[];
}

export interface PropertySearchResult {
  property_id: string;
  property_name: string;
  property_type: PropertyType;
  matches: Array<{
    page_id: string;
    page_title: string;
    value: PropertyValue;
  }>;
}
