/**
 * Child Conversation History Service
 * 
 * Saves and retrieves conversation history for:
 * - Children to review their past conversations
 * - Parents to see summaries in Family Hub
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  wasFiltered?: boolean;
  characterName?: string;
  characterEmoji?: string;
}

export interface Conversation {
  id: string;
  childUserId: string;
  characterName?: string;
  characterEmoji?: string;
  theme?: string;
  creativeMode?: boolean;
  creativeActivity?: string;
  spanishMode?: boolean;
  messageCount: number;
  startedAt: Date;
  lastMessageAt: Date;
  summary?: string;
  topics?: string[];
}

export interface ConversationWithMessages extends Conversation {
  messages: ConversationMessage[];
}

export interface ParentConversationSummary {
  conversationId: string;
  childName: string;
  childUserId: string;
  characterName?: string;
  theme?: string;
  messageCount: number;
  startedAt: Date;
  lastMessageAt: Date;
  summary?: string;
  topics?: string[];
  flaggedContent: boolean;
  creativeMode: boolean;
}

/**
 * Initialize the conversation history tables if they don't exist
 */
export async function initConversationHistoryTables(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS child_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        character_name VARCHAR(100),
        character_emoji VARCHAR(10),
        theme VARCHAR(50),
        creative_mode BOOLEAN DEFAULT FALSE,
        creative_activity VARCHAR(50),
        spanish_mode BOOLEAN DEFAULT FALSE,
        message_count INTEGER DEFAULT 0,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        summary TEXT,
        topics JSONB DEFAULT '[]',
        flagged_content BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_child_conversations_user ON child_conversations(child_user_id);
      CREATE INDEX IF NOT EXISTS idx_child_conversations_date ON child_conversations(started_at DESC);

      CREATE TABLE IF NOT EXISTS child_conversation_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES child_conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        was_filtered BOOLEAN DEFAULT FALSE,
        character_name VARCHAR(100),
        character_emoji VARCHAR(10),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_child_messages_conversation ON child_conversation_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_child_messages_date ON child_conversation_messages(created_at);
    `);
    console.log('[ConversationHistory] Tables initialized');
  } catch (error) {
    console.error('[ConversationHistory] Error initializing tables:', error);
  }
}

/**
 * Get or create a conversation for the current session
 */
export async function getOrCreateConversation(
  childUserId: string,
  sessionId: string,
  options: {
    characterName?: string;
    characterEmoji?: string;
    theme?: string;
    creativeMode?: boolean;
    creativeActivity?: string;
    spanishMode?: boolean;
  } = {}
): Promise<string> {
  try {
    // Check if conversation exists for this session
    const existing = await pool.query(
      `SELECT id FROM child_conversations 
       WHERE child_user_id = $1 
       AND id::text = $2`,
      [childUserId, sessionId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    // Check for recent conversation (within last 30 minutes) to continue
    const recent = await pool.query(
      `SELECT id FROM child_conversations 
       WHERE child_user_id = $1 
       AND last_message_at > NOW() - INTERVAL '30 minutes'
       AND (creative_mode = $2 OR $2 IS NULL)
       ORDER BY last_message_at DESC
       LIMIT 1`,
      [childUserId, options.creativeMode || false]
    );

    if (recent.rows.length > 0) {
      // Update the existing conversation with new settings if needed
      await pool.query(
        `UPDATE child_conversations 
         SET character_name = COALESCE($2, character_name),
             character_emoji = COALESCE($3, character_emoji),
             theme = COALESCE($4, theme),
             creative_mode = COALESCE($5, creative_mode),
             creative_activity = COALESCE($6, creative_activity),
             spanish_mode = COALESCE($7, spanish_mode)
         WHERE id = $1`,
        [
          recent.rows[0].id,
          options.characterName,
          options.characterEmoji,
          options.theme,
          options.creativeMode,
          options.creativeActivity,
          options.spanishMode,
        ]
      );
      return recent.rows[0].id;
    }

    // Create new conversation
    const result = await pool.query(
      `INSERT INTO child_conversations 
       (child_user_id, character_name, character_emoji, theme, creative_mode, creative_activity, spanish_mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        childUserId,
        options.characterName,
        options.characterEmoji,
        options.theme,
        options.creativeMode || false,
        options.creativeActivity,
        options.spanishMode || false,
      ]
    );

    console.log('[ConversationHistory] Created new conversation:', result.rows[0].id);
    return result.rows[0].id;
  } catch (error) {
    console.error('[ConversationHistory] Error getting/creating conversation:', error);
    throw error;
  }
}

/**
 * Save a message to conversation history
 */
export async function saveMessage(
  conversationId: string,
  message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    wasFiltered?: boolean;
    characterName?: string;
    characterEmoji?: string;
  }
): Promise<string> {
  try {
    // Insert message
    const result = await pool.query(
      `INSERT INTO child_conversation_messages 
       (conversation_id, role, content, was_filtered, character_name, character_emoji)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        conversationId,
        message.role,
        message.content,
        message.wasFiltered || false,
        message.characterName,
        message.characterEmoji,
      ]
    );

    // Update conversation metadata
    await pool.query(
      `UPDATE child_conversations 
       SET message_count = message_count + 1,
           last_message_at = NOW(),
           flagged_content = flagged_content OR $2
       WHERE id = $1`,
      [conversationId, message.wasFiltered || false]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error('[ConversationHistory] Error saving message:', error);
    throw error;
  }
}

/**
 * Get conversations for a child (for their history view)
 */
export async function getChildConversations(
  childUserId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Conversation[]> {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        child_user_id as "childUserId",
        character_name as "characterName",
        character_emoji as "characterEmoji",
        theme,
        creative_mode as "creativeMode",
        creative_activity as "creativeActivity",
        spanish_mode as "spanishMode",
        message_count as "messageCount",
        started_at as "startedAt",
        last_message_at as "lastMessageAt",
        summary,
        topics
       FROM child_conversations
       WHERE child_user_id = $1
       ORDER BY last_message_at DESC
       LIMIT $2 OFFSET $3`,
      [childUserId, limit, offset]
    );

    return result.rows;
  } catch (error) {
    console.error('[ConversationHistory] Error getting child conversations:', error);
    return [];
  }
}

/**
 * Get a single conversation with all messages
 */
export async function getConversationWithMessages(
  conversationId: string,
  childUserId: string
): Promise<ConversationWithMessages | null> {
  try {
    // Get conversation
    const convResult = await pool.query(
      `SELECT 
        id,
        child_user_id as "childUserId",
        character_name as "characterName",
        character_emoji as "characterEmoji",
        theme,
        creative_mode as "creativeMode",
        creative_activity as "creativeActivity",
        spanish_mode as "spanishMode",
        message_count as "messageCount",
        started_at as "startedAt",
        last_message_at as "lastMessageAt",
        summary,
        topics
       FROM child_conversations
       WHERE id = $1 AND child_user_id = $2`,
      [conversationId, childUserId]
    );

    if (convResult.rows.length === 0) {
      return null;
    }

    // Get messages
    const msgResult = await pool.query(
      `SELECT 
        id,
        role,
        content,
        was_filtered as "wasFiltered",
        character_name as "characterName",
        character_emoji as "characterEmoji",
        created_at as "timestamp"
       FROM child_conversation_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );

    return {
      ...convResult.rows[0],
      messages: msgResult.rows,
    };
  } catch (error) {
    console.error('[ConversationHistory] Error getting conversation with messages:', error);
    return null;
  }
}

/**
 * Get conversation summaries for parent dashboard
 */
export async function getParentConversationSummaries(
  parentUserId: string,
  options: {
    childUserId?: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<ParentConversationSummary[]> {
  try {
    const { childUserId, limit = 50, offset = 0, startDate, endDate } = options;

    let query = `
      SELECT 
        c.id as "conversationId",
        ca.name as "childName",
        c.child_user_id as "childUserId",
        c.character_name as "characterName",
        c.theme,
        c.message_count as "messageCount",
        c.started_at as "startedAt",
        c.last_message_at as "lastMessageAt",
        c.summary,
        c.topics,
        c.flagged_content as "flaggedContent",
        c.creative_mode as "creativeMode"
       FROM child_conversations c
       JOIN child_accounts ca ON ca.user_id = c.child_user_id
       WHERE ca.parent_user_id = $1
    `;
    const params: any[] = [parentUserId];
    let paramIndex = 2;

    if (childUserId) {
      query += ` AND c.child_user_id = $${paramIndex}`;
      params.push(childUserId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND c.started_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND c.started_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY c.last_message_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[ConversationHistory] Error getting parent summaries:', error);
    return [];
  }
}

/**
 * Generate a summary for a conversation (can be called periodically or on demand)
 */
export async function generateConversationSummary(conversationId: string): Promise<string> {
  try {
    // Get messages
    const msgResult = await pool.query(
      `SELECT role, content FROM child_conversation_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT 20`,
      [conversationId]
    );

    if (msgResult.rows.length === 0) {
      return '';
    }

    // Simple summary: extract topics from user messages
    const userMessages = msgResult.rows
      .filter(m => m.role === 'user')
      .map(m => m.content);

    // Extract key topics (simple keyword extraction)
    const topics: string[] = [];
    const topicKeywords = [
      'castle', 'house', 'cookie', 'cake', 'room', 'build', 'create', 'design',
      'story', 'game', 'math', 'science', 'animal', 'space', 'dinosaur',
      'spanish', 'learn', 'help', 'homework', 'question',
    ];

    for (const msg of userMessages) {
      const lowerMsg = msg.toLowerCase();
      for (const keyword of topicKeywords) {
        if (lowerMsg.includes(keyword) && !topics.includes(keyword)) {
          topics.push(keyword);
        }
      }
    }

    // Create summary
    const summary = topics.length > 0
      ? `Discussed: ${topics.slice(0, 5).join(', ')}`
      : `${msgResult.rows.length} messages exchanged`;

    // Update conversation with summary
    await pool.query(
      `UPDATE child_conversations 
       SET summary = $2, topics = $3
       WHERE id = $1`,
      [conversationId, summary, JSON.stringify(topics)]
    );

    return summary;
  } catch (error) {
    console.error('[ConversationHistory] Error generating summary:', error);
    return '';
  }
}

/**
 * Get conversation statistics for a child
 */
export async function getChildConversationStats(childUserId: string): Promise<{
  totalConversations: number;
  totalMessages: number;
  favoriteCharacter?: string;
  topTopics: string[];
  lastActiveAt?: Date;
}> {
  try {
    const statsResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT c.id) as total_conversations,
        SUM(c.message_count) as total_messages,
        MAX(c.last_message_at) as last_active_at
       FROM child_conversations c
       WHERE c.child_user_id = $1`,
      [childUserId]
    );

    const charResult = await pool.query(
      `SELECT character_name, COUNT(*) as count
       FROM child_conversations
       WHERE child_user_id = $1 AND character_name IS NOT NULL
       GROUP BY character_name
       ORDER BY count DESC
       LIMIT 1`,
      [childUserId]
    );

    const topicsResult = await pool.query(
      `SELECT topics FROM child_conversations
       WHERE child_user_id = $1 AND topics IS NOT NULL
       ORDER BY last_message_at DESC
       LIMIT 10`,
      [childUserId]
    );

    // Aggregate topics
    const allTopics: Record<string, number> = {};
    for (const row of topicsResult.rows) {
      const topics = row.topics || [];
      for (const topic of topics) {
        allTopics[topic] = (allTopics[topic] || 0) + 1;
      }
    }
    const topTopics = Object.entries(allTopics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    const stats = statsResult.rows[0];
    return {
      totalConversations: parseInt(stats.total_conversations) || 0,
      totalMessages: parseInt(stats.total_messages) || 0,
      favoriteCharacter: charResult.rows[0]?.character_name,
      topTopics,
      lastActiveAt: stats.last_active_at,
    };
  } catch (error) {
    console.error('[ConversationHistory] Error getting stats:', error);
    return {
      totalConversations: 0,
      totalMessages: 0,
      topTopics: [],
    };
  }
}
