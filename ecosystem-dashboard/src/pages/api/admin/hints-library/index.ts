/**
 * Admin API: Hints Library Management
 * 
 * CRUD operations for the multi-tenant hints library
 * Platform admin only
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { query } from '@/lib/db';
import { 
  getAllHints, 
  createHint, 
  HintType 
} from '@/lib/platform/hints-library-service';

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
      return handlePost(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      search, 
      theme, 
      hintType,
      subjectArea,
      limit = '50',
      offset = '0'
    } = req.query;

    const result = await getAllHints({
      search: search as string,
      theme: theme as string,
      hintType: hintType as HintType,
      subjectArea: subjectArea as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    // Get available themes and subjects for filter dropdowns
    const themesResult = await query(
      `SELECT DISTINCT theme FROM child_learning.hints_library WHERE theme IS NOT NULL ORDER BY theme`
    );
    const subjectsResult = await query(
      `SELECT DISTINCT subject_area FROM child_learning.hints_library WHERE subject_area IS NOT NULL ORDER BY subject_area`
    );

    return res.status(200).json({
      hints: result.hints,
      total: result.total,
      themes: themesResult.rows.map(r => r.theme),
      subjects: subjectsResult.rows.map(r => r.subject_area),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('[Admin Hints] GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch hints' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      name,
      description,
      hintType,
      content,
      targetAudience,
      minAge,
      maxAge,
      gradeLevel,
      theme,
      characterName,
      learningStyle,
      educationalFocus,
      subjectArea,
      difficultyLevel,
      tags,
    } = req.body;

    if (!name || !content || !hintType) {
      return res.status(400).json({ error: 'Name, content, and hintType are required' });
    }

    const hint = await createHint({
      name,
      description,
      hintType,
      content,
      targetAudience: targetAudience || 'child',
      minAge,
      maxAge,
      gradeLevel,
      theme,
      characterName,
      learningStyle,
      educationalFocus: educationalFocus || [],
      subjectArea,
      difficultyLevel: difficultyLevel || 'beginner',
      tags: tags || [],
    });

    return res.status(201).json({ hint });
  } catch (error) {
    console.error('[Admin Hints] POST error:', error);
    return res.status(500).json({ error: 'Failed to create hint' });
  }
}
