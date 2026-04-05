/**
 * Child Journal API
 * 
 * CRUD operations for journal entries with:
 * - GooseMind AI evaluation integration
 * - Planner and Workspace connectivity
 * - Progress tracking and streaks
 * - Content filtering for child safety
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  JournalEntry,
  JournalEntryType,
  MoodType,
  JournalHighlight,
  CreateJournalEntryParams,
  UpdateJournalEntryParams,
  JournalSearchParams,
  JournalStreak,
  JournalProgress,
  DAILY_PROMPTS,
} from '@/types/journal';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;
  
  // Get tenant_id for multi-tenant isolation (children inherit parent's tenant)
  const tenantResult = await pool.query(
    `SELECT tm.tenant_id FROM tenant_memberships tm WHERE tm.user_id = $1 LIMIT 1`,
    [userId]
  );
  const tenantId = tenantResult.rows[0]?.tenant_id;

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res, userId, tenantId);
      case 'POST':
        return handlePost(req, res, userId, tenantId);
      case 'PUT':
        return handlePut(req, res, userId, tenantId);
      case 'DELETE':
        return handleDelete(req, res, userId, tenantId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[Journal API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET - Fetch journal entries, single entry, or stats
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  tenantId: string | undefined
) {
  const { id, action, type, mood, dateFrom, dateTo, limit = '20', offset = '0' } = req.query;

  // Get single entry
  if (id && !action) {
    const result = await pool.query(
      `SELECT * FROM journal_entries WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    return res.status(200).json({ entry: formatEntry(result.rows[0]) });
  }

  // Get stats/progress
  if (action === 'stats') {
    const stats = await getJournalStats(userId);
    return res.status(200).json(stats);
  }

  // Get streak info
  if (action === 'streak') {
    const streak = await getJournalStreak(userId);
    return res.status(200).json({ streak });
  }

  // Get daily prompt
  if (action === 'prompt') {
    const prompt = getDailyPrompt();
    return res.status(200).json({ prompt });
  }

  // Get analytics for kid-friendly progress view
  if (action === 'analytics') {
    const analytics = await getJournalAnalytics(userId, tenantId);
    return res.status(200).json({ analytics });
  }

  // Get entries list with filters
  let query = `
    SELECT * FROM journal_entries 
    WHERE user_id = $1
  `;
  const params: any[] = [userId];
  let paramIndex = 2;

  if (type) {
    query += ` AND type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (mood) {
    query += ` AND mood = $${paramIndex}`;
    params.push(mood);
    paramIndex++;
  }

  if (dateFrom) {
    query += ` AND date >= $${paramIndex}`;
    params.push(dateFrom);
    paramIndex++;
  }

  if (dateTo) {
    query += ` AND date <= $${paramIndex}`;
    params.push(dateTo);
    paramIndex++;
  }

  query += ` ORDER BY date DESC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(parseInt(limit as string), parseInt(offset as string));

  const result = await pool.query(query, params);
  const entries = result.rows.map(formatEntry);

  // Get total count for pagination
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM journal_entries WHERE user_id = $1`,
    [userId]
  );

  return res.status(200).json({
    entries,
    total: parseInt(countResult.rows[0].count),
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
  });
}

/**
 * POST - Create new journal entry
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  tenantId: string | undefined
) {
  const {
    type,
    title,
    content,
    mood,
    highlights = [],
    tags = [],
    date,
    isPrivate = false,
    sharedWithParent = true,
    linkedPlannerItems = [],
    linkedWorkspacePages = [],
  }: CreateJournalEntryParams = req.body;

  if (!type || !title || !content) {
    return res.status(400).json({ error: 'Type, title, and content are required' });
  }

  const id = uuidv4();
  const entryDate = date || new Date().toISOString().split('T')[0];
  const now = new Date();

  // Add IDs to highlights
  const highlightsWithIds = highlights.map(h => ({
    ...h,
    id: uuidv4(),
  }));

  try {
    const result = await pool.query(
      `INSERT INTO journal_entries (
        id, user_id, tenant_id, type, title, content, mood, highlights, tags, date,
        created_at, updated_at, is_private, shared_with_parent,
        linked_planner_items, linked_workspace_pages
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id, userId, tenantId, type, title, content, mood,
        JSON.stringify(highlightsWithIds),
        JSON.stringify(tags),
        entryDate, now, now, isPrivate, sharedWithParent,
        JSON.stringify(linkedPlannerItems),
        JSON.stringify(linkedWorkspacePages),
      ]
    );

    const entry = formatEntry(result.rows[0]);

    // Update streak
    await updateStreak(userId, entryDate);

    // Log activity for GooseMind learning
    await logJournalActivity(userId, 'create', entry);

    return res.status(201).json({ 
      entry,
      message: '📔 Journal entry saved!',
    });
  } catch (error) {
    console.error('[Journal API] Create error:', error);
    return res.status(500).json({ error: 'Failed to create entry' });
  }
}

/**
 * PUT - Update existing journal entry
 */
async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  tenantId: string | undefined
) {
  const {
    id,
    title,
    content,
    mood,
    highlights,
    tags,
    isPrivate,
    sharedWithParent,
    linkedPlannerItems,
    linkedWorkspacePages,
  }: UpdateJournalEntryParams = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Entry ID is required' });
  }

  // Verify ownership
  const existing = await pool.query(
    `SELECT * FROM journal_entries WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  // Build update query dynamically
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    params.push(title);
    paramIndex++;
  }
  if (content !== undefined) {
    updates.push(`content = $${paramIndex}`);
    params.push(content);
    paramIndex++;
  }
  if (mood !== undefined) {
    updates.push(`mood = $${paramIndex}`);
    params.push(mood);
    paramIndex++;
  }
  if (highlights !== undefined) {
    updates.push(`highlights = $${paramIndex}`);
    params.push(JSON.stringify(highlights));
    paramIndex++;
  }
  if (tags !== undefined) {
    updates.push(`tags = $${paramIndex}`);
    params.push(JSON.stringify(tags));
    paramIndex++;
  }
  if (isPrivate !== undefined) {
    updates.push(`is_private = $${paramIndex}`);
    params.push(isPrivate);
    paramIndex++;
  }
  if (sharedWithParent !== undefined) {
    updates.push(`shared_with_parent = $${paramIndex}`);
    params.push(sharedWithParent);
    paramIndex++;
  }
  if (linkedPlannerItems !== undefined) {
    updates.push(`linked_planner_items = $${paramIndex}`);
    params.push(JSON.stringify(linkedPlannerItems));
    paramIndex++;
  }
  if (linkedWorkspacePages !== undefined) {
    updates.push(`linked_workspace_pages = $${paramIndex}`);
    params.push(JSON.stringify(linkedWorkspacePages));
    paramIndex++;
  }

  updates.push(`updated_at = $${paramIndex}`);
  params.push(new Date());
  paramIndex++;

  params.push(id);
  params.push(userId);

  const result = await pool.query(
    `UPDATE journal_entries SET ${updates.join(', ')} 
     WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING *`,
    params
  );

  return res.status(200).json({
    entry: formatEntry(result.rows[0]),
    message: '✏️ Entry updated!',
  });
}

/**
 * DELETE - Remove journal entry
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  tenantId: string | undefined
) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Entry ID is required' });
  }

  const result = await pool.query(
    `DELETE FROM journal_entries WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  return res.status(200).json({ 
    success: true,
    message: '🗑️ Entry deleted',
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatEntry(row: any): JournalEntry {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    content: row.content,
    mood: row.mood,
    highlights: typeof row.highlights === 'string' ? JSON.parse(row.highlights) : row.highlights || [],
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [],
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    linkedPlannerItems: typeof row.linked_planner_items === 'string' 
      ? JSON.parse(row.linked_planner_items) 
      : row.linked_planner_items || [],
    linkedWorkspacePages: typeof row.linked_workspace_pages === 'string'
      ? JSON.parse(row.linked_workspace_pages)
      : row.linked_workspace_pages || [],
    aiEvaluation: row.ai_evaluation 
      ? (typeof row.ai_evaluation === 'string' ? JSON.parse(row.ai_evaluation) : row.ai_evaluation)
      : undefined,
    images: row.images 
      ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images)
      : [],
    drawings: row.drawings 
      ? (typeof row.drawings === 'string' ? JSON.parse(row.drawings) : row.drawings)
      : [],
    isPrivate: row.is_private,
    sharedWithParent: row.shared_with_parent,
  };
}

async function getJournalStreak(userId: string): Promise<JournalStreak> {
  // Get all entry dates for the user
  const result = await pool.query(
    `SELECT DISTINCT date FROM journal_entries 
     WHERE user_id = $1 
     ORDER BY date DESC`,
    [userId]
  );

  const dates = result.rows.map(r => r.date);
  const today = new Date().toISOString().split('T')[0];
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  for (const dateStr of dates) {
    const date = new Date(dateStr + 'T00:00:00');
    
    if (!lastDate) {
      // First entry - check if it's today or yesterday
      const daysDiff = Math.floor((new Date(today + 'T00:00:00').getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 1) {
        tempStreak = 1;
        currentStreak = 1;
      }
    } else {
      const daysDiff = Math.floor((lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        tempStreak++;
        if (currentStreak > 0) currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
        currentStreak = 0;
      }
    }
    
    lastDate = date;
  }
  
  longestStreak = Math.max(longestStreak, tempStreak);

  // Get counts
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const countResult = await pool.query(
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE date >= $2) as this_week,
      COUNT(*) FILTER (WHERE date >= $3) as this_month
     FROM journal_entries WHERE user_id = $1`,
    [userId, weekAgo.toISOString().split('T')[0], monthAgo.toISOString().split('T')[0]]
  );

  return {
    currentStreak,
    longestStreak,
    lastEntryDate: dates[0] || '',
    totalEntries: parseInt(countResult.rows[0].total),
    entriesThisWeek: parseInt(countResult.rows[0].this_week),
    entriesThisMonth: parseInt(countResult.rows[0].this_month),
  };
}

async function getJournalStats(userId: string): Promise<JournalProgress> {
  const streak = await getJournalStreak(userId);

  // Get mood distribution
  const moodResult = await pool.query(
    `SELECT mood, COUNT(*) as count 
     FROM journal_entries 
     WHERE user_id = $1 AND mood IS NOT NULL
     GROUP BY mood 
     ORDER BY count DESC`,
    [userId]
  );

  // Get tag distribution
  const tagResult = await pool.query(
    `SELECT tag, COUNT(*) as count
     FROM journal_entries, jsonb_array_elements_text(tags::jsonb) as tag
     WHERE user_id = $1
     GROUP BY tag
     ORDER BY count DESC
     LIMIT 10`,
    [userId]
  );

  // Get word count stats
  const wordResult = await pool.query(
    `SELECT 
      SUM(array_length(regexp_split_to_array(content, '\s+'), 1)) as total_words,
      AVG(array_length(regexp_split_to_array(content, '\s+'), 1)) as avg_words,
      MAX(array_length(regexp_split_to_array(content, '\s+'), 1)) as max_words
     FROM journal_entries WHERE user_id = $1`,
    [userId]
  );

  return {
    userId,
    streak,
    skillHistory: [], // TODO: Implement skill tracking over time
    badges: [], // TODO: Implement badge system
    topTags: tagResult.rows.map(r => ({ tag: r.tag, count: parseInt(r.count) })),
    topMoods: moodResult.rows.map(r => ({ mood: r.mood as MoodType, count: parseInt(r.count) })),
    totalWords: parseInt(wordResult.rows[0]?.total_words || '0'),
    averageWordsPerEntry: Math.round(parseFloat(wordResult.rows[0]?.avg_words || '0')),
    longestEntry: parseInt(wordResult.rows[0]?.max_words || '0'),
  };
}

async function updateStreak(userId: string, date: string): Promise<void> {
  // Streak is calculated dynamically, but we can log the activity
  console.log(`[Journal] User ${userId} wrote entry on ${date}`);
}

/**
 * Get kid-friendly analytics including trending topics across all users in tenant
 */
async function getJournalAnalytics(userId: string, tenantId: string | undefined) {
  // Get user's word stats
  const wordStatsResult = await pool.query(
    `SELECT 
      COALESCE(SUM(LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1), 0) as total_words,
      COALESCE(AVG(LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1), 0) as avg_words,
      COUNT(*) as entry_count
     FROM journal_entries WHERE user_id = $1`,
    [userId]
  );

  // Get user's top tags
  const userTagsResult = await pool.query(
    `SELECT tag, COUNT(*) as count
     FROM journal_entries, jsonb_array_elements_text(tags) as tag
     WHERE user_id = $1
     GROUP BY tag
     ORDER BY count DESC
     LIMIT 5`,
    [userId]
  );

  // Get user's mood distribution
  const moodResult = await pool.query(
    `SELECT mood, COUNT(*) as count
     FROM journal_entries 
     WHERE user_id = $1 AND mood IS NOT NULL
     GROUP BY mood
     ORDER BY count DESC`,
    [userId]
  );

  // Get trending topics across all users in tenant (for "what others are writing about")
  let trendingTopics: string[] = [];
  if (tenantId) {
    const trendingResult = await pool.query(
      `SELECT tag, COUNT(DISTINCT user_id) as user_count
       FROM journal_entries je, jsonb_array_elements_text(tags) as tag
       WHERE je.tenant_id = $1 
         AND je.date >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY tag
       ORDER BY user_count DESC, COUNT(*) DESC
       LIMIT 5`,
      [tenantId]
    );
    trendingTopics = trendingResult.rows.map(r => r.tag);
  }

  // Generate recommended focus areas based on user's writing patterns
  const recommendedFocus: string[] = [];
  const entryCount = parseInt(wordStatsResult.rows[0]?.entry_count || '0');
  const avgWords = parseFloat(wordStatsResult.rows[0]?.avg_words || '0');
  
  // Recommendations based on patterns
  if (entryCount < 3) {
    recommendedFocus.push('📝 Try writing every day this week!');
  }
  if (avgWords < 50) {
    recommendedFocus.push('✨ Add more details to your stories');
  }
  if (avgWords > 100) {
    recommendedFocus.push('🌟 Great job writing long entries!');
  }
  
  // Check for mood variety
  const moodCount = moodResult.rows.length;
  if (moodCount < 3 && entryCount >= 3) {
    recommendedFocus.push('🎭 Try different moods - it\'s okay to feel all kinds of ways!');
  }
  
  // Check for tag usage
  const tagCount = userTagsResult.rows.length;
  if (tagCount < 2 && entryCount >= 3) {
    recommendedFocus.push('🏷️ Add tags to organize your thoughts');
  }

  // Suggest trying different entry types
  const typeResult = await pool.query(
    `SELECT type, COUNT(*) as count FROM journal_entries WHERE user_id = $1 GROUP BY type`,
    [userId]
  );
  const usedTypes = typeResult.rows.map(r => r.type);
  const allTypes = ['daily', 'gratitude', 'creative', 'learning', 'goals', 'feelings', 'adventure'];
  const unusedTypes = allTypes.filter(t => !usedTypes.includes(t));
  if (unusedTypes.length > 0 && entryCount >= 2) {
    const typeEmojis: Record<string, string> = {
      gratitude: '💝',
      creative: '✨',
      learning: '📚',
      goals: '🎯',
      feelings: '💭',
      adventure: '🗺️',
    };
    const suggestType = unusedTypes[Math.floor(Math.random() * unusedTypes.length)];
    if (suggestType !== 'daily') {
      recommendedFocus.push(`${typeEmojis[suggestType] || '📔'} Try a ${suggestType} entry!`);
    }
  }

  // Build mood distribution object
  const moodDistribution: Record<string, number> = {};
  moodResult.rows.forEach(r => {
    moodDistribution[r.mood] = parseInt(r.count);
  });

  return {
    totalWords: parseInt(wordStatsResult.rows[0]?.total_words || '0'),
    avgWordsPerEntry: Math.round(parseFloat(wordStatsResult.rows[0]?.avg_words || '0')),
    entryCount,
    topTags: userTagsResult.rows.map(r => ({ tag: r.tag, count: parseInt(r.count) })),
    moodDistribution,
    trendingTopics,
    recommendedFocus: recommendedFocus.slice(0, 3), // Max 3 recommendations
  };
}

async function logJournalActivity(
  userId: string, 
  action: string, 
  entry: JournalEntry
): Promise<void> {
  // Log for GooseMind learning system (child_learning schema)
  try {
    await pool.query(
      `INSERT INTO child_learning.activity_log (child_user_id, activity_type, metadata, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, `journal_${action}`, JSON.stringify({
        entryId: entry.id,
        type: entry.type,
        mood: entry.mood,
        wordCount: entry.content.split(/\s+/).length,
        tags: entry.tags,
      })]
    );
  } catch (error) {
    // Non-critical, just log
    console.error('[Journal] Failed to log activity:', error);
  }
}

function getDailyPrompt() {
  // Get a random prompt, weighted towards unused ones
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const promptIndex = dayOfYear % DAILY_PROMPTS.length;
  return DAILY_PROMPTS[promptIndex];
}
