/**
 * Admin API: Single Goose Recipe Management
 * 
 * GET, PUT, DELETE operations for individual recipes
 * Platform admin only
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check platform admin role
  const userResult = await query(
    'SELECT platform_role FROM users WHERE id = $1',
    [session.user.id]
  );
  
  if (!userResult.rows[0] || userResult.rows[0].platform_role !== 'platform_admin') {
    return res.status(403).json({ error: 'Platform admin access required' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Recipe ID required' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, id);
    case 'PUT':
      return handlePut(req, res, id, session.user.id);
    case 'DELETE':
      return handleDelete(req, res, id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const result = await query(
      `SELECT * FROM goose.recipes WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    return res.status(200).json({ recipe: result.rows[0] });
  } catch (error) {
    console.error('[Admin Recipe] GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch recipe' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, id: string, userId: string) {
  try {
    const {
      name,
      description,
      category,
      instructions,
      systemPrompt,
      parameters,
      tags,
      isPublic,
      targetAudience,
      minAge,
      maxAge,
      characterName,
      characterEmoji,
      characterPersonality,
      isSeasonal,
      seasonStart,
      seasonEnd,
      educationalFocus,
      theme,
      iconPath,
    } = req.body;

    // Check recipe exists
    const existingResult = await query(
      'SELECT id FROM goose.recipes WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const result = await query(
      `UPDATE goose.recipes SET
        name = COALESCE($1, name),
        description = $2,
        category = COALESCE($3, category),
        instructions = COALESCE($4, instructions),
        system_prompt = $5,
        parameters = COALESCE($6, parameters),
        tags = COALESCE($7, tags),
        is_public = COALESCE($8, is_public),
        target_audience = COALESCE($9, target_audience),
        min_age = $10,
        max_age = $11,
        character_name = $12,
        character_emoji = $13,
        character_personality = $14,
        is_seasonal = COALESCE($15, is_seasonal),
        season_start = $16,
        season_end = $17,
        educational_focus = COALESCE($18, educational_focus),
        theme = $19,
        icon_path = $20,
        updated_by = $21,
        updated_at = NOW()
      WHERE id = $22
      RETURNING *`,
      [
        name,
        description,
        category,
        instructions,
        systemPrompt,
        parameters ? JSON.stringify(parameters) : null,
        tags ? JSON.stringify(tags) : null,
        isPublic,
        targetAudience,
        minAge,
        maxAge,
        characterName,
        characterEmoji,
        characterPersonality,
        isSeasonal,
        seasonStart,
        seasonEnd,
        educationalFocus ? JSON.stringify(educationalFocus) : null,
        theme,
        iconPath,
        userId,
        id,
      ]
    );

    return res.status(200).json({ recipe: result.rows[0] });
  } catch (error) {
    console.error('[Admin Recipe] PUT error:', error);
    return res.status(500).json({ error: 'Failed to update recipe' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const result = await query(
      'DELETE FROM goose.recipes WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    return res.status(200).json({ 
      success: true, 
      deleted: result.rows[0] 
    });
  } catch (error) {
    console.error('[Admin Recipe] DELETE error:', error);
    return res.status(500).json({ error: 'Failed to delete recipe' });
  }
}
