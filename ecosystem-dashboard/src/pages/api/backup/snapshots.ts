import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SNAPSHOT_DIR = '/Users/eleazar/Library/Mobile Documents/com~apple~CloudDocs/AI Homelab Backups/snapshots';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // List all snapshots with details
    const { stdout } = await execAsync(`ls -lt "${SNAPSHOT_DIR}"/*.tar.gz 2>/dev/null | head -10`);
    
    const snapshots = stdout
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(/\s+/);
        if (parts.length < 9) return null;
        
        const size = parts[4];
        const month = parts[5];
        const day = parts[6];
        const time = parts[7];
        const filename = parts.slice(8).join(' ');
        const basename = filename.split('/').pop() || '';
        
        // Parse type from filename
        const type = basename.includes('weekly') ? 'weekly' : 'daily';
        
        // Format size
        let formattedSize = size;
        if (size.endsWith('G')) {
          formattedSize = size;
        } else {
          const sizeNum = parseInt(size);
          if (sizeNum > 1024 * 1024 * 1024) {
            formattedSize = (sizeNum / (1024 * 1024 * 1024)).toFixed(1) + 'G';
          } else if (sizeNum > 1024 * 1024) {
            formattedSize = (sizeNum / (1024 * 1024)).toFixed(1) + 'M';
          }
        }
        
        return {
          name: basename,
          size: formattedSize,
          created: `${month} ${day} ${time}`,
          type
        };
      })
      .filter(Boolean);

    res.status(200).json({ snapshots });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({ 
      message: 'Failed to fetch snapshots',
      snapshots: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
