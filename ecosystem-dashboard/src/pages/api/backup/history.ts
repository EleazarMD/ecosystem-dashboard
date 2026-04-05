import type { NextApiRequest, NextApiResponse } from 'next'
import { backupService } from '../../../lib/backup/service'

export interface BackupHistoryPoint {
  date: string;
  name: string; // Formatted date for chart display
  duration: number; // Minutes
  size: number; // GB
  success: number; // Percentage (0-100)
  status: 'success' | 'failed' | 'partial';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const days = parseInt(req.query.days as string) || 30
    const history = await backupService.getBackupHistoryTimeSeries(days)
    
    res.status(200).json({ 
      history,
      totalPoints: history.length 
    })
  } catch (error) {
    console.error('Error fetching backup history:', error)
    res.status(500).json({ 
      message: 'Failed to fetch backup history',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
