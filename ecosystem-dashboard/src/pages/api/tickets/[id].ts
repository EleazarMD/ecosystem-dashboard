/**
 * Single Ticket API
 * GET   /api/tickets/[id]  - Get ticket by ID
 * PATCH /api/tickets/[id]  - Update ticket fields
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
    userId = 'eleazar';
  } else {
    const session = await getServerSession(req, res, authOptions);
    userId = getMobileOrSessionUserId(session?.user?.id, req);
  }

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  try {
    if (req.method === 'GET') {
      const result = await pool.query(
        'SELECT * FROM homelab_tickets WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      return res.status(200).json({ ticket: result.rows[0] });
    }

    if (req.method === 'PATCH') {
      // Build dynamic SET clause from provided fields
      const allowedFields = [
        'title', 'description', 'status', 'priority',
        'category', 'service_name', 'tags', 'assigned_to', 'metadata',
      ];

      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          const value = ['tags', 'metadata'].includes(field)
            ? JSON.stringify(req.body[field])
            : req.body[field];
          setClauses.push(`${field} = $${paramIdx++}`);
          params.push(value);
        }
      }

      // Always update updated_at
      setClauses.push(`updated_at = NOW()`);

      // Handle status transitions
      if (req.body.status === 'closed' || req.body.status === 'resolved') {
        setClauses.push(`resolved_at = NOW()`);
        if (req.body.resolved_by) {
          setClauses.push(`resolved_by = $${paramIdx++}`);
          params.push(req.body.resolved_by);
        }
      }

      if (setClauses.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      params.push(id);
      const result = await pool.query(
        `UPDATE homelab_tickets SET ${setClauses.join(', ')}
         WHERE id = $${paramIdx}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      return res.status(200).json({
        ticket: result.rows[0],
        message: 'Ticket updated',
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
