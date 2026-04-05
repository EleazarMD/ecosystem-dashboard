import type { NextApiRequest, NextApiResponse } from 'next';
import { backupService } from '../../../lib/backup/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const metrics = await backupService.getBackupMetrics();
    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching backup metrics:', error);
    res.status(500).json({ 
      message: 'Failed to fetch backup metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
