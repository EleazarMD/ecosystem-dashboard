/**
 * OpenClaw Research Lineage API
 * GET /api/openclaw/research/[sessionId]/lineage
 * 
 * Returns the full research tree with summaries for navigation:
 * - Ancestry (parents up to root)
 * - Children and descendants
 * - Sibling sessions
 * - Quick summaries for each node
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

interface SessionNode {
  sessionId: string;
  query: string;
  status: string;
  model: string;
  sessionType: string;
  createdAt: string;
  wordCount?: number;
  hasReport: boolean;
  childCount: number;
}

interface LineageResponse {
  success: boolean;
  sessionId: string;
  
  // Current session info
  current: SessionNode;
  
  // Ancestry (from root to parent, ordered)
  ancestors: SessionNode[];
  
  // Direct children
  children: SessionNode[];
  
  // Siblings (same parent)
  siblings: SessionNode[];
  
  // Full descendant tree (if requested)
  descendants?: SessionNode[];
  
  // Tree metadata
  tree: {
    depth: number;
    totalNodes: number;
    rootSessionId: string;
    isRoot: boolean;
    isLeaf: boolean;
  };
  
  error?: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LineageResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, includeDescendants } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    // Fetch current session
    const currentResult = await pool.query(`
      SELECT 
        session_id,
        question,
        status,
        model,
        session_type,
        created_at,
        report,
        parent_session_id
      FROM research_sessions
      WHERE session_id = $1
    `, [sessionId]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const current = currentResult.rows[0];

    // Fetch ancestors (recursive CTE)
    const ancestorsResult = await pool.query(`
      WITH RECURSIVE ancestry AS (
        SELECT 
          session_id,
          question,
          status,
          model,
          session_type,
          created_at,
          report,
          parent_session_id,
          0 as depth
        FROM research_sessions
        WHERE session_id = $1
        
        UNION ALL
        
        SELECT 
          rs.session_id,
          rs.question,
          rs.status,
          rs.model,
          rs.session_type,
          rs.created_at,
          rs.report,
          rs.parent_session_id,
          a.depth + 1
        FROM research_sessions rs
        JOIN ancestry a ON rs.session_id = a.parent_session_id
      )
      SELECT * FROM ancestry WHERE depth > 0 ORDER BY depth DESC
    `, [sessionId]);

    // Fetch children
    const childrenResult = await pool.query(`
      SELECT 
        rs.session_id,
        rs.question,
        rs.status,
        rs.model,
        rs.session_type,
        rs.created_at,
        rs.report,
        (SELECT COUNT(*) FROM research_sessions WHERE parent_session_id = rs.session_id) as child_count
      FROM research_sessions rs
      WHERE rs.parent_session_id = $1
      ORDER BY rs.created_at
    `, [sessionId]);

    // Fetch siblings (same parent, excluding self)
    let siblingsResult = { rows: [] as any[] };
    if (current.parent_session_id) {
      siblingsResult = await pool.query(`
        SELECT 
          rs.session_id,
          rs.question,
          rs.status,
          rs.model,
          rs.session_type,
          rs.created_at,
          rs.report,
          (SELECT COUNT(*) FROM research_sessions WHERE parent_session_id = rs.session_id) as child_count
        FROM research_sessions rs
        WHERE rs.parent_session_id = $1 AND rs.session_id != $2
        ORDER BY rs.created_at
      `, [current.parent_session_id, sessionId]);
    }

    // Optionally fetch all descendants
    let descendantsResult = { rows: [] as any[] };
    if (includeDescendants === 'true') {
      descendantsResult = await pool.query(`
        WITH RECURSIVE descendants AS (
          SELECT 
            session_id,
            question,
            status,
            model,
            session_type,
            created_at,
            report,
            parent_session_id,
            1 as depth
          FROM research_sessions
          WHERE parent_session_id = $1
          
          UNION ALL
          
          SELECT 
            rs.session_id,
            rs.question,
            rs.status,
            rs.model,
            rs.session_type,
            rs.created_at,
            rs.report,
            rs.parent_session_id,
            d.depth + 1
          FROM research_sessions rs
          JOIN descendants d ON rs.parent_session_id = d.session_id
        )
        SELECT 
          d.*,
          (SELECT COUNT(*) FROM research_sessions WHERE parent_session_id = d.session_id) as child_count
        FROM descendants d
        ORDER BY depth, created_at
      `, [sessionId]);
    }

    // Helper to map row to SessionNode
    const mapToNode = (row: any): SessionNode => ({
      sessionId: row.session_id,
      query: row.question,
      status: row.status,
      model: row.model,
      sessionType: row.session_type || 'original',
      createdAt: row.created_at?.toISOString(),
      wordCount: row.report ? row.report.split(/\s+/).length : undefined,
      hasReport: !!row.report,
      childCount: parseInt(row.child_count) || 0,
    });

    // Calculate tree metadata
    const depth = ancestorsResult.rows.length;
    const rootSessionId = ancestorsResult.rows.length > 0 
      ? ancestorsResult.rows[0].session_id 
      : sessionId;
    
    // Count total nodes in tree (ancestors + current + children + descendants)
    const totalNodes = 1 + ancestorsResult.rows.length + childrenResult.rows.length + descendantsResult.rows.length;

    const response: LineageResponse = {
      success: true,
      sessionId,
      
      current: {
        ...mapToNode(current),
        childCount: childrenResult.rows.length,
      },
      
      ancestors: ancestorsResult.rows.map(mapToNode),
      children: childrenResult.rows.map(mapToNode),
      siblings: siblingsResult.rows.map(mapToNode),
      
      descendants: includeDescendants === 'true' 
        ? descendantsResult.rows.map(mapToNode) 
        : undefined,
      
      tree: {
        depth,
        totalNodes,
        rootSessionId,
        isRoot: depth === 0,
        isLeaf: childrenResult.rows.length === 0,
      },
      
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('[Research Lineage API] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch lineage',
    });
  }
}
