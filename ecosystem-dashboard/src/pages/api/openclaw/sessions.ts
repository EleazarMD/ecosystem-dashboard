import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

interface BrowserSession {
  id: string;
  url: string;
  title: string;
  status: 'idle' | 'active' | 'awaiting_approval' | 'completed' | 'error';
  confidence: number;
  task: string;
  agent: string;
  userId: string;
  startTime: string;
  lastActivity: string;
  requiresApproval: boolean;
  approvalId?: string;
  novncUrl: string;
  cloudflareUrl?: string;
}

const browserSessions: Map<string, BrowserSession> = new Map();
const CLOUDFLARE_TUNNEL_URL = process.env.CLOUDFLARE_TUNNEL_URL || 'https://openclaw-browser.your-tunnel.workers.dev';
const NOVNC_BASE_URL = process.env.NOVNC_BASE_URL || 'http://localhost:6080';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user?.email || 'unknown';

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, userId);
    case 'POST':
      return handlePost(req, res, userId);
    case 'PATCH':
      return handlePatch(req, res, userId);
    case 'DELETE':
      return handleDelete(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { id, status } = req.query;

  try {
    let sessions = Array.from(browserSessions.values()).filter(
      s => s.userId === userId || s.userId === 'system'
    );

    if (id && typeof id === 'string') {
      const session = browserSessions.get(id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      return res.status(200).json({ session });
    }

    if (status && typeof status === 'string') {
      sessions = sessions.filter(s => s.status === status);
    }

    sessions.sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );

    return res.status(200).json({ 
      sessions,
      count: sessions.length,
      active: sessions.filter(s => s.status === 'active').length,
      awaitingApproval: sessions.filter(s => s.status === 'awaiting_approval').length,
    });
  } catch (error) {
    console.error('Error fetching browser sessions:', error);
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { 
      task, 
      url, 
      agent = 'OpenClaw',
      confidence = 100,
      requiresApproval = false,
    } = req.body;

    if (!task) {
      return res.status(400).json({ error: 'Task description required' });
    }

    const id = `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const browserSession: BrowserSession = {
      id,
      url: url || 'about:blank',
      title: task,
      status: 'active',
      confidence,
      task,
      agent,
      userId,
      startTime: now,
      lastActivity: now,
      requiresApproval,
      novncUrl: `${NOVNC_BASE_URL}/vnc.html?autoconnect=true&resize=scale`,
      cloudflareUrl: CLOUDFLARE_TUNNEL_URL,
    };

    browserSessions.set(id, browserSession);

    console.log(`[Browser Oversight] Session created: ${id} for task: ${task}`);

    return res.status(201).json({ 
      success: true,
      session: browserSession,
      message: 'Browser session created successfully'
    });
  } catch (error) {
    console.error('Error creating browser session:', error);
    return res.status(500).json({ error: 'Failed to create session' });
  }
}

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { id } = req.query;
    const updates = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = browserSessions.get(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (updates.status) session.status = updates.status;
    if (updates.confidence !== undefined) session.confidence = updates.confidence;
    if (updates.url) session.url = updates.url;
    if (updates.title) session.title = updates.title;
    if (updates.requiresApproval !== undefined) session.requiresApproval = updates.requiresApproval;
    if (updates.approvalId) session.approvalId = updates.approvalId;
    
    session.lastActivity = new Date().toISOString();

    browserSessions.set(id, session);

    console.log(`[Browser Oversight] Session updated: ${id}`, updates);

    return res.status(200).json({ 
      success: true,
      session,
      message: 'Session updated successfully'
    });
  } catch (error) {
    console.error('Error updating browser session:', error);
    return res.status(500).json({ error: 'Failed to update session' });
  }
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = browserSessions.get(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    browserSessions.delete(id);

    console.log(`[Browser Oversight] Session deleted: ${id}`);

    return res.status(200).json({ 
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting browser session:', error);
    return res.status(500).json({ error: 'Failed to delete session' });
  }
}

setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000;

  for (const [id, session] of browserSessions.entries()) {
    const lastActivity = new Date(session.lastActivity).getTime();
    if (now - lastActivity > maxAge) {
      console.log(`[Browser Oversight] Cleaning up old session: ${id}`);
      browserSessions.delete(id);
    }
  }
}, 5 * 60 * 1000);
