/**
 * Transaction Validator
 * Implements Notion's before/after validation pattern
 * Validates permissions, coherency, and integrity
 */

import { Pool } from 'pg';
import { Transaction, TransactionUtils } from './Transaction';
import { Operation } from './Operation';
import { TreeIntegrityValidator, TreeValidationResult } from './TreeIntegrityValidator';
import { Block } from '../../../types/workspace';

export interface WorkspaceState {
  blocks: Map<string, Block>;
  block_content: Map<string, string[]>;  // parent_id -> [child_ids in order]
  timestamp: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'permission' | 'coherency' | 'tree_integrity' | 'schema' | 'constraint';
  severity: 'error' | 'warning';
  code: string;
  message: string;
  block_id?: string;
  operation_id?: string;
}

export class TransactionValidator {
  private treeValidator: TreeIntegrityValidator;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.treeValidator = new TreeIntegrityValidator();
  }

  /**
   * Validate transaction using before/after pattern
   */
  async validate(transaction: Transaction): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    try {
      // Step 1: Validate transaction structure
      const structureCheck = TransactionUtils.validate(transaction);
      if (!structureCheck.valid) {
        structureCheck.errors.forEach(error => {
          issues.push({
            type: 'constraint',
            severity: 'error',
            code: 'INVALID_TRANSACTION',
            message: error
          });
        });
        return { valid: false, issues, warnings };
      }

      // Step 2: Load BEFORE state
      const beforeState = await this.loadState(transaction);

      // Step 3: Apply operations to create AFTER state (in memory)
      const afterState = await this.applyOperations(beforeState, transaction);

      // Step 4: Validate permissions (before -> after)
      const permissionCheck = await this.validatePermissions(beforeState, afterState, transaction);
      issues.push(...permissionCheck.issues);
      warnings.push(...permissionCheck.warnings);

      // Step 5: Validate data coherency
      const coherencyCheck = this.validateCoherency(beforeState, afterState);
      issues.push(...coherencyCheck.issues);
      warnings.push(...coherencyCheck.warnings);

      // Step 6: Validate tree integrity
      if (TransactionUtils.requiresTreeCheck(transaction)) {
        const treeCheck = this.validateTreeIntegrity(afterState);
        issues.push(...treeCheck.issues);
        warnings.push(...treeCheck.warnings);
      }

      // Step 7: Validate schema consistency
      const schemaCheck = await this.validateSchemas(afterState);
      issues.push(...schemaCheck.issues);
      warnings.push(...schemaCheck.warnings);

      const errors = issues.filter(i => i.severity === 'error');

      return {
        valid: errors.length === 0,
        issues,
        warnings
      };

    } catch (error) {
      issues.push({
        type: 'constraint',
        severity: 'error',
        code: 'VALIDATION_ERROR',
        message: `Validation failed: ${error.message}`
      });

      return {
        valid: false,
        issues,
        warnings
      };
    }
  }

  /**
   * Load current state of all affected blocks
   */
  private async loadState(transaction: Transaction): Promise<WorkspaceState> {
    const affectedBlocks = TransactionUtils.getAffectedBlocks(transaction);
    
    if (affectedBlocks.length === 0) {
      return {
        blocks: new Map(),
        block_content: new Map(),
        timestamp: Date.now()
      };
    }

    // Load blocks
    const blockQuery = `
      SELECT * FROM blocks
      WHERE id = ANY($1) AND archived = FALSE
    `;
    const blockResult = await this.pool.query(blockQuery, [affectedBlocks]);

    const blocks = new Map<string, Block>();
    for (const row of blockResult.rows) {
      blocks.set(row.id, this.mapRowToBlock(row));
    }

    // Load block_content relationships
    const contentQuery = `
      SELECT parent_block_id, child_block_id, position
      FROM block_content
      WHERE parent_block_id = ANY($1)
      ORDER BY parent_block_id, position
    `;
    const contentResult = await this.pool.query(contentQuery, [affectedBlocks]);

    const block_content = new Map<string, string[]>();
    for (const row of contentResult.rows) {
      if (!block_content.has(row.parent_block_id)) {
        block_content.set(row.parent_block_id, []);
      }
      block_content.get(row.parent_block_id)!.push(row.child_block_id);
    }

    return {
      blocks,
      block_content,
      timestamp: Date.now()
    };
  }

  /**
   * Apply operations to state (in memory, no database changes)
   */
  private async applyOperations(state: WorkspaceState, transaction: Transaction): Promise<WorkspaceState> {
    // Clone state
    const afterState: WorkspaceState = {
      blocks: new Map(state.blocks),
      block_content: new Map(state.block_content),
      timestamp: Date.now()
    };

    for (const op of transaction.operations) {
      switch (op.type) {
        case 'create_block':
          this.applyCreateBlock(afterState, op);
          break;
        case 'update_block':
          this.applyUpdateBlock(afterState, op);
          break;
        case 'delete_block':
          this.applyDeleteBlock(afterState, op);
          break;
        case 'move_block':
          this.applyMoveBlock(afterState, op);
          break;
        // Add other operation types as needed
      }
    }

    return afterState;
  }

  private applyCreateBlock(state: WorkspaceState, op: any): void {
    const block: Block = {
      id: op.block_id,
      workspace_id: op.workspace_id,
      type: op.block_type,
      properties: op.properties,
      parent_id: op.parent_id,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: op.user_id,
      last_edited_by: op.user_id,
      archived: false
    };

    state.blocks.set(block.id, block);

    // Add to parent's content
    if (op.parent_id) {
      if (!state.block_content.has(op.parent_id)) {
        state.block_content.set(op.parent_id, []);
      }
      const children = state.block_content.get(op.parent_id)!;
      const position = op.position !== undefined ? op.position : children.length;
      children.splice(position, 0, block.id);
    }
  }

  private applyUpdateBlock(state: WorkspaceState, op: any): void {
    const block = state.blocks.get(op.block_id);
    if (!block) return;

    if (op.path) {
      // Partial update using path
      this.setNestedValue(block, op.path, op.value);
    } else {
      // Full property update
      block.properties = { ...block.properties, ...op.value };
    }

    block.updated_at = new Date();
    block.last_edited_by = op.user_id;
  }

  private applyDeleteBlock(state: WorkspaceState, op: any): void {
    state.blocks.delete(op.block_id);

    // Remove from parent's content
    for (const [parentId, children] of Array.from(state.block_content.entries())) {
      const index = children.indexOf(op.block_id);
      if (index !== -1) {
        children.splice(index, 1);
      }
    }

    // If cascade, delete children
    if (op.cascade) {
      const children = state.block_content.get(op.block_id) || [];
      for (const childId of children) {
        this.applyDeleteBlock(state, { ...op, block_id: childId });
      }
    }

    state.block_content.delete(op.block_id);
  }

  private applyMoveBlock(state: WorkspaceState, op: any): void {
    const block = state.blocks.get(op.block_id);
    if (!block) return;

    // Remove from old parent
    if (op.old_parent_id) {
      const oldChildren = state.block_content.get(op.old_parent_id);
      if (oldChildren) {
        const index = oldChildren.indexOf(op.block_id);
        if (index !== -1) {
          oldChildren.splice(index, 1);
        }
      }
    }

    // Add to new parent
    if (op.new_parent_id) {
      if (!state.block_content.has(op.new_parent_id)) {
        state.block_content.set(op.new_parent_id, []);
      }
      const newChildren = state.block_content.get(op.new_parent_id)!;
      newChildren.splice(op.new_position, 0, op.block_id);
    }

    block.parent_id = op.new_parent_id;
    block.updated_at = new Date();
  }

  /**
   * Validate permissions (placeholder - implement as needed)
   */
  private async validatePermissions(
    before: WorkspaceState,
    after: WorkspaceState,
    transaction: Transaction
  ): Promise<{ issues: ValidationIssue[]; warnings: ValidationIssue[] }> {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // TODO: Implement permission checks
    // - Can user modify these blocks?
    // - Can user create in this workspace?
    // - Can user delete these blocks?

    return { issues, warnings };
  }

  /**
   * Validate data coherency
   */
  private validateCoherency(
    before: WorkspaceState,
    after: WorkspaceState
  ): { issues: ValidationIssue[]; warnings: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Check all blocks have required fields
    for (const [blockId, block] of Array.from(after.blocks.entries())) {
      if (!block.workspace_id) {
        issues.push({
          type: 'coherency',
          severity: 'error',
          code: 'MISSING_WORKSPACE_ID',
          message: `Block ${blockId} is missing workspace_id`,
          block_id: blockId
        });
      }

      if (!block.type) {
        issues.push({
          type: 'coherency',
          severity: 'error',
          code: 'MISSING_BLOCK_TYPE',
          message: `Block ${blockId} is missing type`,
          block_id: blockId
        });
      }
    }

    return { issues, warnings };
  }

  /**
   * Validate tree integrity
   */
  private validateTreeIntegrity(
    state: WorkspaceState
  ): { issues: ValidationIssue[]; warnings: ValidationIssue[] } {
    const blocks = Array.from(state.blocks.values());
    const treeResult = this.treeValidator.validate(blocks);

    const issues: ValidationIssue[] = treeResult.issues
      .filter(i => i.type === 'error')
      .map(i => ({
        type: 'tree_integrity',
        severity: 'error',
        code: i.code,
        message: i.message,
        block_id: i.block_id
      }));

    const warnings: ValidationIssue[] = treeResult.issues
      .filter(i => i.type === 'warning')
      .map(i => ({
        type: 'tree_integrity',
        severity: 'warning',
        code: i.code,
        message: i.message,
        block_id: i.block_id
      }));

    return { issues, warnings };
  }

  /**
   * Validate schemas (placeholder for integration with SchemaValidator)
   */
  private async validateSchemas(
    state: WorkspaceState
  ): Promise<{ issues: ValidationIssue[]; warnings: ValidationIssue[] }> {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // TODO: Integrate with existing SchemaValidator
    // Check database schemas, connection strings, etc.

    return { issues, warnings };
  }

  /**
   * Helper: Map database row to Block
   */
  private mapRowToBlock(row: any): Block {
    return {
      id: row.id,
      workspace_id: row.workspace_id,
      type: row.type,
      properties: row.properties,
      parent_id: row.parent_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      created_by: row.created_by,
      last_edited_by: row.last_edited_by,
      archived: row.archived
    };
  }

  /**
   * Helper: Set nested value using path
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }
}
