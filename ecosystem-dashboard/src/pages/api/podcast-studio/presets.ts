import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '@/lib/db/podcast-studio-db';
import { DEFAULT_PRESETS } from '@/lib/podcast-presets';

/**
 * API endpoint for managing podcast presets
 * 
 * GET: List all presets (default + custom from database)
 * POST: Create a new custom preset
 * PUT: Update a custom preset
 * DELETE: Delete a custom preset
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const { userId } = req.query;
      
      // Get custom presets from database
      let query = 'SELECT * FROM script_presets ORDER BY usage_count DESC, created_at DESC';
      const params: string[] = [];
      
      if (userId && typeof userId === 'string') {
        query = 'SELECT * FROM script_presets WHERE user_id = $1 OR user_id IS NULL ORDER BY usage_count DESC, created_at DESC';
        params.push(userId);
      }
      
      const result = await pool.query(query, params);
      
      // Transform database rows to preset format
      const customPresets = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        category: row.category || 'custom',
        config: row.config,
        usage_count: row.usage_count,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
      
      // Return default presets + custom presets from database
      const allPresets = [...DEFAULT_PRESETS, ...customPresets];
      
      return res.status(200).json(allPresets);
    }

    if (req.method === 'POST') {
      const { name, description, icon, config, userId } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Preset name is required' });
      }
      
      if (!config) {
        return res.status(400).json({ error: 'Preset config is required' });
      }
      
      const result = await pool.query(
        `INSERT INTO script_presets (name, description, icon, category, user_id, config)
         VALUES ($1, $2, $3, 'custom', $4, $5)
         RETURNING *`,
        [name, description || '', icon || '🎙️', userId || null, JSON.stringify(config)]
      );
      
      const newPreset = result.rows[0];
      console.log(`✅ Created script preset: ${name}`);
      
      return res.status(201).json({
        id: newPreset.id,
        name: newPreset.name,
        description: newPreset.description,
        icon: newPreset.icon,
        category: newPreset.category,
        config: newPreset.config,
        created_at: newPreset.created_at,
        updated_at: newPreset.updated_at,
      });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const updates = req.body;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Preset ID is required' });
      }
      
      // Build dynamic update query
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (updates.name) {
        fields.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }
      if (updates.icon) {
        fields.push(`icon = $${paramCount++}`);
        values.push(updates.icon);
      }
      if (updates.config) {
        fields.push(`config = $${paramCount++}`);
        values.push(JSON.stringify(updates.config));
      }
      
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      fields.push(`updated_at = NOW()`);
      values.push(id);
      
      const result = await pool.query(
        `UPDATE script_presets SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Preset not found' });
      }
      
      const updatedPreset = result.rows[0];
      console.log(`✅ Updated script preset: ${updatedPreset.name}`);
      
      return res.status(200).json({
        id: updatedPreset.id,
        name: updatedPreset.name,
        description: updatedPreset.description,
        icon: updatedPreset.icon,
        category: updatedPreset.category,
        config: updatedPreset.config,
        updated_at: updatedPreset.updated_at,
      });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Preset ID is required' });
      }
      
      const result = await pool.query(
        'DELETE FROM script_presets WHERE id = $1 RETURNING id, name',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Preset not found' });
      }
      
      console.log(`🗑️ Deleted script preset: ${result.rows[0].name}`);
      
      return res.status(200).json({ success: true, deletedId: id });
    }

    // Handle increment usage count
    if (req.method === 'PATCH') {
      const { id } = req.query;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Preset ID is required' });
      }
      
      await pool.query(
        'UPDATE script_presets SET usage_count = usage_count + 1 WHERE id = $1',
        [id]
      );
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ Presets API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
