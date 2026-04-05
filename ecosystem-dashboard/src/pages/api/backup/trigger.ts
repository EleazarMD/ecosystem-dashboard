import type { NextApiRequest, NextApiResponse } from 'next'
import { backupService } from '../../../lib/backup/service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const result = await backupService.triggerBackup()
    
    if (result.success) {
      res.status(200).json({ 
        message: result.message,
        success: true 
      })
    } else {
      res.status(400).json({ 
        message: result.message,
        success: false 
      })
    }
  } catch (error) {
    console.error('Error triggering backup:', error)
    res.status(500).json({ 
      message: 'Failed to trigger backup',
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    })
  }
}
