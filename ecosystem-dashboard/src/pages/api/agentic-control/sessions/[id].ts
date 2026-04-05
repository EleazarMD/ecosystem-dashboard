import { NextApiRequest, NextApiResponse } from 'next';
import SessionManager from '@/lib/sessions/session-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionManager = new SessionManager();
    const session = await sessionManager.getSession(id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      session
    });
    
  } catch (error: any) {
    console.error(`Error fetching session ${id}:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch session'
    });
  }
}
