import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BACKUP_SCRIPT = '/Users/eleazar/Projects/AIHomelab/scripts/backup.sh';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Run backup script in background
    exec(`bash "${BACKUP_SCRIPT}" > /dev/null 2>&1 &`);
    
    res.status(200).json({ 
      success: true,
      message: 'Backup started successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting backup:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to start backup',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
