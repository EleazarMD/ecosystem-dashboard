import type { NextApiRequest, NextApiResponse } from 'next';
import { backupService } from '../../../lib/backup/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const lines = parseInt(req.query.lines as string) || 100;
    const logEntries = await backupService.getBackupLogs(lines);

    // Convert structured log entries back to formatted strings for display
    const logs = logEntries.map((entry) =>
      `${new Date(entry.timestamp).toISOString()} [${entry.level}] ${entry.message}`
    );

    res.status(200).json({ logs });
  } catch (error) {
    console.error('Error fetching backup logs:', error);
    res.status(500).json({
      message: 'Failed to fetch backup logs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
