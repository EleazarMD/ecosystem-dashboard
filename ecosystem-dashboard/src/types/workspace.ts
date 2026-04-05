/**
 * Workspace Types for Notion-like functionality
 * Based on Notion's block-based architecture
 */

// ============================================================================
// Core Types
// ============================================================================

export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list'
  | 'numbered_list'
  | 'to_do'
  | 'toggle'
  | 'quote'
  | 'callout'
  | 'code'
  | 'page'
  | 'database_inline'
  | 'database_full_page'
  | 'table'
  | 'table_row'
  | 'column_list'      // Multi-column layout container
  | 'column'           // Individual column in column_list
  | 'grid_container'   // Grid layout container
  | 'grid_item'        // Individual item in grid
  | 'spacer'           // Phase 3: Vertical spacing block
  | 'image'            // Phase 4: Image with caption
  | 'video'            // Phase 4: Video embed
  | 'file'             // Phase 4: File attachment
  | 'embed'            // Phase 4: Generic iframe embed
  | 'bookmark'
  | 'divider'
  | 'static_chart'     // Phase 5: Chart blocks (Claude Code integration)
  | 'plotly_chart'
  | 'data_story'
  | 'audio_player'     // Phase 6: Podcast publishing
  | 'transcript';

export type PropertyType =
  | 'title'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'people'
  | 'files'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'formula'
  | 'relation'
  | 'rollup'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by';

export type DatabaseViewType = 'table' | 'board' | 'gallery' | 'list' | 'calendar' | 'timeline';

export type Color =
  | 'default'
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'gray_background'
  | 'brown_background'
  | 'orange_background'
  | 'yellow_background'
  | 'green_background'
  | 'blue_background'
  | 'purple_background'
  | 'pink_background'
  | 'red_background';

// ============================================================================
// Rich Text
// ============================================================================

export interface RichTextAnnotations {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: Color;
}

export interface RichText {
  type: 'text' | 'mention' | 'equation';
  text?: {
    content: string;
    link?: string | null;
  };
  mention?: {
    type: 'user' | 'page' | 'database' | 'date';
    user?: { id: string };
    page?: { id: string };
    database?: { id: string };
    date?: { start: string; end?: string };
  };
  equation?: {
    expression: string;
  };
  annotations?: RichTextAnnotations;
  plain_text?: string;
  href?: string | null;
}

// ============================================================================
// Block Properties
// ============================================================================

export interface BlockProperties {
  // Common properties
  title?: RichText[];

  // To-do specific
  checked?: boolean;

  // Code specific
  language?: string;
  caption?: RichText[];

  // Color
  color?: Color;

  // Image/Video/File specific
  url?: string;

  // Callout specific
  icon?: {
    type: 'emoji' | 'external' | 'file';
    emoji?: string;
    external?: { url: string };
    file?: { url: string };
  };

  // Any other custom properties
  [key: string]: any;
}

// ============================================================================
// Workspace
// ============================================================================

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
  settings: Record<string, any>;
  archived: boolean;
}

export interface CreateWorkspaceParams {
  name: string;
  owner_id: string;
  settings?: Record<string, any>;
}

// ============================================================================
// Block Styling (Visual Design)
// ============================================================================

export interface BlockStyle {
  // Colors
  backgroundColor?: string;  // Hex color or Tailwind class (e.g., '#f3f4f6', 'gray-100')
  textColor?: string;        // Hex color or Tailwind class (e.g., '#1f2937', 'blue-600')
  borderColor?: string;

  // Typography
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  fontFamily?: 'sans' | 'serif' | 'mono';
  lineHeight?: string;       // e.g., '1.5', '1.75', '2'
  letterSpacing?: 'tight' | 'normal' | 'wide';

  // Layout & Spacing
  alignment?: 'left' | 'center' | 'right' | 'justify';
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | string;
  margin?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | string;
  width?: 'full' | 'page' | 'custom' | string;

  // Borders & Effects
  borderWidth?: string;      // e.g., '1px', '2px'
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  boxShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  opacity?: number;          // 0.0 to 1.0

  // Block-specific
  calloutType?: 'info' | 'warning' | 'error' | 'success';
  icon?: string;             // Emoji or icon identifier

  // Phase 3: Divider styling
  dividerStyle?: {
    color?: string;
    thickness?: 'thin' | 'medium' | 'thick';
    style?: 'solid' | 'dashed' | 'dotted';
  };
}

export interface BlockLayout {
  type: 'columns' | 'grid';
  columns?: number;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  justifyContent?: 'start' | 'center' | 'end' | 'space-between';
}

// ============================================================================
// Block
// ============================================================================

export interface Block {
  id: string;
  workspace_id: string;
  type: BlockType;
  properties: BlockProperties;
  parent_id: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  last_edited_by: string;
  archived: boolean;

  // 🎨 Design capabilities
  style?: BlockStyle;
  layout?: BlockLayout;

  // Optional nested children (for rendering)
  children?: Block[];
}

export interface CreateBlockParams {
  workspace_id: string;
  type: BlockType;
  properties?: BlockProperties;
  parent_id?: string | null;
  created_by: string;
  children?: CreateBlockParams[];
}

export interface UpdateBlockParams {
  type?: BlockType;
  properties?: BlockProperties;
  style?: BlockStyle;       // 🎨 Visual styling
  layout?: BlockLayout;     // 🎨 Layout configuration
  last_edited_by: string;
}

// ============================================================================
// Block Content (Render Tree)
// ============================================================================

export interface BlockContent {
  id: string;
  parent_block_id: string;
  child_block_id: string;
  position: number;
  created_at: Date;
}

// ============================================================================
// Database
// ============================================================================

export interface DatabaseProperty {
  id: string;
  database_id: string;
  name: string;
  type: PropertyType;
  config: PropertyConfig;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface PropertyConfig {
  // Select/Multi-select options
  options?: Array<{
    id: string;
    name: string;
    color: Color;
  }>;

  // Number formatting
  format?: 'number' | 'number_with_commas' | 'percent' | 'dollar' | 'euro' | 'pound' | 'yen' | 'ruble' | 'rupee';

  // Formula expression
  expression?: string;

  // Relation configuration
  database_id?: string;
  synced_property_id?: string;
  type?: 'single_property' | 'dual_property';

  // Rollup configuration
  relation_property_id?: string;
  rollup_property_id?: string;
  function?: 'count' | 'count_values' | 'count_unique_values' | 'count_all'
  | 'percent_empty' | 'percent_not_empty'
  | 'sum' | 'average' | 'median' | 'min' | 'max' | 'range'
  | 'show_original';
}

export interface Database {
  id: string;
  workspace_id: string;
  block_id: string;
  title: RichText[];
  description?: RichText[];
  schema: DatabaseProperty[];
  views: DatabaseView[];
  created_at: Date;
  updated_at: Date;
}

export interface DatabaseView {
  id: string;
  type: DatabaseViewType;
  name: string;
  filter?: ViewFilter;
  sort?: ViewSort[];
  properties?: ViewPropertyConfig[];
}

export interface ViewFilter {
  and?: ViewFilter[];
  or?: ViewFilter[];
  property?: string;
  condition?: string;
  value?: any;
}

export interface ViewSort {
  property: string;
  direction: 'ascending' | 'descending';
}

export interface ViewPropertyConfig {
  property: string;
  visible: boolean;
  width?: number;
}

export interface CreateDatabaseParams {
  workspace_id: string;
  parent_id?: string;
  title: string;
  inline: boolean;
  schema: Omit<DatabaseProperty, 'id' | 'database_id' | 'created_at' | 'updated_at'>[];
  initial_pages?: Array<{
    title: string;
    properties: Record<string, any>;
  }>;
  created_by: string;
}

// ============================================================================
// Database Property Values
// ============================================================================

export interface DatabasePropertyValue {
  id: string;
  page_block_id: string;
  property_id: string;
  value: any;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Agent Instructions
// ============================================================================

export interface AgentInstruction {
  id: string;
  agent_name: string;
  instruction_page_id: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Agent Executions
// ============================================================================

export type ExecutionStatus = 'success' | 'failure' | 'partial' | 'running';

export interface AgentExecution {
  id: string;
  agent_name: string;
  action_type: string;
  target_block_id: string | null;
  input: Record<string, any>;
  output: Record<string, any>;
  status: ExecutionStatus;
  error_message?: string;
  duration_ms: number;
  created_at: Date;
}

export interface CreateAgentExecutionParams {
  agent_name: string;
  action_type: string;
  target_block_id?: string;
  input: Record<string, any>;
}

export interface UpdateAgentExecutionParams {
  output?: Record<string, any>;
  status: ExecutionStatus;
  error_message?: string;
  duration_ms: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface WorkspaceResponse {
  workspace: Workspace;
  page_count: number;
  database_count: number;
}

export interface BlockResponse {
  block: Block;
  has_children: boolean;
  children?: Block[];
}

export interface DatabaseResponse {
  database: Database;
  pages: Block[];
  total_pages: number;
}

export interface SearchResult {
  object: 'page' | 'database';
  id: string;
  title: string;
  parent: { type: string; id: string };
  created_at: Date;
  updated_at: Date;
}

export interface SearchResponse {
  results: SearchResult[];
  has_more: boolean;
  next_cursor?: string;
}

// ============================================================================
// Editor State (for Slate.js integration)
// ============================================================================

export interface EditorBlock {
  id: string;
  type: BlockType;
  properties: BlockProperties;
  children: EditorBlock[];
}

export interface EditorState {
  workspaceId: string;
  currentPageId: string;
  blocks: EditorBlock[];
  selection: {
    blockId: string;
    offset: number;
  } | null;
}

// ============================================================================
// Permissions & Sharing
// ============================================================================

export type WorkspaceRole =
  | 'owner'      // Full control, can delete workspace
  | 'admin'      // Manage settings, invite members, control policies
  | 'member'     // Create pages, collaborate within boundaries
  | 'guest';     // Limited read-only or scoped access

export type PermissionLevel =
  | 'full_access'  // Complete control: edit, share, move, delete, change permissions
  | 'can_edit'     // Edit content but cannot share or change permissions
  | 'can_comment'  // Add comments only, cannot edit content
  | 'can_view';    // Read-only access

export type ShareScope =
  | 'private'     // Only owner
  | 'workspace'   // All workspace members
  | 'specific'    // Specific users
  | 'link';       // Anyone with link

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled';

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  user_email: string;
  user_name?: string;
  user_avatar?: string;
  role: WorkspaceRole;
  invited_by: string;
  joined_at: Date;
  last_active_at?: Date;
  status: 'active' | 'suspended' | 'pending' | 'removed';
  created_at: Date;
  updated_at: Date;
}

export interface WorkspacePermission {
  id: string;
  block_id: string;
  user_id?: string;
  user_email?: string;
  link_token?: string;
  permission_level: PermissionLevel;
  share_scope: ShareScope;
  granted_by: string;
  granted_at: Date;
  expires_at?: Date;
  last_accessed_at?: Date;
  access_count: number;
  is_inherited: boolean;
  inherited_from?: string;
  conditions?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ShareInvitation {
  id: string;
  block_id: string;
  inviter_id: string;
  inviter_name?: string;
  invitee_email: string;
  permission_level: PermissionLevel;
  invitation_token: string;
  status: InvitationStatus;
  message?: string;
  sent_at: Date;
  expires_at?: Date;
  accepted_at?: Date;
  declined_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspacePolicy {
  id: string;
  workspace_id: string;
  policy_key: string;
  policy_value: Record<string, any>;
  updated_by: string;
  updated_at: Date;
  created_at: Date;
}

export interface BlockAccessInfo {
  block_id: string;
  user_id: string;
  permission_level: PermissionLevel;
  share_scope: ShareScope;
  is_owner: boolean;
  can_share: boolean;
  can_delete: boolean;
  can_move: boolean;
  can_comment: boolean;
  inherited_from?: string;
  workspace_role?: WorkspaceRole;
}

export interface ShareLinkInfo {
  link_url: string;
  link_token: string;
  permission_level: PermissionLevel;
  created_by: string;
  created_at: Date;
  expires_at?: Date;
  access_count: number;
}

export interface PermissionCapabilities {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_move: boolean;
  can_duplicate: boolean;
  can_comment: boolean;
  can_share: boolean;
  can_invite: boolean;
  can_change_permissions: boolean;
  can_transfer_ownership: boolean;
  can_view_history: boolean;
  can_restore_versions: boolean;
}

// ============================================================================
// Permission API Request/Response Types
// ============================================================================

export interface GrantPermissionRequest {
  block_id: string;
  user_email: string;
  permission_level: PermissionLevel;
  message?: string;
  expires_in_days?: number;
}

export interface RevokePermissionRequest {
  block_id: string;
  user_id: string;
}

export interface CheckPermissionRequest {
  block_id: string;
  user_id: string;
  action?: string;
}

export interface CreateShareLinkRequest {
  block_id: string;
  permission_level: PermissionLevel;
  expires_in_days?: number;
}

export interface InviteMemberRequest {
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  message?: string;
}

export interface PermissionResponse {
  success: boolean;
  permission?: WorkspacePermission;
  access_info?: BlockAccessInfo;
  message?: string;
}

export interface CollaboratorsResponse {
  block_id: string;
  collaborators: Array<{
    user_id: string;
    user_email: string;
    user_name?: string;
    user_avatar?: string;
    permission_level: PermissionLevel;
    granted_at: Date;
    is_inherited: boolean;
  }>;
  total_count: number;
}

export interface ShareLinkResponse {
  success: boolean;
  link_info: ShareLinkInfo;
}
