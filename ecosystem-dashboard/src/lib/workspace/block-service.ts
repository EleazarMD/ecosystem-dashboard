/**
 * Block Service
 * CRUD operations for workspace blocks
 */

import { query, transaction } from '../db/client';
import {
  Block,
  CreateBlockParams,
  UpdateBlockParams,
  BlockContent,
  BlockType,
  BlockProperties
} from '../../types/workspace';

export class BlockService {
  private async createBlockWithClient(params: CreateBlockParams, client: any): Promise<Block> {
    const {
      workspace_id,
      type,
      properties = {},
      parent_id = null,
      created_by,
      children = []
    } = params;

    const blockResult = await client.query(
      `INSERT INTO blocks (workspace_id, type, properties, parent_id, created_by, last_edited_by)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING *`,
      [workspace_id, type, JSON.stringify(properties), parent_id, created_by]
    );

    const block = this.mapRowToBlock(blockResult.rows[0]);

    if (children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childBlock = await this.createBlockWithClient({
          ...child,
          workspace_id,
          parent_id: block.id,
          created_by
        }, client);

        await client.query(
          `INSERT INTO block_content (parent_block_id, child_block_id, position)
           VALUES ($1, $2, $3)`,
          [block.id, childBlock.id, i]
        );
      }
    }

    return block;
  }

  async createBlockInTransaction(params: CreateBlockParams, client: any): Promise<Block> {
    return this.createBlockWithClient(params, client);
  }
  /**
   * Create a new block
   */
  async createBlock(params: CreateBlockParams): Promise<Block> {
    return transaction(async (client) => {
      return this.createBlockWithClient(params, client);
    });
  }

  /**
   * Get block by ID
   */
  async getBlock(blockId: string, includeChildren = false): Promise<Block | null> {
    const result = await query(
      'SELECT * FROM blocks WHERE id = $1 AND archived = FALSE',
      [blockId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const block = this.mapRowToBlock(result.rows[0]);

    if (block.type === 'database_inline') {
      // First get the database record to get its ID
      const dbRecord = await query(
        'SELECT id FROM databases WHERE block_id = $1',
        [blockId]
      );

      if (dbRecord.rows.length > 0) {
        const databaseId = dbRecord.rows[0].id;

        // Then fetch properties using database_id
        const dbResult = await query(
          'SELECT * FROM database_properties WHERE database_id = $1 ORDER BY position ASC',
          [databaseId]
        );

        if (dbResult.rows.length > 0) {
          // Construct schema object from rows
          const schema: Record<string, any> = {};
          dbResult.rows.forEach((row: any) => {
            schema[row.name] = {
              type: row.type,
              config: row.config,
              id: row.id,
              name: row.name
            };
          });

          // Inject into block properties
          block.properties = {
            ...block.properties,
            database_schema: schema
          };
        }
      }
    }

    if (includeChildren) {
      block.children = await this.getBlockChildren(blockId);
    }

    return block;
  }

  /**
   * Get block children in order
   * Supports both junction table (block_content) and direct parent_id relationships
   */
  async getBlockChildren(parentId: string): Promise<Block[]> {
    // First try junction table (for blocks created via old editor)
    const junctionResult = await query(
      `SELECT b.* FROM blocks b
       JOIN block_content bc ON b.id = bc.child_block_id
       WHERE bc.parent_block_id = $1 AND b.archived = FALSE
       ORDER BY bc.position ASC`,
      [parentId]
    );

    if (junctionResult.rows.length > 0) {
      return junctionResult.rows.map(row => this.mapRowToBlock(row));
    }

    // Fall back to direct parent_id (for blocks created via MCP/API)
    const directResult = await query(
      `SELECT * FROM blocks
       WHERE parent_id = $1 AND archived = FALSE
       ORDER BY created_at ASC`,
      [parentId]
    );

    return directResult.rows.map(row => this.mapRowToBlock(row));
  }

  /**
   * Get all blocks in workspace
   */
  async getWorkspaceBlocks(workspaceId: string, type?: BlockType): Promise<Block[]> {
    const queryText = type
      ? 'SELECT * FROM blocks WHERE workspace_id = $1 AND type = $2 AND archived = FALSE ORDER BY created_at DESC'
      : 'SELECT * FROM blocks WHERE workspace_id = $1 AND archived = FALSE ORDER BY created_at DESC';

    const params = type ? [workspaceId, type] : [workspaceId];
    const result = await query(queryText, params);

    return result.rows.map(row => this.mapRowToBlock(row));
  }

  /**
   * Update block
   */
  async updateBlock(
    blockId: string,
    updates: UpdateBlockParams
  ): Promise<Block> {
    const { type, properties, style, layout, last_edited_by } = updates;

    const setClauses: string[] = ['updated_at = NOW()', 'last_edited_by = $2'];
    const values: any[] = [blockId, last_edited_by];
    let paramIndex = 3;

    if (type) {
      setClauses.push(`type = $${paramIndex}`);
      values.push(type);
      paramIndex++;
    }

    if (properties) {
      setClauses.push(`properties = $${paramIndex}`);
      values.push(JSON.stringify(properties));
      paramIndex++;
    }

    // 🎨 Design support
    if (style !== undefined) {
      setClauses.push(`style = $${paramIndex}`);
      values.push(JSON.stringify(style));
      paramIndex++;
    }

    if (layout !== undefined) {
      setClauses.push(`layout = $${paramIndex}`);
      values.push(JSON.stringify(layout));
      paramIndex++;
    }

    const result = await query(
      `UPDATE blocks SET ${setClauses.join(', ')}
       WHERE id = $1
       RETURNING *`,
      values
    );

    return this.mapRowToBlock(result.rows[0]);
  }

  /**
   * Delete block (archive)
   */
  async deleteBlock(blockId: string): Promise<void> {
    await query(
      'UPDATE blocks SET archived = TRUE, updated_at = NOW() WHERE id = $1',
      [blockId]
    );
  }

  /**
   * Move block to new parent
   */
  async moveBlock(blockId: string, newParentId: string, position: number): Promise<void> {
    await transaction(async (client) => {
      // Delete old content relationship
      await client.query(
        'DELETE FROM block_content WHERE child_block_id = $1',
        [blockId]
      );

      // Shift positions of siblings
      await client.query(
        `UPDATE block_content 
         SET position = position + 1 
         WHERE parent_block_id = $1 AND position >= $2`,
        [newParentId, position]
      );

      // Create new relationship
      await client.query(
        `INSERT INTO block_content (parent_block_id, child_block_id, position)
         VALUES ($1, $2, $3)`,
        [newParentId, blockId, position]
      );

      // Update parent_id
      await client.query(
        'UPDATE blocks SET parent_id = $1, updated_at = NOW() WHERE id = $2',
        [newParentId, blockId]
      );
    });
  }

  /**
   * Transform block to different type
   */
  async transformBlock(
    blockId: string,
    newType: BlockType,
    userId: string
  ): Promise<Block> {
    // Notion preserves properties when transforming, just changes rendering
    return this.updateBlock(blockId, {
      type: newType,
      last_edited_by: userId
    });
  }

  /**
   * Append children to block
   */
  async appendChildren(
    parentId: string,
    children: CreateBlockParams[],
    workspaceId: string,
    userId: string
  ): Promise<Block[]> {
    const existingChildren = await query(
      'SELECT MAX(position) as max_pos FROM block_content WHERE parent_block_id = $1',
      [parentId]
    );

    const startPosition = (existingChildren.rows[0]?.max_pos || -1) + 1;
    const createdBlocks: Block[] = [];

    return transaction(async (client) => {
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childBlock = await this.createBlockWithClient({
          ...child,
          workspace_id: workspaceId,
          parent_id: parentId,
          created_by: userId
        }, client);

        await client.query(
          `INSERT INTO block_content (parent_block_id, child_block_id, position)
           VALUES ($1, $2, $3)`,
          [parentId, childBlock.id, startPosition + i]
        );

        createdBlocks.push(childBlock);
      }

      return createdBlocks;
    });
  }

  /**
   * Search blocks by content
   */
  async searchBlocks(
    workspaceId: string,
    searchTerm: string,
    limit = 50
  ): Promise<Block[]> {
    const result = await query(
      `SELECT * FROM blocks
       WHERE workspace_id = $1 
       AND archived = FALSE
       AND (
         properties->>'title' ILIKE $2
         OR properties::text ILIKE $2
       )
       ORDER BY updated_at DESC
       LIMIT $3`,
      [workspaceId, `%${searchTerm}%`, limit]
    );

    return result.rows.map(row => this.mapRowToBlock(row));
  }

  /**
   * Map database row to Block object
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
}

export const blockService = new BlockService();
