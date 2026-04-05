import { NextApiRequest, NextApiResponse } from 'next';
import SessionManager from '@/lib/sessions/session-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, format = 'json' } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionManager = new SessionManager();
    let content: string;
    let contentType: string;
    let filename: string;
    
    switch (format) {
      case 'yaml':
        content = await sessionManager.exportSessionYAML(id);
        contentType = 'text/yaml';
        filename = `${id}.yaml`;
        break;
        
      case 'markdown':
      case 'md':
        content = await sessionManager.exportSessionMarkdown(id);
        contentType = 'text/markdown';
        filename = `${id}.md`;
        break;
        
      case 'json':
      default:
        content = await sessionManager.exportSessionJSON(id);
        contentType = 'application/json';
        filename = `${id}.json`;
        break;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(content);
    
  } catch (error: any) {
    console.error(`Error exporting session ${id}:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to export session'
    });
  }
}
