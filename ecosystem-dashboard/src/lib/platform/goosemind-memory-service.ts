/**
 * GooseMind Memory Service
 * 
 * Implements working memory and context management for child AI conversations.
 * Inspired by Goose Agent SDK's Exchange + Moderator pattern.
 * 
 * Features:
 * - Auto-retrieves recent messages from conversation history
 * - Injects child's interests into context
 * - Retrieves relevant memories based on current topic
 * - Limits context window with summarization
 * - Recipe-level memory configuration for character-specific behavior
 */

import { Pool } from 'pg';
import { RecipeMemoryConfig } from './child-learning-types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// Default Configuration (used when no recipe config available)
const DEFAULT_MAX_CONTEXT_MESSAGES = 20;
const DEFAULT_MAX_CONTEXT_TOKENS = 4000;
const CHARS_PER_TOKEN = 4;

// Default memory config for recipes without specific settings
const DEFAULT_MEMORY_CONFIG: RecipeMemoryConfig = {
  recallStyle: 'friendly',
  priorityTopics: [],
  continuityPhrase: 'I remember we were talking about {topic}! Want to continue?',
  memoryPersonality: 'friendly helper who remembers past conversations',
  maxContextMessages: DEFAULT_MAX_CONTEXT_MESSAGES,
  summarizationStyle: 'casual',
};

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChildContext {
  interests: string[];
  recentTopics: string[];
  knowledgeHighlights: string[];
  achievements: string[];
  conversationSummary?: string;
}

export interface MemoryContext {
  messages: ConversationMessage[];
  childContext: ChildContext;
  tokenEstimate: number;
  memoryConfig: RecipeMemoryConfig;
}

/**
 * Get recipe memory configuration from database
 */
export async function getRecipeMemoryConfig(recipeId?: string): Promise<RecipeMemoryConfig> {
  if (!recipeId) {
    return DEFAULT_MEMORY_CONFIG;
  }

  try {
    const result = await pool.query(`
      SELECT memory_config
      FROM goose.recipes
      WHERE id = $1
    `, [recipeId]);

    if (result.rows.length === 0 || !result.rows[0].memory_config) {
      return DEFAULT_MEMORY_CONFIG;
    }

    const dbConfig = result.rows[0].memory_config;
    
    // Map database snake_case to TypeScript camelCase
    return {
      recallStyle: dbConfig.recall_style || DEFAULT_MEMORY_CONFIG.recallStyle,
      priorityTopics: dbConfig.priority_topics || DEFAULT_MEMORY_CONFIG.priorityTopics,
      continuityPhrase: dbConfig.continuity_phrase || DEFAULT_MEMORY_CONFIG.continuityPhrase,
      memoryPersonality: dbConfig.memory_personality || DEFAULT_MEMORY_CONFIG.memoryPersonality,
      maxContextMessages: dbConfig.max_context_messages || DEFAULT_MEMORY_CONFIG.maxContextMessages,
      summarizationStyle: dbConfig.summarization_style || DEFAULT_MEMORY_CONFIG.summarizationStyle,
      topicCallbacks: dbConfig.topic_callbacks,
    };
  } catch (error) {
    console.error('[GooseMind Memory] Error fetching recipe memory config:', error);
    return DEFAULT_MEMORY_CONFIG;
  }
}

/**
 * Get recent conversation messages for context
 * Similar to Goose's session file loading
 */
export async function getRecentMessages(
  childUserId: string,
  conversationId?: string,
  limit: number = DEFAULT_MAX_CONTEXT_MESSAGES
): Promise<ConversationMessage[]> {
  try {
    let query: string;
    let params: any[];

    if (conversationId) {
      // Get messages from specific conversation
      query = `
        SELECT role, content, created_at as timestamp
        FROM child_conversation_messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      params = [conversationId, limit];
    } else {
      // Get messages from most recent conversation (within last 30 min)
      query = `
        SELECT m.role, m.content, m.created_at as timestamp
        FROM child_conversation_messages m
        JOIN child_conversations c ON m.conversation_id = c.id
        WHERE c.child_user_id = $1
          AND c.last_message_at > NOW() - INTERVAL '30 minutes'
        ORDER BY m.created_at DESC
        LIMIT $2
      `;
      params = [childUserId, limit];
    }

    const result = await pool.query(query, params);
    
    // Reverse to get chronological order (oldest first)
    const messages = result.rows.reverse().map(row => ({
      role: row.role as 'user' | 'assistant',
      content: row.content,
      timestamp: row.timestamp,
    }));

    console.log(`[GooseMind Memory] Retrieved ${messages.length} recent messages for user ${childUserId}`);
    return messages;
  } catch (error) {
    console.error('[GooseMind Memory] Error retrieving messages:', error);
    return [];
  }
}

/**
 * Get child's interests and context for personalization
 */
export async function getChildContext(childUserId: string): Promise<ChildContext> {
  const context: ChildContext = {
    interests: [],
    recentTopics: [],
    knowledgeHighlights: [],
    achievements: [],
  };

  try {
    // Get top interests
    const interestsResult = await pool.query(`
      SELECT interest_name, interest_category, engagement_score
      FROM child_learning.personal_interests
      WHERE child_user_id = $1 AND is_active = true
      ORDER BY engagement_score DESC, last_mentioned_at DESC
      LIMIT 5
    `, [childUserId]);
    
    context.interests = interestsResult.rows.map(r => 
      `${r.interest_name} (${r.interest_category})`
    );

    // Get recent conversation topics from memory
    const topicsResult = await pool.query(`
      SELECT DISTINCT memory_key, memory_value
      FROM child_learning.conversation_memory
      WHERE child_user_id = $1 
        AND memory_type = 'topic_discussed'
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 5
    `, [childUserId]);
    
    context.recentTopics = topicsResult.rows.map(r => {
      try {
        const val = typeof r.memory_value === 'string' 
          ? JSON.parse(r.memory_value) 
          : r.memory_value;
        return val.userMessage || r.memory_key;
      } catch {
        return r.memory_key;
      }
    });

    // Get knowledge highlights (things they've learned)
    const knowledgeResult = await pool.query(`
      SELECT topic, fact_or_concept
      FROM child_learning.knowledge_base
      WHERE child_user_id = $1 AND is_mastered = true
      ORDER BY last_reviewed_at DESC
      LIMIT 3
    `, [childUserId]);
    
    context.knowledgeHighlights = knowledgeResult.rows.map(r => 
      `${r.topic}: ${r.fact_or_concept}`
    );

    // Get recent achievements
    const achievementsResult = await pool.query(`
      SELECT a.name, a.emoji, ca.progress, ca.unlocked_at
      FROM child_learning.child_achievements ca
      JOIN child_learning.achievements a ON ca.achievement_id = a.id
      WHERE ca.child_user_id = $1 AND ca.is_unlocked = true
      ORDER BY ca.unlocked_at DESC
      LIMIT 3
    `, [childUserId]);
    
    context.achievements = achievementsResult.rows.map(r => 
      `${r.emoji} ${r.name}`
    );

    // Get conversation summary if available
    const summaryResult = await pool.query(`
      SELECT summary
      FROM child_conversations
      WHERE child_user_id = $1 AND summary IS NOT NULL
      ORDER BY last_message_at DESC
      LIMIT 1
    `, [childUserId]);
    
    if (summaryResult.rows.length > 0) {
      context.conversationSummary = summaryResult.rows[0].summary;
    }

    console.log(`[GooseMind Memory] Retrieved context for user ${childUserId}:`, {
      interests: context.interests.length,
      topics: context.recentTopics.length,
      knowledge: context.knowledgeHighlights.length,
      achievements: context.achievements.length,
    });

  } catch (error) {
    console.error('[GooseMind Memory] Error retrieving child context:', error);
  }

  return context;
}

/**
 * Build the full memory context for a conversation
 * Similar to Goose's Exchange.messages + system prompt building
 * Now supports recipe-specific memory configuration
 */
export async function buildMemoryContext(
  childUserId: string,
  conversationId?: string,
  providedHistory?: ConversationMessage[],
  recipeId?: string
): Promise<MemoryContext> {
  // Get recipe-specific memory configuration
  const memoryConfig = await getRecipeMemoryConfig(recipeId);
  const maxMessages = memoryConfig.maxContextMessages || DEFAULT_MAX_CONTEXT_MESSAGES;

  // Use provided history if available, otherwise retrieve from DB
  let messages: ConversationMessage[];
  
  if (providedHistory && providedHistory.length > 0) {
    messages = providedHistory;
    console.log(`[GooseMind Memory] Using ${messages.length} provided messages`);
  } else {
    messages = await getRecentMessages(childUserId, conversationId, maxMessages);
    console.log(`[GooseMind Memory] Retrieved ${messages.length} messages from DB (max: ${maxMessages})`);
  }

  // Get child context
  const childContext = await getChildContext(childUserId);

  // Estimate tokens
  const messageTokens = messages.reduce((sum, m) => 
    sum + Math.ceil(m.content.length / CHARS_PER_TOKEN), 0
  );
  const contextTokens = Math.ceil(JSON.stringify(childContext).length / CHARS_PER_TOKEN);
  const tokenEstimate = messageTokens + contextTokens;

  // Truncate if over limit (similar to Goose's ContextTruncate)
  if (tokenEstimate > DEFAULT_MAX_CONTEXT_TOKENS && messages.length > 4) {
    console.log(`[GooseMind Memory] Context too large (${tokenEstimate} tokens), truncating...`);
    messages = truncateMessages(messages, DEFAULT_MAX_CONTEXT_TOKENS - contextTokens);
  }

  console.log(`[GooseMind Memory] Using ${memoryConfig.recallStyle} recall style for character`);

  return {
    messages,
    childContext,
    tokenEstimate,
    memoryConfig,
  };
}

/**
 * Truncate messages to fit within token limit
 * Similar to Goose's ContextTruncate moderator
 */
function truncateMessages(
  messages: ConversationMessage[],
  maxTokens: number
): ConversationMessage[] {
  let totalTokens = 0;
  const result: ConversationMessage[] = [];
  
  // Keep most recent messages, working backwards
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = Math.ceil(messages[i].content.length / CHARS_PER_TOKEN);
    if (totalTokens + msgTokens > maxTokens) {
      break;
    }
    result.unshift(messages[i]);
    totalTokens += msgTokens;
  }

  // If we truncated, add a summary note at the beginning
  if (result.length < messages.length) {
    const truncatedCount = messages.length - result.length;
    result.unshift({
      role: 'system' as const,
      content: `[Previous ${truncatedCount} messages summarized: The conversation started earlier with related discussion.]`,
    });
  }

  return result;
}

/**
 * Build personalization injection for system prompt
 * Adds child's interests, achievements, context, and recipe-specific memory instructions
 */
export function buildPersonalizationPrompt(
  childContext: ChildContext,
  memoryConfig?: RecipeMemoryConfig
): string {
  const parts: string[] = [];
  const config = memoryConfig || DEFAULT_MEMORY_CONFIG;

  // Add memory personality instruction for the character
  if (config.memoryPersonality) {
    parts.push(`MEMORY STYLE: You are a ${config.memoryPersonality}.`);
  }

  // Add continuity instruction
  if (config.continuityPhrase && childContext.recentTopics.length > 0) {
    const recentTopic = childContext.recentTopics[0];
    const continuityExample = config.continuityPhrase.replace('{topic}', recentTopic);
    parts.push(`CONTINUITY: When referencing past conversations, use phrases like: "${continuityExample}"`);
  }

  // Add priority topics if they match child's interests
  if (config.priorityTopics.length > 0) {
    const matchingTopics = childContext.interests.filter(interest => 
      config.priorityTopics.some(pt => 
        interest.toLowerCase().includes(pt.toLowerCase())
      )
    );
    if (matchingTopics.length > 0) {
      parts.push(`PRIORITY INTERESTS (emphasize these): ${matchingTopics.join(', ')}`);
    }
  }

  if (childContext.interests.length > 0) {
    parts.push(`CHILD'S INTERESTS: ${childContext.interests.join(', ')}`);
  }

  if (childContext.achievements.length > 0) {
    parts.push(`RECENT ACHIEVEMENTS: ${childContext.achievements.join(', ')}`);
  }

  if (childContext.knowledgeHighlights.length > 0) {
    parts.push(`THINGS THEY'VE LEARNED: ${childContext.knowledgeHighlights.join('; ')}`);
  }

  if (childContext.recentTopics.length > 0) {
    parts.push(`RECENT CONVERSATION TOPICS: ${childContext.recentTopics.slice(0, 3).join(', ')}`);
  }

  if (childContext.conversationSummary) {
    parts.push(`PREVIOUS CONVERSATION SUMMARY: ${childContext.conversationSummary}`);
  }

  // Add topic callbacks if available
  if (config.topicCallbacks && Object.keys(config.topicCallbacks).length > 0) {
    const callbackExamples = Object.entries(config.topicCallbacks)
      .slice(0, 3)
      .map(([topic, response]) => `  - When discussing ${topic}: "${response}"`)
      .join('\n');
    parts.push(`TOPIC RESPONSES (use these phrases when relevant):\n${callbackExamples}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return `
═══════════════════════════════════════════════════════════
PERSONALIZATION & MEMORY CONTEXT (${config.recallStyle} style)
═══════════════════════════════════════════════════════════
${parts.join('\n')}
═══════════════════════════════════════════════════════════
`;
}

/**
 * Store a topic discussed for future context
 */
export async function storeTopicMemory(
  childUserId: string,
  topic: string,
  conversationId?: string
): Promise<void> {
  try {
    await pool.query(`
      INSERT INTO child_learning.conversation_memory (
        child_user_id, memory_type, memory_key, memory_value,
        conversation_id, importance_score, expires_at
      ) VALUES ($1, 'topic_discussed', $2, $3, $4, 0.5, NOW() + INTERVAL '7 days')
      ON CONFLICT (child_user_id, memory_type, memory_key) 
      DO UPDATE SET 
        memory_value = EXCLUDED.memory_value,
        access_count = child_learning.conversation_memory.access_count + 1,
        last_accessed_at = NOW()
    `, [
      childUserId,
      `topic_${Date.now()}`,
      JSON.stringify({ topic, timestamp: new Date().toISOString() }),
      conversationId,
    ]);
  } catch (error) {
    console.error('[GooseMind Memory] Error storing topic memory:', error);
  }
}

/**
 * Generate a conversation summary using AI
 * Similar to Goose's ContextSummarizer
 */
export async function generateConversationSummary(
  conversationId: string,
  aiGatewayUrl: string = 'http://localhost:8777'
): Promise<string | null> {
  try {
    // Get all messages from conversation
    const result = await pool.query(`
      SELECT role, content
      FROM child_conversation_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `, [conversationId]);

    if (result.rows.length < 4) {
      return null; // Not enough messages to summarize
    }

    const messagesText = result.rows
      .map(r => `${r.role}: ${r.content}`)
      .join('\n');

    // Call AI to summarize
    const response = await fetch(`${aiGatewayUrl}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024'}`,
      },
      body: JSON.stringify({
        model: process.env.CHILD_AI_MODEL || 'qwen3-8b',
        messages: [
          {
            role: 'system',
            content: 'Summarize this child-AI conversation in 2-3 sentences. Focus on topics discussed and any learning that occurred. Keep it brief.',
          },
          {
            role: 'user',
            content: messagesText.substring(0, 3000),
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || null;

    // Store the summary
    if (summary) {
      await pool.query(`
        UPDATE child_conversations
        SET summary = $1
        WHERE id = $2
      `, [summary, conversationId]);
    }

    return summary;
  } catch (error) {
    console.error('[GooseMind Memory] Error generating summary:', error);
    return null;
  }
}
