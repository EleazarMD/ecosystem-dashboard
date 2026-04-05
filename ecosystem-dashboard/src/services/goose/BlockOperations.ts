/**
 * Block Operations Service
 * Handles executing block operations on behalf of Goose
 */

import { BlockModel, Block } from '@/lib/editor/BlockModel';

export interface BlockOperation {
  type: 'insert' | 'update' | 'delete' | 'move';
  blockId?: string;
  afterBlockId?: string;
  blockType?: string;
  content?: string;
  targetPosition?: number;
  parentId?: string | null;
}

export interface BlockOperationResult {
  success: boolean;
  blockId?: string;
  error?: string;
}

export class BlockOperationsService {
  private blockModel: BlockModel | null = null;

  /**
   * Set the BlockModel instance to operate on
   */
  setBlockModel(blockModel: BlockModel) {
    this.blockModel = blockModel;
    console.log('[BlockOperations] BlockModel set');
  }

  /**
   * Execute a single block operation
   */
  executeOperation(operation: BlockOperation): BlockOperationResult {
    if (!this.blockModel) {
      return {
        success: false,
        error: 'BlockModel not initialized',
      };
    }

    console.log('[BlockOperations] Executing:', operation);

    try {
      switch (operation.type) {
        case 'insert':
          return this.insertBlock(operation);

        case 'update':
          return this.updateBlock(operation);

        case 'delete':
          return this.deleteBlock(operation);

        case 'move':
          return this.moveBlock(operation);

        default:
          return {
            success: false,
            error: `Unknown operation type: ${operation.type}`,
          };
      }
    } catch (error) {
      console.error('[BlockOperations] Error executing operation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute multiple block operations in sequence
   */
  executeOperations(operations: BlockOperation[]): BlockOperationResult[] {
    return operations.map(op => this.executeOperation(op));
  }

  /**
   * Insert a new block after a specified block
   */
  private insertBlock(operation: BlockOperation): BlockOperationResult {
    if (!this.blockModel) {
      return { success: false, error: 'BlockModel not initialized' };
    }

    const { afterBlockId, blockType, content } = operation;

    if (!afterBlockId || !blockType) {
      return { success: false, error: 'Missing afterBlockId or blockType' };
    }

    // Insert the block
    const newBlock = this.blockModel.insertBlockAfter(
      afterBlockId,
      blockType as any
    );

    if (!newBlock) {
      return { success: false, error: 'Failed to insert block' };
    }

    // Update content if provided
    if (content) {
      this.blockModel.updateContent(newBlock.id, [{ text: content }]);
    }

    console.log('[BlockOperations] ✅ Inserted block:', newBlock.id);

    return {
      success: true,
      blockId: newBlock.id,
    };
  }

  /**
   * Update an existing block's content
   */
  private updateBlock(operation: BlockOperation): BlockOperationResult {
    if (!this.blockModel) {
      return { success: false, error: 'BlockModel not initialized' };
    }

    const { blockId, content } = operation;

    if (!blockId) {
      return { success: false, error: 'Missing blockId' };
    }

    const block = this.blockModel.getBlock(blockId);
    if (!block) {
      return { success: false, error: `Block ${blockId} not found` };
    }

    // Update the block
    this.blockModel.updateContent(
      blockId,
      content ? [{ text: content }] : block.content
    );

    console.log('[BlockOperations] ✅ Updated block:', blockId);

    return {
      success: true,
      blockId,
    };
  }

  /**
   * Delete a block
   */
  private deleteBlock(operation: BlockOperation): BlockOperationResult {
    if (!this.blockModel) {
      return { success: false, error: 'BlockModel not initialized' };
    }

    const { blockId } = operation;

    if (!blockId) {
      return { success: false, error: 'Missing blockId' };
    }

    const success = this.blockModel.deleteBlock(blockId);

    if (!success) {
      return { success: false, error: `Failed to delete block ${blockId}` };
    }

    console.log('[BlockOperations] ✅ Deleted block:', blockId);

    return {
      success: true,
      blockId,
    };
  }

  /**
   * Move a block to a new position
   */
  private moveBlock(operation: BlockOperation): BlockOperationResult {
    if (!this.blockModel) {
      return { success: false, error: 'BlockModel not initialized' };
    }

    const { blockId, parentId, targetPosition } = operation;

    if (!blockId || targetPosition === undefined) {
      return { success: false, error: 'Missing blockId or targetPosition' };
    }

    const success = this.blockModel.moveBlock(
      blockId,
      parentId !== undefined ? parentId : null,
      targetPosition
    );

    if (!success) {
      return { success: false, error: `Failed to move block ${blockId}` };
    }

    console.log('[BlockOperations] ✅ Moved block:', blockId);

    return {
      success: true,
      blockId,
    };
  }

  /**
   * Update the title of a page
   */
  updatePageTitle(pageId: string, newTitle: string): boolean {
    if (!this.blockModel) {
      console.error('[BlockOperations] BlockModel not initialized');
      return false;
    }

    console.log('📝 [BlockOperations] Updating page title:', { pageId, newTitle });

    const titleProperty = [{
      text: newTitle
    }];

    const success = this.blockModel.updateProperties(pageId, {
      title: titleProperty
    });

    if (success) {
      console.log('✅ [BlockOperations] Page title updated successfully');
    } else {
      console.error('❌ [BlockOperations] Failed to update page title');
    }

    return success;
  }

  /**
   * Get all blocks for context
   */
  getAllBlocks(): Block[] {
    if (!this.blockModel) {
      return [];
    }
    return this.blockModel.getAllBlocks();
  }

  /**
   * Get a specific block
   */
  getBlock(blockId: string): Block | undefined {
    if (!this.blockModel) {
      return undefined;
    }
    return this.blockModel.getBlock(blockId);
  }
}

// Singleton instance
export const blockOperations = new BlockOperationsService();

export default BlockOperationsService;
