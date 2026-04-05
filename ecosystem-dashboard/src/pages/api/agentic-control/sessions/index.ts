import { NextApiRequest, NextApiResponse } from 'next';
import SessionManager from '@/lib/sessions/session-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentId, limit = '50', active = 'false', search } = req.query;
    
    const sessionManager = new SessionManager();
    
    // Handle search
    if (search && typeof search === 'string') {
      const results = await sessionManager.searchSessions(search, parseInt(limit as string));
      return res.status(200).json({
        success: true,
        sessions: results,
        total: results.length,
        query: search
      });
    }
    
    // Handle active sessions filter
    if (active === 'true') {
      const activeSessions = await sessionManager.getActiveSessions();
      return res.status(200).json({
        success: true,
        sessions: activeSessions,
        total: activeSessions.length,
        filter: 'active'
      });
    }
    
    // Get all sessions
    const sessions = await sessionManager.getSessionSummaries(parseInt(limit as string));
    
    return res.status(200).json({
      success: true,
      sessions,
      total: sessions.length
    });
    
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch sessions'
    });
  }
}
