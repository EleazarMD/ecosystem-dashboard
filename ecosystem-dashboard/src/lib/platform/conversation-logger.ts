/**
 * Conversation Logger for Real Usage Data Collection
 * 
 * Logs all child AI conversations to test_analytics for:
 * - LLM fine-tuning dataset
 * - Quality monitoring
 * - Performance analysis
 * - A/B testing
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface ConversationLogEntry {
  // User context
  userId: string;
  userName: string;
  userAge: number;
  userGradeLevel: string;
  userTheme: string;
  userGender?: string;
  
  // Conversation
  conversationId: string;
  messageIndex: number;
  userMessage: string;
  aiResponse: string;
  
  // Recipe/Character
  recipeId?: string;
  recipeName?: string;
  recipeCategory?: string;
  recipeInstructions?: string;
  recipeSystemPrompt?: string;
  recipeParameters?: any;
  recipeMinAge?: number;
  recipeMaxAge?: number;
  recipeEducationalFocus?: string[];
  recipeTheme?: string;
  characterName?: string;
  characterEmoji?: string;
  characterPersonality?: string;
  
  // Context
  systemPrompt: string;
  hintsInjected?: any[];
  hintTypesUsed?: string[];
  
  // Model
  modelUsed: string;
  temperature?: number;
  maxTokens?: number;
  responseTimeMs: number;
  
  // Quality
  subjectArea?: string;
  difficultyLevel?: string;
  interactiveChoicesPresent?: boolean;
  
  // Metadata
  spanishMode?: boolean;
  spanishLevel?: string;
}

/**
 * Log a conversation turn to the database
 */
export async function logConversation(entry: ConversationLogEntry): Promise<void> {
  try {
    // Create run if it doesn't exist
    const runResult = await pool.query(`
      INSERT INTO test_analytics.test_runs (
        run_name, run_type, test_user_id, test_user_name, test_theme, 
        test_age, test_grade_level, environment, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [
      `Production - ${entry.userName}`,
      'production',
      entry.userId,
      entry.userName,
      entry.userTheme,
      entry.userAge,
      entry.userGradeLevel,
      'production',
      JSON.stringify(['production', 'real-usage', entry.userTheme]),
    ]);

    // Get or create run ID
    let runId;
    if (runResult.rows.length > 0) {
      runId = runResult.rows[0].id;
    } else {
      const existingRun = await pool.query(`
        SELECT id FROM test_analytics.test_runs 
        WHERE test_user_id = $1 AND run_type = 'production'
        ORDER BY created_at DESC LIMIT 1
      `, [entry.userId]);
      runId = existingRun.rows[0]?.id;
    }

    // Log the conversation
    await pool.query(`
      INSERT INTO test_analytics.chat_simulations (
        run_id, conversation_id, message_index,
        user_id, user_name, user_theme, user_age, user_grade_level, user_gender,
        character_name, character_emoji, character_personality,
        recipe_id, recipe_name, recipe_category, recipe_instructions, recipe_system_prompt, recipe_parameters,
        recipe_min_age, recipe_max_age, recipe_educational_focus, recipe_theme,
        system_prompt, user_message, ai_response,
        hints_injected, hint_types_used,
        model_used, temperature, max_tokens, response_time_ms,
        age_appropriate, theme_consistent, interactive_choices_present, safety_passed,
        subject_area, difficulty_level
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37
      )
    `, [
      runId,
      entry.conversationId,
      entry.messageIndex,
      entry.userId,
      entry.userName,
      entry.userTheme,
      entry.userAge,
      entry.userGradeLevel,
      entry.userGender || null,
      entry.characterName || null,
      entry.characterEmoji || null,
      entry.characterPersonality || null,
      entry.recipeId || null,
      entry.recipeName || null,
      entry.recipeCategory || null,
      entry.recipeInstructions || null,
      entry.recipeSystemPrompt || null,
      entry.recipeParameters ? JSON.stringify(entry.recipeParameters) : null,
      entry.recipeMinAge || null,
      entry.recipeMaxAge || null,
      entry.recipeEducationalFocus ? JSON.stringify(entry.recipeEducationalFocus) : null,
      entry.recipeTheme || null,
      entry.systemPrompt,
      entry.userMessage,
      entry.aiResponse,
      entry.hintsInjected ? JSON.stringify(entry.hintsInjected) : '[]',
      entry.hintTypesUsed ? JSON.stringify(entry.hintTypesUsed) : '[]',
      entry.modelUsed,
      entry.temperature || null,
      entry.maxTokens || null,
      entry.responseTimeMs,
      true, // age_appropriate - assume true for production
      true, // theme_consistent - assume true for production
      entry.interactiveChoicesPresent !== undefined ? entry.interactiveChoicesPresent : null,
      true, // safety_passed - assume true (filtered by middleware)
      entry.subjectArea || null,
      entry.difficultyLevel || null,
    ]);

    console.log('[ConversationLogger] Logged conversation:', entry.conversationId, 'message', entry.messageIndex);
  } catch (error) {
    console.error('[ConversationLogger] Error logging conversation:', error);
    // Don't throw - logging should not break the user experience
  }
}

/**
 * Get conversation statistics for a user
 */
export async function getUserConversationStats(userId: string) {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT conversation_id) as total_conversations,
        COUNT(DISTINCT subject_area) as subjects_covered,
        ROUND(AVG(response_time_ms)) as avg_response_time,
        ROUND(AVG(LENGTH(ai_response))) as avg_response_length
      FROM test_analytics.chat_simulations
      WHERE user_id = $1
    `, [userId]);
    
    return result.rows[0];
  } catch (error) {
    console.error('[ConversationLogger] Error getting stats:', error);
    return null;
  }
}

/**
 * Get recent conversations for monitoring
 */
export async function getRecentConversations(limit: number = 50) {
  try {
    const result = await pool.query(`
      SELECT 
        user_name,
        user_theme,
        user_age,
        subject_area,
        LEFT(user_message, 50) as message_preview,
        LENGTH(ai_response) as response_length,
        response_time_ms,
        created_at
      FROM test_analytics.chat_simulations
      WHERE run_id IN (
        SELECT id FROM test_analytics.test_runs WHERE run_type = 'production'
      )
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  } catch (error) {
    console.error('[ConversationLogger] Error getting recent conversations:', error);
    return [];
  }
}
