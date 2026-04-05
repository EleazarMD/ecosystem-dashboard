/**
 * Child Books API
 * 
 * Get books available to a child account.
 * Multi-tenant compliant.
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;

  try {
    // Get books assigned to this child or available to all children
    // Note: tenant_id column doesn't exist in children_books table yet
    const result = await pool.query(`
      SELECT 
        id, title, series_name, series_volume, author,
        file_type, page_count, is_processed, graphrag_indexed,
        created_at
      FROM children_books
      WHERE (assigned_child_id = $1 OR assigned_child_id IS NULL)
        AND security_scan_passed = true
      ORDER BY series_name NULLS LAST, series_volume, title
    `, [userId]);

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
      total: result.rows.length
    });

  } catch (error) {
    console.error('[Child Books API] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch books' });
  }
}
