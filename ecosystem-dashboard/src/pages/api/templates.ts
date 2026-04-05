/**
 * API endpoint for page templates
 * GET /api/templates?workspaceId=xxx&category=xxx - List templates
 * POST /api/templates - Create a custom template
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { workspaceId, category } = req.query;

    if (!workspaceId || typeof workspaceId !== 'string') {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    try {
      let sql = `SELECT id, workspace_id, name, description, category, icon, content, properties, created_by, is_system, usage_count, created_at
                  FROM page_templates
                  WHERE (workspace_id = $1 OR is_system = true)`;
      const params: any[] = [workspaceId];

      if (category && typeof category === 'string') {
        sql += ` AND category = $2`;
        params.push(category);
      }

      sql += ` ORDER BY is_system DESC, usage_count DESC, created_at DESC`;

      const result = await query(sql, params);

      const templates = result.rows.map(row => ({
        id: row.id,
        workspaceId: row.workspace_id,
        name: row.name,
        description: row.description,
        category: row.category,
        icon: row.icon,
        content: row.content,
        properties: row.properties,
        createdBy: row.created_by,
        isSystem: row.is_system,
        usageCount: row.usage_count,
        createdAt: row.created_at,
      }));

      return res.status(200).json({ templates });
    } catch (error) {
      console.error('Failed to get templates:', error);
      return res.status(500).json({ error: 'Failed to get templates' });
    }
  }

  if (req.method === 'POST') {
    const { workspaceId, name, description, category, icon, content, properties, createdBy } = req.body;

    if (!workspaceId || !name || !content || !createdBy) {
      return res.status(400).json({ error: 'workspaceId, name, content, and createdBy are required' });
    }

    try {
      const result = await query(
        `INSERT INTO page_templates (workspace_id, name, description, category, icon, content, properties, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, name, category, icon, created_at`,
        [workspaceId, name, description || null, category || 'custom', icon || '📄', JSON.stringify(content), JSON.stringify(properties || {}), createdBy]
      );

      return res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Failed to create template:', error);
      return res.status(500).json({ error: 'Failed to create template' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
