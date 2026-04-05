import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import * as fs from 'fs/promises';

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
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey = req.headers['x-internal-service-key'] as string;
  if (!serviceKey || serviceKey !== INTERNAL_SERVICE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { backupId } = req.query;
    
    if (!backupId) {
      return res.status(400).json({ error: 'Backup ID is required' });
    }
    
    // Get backup details
    const backupResult = await pool.query(
      'SELECT * FROM homelab_backups WHERE id = $1',
      [backupId]
    );
    
    if (backupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    const backup = backupResult.rows[0];
    
    // Delete backup file from disk
    if (backup.file_path) {
      try {
        await fs.unlink(backup.file_path);
      } catch (error) {
        console.error('[Backup API] Failed to delete file:', error);
        // Continue even if file deletion fails
      }
    }
    
    // Delete backup record from database
    await pool.query('DELETE FROM homelab_backups WHERE id = $1', [backupId]);
    
    return res.status(200).json({
      message: 'Backup deleted',
      backupId,
      target: backup.target,
    });
    
  } catch (error) {
    console.error('[Backup API] Delete error:', error);
    return res.status(500).json({
      error: 'Failed to delete backup',
      message: (error as Error).message,
    });
  }
}
