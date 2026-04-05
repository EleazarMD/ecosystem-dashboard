/**
 * Workspace Templates API
 * 
 * Create, manage, and apply saved templates for consistent document creation.
 * Templates provide reusable page structures with variables.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db/client';
import { blockService } from '@/lib/workspace/block-service';
import { workspaceService } from '@/lib/workspace/workspace-service';
import { withAPIAuth, type APIAuthContext } from '@/lib/security/api-auth';

interface TemplateOperation {
  operation:
    | 'create_template'
    | 'create_from_page'
    | 'list_templates'
    | 'get_template'
    | 'apply_template'
    | 'update_template'
    | 'delete_template'
    | 'browse_gallery';
  workspace_id?: string;
  user_id?: string;
  data?: Record<string, unknown>;
}

export default withAPIAuth(async (req, res, authContext) => handler(req, res, authContext));

interface TemplateResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
}

interface TemplateBlock {
  type: string;
  content: string;
  icon?: string;
}

interface TemplateVariable {
  name: string;
  type: 'text' | 'date' | 'select' | 'user' | 'number';
  default?: string;
  required: boolean;
  options?: string[];
}

// Built-in templates
const BUILTIN_TEMPLATES: Record<string, {
  name: string;
  description: string;
  icon: string;
  category: string;
  blocks: TemplateBlock[];
  variables: TemplateVariable[];
}> = {
  'quick-note': {
    name: 'Quick Note',
    description: 'Simple note for quick thoughts',
    icon: '📝',
    category: 'note',
    blocks: [
      { type: 'paragraph', content: '' },
    ],
    variables: [],
  },
  'meeting-notes': {
    name: 'Meeting Notes',
    description: 'Standard meeting notes with agenda and action items',
    icon: '📅',
    category: 'meeting',
    blocks: [
      { type: 'callout', content: 'Date: {{date}}\nAttendees: {{attendees}}', icon: '👥' },
      { type: 'heading_2', content: 'Agenda' },
      { type: 'numbered_list', content: '' },
      { type: 'heading_2', content: 'Discussion' },
      { type: 'paragraph', content: '' },
      { type: 'heading_2', content: 'Action Items' },
      { type: 'to_do', content: '' },
      { type: 'heading_2', content: 'Next Meeting' },
      { type: 'paragraph', content: '' },
    ],
    variables: [
      { name: 'date', type: 'date', required: true },
      { name: 'attendees', type: 'text', required: false },
    ],
  },
  'research-document': {
    name: 'Research Document',
    description: 'Structured research document with sections',
    icon: '🔬',
    category: 'research',
    blocks: [
      { type: 'callout', content: 'Research Topic: {{topic}}', icon: '📋' },
      { type: 'heading_2', content: 'Background' },
      { type: 'paragraph', content: '' },
      { type: 'heading_2', content: 'Methodology' },
      { type: 'paragraph', content: '' },
      { type: 'heading_2', content: 'Findings' },
      { type: 'paragraph', content: '' },
      { type: 'heading_2', content: 'Conclusions' },
      { type: 'paragraph', content: '' },
      { type: 'heading_2', content: 'References' },
      { type: 'bulleted_list', content: '' },
    ],
    variables: [
      { name: 'topic', type: 'text', required: true },
    ],
  },
  'project-brief': {
    name: 'Project Brief',
    description: 'Project overview with objectives and timeline',
    icon: '🎯',
    category: 'project',
    blocks: [
      { type: 'callout', content: 'Project: {{project_name}}\nOwner: {{owner}}\nDue: {{due_date}}', icon: '📊' },
      { type: 'heading_2', content: 'Objective' },
      { type: 'paragraph', content: '' },
      { type: 'heading_2', content: 'Scope' },
      { type: 'bulleted_list', content: 'In scope:' },
      { type: 'bulleted_list', content: 'Out of scope:' },
      { type: 'heading_2', content: 'Timeline' },
      { type: 'paragraph', content: '' },
      { type: 'heading_2', content: 'Resources' },
      { type: 'bulleted_list', content: '' },
      { type: 'heading_2', content: 'Risks' },
      { type: 'bulleted_list', content: '' },
      { type: 'heading_2', content: 'Success Criteria' },
      { type: 'bulleted_list', content: '' },
    ],
    variables: [
      { name: 'project_name', type: 'text', required: true },
      { name: 'owner', type: 'text', required: false },
      { name: 'due_date', type: 'date', required: false },
    ],
  },
  'weekly-report': {
    name: 'Weekly Report',
    description: 'Weekly status report template',
    icon: '📊',
    category: 'document',
    blocks: [
      { type: 'callout', content: 'Week of {{week_start}}', icon: '📅' },
      { type: 'heading_2', content: 'Summary' },
      { type: 'paragraph', content: '' },
      { type: 'heading_2', content: 'Accomplishments' },
      { type: 'bulleted_list', content: '' },
      { type: 'heading_2', content: 'In Progress' },
      { type: 'bulleted_list', content: '' },
      { type: 'heading_2', content: 'Blockers' },
      { type: 'bulleted_list', content: '' },
      { type: 'heading_2', content: 'Next Week' },
      { type: 'bulleted_list', content: '' },
    ],
    variables: [
      { name: 'week_start', type: 'date', required: true },
    ],
  },
  'email-archive': {
    name: 'Email Archive',
    description: 'Archive email with metadata',
    icon: '📧',
    category: 'email',
    blocks: [
      { type: 'callout', content: 'From: {{from}}\nTo: {{to}}\nDate: {{date}}\nSubject: {{subject}}', icon: '📬' },
      { type: 'divider', content: '' },
      { type: 'paragraph', content: '{{body}}' },
      { type: 'divider', content: '' },
      { type: 'heading_3', content: 'Attachments' },
      { type: 'bulleted_list', content: '' },
    ],
    variables: [
      { name: 'from', type: 'text', required: true },
      { name: 'to', type: 'text', required: true },
      { name: 'date', type: 'date', required: true },
      { name: 'subject', type: 'text', required: true },
      { name: 'body', type: 'text', required: false },
    ],
  },
};

function buildBlockProperties(type: string, content: string, icon?: string): Record<string, unknown> {
  const textProperty = type === 'paragraph' || type === 'code' ? 'rich_text' : 'title';

  const props: Record<string, unknown> = {
    [textProperty]: [
      {
        type: 'text',
        text: { content },
      },
    ],
  };

  if (type === 'callout' && icon) {
    props.icon = { type: 'emoji', emoji: icon };
  }

  if (type === 'to_do') {
    props.checked = false;
  }

  return props;
}

function replaceVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
  }
  return result;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TemplateResponse>,
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
    const op: TemplateOperation = req.body;
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

    // Get workspace
    let workspaceId = op.workspace_id;
    if (!workspaceId && op.operation !== 'browse_gallery') {
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
      // CREATE TEMPLATE
      // ========================================
      case 'create_template': {
        const {
          name,
          description,
          icon = '📄',
          category = 'custom',
          blocks = [],
          variables = [],
          is_public = false,
        } = op.data || {};

        if (!name) {
          return res.status(400).json({
            success: false,
            error: 'name is required for create_template',
            timestamp: new Date().toISOString(),
          });
        }

        const templateResult = await query(
          `INSERT INTO workspace_templates (
            workspace_id, name, description, icon, category, 
            blocks, variables, created_by, is_public
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            workspaceId,
            name,
            description || null,
            icon,
            category,
            JSON.stringify(blocks),
            JSON.stringify(variables),
            userId,
            is_public,
          ]
        );

        result = {
          template: templateResult.rows[0],
        };
        break;
      }

      // ========================================
      // CREATE FROM PAGE
      // ========================================
      case 'create_from_page': {
        const {
          source_page_id,
          name,
          description,
          category = 'custom',
          extract_variables = true,
        } = op.data || {};

        if (!source_page_id) {
          return res.status(400).json({
            success: false,
            error: 'source_page_id is required for create_from_page',
            timestamp: new Date().toISOString(),
          });
        }

        // Get source page with children
        const sourcePage = await blockService.getBlock(source_page_id as string, true);
        if (!sourcePage) {
          return res.status(404).json({
            success: false,
            error: 'Source page not found',
            timestamp: new Date().toISOString(),
          });
        }

        // Extract blocks
        const blocks: TemplateBlock[] = [];
        const variables: TemplateVariable[] = [];
        const variablePattern = /\{\{(\w+)\}\}/g;

        if (sourcePage.children) {
          for (const child of sourcePage.children) {
            const textArray = child.properties?.title || child.properties?.rich_text || [];
            const content = textArray.map((t: any) => t.text?.content || '').join('');

            blocks.push({
              type: child.type,
              content,
              icon: child.properties?.icon?.emoji,
            });

            // Extract variables if enabled
            if (extract_variables) {
              let match;
              while ((match = variablePattern.exec(content)) !== null) {
                const varName = match[1];
                if (!variables.find(v => v.name === varName)) {
                  variables.push({
                    name: varName,
                    type: 'text',
                    required: false,
                  });
                }
              }
            }
          }
        }

        const templateName = (name as string) || 
          sourcePage.properties?.title?.[0]?.text?.content || 
          'Custom Template';
        const templateIcon = sourcePage.properties?.icon?.emoji || '📄';

        const templateResult = await query(
          `INSERT INTO workspace_templates (
            workspace_id, name, description, icon, category, 
            blocks, variables, created_by, is_public
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            workspaceId,
            templateName,
            description || `Created from ${templateName}`,
            templateIcon,
            category,
            JSON.stringify(blocks),
            JSON.stringify(variables),
            userId,
            false,
          ]
        );

        result = {
          template: templateResult.rows[0],
          blocks_extracted: blocks.length,
          variables_found: variables.length,
        };
        break;
      }

      // ========================================
      // LIST TEMPLATES
      // ========================================
      case 'list_templates': {
        const {
          category = 'all',
          include_public = true,
          include_builtin = true,
          sort_by = 'name',
        } = op.data || {};

        const templates: unknown[] = [];

        // Add built-in templates
        if (include_builtin) {
          for (const [id, template] of Object.entries(BUILTIN_TEMPLATES)) {
            if (category === 'all' || template.category === category) {
              templates.push({
                id: `builtin:${id}`,
                ...template,
                is_builtin: true,
                is_public: true,
                usage_count: 0,
              });
            }
          }
        }

        // Get user templates
        let sql = `
          SELECT * FROM workspace_templates
          WHERE (workspace_id = $1 OR (is_public = true AND $2 = true))
        `;
        const params: unknown[] = [workspaceId, include_public];

        if (category !== 'all') {
          sql += ` AND category = $${params.length + 1}`;
          params.push(category);
        }

        sql += ` ORDER BY ${sort_by === 'usage' ? 'usage_count DESC' : sort_by === 'created' ? 'created_at DESC' : 'name ASC'}`;

        const userTemplates = await query(sql, params);
        templates.push(...userTemplates.rows.map(t => ({
          ...t,
          is_builtin: false,
        })));

        result = {
          templates,
          count: templates.length,
        };
        break;
      }

      // ========================================
      // GET TEMPLATE
      // ========================================
      case 'get_template': {
        const { template_id } = op.data || {};

        if (!template_id) {
          return res.status(400).json({
            success: false,
            error: 'template_id is required for get_template',
            timestamp: new Date().toISOString(),
          });
        }

        // Check if built-in
        if ((template_id as string).startsWith('builtin:')) {
          const builtinId = (template_id as string).replace('builtin:', '');
          const builtin = BUILTIN_TEMPLATES[builtinId];
          if (!builtin) {
            return res.status(404).json({
              success: false,
              error: 'Template not found',
              timestamp: new Date().toISOString(),
            });
          }
          result = {
            template: {
              id: template_id,
              ...builtin,
              is_builtin: true,
            },
          };
          break;
        }

        const templateResult = await query(
          'SELECT * FROM workspace_templates WHERE id = $1',
          [template_id]
        );

        if (templateResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Template not found',
            timestamp: new Date().toISOString(),
          });
        }

        result = {
          template: {
            ...templateResult.rows[0],
            is_builtin: false,
          },
        };
        break;
      }

      // ========================================
      // APPLY TEMPLATE
      // ========================================
      case 'apply_template': {
        const {
          template_id,
          parent_page_id,
          variables = {},
          title,
        } = op.data || {};

        if (!template_id) {
          return res.status(400).json({
            success: false,
            error: 'template_id is required for apply_template',
            timestamp: new Date().toISOString(),
          });
        }

        let template: {
          name: string;
          icon: string;
          blocks: TemplateBlock[];
          variables: TemplateVariable[];
        };

        // Get template
        if ((template_id as string).startsWith('builtin:')) {
          const builtinId = (template_id as string).replace('builtin:', '');
          const builtin = BUILTIN_TEMPLATES[builtinId];
          if (!builtin) {
            return res.status(404).json({
              success: false,
              error: 'Template not found',
              timestamp: new Date().toISOString(),
            });
          }
          template = builtin;
        } else {
          const templateResult = await query(
            'SELECT * FROM workspace_templates WHERE id = $1',
            [template_id]
          );
          if (templateResult.rows.length === 0) {
            return res.status(404).json({
              success: false,
              error: 'Template not found',
              timestamp: new Date().toISOString(),
            });
          }
          template = templateResult.rows[0];
        }

        // Create page
        const pageTitle = (title as string) || 
          replaceVariables(template.name, variables as Record<string, string>);

        const page = await blockService.createBlock({
          workspace_id: workspaceId!,
          parent_id: (parent_page_id as string) || null,
          type: 'page',
          properties: {
            title: [{ type: 'text', text: { content: pageTitle } }],
            icon: { type: 'emoji', emoji: template.icon },
          },
          created_by: userId,
        });

        // Create blocks with variable substitution
        let blocksCreated = 0;
        for (const block of template.blocks) {
          const content = replaceVariables(block.content, variables as Record<string, string>);
          
          await blockService.createBlock({
            workspace_id: workspaceId!,
            parent_id: page.id,
            type: block.type as any,
            properties: buildBlockProperties(block.type, content, block.icon),
            created_by: userId,
          });
          blocksCreated++;
        }

        // Increment usage count for non-builtin templates
        if (!(template_id as string).startsWith('builtin:')) {
          await query(
            'UPDATE workspace_templates SET usage_count = usage_count + 1 WHERE id = $1',
            [template_id]
          );
        }

        result = {
          page_id: page.id,
          title: pageTitle,
          blocks_created: blocksCreated,
          template_name: template.name,
          dashboard_url: `http://localhost:8404/workspace/${workspaceId}/page/${page.id}`,
        };
        break;
      }

      // ========================================
      // UPDATE TEMPLATE
      // ========================================
      case 'update_template': {
        const { template_id, updates } = op.data || {};

        if (!template_id) {
          return res.status(400).json({
            success: false,
            error: 'template_id is required for update_template',
            timestamp: new Date().toISOString(),
          });
        }

        if ((template_id as string).startsWith('builtin:')) {
          return res.status(400).json({
            success: false,
            error: 'Cannot update built-in templates',
            timestamp: new Date().toISOString(),
          });
        }

        const allowedFields = ['name', 'description', 'icon', 'category', 'blocks', 'variables', 'is_public'];
        const setClauses: string[] = ['updated_at = NOW()'];
        const values: unknown[] = [template_id];
        let paramIndex = 2;

        for (const [key, value] of Object.entries(updates as Record<string, unknown>)) {
          if (allowedFields.includes(key)) {
            setClauses.push(`${key} = $${paramIndex}`);
            values.push(key === 'blocks' || key === 'variables' ? JSON.stringify(value) : value);
            paramIndex++;
          }
        }

        const updateResult = await query(
          `UPDATE workspace_templates SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
          values
        );

        if (updateResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Template not found',
            timestamp: new Date().toISOString(),
          });
        }

        result = { template: updateResult.rows[0] };
        break;
      }

      // ========================================
      // DELETE TEMPLATE
      // ========================================
      case 'delete_template': {
        const { template_id } = op.data || {};

        if (!template_id) {
          return res.status(400).json({
            success: false,
            error: 'template_id is required for delete_template',
            timestamp: new Date().toISOString(),
          });
        }

        if ((template_id as string).startsWith('builtin:')) {
          return res.status(400).json({
            success: false,
            error: 'Cannot delete built-in templates',
            timestamp: new Date().toISOString(),
          });
        }

        const deleteResult = await query(
          'DELETE FROM workspace_templates WHERE id = $1 RETURNING id, name',
          [template_id]
        );

        if (deleteResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Template not found',
            timestamp: new Date().toISOString(),
          });
        }

        result = {
          deleted: true,
          template_id,
          template_name: deleteResult.rows[0].name,
        };
        break;
      }

      // ========================================
      // BROWSE GALLERY
      // ========================================
      case 'browse_gallery': {
        const {
          category = 'all',
          search,
          sort_by = 'popular',
        } = op.data || {};

        const templates: unknown[] = [];

        // Add built-in templates
        for (const [id, template] of Object.entries(BUILTIN_TEMPLATES)) {
          if (category === 'all' || template.category === category) {
            if (!search || template.name.toLowerCase().includes((search as string).toLowerCase())) {
              templates.push({
                id: `builtin:${id}`,
                ...template,
                is_builtin: true,
                is_public: true,
                usage_count: 1000, // High count for built-ins
              });
            }
          }
        }

        // Get public templates
        let sql = `
          SELECT * FROM workspace_templates
          WHERE is_public = true
        `;
        const params: unknown[] = [];

        if (category !== 'all') {
          sql += ` AND category = $${params.length + 1}`;
          params.push(category);
        }

        if (search) {
          sql += ` AND (name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`;
          params.push(`%${search}%`);
        }

        sql += ` ORDER BY ${sort_by === 'recent' ? 'created_at DESC' : 'usage_count DESC'} LIMIT 50`;

        const publicTemplates = await query(sql, params);
        templates.push(...publicTemplates.rows.map(t => ({
          ...t,
          is_builtin: false,
        })));

        // Sort combined results
        if (sort_by === 'popular') {
          templates.sort((a: any, b: any) => (b.usage_count || 0) - (a.usage_count || 0));
        }

        result = {
          templates,
          count: templates.length,
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
    console.error('[Workspace Templates] Error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
