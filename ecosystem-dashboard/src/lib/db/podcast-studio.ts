import { query, transaction } from './client';

// ==========================================
// TYPES
// ==========================================

export interface PodcastProject {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'in_progress' | 'ready' | 'published';
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
  script_length?: string;
  script_tone?: string;
  script_audience?: string;
  script_style?: string;
  script_emphasis?: string;
  include_stories?: boolean;
  include_examples?: boolean;
}

export interface ResearchMaterial {
  id: string;
  project_id: string;
  title: string;
  type: string;
  url?: string;
  file_path?: string;
  content?: string;
  content_hash?: string;
  page_count?: number;
  word_count?: number;
  is_selected: boolean;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
}

export interface PodcastHost {
  id: string;
  project_id: string;
  name: string;
  voice_id?: string;
  voice_provider: string;
  role: string;
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
  version: number;
  content: string;
  word_count?: number;
  estimated_duration_seconds?: number;
  generation_params: Record<string, any>;
  ai_model?: string;
  ai_provider?: string;
  generation_time_ms?: number;
  status: string;
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

// ==========================================
// PROJECTS
// ==========================================

export async function getAllProjects(): Promise<PodcastProject[]> {
  const result = await query<PodcastProject>(
    'SELECT * FROM podcast_projects ORDER BY updated_at DESC'
  );
  return result.rows;
}

export async function getProject(id: string): Promise<PodcastProject | null> {
  const result = await query<PodcastProject>(
    'SELECT * FROM podcast_projects WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function createProject(
  data: Partial<PodcastProject>
): Promise<PodcastProject> {
  const result = await query<PodcastProject>(
    `INSERT INTO podcast_projects (
      title, description, status, created_by, metadata,
      script_length, script_tone, script_audience, script_style, script_emphasis,
      include_stories, include_examples
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      data.title,
      data.description,
      data.status || 'draft',
      data.created_by,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.script_length || 'default',
      data.script_tone || 'conversational',
      data.script_audience || 'general',
      data.script_style || 'co-host',
      data.script_emphasis,
      data.include_stories !== false,
      data.include_examples !== false,
    ]
  );
  return result.rows[0];
}

export async function updateProject(
  id: string,
  data: Partial<PodcastProject>
): Promise<PodcastProject> {
  const result = await query<PodcastProject>(
    `UPDATE podcast_projects SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      status = COALESCE($3, status),
      metadata = COALESCE($4, metadata),
      script_length = COALESCE($5, script_length),
      script_tone = COALESCE($6, script_tone),
      script_audience = COALESCE($7, script_audience),
      script_style = COALESCE($8, script_style),
      script_emphasis = COALESCE($9, script_emphasis),
      include_stories = COALESCE($10, include_stories),
      include_examples = COALESCE($11, include_examples)
    WHERE id = $12
    RETURNING *`,
    [
      data.title,
      data.description,
      data.status,
      data.metadata ? JSON.stringify(data.metadata) : undefined,
      data.script_length,
      data.script_tone,
      data.script_audience,
      data.script_style,
      data.script_emphasis,
      data.include_stories,
      data.include_examples,
      id,
    ]
  );
  return result.rows[0];
}

export async function deleteProject(id: string): Promise<void> {
  await query('DELETE FROM podcast_projects WHERE id = $1', [id]);
}

// ==========================================
// RESEARCH MATERIALS
// ==========================================

export async function getResearchMaterials(
  projectId: string
): Promise<ResearchMaterial[]> {
  const result = await query<ResearchMaterial>(
    'SELECT * FROM research_materials WHERE project_id = $1 ORDER BY created_at DESC',
    [projectId]
  );
  return result.rows;
}

export async function addResearchMaterial(
  data: Partial<ResearchMaterial>
): Promise<ResearchMaterial> {
  const result = await query<ResearchMaterial>(
    `INSERT INTO research_materials (
      project_id, title, type, url, file_path, content, content_hash,
      page_count, word_count, is_selected, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      data.project_id,
      data.title,
      data.type,
      data.url,
      data.file_path,
      data.content,
      data.content_hash,
      data.page_count,
      data.word_count,
      data.is_selected || false,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]
  );
  return result.rows[0];
}

export async function updateResearchMaterial(
  id: string,
  data: Partial<ResearchMaterial>
): Promise<ResearchMaterial> {
  const result = await query<ResearchMaterial>(
    `UPDATE research_materials SET
      is_selected = COALESCE($1, is_selected),
      metadata = COALESCE($2, metadata)
    WHERE id = $3
    RETURNING *`,
    [data.is_selected, data.metadata ? JSON.stringify(data.metadata) : undefined, id]
  );
  return result.rows[0];
}

export async function deleteResearchMaterial(id: string): Promise<void> {
  await query('DELETE FROM research_materials WHERE id = $1', [id]);
}

// ==========================================
// HOSTS
// ==========================================

export async function getHosts(projectId: string): Promise<PodcastHost[]> {
  const result = await query<PodcastHost>(
    'SELECT * FROM podcast_hosts WHERE project_id = $1 ORDER BY order_index',
    [projectId]
  );
  return result.rows;
}

export async function addHost(data: Partial<PodcastHost>): Promise<PodcastHost> {
  const result = await query<PodcastHost>(
    `INSERT INTO podcast_hosts (
      project_id, name, voice_id, voice_provider, role, personality,
      speaking_rate, pitch, order_index
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      data.project_id,
      data.name,
      data.voice_id,
      data.voice_provider || 'gemini',
      data.role || 'host',
      data.personality,
      data.speaking_rate || 1.0,
      data.pitch || 0.0,
      data.order_index || 0,
    ]
  );
  return result.rows[0];
}

export async function updateHost(
  id: string,
  data: Partial<PodcastHost>
): Promise<PodcastHost> {
  const result = await query<PodcastHost>(
    `UPDATE podcast_hosts SET
      name = COALESCE($1, name),
      voice_id = COALESCE($2, voice_id),
      voice_provider = COALESCE($3, voice_provider),
      role = COALESCE($4, role),
      personality = COALESCE($5, personality),
      speaking_rate = COALESCE($6, speaking_rate),
      pitch = COALESCE($7, pitch),
      order_index = COALESCE($8, order_index)
    WHERE id = $9
    RETURNING *`,
    [
      data.name,
      data.voice_id,
      data.voice_provider,
      data.role,
      data.personality,
      data.speaking_rate,
      data.pitch,
      data.order_index,
      id,
    ]
  );
  return result.rows[0];
}

export async function deleteHost(id: string): Promise<void> {
  await query('DELETE FROM podcast_hosts WHERE id = $1', [id]);
}

// ==========================================
// SCRIPTS
// ==========================================

export async function getCurrentScript(
  projectId: string
): Promise<ScriptGeneration | null> {
  const result = await query<ScriptGeneration>(
    'SELECT * FROM script_generations WHERE project_id = $1 AND is_current = true',
    [projectId]
  );
  return result.rows[0] || null;
}

export async function getScriptVersions(
  projectId: string
): Promise<ScriptGeneration[]> {
  const result = await query<ScriptGeneration>(
    'SELECT * FROM script_generations WHERE project_id = $1 ORDER BY version DESC',
    [projectId]
  );
  return result.rows;
}

export async function createScriptGeneration(
  data: Partial<ScriptGeneration>
): Promise<ScriptGeneration> {
  return await transaction(async (client) => {
    // Get next version number
    const versionResult = await client.query(
      'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM script_generations WHERE project_id = $1',
      [data.project_id]
    );
    const nextVersion = versionResult.rows[0].next_version;

    // Deactivate current script
    await client.query(
      'UPDATE script_generations SET is_current = false WHERE project_id = $1 AND is_current = true',
      [data.project_id]
    );

    // Insert new script
    const result = await client.query(
      `INSERT INTO script_generations (
        project_id, version, content, word_count, estimated_duration_seconds,
        generation_params, ai_model, ai_provider, generation_time_ms, status, is_current
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING *`,
      [
        data.project_id,
        nextVersion,
        data.content,
        data.word_count,
        data.estimated_duration_seconds,
        JSON.stringify(data.generation_params || {}),
        data.ai_model,
        data.ai_provider,
        data.generation_time_ms,
        data.status || 'generated',
      ]
    );

    return result.rows[0];
  });
}

export async function updateScriptGeneration(
  id: string,
  data: Partial<ScriptGeneration>
): Promise<ScriptGeneration> {
  const result = await query<ScriptGeneration>(
    `UPDATE script_generations SET
      content = COALESCE($1, content),
      status = COALESCE($2, status),
      word_count = COALESCE($3, word_count),
      estimated_duration_seconds = COALESCE($4, estimated_duration_seconds)
    WHERE id = $5
    RETURNING *`,
    [data.content, data.status, data.word_count, data.estimated_duration_seconds, id]
  );
  return result.rows[0];
}

// ==========================================
// WORKFLOW
// ==========================================

export async function getWorkflowState(
  projectId: string
): Promise<WorkflowState | null> {
  const result = await query<WorkflowState>(
    'SELECT * FROM workflow_states WHERE project_id = $1',
    [projectId]
  );
  return result.rows[0] || null;
}

export async function initializeWorkflowState(
  projectId: string
): Promise<WorkflowState> {
  const result = await query<WorkflowState>(
    `INSERT INTO workflow_states (project_id, current_step, progress_percentage)
    VALUES ($1, 1, 0)
    ON CONFLICT (project_id) DO NOTHING
    RETURNING *`,
    [projectId]
  );
  return result.rows[0] || (await getWorkflowState(projectId))!;
}

export async function updateWorkflowState(
  projectId: string,
  data: Partial<WorkflowState>
): Promise<WorkflowState> {
  const result = await query<WorkflowState>(
    `UPDATE workflow_states SET
      step_1_script_generated = COALESCE($1, step_1_script_generated),
      step_1_completed_at = COALESCE($2, step_1_completed_at),
      step_2_audio_generated = COALESCE($3, step_2_audio_generated),
      step_2_completed_at = COALESCE($4, step_2_completed_at),
      step_3_exported = COALESCE($5, step_3_exported),
      step_3_completed_at = COALESCE($6, step_3_completed_at),
      current_step = COALESCE($7, current_step),
      progress_percentage = COALESCE($8, progress_percentage)
    WHERE project_id = $9
    RETURNING *`,
    [
      data.step_1_script_generated,
      data.step_1_completed_at,
      data.step_2_audio_generated,
      data.step_2_completed_at,
      data.step_3_exported,
      data.step_3_completed_at,
      data.current_step,
      data.progress_percentage,
      projectId,
    ]
  );
  return result.rows[0];
}

// ==========================================
// PRESETS
// ==========================================

export interface PodcastPreset {
  id: string;
  name: string;
  description?: string;
  icon: string;
  category: 'default' | 'custom';
  created_by?: string;
  is_public: boolean;
  config: Record<string, any>;
  usage_count: number;
  last_used_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export async function getAllPresets(userId?: string): Promise<PodcastPreset[]> {
  // Get default presets + user's custom presets + public presets
  const result = await query<PodcastPreset>(
    `SELECT * FROM podcast_presets 
     WHERE category = 'default' 
        OR created_by = $1 
        OR (is_public = true AND created_by != $1)
     ORDER BY category DESC, usage_count DESC, name`,
    [userId || 'anonymous']
  );
  return result.rows;
}

export async function getPreset(id: string): Promise<PodcastPreset | null> {
  const result = await query<PodcastPreset>(
    'SELECT * FROM podcast_presets WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function createPreset(
  data: Partial<PodcastPreset>
): Promise<PodcastPreset> {
  const result = await query<PodcastPreset>(
    `INSERT INTO podcast_presets (
      name, description, icon, category, created_by, is_public, config
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      data.name,
      data.description,
      data.icon || '🎙️',
      'custom',
      data.created_by || 'anonymous',
      data.is_public || false,
      JSON.stringify(data.config),
    ]
  );
  return result.rows[0];
}

export async function updatePreset(
  id: string,
  data: Partial<PodcastPreset>
): Promise<PodcastPreset> {
  const result = await query<PodcastPreset>(
    `UPDATE podcast_presets SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      icon = COALESCE($3, icon),
      config = COALESCE($4, config),
      is_public = COALESCE($5, is_public)
    WHERE id = $6
    RETURNING *`,
    [
      data.name,
      data.description,
      data.icon,
      data.config ? JSON.stringify(data.config) : undefined,
      data.is_public,
      id,
    ]
  );
  return result.rows[0];
}

export async function deletePreset(id: string): Promise<void> {
  await query('DELETE FROM podcast_presets WHERE id = $1', [id]);
}

export async function incrementPresetUsage(id: string): Promise<void> {
  await query(
    `UPDATE podcast_presets 
     SET usage_count = usage_count + 1,
         last_used_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id]
  );
}

// ==========================================
// COMPLETE PROJECT WITH ALL DATA
// ==========================================

export async function getCompleteProject(projectId: string) {
  const [project, materials, hosts, script, workflow] = await Promise.all([
    getProject(projectId),
    getResearchMaterials(projectId),
    getHosts(projectId),
    getCurrentScript(projectId),
    getWorkflowState(projectId),
  ]);

  return {
    project,
    materials,
    hosts,
    script,
    workflow,
  };
}
