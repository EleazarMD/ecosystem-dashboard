import type { NextApiRequest, NextApiResponse } from 'next';
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
  const serviceKey = req.headers['x-internal-service-key'] as string;
  if (!serviceKey || serviceKey !== INTERNAL_SERVICE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        'SELECT * FROM homelab_incidents WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      
      return res.status(200).json({ incident: result.rows[0] });
      
    } catch (error) {
      console.error('[Incident API] Get error:', error);
      return res.status(500).json({
        error: 'Failed to get incident',
        message: (error as Error).message,
      });
    }
  }
  
  if (req.method === 'PATCH') {
    try {
      const allowedFields = [
        'status',
        'severity',
        'title',
        'description',
        'root_cause',
        'resolution',
        'runbook_executed',
        'ticket_id',
        'metadata',
      ];
      
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          values.push(
            field === 'metadata' ? JSON.stringify(req.body[field]) : req.body[field]
          );
          paramIndex++;
        }
      }
      
      // Handle status transitions
      if (req.body.status === 'acknowledged' && !updates.includes('acknowledged_at')) {
        updates.push(`acknowledged_at = NOW()`);
      }
      
      if (req.body.status === 'resolved' && !updates.includes('resolved_at')) {
        updates.push(`resolved_at = NOW()`);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      updates.push('updated_at = NOW()');
      
      const query = `
        UPDATE homelab_incidents 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      values.push(id);
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      
      return res.status(200).json({
        incident: result.rows[0],
        message: 'Incident updated',
      });
      
    } catch (error) {
      console.error('[Incident API] Update error:', error);
      return res.status(500).json({
        error: 'Failed to update incident',
        message: (error as Error).message,
      });
    }
  }
  
  if (req.method === 'DELETE') {
    try {
      const result = await pool.query(
        'DELETE FROM homelab_incidents WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      
      return res.status(200).json({
        message: 'Incident deleted',
        incident: result.rows[0],
      });
      
    } catch (error) {
      console.error('[Incident API] Delete error:', error);
      return res.status(500).json({
        error: 'Failed to delete incident',
        message: (error as Error).message,
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
