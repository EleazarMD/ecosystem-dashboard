/**
 * Journal AI Evaluation API
 * 
 * GooseMind-powered evaluation of journal entries:
 * - Skill assessment (creativity, expression, reflection, vocabulary, structure)
 * - Personalized recommendations
 * - Writing prompts based on user's style
 * - Encouragement and positive reinforcement
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  JournalEntry,
  JournalAIEvaluation,
  JournalSkillScore,
  JournalRecommendation,
  JOURNAL_TYPE_CONFIG,
} from '@/types/journal';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;
  const { entryId, action = 'evaluate' } = req.body;

  if (!entryId) {
    return res.status(400).json({ error: 'Entry ID is required' });
  }

  try {
    // Fetch the entry
    const entryResult = await pool.query(
      `SELECT * FROM journal_entries WHERE id = $1 AND user_id = $2`,
      [entryId, userId]
    );

    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = formatEntry(entryResult.rows[0]);

    // Get user's journal history for context
    const historyResult = await pool.query(
      `SELECT type, mood, content, ai_evaluation 
       FROM journal_entries 
       WHERE user_id = $1 AND id != $2
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId, entryId]
    );

    const history = historyResult.rows;

    switch (action) {
      case 'evaluate':
        const evaluation = await evaluateEntry(entry, history, userId);
        
        // Save evaluation to database
        await pool.query(
          `UPDATE journal_entries SET ai_evaluation = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(evaluation), entryId]
        );

        return res.status(200).json({ 
          evaluation,
          message: '✨ Your journal has been reviewed!',
        });

      case 'suggest_improvements':
        const suggestions = await getSuggestions(entry, history);
        return res.status(200).json({ suggestions });

      case 'generate_prompt':
        const prompt = await generatePersonalizedPrompt(entry, history, userId);
        return res.status(200).json({ prompt });

      case 'continue_writing':
        const continuation = await getContinuation(entry);
        return res.status(200).json({ continuation });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('[Journal Evaluate API] Error:', error);
    return res.status(500).json({ error: 'Failed to evaluate entry' });
  }
}

/**
 * Evaluate a journal entry using GooseMind
 */
async function evaluateEntry(
  entry: JournalEntry,
  history: any[],
  userId: string
): Promise<JournalAIEvaluation> {
  const typeConfig = JOURNAL_TYPE_CONFIG[entry.type];
  
  // Build evaluation prompt
  const prompt = `You are GooseMind, a friendly and encouraging AI assistant helping children become better writers and thinkers. 

Evaluate this ${typeConfig.label} journal entry from a child. Be VERY encouraging and positive while providing helpful feedback.

ENTRY TYPE: ${typeConfig.label}
ENTRY TITLE: ${entry.title}
ENTRY CONTENT:
${entry.content}

MOOD: ${entry.mood || 'not specified'}
HIGHLIGHTS: ${entry.highlights.map(h => `${h.type}: ${h.text}`).join(', ') || 'none'}

Previous entries context: The child has written ${history.length} previous entries.

Please evaluate this entry and respond in JSON format:
{
  "overallScore": <1-5 number>,
  "encouragement": "<warm, positive message about their writing - 2-3 sentences>",
  "skills": {
    "creativity": { "score": <1-5>, "feedback": "<brief positive feedback>" },
    "expression": { "score": <1-5>, "feedback": "<brief positive feedback>" },
    "reflection": { "score": <1-5>, "feedback": "<brief positive feedback>" },
    "vocabulary": { "score": <1-5>, "feedback": "<brief positive feedback>" },
    "structure": { "score": <1-5>, "feedback": "<brief positive feedback>" }
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "growthAreas": ["<positive framing of area to improve>"],
  "recommendations": [
    {
      "type": "writing_tip",
      "title": "<short title>",
      "description": "<helpful tip>",
      "emoji": "<relevant emoji>"
    }
  ],
  "suggestedPrompts": ["<prompt 1>", "<prompt 2>"]
}

IMPORTANT: 
- Be VERY encouraging - this is for a child
- Frame everything positively
- Scores should generally be 3-5 (we want to encourage, not discourage)
- Keep feedback age-appropriate and simple
- Use fun emojis in your encouragement`;

  try {
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CHILD_SAFETY_API_KEY || 'child-safety-key'}`,
        'X-Service-ID': 'child-journal',
      },
      body: JSON.stringify({
        model: process.env.CHILD_AI_MODEL || 'qwen3-8b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.error('[Journal Evaluate] AI Gateway error:', response.status);
      return getDefaultEvaluation(entry);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Journal Evaluate] Failed to parse AI response');
      return getDefaultEvaluation(entry);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      id: uuidv4(),
      entryId: entry.id,
      evaluatedAt: new Date(),
      overallScore: parsed.overallScore || 4,
      encouragement: parsed.encouragement || 'Great job writing in your journal! Keep it up! 🌟',
      skills: {
        creativity: formatSkillScore(parsed.skills?.creativity, 'creativity'),
        expression: formatSkillScore(parsed.skills?.expression, 'expression'),
        reflection: formatSkillScore(parsed.skills?.reflection, 'reflection'),
        vocabulary: formatSkillScore(parsed.skills?.vocabulary, 'vocabulary'),
        structure: formatSkillScore(parsed.skills?.structure, 'structure'),
      },
      recommendations: (parsed.recommendations || []).map((r: any) => ({
        id: uuidv4(),
        type: r.type || 'writing_tip',
        title: r.title || 'Keep Writing!',
        description: r.description || 'Practice makes perfect!',
        emoji: r.emoji || '✨',
        priority: 'medium' as const,
      })),
      suggestedPrompts: parsed.suggestedPrompts || [
        'What made you smile today?',
        'Tell me about something you learned.',
      ],
      strengths: parsed.strengths || ['Great effort!', 'Nice writing!'],
      growthAreas: parsed.growthAreas || ['Keep practicing and you\'ll get even better!'],
    };
  } catch (error) {
    console.error('[Journal Evaluate] Error:', error);
    return getDefaultEvaluation(entry);
  }
}

/**
 * Get writing suggestions for improvement
 */
async function getSuggestions(entry: JournalEntry, history: any[]): Promise<string[]> {
  const prompt = `You are a friendly writing coach for children. 
  
Given this journal entry, provide 3 simple, encouraging suggestions to make it even better:

TITLE: ${entry.title}
CONTENT: ${entry.content}

Respond with a JSON array of 3 short, kid-friendly suggestions:
["suggestion 1", "suggestion 2", "suggestion 3"]`;

  try {
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CHILD_SAFETY_API_KEY || 'child-safety-key'}`,
        'X-Service-ID': 'child-journal',
      },
      body: JSON.stringify({
        model: process.env.CHILD_AI_MODEL || 'qwen3-8b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      return getDefaultSuggestions();
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return getDefaultSuggestions();
  } catch (error) {
    return getDefaultSuggestions();
  }
}

/**
 * Generate a personalized prompt based on user's writing history
 */
async function generatePersonalizedPrompt(
  entry: JournalEntry,
  history: any[],
  userId: string
): Promise<{ prompt: string; emoji: string }> {
  // Analyze what types of entries they write most
  const typeCounts: Record<string, number> = {};
  history.forEach(h => {
    typeCounts[h.type] = (typeCounts[h.type] || 0) + 1;
  });

  // Suggest something different or build on their interests
  const prompt = `Based on a child's journal history, suggest ONE creative writing prompt.

Their recent entries have been about: ${Object.entries(typeCounts).map(([t, c]) => `${t} (${c})`).join(', ')}
Their latest entry was: ${entry.type} - "${entry.title}"

Suggest a prompt that either:
1. Builds on their interests
2. Encourages them to try something new

Respond in JSON: {"prompt": "<the prompt>", "emoji": "<relevant emoji>"}`;

  try {
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CHILD_SAFETY_API_KEY || 'child-safety-key'}`,
        'X-Service-ID': 'child-journal',
      },
      body: JSON.stringify({
        model: process.env.CHILD_AI_MODEL || 'qwen3-8b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      return { prompt: 'What adventure would you like to go on?', emoji: '🗺️' };
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return { prompt: 'What made today special?', emoji: '⭐' };
  } catch (error) {
    return { prompt: 'What are you grateful for today?', emoji: '💝' };
  }
}

/**
 * Get AI help to continue writing
 */
async function getContinuation(entry: JournalEntry): Promise<string> {
  const prompt = `You are helping a child continue their journal entry. 
  
Their entry so far:
TITLE: ${entry.title}
CONTENT: ${entry.content}

Provide a SHORT (1-2 sentences) suggestion for what they could write next. 
Be encouraging and ask a question to spark their thinking.
Do NOT write the content for them - just give them a nudge.`;

  try {
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CHILD_SAFETY_API_KEY || 'child-safety-key'}`,
        'X-Service-ID': 'child-journal',
      },
      body: JSON.stringify({
        model: process.env.CHILD_AI_MODEL || 'qwen3-8b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      return 'What happened next? Tell me more! 🌟';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Keep going - you\'re doing great! What else would you like to add?';
  } catch (error) {
    return 'You\'re doing amazing! What else would you like to share?';
  }
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
    linkedPlannerItems: [],
    linkedWorkspacePages: [],
    isPrivate: row.is_private,
    sharedWithParent: row.shared_with_parent,
  };
}

function formatSkillScore(skill: any, name: string): JournalSkillScore {
  return {
    skill: name,
    score: skill?.score || 4,
    trend: 'stable',
    feedback: skill?.feedback || 'Keep up the good work!',
  };
}

function getDefaultEvaluation(entry: JournalEntry): JournalAIEvaluation {
  return {
    id: uuidv4(),
    entryId: entry.id,
    evaluatedAt: new Date(),
    overallScore: 4,
    encouragement: 'Great job writing in your journal today! Every entry helps you become a better writer. Keep it up! 🌟',
    skills: {
      creativity: { skill: 'creativity', score: 4, trend: 'stable', feedback: 'Nice creative thinking!' },
      expression: { skill: 'expression', score: 4, trend: 'stable', feedback: 'You express yourself well!' },
      reflection: { skill: 'reflection', score: 4, trend: 'stable', feedback: 'Good reflection!' },
      vocabulary: { skill: 'vocabulary', score: 4, trend: 'stable', feedback: 'Nice word choices!' },
      structure: { skill: 'structure', score: 4, trend: 'stable', feedback: 'Well organized!' },
    },
    recommendations: [
      {
        id: uuidv4(),
        type: 'writing_tip',
        title: 'Add More Details',
        description: 'Try adding more details about how things looked, sounded, or felt!',
        emoji: '✨',
        priority: 'medium',
      },
    ],
    suggestedPrompts: [
      'What was the best part of your day?',
      'What are you looking forward to tomorrow?',
    ],
    strengths: ['Great effort!', 'Consistent writing!'],
    growthAreas: ['Keep practicing and exploring new topics!'],
  };
}

function getDefaultSuggestions(): string[] {
  return [
    'Try adding more details about how you felt!',
    'What sounds or colors do you remember?',
    'Who else was there? What did they do?',
  ];
}
