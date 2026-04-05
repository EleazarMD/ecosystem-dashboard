/**
 * Transaction Executor
 * Executes validated transactions and commits to database
 * Handles rollback on failure
 */

import { Pool, PoolClient } from 'pg';
import { Transaction, TransactionResult, TransactionUtils } from './Transaction';
import { TransactionValidator } from './TransactionValidator';
import { Operation } from './Operation';

export class TransactionExecutor {
  private pool: Pool;
  private validator: TransactionValidator;

  constructor(pool: Pool) {
    this.pool = pool;
    this.validator = new TransactionValidator(pool);
  }

  /**
   * Execute transaction with validation
   */
  async execute(transaction: Transaction): Promise<TransactionResult> {
    const startTime = Date.now();
    const affectedBlocks = TransactionUtils.getAffectedBlocks(transaction);

    try {
      // Step 1: Validate transaction
      transaction.status = 'validating';
      const validation = await this.validator.validate(transaction);

      if (!validation.valid) {
        transaction.status = 'failed';
        transaction.error = validation.issues.map(i => i.message).join('; ');

        return {
          success: false,
          transaction_id: transaction.id,
          affected_blocks: affectedBlocks,
          error: transaction.error,
          duration_ms: Date.now() - startTime
        };
      }

      // Step 2: Execute operations in database transaction
      transaction.status = 'committing';
      await this.commit(transaction);

      transaction.status = 'committed';
      transaction.committed_at = Date.now();

      return {
        success: true,
        transaction_id: transaction.id,
        affected_blocks: affectedBlocks,
        duration_ms: Date.now() - startTime
      };

    } catch (error) {
      transaction.status = 'failed';
      transaction.error = error.message;

      return {
        success: false,
        transaction_id: transaction.id,
        affected_blocks: affectedBlocks,
        error: error.message,
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Commit transaction to database
   */
  private async commit(transaction: Transaction): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const op of transaction.operations) {
        await this.executeOperation(client, op);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute single operation
   */
  private async executeOperation(client: PoolClient, operation: Operation): Promise<void> {
    switch (operation.type) {
      case 'create_block':
        await this.executeCreateBlock(client, operation);
        break;
      case 'update_block':
        await this.executeUpdateBlock(client, operation);
        break;
      case 'delete_block':
        await this.executeDeleteBlock(client, operation);
        break;
      case 'move_block':
        await this.executeMoveBlock(client, operation);
        break;
      case 'create_database':
        await this.executeCreateDatabase(client, operation);
        break;
      case 'update_database':
        await this.executeUpdateDatabase(client, operation);
        break;
      case 'create_database_page':
        await this.executeCreateDatabasePage(client, operation);
        break;
      case 'update_database_page':
        await this.executeUpdateDatabasePage(client, operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`);
    }
  }

  private async executeCreateBlock(client: PoolClient, op: any): Promise<void> {
    // Create block
    await client.query(
      `INSERT INTO blocks (id, workspace_id, type, properties, parent_id, created_by, last_edited_by)
       VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [op.block_id, op.workspace_id, op.block_type, JSON.stringify(op.properties), op.parent_id, op.user_id]
    );

    // Add to parent's content if has parent
    if (op.parent_id) {
      const position = op.position !== undefined ? op.position : 999999;
      await client.query(
        `INSERT INTO block_content (parent_block_id, child_block_id, position)
         VALUES ($1, $2, $3)`,
        [op.parent_id, op.block_id, position]
      );
    }
  }

  private async executeUpdateBlock(client: PoolClient, op: any): Promise<void> {
    if (op.path) {
      // Partial update using JSONB path
      await client.query(
        `UPDATE blocks 
         SET properties = jsonb_set(properties, $1, $2),
             updated_at = NOW(),
             last_edited_by = $3
         WHERE id = $4`,
        ['{' + op.path.replace(/\./g, ',') + '}', JSON.stringify(op.value), op.user_id, op.block_id]
      );
    } else {
      // Full property update
      await client.query(
        `UPDATE blocks 
         SET properties = properties || $1,
             updated_at = NOW(),
             last_edited_by = $2
         WHERE id = $3`,
        [JSON.stringify(op.value), op.user_id, op.block_id]
      );
    }
  }

  private async executeDeleteBlock(client: PoolClient, op: any): Promise<void> {
    if (op.cascade) {
      // Delete with CASCADE (foreign keys handle this)
      await client.query(
        'DELETE FROM blocks WHERE id = $1',
        [op.block_id]
      );
    } else {
      // Soft delete (archive)
      await client.query(
        'UPDATE blocks SET archived = TRUE, updated_at = NOW() WHERE id = $1',
        [op.block_id]
      );
    }
  }

  private async executeMoveBlock(client: PoolClient, op: any): Promise<void> {
    // Remove from old parent
    if (op.old_parent_id) {
      await client.query(
        'DELETE FROM block_content WHERE parent_block_id = $1 AND child_block_id = $2',
        [op.old_parent_id, op.block_id]
      );
    }

    // Add to new parent
    if (op.new_parent_id) {
      await client.query(
        `INSERT INTO block_content (parent_block_id, child_block_id, position)
         VALUES ($1, $2, $3)`,
        [op.new_parent_id, op.block_id, op.new_position]
      );
    }

    // Update block's parent_id
    await client.query(
      'UPDATE blocks SET parent_id = $1, updated_at = NOW() WHERE id = $2',
      [op.new_parent_id, op.block_id]
    );
  }

  private async executeCreateDatabase(client: PoolClient, op: any): Promise<void> {
    // First create the block
    await this.executeCreateBlock(client, {
      block_id: op.block_id,
      workspace_id: op.workspace_id,
      block_type: op.inline ? 'database_inline' : 'database_full_page',
      properties: { title: [{ type: 'text', text: { content: op.title } }] },
      parent_id: null,
      user_id: op.user_id
    });

    // Then create database metadata
    await client.query(
      `INSERT INTO databases (id, block_id, title, schema, views)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        op.database_id,
        op.block_id,
        JSON.stringify([{ type: 'text', text: { content: op.title } }]),
        JSON.stringify(op.schema),
        JSON.stringify([{ id: 'default-table', type: 'table', name: 'Table', properties: [] }])
      ]
    );

    // Create properties
    for (let i = 0; i < op.schema.length; i++) {
      const prop = op.schema[i];
      await client.query(
        `INSERT INTO database_properties (database_id, name, type, config, position)
         VALUES ($1, $2, $3, $4, $5)`,
        [op.database_id, prop.name, prop.type, JSON.stringify(prop.config || {}), i]
      );
    }
  }

  private async executeUpdateDatabase(client: PoolClient, op: any): Promise<void> {
    if (op.path) {
      // Partial update
      await client.query(
        `UPDATE databases 
         SET schema = jsonb_set(schema, $1, $2),
             updated_at = NOW()
         WHERE id = $3`,
        ['{' + op.path.replace(/\./g, ',') + '}', JSON.stringify(op.value), op.database_id]
      );
    } else {
      // Full update
      await client.query(
        `UPDATE databases 
         SET schema = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(op.value), op.database_id]
      );
    }
  }

  private async executeCreateDatabasePage(client: PoolClient, op: any): Promise<void> {
    // Create page block
    await this.executeCreateBlock(client, {
      block_id: op.page_id,
      workspace_id: op.workspace_id,
      block_type: 'page',
      properties: op.properties,
      parent_id: op.database_id,  // Parent is the database block
      user_id: op.user_id
    });

    // Create property values
    for (const [propertyId, value] of Object.entries(op.properties)) {
      await client.query(
        `INSERT INTO database_property_values (page_block_id, property_id, value)
         VALUES ($1, $2, $3)`,
        [op.page_id, propertyId, JSON.stringify(value)]
      );
    }
  }

  private async executeUpdateDatabasePage(client: PoolClient, op: any): Promise<void> {
    await client.query(
      `INSERT INTO database_property_values (page_block_id, property_id, value)
       VALUES ($1, $2, $3)
       ON CONFLICT (page_block_id, property_id)
       DO UPDATE SET value = $3, updated_at = NOW()`,
      [op.page_id, op.property_id, JSON.stringify(op.value)]
    );
  }

  /**
   * Execute without validation (use with caution!)
   */
  async executeUnsafe(transaction: Transaction): Promise<TransactionResult> {
    const startTime = Date.now();
    const affectedBlocks = TransactionUtils.getAffectedBlocks(transaction);

    try {
      await this.commit(transaction);
      transaction.status = 'committed';
      transaction.committed_at = Date.now();

      return {
        success: true,
        transaction_id: transaction.id,
        affected_blocks: affectedBlocks,
        duration_ms: Date.now() - startTime
      };
    } catch (error) {
      transaction.status = 'failed';
      transaction.error = error.message;

      return {
        success: false,
        transaction_id: transaction.id,
        affected_blocks: affectedBlocks,
        error: error.message,
        duration_ms: Date.now() - startTime
      };
    }
  }
}
