/**
 * Child Workspace Types
 * Kid-friendly Notion-like workspace types extending adult workspace architecture
 */

// ============================================================================
// Block Types (simplified for kids)
// ============================================================================

export type ChildBlockType =
  // Basic text blocks
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  // List blocks
  | 'bulleted_list'
  | 'numbered_list'
  | 'to_do'
  | 'toggle'
  // Rich blocks
  | 'quote'
  | 'callout'
  | 'divider'
  // Page block
  | 'page'
  // Media blocks
  | 'image'
  | 'emoji_row'
  // Special kid blocks
  | 'sticker'
  | 'drawing'
  | 'highlight_box'
  // Integration blocks
  | 'linked_journal'
  | 'linked_planner'
  | 'linked_book';

export type TemplateCategory = 
  | 'story'
  | 'homework'
  | 'list'
  | 'travel'
  | 'creative'
  | 'notes'
  | 'project';

// ============================================================================
// Rich Text
// ============================================================================

export interface ChildTextAnnotations {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  color?: string;
  backgroundColor?: string;
}

export interface ChildRichText {
  text: string;
  annotations?: ChildTextAnnotations;
  href?: string;
}

// ============================================================================
// Block Properties
// ============================================================================

export interface ChildBlockProperties {
  // Page properties
  title?: ChildRichText[];
  icon?: string;
  cover?: string;
  
  // To-do specific
  checked?: boolean;
  
  // Callout specific
  color?: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'pink' | 'gray';
  
  // Code specific (for older kids)
  language?: string;
  
  // Toggle specific
  collapsed?: boolean;
  
  // Image specific
  url?: string;
  caption?: string;
  
  // Sticker specific
  stickerId?: string;
  stickerPack?: string;
  
  // Drawing specific
  drawingData?: string; // Base64 or SVG
  
  // Highlight box specific
  highlightColor?: string;
  
  // Integration links
  linkedId?: string;
  linkedType?: 'journal' | 'planner' | 'book';
  
  // Any other custom properties
  [key: string]: any;
}

// ============================================================================
// Block
// ============================================================================

export interface ChildBlock {
  id: string;
  workspaceId: string;
  type: ChildBlockType;
  content: ChildRichText[];
  properties: ChildBlockProperties;
  parentId: string | null;
  position: number;
  children?: ChildBlock[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastEditedBy: string;
  archived: boolean;
  
  // Child-specific
  isTemplate: boolean;
  templateCategory?: TemplateCategory;
  sharedWithParent: boolean;
}

export interface CreateChildBlockParams {
  workspaceId: string;
  type: ChildBlockType;
  content?: ChildRichText[];
  properties?: ChildBlockProperties;
  parentId?: string | null;
  position?: number;
  createdBy: string;
}

export interface UpdateChildBlockParams {
  type?: ChildBlockType;
  content?: ChildRichText[];
  properties?: ChildBlockProperties;
  position?: number;
  archived?: boolean;
  sharedWithParent?: boolean;
  lastEditedBy: string;
}

// ============================================================================
// Workspace
// ============================================================================

export interface ChildWorkspace {
  id: string;
  name: string;
  ownerId: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
  settings: ChildWorkspaceSettings;
  archived: boolean;
}

export interface ChildWorkspaceSettings {
  theme?: string;
  showEmojis?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  defaultPageIcon?: string;
}

export interface CreateChildWorkspaceParams {
  name?: string;
  ownerId: string;
  tenantId?: string;
  settings?: ChildWorkspaceSettings;
}

// ============================================================================
// Page Template
// ============================================================================

export interface ChildPageTemplate {
  id: string;
  name: string;
  description?: string;
  icon: string;
  category: TemplateCategory;
  templateBlocks: Omit<ChildBlock, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastEditedBy' | 'archived' | 'isTemplate' | 'sharedWithParent'>[];
  isSystem: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ChildWorkspaceResponse {
  workspace: ChildWorkspace;
  pages: ChildBlock[];
  pageCount: number;
}

export interface ChildPageResponse {
  page: ChildBlock;
  blocks: ChildBlock[];
}

export interface ChildTemplatesResponse {
  templates: ChildPageTemplate[];
}

// ============================================================================
// Block Type Configuration (for UI)
// ============================================================================

export const CHILD_BLOCK_CONFIG: Record<ChildBlockType, {
  label: string;
  emoji: string;
  description: string;
  category: 'text' | 'list' | 'media' | 'special' | 'integration';
}> = {
  paragraph: { label: 'Text', emoji: '📝', description: 'Just start writing...', category: 'text' },
  heading_1: { label: 'Big Title', emoji: '📌', description: 'A big section heading', category: 'text' },
  heading_2: { label: 'Medium Title', emoji: '📎', description: 'A medium section heading', category: 'text' },
  heading_3: { label: 'Small Title', emoji: '📍', description: 'A small section heading', category: 'text' },
  bulleted_list: { label: 'Bullet List', emoji: '•', description: 'A simple bulleted list', category: 'list' },
  numbered_list: { label: 'Numbered List', emoji: '1️⃣', description: 'A numbered list', category: 'list' },
  to_do: { label: 'Checklist', emoji: '☑️', description: 'Track tasks with a checklist', category: 'list' },
  toggle: { label: 'Toggle', emoji: '▶️', description: 'Hide content inside', category: 'list' },
  quote: { label: 'Quote', emoji: '💬', description: 'Capture a quote', category: 'text' },
  callout: { label: 'Callout', emoji: '💡', description: 'Make something stand out', category: 'text' },
  divider: { label: 'Divider', emoji: '➖', description: 'A horizontal line', category: 'text' },
  page: { label: 'Page', emoji: '📄', description: 'Create a new page inside', category: 'special' },
  image: { label: 'Image', emoji: '🖼️', description: 'Add a picture', category: 'media' },
  emoji_row: { label: 'Emoji Row', emoji: '😊', description: 'Add a row of emojis', category: 'media' },
  sticker: { label: 'Sticker', emoji: '⭐', description: 'Add a fun sticker', category: 'special' },
  drawing: { label: 'Drawing', emoji: '🎨', description: 'Draw something', category: 'special' },
  highlight_box: { label: 'Highlight Box', emoji: '🟨', description: 'A colored box for important stuff', category: 'special' },
  linked_journal: { label: 'Journal Link', emoji: '📔', description: 'Link to a journal entry', category: 'integration' },
  linked_planner: { label: 'Planner Link', emoji: '📅', description: 'Link to a planner item', category: 'integration' },
  linked_book: { label: 'Book Link', emoji: '📚', description: 'Link to a book', category: 'integration' },
};

export const TEMPLATE_CATEGORY_CONFIG: Record<TemplateCategory, {
  label: string;
  emoji: string;
  color: string;
}> = {
  story: { label: 'Stories', emoji: '📖', color: 'purple' },
  homework: { label: 'Homework', emoji: '📚', color: 'blue' },
  list: { label: 'Lists', emoji: '📋', color: 'green' },
  travel: { label: 'Travel', emoji: '✈️', color: 'cyan' },
  creative: { label: 'Creative', emoji: '✨', color: 'pink' },
  notes: { label: 'Notes', emoji: '📝', color: 'yellow' },
  project: { label: 'Projects', emoji: '🎯', color: 'orange' },
};

// ============================================================================
// Callout Colors
// ============================================================================

export const CALLOUT_COLORS = {
  blue: { bg: 'blue.50', border: 'blue.200', text: 'blue.700' },
  green: { bg: 'green.50', border: 'green.200', text: 'green.700' },
  yellow: { bg: 'yellow.50', border: 'yellow.200', text: 'yellow.700' },
  orange: { bg: 'orange.50', border: 'orange.200', text: 'orange.700' },
  red: { bg: 'red.50', border: 'red.200', text: 'red.700' },
  purple: { bg: 'purple.50', border: 'purple.200', text: 'purple.700' },
  pink: { bg: 'pink.50', border: 'pink.200', text: 'pink.700' },
  gray: { bg: 'gray.50', border: 'gray.200', text: 'gray.700' },
};
