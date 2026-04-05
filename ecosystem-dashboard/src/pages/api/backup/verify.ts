import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

async function verifyBackupFile(filepath: string, target: string): Promise<any> {
  try {
    // Check file exists
    const stats = await fs.stat(filepath);
    
    if (stats.size === 0) {
      return {
        success: false,
        error: 'Backup file is empty',
      };
    }
    
    const isCompressed = filepath.endsWith('.gz');
    
    // Verify file integrity based on type
    if (filepath.includes('postgres')) {
      // Verify SQL dump
      if (isCompressed) {
        const { stdout } = await execAsync(`gunzip -t ${filepath} 2>&1`);
        return {
          success: true,
          fileSize: stats.size,
          compressed: true,
          message: 'PostgreSQL backup file is valid',
        };
      } else {
        // Basic SQL syntax check
        const { stdout } = await execAsync(`head -1 ${filepath}`);
        const isValid = stdout.includes('PostgreSQL') || stdout.includes('--');
        return {
          success: isValid,
          fileSize: stats.size,
          compressed: false,
          message: isValid ? 'PostgreSQL backup file is valid' : 'Invalid SQL dump format',
        };
      }
    } else if (filepath.includes('neo4j')) {
      // Verify Neo4j dump
      if (isCompressed) {
        await execAsync(`gunzip -t ${filepath}`);
      }
      return {
        success: true,
        fileSize: stats.size,
        compressed: isCompressed,
        message: 'Neo4j backup file is valid',
      };
    } else if (filepath.includes('chromadb') || filepath.includes('configs') || filepath.includes('volumes')) {
      // Verify tar archive
      if (isCompressed) {
        await execAsync(`tar -tzf ${filepath} > /dev/null`);
      } else {
        await execAsync(`tar -tf ${filepath} > /dev/null`);
      }
      return {
        success: true,
        fileSize: stats.size,
        compressed: isCompressed,
        message: 'Archive backup file is valid',
      };
    }
    
    return {
      success: true,
      fileSize: stats.size,
      message: 'Backup file exists and is readable',
    };
    
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey = req.headers['x-internal-service-key'] as string;
  if (!serviceKey || serviceKey !== INTERNAL_SERVICE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { backupId } = req.body;
    
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
    
    if (backup.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Cannot verify incomplete backup',
        status: backup.status,
      });
    }
    
    // Verify backup file
    const verifyResult = await verifyBackupFile(backup.file_path, backup.target);
    
    // Update verification timestamp if successful
    if (verifyResult.success) {
      await pool.query(
        'UPDATE homelab_backups SET verified_at = NOW() WHERE id = $1',
        [backupId]
      );
    }
    
    return res.status(verifyResult.success ? 200 : 500).json({
      backupId,
      target: backup.target,
      verification: verifyResult,
      verifiedAt: verifyResult.success ? new Date().toISOString() : null,
    });
    
  } catch (error) {
    console.error('[Backup API] Verify error:', error);
    return res.status(500).json({
      error: 'Verification failed',
      message: (error as Error).message,
    });
  }
}
