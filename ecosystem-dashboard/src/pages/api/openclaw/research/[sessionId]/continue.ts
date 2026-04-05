/**
 * OpenClaw Research Continue/Extend API
 * POST /api/openclaw/research/[sessionId]/continue
 * 
 * Allows agents to continue or extend existing research with:
 * - Additional context or instructions
 * - New sub-topics to research
 * - Refined query direction
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

const DASHBOARD_API_BASE = process.env.DASHBOARD_API_BASE || 'http://localhost:8404';

interface ContinueRequest {
  // Additional context to incorporate
  additionalContext?: string;
  
  // New sub-topics to extend the research
  extendWith?: Array<{
    topic: string;
    instructions?: string;
    outputFormat?: string;
    depth?: 'shallow' | 'moderate' | 'deep';
  }>;
  
  // Refined query direction
  refineQuery?: string;
  
  // Re-analyze with new focus areas
  reanalyze?: {
    focusAreas?: string[];
    identifyGaps?: boolean;
  };
  
  // Model override
  model?: string;
  
  // Agent context
  context?: {
    channel: string;
    session_id?: string;
  };
}

interface ContinueResponse {
  success: boolean;
  originalSessionId: string;
  
  // New sessions created
  continuationSessionId?: string;
  extensionSessionIds?: Array<{
    topic: string;
    sessionId: string;
    status: string;
  }>;
  
  // Re-analysis result
  reanalysis?: {
    sessionId: string;
    newGapsIdentified: number;
    suggestedFollowUps: string[];
  };
  
  // Summary of what was done
  actions: string[];
  
  error?: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContinueResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const request: ContinueRequest = req.body;
    const actions: string[] = [];

    // Fetch original session
    const sessionResult = await pool.query(`
      SELECT session_id, question, report, model, status, project_id
      FROM research_sessions
      WHERE session_id = $1
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const originalSession = sessionResult.rows[0];

    if (originalSession.status !== 'completed') {
      return res.status(409).json({ 
        error: `Cannot continue session with status: ${originalSession.status}. Session must be completed.` 
      });
    }

    let continuationSessionId: string | undefined;
    let extensionSessionIds: ContinueResponse['extensionSessionIds'];
    let reanalysis: ContinueResponse['reanalysis'];

    // Handle refined query continuation
    if (request.refineQuery || request.additionalContext) {
      console.log('[Research Continue] Creating continuation session...');
      
      // Build context preamble with original research
      let contextPreamble = `This is a continuation of previous research.\n\n`;
      contextPreamble += `Original Query: ${originalSession.question}\n\n`;
      
      if (request.additionalContext) {
        contextPreamble += `Additional Context from User/Agent:\n${request.additionalContext}\n\n`;
      }
      
      // Include summary of original findings
      if (originalSession.report) {
        const reportSummary = originalSession.report.substring(0, 2000);
        contextPreamble += `Summary of Previous Findings:\n${reportSummary}\n\n`;
      }
      
      contextPreamble += `New Research Direction: ${request.refineQuery || 'Continue with additional context'}`;

      const continuationResponse = await fetch(`${DASHBOARD_API_BASE}/api/research-lab/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: request.refineQuery || `Continue: ${originalSession.question}`,
          contextPreamble,
          model: request.model || originalSession.model,
          mode: 'synchronous',
          skipClarification: true,
          parentSessionId: sessionId,
          sessionType: 'follow_up',
          projectId: originalSession.project_id,
          outputFormats: { academicReport: true },
          dataSources: { webResearch: true },
        }),
      });

      if (continuationResponse.ok) {
        const contData = await continuationResponse.json();
        continuationSessionId = contData.sessionId;
        actions.push(`Created continuation session: ${continuationSessionId}`);
      } else {
        const errData = await continuationResponse.json().catch(() => ({}));
        actions.push(`Continuation failed: ${errData.error || 'Unknown error'}`);
      }
    }

    // Handle extension with new sub-topics
    if (request.extendWith && request.extendWith.length > 0) {
      console.log('[Research Continue] Creating extension sessions...');
      extensionSessionIds = [];

      for (const subTopic of request.extendWith) {
        let contextPreamble = `This research extends a parent study on: "${originalSession.question}"\n\n`;
        if (subTopic.instructions) {
          contextPreamble += `Specific Instructions:\n${subTopic.instructions}\n\n`;
        }
        contextPreamble += `Focus Area: ${subTopic.topic}`;

        // Determine model based on depth
        let model = request.model || originalSession.model;
        if (subTopic.depth === 'shallow') {
          model = 'sonar-pro';
        } else if (subTopic.depth === 'deep') {
          model = 'sonar-deep-research';
        }

        const extResponse = await fetch(`${DASHBOARD_API_BASE}/api/research-lab/session/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: subTopic.topic,
            contextPreamble,
            model,
            mode: 'synchronous',
            skipClarification: true,
            parentSessionId: sessionId,
            sessionType: 'follow_up',
            projectId: originalSession.project_id,
            outputFormats: { [subTopic.outputFormat || 'academicReport']: true },
            dataSources: { webResearch: true },
          }),
        });

        if (extResponse.ok) {
          const extData = await extResponse.json();
          extensionSessionIds.push({
            topic: subTopic.topic,
            sessionId: extData.sessionId,
            status: 'completed',
          });
          actions.push(`Extended with: "${subTopic.topic}" → ${extData.sessionId}`);
        } else {
          extensionSessionIds.push({
            topic: subTopic.topic,
            sessionId: '',
            status: 'failed',
          });
          actions.push(`Extension failed for: "${subTopic.topic}"`);
        }
      }
    }

    // Handle re-analysis
    if (request.reanalyze) {
      console.log('[Research Continue] Running re-analysis...');
      
      const analyzeResponse = await fetch(`${DASHBOARD_API_BASE}/api/openclaw/research-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          forceRefresh: true,
          focusAreas: request.reanalyze.focusAreas,
          autoFollowUp: {
            enabled: request.reanalyze.identifyGaps,
            maxFollowUps: 3,
          },
        }),
      });

      if (analyzeResponse.ok) {
        const analyzeData = await analyzeResponse.json();
        reanalysis = {
          sessionId: analyzeData.analysisSessionId || sessionId,
          newGapsIdentified: analyzeData.analysis?.gaps?.length || 0,
          suggestedFollowUps: analyzeData.analysis?.gaps?.map((g: any) => g.suggested_query) || [],
        };
        actions.push(`Re-analyzed: ${reanalysis.newGapsIdentified} gaps identified`);
      } else {
        actions.push('Re-analysis failed');
      }
    }

    // Log the continuation action
    await pool.query(`
      INSERT INTO research_handoff_notes (session_id, note, next_steps, agent_channel, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT DO NOTHING
    `, [
      sessionId,
      `Research continued via OpenClaw. Actions: ${actions.join('; ')}`,
      actions,
      request.context?.channel || 'api',
    ]).catch(() => {}); // Ignore if table doesn't exist

    return res.status(200).json({
      success: true,
      originalSessionId: sessionId,
      continuationSessionId,
      extensionSessionIds: extensionSessionIds?.length ? extensionSessionIds : undefined,
      reanalysis,
      actions,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Research Continue API] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to continue research',
    });
  }
}
