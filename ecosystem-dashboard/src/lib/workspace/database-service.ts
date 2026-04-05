/**
 * Database Service
 * Manages database creation, schema, and page operations
 */

import { query, transaction } from '../db/client';
import {
  Database,
  DatabaseProperty,
  DatabasePropertyValue,
  CreateDatabaseParams,
  Block,
  DatabaseView,
  PropertyType
} from '../../types/workspace';
import { blockService } from './block-service';

export class DatabaseService {
  /**
   * Create a new database
   */
  async createDatabase(params: CreateDatabaseParams): Promise<Database> {
    const {
      workspace_id,
      parent_id,
      title,
      inline,
      schema,
      initial_pages = [],
      created_by
    } = params;

    return transaction(async (client) => {
      console.log('[DB Service] Creating database block...');
      // Create database block
      const blockType = inline ? 'database_inline' : 'database_full_page';
      const block = await blockService.createBlock({
        workspace_id,
        type: blockType,
        properties: { title: [{ type: 'text', text: { content: title } }] },
        parent_id,
        created_by
      });
      console.log('[DB Service] Block created:', block.id);

      // Create database metadata
      const dbResult = await client.query(
        `INSERT INTO databases (block_id, title, schema, views)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          block.id,
          JSON.stringify([{ type: 'text', text: { content: title } }]),
          JSON.stringify([]),
          JSON.stringify([
            {
              id: 'default-table',
              type: 'table',
              name: 'Table',
              properties: []
            }
          ])
        ]
      );
      console.log('[DB Service] Database record created:', dbResult.rows[0].id);

      const database = this.mapRowToDatabase(dbResult.rows[0]);

      // Create properties
      console.log('[DB Service] Creating properties:', schema.length);
      for (let i = 0; i < schema.length; i++) {
        const prop = schema[i];
        await client.query(
          `INSERT INTO database_properties (database_id, name, type, config, position)
           VALUES ($1, $2, $3, $4, $5)`,
          [database.id, prop.name, prop.type, JSON.stringify(prop.config || {}), i]
        );
      }

      // Reload database with properties
      console.log('[DB Service] Reloading database...');
      const fullDatabase = await this.getDatabase(database.id, client);
      console.log('[DB Service] Full database loaded:', fullDatabase ? 'yes' : 'no');

      // Create initial pages if provided
      if (initial_pages.length > 0) {
        for (const pageData of initial_pages) {
          await this.createDatabasePage(
            database.id,
            pageData.title,
            pageData.properties,
            created_by
          );
        }
      }

      return fullDatabase!;
    });
  }

  /**
   * Get database by ID
   */
  async getDatabase(databaseId: string, client?: any): Promise<Database | null> {
    const queryExecutor = client || { query };

    // If using client directly, we need to call client.query
    // If using our query helper, we call it directly
    // But our query helper signature is query(text, params)
    // client.query signature is client.query(text, params)
    // So we can normalize this.

    const runQuery = async (text: string, params: any[]) => {
      if (client) return client.query(text, params);
      return query(text, params);
    };

    const result = await runQuery(
      'SELECT * FROM databases WHERE id = $1',
      [databaseId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const database = this.mapRowToDatabase(result.rows[0]);

    // Load properties
    const propsResult = await runQuery(
      `SELECT * FROM database_properties
       WHERE database_id = $1
       ORDER BY position ASC`,
      [databaseId]
    );

    database.schema = propsResult.rows.map(row => this.mapRowToProperty(row));

    return database;
  }

  /**
   * Get database by block ID
   */
  async getDatabaseByBlockId(blockId: string): Promise<Database | null> {
    const result = await query(
      'SELECT * FROM databases WHERE block_id = $1',
      [blockId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.getDatabase(result.rows[0].id);
  }

  /**
   * Get all pages in a database
   */
  async getDatabasePages(databaseId: string): Promise<Block[]> {
    // Get database block
    const database = await this.getDatabase(databaseId);
    if (!database) {
      return [];
    }

    // Get all blocks that are children of this database
    const result = await query(
      `SELECT b.* FROM blocks b
       WHERE b.parent_id = $1
       AND b.type = 'page'
       AND b.archived = FALSE
       ORDER BY b.created_at DESC`,
      [database.block_id]
    );

    return result.rows.map(row => ({
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
    }));
  }

  /**
   * Create a page in a database
   */
  async createDatabasePage(
    databaseId: string,
    title: string,
    properties: Record<string, any>,
    userId: string
  ): Promise<Block> {
    return transaction(async (client) => {
      const database = await this.getDatabase(databaseId, client);
      if (!database) {
        throw new Error('Database not found');
      }

      // Create page block
      const page = await blockService.createBlock({
        workspace_id: database.block_id, // Get workspace from database block
        type: 'page',
        properties: {
          title: [{ type: 'text', text: { content: title } }]
        },
        parent_id: database.block_id,
        created_by: userId
      });

      // Create property values
      for (const prop of database.schema) {
        const value = properties[prop.name];
        if (value !== undefined) {
          await client.query(
            `INSERT INTO database_property_values (page_block_id, property_id, value)
             VALUES ($1, $2, $3)`,
            [page.id, prop.id, JSON.stringify(value)]
          );
        }
      }

      return page;
    });
  }

  /**
   * Get property values for a page
   */
  async getPagePropertyValues(pageId: string): Promise<Record<string, any>> {
    const result = await query(
      `SELECT dpv.*, dp.name, dp.type
       FROM database_property_values dpv
       JOIN database_properties dp ON dpv.property_id = dp.id
       WHERE dpv.page_block_id = $1`,
      [pageId]
    );

    const values: Record<string, any> = {};
    for (const row of result.rows) {
      values[row.name] = row.value;
    }

    return values;
  }

  /**
   * Update property value for a page
   */
  async updatePropertyValue(
    pageId: string,
    propertyId: string,
    value: any
  ): Promise<void> {
    await query(
      `INSERT INTO database_property_values (page_block_id, property_id, value, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (page_block_id, property_id)
       DO UPDATE SET value = $3, updated_at = NOW()`,
      [pageId, propertyId, JSON.stringify(value)]
    );
  }

  /**
   * Add property to database schema
   */
  async addProperty(
    databaseId: string,
    name: string,
    type: PropertyType,
    config: Record<string, any> = {}
  ): Promise<DatabaseProperty> {
    return transaction(async (client) => {
      // Get current max position
      const posResult = await client.query(
        'SELECT MAX(position) as max_pos FROM database_properties WHERE database_id = $1',
        [databaseId]
      );

      const position = (posResult.rows[0]?.max_pos || -1) + 1;

      const result = await client.query(
        `INSERT INTO database_properties (database_id, name, type, config, position)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [databaseId, name, type, JSON.stringify(config), position]
      );

      return this.mapRowToProperty(result.rows[0]);
    });
  }

  /**
   * Add view to database
   */
  async addView(
    databaseId: string,
    viewType: DatabaseView['type'],
    viewName: string
  ): Promise<Database> {
    const database = await this.getDatabase(databaseId);
    if (!database) {
      throw new Error('Database not found');
    }

    const newView: DatabaseView = {
      id: `view-${Date.now()}`,
      type: viewType,
      name: viewName,
      properties: []
    };

    const updatedViews = [...database.views, newView];

    await query(
      'UPDATE databases SET views = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(updatedViews), databaseId]
    );

    return (await this.getDatabase(databaseId))!;
  }

  /**
   * Map database row to Database object
   */
  private mapRowToDatabase(row: any): Database {
    return {
      id: row.id,
      workspace_id: row.workspace_id || '', // Fix lint error
      block_id: row.block_id,
      title: row.title,
      description: row.description,
      schema: [], // Will be loaded separately
      views: row.views,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Map property row to DatabaseProperty object
   */
  private mapRowToProperty(row: any): DatabaseProperty {
    return {
      id: row.id,
      database_id: row.database_id,
      name: row.name,
      type: row.type,
      config: row.config,
      position: row.position,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

export const databaseService = new DatabaseService();
