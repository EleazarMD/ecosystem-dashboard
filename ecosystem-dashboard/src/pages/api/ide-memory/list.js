const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const backupDir = path.join(process.cwd(), 'backups', 'ide-memory');
    
    if (!fs.existsSync(backupDir)) {
      return res.status(200).json([]);
    }
    
    const files = fs.readdirSync(backupDir).filter(file => file.endsWith('.json'));
    const memories = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(backupDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const memory = JSON.parse(content);
        memories.push(memory);
      } catch (fileError) {
        console.warn('Failed to parse memory file:', file, fileError);
      }
    }
    
    res.status(200).json(memories);
  } catch (error) {
    console.error('Error reading memory files:', error);
    res.status(500).json({ error: 'Failed to read memory files' });
  }
}
