/**
 * Script Version Management
 * Handles multiple script variants (executive, essential, comprehensive, deep-dive) with automatic versioning
 */

import { Pool } from 'pg';

// Use same database as podcast-studio-db.ts
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'ecosystem_unified',
  user: process.env.POSTGRES_USER || 'eleazar',
  password: process.env.POSTGRES_PASSWORD || '',
  options: '-c search_path=podcast,public',
});

export type ScriptLength = 'executive' | 'essential' | 'comprehensive' | 'deep-dive';
export type ScriptStatus = 'generated' | 'edited' | 'approved' | 'rejected';

export interface ScriptVersion {
  id: string;
  project_id: string;
  script_length: ScriptLength;
  version: number;
  title?: string;
  content: string;
  word_count?: number;
  estimated_duration_seconds?: number;
  generation_params?: any;
  ai_model?: string;
  ai_provider?: string;
  generation_time_ms?: number;
  status: ScriptStatus;
  is_current: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateScriptParams {
  project_id: string;
  script_length: ScriptLength;
  title?: string;
  content: string;
  word_count?: number;
  estimated_duration_seconds?: number;
  generation_params?: any;
  ai_model?: string;
  ai_provider?: string;
  generation_time_ms?: number;
  set_as_current?: boolean; // Default: true
}

/**
 * Create a new script version with automatic versioning
 * Automatically increments version number for the specific length variant
 */
export async function createScriptVersion(
  params: CreateScriptParams
): Promise<ScriptVersion> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get next version number for this project + length combination
    const versionResult = await client.query(
      'SELECT get_next_script_version($1, $2) as next_version',
      [params.project_id, params.script_length]
    );
    const nextVersion = versionResult.rows[0].next_version;
    
    // Auto-generate title if not provided
    const title = params.title || `${params.script_length} v${nextVersion}`;
    
    // If set_as_current is true (default), unset other current scripts of same length
    const setAsCurrent = params.set_as_current !== false;
    if (setAsCurrent) {
      await client.query(
        `UPDATE script_generations 
         SET is_current = false 
         WHERE project_id = $1 AND script_length = $2 AND is_current = true`,
        [params.project_id, params.script_length]
      );
    }
    
    // Insert new script version
    const result = await client.query(
      `INSERT INTO script_generations (
        project_id, script_length, version, title, content,
        word_count, estimated_duration_seconds, generation_params,
        ai_model, ai_provider, generation_time_ms, status, is_current
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        params.project_id,
        params.script_length,
        nextVersion,
        title,
        params.content,
        params.word_count,
        params.estimated_duration_seconds,
        params.generation_params ? JSON.stringify(params.generation_params) : null,
        params.ai_model,
        params.ai_provider,
        params.generation_time_ms,
        'generated',
        setAsCurrent,
      ]
    );
    
    await client.query('COMMIT');
    
    console.log(`✅ Created script version: ${params.script_length} v${nextVersion} (${result.rows[0].id})`);
    
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to create script version:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all versions of a specific script length for a project
 */
export async function getScriptVersions(
  projectId: string,
  scriptLength: ScriptLength
): Promise<ScriptVersion[]> {
  const result = await pool.query(
    `SELECT * FROM script_generations 
     WHERE project_id = $1 AND script_length = $2 
     ORDER BY version DESC`,
    [projectId, scriptLength]
  );
  
  return result.rows;
}

/**
 * Get all current scripts (one per length variant)
 */
export async function getCurrentScripts(
  projectId: string
): Promise<Record<ScriptLength, ScriptVersion | null>> {
  const result = await pool.query(
    `SELECT * FROM script_generations 
     WHERE project_id = $1 AND is_current = true`,
    [projectId]
  );
  
  const scripts: Record<ScriptLength, ScriptVersion | null> = {
    executive: null,
    essential: null,
    comprehensive: null,
    'deep-dive': null,
  };
  
  result.rows.forEach((row) => {
    scripts[row.script_length as ScriptLength] = row;
  });
  
  return scripts;
}

/**
 * Get current script for a specific length
 */
export async function getCurrentScriptByLength(
  projectId: string,
  scriptLength: ScriptLength
): Promise<ScriptVersion | null> {
  const result = await pool.query(
    `SELECT * FROM script_generations 
     WHERE project_id = $1 AND script_length = $2 AND is_current = true`,
    [projectId, scriptLength]
  );
  
  return result.rows[0] || null;
}

/**
 * Set a specific script version as current
 * Unsets all other versions of the same length
 */
export async function setCurrentScriptVersion(
  scriptId: string
): Promise<void> {
  await pool.query('SELECT set_current_script($1)', [scriptId]);
  console.log(`✅ Set script ${scriptId} as current`);
}

/**
 * Get a specific script by ID
 */
export async function getScriptById(
  scriptId: string
): Promise<ScriptVersion | null> {
  const result = await pool.query(
    'SELECT * FROM script_generations WHERE id = $1',
    [scriptId]
  );
  
  return result.rows[0] || null;
}

/**
 * Update script status
 */
export async function updateScriptStatus(
  scriptId: string,
  status: ScriptStatus
): Promise<void> {
  await pool.query(
    'UPDATE script_generations SET status = $1 WHERE id = $2',
    [status, scriptId]
  );
  
  console.log(`✅ Updated script ${scriptId} status to ${status}`);
}

/**
 * Delete a script version
 * Cannot delete if it's the current version - must set another as current first
 */
export async function deleteScriptVersion(
  scriptId: string
): Promise<void> {
  const script = await getScriptById(scriptId);
  
  if (!script) {
    throw new Error('Script not found');
  }
  
  if (script.is_current) {
    throw new Error('Cannot delete current script version. Set another version as current first.');
  }
  
  await pool.query(
    'DELETE FROM script_generations WHERE id = $1',
    [scriptId]
  );
  
  console.log(`✅ Deleted script version ${scriptId}`);
}

/**
 * Get script generation statistics for a project
 */
export async function getScriptStats(projectId: string) {
  const result = await pool.query(
    `SELECT 
      script_length,
      COUNT(*) as total_versions,
      MAX(version) as latest_version,
      MAX(CASE WHEN is_current THEN version END) as current_version,
      SUM(word_count) as total_words,
      AVG(generation_time_ms) as avg_generation_time
     FROM script_generations 
     WHERE project_id = $1 
     GROUP BY script_length`,
    [projectId]
  );
  
  return result.rows;
}

/**
 * Compare two script versions
 */
export async function compareScriptVersions(
  scriptId1: string,
  scriptId2: string
): Promise<{
  script1: ScriptVersion;
  script2: ScriptVersion;
  differences: {
    word_count_diff: number;
    duration_diff: number;
    version_diff: number;
  };
}> {
  const script1 = await getScriptById(scriptId1);
  const script2 = await getScriptById(scriptId2);
  
  if (!script1 || !script2) {
    throw new Error('One or both scripts not found');
  }
  
  return {
    script1,
    script2,
    differences: {
      word_count_diff: (script1.word_count || 0) - (script2.word_count || 0),
      duration_diff: (script1.estimated_duration_seconds || 0) - (script2.estimated_duration_seconds || 0),
      version_diff: script1.version - script2.version,
    },
  };
}
