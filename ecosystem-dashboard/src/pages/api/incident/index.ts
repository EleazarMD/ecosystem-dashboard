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

  if (req.method === 'GET') {
    try {
      const { status, severity, service, limit = '50', offset = '0' } = req.query;
      
      let query = 'SELECT * FROM homelab_incidents WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (severity) {
        query += ` AND severity = $${paramIndex}`;
        params.push(severity);
        paramIndex++;
      }
      
      if (service) {
        query += ` AND service = $${paramIndex}`;
        params.push(service);
        paramIndex++;
      }
      
      query += ' ORDER BY detected_at DESC';
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));
      
      const result = await pool.query(query, params);
      
      return res.status(200).json({
        incidents: result.rows,
        count: result.rows.length,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      });
      
    } catch (error) {
      console.error('[Incident API] List error:', error);
      return res.status(500).json({
        error: 'Failed to list incidents',
        message: (error as Error).message,
      });
    }
  }
  
  if (req.method === 'POST') {
    try {
      const {
        incidentType,
        service,
        severity,
        title,
        description,
        metadata = {},
      } = req.body;
      
      if (!incidentType || !severity || !title) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['incidentType', 'severity', 'title'],
        });
      }
      
      const incidentId = `INC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      
      const result = await pool.query(
        `INSERT INTO homelab_incidents 
         (id, incident_type, service, severity, status, title, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          incidentId,
          incidentType,
          service || null,
          severity,
          'open',
          title,
          description || null,
          JSON.stringify(metadata),
        ]
      );
      
      return res.status(201).json({
        incident: result.rows[0],
        message: 'Incident created',
      });
      
    } catch (error) {
      console.error('[Incident API] Create error:', error);
      return res.status(500).json({
        error: 'Failed to create incident',
        message: (error as Error).message,
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
