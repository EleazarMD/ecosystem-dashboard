/**
 * Children's Books API
 * 
 * List and manage books in the children's library
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow admin/administrator roles
  const userRole = (session.user as any).role || (session.user as any).userType;
  if (!['admin', 'administrator'].includes(userRole) && session.user.accountType === 'child') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { childId, series } = req.query;

  try {
    let query = `
      SELECT 
        b.*,
        u.name as uploaded_by_name,
        c.name as assigned_child_name
      FROM children_books b
      LEFT JOIN users u ON b.uploaded_by = u.id
      LEFT JOIN users c ON b.assigned_child_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (childId) {
      query += ` AND b.assigned_child_id = $${paramIndex}`;
      params.push(childId);
      paramIndex++;
    }

    if (series) {
      query += ` AND b.series_name ILIKE $${paramIndex}`;
      params.push(`%${series}%`);
      paramIndex++;
    }

    query += ` ORDER BY b.series_name, b.series_volume, b.title`;

    const result = await pool.query(query, params);

    // Group by series
    const booksBySeries: Record<string, any[]> = {};
    const standaloneBooks: any[] = [];

    for (const book of result.rows) {
      if (book.series_name) {
        if (!booksBySeries[book.series_name]) {
          booksBySeries[book.series_name] = [];
        }
        booksBySeries[book.series_name].push(book);
      } else {
        standaloneBooks.push(book);
      }
    }

    return res.status(200).json({
      books: result.rows,
      booksBySeries,
      standaloneBooks,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[Books API] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch books' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { bookId } = req.body;

  if (!bookId) {
    return res.status(400).json({ error: 'Book ID required' });
  }

  try {
    // Get file path before deleting
    const bookResult = await pool.query(
      'SELECT file_path FROM children_books WHERE id = $1',
      [bookId]
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Delete from database
    await pool.query('DELETE FROM children_books WHERE id = $1', [bookId]);

    // Optionally delete file (commented out for safety)
    // const fs = require('fs');
    // if (fs.existsSync(bookResult.rows[0].file_path)) {
    //   fs.unlinkSync(bookResult.rows[0].file_path);
    // }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Books API] Delete error:', error);
    return res.status(500).json({ error: 'Failed to delete book' });
  }
}
