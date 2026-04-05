/**
 * OpenClaw Research Context Summary API
 * GET /api/openclaw/research/[sessionId]/context-summary
 * 
 * Returns a condensed summary for agent pickup, including:
 * - Original query + key findings
 * - Current status + completion %
 * - Related sessions (parent, children, siblings)
 * - Identified gaps + suggested next steps
 * - Handoff notes from previous agents
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

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'openclaw-gateway-2024-key';

interface ContextSummaryResponse {
  sessionId: string;
  status: string;
  progress: number;
  
  // Core research info
  query: string;
  model: string;
  createdAt: string;
  lastActivity: string;
  
  // Condensed findings (for quick agent pickup)
  keyFindings?: string[];
  executiveSummary?: string;
  wordCount?: number;
  
  // Lineage info
  lineage: {
    isRoot: boolean;
    depth: number;
    rootSessionId?: string;
    parentSessionId?: string;
    parentQuery?: string;
    childCount: number;
    siblingCount: number;
  };
  
  // Analysis (if available)
  analysis?: {
    topicsIdentified: number;
    gapsIdentified: number;
    suggestedNextSteps: string[];
  };
  
  // Handoff notes (from previous agents)
  handoffNotes?: Array<{
    note: string;
    nextSteps: string[];
    blockers: string[];
    createdAt: string;
    agentChannel?: string;
  }>;
  
  // Project context
  project?: {
    projectId: string;
    name: string;
    sessionCount: number;
  };
  
  // Quick actions available
  availableActions: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContextSummaryResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    // Fetch session with related data
    const sessionResult = await pool.query(`
      SELECT 
        rs.*,
        p.project_id,
        p.name as project_name,
        parent.question as parent_question,
        (SELECT COUNT(*) FROM research_sessions WHERE parent_session_id = rs.session_id) as child_count,
        (SELECT COUNT(*) FROM research_sessions WHERE parent_session_id = rs.parent_session_id AND session_id != rs.session_id) as sibling_count,
        (SELECT COUNT(*) FROM research_sessions WHERE project_id = rs.project_id) as project_session_count
      FROM research_sessions rs
      LEFT JOIN research_projects p ON rs.project_id = p.project_id
      LEFT JOIN research_sessions parent ON rs.parent_session_id = parent.session_id
      WHERE rs.session_id = $1
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Fetch handoff notes
    const notesResult = await pool.query(`
      SELECT note, next_steps, blockers, created_at, agent_channel
      FROM research_handoff_notes
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [sessionId]);

    // Fetch analysis if available
    const analysisResult = await pool.query(`
      SELECT topics, gaps, overall_assessment
      FROM research_analysis
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [sessionId]);

    // Calculate lineage depth
    let depth = 0;
    let rootSessionId = sessionId;
    if (session.parent_session_id) {
      const lineageResult = await pool.query(`
        WITH RECURSIVE lineage AS (
          SELECT session_id, parent_session_id, 1 as depth
          FROM research_sessions
          WHERE session_id = $1
          UNION ALL
          SELECT rs.session_id, rs.parent_session_id, l.depth + 1
          FROM research_sessions rs
          JOIN lineage l ON rs.session_id = l.parent_session_id
        )
        SELECT session_id, depth FROM lineage ORDER BY depth DESC LIMIT 1
      `, [sessionId]);
      
      if (lineageResult.rows.length > 0) {
        depth = lineageResult.rows[0].depth - 1;
        rootSessionId = lineageResult.rows[0].session_id;
      }
    }

    // Extract key findings from report (first 5 bullet points or sentences)
    let keyFindings: string[] = [];
    let executiveSummary: string | undefined;
    
    if (session.report) {
      // Try to extract bullet points
      const bulletMatches = session.report.match(/^[-*•]\s+(.+)$/gm);
      if (bulletMatches && bulletMatches.length > 0) {
        keyFindings = bulletMatches.slice(0, 5).map((b: string) => b.replace(/^[-*•]\s+/, ''));
      }
      
      // Generate executive summary if report is long
      if (session.report.length > 2000) {
        // Take first paragraph after any heading
        const paragraphs = session.report.split(/\n\n+/);
        for (const p of paragraphs) {
          if (p.length > 100 && !p.startsWith('#') && !p.startsWith('-')) {
            executiveSummary = p.substring(0, 500) + (p.length > 500 ? '...' : '');
            break;
          }
        }
      }
    }

    // Build analysis summary
    let analysisSummary;
    if (analysisResult.rows.length > 0) {
      const analysis = analysisResult.rows[0];
      const topics = analysis.topics || [];
      const gaps = analysis.gaps || [];
      const assessment = analysis.overall_assessment || {};
      
      analysisSummary = {
        topicsIdentified: topics.length,
        gapsIdentified: gaps.length,
        suggestedNextSteps: [
          ...(assessment.recommended_next_steps || []),
          ...gaps.slice(0, 3).map((g: any) => g.suggested_query || g.topic),
        ].slice(0, 5),
      };
    }

    // Determine available actions based on status
    const availableActions: string[] = [];
    if (session.status === 'completed') {
      availableActions.push('continue', 'extend', 'analyze', 'export', 'add-handoff-note');
    } else if (session.status === 'in_progress' || session.status === 'processing') {
      availableActions.push('check-status', 'add-handoff-note');
    } else if (session.status === 'failed') {
      availableActions.push('retry', 'add-handoff-note');
    }

    // Build response
    const response: ContextSummaryResponse = {
      sessionId,
      status: session.status,
      progress: session.progress || 0,
      
      query: session.question,
      model: session.model,
      createdAt: session.created_at?.toISOString(),
      lastActivity: (session.completed_at || session.updated_at || session.created_at)?.toISOString(),
      
      keyFindings: keyFindings.length > 0 ? keyFindings : undefined,
      executiveSummary,
      wordCount: session.report ? session.report.split(/\s+/).length : undefined,
      
      lineage: {
        isRoot: !session.parent_session_id,
        depth,
        rootSessionId: depth > 0 ? rootSessionId : undefined,
        parentSessionId: session.parent_session_id,
        parentQuery: session.parent_question,
        childCount: parseInt(session.child_count) || 0,
        siblingCount: parseInt(session.sibling_count) || 0,
      },
      
      analysis: analysisSummary,
      
      handoffNotes: notesResult.rows.length > 0 ? notesResult.rows.map(n => ({
        note: n.note,
        nextSteps: n.next_steps || [],
        blockers: n.blockers || [],
        createdAt: n.created_at?.toISOString(),
        agentChannel: n.agent_channel,
      })) : undefined,
      
      project: session.project_id ? {
        projectId: session.project_id,
        name: session.project_name,
        sessionCount: parseInt(session.project_session_count) || 0,
      } : undefined,
      
      availableActions,
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('[Context Summary API] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch context summary',
    });
  }
}
