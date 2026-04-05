/**
 * Admin API: Goose Recipes Management
 * 
 * CRUD operations for child-safe Goose recipes
 * Platform admin only - parents do not have access
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

  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res, session.user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      search, 
      theme, 
      targetAudience, 
      minAge, 
      maxAge,
      limit = '50',
      offset = '0'
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by target audience (child recipes)
    if (targetAudience) {
      whereClause += ` AND target_audience = $${paramIndex}`;
      params.push(targetAudience);
      paramIndex++;
    }

    // Filter by theme
    if (theme) {
      whereClause += ` AND theme = $${paramIndex}`;
      params.push(theme);
      paramIndex++;
    }

    // Filter by age range
    if (minAge) {
      whereClause += ` AND (min_age IS NULL OR min_age <= $${paramIndex})`;
      params.push(parseInt(minAge as string));
      paramIndex++;
    }
    if (maxAge) {
      whereClause += ` AND (max_age IS NULL OR max_age >= $${paramIndex})`;
      params.push(parseInt(maxAge as string));
      paramIndex++;
    }

    // Search by name or character name
    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR character_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM goose.recipes ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get recipes with pagination
    params.push(parseInt(limit as string));
    params.push(parseInt(offset as string));

    const result = await query(
      `SELECT 
        id,
        name,
        description,
        category,
        instructions,
        system_prompt,
        parameters,
        tags,
        is_public,
        usage_count,
        created_at,
        updated_at,
        created_by,
        target_audience,
        min_age,
        max_age,
        character_name,
        character_emoji,
        character_personality,
        is_seasonal,
        season_start,
        season_end,
        educational_focus,
        theme,
        icon_path
      FROM goose.recipes 
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    // Get available themes for filter dropdown
    const themesResult = await query(
      `SELECT DISTINCT theme FROM goose.recipes WHERE theme IS NOT NULL ORDER BY theme`
    );

    return res.status(200).json({
      recipes: result.rows,
      total,
      themes: themesResult.rows.map(r => r.theme),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('[Admin Recipes] GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch recipes' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, userId: string) {
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

    if (!name || !instructions) {
      return res.status(400).json({ error: 'Name and instructions are required' });
    }

    const result = await query(
      `INSERT INTO goose.recipes (
        name,
        description,
        category,
        instructions,
        system_prompt,
        parameters,
        tags,
        is_public,
        target_audience,
        min_age,
        max_age,
        character_name,
        character_emoji,
        character_personality,
        is_seasonal,
        season_start,
        season_end,
        educational_focus,
        theme,
        icon_path,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $21)
      RETURNING *`,
      [
        name,
        description || null,
        category || 'general',
        instructions,
        systemPrompt || null,
        JSON.stringify(parameters || {}),
        JSON.stringify(tags || []),
        isPublic || false,
        targetAudience || 'all',
        minAge || null,
        maxAge || null,
        characterName || null,
        characterEmoji || null,
        characterPersonality || null,
        isSeasonal || false,
        seasonStart || null,
        seasonEnd || null,
        JSON.stringify(educationalFocus || []),
        theme || null,
        iconPath || null,
        userId,
      ]
    );

    return res.status(201).json({ recipe: result.rows[0] });
  } catch (error) {
    console.error('[Admin Recipes] POST error:', error);
    return res.status(500).json({ error: 'Failed to create recipe' });
  }
}
