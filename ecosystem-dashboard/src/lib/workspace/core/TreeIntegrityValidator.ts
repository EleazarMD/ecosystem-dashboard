/**
 * Tree Integrity Validator
 * Ensures workspace content tree remains coherent
 * Based on Notion's tree validation logic
 */

import { Block } from '../../../types/workspace';

export interface ValidationIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  block_id?: string;
  parent_id?: string;
}

export interface TreeValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export class TreeIntegrityValidator {
  /**
   * Validate entire tree structure
   */
  validate(blocks: Block[]): TreeValidationResult {
    const issues: ValidationIssue[] = [];

    // Check 1: Orphaned blocks (parent doesn't exist)
    issues.push(...this.checkOrphans(blocks));

    // Check 2: Circular references
    issues.push(...this.checkCycles(blocks));

    // Check 3: Bidirectional references (parent knows child, child knows parent)
    issues.push(...this.checkBidirectional(blocks));

    // Check 4: Duplicate children
    issues.push(...this.checkDuplicateChildren(blocks));

    // Check 5: Root blocks have no parent
    issues.push(...this.checkRootBlocks(blocks));

    const errors = issues.filter(i => i.type === 'error');

    return {
      valid: errors.length === 0,
      issues
    };
  }

  /**
   * Check for orphaned blocks (parent_id points to non-existent block)
   */
  private checkOrphans(blocks: Block[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const blockIds = new Set(blocks.map(b => b.id));

    for (const block of blocks) {
      if (block.parent_id && !blockIds.has(block.parent_id)) {
        // Exception: Root pages can have null parent
        if (block.type !== 'page' || block.parent_id !== null) {
          issues.push({
            type: 'error',
            code: 'ORPHANED_BLOCK',
            message: `Block ${block.id} has parent ${block.parent_id} which doesn't exist`,
            block_id: block.id,
            parent_id: block.parent_id
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check for circular references
   */
  private checkCycles(blocks: Block[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const blockMap = new Map(blocks.map(b => [b.id, b]));

    for (const block of blocks) {
      const visited = new Set<string>();
      let current: Block | undefined = block;

      while (current && current.parent_id) {
        if (visited.has(current.id)) {
          issues.push({
            type: 'error',
            code: 'CIRCULAR_REFERENCE',
            message: `Circular reference detected starting at block ${block.id}`,
            block_id: block.id
          });
          break;
        }

        visited.add(current.id);
        current = blockMap.get(current.parent_id);

        // Prevent infinite loop
        if (visited.size > 1000) {
          issues.push({
            type: 'error',
            code: 'EXCESSIVE_DEPTH',
            message: `Block ${block.id} has excessive parent chain depth (>1000)`,
            block_id: block.id
          });
          break;
        }
      }
    }

    return issues;
  }

  /**
   * Check bidirectional parent-child relationships
   * (This would require block_content data in practice)
   */
  private checkBidirectional(blocks: Block[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Note: In full implementation, we'd check against block_content table
    // to ensure parent's content array includes this child
    
    // For now, just check that children reference existing parents
    const parentIds = new Set(blocks.map(b => b.id));
    
    for (const block of blocks) {
      if (block.parent_id && !parentIds.has(block.parent_id)) {
        issues.push({
          type: 'warning',
          code: 'MISSING_PARENT_REFERENCE',
          message: `Block ${block.id} references parent ${block.parent_id} which may not exist`,
          block_id: block.id,
          parent_id: block.parent_id
        });
      }
    }

    return issues;
  }

  /**
   * Check for duplicate children in parent
   */
  private checkDuplicateChildren(blocks: Block[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const childrenByParent = new Map<string, Set<string>>();

    for (const block of blocks) {
      if (block.parent_id) {
        if (!childrenByParent.has(block.parent_id)) {
          childrenByParent.set(block.parent_id, new Set());
        }

        const children = childrenByParent.get(block.parent_id)!;
        
        if (children.has(block.id)) {
          issues.push({
            type: 'error',
            code: 'DUPLICATE_CHILD',
            message: `Block ${block.id} is listed multiple times as child of ${block.parent_id}`,
            block_id: block.id,
            parent_id: block.parent_id
          });
        }

        children.add(block.id);
      }
    }

    return issues;
  }

  /**
   * Check root blocks (pages) have no parent or null parent
   */
  private checkRootBlocks(blocks: Block[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const block of blocks) {
      // Root pages should have null parent
      if (block.type === 'page' && block.parent_id === null) {
        // This is correct - root page
        continue;
      }

      // Non-root blocks should have parent
      if (block.type !== 'page' && !block.parent_id) {
        issues.push({
          type: 'warning',
          code: 'MISSING_PARENT',
          message: `Non-page block ${block.id} has no parent`,
          block_id: block.id
        });
      }
    }

    return issues;
  }

  /**
   * Validate specific parent-child relationship
   */
  validateRelationship(child: Block, parent: Block | null): TreeValidationResult {
    const issues: ValidationIssue[] = [];

    // Check 1: If child has parent_id, parent must exist
    if (child.parent_id && !parent) {
      issues.push({
        type: 'error',
        code: 'MISSING_PARENT',
        message: `Child block ${child.id} references parent ${child.parent_id} which doesn't exist`,
        block_id: child.id,
        parent_id: child.parent_id
      });
    }

    // Check 2: Parent ID must match
    if (parent && child.parent_id !== parent.id) {
      issues.push({
        type: 'error',
        code: 'PARENT_MISMATCH',
        message: `Child block ${child.id} parent_id (${child.parent_id}) doesn't match parent block ID (${parent.id})`,
        block_id: child.id,
        parent_id: parent.id
      });
    }

    // Check 3: Can't be child of itself
    if (child.id === child.parent_id) {
      issues.push({
        type: 'error',
        code: 'SELF_REFERENCE',
        message: `Block ${child.id} cannot be its own parent`,
        block_id: child.id
      });
    }

    // Check 4: Workspace must match
    if (parent && child.workspace_id !== parent.workspace_id) {
      issues.push({
        type: 'error',
        code: 'WORKSPACE_MISMATCH',
        message: `Child block ${child.id} workspace (${child.workspace_id}) doesn't match parent workspace (${parent.workspace_id})`,
        block_id: child.id,
        parent_id: parent.id
      });
    }

    return {
      valid: issues.filter(i => i.type === 'error').length === 0,
      issues
    };
  }

  /**
   * Check if moving a block would create a cycle
   */
  canMove(blockId: string, newParentId: string, blocks: Block[]): TreeValidationResult {
    const issues: ValidationIssue[] = [];
    const blockMap = new Map(blocks.map(b => [b.id, b]));

    // Check 1: Can't move to self
    if (blockId === newParentId) {
      issues.push({
        type: 'error',
        code: 'MOVE_TO_SELF',
        message: `Cannot move block ${blockId} to itself`,
        block_id: blockId
      });
      return { valid: false, issues };
    }

    // Check 2: New parent must exist
    const newParent = blockMap.get(newParentId);
    if (!newParent) {
      issues.push({
        type: 'error',
        code: 'PARENT_NOT_FOUND',
        message: `Target parent ${newParentId} doesn't exist`,
        parent_id: newParentId
      });
      return { valid: false, issues };
    }

    // Check 3: Can't move to own descendant (would create cycle)
    let current: Block | undefined = newParent;
    const visited = new Set<string>();

    while (current) {
      if (current.id === blockId) {
        issues.push({
          type: 'error',
          code: 'MOVE_TO_DESCENDANT',
          message: `Cannot move block ${blockId} to its own descendant ${newParentId}`,
          block_id: blockId,
          parent_id: newParentId
        });
        return { valid: false, issues };
      }

      if (visited.has(current.id)) break;
      visited.add(current.id);

      current = current.parent_id ? blockMap.get(current.parent_id) : undefined;
    }

    return { valid: true, issues };
  }

  /**
   * Get tree depth for a block
   */
  getDepth(blockId: string, blocks: Block[]): number {
    const blockMap = new Map(blocks.map(b => [b.id, b]));
    let depth = 0;
    let current = blockMap.get(blockId);

    while (current && current.parent_id) {
      depth++;
      current = blockMap.get(current.parent_id);
      
      if (depth > 1000) {
        throw new Error(`Excessive depth detected for block ${blockId}`);
      }
    }

    return depth;
  }

  /**
   * Get all descendants of a block
   */
  getDescendants(blockId: string, blocks: Block[]): string[] {
    const descendants: string[] = [];
    const children = blocks.filter(b => b.parent_id === blockId);

    for (const child of children) {
      descendants.push(child.id);
      descendants.push(...this.getDescendants(child.id, blocks));
    }

    return descendants;
  }
}
