import { Pool } from 'pg';

// PostgreSQL connection pool for ecosystem_unified database
// Research sessions are stored in research_lab schema
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      // Use unified database with research_lab schema
      database: process.env.POSTGRES_DB || 'ecosystem_unified',
      user: process.env.POSTGRES_USER || 'eleazar',
      password: process.env.POSTGRES_PASSWORD || '',
    });
  }
  return pool;
}

export interface GeneratedImage {
  title: string;
  prompt: string;
  base64Data: string;
  contentType: string;
  generatedAt: string;
  size: number;
}

export interface ResearchProject {
  id?: number;
  project_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: 'active' | 'archived' | 'completed';
  tags?: string[];
  metadata?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface ResearchSession {
  id?: number;
  session_id: string;
  openai_response_id?: string;
  question: string;
  model: 'o3-deep-research' | 'o4-mini-deep-research' | 'gpt-5-pro' | 'o1-pro';
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  current_step?: string;
  current_sources?: string[];
  report?: string;
  citations?: any;
  intermediate_steps?: any;
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  generated_images?: GeneratedImage[]; // Permanently stored images as base64
  estimated_cost?: number;
  actual_cost?: number;
  input_tokens?: number; // Token usage for cost transparency
  output_tokens?: number; // Token usage for cost transparency
  output_formats?: any;
  data_sources?: any;
  analysis?: any; // Qwen3 report analysis (topics, gaps, assessment)
  project_id?: string; // Optional project this session belongs to
  parent_session_id?: string; // Parent session for follow-up research
  session_type?: 'original' | 'follow_up' | 'qwen3_query' | 'analysis';
  created_at?: Date;
  completed_at?: Date;
  updated_at?: Date;
  error_message?: string;
}

// Initialize database table for research sessions
// Note: Table should be created via migration 022_migrate_research_sessions_to_unified.sql
// This function just ensures the schema exists
export async function initializeResearchDatabase(): Promise<void> {
  const client = getPool();
  
  try {
    // Create schema if it doesn't exist
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS research_lab;
      
      CREATE TABLE IF NOT EXISTS research_lab.sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        openai_response_id VARCHAR(255) UNIQUE,
        question TEXT NOT NULL,
        model VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        current_step TEXT,
        current_sources JSONB,
        report TEXT,
        citations JSONB,
        intermediate_steps JSONB,
        conversation_history JSONB,
        generated_images JSONB,
        estimated_cost NUMERIC(10,2),
        actual_cost NUMERIC(10,2),
        input_tokens INTEGER,
        output_tokens INTEGER,
        output_formats JSONB,
        data_sources JSONB,
        analysis JSONB,
        project_id VARCHAR(255),
        parent_session_id VARCHAR(255),
        session_type VARCHAR(30) DEFAULT 'original' CHECK (session_type IN ('original', 'follow_up', 'qwen3_query', 'analysis')),
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW(),
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS research_lab.projects (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(500) NOT NULL,
        description TEXT,
        color VARCHAR(20) DEFAULT 'purple',
        icon VARCHAR(50) DEFAULT 'folder',
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
        tags JSONB DEFAULT '[]'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_research_lab_session_id ON research_lab.sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_research_lab_openai_id ON research_lab.sessions(openai_response_id);
      CREATE INDEX IF NOT EXISTS idx_research_lab_status ON research_lab.sessions(status);
      CREATE INDEX IF NOT EXISTS idx_research_lab_created_at ON research_lab.sessions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_research_lab_sessions_parent_id ON research_lab.sessions(parent_session_id);
      CREATE INDEX IF NOT EXISTS idx_research_lab_sessions_type ON research_lab.sessions(session_type);
      CREATE INDEX IF NOT EXISTS idx_research_lab_sessions_project_id ON research_lab.sessions(project_id);
    `);
    
    console.log('✅ Research lab schema and sessions table initialized');
  } catch (error: any) {
    console.error('❌ Failed to initialize research database:', error);
    // Don't throw if it's just a connection issue - let it be handled upstream
    if (error.code !== 'ECONNREFUSED' && error.code !== '42P07') {
      throw error;
    }
  }
}

// Create new research session
export async function createResearchSession(
  session: Omit<ResearchSession, 'id' | 'created_at' | 'updated_at'>
): Promise<ResearchSession> {
  const client = getPool();
  
  try {
    const result = await client.query(`
      INSERT INTO research_lab.sessions (
        session_id, openai_response_id, question, model, status, progress,
        current_step, estimated_cost, output_formats, data_sources, conversation_history,
        parent_session_id, session_type, project_id, report
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      session.session_id,
      session.openai_response_id || null,
      session.question,
      session.model,
      session.status,
      session.progress,
      session.current_step || null,
      session.estimated_cost || null,
      session.output_formats ? JSON.stringify(session.output_formats) : null,
      session.data_sources ? JSON.stringify(session.data_sources) : null,
      session.conversation_history ? JSON.stringify(session.conversation_history) : null,
      session.parent_session_id || null,
      session.session_type || 'original',
      session.project_id || null,
      session.report || null,
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Failed to create research session:', error);
    throw error;
  }
}

// Get research session by session_id
export async function getResearchSession(sessionId: string): Promise<ResearchSession | null> {
  const client = getPool();
  
  try {
    const result = await client.query(
      'SELECT * FROM research_lab.sessions WHERE session_id = $1',
      [sessionId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Failed to get research session:', error);
    throw error;
  }
}

// Get research session by OpenAI response_id
export async function getResearchSessionByOpenAIId(openaiResponseId: string): Promise<ResearchSession | null> {
  const client = getPool();
  
  try {
    const result = await client.query(
      'SELECT * FROM research_lab.sessions WHERE openai_response_id = $1',
      [openaiResponseId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Failed to get research session by OpenAI ID:', error);
    throw error;
  }
}

// Update research session
export async function updateResearchSession(
  sessionId: string,
  updates: Partial<ResearchSession>
): Promise<ResearchSession | null> {
  const client = getPool();
  
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;
  
  if (updates.question !== undefined) {
    fields.push(`question = $${paramCount++}`);
    values.push(updates.question);
  }
  if (updates.model !== undefined) {
    fields.push(`model = $${paramCount++}`);
    values.push(updates.model);
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramCount++}`);
    values.push(updates.status);
  }
  if (updates.progress !== undefined) {
    fields.push(`progress = $${paramCount++}`);
    values.push(updates.progress);
  }
  if (updates.current_step !== undefined) {
    fields.push(`current_step = $${paramCount++}`);
    values.push(updates.current_step);
  }
  if (updates.current_sources !== undefined) {
    fields.push(`current_sources = $${paramCount++}`);
    values.push(JSON.stringify(updates.current_sources));
  }
  if (updates.report !== undefined) {
    fields.push(`report = $${paramCount++}`);
    values.push(updates.report);
  }
  if (updates.citations !== undefined) {
    fields.push(`citations = $${paramCount++}`);
    values.push(JSON.stringify(updates.citations));
  }
  if (updates.intermediate_steps !== undefined) {
    fields.push(`intermediate_steps = $${paramCount++}`);
    values.push(JSON.stringify(updates.intermediate_steps));
  }
  if (updates.conversation_history !== undefined) {
    fields.push(`conversation_history = $${paramCount++}`);
    values.push(JSON.stringify(updates.conversation_history));
  }
  if (updates.generated_images !== undefined) {
    fields.push(`generated_images = $${paramCount++}`);
    values.push(JSON.stringify(updates.generated_images));
  }
  if (updates.actual_cost !== undefined) {
    fields.push(`actual_cost = $${paramCount++}`);
    values.push(updates.actual_cost);
  }
  if (updates.estimated_cost !== undefined) {
    fields.push(`estimated_cost = $${paramCount++}`);
    values.push(updates.estimated_cost);
  }
  if (updates.input_tokens !== undefined) {
    fields.push(`input_tokens = $${paramCount++}`);
    values.push(updates.input_tokens);
  }
  if (updates.output_tokens !== undefined) {
    fields.push(`output_tokens = $${paramCount++}`);
    values.push(updates.output_tokens);
  }
  if (updates.output_formats !== undefined) {
    fields.push(`output_formats = $${paramCount++}`);
    values.push(JSON.stringify(updates.output_formats));
  }
  if (updates.data_sources !== undefined) {
    fields.push(`data_sources = $${paramCount++}`);
    values.push(JSON.stringify(updates.data_sources));
  }
  if (updates.completed_at !== undefined) {
    fields.push(`completed_at = $${paramCount++}`);
    values.push(updates.completed_at);
  }
  if (updates.error_message !== undefined) {
    fields.push(`error_message = $${paramCount++}`);
    values.push(updates.error_message);
  }
  if (updates.openai_response_id !== undefined) {
    fields.push(`openai_response_id = $${paramCount++}`);
    values.push(updates.openai_response_id);
  }
  if ((updates as any).last_verified_at !== undefined) {
    fields.push(`last_verified_at = $${paramCount++}`);
    values.push((updates as any).last_verified_at);
  }
  if ((updates as any).openai_last_status !== undefined) {
    fields.push(`openai_last_status = $${paramCount++}`);
    values.push((updates as any).openai_last_status);
  }
  if ((updates as any).openai_metadata !== undefined) {
    fields.push(`openai_metadata = $${paramCount++}`);
    values.push(JSON.stringify((updates as any).openai_metadata));
  }
  if (updates.analysis !== undefined) {
    fields.push(`analysis = $${paramCount++}`);
    values.push(JSON.stringify(updates.analysis));
  }
  
  if (fields.length === 0) {
    return getResearchSession(sessionId);
  }
  
  fields.push(`updated_at = NOW()`);
  values.push(sessionId);
  
  console.log('🔧 UPDATE ATTEMPT:', {
    sessionId,
    fieldCount: fields.length,
    hasReport: updates.report !== undefined,
    reportLength: updates.report?.length,
    hasConvHistory: updates.conversation_history !== undefined,
    convHistoryLength: updates.conversation_history?.length,
  });

  try {
    const query = `
      UPDATE research_lab.sessions
      SET ${fields.join(', ')}
      WHERE session_id = $${paramCount}
      RETURNING *
    `;
    
    console.log('🔧 SQL Query fields:', fields.slice(0, 10));
    
    const result = await client.query(query, values);
    
    console.log('🔧 UPDATE RESULT:', {
      rowCount: result.rowCount,
      hasData: !!result.rows[0],
      savedReportLength: result.rows[0]?.report?.length || 0,
      savedConvLength: result.rows[0]?.conversation_history?.length || 0,
    });
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Failed to update research session:', {
      sessionId,
      error: error instanceof Error ? error.message : error,
      fieldCount: fields.length,
    });
    throw error;
  }
}

// Get all research sessions (for dashboard history)
// Excludes large fields to keep response size under 4MB
export async function getAllResearchSessions(limit: number = 100): Promise<ResearchSession[]> {
  const client = getPool();
  
  try {
    // Exclude large fields: report, conversation_history, generated_images, intermediate_steps, citations
    // Only include these when fetching a single session
    const result = await client.query(
      `SELECT 
        id, session_id, openai_response_id, question, model, status, progress,
        current_step, current_sources, estimated_cost, actual_cost,
        input_tokens, output_tokens, output_formats, data_sources,
        project_id, parent_session_id, session_type,
        created_at, completed_at, updated_at, error_message
      FROM research_lab.sessions 
      ORDER BY created_at DESC 
      LIMIT $1`,
      [limit]
    );
    
    return result.rows || [];
  } catch (error: any) {
    console.error('❌ Failed to get research sessions:', error);
    // If table doesn't exist, return empty array instead of throwing
    if (error.code === '42P01') {
      console.log('⚠️  research_lab.sessions table does not exist yet, returning empty array');
      return [];
    }
    throw error;
  }
}

// Alias for backward compatibility
export const getRecentResearchSessions = getAllResearchSessions;

// Get research sessions by status
export async function getResearchSessionsByStatus(
  status: ResearchSession['status'],
  limit: number = 50
): Promise<ResearchSession[]> {
  const client = getPool();
  
  try {
    const result = await client.query(
      'SELECT * FROM research_lab.sessions WHERE status = $1 ORDER BY created_at DESC LIMIT $2',
      [status, limit]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Failed to get research sessions by status:', error);
    throw error;
  }
}

// Delete research session
export async function deleteResearchSession(sessionId: string): Promise<boolean> {
  const client = getPool();
  
  try {
    const result = await client.query(
      'DELETE FROM research_lab.sessions WHERE session_id = $1',
      [sessionId]
    );
    
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Failed to delete research session:', error);
    throw error;
  }
}

// Get child sessions of a parent (direct children only)
export async function getChildSessions(parentSessionId: string): Promise<ResearchSession[]> {
  const client = getPool();
  
  try {
    const result = await client.query(
      `SELECT 
        id, session_id, openai_response_id, question, model, status, progress,
        current_step, estimated_cost, actual_cost,
        input_tokens, output_tokens, project_id, parent_session_id, session_type,
        created_at, completed_at, updated_at, error_message
      FROM research_lab.sessions 
      WHERE parent_session_id = $1
      ORDER BY created_at ASC`,
      [parentSessionId]
    );
    
    return result.rows || [];
  } catch (error) {
    console.error('Failed to get child sessions:', error);
    throw error;
  }
}

// Get full ancestry lineage for a session (walk up the parent chain)
export async function getSessionLineage(sessionId: string): Promise<ResearchSession[]> {
  const client = getPool();
  
  try {
    // Use a recursive CTE to walk up the parent chain
    const result = await client.query(
      `WITH RECURSIVE lineage AS (
        SELECT id, session_id, parent_session_id, question, model, status, session_type, created_at, 0 as depth
        FROM research_lab.sessions WHERE session_id = $1
        UNION ALL
        SELECT s.id, s.session_id, s.parent_session_id, s.question, s.model, s.status, s.session_type, s.created_at, l.depth + 1
        FROM research_lab.sessions s
        JOIN lineage l ON s.session_id = l.parent_session_id
      )
      SELECT * FROM lineage ORDER BY depth DESC`,
      [sessionId]
    );
    
    return result.rows || [];
  } catch (error) {
    console.error('Failed to get session lineage:', error);
    throw error;
  }
}

// Get full descendant tree for a session (walk down)
export async function getSessionDescendants(sessionId: string): Promise<ResearchSession[]> {
  const client = getPool();
  
  try {
    const result = await client.query(
      `WITH RECURSIVE descendants AS (
        SELECT id, session_id, parent_session_id, question, model, status, session_type, created_at, 0 as depth
        FROM research_lab.sessions WHERE parent_session_id = $1
        UNION ALL
        SELECT s.id, s.session_id, s.parent_session_id, s.question, s.model, s.status, s.session_type, s.created_at, d.depth + 1
        FROM research_lab.sessions s
        JOIN descendants d ON s.parent_session_id = d.session_id
      )
      SELECT * FROM descendants ORDER BY depth ASC, created_at ASC`,
      [sessionId]
    );
    
    return result.rows || [];
  } catch (error) {
    console.error('Failed to get session descendants:', error);
    throw error;
  }
}

// Close connection pool (for graceful shutdown)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// ============================================================================
// Research Projects CRUD
// ============================================================================

// Create a new research project
export async function createResearchProject(
  project: Omit<ResearchProject, 'id' | 'created_at' | 'updated_at'>
): Promise<ResearchProject> {
  const client = getPool();
  
  try {
    const result = await client.query(`
      INSERT INTO research_lab.projects (
        project_id, name, description, color, icon, status, tags, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      project.project_id,
      project.name,
      project.description || null,
      project.color || 'purple',
      project.icon || 'folder',
      project.status || 'active',
      JSON.stringify(project.tags || []),
      JSON.stringify(project.metadata || {}),
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Failed to create research project:', error);
    throw error;
  }
}

// Get a research project by project_id
export async function getResearchProject(projectId: string): Promise<ResearchProject | null> {
  const client = getPool();
  
  try {
    const result = await client.query(
      'SELECT * FROM research_lab.projects WHERE project_id = $1',
      [projectId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Failed to get research project:', error);
    throw error;
  }
}

// Get all research projects
export async function getAllResearchProjects(
  status?: ResearchProject['status'],
  limit: number = 100
): Promise<ResearchProject[]> {
  const client = getPool();
  
  try {
    let query = 'SELECT * FROM research_lab.projects';
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY updated_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Failed to get research projects:', error);
    throw error;
  }
}

// Update a research project
export async function updateResearchProject(
  projectId: string,
  updates: Partial<ResearchProject>
): Promise<ResearchProject | null> {
  const client = getPool();
  
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;
  
  if (updates.name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${paramCount++}`);
    values.push(updates.description);
  }
  if (updates.color !== undefined) {
    fields.push(`color = $${paramCount++}`);
    values.push(updates.color);
  }
  if (updates.icon !== undefined) {
    fields.push(`icon = $${paramCount++}`);
    values.push(updates.icon);
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramCount++}`);
    values.push(updates.status);
  }
  if (updates.tags !== undefined) {
    fields.push(`tags = $${paramCount++}`);
    values.push(JSON.stringify(updates.tags));
  }
  if (updates.metadata !== undefined) {
    fields.push(`metadata = $${paramCount++}`);
    values.push(JSON.stringify(updates.metadata));
  }
  
  if (fields.length === 0) {
    return getResearchProject(projectId);
  }
  
  values.push(projectId);
  
  try {
    const result = await client.query(
      `UPDATE research_lab.projects SET ${fields.join(', ')} WHERE project_id = $${paramCount} RETURNING *`,
      values
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Failed to update research project:', error);
    throw error;
  }
}

// Delete a research project
export async function deleteResearchProject(projectId: string): Promise<boolean> {
  const client = getPool();
  
  try {
    const result = await client.query(
      'DELETE FROM research_lab.projects WHERE project_id = $1',
      [projectId]
    );
    
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Failed to delete research project:', error);
    throw error;
  }
}

// Get sessions for a specific project
export async function getProjectSessions(
  projectId: string,
  limit: number = 50
): Promise<ResearchSession[]> {
  const client = getPool();
  
  try {
    const result = await client.query(
      'SELECT * FROM research_lab.sessions WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2',
      [projectId, limit]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Failed to get project sessions:', error);
    throw error;
  }
}

// Get projects with session counts
export async function getProjectsWithSessionCounts(): Promise<(ResearchProject & { session_count: number })[]> {
  const client = getPool();
  
  try {
    const result = await client.query(`
      SELECT p.*, COALESCE(COUNT(s.id), 0)::int as session_count
      FROM research_lab.projects p
      LEFT JOIN research_lab.sessions s ON s.project_id = p.project_id
      WHERE p.status = 'active'
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `);
    
    return result.rows;
  } catch (error) {
    console.error('Failed to get projects with session counts:', error);
    throw error;
  }
}

// Assign a session to a project
export async function assignSessionToProject(
  sessionId: string,
  projectId: string | null
): Promise<ResearchSession | null> {
  const client = getPool();
  
  try {
    const result = await client.query(
      'UPDATE research_lab.sessions SET project_id = $1, updated_at = NOW() WHERE session_id = $2 RETURNING *',
      [projectId, sessionId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Failed to assign session to project:', error);
    throw error;
  }
}

// Create a follow-up session linked to a parent
export async function createFollowUpSession(
  parentSessionId: string,
  session: Omit<ResearchSession, 'id' | 'created_at' | 'updated_at'>
): Promise<ResearchSession> {
  const client = getPool();
  
  try {
    // Get parent session to inherit project_id
    const parent = await getResearchSession(parentSessionId);
    const projectId = parent?.project_id || null;
    
    const result = await client.query(`
      INSERT INTO research_lab.sessions (
        session_id, openai_response_id, question, model, status, progress,
        current_step, estimated_cost, output_formats, data_sources, conversation_history,
        project_id, parent_session_id, session_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      session.session_id,
      session.openai_response_id || null,
      session.question,
      session.model,
      session.status,
      session.progress,
      session.current_step || null,
      session.estimated_cost || null,
      session.output_formats ? JSON.stringify(session.output_formats) : null,
      session.data_sources ? JSON.stringify(session.data_sources) : null,
      session.conversation_history ? JSON.stringify(session.conversation_history) : null,
      projectId,
      parentSessionId,
      session.session_type || 'follow_up',
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Failed to create follow-up session:', error);
    throw error;
  }
}
