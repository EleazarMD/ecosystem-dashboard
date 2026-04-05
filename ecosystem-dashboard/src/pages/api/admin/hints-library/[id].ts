/**
 * Admin API: Single Hint Management
 * 
 * GET, PUT, DELETE operations for individual hints
 * Platform admin only
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { query } from '@/lib/db';
import { updateHint, deleteHint } from '@/lib/platform/hints-library-service';

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
    return res.status(400).json({ error: 'Hint ID required' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, id);
    case 'PUT':
      return handlePut(req, res, id);
    case 'DELETE':
      return handleDelete(req, res, id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const result = await query(
      `SELECT * FROM child_learning.hints_library WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hint not found' });
    }

    return res.status(200).json({ hint: result.rows[0] });
  } catch (error) {
    console.error('[Admin Hint] GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch hint' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const hint = await updateHint(id, req.body);

    if (!hint) {
      return res.status(404).json({ error: 'Hint not found or no updates provided' });
    }

    return res.status(200).json({ hint });
  } catch (error) {
    console.error('[Admin Hint] PUT error:', error);
    return res.status(500).json({ error: 'Failed to update hint' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const deleted = await deleteHint(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Hint not found' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Admin Hint] DELETE error:', error);
    return res.status(500).json({ error: 'Failed to delete hint' });
  }
}
