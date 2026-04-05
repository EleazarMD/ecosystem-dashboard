/**
 * Save Generated Image API
 * 
 * Saves a generated image to the database
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  const {
    prompt,
    negative_prompt,
    model,
    width,
    height,
    steps,
    cfg_scale,
    seed,
    filename,
    file_path,
    file_size_bytes,
    mime_type = 'image/png',
    source_service = 'comfyui',
    generation_time_ms,
    visibility = 'private',
    is_favorite = false,
  } = req.body;

  if (!prompt || !filename || !file_path) {
    return res.status(400).json({ error: 'Missing required fields: prompt, filename, file_path' });
  }

  try {
    // Get user's tenant_id and account type for multi-tenant compliance
    const userResult = await pool.query(
      'SELECT account_type, parent_user_id, tenant_id FROM users WHERE id = $1',
      [user.id]
    );
    
    const userData = userResult.rows[0];
    const isChildAccount = userData?.account_type === 'child';
    const tenantId = userData?.tenant_id || null;

    const result = await pool.query(`
      INSERT INTO generated_images (
        user_id,
        tenant_id,
        prompt,
        negative_prompt,
        model,
        width,
        height,
        steps,
        cfg_scale,
        seed,
        filename,
        file_path,
        file_size_bytes,
        mime_type,
        source_service,
        generation_time_ms,
        visibility,
        is_favorite,
        is_child_generated,
        content_filter_applied,
        parent_approved
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `, [
      user.id,
      tenantId,
      prompt,
      negative_prompt || null,
      model || 'unknown',
      width || 1024,
      height || 1024,
      steps || null,
      cfg_scale || null,
      seed || null,
      filename,
      file_path,
      file_size_bytes || null,
      mime_type,
      source_service,
      generation_time_ms || null,
      visibility,
      is_favorite,
      isChildAccount,
      isChildAccount, // Content filter applied for child accounts
      !isChildAccount, // Auto-approved for non-child accounts
    ]);

    return res.status(201).json({
      success: true,
      image: result.rows[0],
    });
  } catch (error: any) {
    console.error('[Save Image API] Error:', error);
    return res.status(500).json({ error: 'Failed to save image' });
  }
}
