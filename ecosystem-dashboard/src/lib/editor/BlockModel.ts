/**
 * Custom Block Model - Notion Architecture
 * Reactive block system with operational transforms
 */

import { nanoid } from 'nanoid';

// Block types matching Notion
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
  | 'divider'
  | 'table'
  | 'database_inline'
  | 'database_full'
  | 'column_list'     // Phase 2: Multi-column layouts
  | 'column'
  | 'grid_container'
  | 'grid_item'
  | 'spacer'          // Phase 3: Vertical spacing
  | 'image'           // Phase 4: Media blocks
  | 'video'
  | 'file'
  | 'embed'
  | 'static_chart'    // Phase 5: Chart blocks (Claude Code integration)
  | 'plotly_chart'
  | 'data_story'
  | 'audio_player'    // Phase 6: Podcast publishing
  | 'transcript';

// Text annotations
export interface TextAnnotations {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: string;
  backgroundColor?: string;
}

// Rich text segment
export interface RichTextSegment {
  text: string;
  annotations?: TextAnnotations;
  href?: string;
}

// Comment interface
export interface BlockComment {
  id: string;
  text: string;
  author: string;
  authorId?: string;
  createdAt: string;
  resolved?: boolean;
}

// Block properties
export interface BlockProperties {
  checked?: boolean; // For to_do
  color?: string; // For callout
  language?: string; // For code
  icon?: string; // For pages/callout
  title?: RichTextSegment[];
  comments?: BlockComment[]; // Block comments
  [key: string]: any;
}

// Core block interface
export interface Block {
  id: string;
  type: BlockType;
  content: RichTextSegment[];
  properties: BlockProperties;
  parentId: string | null;
  children: string[]; // Child block IDs
  createdTime: number;
  lastEditedTime: number;
  createdBy: string;
  lastEditedBy: string;
  
  // 🎨 Design capabilities (imported from workspace types)
  style?: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
    fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
    fontFamily?: 'sans' | 'serif' | 'mono';
    lineHeight?: string;
    letterSpacing?: 'tight' | 'normal' | 'wide';
    alignment?: 'left' | 'center' | 'right' | 'justify';
    padding?: string;
    margin?: string;
    borderWidth?: string;
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    boxShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    opacity?: number;
    calloutType?: 'info' | 'warning' | 'error' | 'success';
    icon?: string;
    dividerStyle?: {
      color?: string;
      thickness?: 'thin' | 'medium' | 'thick';
      style?: 'solid' | 'dashed' | 'dotted';
    };
  };
  layout?: {
    type: 'columns' | 'grid';
    columns?: number;
    gap?: string;
    alignItems?: 'start' | 'center' | 'end' | 'stretch';
    justifyContent?: 'start' | 'center' | 'end' | 'space-between';
  };
}

// Operation types for OT (Operational Transforms)
export type OperationType =
  | 'insert_text'
  | 'delete_text'
  | 'format_text'
  | 'insert_block'
  | 'delete_block'
  | 'move_block'
  | 'transform_block'
  | 'update_properties';

export interface Operation {
  type: OperationType;
  blockId: string;
  timestamp: number;
  userId: string;
  data: any;
}

/**
 * BlockModel - Core reactive block system
 * Manages blocks, transformations, and operations
 */
export class BlockModel {
  private blocks: Map<string, Block> = new Map();
  private rootBlockIds: string[] = [];
  private listeners: Set<(blocks: Block[]) => void> = new Set();
  private operationHistory: Operation[] = [];

  constructor(initialBlocks: Block[] = []) {
    initialBlocks.forEach(block => {
      this.blocks.set(block.id, block);
      if (!block.parentId) {
        this.rootBlockIds.push(block.id);
      }
    });
  }

  // Subscribe to changes
  subscribe(listener: (blocks: Block[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify listeners
  private notify() {
    const blocks = this.getAllBlocks();
    this.listeners.forEach(listener => listener(blocks));
  }

  // Get all blocks in order
  getAllBlocks(): Block[] {
    const result: Block[] = [];
    const traverse = (blockId: string) => {
      const block = this.blocks.get(blockId);
      if (block) {
        result.push(block);
        block.children.forEach(childId => traverse(childId));
      }
    };
    this.rootBlockIds.forEach(id => traverse(id));
    return result;
  }

  // Get block by ID
  getBlock(id: string): Block | undefined {
    return this.blocks.get(id);
  }

  // Create new block
  createBlock(
    type: BlockType,
    content: RichTextSegment[] = [{ text: '' }],
    parentId: string | null = null,
    position?: number,
    userId: string = 'system'
  ): Block {
    const block: Block = {
      id: nanoid(),
      type,
      content,
      properties: {},
      parentId,
      children: [],
      createdTime: Date.now(),
      lastEditedTime: Date.now(),
      createdBy: userId,
      lastEditedBy: userId,
    };

    this.blocks.set(block.id, block);

    // Add to parent or root
    if (parentId) {
      const parent = this.blocks.get(parentId);
      if (parent) {
        if (position !== undefined) {
          parent.children.splice(position, 0, block.id);
        } else {
          parent.children.push(block.id);
        }
      }
    } else {
      if (position !== undefined) {
        this.rootBlockIds.splice(position, 0, block.id);
      } else {
        this.rootBlockIds.push(block.id);
      }
    }

    this.notify();
    return block;
  }

  // Delete block
  deleteBlock(blockId: string, userId: string = 'system'): boolean {
    const block = this.blocks.get(blockId);
    if (!block) return false;

    // Delete children recursively
    block.children.forEach(childId => this.deleteBlock(childId, userId));

    // Remove from parent
    if (block.parentId) {
      const parent = this.blocks.get(block.parentId);
      if (parent) {
        parent.children = parent.children.filter(id => id !== blockId);
      }
    } else {
      this.rootBlockIds = this.rootBlockIds.filter(id => id !== blockId);
    }

    this.blocks.delete(blockId);
    this.notify();
    return true;
  }

  // Convert/Transform block type (like Notion's convert feature)
  convertBlock(blockId: string, newType: BlockType, userId: string = 'system'): boolean {
    return this.transformBlock(blockId, newType, userId);
  }

  transformBlock(blockId: string, newType: BlockType, userId: string = 'system'): boolean {
    const block = this.blocks.get(blockId);
    if (!block) return false;

    // Preserve content during transformation
    block.type = newType;
    block.lastEditedTime = Date.now();
    block.lastEditedBy = userId;

    // Adjust properties based on new type
    switch (newType) {
      case 'to_do':
        if (block.properties.checked === undefined) {
          block.properties.checked = false;
        }
        break;
      case 'code':
        if (!block.properties.language) {
          block.properties.language = 'javascript';
        }
        break;
      case 'callout':
        if (!block.properties.icon) {
          block.properties.icon = '💡';
        }
        break;
    }

    this.notify();
    return true;
  }

  // Update block content
  updateContent(
    blockId: string,
    content: RichTextSegment[],
    userId: string = 'system'
  ): boolean {
    const block = this.blocks.get(blockId);
    if (!block) return false;

    block.content = content;
    block.lastEditedTime = Date.now();
    block.lastEditedBy = userId;

    this.notify();
    return true;
  }

  // Update block properties
  updateProperties(
    blockId: string,
    properties: Partial<BlockProperties>,
    userId: string = 'system'
  ): boolean {
    const block = this.blocks.get(blockId);
    if (!block) return false;

    block.properties = { ...block.properties, ...properties };
    block.lastEditedTime = Date.now();
    block.lastEditedBy = userId;

    this.notify();
    return true;
  }

  // Move block to new position
  moveBlock(
    blockId: string,
    newParentId: string | null,
    position: number,
    userId: string = 'system'
  ): boolean {
    const block = this.blocks.get(blockId);
    if (!block) return false;

    // Remove from current parent
    if (block.parentId) {
      const oldParent = this.blocks.get(block.parentId);
      if (oldParent) {
        oldParent.children = oldParent.children.filter(id => id !== blockId);
      }
    } else {
      this.rootBlockIds = this.rootBlockIds.filter(id => id !== blockId);
    }

    // Add to new parent
    block.parentId = newParentId;
    if (newParentId) {
      const newParent = this.blocks.get(newParentId);
      if (newParent) {
        newParent.children.splice(position, 0, blockId);
      }
    } else {
      this.rootBlockIds.splice(position, 0, blockId);
    }

    block.lastEditedTime = Date.now();
    block.lastEditedBy = userId;

    this.notify();
    return true;
  }

  // Insert block after another block
  insertBlockAfter(
    afterBlockId: string,
    type: BlockType,
    content: RichTextSegment[] = [{ text: '' }],
    userId: string = 'system'
  ): Block | null {
    const afterBlock = this.blocks.get(afterBlockId);
    if (!afterBlock) return null;

    // Find position
    let position: number;
    if (afterBlock.parentId) {
      const parent = this.blocks.get(afterBlock.parentId);
      if (!parent) return null;
      position = parent.children.indexOf(afterBlockId) + 1;
    } else {
      position = this.rootBlockIds.indexOf(afterBlockId) + 1;
    }

    return this.createBlock(type, content, afterBlock.parentId, position, userId);
  }

  // Indent block (make it a child of previous sibling)
  indentBlock(blockId: string, userId: string = 'system'): boolean {
    const block = this.blocks.get(blockId);
    if (!block) return false;

    // Find previous sibling
    let siblings: string[];
    let index: number;

    if (block.parentId) {
      const parent = this.blocks.get(block.parentId);
      if (!parent) return false;
      siblings = parent.children;
      index = siblings.indexOf(blockId);
    } else {
      siblings = this.rootBlockIds;
      index = siblings.indexOf(blockId);
    }

    // Can't indent first block
    if (index === 0) return false;

    const previousSiblingId = siblings[index - 1];
    const previousSibling = this.blocks.get(previousSiblingId);
    if (!previousSibling) return false;

    // Move block to be child of previous sibling
    return this.moveBlock(blockId, previousSiblingId, previousSibling.children.length, userId);
  }

  // Outdent block (move up one level in hierarchy)
  outdentBlock(blockId: string, userId: string = 'system'): boolean {
    const block = this.blocks.get(blockId);
    if (!block || !block.parentId) return false;

    const parent = this.blocks.get(block.parentId);
    if (!parent) return false;

    // Find position after parent
    let newPosition: number;
    if (parent.parentId) {
      const grandparent = this.blocks.get(parent.parentId);
      if (!grandparent) return false;
      newPosition = grandparent.children.indexOf(parent.id) + 1;
    } else {
      newPosition = this.rootBlockIds.indexOf(parent.id) + 1;
    }

    // Move block to parent's level
    return this.moveBlock(blockId, parent.parentId, newPosition, userId);
  }

  // Apply operation (for real-time sync)
  applyOperation(operation: Operation): boolean {
    this.operationHistory.push(operation);

    switch (operation.type) {
      case 'insert_block':
        this.createBlock(
          operation.data.type,
          operation.data.content,
          operation.data.parentId,
          operation.data.position,
          operation.userId
        );
        return true;

      case 'delete_block':
        return this.deleteBlock(operation.blockId, operation.userId);

      case 'transform_block':
        return this.transformBlock(
          operation.blockId,
          operation.data.newType,
          operation.userId
        );

      case 'update_properties':
        return this.updateProperties(
          operation.blockId,
          operation.data.properties,
          operation.userId
        );

      default:
        return false;
    }
  }

  // Export to JSON (for saving)
  toJSON(): Block[] {
    return this.getAllBlocks();
  }

  // Import from JSON (for loading)
  static fromJSON(blocks: Block[]): BlockModel {
    return new BlockModel(blocks);
  }
}

export default BlockModel;
