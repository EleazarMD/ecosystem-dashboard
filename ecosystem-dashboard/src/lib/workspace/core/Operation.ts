/**
 * Operation Model
 * Based on Notion's operation-based transaction system
 * 
 * Every change in the workspace is expressed as an operation
 */

import { BlockType, BlockProperties } from '../../../types/workspace';

export type OperationType = 
  | 'create_block'
  | 'update_block'
  | 'delete_block'
  | 'move_block'
  | 'create_database'
  | 'update_database'
  | 'create_database_page'
  | 'update_database_page';

export interface BaseOperation {
  id: string;
  type: OperationType;
  timestamp: number;
  user_id: string;
}

export interface CreateBlockOperation extends BaseOperation {
  type: 'create_block';
  block_id: string;
  workspace_id: string;
  block_type: BlockType;
  properties: BlockProperties;
  parent_id: string | null;
  position?: number;  // Position in parent's content array
}

export interface UpdateBlockOperation extends BaseOperation {
  type: 'update_block';
  block_id: string;
  path?: string;  // JSON path for partial updates (e.g., 'properties.title')
  value: any;
  previous_value?: any;  // For rollback
}

export interface DeleteBlockOperation extends BaseOperation {
  type: 'delete_block';
  block_id: string;
  cascade: boolean;  // Delete children?
}

export interface MoveBlockOperation extends BaseOperation {
  type: 'move_block';
  block_id: string;
  old_parent_id: string | null;
  new_parent_id: string | null;
  old_position: number;
  new_position: number;
}

export interface CreateDatabaseOperation extends BaseOperation {
  type: 'create_database';
  database_id: string;
  block_id: string;
  workspace_id: string;
  title: string;
  schema: any[];
  inline: boolean;
}

export interface UpdateDatabaseOperation extends BaseOperation {
  type: 'update_database';
  database_id: string;
  path?: string;
  value: any;
}

export interface CreateDatabasePageOperation extends BaseOperation {
  type: 'create_database_page';
  page_id: string;
  database_id: string;
  properties: Record<string, any>;
}

export interface UpdateDatabasePageOperation extends BaseOperation {
  type: 'update_database_page';
  page_id: string;
  property_id: string;
  value: any;
}

export type Operation = 
  | CreateBlockOperation
  | UpdateBlockOperation
  | DeleteBlockOperation
  | MoveBlockOperation
  | CreateDatabaseOperation
  | UpdateDatabaseOperation
  | CreateDatabasePageOperation
  | UpdateDatabasePageOperation;

/**
 * Operation factory functions
 */
export class OperationFactory {
  static createBlock(params: {
    block_id: string;
    workspace_id: string;
    block_type: BlockType;
    properties: BlockProperties;
    parent_id?: string | null;
    position?: number;
    user_id: string;
  }): CreateBlockOperation {
    return {
      id: crypto.randomUUID(),
      type: 'create_block',
      timestamp: Date.now(),
      user_id: params.user_id,
      block_id: params.block_id,
      workspace_id: params.workspace_id,
      block_type: params.block_type,
      properties: params.properties,
      parent_id: params.parent_id || null,
      position: params.position
    };
  }

  static updateBlock(params: {
    block_id: string;
    path?: string;
    value: any;
    previous_value?: any;
    user_id: string;
  }): UpdateBlockOperation {
    return {
      id: crypto.randomUUID(),
      type: 'update_block',
      timestamp: Date.now(),
      user_id: params.user_id,
      block_id: params.block_id,
      path: params.path,
      value: params.value,
      previous_value: params.previous_value
    };
  }

  static deleteBlock(params: {
    block_id: string;
    cascade?: boolean;
    user_id: string;
  }): DeleteBlockOperation {
    return {
      id: crypto.randomUUID(),
      type: 'delete_block',
      timestamp: Date.now(),
      user_id: params.user_id,
      block_id: params.block_id,
      cascade: params.cascade !== false
    };
  }

  static moveBlock(params: {
    block_id: string;
    old_parent_id: string | null;
    new_parent_id: string | null;
    old_position: number;
    new_position: number;
    user_id: string;
  }): MoveBlockOperation {
    return {
      id: crypto.randomUUID(),
      type: 'move_block',
      timestamp: Date.now(),
      user_id: params.user_id,
      block_id: params.block_id,
      old_parent_id: params.old_parent_id,
      new_parent_id: params.new_parent_id,
      old_position: params.old_position,
      new_position: params.new_position
    };
  }
}

/**
 * Operation utilities
 */
export class OperationUtils {
  /**
   * Check if operations conflict
   */
  static conflictsWith(op1: Operation, op2: Operation): boolean {
    // Same block operations conflict
    if ('block_id' in op1 && 'block_id' in op2) {
      return op1.block_id === op2.block_id;
    }
    
    // Same database operations conflict
    if ('database_id' in op1 && 'database_id' in op2) {
      return op1.database_id === op2.database_id;
    }
    
    return false;
  }

  /**
   * Get all block IDs affected by operation
   */
  static getAffectedBlocks(op: Operation): string[] {
    const blocks: string[] = [];
    
    if ('block_id' in op) {
      blocks.push(op.block_id);
    }
    
    if (op.type === 'move_block') {
      if (op.old_parent_id) blocks.push(op.old_parent_id);
      if (op.new_parent_id) blocks.push(op.new_parent_id);
    }
    
    if (op.type === 'create_block' && op.parent_id) {
      blocks.push(op.parent_id);
    }
    
    return blocks;
  }

  /**
   * Check if operation requires tree integrity check
   */
  static requiresTreeCheck(op: Operation): boolean {
    return op.type === 'create_block' 
      || op.type === 'delete_block'
      || op.type === 'move_block';
  }

  /**
   * Serialize operation for storage
   */
  static serialize(op: Operation): string {
    return JSON.stringify(op);
  }

  /**
   * Deserialize operation from storage
   */
  static deserialize(json: string): Operation {
    return JSON.parse(json) as Operation;
  }
}
