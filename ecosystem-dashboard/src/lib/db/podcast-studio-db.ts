import { Pool, PoolClient } from 'pg';

// Database connection configuration for Podcast Studio (LOCAL PostgreSQL)
// Uses POSTGRES_* variables to avoid conflict with workspace (which uses DATABASE_* for Cloud SQL)
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'ecosystem_unified',
  user: process.env.POSTGRES_USER || 'eleazar',
  password: process.env.POSTGRES_PASSWORD || '',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Set search_path to include podcast schema
  options: '-c search_path=podcast,public',
});

// Test database connection on startup
pool.on('connect', () => {
  console.log('✅ Podcast Studio: Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Podcast Studio: Unexpected database error', err);
});

// Type definitions
export interface PodcastProject {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'in_progress' | 'ready' | 'published';
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  metadata?: any;
  
  // Script parameters
  script_length: 'executive' | 'essential' | 'comprehensive' | 'deep-dive';
  script_tone: string;
  script_audience: string;
  script_style: string;
  script_emphasis?: string;
  include_stories: boolean;
  include_examples: boolean;
}

export interface ResearchMaterial {
  id: string;
  project_id: string;
  title: string;
  type: 'pdf' | 'document' | 'article' | 'book' | 'video' | 'audio';
  url?: string;
  file_path?: string;
  content?: string;
  content_hash?: string;
  page_count?: number;
  word_count?: number;
  is_selected: boolean;
  created_at: Date;
  updated_at: Date;
  metadata?: any;
}

export interface PodcastHost {
  id: string;
  project_id: string;
  name: string;
  voice_id?: string;
  voice_provider: 'gemini' | 'openai' | 'elevenlabs';
  role: 'host' | 'co-host' | 'expert' | 'interviewer';
  personality?: string;
  speaking_rate: number;
  pitch: number;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

export interface ScriptGeneration {
  id: string;
  project_id: string;
  script_length: 'executive' | 'essential' | 'comprehensive' | 'deep-dive';
  version: number;
  title?: string;
  content: string;
  word_count?: number;
  estimated_duration_seconds?: number;
  generation_params: any;
  ai_model?: string;
  ai_provider?: string;
  generation_time_ms?: number;
  status: 'generated' | 'edited' | 'approved' | 'rejected';
  is_current: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AudioGeneration {
  id: string;
  project_id: string;
  script_id?: string;
  version: number;
  file_path: string;
  file_size_bytes?: number;
  duration_seconds?: number;
  format: 'mp3' | 'wav' | 'aac' | 'opus';
  sample_rate: number;
  bitrate?: number;
  tts_provider: 'gemini' | 'openai' | 'elevenlabs';
  tts_model?: string;
  generation_time_ms?: number;
  segments?: any;
  status: 'generating' | 'generated' | 'failed' | 'published';
  is_current: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WorkflowState {
  id: string;
  project_id: string;
  step_1_script_generated: boolean;
  step_1_completed_at?: Date;
  step_2_audio_generated: boolean;
  step_2_completed_at?: Date;
  step_3_exported: boolean;
  step_3_completed_at?: Date;
  current_step: number;
  progress_percentage: number;
  created_at: Date;
  updated_at: Date;
}

// Database query functions

/**
 * Get all podcast projects
 */
export async function getAllProjects(): Promise<PodcastProject[]> {
  const result = await pool.query(
    'SELECT * FROM podcast_projects ORDER BY created_at DESC'
  );
  return result.rows;
}

/**
 * Get a single project by ID
 */
export async function getProjectById(id: string): Promise<PodcastProject | null> {
  const result = await pool.query(
    'SELECT * FROM podcast_projects WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Create a new podcast project
 */
export async function createProject(
  project: Omit<PodcastProject, 'id' | 'created_at' | 'updated_at'>
): Promise<PodcastProject> {
  const result = await pool.query(
    `INSERT INTO podcast_projects (
      title, description, status, created_by, metadata,
      script_length, script_tone, script_audience, script_style,
      script_emphasis, include_stories, include_examples
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      project.title,
      project.description,
      project.status || 'draft',
      project.created_by,
      project.metadata ? JSON.stringify(project.metadata) : null,
      project.script_length || 'essential',
      project.script_tone || 'conversational',
      project.script_audience || 'general',
      project.script_style || 'co-host',
      project.script_emphasis,
      project.include_stories !== false,
      project.include_examples !== false,
    ]
  );
  return result.rows[0];
}

/**
 * Update project configuration
 */
export async function updateProject(
  id: string,
  updates: Partial<PodcastProject>
): Promise<PodcastProject> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
      fields.push(`${key} = $${paramCount}`);
      values.push(key === 'metadata' && typeof value === 'object' ? JSON.stringify(value) : value);
      paramCount++;
    }
  });

  values.push(id);
  
  const result = await pool.query(
    `UPDATE podcast_projects SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0];
}

/**
 * Get research materials for a project
 */
export async function getResearchMaterials(projectId: string): Promise<ResearchMaterial[]> {
  const result = await pool.query(
    'SELECT * FROM research_materials WHERE project_id = $1 ORDER BY created_at DESC',
    [projectId]
  );
  return result.rows;
}

/**
 * Add research material to a project
 */
export async function addResearchMaterial(
  material: Omit<ResearchMaterial, 'id' | 'created_at' | 'updated_at'>
): Promise<ResearchMaterial> {
  const result = await pool.query(
    `INSERT INTO research_materials (
      project_id, title, type, url, file_path, content, content_hash,
      page_count, word_count, is_selected, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      material.project_id,
      material.title,
      material.type,
      material.url,
      material.file_path,
      material.content,
      material.content_hash,
      material.page_count,
      material.word_count,
      material.is_selected || false,
      material.metadata ? JSON.stringify(material.metadata) : null,
    ]
  );
  return result.rows[0];
}

/**
 * Get podcast hosts for a project
 */
export async function getHosts(projectId: string): Promise<PodcastHost[]> {
  const result = await pool.query(
    'SELECT * FROM podcast_hosts WHERE project_id = $1 ORDER BY order_index ASC',
    [projectId]
  );
  return result.rows;
}

/**
 * Create script generation (legacy - use script-versions.ts for new code)
 * @deprecated Use createScriptVersion from script-versions.ts instead
 */
export async function createScriptGeneration(
  script: Omit<ScriptGeneration, 'id' | 'created_at' | 'updated_at'>
): Promise<ScriptGeneration> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get next version for this script_length
    const versionResult = await client.query(
      'SELECT get_next_script_version($1, $2) as next_version',
      [script.project_id, script.script_length]
    );
    const nextVersion = versionResult.rows[0].next_version;
    
    // Mark all previous scripts of same length as not current
    await client.query(
      'UPDATE script_generations SET is_current = false WHERE project_id = $1 AND script_length = $2',
      [script.project_id, script.script_length]
    );
    
    // Insert new script
    const result = await client.query(
      `INSERT INTO script_generations (
        project_id, script_length, version, title, content, word_count, estimated_duration_seconds,
        generation_params, ai_model, ai_provider, generation_time_ms, status, is_current
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        script.project_id,
        script.script_length,
        nextVersion,
        script.title || `${script.script_length} v${nextVersion}`,
        script.content,
        script.word_count,
        script.estimated_duration_seconds,
        JSON.stringify(script.generation_params),
        script.ai_model,
        script.ai_provider,
        script.generation_time_ms,
        script.status || 'generated',
        true,
      ]
    );
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Get all script versions for a project
 * @param projectId - Project ID
 * @param scriptLength - Optional: Filter by script length
 */
export async function getScriptVersions(
  projectId: string,
  scriptLength?: 'executive' | 'essential' | 'comprehensive' | 'deep-dive'
): Promise<ScriptGeneration[]> {
  let query = 'SELECT * FROM script_generations WHERE project_id = $1';
  const params: any[] = [projectId];
  
  if (scriptLength) {
    query += ' AND script_length = $2';
    params.push(scriptLength);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get current script for a project
 * @param projectId - Project ID
 * @param scriptLength - Optional: Get current script for specific length (default: 'comprehensive')
 */
export async function getCurrentScript(
  projectId: string,
  scriptLength: 'executive' | 'essential' | 'comprehensive' | 'deep-dive' = 'comprehensive'
): Promise<ScriptGeneration | null> {
  const result = await pool.query(
    'SELECT * FROM script_generations WHERE project_id = $1 AND script_length = $2 AND is_current = true',
    [projectId, scriptLength]
  );
  return result.rows[0] || null;
}

/**
 * Delete a script generation by ID
 */
export async function deleteScriptGeneration(scriptId: string): Promise<void> {
  await pool.query('DELETE FROM script_generations WHERE id = $1', [scriptId]);
}

/**
 * Get or create workflow state for a project
 */
export async function getWorkflowState(projectId: string): Promise<WorkflowState> {
  let result = await pool.query(
    'SELECT * FROM workflow_states WHERE project_id = $1',
    [projectId]
  );
  
  if (result.rows.length === 0) {
    // Create initial workflow state
    result = await pool.query(
      'INSERT INTO workflow_states (project_id) VALUES ($1) RETURNING *',
      [projectId]
    );
  }
  
  return result.rows[0];
}

/**
 * Update workflow state
 */
export async function updateWorkflowState(
  projectId: string,
  updates: Partial<WorkflowState>
): Promise<WorkflowState> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'project_id' && key !== 'created_at' && key !== 'updated_at') {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  });

  values.push(projectId);
  
  const result = await pool.query(
    `UPDATE workflow_states SET ${fields.join(', ')} WHERE project_id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0];
}

// ===========================================
// PODCAST PRESETS
// ===========================================

export interface PodcastPreset {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category: 'default' | 'custom';
  user_id?: string;
  config: any;
  usage_count: number;
  is_favorite: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get all presets (optionally filtered by user)
 */
export async function getAllPresets(userId?: string): Promise<PodcastPreset[]> {
  const query = userId
    ? 'SELECT * FROM podcast_presets WHERE user_id = $1 OR category = \'default\' ORDER BY is_favorite DESC, usage_count DESC, created_at DESC'
    : 'SELECT * FROM podcast_presets WHERE category = \'default\' ORDER BY usage_count DESC, created_at DESC';
  
  const params = userId ? [userId] : [];
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get a specific preset by ID
 */
export async function getPreset(id: string): Promise<PodcastPreset | null> {
  const result = await pool.query(
    'SELECT * FROM podcast_presets WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Create a new preset
 */
export async function createPreset(
  preset: Omit<PodcastPreset, 'id' | 'created_at' | 'updated_at' | 'usage_count'>
): Promise<PodcastPreset> {
  const result = await pool.query(
    `INSERT INTO podcast_presets (name, description, icon, category, user_id, config, is_favorite)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      preset.name,
      preset.description || null,
      preset.icon || '🎙️',
      preset.category || 'custom',
      preset.user_id || null,
      JSON.stringify(preset.config),
      preset.is_favorite || false,
    ]
  );
  return result.rows[0];
}

/**
 * Update an existing preset
 */
export async function updatePreset(
  id: string,
  updates: Partial<Omit<PodcastPreset, 'id' | 'created_at' | 'updated_at'>>
): Promise<PodcastPreset> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.icon !== undefined) {
    fields.push(`icon = $${paramIndex++}`);
    values.push(updates.icon);
  }
  if (updates.config !== undefined) {
    fields.push(`config = $${paramIndex++}`);
    values.push(JSON.stringify(updates.config));
  }
  if (updates.is_favorite !== undefined) {
    fields.push(`is_favorite = $${paramIndex++}`);
    values.push(updates.is_favorite);
  }

  values.push(id);
  const result = await pool.query(
    `UPDATE podcast_presets SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0];
}

/**
 * Delete a preset
 */
export async function deletePreset(id: string): Promise<void> {
  await pool.query('DELETE FROM podcast_presets WHERE id = $1', [id]);
}

/**
 * Increment preset usage count
 */
export async function incrementPresetUsage(id: string): Promise<void> {
  await pool.query(
    'UPDATE podcast_presets SET usage_count = usage_count + 1 WHERE id = $1',
    [id]
  );
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Create a new audio generation record
 */
export async function createAudioGeneration(
  audio: Omit<AudioGeneration, 'id' | 'created_at' | 'updated_at'>
): Promise<AudioGeneration> {
  // First, set all other audio generations for this project to not current
  if (audio.is_current) {
    await pool.query(
      'UPDATE audio_generations SET is_current = false WHERE project_id = $1',
      [audio.project_id]
    );
  }

  const result = await pool.query(
    `INSERT INTO audio_generations (
      project_id, script_id, version, file_path, file_size_bytes,
      duration_seconds, format, sample_rate, bitrate, tts_provider,
      tts_model, generation_time_ms, segments, status, is_current
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      audio.project_id,
      audio.script_id,
      audio.version,
      audio.file_path,
      audio.file_size_bytes,
      audio.duration_seconds,
      audio.format,
      audio.sample_rate,
      audio.bitrate,
      audio.tts_provider,
      audio.tts_model,
      audio.generation_time_ms,
      audio.segments ? JSON.stringify(audio.segments) : null,
      audio.status,
      audio.is_current,
    ]
  );
  return result.rows[0];
}

/**
 * Get audio generations for a project
 */
export async function getAudioGenerationsByProject(projectId: string): Promise<AudioGeneration[]> {
  const result = await pool.query(
    'SELECT * FROM audio_generations WHERE project_id = $1 ORDER BY created_at DESC',
    [projectId]
  );
  return result.rows;
}

/**
 * Get current audio generation for a project
 */
export async function getCurrentAudioGeneration(projectId: string): Promise<AudioGeneration | null> {
  const result = await pool.query(
    'SELECT * FROM audio_generations WHERE project_id = $1 AND is_current = true',
    [projectId]
  );
  return result.rows[0] || null;
}

/**
 * Delete all audio generations for a project
 */
export async function deleteAudioGenerationsByProject(projectId: string): Promise<void> {
  await pool.query('DELETE FROM audio_generations WHERE project_id = $1', [projectId]);
}

/**
 * Update audio generation status
 */
export async function updateAudioGenerationStatus(
  id: string,
  status: AudioGeneration['status'],
  additionalFields?: Partial<AudioGeneration>
): Promise<AudioGeneration | null> {
  const updates = ['status = $2', 'updated_at = NOW()'];
  const values: any[] = [id, status];
  let paramIndex = 3;

  if (additionalFields) {
    if (additionalFields.file_size_bytes !== undefined) {
      updates.push(`file_size_bytes = $${paramIndex++}`);
      values.push(additionalFields.file_size_bytes);
    }
    if (additionalFields.duration_seconds !== undefined) {
      updates.push(`duration_seconds = $${paramIndex++}`);
      values.push(additionalFields.duration_seconds);
    }
    if (additionalFields.generation_time_ms !== undefined) {
      updates.push(`generation_time_ms = $${paramIndex++}`);
      values.push(additionalFields.generation_time_ms);
    }
    if ((additionalFields as any).file_path !== undefined) {
      updates.push(`file_path = $${paramIndex++}`);
      values.push((additionalFields as any).file_path);
    }
    if ((additionalFields as any).error_details !== undefined) {
      updates.push(`error_details = $${paramIndex++}`);
      values.push((additionalFields as any).error_details);
    }
  }

  const result = await pool.query(
    `UPDATE audio_generations SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

// Export pool for advanced queries
export { pool };
