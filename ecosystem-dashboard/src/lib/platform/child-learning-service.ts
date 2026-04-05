/**
 * Child Learning Service
 * 
 * Service layer for managing child's Personal Interest Catalog (PIC),
 * Knowledge Base, and GooseMind recipe personalization.
 */

import { Pool } from 'pg';
import {
  PersonalInterest,
  KnowledgeEntry,
  LearningProgress,
  ChildRecipe,
  RecipeAssignment,
  ConversationMemory,
  ChildAchievement,
  ChildPersonalizationContext,
  ChildGooseMindConfig,
  InterestCategory,
  MemoryType,
  KnowledgeSource,
  DifficultyLevel,
  DEFAULT_CHARACTERS,
} from './child-learning-types';
import { getChildSafetySystemPrompt } from './content-filter-service';
import { ParentalControlsConfig } from './child-account-types';
import { buildHintsInjection } from './hints-library-service';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// ============================================================================
// Personal Interest Catalog (PIC)
// ============================================================================

/**
 * Update or create an interest when mentioned in conversation
 */
export async function updateInterestEngagement(
  childUserId: string,
  interestName: string,
  category: InterestCategory,
  mentionContext?: string
): Promise<string> {
  const result = await pool.query(
    `SELECT child_learning.update_interest_engagement($1, $2, $3, $4) as id`,
    [childUserId, interestName, category, mentionContext]
  );
  return result.rows[0].id;
}

/**
 * Get top interests for a child
 */
export async function getTopInterests(
  childUserId: string,
  limit: number = 10
): Promise<PersonalInterest[]> {
  const result = await pool.query(
    `SELECT * FROM child_learning.get_top_interests($1, $2)`,
    [childUserId, limit]
  );
  return result.rows.map(row => ({
    id: row.id,
    childUserId,
    interestName: row.interest_name,
    interestCategory: row.category,
    mentionCount: row.mention_count,
    engagementScore: parseFloat(row.engagement_score),
    knowledgeLevel: row.knowledge_level,
  } as PersonalInterest));
}

/**
 * Get all interests for a child
 */
export async function getAllInterests(childUserId: string): Promise<PersonalInterest[]> {
  const result = await pool.query(`
    SELECT *
    FROM child_learning.personal_interests
    WHERE child_user_id = $1 AND is_active = true
    ORDER BY engagement_score DESC, last_mentioned_at DESC
  `, [childUserId]);
  
  return result.rows.map(mapInterestRow);
}

/**
 * Add interest manually (by parent)
 */
export async function addInterestManually(
  childUserId: string,
  interestName: string,
  category: InterestCategory,
  parentNotes?: string
): Promise<PersonalInterest> {
  const result = await pool.query(`
    INSERT INTO child_learning.personal_interests (
      child_user_id, interest_name, interest_category, 
      discovered_by, parent_notes, engagement_score
    ) VALUES ($1, $2, $3, 'parent_input', $4, 0.7)
    ON CONFLICT (child_user_id, interest_name) 
    DO UPDATE SET 
      parent_notes = COALESCE($4, child_learning.personal_interests.parent_notes),
      updated_at = NOW()
    RETURNING *
  `, [childUserId, interestName, category, parentNotes]);
  
  return mapInterestRow(result.rows[0]);
}

function mapInterestRow(row: any): PersonalInterest {
  return {
    id: row.id,
    childUserId: row.child_user_id,
    interestName: row.interest_name,
    interestCategory: row.interest_category,
    mentionCount: row.mention_count,
    lastMentionedAt: row.last_mentioned_at,
    firstMentionedAt: row.first_mentioned_at,
    engagementScore: parseFloat(row.engagement_score || 0),
    sampleMentions: row.sample_mentions || [],
    relatedInterests: row.related_interests || [],
    knowledgeLevel: row.knowledge_level,
    preferredContentType: row.preferred_content_type,
    isVisibleToParent: row.is_visible_to_parent,
    parentNotes: row.parent_notes,
    isActive: row.is_active,
    discoveredBy: row.discovered_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Knowledge Base
// ============================================================================

/**
 * Add a knowledge entry for a child
 */
export async function addKnowledgeEntry(
  childUserId: string,
  topic: string,
  factOrConcept: string,
  options: {
    explanationSimple?: string;
    category?: InterestCategory;
    tags?: string[];
    source?: KnowledgeSource;
    conversationId?: string;
    difficultyLevel?: DifficultyLevel;
    relatedInterestId?: string;
  } = {}
): Promise<KnowledgeEntry> {
  const result = await pool.query(`
    INSERT INTO child_learning.knowledge_base (
      child_user_id, topic, fact_or_concept, explanation_simple,
      category, tags, source, conversation_id, difficulty_level,
      related_interest_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    childUserId,
    topic,
    factOrConcept,
    options.explanationSimple,
    options.category,
    JSON.stringify(options.tags || []),
    options.source || 'conversation',
    options.conversationId,
    options.difficultyLevel || 'easy',
    options.relatedInterestId,
  ]);
  
  return mapKnowledgeRow(result.rows[0]);
}

/**
 * Get knowledge entries for a child
 */
export async function getKnowledgeEntries(
  childUserId: string,
  options: {
    category?: InterestCategory;
    limit?: number;
    onlyFavorites?: boolean;
    needsReview?: boolean;
  } = {}
): Promise<KnowledgeEntry[]> {
  let sql = `
    SELECT * FROM child_learning.knowledge_base
    WHERE child_user_id = $1
  `;
  const params: any[] = [childUserId];
  let paramIndex = 2;
  
  if (options.category) {
    sql += ` AND category = $${paramIndex++}`;
    params.push(options.category);
  }
  
  if (options.onlyFavorites) {
    sql += ` AND is_favorite = true`;
  }
  
  if (options.needsReview) {
    sql += ` AND next_review_date <= CURRENT_DATE`;
  }
  
  sql += ` ORDER BY created_at DESC`;
  
  if (options.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(options.limit);
  }
  
  const result = await pool.query(sql, params);
  return result.rows.map(mapKnowledgeRow);
}

/**
 * Mark knowledge as reviewed (for spaced repetition)
 */
export async function markKnowledgeReviewed(
  knowledgeId: string,
  remembered: boolean
): Promise<void> {
  // Simple spaced repetition: if remembered, push review date further
  const intervalDays = remembered ? 7 : 1;
  
  await pool.query(`
    UPDATE child_learning.knowledge_base
    SET 
      times_reviewed = times_reviewed + 1,
      last_reviewed_at = NOW(),
      retention_score = CASE 
        WHEN $2 THEN LEAST(1.0, retention_score + 0.1)
        ELSE GREATEST(0.0, retention_score - 0.1)
      END,
      next_review_date = CURRENT_DATE + INTERVAL '1 day' * $3,
      is_mastered = CASE WHEN retention_score >= 0.9 AND $2 THEN true ELSE is_mastered END,
      updated_at = NOW()
    WHERE id = $1
  `, [knowledgeId, remembered, intervalDays]);
}

function mapKnowledgeRow(row: any): KnowledgeEntry {
  return {
    id: row.id,
    childUserId: row.child_user_id,
    topic: row.topic,
    factOrConcept: row.fact_or_concept,
    explanationSimple: row.explanation_simple,
    category: row.category,
    tags: row.tags || [],
    relatedInterestId: row.related_interest_id,
    source: row.source,
    conversationId: row.conversation_id,
    timesReviewed: row.times_reviewed,
    lastReviewedAt: row.last_reviewed_at,
    retentionScore: parseFloat(row.retention_score || 0),
    nextReviewDate: row.next_review_date,
    difficultyLevel: row.difficulty_level,
    minAge: row.min_age,
    maxAge: row.max_age,
    isMastered: row.is_mastered,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Recipe Management
// ============================================================================

/**
 * Get available child recipes
 */
export async function getChildRecipes(
  options: {
    category?: string;
    includeSeasonal?: boolean;
    childAge?: number;
    theme?: string;
  } = {}
): Promise<ChildRecipe[]> {
  let sql = `
    SELECT * FROM goose.recipes
    WHERE target_audience = 'child'
  `;
  const params: any[] = [];
  let paramIndex = 1;
  
  if (options.category) {
    sql += ` AND category = $${paramIndex++}`;
    params.push(options.category);
  }
  
  if (options.theme) {
    sql += ` AND theme = $${paramIndex++}`;
    params.push(options.theme);
  }
  
  if (!options.includeSeasonal) {
    sql += ` AND (is_seasonal = false OR (CURRENT_DATE BETWEEN season_start AND season_end))`;
  }
  
  if (options.childAge) {
    sql += ` AND (min_age IS NULL OR min_age <= $${paramIndex++})`;
    params.push(options.childAge);
    sql += ` AND (max_age IS NULL OR max_age >= $${paramIndex++})`;
    params.push(options.childAge);
  }
  
  sql += ` ORDER BY name`;
  
  const result = await pool.query(sql, params);
  return result.rows.map(mapRecipeRow);
}

/**
 * Get active recipe for a child
 */
export async function getActiveRecipeForChild(
  childUserId: string,
  recipeType?: string
): Promise<ChildRecipe | null> {
  const result = await pool.query(
    `SELECT * FROM child_learning.get_active_recipe_for_child($1, $2)`,
    [childUserId, recipeType]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  // Get full recipe details
  const recipeResult = await pool.query(
    `SELECT * FROM goose.recipes WHERE id = $1`,
    [result.rows[0].recipe_id]
  );
  
  if (recipeResult.rows.length === 0) {
    return null;
  }
  
  return mapRecipeRow(recipeResult.rows[0]);
}

/**
 * Assign a recipe to a child
 */
export async function assignRecipeToChild(
  childUserId: string,
  recipeId: string,
  assignedBy: string,
  options: {
    isDefault?: boolean;
    priority?: number;
    validFrom?: string;
    validUntil?: string;
    reason?: string;
  } = {}
): Promise<RecipeAssignment> {
  const result = await pool.query(`
    INSERT INTO child_learning.recipe_assignments (
      child_user_id, recipe_id, assigned_by, is_default, priority,
      valid_from, valid_until, assignment_reason
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (child_user_id, recipe_id)
    DO UPDATE SET
      is_active = true,
      is_default = COALESCE($4, child_learning.recipe_assignments.is_default),
      priority = COALESCE($5, child_learning.recipe_assignments.priority),
      valid_from = COALESCE($6, child_learning.recipe_assignments.valid_from),
      valid_until = COALESCE($7, child_learning.recipe_assignments.valid_until),
      updated_at = NOW()
    RETURNING *
  `, [
    childUserId,
    recipeId,
    assignedBy,
    options.isDefault || false,
    options.priority || 0,
    options.validFrom,
    options.validUntil,
    options.reason,
  ]);
  
  return mapAssignmentRow(result.rows[0]);
}

/**
 * Get recipe assignments for a child
 */
export async function getRecipeAssignments(childUserId: string): Promise<RecipeAssignment[]> {
  const result = await pool.query(`
    SELECT ra.*, r.name as recipe_name, r.character_name, r.character_emoji,
           r.description as recipe_description, r.category as recipe_category
    FROM child_learning.recipe_assignments ra
    JOIN goose.recipes r ON ra.recipe_id = r.id
    WHERE ra.child_user_id = $1 AND ra.is_active = true
    ORDER BY ra.is_default DESC, ra.priority DESC
  `, [childUserId]);
  
  return result.rows.map(row => ({
    ...mapAssignmentRow(row),
    recipe: {
      id: row.recipe_id,
      name: row.recipe_name,
      description: row.recipe_description,
      category: row.recipe_category,
      characterName: row.character_name,
      characterEmoji: row.character_emoji,
    } as ChildRecipe,
  }));
}

/**
 * Record recipe usage
 */
export async function recordRecipeUsage(
  childUserId: string,
  recipeId: string
): Promise<void> {
  await pool.query(`
    UPDATE child_learning.recipe_assignments
    SET times_used = times_used + 1, last_used_at = NOW(), updated_at = NOW()
    WHERE child_user_id = $1 AND recipe_id = $2
  `, [childUserId, recipeId]);
}

function mapRecipeRow(row: any): ChildRecipe {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    instructions: row.instructions,
    requiredTools: row.required_tools || [],
    parameters: row.parameters || {},
    targetAudience: row.target_audience,
    minAge: row.min_age,
    maxAge: row.max_age,
    characterName: row.character_name,
    characterEmoji: row.character_emoji,
    characterPersonality: row.character_personality,
    theme: row.theme, // For multi-tenant theme filtering
    isSeasonal: row.is_seasonal,
    seasonStart: row.season_start,
    seasonEnd: row.season_end,
    educationalFocus: row.educational_focus || [],
    usageCount: row.usage_count || 0,
    iconPath: row.icon_path,
  };
}

function mapAssignmentRow(row: any): RecipeAssignment {
  return {
    id: row.id,
    childUserId: row.child_user_id,
    recipeId: row.recipe_id,
    assignedBy: row.assigned_by,
    assignmentReason: row.assignment_reason,
    isActive: row.is_active,
    isDefault: row.is_default,
    priority: row.priority,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    timesUsed: row.times_used,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Conversation Memory
// ============================================================================

/**
 * Store a memory from conversation
 */
export async function storeConversationMemory(
  childUserId: string,
  memoryType: MemoryType,
  memoryKey: string,
  memoryValue: any,
  options: {
    conversationId?: string;
    recipeId?: string;
    importanceScore?: number;
    isPermanent?: boolean;
    expiresInDays?: number;
  } = {}
): Promise<ConversationMemory> {
  const expiresAt = options.expiresInDays
    ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  
  const result = await pool.query(`
    INSERT INTO child_learning.conversation_memory (
      child_user_id, memory_type, memory_key, memory_value,
      conversation_id, recipe_id, importance_score, is_permanent, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    childUserId,
    memoryType,
    memoryKey,
    JSON.stringify(memoryValue),
    options.conversationId,
    options.recipeId,
    options.importanceScore || 0.5,
    options.isPermanent || false,
    expiresAt,
  ]);
  
  return mapMemoryRow(result.rows[0]);
}

/**
 * Retrieve memories for context
 */
export async function getRecentMemories(
  childUserId: string,
  options: {
    memoryType?: MemoryType;
    limit?: number;
    minImportance?: number;
  } = {}
): Promise<ConversationMemory[]> {
  let sql = `
    SELECT * FROM child_learning.conversation_memory
    WHERE child_user_id = $1
      AND (expires_at IS NULL OR expires_at > NOW())
  `;
  const params: any[] = [childUserId];
  let paramIndex = 2;
  
  if (options.memoryType) {
    sql += ` AND memory_type = $${paramIndex++}`;
    params.push(options.memoryType);
  }
  
  if (options.minImportance) {
    sql += ` AND importance_score >= $${paramIndex++}`;
    params.push(options.minImportance);
  }
  
  sql += ` ORDER BY importance_score DESC, created_at DESC`;
  
  if (options.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(options.limit);
  }
  
  const result = await pool.query(sql, params);
  return result.rows.map(mapMemoryRow);
}

function mapMemoryRow(row: any): ConversationMemory {
  return {
    id: row.id,
    childUserId: row.child_user_id,
    memoryType: row.memory_type,
    memoryKey: row.memory_key,
    memoryValue: row.memory_value,
    conversationId: row.conversation_id,
    recipeId: row.recipe_id,
    importanceScore: parseFloat(row.importance_score || 0),
    accessCount: row.access_count,
    lastAccessedAt: row.last_accessed_at,
    expiresAt: row.expires_at,
    isPermanent: row.is_permanent,
    isVisibleToParent: row.is_visible_to_parent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Achievements
// ============================================================================

/**
 * Check and update achievement progress
 */
export async function updateAchievementProgress(
  childUserId: string,
  achievementId: string,
  progressIncrement: number = 1
): Promise<ChildAchievement | null> {
  // Get achievement requirements
  const achievementResult = await pool.query(
    `SELECT * FROM child_learning.achievements WHERE id = $1`,
    [achievementId]
  );
  
  if (achievementResult.rows.length === 0) {
    return null;
  }
  
  const achievement = achievementResult.rows[0];
  
  // Update or create progress
  const result = await pool.query(`
    INSERT INTO child_learning.child_achievements (
      child_user_id, achievement_id, current_progress
    ) VALUES ($1, $2, $3)
    ON CONFLICT (child_user_id, achievement_id)
    DO UPDATE SET
      current_progress = child_learning.child_achievements.current_progress + $3,
      updated_at = NOW()
    RETURNING *
  `, [childUserId, achievementId, progressIncrement]);
  
  const childAchievement = result.rows[0];
  
  // Check if completed
  if (!childAchievement.is_completed && 
      childAchievement.current_progress >= achievement.requirement_value) {
    await pool.query(`
      UPDATE child_learning.child_achievements
      SET is_completed = true, completed_at = NOW()
      WHERE id = $1
    `, [childAchievement.id]);
    childAchievement.is_completed = true;
    childAchievement.completed_at = new Date().toISOString();
  }
  
  return {
    ...mapChildAchievementRow(childAchievement),
    achievement: {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      emoji: achievement.emoji,
      category: achievement.category,
      requirementType: achievement.requirement_type,
      requirementValue: achievement.requirement_value,
      points: achievement.points,
    },
  } as ChildAchievement;
}

/**
 * Get child's achievements
 */
export async function getChildAchievements(
  childUserId: string,
  onlyCompleted: boolean = false
): Promise<ChildAchievement[]> {
  const result = await pool.query(`
    SELECT ca.*, a.name, a.description, a.emoji, a.category,
           a.requirement_type, a.requirement_value, a.points
    FROM child_learning.child_achievements ca
    JOIN child_learning.achievements a ON ca.achievement_id = a.id
    WHERE ca.child_user_id = $1
    ${onlyCompleted ? 'AND ca.is_completed = true' : ''}
    ORDER BY ca.completed_at DESC NULLS LAST, a.display_order
  `, [childUserId]);
  
  return result.rows.map(row => ({
    ...mapChildAchievementRow(row),
    achievement: {
      id: row.achievement_id,
      name: row.name,
      description: row.description,
      emoji: row.emoji,
      category: row.category,
      requirementType: row.requirement_type,
      requirementValue: row.requirement_value,
      requirementSubject: row.requirement_subject,
      points: row.points,
      badgeImageUrl: row.badge_image_url,
      isHidden: row.is_hidden || false,
      displayOrder: row.display_order || 0,
    },
  }));
}

function mapChildAchievementRow(row: any): ChildAchievement {
  return {
    id: row.id,
    childUserId: row.child_user_id,
    achievementId: row.achievement_id,
    currentProgress: row.current_progress,
    isCompleted: row.is_completed,
    completedAt: row.completed_at,
    wasCelebrated: row.was_celebrated,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Personalization Context
// ============================================================================

/**
 * Build full personalization context for GooseMind
 */
export async function buildPersonalizationContext(
  childUserId: string
): Promise<ChildPersonalizationContext> {
  const result = await pool.query(
    `SELECT child_learning.build_personalization_context($1) as context`,
    [childUserId]
  );
  
  if (result.rows.length === 0) {
    return {
      childName: 'Friend',
      childAge: 8,
      interests: [],
      recentTopics: [],
      recentAchievements: [],
    };
  }
  
  const contextData = result.rows[0].context;
  return {
    childName: contextData.child_name || 'Friend',
    childAge: contextData.child_age || 8,
    interests: contextData.interests || [],
    recentTopics: contextData.recent_topics || [],
    recentAchievements: contextData.recent_achievements || [],
  };
}

/**
 * Build complete GooseMind configuration for a child
 * 
 * @param childUserId - The child's user ID
 * @param parentalControls - Parental control settings
 * @param selectedRecipeId - Optional: specific recipe ID to load (for on-demand character switching)
 */
export async function buildChildGooseMindConfig(
  childUserId: string,
  parentalControls: ParentalControlsConfig,
  selectedRecipeId?: string
): Promise<ChildGooseMindConfig> {
  // Get child's preferred theme to select appropriate recipe
  let childTheme: string | null = null;
  try {
    const themeResult = await pool.query(
      `SELECT preferred_theme FROM users WHERE id = $1`,
      [childUserId]
    );
    childTheme = themeResult.rows[0]?.preferred_theme || null;
  } catch (e) {
    console.warn('[Child Learning] Could not fetch child theme:', e);
  }

  // Get recipe - either the specifically selected one or the active/default one
  let recipe: ChildRecipe | null = null;
  
  // If a specific recipe ID is provided, load that recipe directly
  // This enables multi-tenant on-demand recipe loading when user selects a character
  if (selectedRecipeId) {
    try {
      const recipeResult = await pool.query(
        `SELECT * FROM goose.recipes WHERE id = $1`,
        [selectedRecipeId]
      );
      if (recipeResult.rows.length > 0) {
        recipe = mapRecipeRow(recipeResult.rows[0]);
        console.log(`[Child Learning] Loaded selected recipe: ${recipe.characterName} (${selectedRecipeId})`);
        
        // Verify the recipe matches the child's theme for multi-tenant compliance
        if (childTheme && recipe.theme && recipe.theme !== childTheme) {
          console.warn(`[Child Learning] Recipe theme mismatch: ${recipe.theme} vs child theme: ${childTheme}`);
          // Don't use mismatched recipe - fall through to default selection
          recipe = null;
        }
      }
    } catch (e) {
      console.warn('[Child Learning] Could not load selected recipe:', e);
    }
  }
  
  // If no recipe yet, try to get the active assigned recipe
  if (!recipe) {
    recipe = await getActiveRecipeForChild(childUserId);
  }
  
  // If still no recipe, select based on child's theme
  if (!recipe) {
    // First try to get recipes matching the child's theme
    let themedRecipes: ChildRecipe[] = [];
    if (childTheme) {
      themedRecipes = await getChildRecipes({ theme: childTheme });
      console.log(`[Child Learning] Found ${themedRecipes.length} recipes for theme: ${childTheme}`);
    }
    
    // If no themed recipes found, get all child recipes as fallback
    if (themedRecipes.length === 0) {
      themedRecipes = await getChildRecipes({});
      console.log(`[Child Learning] Using fallback - found ${themedRecipes.length} total recipes`);
    }
    
    // Select the main character for the theme
    if (childTheme === 'pusheen') {
      // Prefer Pusheen as the main character
      const pusheenRecipe = themedRecipes.find(r => 
        r.characterName?.toLowerCase() === 'pusheen'
      ) || themedRecipes[0];
      
      if (pusheenRecipe) {
        recipe = pusheenRecipe;
      }
    } else if (childTheme === 'minecraft') {
      // Prefer Steve as the main Minecraft character
      const minecraftRecipe = themedRecipes.find(r => 
        r.characterName?.toLowerCase() === 'steve'
      ) || themedRecipes.find(r => 
        r.characterName?.toLowerCase() === 'alex'
      ) || themedRecipes[0];
      
      if (minecraftRecipe) {
        recipe = minecraftRecipe;
      }
    } else {
      // Default fallback - just use first available
      if (themedRecipes.length > 0) {
        recipe = themedRecipes[0];
      }
    }
  }
  
  // Get personalization context
  const personalizationContext = await buildPersonalizationContext(childUserId);
  
  // Build safety prompt
  const safetyPrompt = getChildSafetySystemPrompt(
    personalizationContext.childName,
    parentalControls
  );
  
  // Build personalized system prompt (only if recipe exists)
  let systemPrompt = recipe 
    ? buildPersonalizedSystemPrompt(recipe, personalizationContext)
    : `You are a friendly learning companion for ${personalizationContext.childName}. Be helpful, encouraging, and age-appropriate.`;
  
  // Inject contextual hints from the hints library based on user context
  // This enables multi-tenant hint injection based on theme, age, and learning context
  if (recipe?.theme && personalizationContext.childAge) {
    try {
      const hintsInjection = await buildHintsInjection(
        recipe.theme,
        personalizationContext.childAge,
        {
          characterName: recipe.characterName || undefined,
          // Could add currentSubject detection here based on recent topics
        }
      );
      if (hintsInjection) {
        systemPrompt += '\n' + hintsInjection;
      }
    } catch (e) {
      console.warn('[Child Learning] Could not inject hints:', e);
    }
  }
  
  // Record usage
  if (recipe) {
    await recordRecipeUsage(childUserId, recipe.id);
  }
  
  return {
    recipe,
    personalizationContext,
    systemPrompt,
    safetyPrompt,
  };
}

/**
 * Build personalized system prompt combining recipe + context
 */
function buildPersonalizedSystemPrompt(
  recipe: ChildRecipe,
  context: ChildPersonalizationContext
): string {
  let prompt = recipe.instructions || '';
  
  // Add personalization section
  const personalizationSection = `

## About ${context.childName}
- Age: ${context.childAge} years old
${context.interests.length > 0 ? `- Interests: ${context.interests.map(i => `${i.name} (${i.category})`).join(', ')}` : ''}
${context.recentTopics.length > 0 ? `- Recently discussed: ${context.recentTopics.slice(0, 5).join(', ')}` : ''}
${context.recentAchievements.length > 0 ? `- Recent achievements: ${context.recentAchievements.map(a => `${a.emoji || '🌟'} ${a.name}`).join(', ')}` : ''}

Use this information to personalize your responses and make connections to their interests!
`;

  prompt += personalizationSection;
  
  return prompt;
}

// ============================================================================
// Interest Detection (for automatic PIC updates)
// ============================================================================

/**
 * Analyze message for interests and update PIC
 */
export async function analyzeAndUpdateInterests(
  childUserId: string,
  message: string,
  aiResponse: string
): Promise<void> {
  // Simple keyword-based interest detection
  const interestKeywords: Record<InterestCategory, string[]> = {
    animals: ['dog', 'cat', 'pet', 'animal', 'dinosaur', 'bird', 'fish', 'horse', 'bunny', 'rabbit', 'zoo'],
    science: ['experiment', 'science', 'why does', 'how does', 'chemistry', 'physics'],
    space: ['space', 'planet', 'star', 'moon', 'rocket', 'astronaut', 'mars', 'jupiter', 'galaxy'],
    nature: ['tree', 'flower', 'plant', 'weather', 'rain', 'snow', 'ocean', 'forest', 'mountain'],
    sports: ['soccer', 'football', 'basketball', 'baseball', 'swim', 'run', 'sport', 'game', 'team'],
    arts: ['draw', 'paint', 'art', 'craft', 'color', 'create', 'make'],
    music: ['music', 'song', 'sing', 'dance', 'instrument', 'piano', 'guitar'],
    games: ['game', 'play', 'minecraft', 'roblox', 'video game', 'puzzle'],
    books: ['book', 'read', 'story', 'chapter', 'library'],
    movies: ['movie', 'film', 'watch', 'cartoon', 'show'],
    characters: ['superhero', 'princess', 'character', 'hero'],
    food: ['food', 'eat', 'cook', 'bake', 'pizza', 'ice cream', 'cake'],
    history: ['history', 'ancient', 'king', 'queen', 'castle', 'war'],
    technology: ['robot', 'computer', 'code', 'program', 'tech'],
    math: ['math', 'number', 'count', 'add', 'subtract', 'multiply'],
    languages: ['word', 'language', 'spanish', 'french', 'write'],
  };
  
  const lowerMessage = message.toLowerCase();
  
  for (const [category, keywords] of Object.entries(interestKeywords)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        // Found an interest mention
        await updateInterestEngagement(
          childUserId,
          keyword,
          category as InterestCategory,
          message.substring(0, 100)
        );
        break; // Only count once per category per message
      }
    }
  }
}

// ============================================================================
// Learning Progress
// ============================================================================

/**
 * Update learning progress for a subject
 */
export async function updateLearningProgress(
  childUserId: string,
  subject: string,
  skillArea: string,
  wasSuccessful: boolean
): Promise<LearningProgress> {
  const result = await pool.query(`
    INSERT INTO child_learning.learning_progress (
      child_user_id, subject, skill_area, total_activities, successful_activities,
      last_activity_at
    ) VALUES ($1, $2, $3, 1, $4, NOW())
    ON CONFLICT (child_user_id, subject, skill_area)
    DO UPDATE SET
      total_activities = child_learning.learning_progress.total_activities + 1,
      successful_activities = child_learning.learning_progress.successful_activities + $4,
      proficiency_score = CASE
        WHEN $4 THEN LEAST(100, child_learning.learning_progress.proficiency_score + 2)
        ELSE GREATEST(0, child_learning.learning_progress.proficiency_score - 1)
      END,
      last_activity_at = NOW(),
      updated_at = NOW()
    RETURNING *
  `, [childUserId, subject, skillArea, wasSuccessful ? 1 : 0]);
  
  return mapProgressRow(result.rows[0]);
}

function mapProgressRow(row: any): LearningProgress {
  return {
    id: row.id,
    childUserId: row.child_user_id,
    subject: row.subject,
    skillArea: row.skill_area,
    currentLevel: row.current_level,
    proficiencyScore: parseFloat(row.proficiency_score || 0),
    totalActivities: row.total_activities,
    successfulActivities: row.successful_activities,
    currentStreakDays: row.current_streak_days,
    longestStreakDays: row.longest_streak_days,
    lastActivityAt: row.last_activity_at,
    weeklyGoalMinutes: row.weekly_goal_minutes,
    weeklyActualMinutes: row.weekly_actual_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
