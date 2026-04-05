/**
 * Workspace Service
 * Manages workspaces and high-level operations
 */

import { query, transaction } from '../db/client';
import { Workspace, CreateWorkspaceParams, WorkspaceResponse } from '../../types/workspace';
import { blockService } from './block-service';

export class WorkspaceService {
  /**
   * Create a new workspace
   */
  async createWorkspace(params: CreateWorkspaceParams): Promise<Workspace> {
    const { name, owner_id, settings = {} } = params;

    const result = await query(
      `INSERT INTO workspaces (name, owner_id, settings)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, owner_id, JSON.stringify(settings)]
    );

    return this.mapRowToWorkspace(result.rows[0]);
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(workspaceId: string): Promise<WorkspaceResponse | null> {
    const result = await query(
      'SELECT * FROM workspaces WHERE id = $1 AND archived = FALSE',
      [workspaceId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const workspace = this.mapRowToWorkspace(result.rows[0]);

    // Get counts
    const counts = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE type = 'page') as page_count,
        COUNT(*) FILTER (WHERE type IN ('database_inline', 'database_full_page')) as database_count
       FROM blocks
       WHERE workspace_id = $1 AND archived = FALSE`,
      [workspaceId]
    );

    return {
      workspace,
      page_count: parseInt(counts.rows[0].page_count || '0'),
      database_count: parseInt(counts.rows[0].database_count || '0')
    };
  }

  /**
   * Get all workspaces for a user
   */
  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const result = await query(
      'SELECT * FROM workspaces WHERE owner_id = $1 AND archived = FALSE ORDER BY updated_at DESC',
      [userId]
    );

    return result.rows.map(row => this.mapRowToWorkspace(row));
  }

  /**
   * Update workspace
   */
  async updateWorkspace(
    workspaceId: string,
    updates: { name?: string; settings?: Record<string, any> }
  ): Promise<Workspace> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: any[] = [workspaceId];
    let paramIndex = 2;

    if (updates.name) {
      setClauses.push(`name = $${paramIndex}`);
      values.push(updates.name);
      paramIndex++;
    }

    if (updates.settings) {
      setClauses.push(`settings = $${paramIndex}`);
      values.push(JSON.stringify(updates.settings));
      paramIndex++;
    }

    const result = await query(
      `UPDATE workspaces SET ${setClauses.join(', ')}
       WHERE id = $1
       RETURNING *`,
      values
    );

    return this.mapRowToWorkspace(result.rows[0]);
  }

  /**
   * Delete workspace (archive)
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    await query(
      'UPDATE workspaces SET archived = TRUE, updated_at = NOW() WHERE id = $1',
      [workspaceId]
    );
  }

  /**
   * Create a default workspace for a new user
   */
  async createDefaultWorkspace(userId: string): Promise<Workspace> {
    return transaction(async (client) => {
      // Create workspace
      const workspaceResult = await client.query(
        `INSERT INTO workspaces (name, owner_id, settings)
         VALUES ($1, $2, $3)
         RETURNING *`,
        ['My Workspace', userId, JSON.stringify({
          icon: '🏠',
          theme: 'light',
          default_view: 'table'
        })]
      );

      const workspace = this.mapRowToWorkspace(workspaceResult.rows[0]);

      // Create welcome page
      const welcomeBlock = await blockService.createBlockInTransaction({
        workspace_id: workspace.id,
        type: 'page',
        properties: {
          title: [{
            type: 'text',
            text: { content: 'Welcome to Your Workspace' }
          }]
        },
        created_by: userId,
        children: [
          {
            workspace_id: workspace.id,
            type: 'paragraph',
            properties: {
              title: [{
                type: 'text',
                text: { content: 'This is your personal workspace in the AI Homelab Dashboard.' }
              }]
            },
            created_by: userId
          },
          {
            workspace_id: workspace.id,
            type: 'heading_2',
            properties: {
              title: [{
                type: 'text',
                text: { content: 'What you can do:' }
              }]
            },
            created_by: userId
          },
          {
            workspace_id: workspace.id,
            type: 'bulleted_list',
            properties: {
              title: [{
                type: 'text',
                text: { content: 'Create pages and databases' }
              }]
            },
            created_by: userId
          },
          {
            workspace_id: workspace.id,
            type: 'bulleted_list',
            properties: {
              title: [{
                type: 'text',
                text: { content: 'Let DashAI build content for you' }
              }]
            },
            created_by: userId
          },
          {
            workspace_id: workspace.id,
            type: 'bulleted_list',
            properties: {
              title: [{
                type: 'text',
                text: { content: 'Connect external tools via MCP' }
              }]
            },
            created_by: userId
          }
        ]
      }, client);

      return workspace;
    });
  }

  /**
   * Map database row to Workspace object
   */
  private mapRowToWorkspace(row: any): Workspace {
    return {
      id: row.id,
      name: row.name,
      owner_id: row.owner_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      settings: row.settings,
      archived: row.archived
    };
  }
}

export const workspaceService = new WorkspaceService();
