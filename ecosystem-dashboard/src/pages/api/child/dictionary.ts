/**
 * Child Dictionary API
 * 
 * Provides age-adaptive word definitions, translations, and vocabulary features.
 * Uses LLM to generate kid-friendly definitions based on child's age.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const AI_GATEWAY_URL = process.env.AI_GATEWAY_AI_URL || process.env.AI_GATEWAY_URL || 'http://localhost:8777';

interface DictionaryEntry {
  word: string;
  definition: string;
  pronunciation?: string;
  partOfSpeech: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  spanishTranslation?: string;
  spanishDefinition?: string;
  etymology?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  relatedWords: string[];
  funFact?: string;
  imagePrompt?: string;
}

interface WordOfDay {
  word: string;
  definition: string;
  date: string;
  theme?: string;
}

// Word of the day pool - themed for kids
const WORD_OF_DAY_POOL = [
  { word: 'adventure', theme: 'exploration' },
  { word: 'curious', theme: 'learning' },
  { word: 'discover', theme: 'science' },
  { word: 'imagine', theme: 'creativity' },
  { word: 'courage', theme: 'character' },
  { word: 'explore', theme: 'exploration' },
  { word: 'brilliant', theme: 'learning' },
  { word: 'create', theme: 'creativity' },
  { word: 'ecosystem', theme: 'science' },
  { word: 'persevere', theme: 'character' },
  { word: 'magnificent', theme: 'vocabulary' },
  { word: 'collaborate', theme: 'social' },
  { word: 'habitat', theme: 'science' },
  { word: 'ancient', theme: 'history' },
  { word: 'velocity', theme: 'science' },
  { word: 'compassion', theme: 'character' },
  { word: 'metamorphosis', theme: 'science' },
  { word: 'resilient', theme: 'character' },
  { word: 'constellation', theme: 'space' },
  { word: 'architect', theme: 'building' },
];

// Get word of the day based on date
function getWordOfDay(): { word: string; theme: string } {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const index = dayOfYear % WORD_OF_DAY_POOL.length;
  return WORD_OF_DAY_POOL[index];
}

// Generate age-appropriate definition using LLM
async function generateDefinition(
  word: string,
  childAge: number,
  childName: string,
  theme?: string,
  includeSpanish: boolean = false
): Promise<DictionaryEntry> {
  const ageDescription = childAge <= 6 ? 'a young child (5-6 years old)' :
                         childAge <= 8 ? 'a child (7-8 years old)' :
                         childAge <= 10 ? 'a child (9-10 years old)' :
                         'a pre-teen (11-12 years old)';

  const themeContext = theme === 'minecraft' 
    ? 'Use Minecraft references when helpful (blocks, mobs, biomes, crafting).'
    : theme === 'pusheen'
    ? 'Use cute, cozy references when helpful (cats, snacks, cozy things).'
    : '';

  const spanishInstruction = includeSpanish 
    ? `
- spanishTranslation: The word translated to Spanish
- spanishDefinition: A simple Spanish definition (1 sentence)`
    : '';

  const prompt = `You are a friendly dictionary assistant for ${childName}, ${ageDescription}.
Define the word "${word}" in a way that's perfect for their age and comprehension level.
${themeContext}

IMPORTANT: Respond ONLY in English. Do NOT use any Chinese, Japanese, Korean, or other non-English characters. Use only English words and standard ASCII characters.

Return a JSON object with these fields:
- word: "${word}"
- definition: A clear, age-appropriate definition (2-3 sentences max)
- pronunciation: How to say it phonetically (e.g., "ad-VEN-chur")
- partOfSpeech: noun, verb, adjective, etc.
- examples: Array of 2-3 example sentences a kid would relate to
- synonyms: Array of 2-3 simpler words that mean similar things
- antonyms: Array of 1-2 opposite words (if applicable, empty array if not)
- etymology: A fun, simple origin story of the word (1 sentence)
- difficulty: "easy", "medium", or "hard" based on grade level
- category: Subject category (science, nature, feelings, actions, etc.)
- relatedWords: Array of 2-3 related words to explore
- funFact: One interesting fact about this word or concept${spanishInstruction}

Make it engaging and fun! Use emojis sparingly in examples.
Return ONLY valid JSON, no markdown.`;

  try {
    const model = process.env.CHILD_AI_MODEL || 'qwen3-32b';
    const apiKey = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
    
    console.log('[Dictionary] Calling AI Gateway at:', AI_GATEWAY_URL);
    console.log('[Dictionary] Using model:', model);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Service-ID': 'child-dictionary',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    console.log('[Dictionary] AI Gateway response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Dictionary] AI Gateway error response:', errorText);
      throw new Error(`LLM request failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('[Dictionary] AI Gateway result received, parsing content...');
    let content = result.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      console.error('[Dictionary] No content in response. Full result:', JSON.stringify(result).substring(0, 500));
      throw new Error('No content in LLM response');
    }
    
    console.log('[Dictionary] Raw content length:', content.length);
    
    // Strip <think> tags from qwen3 model output
    if (content.includes('<think>')) {
      console.log('[Dictionary] Stripping <think> tags...');
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      console.log('[Dictionary] Content after stripping:', content.substring(0, 200));
    }
    
    // Strip any Chinese/Japanese/Korean characters that Qwen might output
    // CJK Unified Ideographs: \u4E00-\u9FFF
    // CJK Extension A: \u3400-\u4DBF
    // Hiragana: \u3040-\u309F, Katakana: \u30A0-\u30FF
    // Hangul: \uAC00-\uD7AF
    content = content.replace(/[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]+/g, '').trim();
    
    // Parse JSON from response (handle potential markdown wrapping)
    let jsonStr = content;
    if (content.includes('```json')) {
      jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.includes('```')) {
      jsonStr = content.replace(/```\n?/g, '');
    }
    
    // Try to extract JSON if there's extra text around it
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const entry = JSON.parse(jsonStr);
    return {
      word: entry.word || word,
      definition: entry.definition || 'Definition not available',
      pronunciation: entry.pronunciation,
      partOfSpeech: entry.partOfSpeech || 'unknown',
      examples: entry.examples || [],
      synonyms: entry.synonyms || [],
      antonyms: entry.antonyms || [],
      spanishTranslation: entry.spanishTranslation,
      spanishDefinition: entry.spanishDefinition,
      etymology: entry.etymology,
      difficulty: entry.difficulty || 'medium',
      category: entry.category,
      relatedWords: entry.relatedWords || [],
      funFact: entry.funFact,
    };
  } catch (error: any) {
    console.error('[Dictionary] LLM error for word "' + word + '":', error?.message || error);
    console.error('[Dictionary] Full error:', error);
    console.error('[Dictionary] Error stack:', error?.stack);
    // Return a basic fallback with a more helpful message
    return {
      word,
      definition: `We couldn't find a definition for "${word}" right now. Try again in a moment!`,
      partOfSpeech: 'unknown',
      examples: [`Try using "${word}" in a sentence!`],
      synonyms: [],
      antonyms: [],
      difficulty: 'medium',
      relatedWords: [],
    };
  }
}

// Record word lookup for tracking
async function recordWordLookup(userId: string, word: string, source: string) {
  try {
    await pool.query(`
      INSERT INTO child_learning.vocabulary_lookups (user_id, word, source, looked_up_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, word) 
      DO UPDATE SET lookup_count = child_learning.vocabulary_lookups.lookup_count + 1,
                    last_looked_up = NOW()
    `, [userId, word.toLowerCase(), source]);
  } catch (e) {
    // Table might not exist yet, that's okay
    console.warn('[Dictionary] Could not record lookup:', e);
  }
}

// Get user's vocabulary stats
async function getVocabularyStats(userId: string) {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT word) as total_words,
        COUNT(*) FILTER (WHERE looked_up_at > NOW() - INTERVAL '7 days') as words_this_week,
        COUNT(*) FILTER (WHERE looked_up_at > NOW() - INTERVAL '1 day') as words_today
      FROM child_learning.vocabulary_lookups
      WHERE user_id = $1
    `, [userId]);
    return result.rows[0] || { total_words: 0, words_this_week: 0, words_today: 0 };
  } catch (e) {
    return { total_words: 0, words_this_week: 0, words_today: 0 };
  }
}

// Get recent lookups
async function getRecentLookups(userId: string, limit: number = 10) {
  try {
    const result = await pool.query(`
      SELECT word, lookup_count, last_looked_up
      FROM child_learning.vocabulary_lookups
      WHERE user_id = $1
      ORDER BY last_looked_up DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  } catch (e) {
    return [];
  }
}

// Get favorite/saved words
async function getFavoriteWords(userId: string) {
  try {
    const result = await pool.query(`
      SELECT word, definition, added_at
      FROM child_learning.vocabulary_favorites
      WHERE user_id = $1
      ORDER BY added_at DESC
      LIMIT 50
    `, [userId]);
    return result.rows;
  } catch (e) {
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  // GET: Look up a word or get word of day
  if (req.method === 'GET') {
    const { word, action, source } = req.query;

    // Get child's age and theme for personalization
    let childAge = 8;
    let childName = user.name || 'friend';
    let theme: string | undefined;
    let includeSpanish = false;

    try {
      const userResult = await pool.query(`
        SELECT u.name, u.preferred_theme,
               EXTRACT(YEAR FROM AGE(cp.date_of_birth)) as age
        FROM users u
        LEFT JOIN child_profiles cp ON u.id = cp.user_id
        WHERE u.id = $1
      `, [user.id]);
      
      if (userResult.rows[0]) {
        childAge = userResult.rows[0].age || 8;
        childName = userResult.rows[0].name || childName;
        theme = userResult.rows[0].preferred_theme;
      }

      // Check if Spanish mode is enabled
      const spanishPref = await pool.query(`
        SELECT value FROM user_preferences 
        WHERE user_id = $1 AND key = 'spanish_learning_enabled'
      `, [user.id]);
      includeSpanish = spanishPref.rows[0]?.value === 'true';
    } catch (e) {
      console.warn('[Dictionary] Could not fetch user profile:', e);
    }

    // Word of the Day
    if (action === 'word-of-day') {
      const wotd = getWordOfDay();
      const definition = await generateDefinition(wotd.word, childAge, childName, theme, includeSpanish);
      return res.status(200).json({ 
        wordOfDay: { ...definition, theme: wotd.theme },
        date: new Date().toISOString().split('T')[0],
      });
    }

    // Get vocabulary stats
    if (action === 'stats') {
      const stats = await getVocabularyStats(user.id);
      const recentWords = await getRecentLookups(user.id, 10);
      const favorites = await getFavoriteWords(user.id);
      return res.status(200).json({ stats, recentWords, favorites });
    }

    // Get recent lookups
    if (action === 'recent') {
      const recentWords = await getRecentLookups(user.id, 20);
      return res.status(200).json({ recentWords });
    }

    // Look up a specific word
    if (word && typeof word === 'string') {
      const cleanWord = word.trim().toLowerCase();
      
      if (cleanWord.length < 1 || cleanWord.length > 50) {
        return res.status(400).json({ error: 'Invalid word' });
      }

      // Record the lookup
      await recordWordLookup(user.id, cleanWord, (source as string) || 'dictionary');

      // Generate definition
      const definition = await generateDefinition(cleanWord, childAge, childName, theme, includeSpanish);
      
      return res.status(200).json({ entry: definition });
    }

    return res.status(400).json({ error: 'Missing word or action parameter' });
  }

  // POST: Save a word to favorites
  if (req.method === 'POST') {
    const { word, definition, action } = req.body;

    if (action === 'favorite') {
      if (!word) {
        return res.status(400).json({ error: 'Word is required' });
      }

      try {
        await pool.query(`
          INSERT INTO child_learning.vocabulary_favorites (user_id, word, definition, added_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (user_id, word) DO NOTHING
        `, [user.id, word.toLowerCase(), definition || '']);
        
        return res.status(200).json({ success: true, message: 'Word saved!' });
      } catch (e) {
        console.error('[Dictionary] Failed to save favorite:', e);
        return res.status(500).json({ error: 'Failed to save word' });
      }
    }

    if (action === 'unfavorite') {
      try {
        await pool.query(`
          DELETE FROM child_learning.vocabulary_favorites
          WHERE user_id = $1 AND word = $2
        `, [user.id, word.toLowerCase()]);
        
        return res.status(200).json({ success: true });
      } catch (e) {
        return res.status(500).json({ error: 'Failed to remove word' });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
