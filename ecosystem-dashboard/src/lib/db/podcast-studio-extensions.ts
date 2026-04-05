import { pool } from './podcast-studio-db';

// Extended type definitions

export interface ChatMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  provider?: string;
  tokens_used?: number;
  context?: any;
  tools_used?: any;
  confidence_score?: number;
  is_pinned: boolean;
  is_saved_as_insight: boolean;
  is_saved_as_note: boolean;
  parent_message_id?: string;
  thread_id?: string;
  created_at: Date;
  metadata?: any;
}

export interface SourceCitation {
  id: string;
  project_id: string;
  material_id?: string;
  citation_type: 'reference' | 'quote' | 'paraphrase' | 'data';
  quoted_text?: string;
  page_number?: number;
  timestamp_seconds?: number;
  timestamp_end_seconds?: number;
  location_description?: string;
  cited_in_insight_id?: string;
  cited_in_note_id?: string;
  cited_in_script_id?: string;
  cited_in_message_id?: string;
  context?: string;
  relevance_score?: number;
  created_at: Date;
  updated_at: Date;
  metadata?: any;
}

export interface Tag {
  id: string;
  project_id: string;
  name: string;
  color?: string;
  description?: string;
  created_at: Date;
}

export interface FileOutput {
  id: string;
  project_id: string;
  file_type: string;
  file_name: string;
  file_path: string;
  file_size_bytes?: number;
  mime_type?: string;
  storage_provider: 'local' | 's3' | 'gcs' | 'azure';
  storage_bucket?: string;
  storage_region?: string;
  version: number;
  is_current: boolean;
  parent_file_id?: string;
  script_id?: string;
  audio_id?: string;
  export_id?: string;
  is_public: boolean;
  public_url?: string;
  access_token?: string;
  expires_at?: Date;
  checksum?: string;
  download_count: number;
  last_accessed_at?: Date;
  created_at: Date;
  updated_at: Date;
  metadata?: any;
}

export interface Comment {
  id: string;
  project_id: string;
  target_type: string;
  target_id: string;
  content: string;
  author: string;
  parent_comment_id?: string;
  is_resolved: boolean;
  resolved_at?: Date;
  resolved_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ActivityLog {
  id: string;
  project_id: string;
  activity_type: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  session_id?: string;
  before_state?: any;
  after_state?: any;
  changes_summary?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// Chat Messages Functions

/**
 * Get chat messages for a project
 */
export async function getChatMessages(
  projectId: string,
  limit: number = 100
): Promise<ChatMessage[]> {
  const result = await pool.query(
    `SELECT * FROM chat_messages 
     WHERE project_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [projectId, limit]
  );
  return result.rows;
}

/**
 * Add a chat message
 */
export async function addChatMessage(
  message: Omit<ChatMessage, 'id' | 'created_at'>
): Promise<ChatMessage> {
  const result = await pool.query(
    `INSERT INTO chat_messages (
      project_id, role, content, model, provider, tokens_used,
      context, tools_used, confidence_score, is_pinned,
      is_saved_as_insight, is_saved_as_note, parent_message_id,
      thread_id, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      message.project_id,
      message.role,
      message.content,
      message.model,
      message.provider,
      message.tokens_used,
      message.context ? JSON.stringify(message.context) : null,
      message.tools_used ? JSON.stringify(message.tools_used) : null,
      message.confidence_score,
      message.is_pinned || false,
      message.is_saved_as_insight || false,
      message.is_saved_as_note || false,
      message.parent_message_id,
      message.thread_id,
      message.metadata ? JSON.stringify(message.metadata) : null,
    ]
  );
  return result.rows[0];
}

/**
 * Pin/unpin a chat message
 */
export async function toggleMessagePin(messageId: string): Promise<ChatMessage> {
  const result = await pool.query(
    `UPDATE chat_messages 
     SET is_pinned = NOT is_pinned 
     WHERE id = $1 
     RETURNING *`,
    [messageId]
  );
  return result.rows[0];
}

// Source Citations Functions

/**
 * Get citations for a material
 */
export async function getCitationsForMaterial(materialId: string): Promise<SourceCitation[]> {
  const result = await pool.query(
    'SELECT * FROM source_citations WHERE material_id = $1 ORDER BY created_at DESC',
    [materialId]
  );
  return result.rows;
}

/**
 * Create a citation
 */
export async function createCitation(
  citation: Omit<SourceCitation, 'id' | 'created_at' | 'updated_at'>
): Promise<SourceCitation> {
  const result = await pool.query(
    `INSERT INTO source_citations (
      project_id, material_id, citation_type, quoted_text,
      page_number, timestamp_seconds, timestamp_end_seconds,
      location_description, cited_in_insight_id, cited_in_note_id,
      cited_in_script_id, cited_in_message_id, context, relevance_score, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      citation.project_id,
      citation.material_id,
      citation.citation_type || 'reference',
      citation.quoted_text,
      citation.page_number,
      citation.timestamp_seconds,
      citation.timestamp_end_seconds,
      citation.location_description,
      citation.cited_in_insight_id,
      citation.cited_in_note_id,
      citation.cited_in_script_id,
      citation.cited_in_message_id,
      citation.context,
      citation.relevance_score,
      citation.metadata ? JSON.stringify(citation.metadata) : null,
    ]
  );
  return result.rows[0];
}

// Tags Functions

/**
 * Get tags for a project
 */
export async function getTags(projectId: string): Promise<Tag[]> {
  const result = await pool.query(
    'SELECT * FROM tags WHERE project_id = $1 ORDER BY name',
    [projectId]
  );
  return result.rows;
}

/**
 * Create a tag
 */
export async function createTag(
  tag: Omit<Tag, 'id' | 'created_at'>
): Promise<Tag> {
  const result = await pool.query(
    `INSERT INTO tags (project_id, name, color, description)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (project_id, name) DO UPDATE 
     SET color = EXCLUDED.color, description = EXCLUDED.description
     RETURNING *`,
    [tag.project_id, tag.name, tag.color, tag.description]
  );
  return result.rows[0];
}

/**
 * Tag a material
 */
export async function tagMaterial(materialId: string, tagId: string): Promise<void> {
  await pool.query(
    `INSERT INTO material_tags (material_id, tag_id) 
     VALUES ($1, $2) 
     ON CONFLICT DO NOTHING`,
    [materialId, tagId]
  );
}

/**
 * Tag an insight
 */
export async function tagInsight(insightId: string, tagId: string): Promise<void> {
  await pool.query(
    `INSERT INTO insight_tags (insight_id, tag_id) 
     VALUES ($1, $2) 
     ON CONFLICT DO NOTHING`,
    [insightId, tagId]
  );
}

/**
 * Tag a note
 */
export async function tagNote(noteId: string, tagId: string): Promise<void> {
  await pool.query(
    `INSERT INTO note_tags (note_id, tag_id) 
     VALUES ($1, $2) 
     ON CONFLICT DO NOTHING`,
    [noteId, tagId]
  );
}

/**
 * Get tags for a material with details
 */
export async function getMaterialTags(materialId: string): Promise<Tag[]> {
  const result = await pool.query(
    `SELECT t.* FROM tags t
     INNER JOIN material_tags mt ON t.id = mt.tag_id
     WHERE mt.material_id = $1
     ORDER BY t.name`,
    [materialId]
  );
  return result.rows;
}

// File Outputs Functions

/**
 * Get file outputs for a project
 */
export async function getFileOutputs(
  projectId: string,
  fileType?: string
): Promise<FileOutput[]> {
  let query = 'SELECT * FROM file_outputs WHERE project_id = $1';
  const params: any[] = [projectId];
  
  if (fileType) {
    query += ' AND file_type = $2';
    params.push(fileType);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Create a file output record
 */
export async function createFileOutput(
  file: Omit<FileOutput, 'id' | 'created_at' | 'updated_at'>
): Promise<FileOutput> {
  const result = await pool.query(
    `INSERT INTO file_outputs (
      project_id, file_type, file_name, file_path, file_size_bytes,
      mime_type, storage_provider, storage_bucket, storage_region,
      version, is_current, parent_file_id, script_id, audio_id,
      export_id, is_public, public_url, access_token, expires_at,
      checksum, download_count, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    RETURNING *`,
    [
      file.project_id,
      file.file_type,
      file.file_name,
      file.file_path,
      file.file_size_bytes,
      file.mime_type,
      file.storage_provider || 'local',
      file.storage_bucket,
      file.storage_region,
      file.version || 1,
      file.is_current !== false,
      file.parent_file_id,
      file.script_id,
      file.audio_id,
      file.export_id,
      file.is_public || false,
      file.public_url,
      file.access_token,
      file.expires_at,
      file.checksum,
      file.download_count || 0,
      file.metadata ? JSON.stringify(file.metadata) : null,
    ]
  );
  return result.rows[0];
}

/**
 * Increment file download count
 */
export async function incrementDownloadCount(fileId: string): Promise<void> {
  await pool.query(
    `UPDATE file_outputs 
     SET download_count = download_count + 1, 
         last_accessed_at = CURRENT_TIMESTAMP 
     WHERE id = $1`,
    [fileId]
  );
}

// Comments Functions

/**
 * Get comments for a target
 */
export async function getComments(
  targetType: string,
  targetId: string
): Promise<Comment[]> {
  const result = await pool.query(
    `SELECT * FROM comments 
     WHERE target_type = $1 AND target_id = $2 
     ORDER BY created_at ASC`,
    [targetType, targetId]
  );
  return result.rows;
}

/**
 * Add a comment
 */
export async function addComment(
  comment: Omit<Comment, 'id' | 'created_at' | 'updated_at'>
): Promise<Comment> {
  const result = await pool.query(
    `INSERT INTO comments (
      project_id, target_type, target_id, content, author,
      parent_comment_id, is_resolved, resolved_at, resolved_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      comment.project_id,
      comment.target_type,
      comment.target_id,
      comment.content,
      comment.author,
      comment.parent_comment_id,
      comment.is_resolved || false,
      comment.resolved_at,
      comment.resolved_by,
    ]
  );
  return result.rows[0];
}

// Activity Log Functions

/**
 * Log an activity
 */
export async function logActivity(
  activity: Omit<ActivityLog, 'id' | 'created_at'>
): Promise<ActivityLog> {
  const result = await pool.query(
    `INSERT INTO activity_log (
      project_id, activity_type, entity_type, entity_id,
      user_id, session_id, before_state, after_state,
      changes_summary, ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      activity.project_id,
      activity.activity_type,
      activity.entity_type,
      activity.entity_id,
      activity.user_id,
      activity.session_id,
      activity.before_state ? JSON.stringify(activity.before_state) : null,
      activity.after_state ? JSON.stringify(activity.after_state) : null,
      activity.changes_summary,
      activity.ip_address,
      activity.user_agent,
    ]
  );
  return result.rows[0];
}

/**
 * Get activity log for a project
 */
export async function getActivityLog(
  projectId: string,
  limit: number = 50
): Promise<ActivityLog[]> {
  const result = await pool.query(
    `SELECT * FROM activity_log 
     WHERE project_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [projectId, limit]
  );
  return result.rows;
}
