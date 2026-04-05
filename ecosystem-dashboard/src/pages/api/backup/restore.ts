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

async function restorePostgres(backupPath: string, target: string): Promise<any> {
  try {
    const dbHost = process.env.DATABASE_HOST || 'localhost';
    const dbPort = process.env.DATABASE_PORT || '5432';
    const dbUser = process.env.DATABASE_USER || 'eleazar';
    
    const isCompressed = backupPath.endsWith('.gz');
    
    let command = '';
    if (isCompressed) {
      command = `gunzip -c ${backupPath} | PGPASSWORD="${process.env.DATABASE_PASSWORD || ''}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${target}`;
    } else {
      command = `PGPASSWORD="${process.env.DATABASE_PASSWORD || ''}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${target} < ${backupPath}`;
    }
    
    await execAsync(command);
    
    return {
      success: true,
      message: `PostgreSQL database ${target} restored successfully`,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

async function restoreNeo4j(backupPath: string, target: string): Promise<any> {
  try {
    const containerName = target === 'hermes' ? 'hermes-core' : 
                         target === 'story' ? 'story-intelligence' : 
                         'knowledge-graph-neo4j';
    
    const isCompressed = backupPath.endsWith('.gz');
    
    // Stop Neo4j database
    await execAsync(`docker exec ${containerName} neo4j stop`);
    
    let command = '';
    if (isCompressed) {
      command = `gunzip -c ${backupPath} | docker exec -i ${containerName} neo4j-admin database load neo4j --from-stdin --overwrite-destination=true`;
    } else {
      command = `cat ${backupPath} | docker exec -i ${containerName} neo4j-admin database load neo4j --from-stdin --overwrite-destination=true`;
    }
    
    await execAsync(command);
    
    // Start Neo4j database
    await execAsync(`docker exec ${containerName} neo4j start`);
    
    return {
      success: true,
      message: `Neo4j database ${target} restored successfully`,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

async function restoreChromaDB(backupPath: string): Promise<any> {
  try {
    const chromaDataDir = '/var/lib/chromadb';
    const isCompressed = backupPath.endsWith('.gz');
    
    // Stop ChromaDB service
    await execAsync('docker stop chromadb-service || true');
    
    // Clear existing data
    await execAsync(`rm -rf ${chromaDataDir}/*`);
    
    let command = '';
    if (isCompressed) {
      command = `tar -xzf ${backupPath} -C ${chromaDataDir}`;
    } else {
      command = `tar -xf ${backupPath} -C ${chromaDataDir}`;
    }
    
    await execAsync(command);
    
    // Start ChromaDB service
    await execAsync('docker start chromadb-service || true');
    
    return {
      success: true,
      message: 'ChromaDB restored successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

async function restoreConfigs(backupPath: string): Promise<any> {
  try {
    const isCompressed = backupPath.endsWith('.gz');
    
    let command = '';
    if (isCompressed) {
      command = `tar -xzf ${backupPath} -C /`;
    } else {
      command = `tar -xf ${backupPath} -C /`;
    }
    
    await execAsync(command);
    
    return {
      success: true,
      message: 'Configuration files restored successfully',
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
      return res.status(400).json({ error: 'Backup is not in completed state' });
    }
    
    // Verify backup file exists
    try {
      await fs.access(backup.file_path);
    } catch (error) {
      return res.status(404).json({ error: 'Backup file not found on disk' });
    }
    
    let result: any;
    const target = backup.target;
    
    // Execute restore based on backup type
    if (target === 'postgres' || target === 'ecosystem_unified' || target === 'workspace') {
      result = await restorePostgres(backup.file_path, target);
    } else if (target === 'neo4j' || target === 'hermes' || target === 'story') {
      result = await restoreNeo4j(backup.file_path, target);
    } else if (target === 'chromadb') {
      result = await restoreChromaDB(backup.file_path);
    } else if (target === 'configs') {
      result = await restoreConfigs(backup.file_path);
    } else {
      return res.status(400).json({ error: 'Unsupported restore target' });
    }
    
    return res.status(result.success ? 200 : 500).json({
      backupId,
      target,
      result,
      restoredAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Backup API] Restore error:', error);
    return res.status(500).json({
      error: 'Restore failed',
      message: (error as Error).message,
    });
  }
}
