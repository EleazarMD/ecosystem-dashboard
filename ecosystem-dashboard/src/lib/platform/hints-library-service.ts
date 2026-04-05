/**
 * Hints Library Service
 * 
 * Multi-tenant hints library that provides contextual hints, encouragements,
 * and teaching prompts based on user preferences, theme, age, and learning style.
 * 
 * Hints are injected on-demand into the AI system prompt based on:
 * - User's selected character/theme (Pusheen for Sofia, Minecraft for Luca)
 * - User's age and grade level
 * - Current subject/topic being discussed
 * - Learning style preferences
 * - Hint type needed (teaching, encouragement, celebration, etc.)
 * 
 * TTS Integration:
 * - Each character has a mapped TTS voice for read-aloud functionality
 * - Voice parameters are tuned per character personality
 * - See tts-voices-config.ts for character-to-voice mappings
 */

import { Pool } from 'pg';
import { getVoiceForCharacter, CHARACTER_VOICE_MAP } from './tts-voices-config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export type HintType = 'teaching' | 'encouragement' | 'safety' | 'transition' | 'celebration';

export interface Hint {
  id: string;
  name: string;
  description: string | null;
  hintType: HintType;
  content: string;
  targetAudience: string;
  minAge: number | null;
  maxAge: number | null;
  gradeLevel: string | null;
  theme: string | null;
  characterName: string | null;
  learningStyle: string | null;
  educationalFocus: string[];
  subjectArea: string | null;
  difficultyLevel: string;
  usageCount: number;
  effectivenessScore: number;
  tags: string[];
  isActive: boolean;
}

export interface HintSelectionCriteria {
  theme?: string;
  characterName?: string;
  age?: number;
  gradeLevel?: string;
  hintType?: HintType;
  subjectArea?: string;
  learningStyle?: string;
  educationalFocus?: string[];
  difficultyLevel?: string;
  limit?: number;
}

/**
 * Get hints matching the given criteria
 * Multi-tenant: filters by theme to ensure hints match user's selected character world
 */
export async function getHints(criteria: HintSelectionCriteria): Promise<Hint[]> {
  let sql = `
    SELECT * FROM child_learning.hints_library
    WHERE is_active = true
  `;
  const params: any[] = [];
  let paramIndex = 1;

  // Theme filter (critical for multi-tenant compliance)
  if (criteria.theme) {
    sql += ` AND (theme = $${paramIndex} OR theme IS NULL)`;
    params.push(criteria.theme);
    paramIndex++;
  }

  // Character filter
  if (criteria.characterName) {
    sql += ` AND (character_name = $${paramIndex} OR character_name IS NULL)`;
    params.push(criteria.characterName);
    paramIndex++;
  }

  // Age filter
  if (criteria.age) {
    sql += ` AND (min_age IS NULL OR min_age <= $${paramIndex})`;
    params.push(criteria.age);
    paramIndex++;
    sql += ` AND (max_age IS NULL OR max_age >= $${paramIndex})`;
    params.push(criteria.age);
    paramIndex++;
  }

  // Hint type filter
  if (criteria.hintType) {
    sql += ` AND hint_type = $${paramIndex}`;
    params.push(criteria.hintType);
    paramIndex++;
  }

  // Subject area filter
  if (criteria.subjectArea) {
    sql += ` AND (subject_area = $${paramIndex} OR subject_area = 'general' OR subject_area IS NULL)`;
    params.push(criteria.subjectArea);
    paramIndex++;
  }

  // Difficulty level filter
  if (criteria.difficultyLevel) {
    sql += ` AND (difficulty_level = $${paramIndex} OR difficulty_level = 'beginner')`;
    params.push(criteria.difficultyLevel);
    paramIndex++;
  }

  // Order by effectiveness and usage
  sql += ` ORDER BY effectiveness_score DESC, usage_count DESC`;

  // Limit
  const limit = criteria.limit || 5;
  sql += ` LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await pool.query(sql, params);
  return result.rows.map(mapHintRow);
}

/**
 * Get a single random hint matching criteria
 * Useful for injecting variety into responses
 */
export async function getRandomHint(criteria: HintSelectionCriteria): Promise<Hint | null> {
  const hints = await getHints({ ...criteria, limit: 10 });
  if (hints.length === 0) return null;
  
  // Weighted random selection based on effectiveness
  const totalWeight = hints.reduce((sum, h) => sum + h.effectivenessScore, 0);
  let random = Math.random() * totalWeight;
  
  for (const hint of hints) {
    random -= hint.effectivenessScore;
    if (random <= 0) {
      // Record usage
      await recordHintUsage(hint.id);
      return hint;
    }
  }
  
  return hints[0];
}

/**
 * Get hints for a specific user context
 * This is the main entry point for multi-tenant hint injection
 */
export async function getHintsForUserContext(
  userId: string,
  context: {
    theme?: string;
    characterName?: string;
    age?: number;
    currentSubject?: string;
    hintType?: HintType;
    learningStyle?: string;
  }
): Promise<Hint[]> {
  // Build criteria from user context
  const criteria: HintSelectionCriteria = {
    theme: context.theme,
    characterName: context.characterName,
    age: context.age,
    subjectArea: context.currentSubject,
    hintType: context.hintType,
    learningStyle: context.learningStyle,
    limit: 5,
  };

  return getHints(criteria);
}

/**
 * Build a hints injection block for the system prompt
 * Returns formatted hints that can be appended to the AI system prompt
 */
export async function buildHintsInjection(
  theme: string,
  age: number,
  options: {
    characterName?: string;
    currentSubject?: string;
    includeTypes?: HintType[];
  } = {}
): Promise<string> {
  const includeTypes = options.includeTypes || ['teaching', 'encouragement', 'celebration', 'transition'];
  
  const hintsPromises = includeTypes.map(hintType => 
    getRandomHint({
      theme,
      age,
      characterName: options.characterName,
      subjectArea: options.currentSubject,
      hintType,
    })
  );

  const hints = (await Promise.all(hintsPromises)).filter(Boolean) as Hint[];

  if (hints.length === 0) {
    return '';
  }

  let injection = `
═══════════════════════════════════════════════════════════
CONTEXTUAL HINTS LIBRARY (Use these naturally in responses)
═══════════════════════════════════════════════════════════
`;

  for (const hint of hints) {
    injection += `
[${hint.hintType.toUpperCase()}]: ${hint.content}
`;
  }

  injection += `
Use these hints naturally when appropriate - don't force them!
═══════════════════════════════════════════════════════════
`;

  // Add TTS voice context if character is specified
  if (options.characterName) {
    const voiceInfo = getVoiceForCharacter(options.characterName, theme);
    if (voiceInfo) {
      injection += `
═══════════════════════════════════════════════════════════
TTS VOICE CONTEXT (for Read Aloud feature)
═══════════════════════════════════════════════════════════
Character: ${voiceInfo.name} ${voiceInfo.emoji}
Voice Style: ${voiceInfo.style}
Voice ID: ${voiceInfo.id}
Description: ${voiceInfo.description}

When the child uses Read Aloud, responses will be spoken in this character's voice.
Write responses that sound natural when read aloud by ${voiceInfo.name}.
═══════════════════════════════════════════════════════════
`;
    }
  }

  return injection;
}

/**
 * Record hint usage for analytics
 */
export async function recordHintUsage(hintId: string): Promise<void> {
  await pool.query(`
    UPDATE child_learning.hints_library
    SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = $1
  `, [hintId]);
}

/**
 * Update hint effectiveness score based on feedback
 */
export async function updateHintEffectiveness(
  hintId: string,
  wasEffective: boolean
): Promise<void> {
  // Simple moving average update
  const adjustment = wasEffective ? 0.05 : -0.02;
  await pool.query(`
    UPDATE child_learning.hints_library
    SET effectiveness_score = GREATEST(0.1, LEAST(1.0, effectiveness_score + $1)),
        updated_at = NOW()
    WHERE id = $2
  `, [adjustment, hintId]);
}

/**
 * Create a new hint
 */
export async function createHint(hint: Omit<Hint, 'id' | 'usageCount' | 'effectivenessScore' | 'isActive'>): Promise<Hint> {
  const result = await pool.query(`
    INSERT INTO child_learning.hints_library (
      name, description, hint_type, content,
      target_audience, min_age, max_age, grade_level,
      theme, character_name, learning_style,
      educational_focus, subject_area, difficulty_level,
      tags, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *
  `, [
    hint.name,
    hint.description,
    hint.hintType,
    hint.content,
    hint.targetAudience || 'child',
    hint.minAge,
    hint.maxAge,
    hint.gradeLevel,
    hint.theme,
    hint.characterName,
    hint.learningStyle,
    JSON.stringify(hint.educationalFocus || []),
    hint.subjectArea,
    hint.difficultyLevel || 'beginner',
    JSON.stringify(hint.tags || []),
    'admin',
  ]);

  return mapHintRow(result.rows[0]);
}

/**
 * Update an existing hint
 */
export async function updateHint(id: string, updates: Partial<Hint>): Promise<Hint | null> {
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
  if (updates.hintType !== undefined) {
    fields.push(`hint_type = $${paramIndex++}`);
    values.push(updates.hintType);
  }
  if (updates.content !== undefined) {
    fields.push(`content = $${paramIndex++}`);
    values.push(updates.content);
  }
  if (updates.theme !== undefined) {
    fields.push(`theme = $${paramIndex++}`);
    values.push(updates.theme);
  }
  if (updates.minAge !== undefined) {
    fields.push(`min_age = $${paramIndex++}`);
    values.push(updates.minAge);
  }
  if (updates.maxAge !== undefined) {
    fields.push(`max_age = $${paramIndex++}`);
    values.push(updates.maxAge);
  }
  if (updates.subjectArea !== undefined) {
    fields.push(`subject_area = $${paramIndex++}`);
    values.push(updates.subjectArea);
  }
  if (updates.difficultyLevel !== undefined) {
    fields.push(`difficulty_level = $${paramIndex++}`);
    values.push(updates.difficultyLevel);
  }
  if (updates.isActive !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(updates.isActive);
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(`
    UPDATE child_learning.hints_library
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values);

  return result.rows.length > 0 ? mapHintRow(result.rows[0]) : null;
}

/**
 * Delete a hint
 */
export async function deleteHint(id: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM child_learning.hints_library WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows.length > 0;
}

/**
 * Get all hints for admin management
 */
export async function getAllHints(filters?: {
  theme?: string;
  hintType?: HintType;
  subjectArea?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ hints: Hint[]; total: number }> {
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.theme) {
    whereClause += ` AND theme = $${paramIndex++}`;
    params.push(filters.theme);
  }
  if (filters?.hintType) {
    whereClause += ` AND hint_type = $${paramIndex++}`;
    params.push(filters.hintType);
  }
  if (filters?.subjectArea) {
    whereClause += ` AND subject_area = $${paramIndex++}`;
    params.push(filters.subjectArea);
  }
  if (filters?.search) {
    whereClause += ` AND (name ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM child_learning.hints_library ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get hints with pagination
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;
  params.push(limit, offset);

  const result = await pool.query(`
    SELECT * FROM child_learning.hints_library
    ${whereClause}
    ORDER BY theme, hint_type, name
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, params);

  return {
    hints: result.rows.map(mapHintRow),
    total,
  };
}

function mapHintRow(row: any): Hint {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    hintType: row.hint_type,
    content: row.content,
    targetAudience: row.target_audience,
    minAge: row.min_age,
    maxAge: row.max_age,
    gradeLevel: row.grade_level,
    theme: row.theme,
    characterName: row.character_name,
    learningStyle: row.learning_style,
    educationalFocus: row.educational_focus || [],
    subjectArea: row.subject_area,
    difficultyLevel: row.difficulty_level,
    usageCount: row.usage_count,
    effectivenessScore: parseFloat(row.effectiveness_score),
    tags: row.tags || [],
    isActive: row.is_active,
  };
}
