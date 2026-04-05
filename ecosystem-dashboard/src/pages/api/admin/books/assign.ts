/**
 * Book Assignment API
 * 
 * Assign or reassign books to specific children or make them available to all
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  
  // Only admins and parents can assign books
  if (user.accountType !== 'admin' && user.accountType !== 'parent') {
    return res.status(403).json({ error: 'Forbidden: Only admins and parents can assign books' });
  }

  const { bookId, bookIds, childId } = req.body;

  if (!bookId && !bookIds) {
    return res.status(400).json({ error: 'bookId or bookIds required' });
  }

  try {
    // Verify child exists (if childId provided)
    if (childId) {
      const childCheck = await pool.query(
        `SELECT id FROM users 
         WHERE id = $1 
           AND account_type = 'child'`,
        [childId]
      );

      if (childCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Child not found' });
      }
    }

    // Handle single book assignment
    if (bookId) {
      const result = await pool.query(
        `UPDATE children_books 
         SET assigned_child_id = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, title, assigned_child_id`,
        [childId || null, bookId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Book not found or access denied' });
      }

      return res.status(200).json({
        success: true,
        book: result.rows[0],
        message: childId 
          ? 'Book assigned to child' 
          : 'Book made available to all children'
      });
    }

    // Handle bulk assignment
    if (bookIds && Array.isArray(bookIds)) {
      const result = await pool.query(
        `UPDATE children_books 
         SET assigned_child_id = $1,
             updated_at = NOW()
         WHERE id = ANY($2::uuid[])
         RETURNING id, title`,
        [childId || null, bookIds]
      );

      return res.status(200).json({
        success: true,
        updatedCount: result.rows.length,
        books: result.rows,
        message: childId
          ? `${result.rows.length} books assigned to child`
          : `${result.rows.length} books made available to all children`
      });
    }

    return res.status(400).json({ error: 'Invalid request' });

  } catch (error) {
    console.error('[Book Assignment API] Error:', error);
    return res.status(500).json({ error: 'Failed to assign book' });
  }
}
