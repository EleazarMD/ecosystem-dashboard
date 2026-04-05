/**
 * OpenClaw Research Handoff Notes API
 * POST /api/openclaw/research/[sessionId]/handoff-note
 * GET /api/openclaw/research/[sessionId]/handoff-note
 * 
 * Allows agents to leave structured notes for the next agent pickup:
 * - Current progress summary
 * - Next steps to take
 * - Blockers or waiting items
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

interface HandoffNote {
  note: string;
  nextSteps?: string[];
  blockers?: string[];
  completedSteps?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  estimatedTimeToComplete?: string;
  context?: {
    channel: string;
    agentId?: string;
  };
}

interface HandoffNoteResponse {
  success: boolean;
  noteId?: string;
  sessionId: string;
  notes?: Array<{
    noteId: string;
    note: string;
    nextSteps: string[];
    blockers: string[];
    completedSteps: string[];
    priority: string;
    createdAt: string;
    agentChannel: string;
  }>;
  error?: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HandoffNoteResponse | { error: string }>
) {
  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  // Ensure table exists
  await ensureHandoffNotesTable();

  if (req.method === 'GET') {
    return handleGetNotes(sessionId, res);
  } else if (req.method === 'POST') {
    return handleCreateNote(sessionId, req.body, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function ensureHandoffNotesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS research_handoff_notes (
      note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id VARCHAR(255) NOT NULL,
      note TEXT NOT NULL,
      next_steps JSONB DEFAULT '[]',
      blockers JSONB DEFAULT '[]',
      completed_steps JSONB DEFAULT '[]',
      priority VARCHAR(20) DEFAULT 'medium',
      estimated_time VARCHAR(100),
      agent_channel VARCHAR(100),
      agent_id VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      FOREIGN KEY (session_id) REFERENCES research_sessions(session_id) ON DELETE CASCADE
    )
  `).catch(() => {
    // Table might already exist or FK might fail - that's ok
  });

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_handoff_notes_session 
    ON research_handoff_notes(session_id, created_at DESC)
  `).catch(() => {});
}

async function handleGetNotes(
  sessionId: string,
  res: NextApiResponse<HandoffNoteResponse>
) {
  try {
    // Verify session exists
    const sessionCheck = await pool.query(
      'SELECT session_id FROM research_sessions WHERE session_id = $1',
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        sessionId,
        error: 'Session not found',
        timestamp: new Date().toISOString(),
      });
    }

    const notesResult = await pool.query(`
      SELECT 
        note_id,
        note,
        next_steps,
        blockers,
        completed_steps,
        priority,
        created_at,
        agent_channel
      FROM research_handoff_notes
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [sessionId]);

    return res.status(200).json({
      success: true,
      sessionId,
      notes: notesResult.rows.map(n => ({
        noteId: n.note_id,
        note: n.note,
        nextSteps: n.next_steps || [],
        blockers: n.blockers || [],
        completedSteps: n.completed_steps || [],
        priority: n.priority || 'medium',
        createdAt: n.created_at?.toISOString(),
        agentChannel: n.agent_channel || 'unknown',
      })),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Handoff Notes API] GET Error:', error);
    return res.status(500).json({
      success: false,
      sessionId,
      error: error instanceof Error ? error.message : 'Failed to fetch handoff notes',
      timestamp: new Date().toISOString(),
    });
  }
}

async function handleCreateNote(
  sessionId: string,
  body: HandoffNote,
  res: NextApiResponse<HandoffNoteResponse>
) {
  try {
    // Verify session exists
    const sessionCheck = await pool.query(
      'SELECT session_id FROM research_sessions WHERE session_id = $1',
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        sessionId,
        error: 'Session not found',
        timestamp: new Date().toISOString(),
      });
    }

    if (!body.note || body.note.trim().length === 0) {
      return res.status(400).json({
        success: false,
        sessionId,
        error: 'Note content is required',
        timestamp: new Date().toISOString(),
      });
    }

    const insertResult = await pool.query(`
      INSERT INTO research_handoff_notes (
        session_id,
        note,
        next_steps,
        blockers,
        completed_steps,
        priority,
        estimated_time,
        agent_channel,
        agent_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING note_id
    `, [
      sessionId,
      body.note,
      JSON.stringify(body.nextSteps || []),
      JSON.stringify(body.blockers || []),
      JSON.stringify(body.completedSteps || []),
      body.priority || 'medium',
      body.estimatedTimeToComplete,
      body.context?.channel || 'api',
      body.context?.agentId,
    ]);

    const noteId = insertResult.rows[0].note_id;

    console.log(`[Handoff Notes API] Created note ${noteId} for session ${sessionId}`);

    return res.status(201).json({
      success: true,
      noteId,
      sessionId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Handoff Notes API] POST Error:', error);
    return res.status(500).json({
      success: false,
      sessionId,
      error: error instanceof Error ? error.message : 'Failed to create handoff note',
      timestamp: new Date().toISOString(),
    });
  }
}
