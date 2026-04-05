/**
 * Tickets API
 * GET  /api/tickets       - List tickets (filterable by status, priority, category, assigned_to)
 * POST /api/tickets       - Create a new ticket (agents or dashboard)
 * 
 * Authentication:
 * - NextAuth session (web dashboard)
 * - X-API-Key header (Nova Agent, OpenClaw, iOS app)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check for internal service key (OpenClaw, Nova)
  const serviceKey = req.headers['x-internal-service-key'] as string;
  let userId: string | undefined;

  if (serviceKey && serviceKey === INTERNAL_SERVICE_KEY) {
    // Internal service authenticated
    userId = 'eleazar'; // Default user for internal services
  } else {
    // Web dashboard authentication
    const session = await getServerSession(req, res, authOptions);
    userId = getMobileOrSessionUserId(session?.user?.id, req);
  }

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    if (req.method === 'GET') {
      const {
        status,
        priority,
        category,
        assigned_to,
        source_agent,
        component,
        page = '1',
        per_page = '50',
        sort = 'created_at',
        order = 'desc',
      } = req.query;

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      if (status) {
        conditions.push(`status = $${paramIdx++}`);
        params.push(status);
      }
      if (priority) {
        conditions.push(`priority = $${paramIdx++}`);
        params.push(priority);
      }
      if (category) {
        conditions.push(`category = $${paramIdx++}`);
        params.push(category);
      }
      if (assigned_to) {
        conditions.push(`assigned_to = $${paramIdx++}`);
        params.push(assigned_to);
      }
      if (source_agent) {
        conditions.push(`source_agent = $${paramIdx++}`);
        params.push(source_agent);
      }
      if (component) {
        conditions.push(`component ILIKE $${paramIdx++}`);
        params.push(`%${component}%`);
      }

      const whereClause = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : '';

      // Validate sort column
      const allowedSorts = ['created_at', 'updated_at', 'priority', 'status', 'title'];
      const sortCol = allowedSorts.includes(sort as string) ? sort : 'created_at';
      const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const perPage = Math.min(100, Math.max(1, parseInt(per_page as string, 10)));
      const offset = (pageNum - 1) * perPage;

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM homelab_tickets ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count, 10);

      const ticketsResult = await pool.query(
        `SELECT * FROM homelab_tickets ${whereClause}
         ORDER BY ${sortCol} ${sortOrder}
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        [...params, perPage, offset]
      );

      return res.status(200).json({
        tickets: ticketsResult.rows,
        total,
        page: pageNum,
        per_page: perPage,
        has_more: offset + perPage < total,
      });
    }

    if (req.method === 'POST') {
      const {
        title,
        description,
        priority = 'medium',
        category,
        service_name,
        tags = [],
        assigned_to,
        created_by = 'api',
        metadata = {},
      } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }

      const result = await pool.query(
        `INSERT INTO homelab_tickets (
          user_id, title, description, priority, category, service_name,
          tags, assigned_to, created_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          userId,
          title,
          description || '',
          priority,
          category || null,
          service_name || null,
          JSON.stringify(tags),
          assigned_to || null,
          created_by,
          JSON.stringify(metadata),
        ]
      );

      return res.status(201).json({
        ticket: result.rows[0],
        message: 'Ticket created',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[Tickets API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
