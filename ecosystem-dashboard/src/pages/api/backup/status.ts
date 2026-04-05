import type { NextApiRequest, NextApiResponse } from 'next';
import { backupService } from '../../../lib/backup/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const status = await backupService.getBackupStatus();
    res.status(200).json(status);
  } catch (error) {
    console.error('Error fetching backup status:', error);
    res.status(500).json({ 
      message: 'Failed to fetch backup status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
