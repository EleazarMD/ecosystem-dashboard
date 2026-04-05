import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';
const BACKUP_DIR = process.env.BACKUP_STORAGE_PATH || '/var/backups/ai-homelab';

async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    console.error('[Backup] Failed to create backup directory:', error);
  }
}

async function backupPostgres(target: string, compression: boolean): Promise<any> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `postgres-${target}-${timestamp}.sql${compression ? '.gz' : ''}`;
  const filepath = path.join(BACKUP_DIR, filename);
  
  try {
    const dbHost = process.env.DATABASE_HOST || 'localhost';
    const dbPort = process.env.DATABASE_PORT || '5432';
    const dbUser = process.env.DATABASE_USER || 'eleazar';
    
    let command = `PGPASSWORD="${process.env.DATABASE_PASSWORD || ''}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${target}`;
    
    if (compression) {
      command += ` | gzip > ${filepath}`;
    } else {
      command += ` > ${filepath}`;
    }
    
    await execAsync(command);
    
    const stats = await fs.stat(filepath);
    
    return {
      success: true,
      filepath,
      fileSize: stats.size,
      message: `PostgreSQL database ${target} backed up successfully`,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

async function backupNeo4j(target: string, compression: boolean): Promise<any> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `neo4j-${target}-${timestamp}.dump${compression ? '.gz' : ''}`;
  const filepath = path.join(BACKUP_DIR, filename);
  
  try {
    // Neo4j backup via docker exec
    const containerName = target === 'hermes' ? 'hermes-core' : 
                         target === 'story' ? 'story-intelligence' : 
                         'knowledge-graph-neo4j';
    
    let command = `docker exec ${containerName} neo4j-admin database dump neo4j --to-stdout`;
    
    if (compression) {
      command += ` | gzip > ${filepath}`;
    } else {
      command += ` > ${filepath}`;
    }
    
    await execAsync(command);
    
    const stats = await fs.stat(filepath);
    
    return {
      success: true,
      filepath,
      fileSize: stats.size,
      message: `Neo4j database ${target} backed up successfully`,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

async function backupChromaDB(target: string, compression: boolean): Promise<any> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `chromadb-${target}-${timestamp}.tar${compression ? '.gz' : ''}`;
  const filepath = path.join(BACKUP_DIR, filename);
  
  try {
    // ChromaDB backup via tar of data directory
    const chromaDataDir = '/var/lib/chromadb';
    
    let command = `tar -cf ${filepath} -C ${chromaDataDir} .`;
    
    if (compression) {
      command = `tar -czf ${filepath} -C ${chromaDataDir} .`;
    }
    
    await execAsync(command);
    
    const stats = await fs.stat(filepath);
    
    return {
      success: true,
      filepath,
      fileSize: stats.size,
      message: `ChromaDB backed up successfully`,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

async function backupConfigs(compression: boolean): Promise<any> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `configs-${timestamp}.tar${compression ? '.gz' : ''}`;
  const filepath = path.join(BACKUP_DIR, filename);
  
  try {
    // Build list of existing paths
    const potentialPaths = [
      '/etc/systemd/system',
      '/etc/ai-homelab',
      '/home/eleazar/.openclaw',
    ];
    
    const existingPaths: string[] = [];
    for (const p of potentialPaths) {
      try {
        await fs.access(p);
        existingPaths.push(p);
      } catch {
        // Path doesn't exist, skip it
      }
    }
    
    if (existingPaths.length === 0) {
      return {
        success: false,
        error: 'No configuration directories found to backup',
      };
    }
    
    const flags = compression ? 'czf' : 'cf';
    const command = `tar -${flags} ${filepath} ${existingPaths.join(' ')}`;
    
    await execAsync(command);
    
    const stats = await fs.stat(filepath);
    
    return {
      success: true,
      filepath,
      fileSize: stats.size,
      message: `Configuration files backed up successfully (${existingPaths.length} directories)`,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

async function backupVolumes(compression: boolean): Promise<any> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `volumes-${timestamp}.tar${compression ? '.gz' : ''}`;
  const filepath = path.join(BACKUP_DIR, filename);
  
  try {
    const volumeDir = '/var/lib/docker/volumes';
    
    let command = `tar -cf ${filepath} -C ${volumeDir} .`;
    
    if (compression) {
      command = `tar -czf ${filepath} -C ${volumeDir} .`;
    }
    
    await execAsync(command);
    
    const stats = await fs.stat(filepath);
    
    return {
      success: true,
      filepath,
      fileSize: stats.size,
      message: 'Docker volumes backed up successfully',
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
    const {
      target,
      compression = true,
      retention = 30,
    } = req.body;
    
    if (!target) {
      return res.status(400).json({ error: 'Target is required' });
    }
    
    await ensureBackupDir();
    
    const backupId = `BKP-${Date.now()}-${target}`;
    
    // Create backup record
    await pool.query(
      `INSERT INTO homelab_backups (id, backup_type, target, status, compression, retention_days)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [backupId, 'manual', target, 'running', compression, retention]
    );
    
    let result: any;
    
    // Execute backup based on target type
    if (target === 'postgres' || target === 'ecosystem_unified' || target === 'workspace') {
      result = await backupPostgres(target, compression);
    } else if (target === 'neo4j' || target === 'hermes' || target === 'story') {
      result = await backupNeo4j(target, compression);
    } else if (target === 'chromadb') {
      result = await backupChromaDB(target, compression);
    } else if (target === 'configs') {
      result = await backupConfigs(compression);
    } else if (target === 'volumes') {
      result = await backupVolumes(compression);
    } else if (target === 'full') {
      // Full backup - run all
      const results = await Promise.all([
        backupPostgres('ecosystem_unified', compression),
        backupPostgres('workspace', compression),
        backupNeo4j('hermes', compression),
        backupChromaDB('chromadb', compression),
        backupConfigs(compression),
      ]);
      
      result = {
        success: results.every(r => r.success),
        results,
        message: 'Full system backup completed',
      };
    } else {
      return res.status(400).json({ error: 'Invalid backup target' });
    }
    
    // Update backup record
    if (result.success) {
      await pool.query(
        `UPDATE homelab_backups 
         SET status = 'completed', file_path = $1, file_size = $2, completed_at = NOW()
         WHERE id = $3`,
        [result.filepath || 'multiple', result.fileSize || 0, backupId]
      );
    } else {
      await pool.query(
        `UPDATE homelab_backups 
         SET status = 'failed', error = $1
         WHERE id = $2`,
        [result.error, backupId]
      );
    }
    
    return res.status(result.success ? 200 : 500).json({
      backupId,
      target,
      result,
      createdAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Backup API] Create error:', error);
    return res.status(500).json({
      error: 'Backup creation failed',
      message: (error as Error).message,
    });
  }
}
