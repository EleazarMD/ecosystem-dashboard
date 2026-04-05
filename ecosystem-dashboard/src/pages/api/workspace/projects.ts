/**
 * Workspace Projects API
 * 
 * Manage project containers that group related pages, databases, and files
 * with shared metadata, timelines, and collaboration settings.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction } from '@/lib/db/client';
import { blockService } from '@/lib/workspace/block-service';
import { workspaceService } from '@/lib/workspace/workspace-service';
import { databaseService } from '@/lib/workspace/database-service';
import { withAPIAuth, type APIAuthContext } from '@/lib/security/api-auth';

interface ProjectOperation {
  operation:
    | 'create_project'
    | 'list_projects'
    | 'get_project'
    | 'get_dashboard'
    | 'update_project'
    | 'add_page'
    | 'remove_page'
    | 'create_page'
    | 'add_task'
    | 'archive_project'
    | 'delete_project';
  workspace_id?: string;
  user_id?: string;
  data?: Record<string, unknown>;
}

export default withAPIAuth(async (req, res, authContext) => handler(req, res, authContext));

interface ProjectResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
}

// Project templates
const PROJECT_TEMPLATES: Record<string, { icon: string; sections: string[] }> = {
  basic: {
    icon: '📁',
    sections: ['Notes'],
  },
  research: {
    icon: '🔬',
    sections: ['Literature Review', 'Data & Analysis', 'Findings', 'References'],
  },
  software: {
    icon: '💻',
    sections: ['Requirements', 'Design', 'Development', 'Testing', 'Documentation'],
  },
  content: {
    icon: '✍️',
    sections: ['Drafts', 'Assets', 'Published', 'Analytics'],
  },
  event: {
    icon: '🎉',
    sections: ['Planning', 'Logistics', 'Communications', 'Post-Event'],
  },
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProjectResponse>,
  authContext: APIAuthContext
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const op: ProjectOperation = req.body;
    const userId = authContext.userId;

    if (op.user_id && op.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'user_id does not match authenticated user',
        timestamp: new Date().toISOString(),
      });
    }

    if (!op.operation) {
      return res.status(400).json({
        success: false,
        error: 'operation is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Get or create workspace
    let workspaceId = op.workspace_id;
    if (!workspaceId) {
      const workspaces = await workspaceService.getUserWorkspaces(userId);
      if (workspaces.length === 0) {
        const newWs = await workspaceService.createDefaultWorkspace(userId);
        workspaceId = newWs.id;
      } else {
        workspaceId = workspaces[0].id;
      }
    }

    let result: unknown;

    switch (op.operation) {
      // ========================================
      // CREATE PROJECT
      // ========================================
      case 'create_project': {
        const {
          name,
          description,
          icon,
          template = 'basic',
          status = 'planning',
          priority = 'medium',
          tags = [],
          start_date,
          due_date,
          collaborators = [],
        } = op.data || {};

        if (!name) {
          return res.status(400).json({
            success: false,
            error: 'name is required for create_project',
            timestamp: new Date().toISOString(),
          });
        }

        const templateConfig = PROJECT_TEMPLATES[template as string] || PROJECT_TEMPLATES.basic;
        const projectIcon = (icon as string) || templateConfig.icon;

        // Create root page for project
        const rootPage = await blockService.createBlock({
          workspace_id: workspaceId,
          parent_id: null,
          type: 'page',
          properties: {
            title: [{ type: 'text', text: { content: name as string } }],
            icon: { type: 'emoji', emoji: projectIcon },
          },
          created_by: userId,
        });

        // Add project overview callout
        await blockService.createBlock({
          workspace_id: workspaceId,
          parent_id: rootPage.id,
          type: 'callout',
          properties: {
            icon: { type: 'emoji', emoji: '📋' },
            rich_text: [{ 
              type: 'text', 
              text: { 
                content: `Status: ${status}\nPriority: ${priority}${due_date ? `\nDue: ${due_date}` : ''}` 
              } 
            }],
          },
          created_by: userId,
        });

        // Add description if provided
        if (description) {
          await blockService.createBlock({
            workspace_id: workspaceId,
            parent_id: rootPage.id,
            type: 'paragraph',
            properties: {
              rich_text: [{ type: 'text', text: { content: description as string } }],
            },
            created_by: userId,
          });
        }

        // Create tasks database (simplified - skip for now to avoid nested transaction issues)
        // TODO: Fix nested transaction issue in databaseService.createDatabase
        let tasksDbId: string | null = null;
        try {
          const tasksDb = await databaseService.createDatabase({
            workspace_id: workspaceId,
            parent_id: rootPage.id,
            title: 'Tasks',
            inline: true,
            schema: [
              { name: 'Task', type: 'title', config: {}, position: 0 },
              { 
                name: 'Status', 
                type: 'select', 
                config: { 
                  options: [
                    { name: 'Todo', color: 'gray' },
                    { name: 'In Progress', color: 'blue' },
                    { name: 'Done', color: 'green' },
                  ] 
                }, 
                position: 1 
              },
              { 
                name: 'Priority', 
                type: 'select', 
                config: { 
                  options: [
                    { name: 'Low', color: 'gray' },
                    { name: 'Medium', color: 'blue' },
                    { name: 'High', color: 'orange' },
                    { name: 'Urgent', color: 'red' },
                  ] 
                }, 
                position: 2 
              },
              { name: 'Due Date', type: 'date', config: {}, position: 3 },
            ],
            created_by: userId,
          });
          tasksDbId = tasksDb.id;
        } catch (dbError) {
          console.warn('[Projects] Could not create tasks database:', dbError);
        }

        // Create section pages
        const sectionPages: string[] = [];
        for (const sectionName of templateConfig.sections) {
          const sectionPage = await blockService.createBlock({
            workspace_id: workspaceId,
            parent_id: rootPage.id,
            type: 'page',
            properties: {
              title: [{ type: 'text', text: { content: sectionName } }],
              icon: { type: 'emoji', emoji: '📁' },
            },
            created_by: userId,
          });
          sectionPages.push(sectionPage.id);
        }

        // Insert project record
        const projectResult = await query(
          `INSERT INTO projects (
            workspace_id, name, description, icon, root_page_id, 
            status, priority, tags, start_date, due_date, 
            owner_id, collaborators, settings
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`,
          [
            workspaceId,
            name,
            description || null,
            projectIcon,
            rootPage.id,
            status,
            priority,
            tags,
            start_date || null,
            due_date || null,
            userId,
            JSON.stringify(collaborators),
            JSON.stringify({ tasks_database_id: tasksDbId, sections: sectionPages }),
          ]
        );

        const project = projectResult.rows[0];

        result = {
          project: {
            id: project.id,
            name: project.name,
            status: project.status,
            root_page_id: project.root_page_id,
            tasks_database_id: tasksDbId,
          },
          pages_created: 1 + templateConfig.sections.length,
          sections: templateConfig.sections,
          dashboard_url: `http://localhost:8404/workspace/${workspaceId}/project/${project.id}`,
        };
        break;
      }

      // ========================================
      // LIST PROJECTS
      // ========================================
      case 'list_projects': {
        const { 
          status = 'all', 
          sort_by = 'updated', 
          limit = 20 
        } = op.data || {};

        let sql = `
          SELECT p.*, 
            (SELECT COUNT(*) FROM blocks b WHERE b.parent_id = p.root_page_id AND b.type = 'page' AND b.archived = false) as page_count
          FROM projects p
          WHERE p.workspace_id = $1 AND p.archived = false
        `;
        const params: unknown[] = [workspaceId];

        if (status !== 'all') {
          sql += ` AND p.status = $${params.length + 1}`;
          params.push(status);
        }

        const sortColumn = sort_by === 'name' ? 'p.name' 
          : sort_by === 'created' ? 'p.created_at'
          : sort_by === 'due_date' ? 'p.due_date'
          : 'p.updated_at';
        sql += ` ORDER BY ${sortColumn} DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const projectsResult = await query(sql, params);

        result = {
          projects: projectsResult.rows.map(p => ({
            id: p.id,
            name: p.name,
            icon: p.icon,
            status: p.status,
            priority: p.priority,
            due_date: p.due_date,
            page_count: parseInt(p.page_count || '0'),
            updated_at: p.updated_at,
          })),
          count: projectsResult.rows.length,
          workspace_id: workspaceId,
        };
        break;
      }

      // ========================================
      // GET PROJECT
      // ========================================
      case 'get_project': {
        const { project_id } = op.data || {};

        if (!project_id) {
          return res.status(400).json({
            success: false,
            error: 'project_id is required for get_project',
            timestamp: new Date().toISOString(),
          });
        }

        const projectResult = await query(
          'SELECT * FROM projects WHERE id = $1 AND archived = false',
          [project_id]
        );

        if (projectResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Project not found',
            timestamp: new Date().toISOString(),
          });
        }

        const project = projectResult.rows[0];

        // Get root page with children
        const rootPage = await blockService.getBlock(project.root_page_id, true);

        result = {
          project: {
            ...project,
            collaborators: project.collaborators,
            settings: project.settings,
          },
          root_page: rootPage,
        };
        break;
      }

      // ========================================
      // GET DASHBOARD
      // ========================================
      case 'get_dashboard': {
        const { project_id } = op.data || {};

        if (!project_id) {
          return res.status(400).json({
            success: false,
            error: 'project_id is required for get_dashboard',
            timestamp: new Date().toISOString(),
          });
        }

        const projectResult = await query(
          'SELECT * FROM projects WHERE id = $1 AND archived = false',
          [project_id]
        );

        if (projectResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Project not found',
            timestamp: new Date().toISOString(),
          });
        }

        const project = projectResult.rows[0];
        const settings = project.settings || {};

        // Get page count
        const pageCountResult = await query(
          `SELECT COUNT(*) as count FROM blocks 
           WHERE workspace_id = $1 AND parent_id = $2 AND type = 'page' AND archived = false`,
          [workspaceId, project.root_page_id]
        );

        // Get task stats from tasks database
        let taskStats = { total: 0, completed: 0 };
        if (settings.tasks_database_id) {
          try {
            const tasks = await databaseService.getDatabasePages(settings.tasks_database_id);
            taskStats.total = tasks.length;
            taskStats.completed = tasks.filter(t => 
              t.properties?.Status === 'Done' || t.properties?.status === 'Done'
            ).length;
          } catch (e) {
            // Database might not exist
          }
        }

        // Calculate days remaining
        let daysRemaining = null;
        if (project.due_date) {
          const due = new Date(project.due_date);
          const now = new Date();
          daysRemaining = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Get recent pages
        const recentPagesResult = await query(
          `SELECT id, properties, updated_at FROM blocks 
           WHERE workspace_id = $1 AND parent_id = $2 AND type = 'page' AND archived = false
           ORDER BY updated_at DESC LIMIT 5`,
          [workspaceId, project.root_page_id]
        );

        result = {
          project: {
            id: project.id,
            name: project.name,
            icon: project.icon,
            status: project.status,
            priority: project.priority,
            due_date: project.due_date,
          },
          stats: {
            total_pages: parseInt(pageCountResult.rows[0]?.count || '0'),
            total_tasks: taskStats.total,
            completed_tasks: taskStats.completed,
            completion_percentage: taskStats.total > 0 
              ? Math.round((taskStats.completed / taskStats.total) * 100) 
              : 0,
            days_remaining: daysRemaining,
            last_activity: project.updated_at,
          },
          recent_pages: recentPagesResult.rows.map(p => ({
            id: p.id,
            title: p.properties?.title?.[0]?.text?.content || 'Untitled',
            updated_at: p.updated_at,
          })),
        };
        break;
      }

      // ========================================
      // UPDATE PROJECT
      // ========================================
      case 'update_project': {
        const { project_id, updates } = op.data || {};

        if (!project_id) {
          return res.status(400).json({
            success: false,
            error: 'project_id is required for update_project',
            timestamp: new Date().toISOString(),
          });
        }

        const allowedFields = ['name', 'description', 'icon', 'status', 'priority', 'tags', 'start_date', 'due_date'];
        const setClauses: string[] = ['updated_at = NOW()'];
        const values: unknown[] = [project_id];
        let paramIndex = 2;

        for (const [key, value] of Object.entries(updates as Record<string, unknown>)) {
          if (allowedFields.includes(key)) {
            setClauses.push(`${key} = $${paramIndex}`);
            values.push(key === 'tags' ? value : value);
            paramIndex++;
          }
        }

        const updateResult = await query(
          `UPDATE projects SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
          values
        );

        if (updateResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Project not found',
            timestamp: new Date().toISOString(),
          });
        }

        result = { project: updateResult.rows[0] };
        break;
      }

      // ========================================
      // ADD TASK
      // ========================================
      case 'add_task': {
        const { 
          project_id, 
          title, 
          status = 'Todo', 
          priority = 'Medium',
          due_date,
          assignee 
        } = op.data || {};

        if (!project_id || !title) {
          return res.status(400).json({
            success: false,
            error: 'project_id and title are required for add_task',
            timestamp: new Date().toISOString(),
          });
        }

        // Get project to find tasks database
        const projectResult = await query(
          'SELECT settings FROM projects WHERE id = $1',
          [project_id]
        );

        if (projectResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Project not found',
            timestamp: new Date().toISOString(),
          });
        }

        const settings = projectResult.rows[0].settings || {};
        if (!settings.tasks_database_id) {
          return res.status(400).json({
            success: false,
            error: 'Project does not have a tasks database',
            timestamp: new Date().toISOString(),
          });
        }

        // Create task entry
        const taskPage = await databaseService.createDatabasePage(
          settings.tasks_database_id,
          title as string,
          {
            Status: status,
            Priority: priority,
            'Due Date': due_date || null,
          },
          userId
        );

        result = {
          task: {
            id: taskPage.id,
            title,
            status,
            priority,
            due_date,
          },
          project_id,
        };
        break;
      }

      // ========================================
      // ARCHIVE PROJECT
      // ========================================
      case 'archive_project': {
        const { project_id, reason } = op.data || {};

        if (!project_id) {
          return res.status(400).json({
            success: false,
            error: 'project_id is required for archive_project',
            timestamp: new Date().toISOString(),
          });
        }

        const archiveResult = await query(
          `UPDATE projects SET 
            archived = true, 
            status = 'archived',
            updated_at = NOW()
           WHERE id = $1 RETURNING id, name`,
          [project_id]
        );

        if (archiveResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Project not found',
            timestamp: new Date().toISOString(),
          });
        }

        result = {
          archived: true,
          project_id,
          project_name: archiveResult.rows[0].name,
          reason: reason || 'archived',
        };
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown operation: ${op.operation}`,
          timestamp: new Date().toISOString(),
        });
    }

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Workspace Projects] Error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
