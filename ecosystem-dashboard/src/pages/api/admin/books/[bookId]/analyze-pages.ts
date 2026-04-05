/**
 * Page-Level Analysis API for Books
 * 
 * Triggers AI analysis of individual pages to create page-level GraphRAG nodes.
 * This populates the BookPage nodes with summaries, character appearances,
 * vocabulary in context, and plot point connections.
 * 
 * Admin/Parent only endpoint.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const neo4j = require('neo4j-driver');
const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7688',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';

interface PageAnalysis {
  summary?: string;
  scene_description?: string;
  dialogue_summary?: string;
  characters_on_page?: Array<{
    name: string;
    action?: string;
    dialogue?: string;
    emotion?: string;
  }>;
  key_vocabulary?: string[];
  vocabulary_in_context?: Array<{
    word: string;
    context?: string;
  }>;
  reading_questions?: string[];
  narrative_moment?: string;
  is_chapter_start?: boolean;
  chapter?: number;
  plot_connections?: Array<{
    title: string;
    relevance?: string;
  }>;
}

async function analyzePageWithLLM(
  pageNumber: number,
  textContent: string,
  bookTitle: string,
  knownCharacters: string[]
): Promise<PageAnalysis> {
  const prompt = `You must respond with ONLY valid JSON. No explanations or markdown.

Analyze page ${pageNumber} of "${bookTitle}":

PAGE TEXT:
${textContent?.substring(0, 3000) || "(No text - image-based page)"}

Known characters in this book: ${knownCharacters.slice(0, 10).join(', ') || 'Unknown'}

Extract the following in JSON format:
{
    "summary": "2-3 sentence kid-friendly summary of what happens on this page",
    "scene_description": "Brief description of the visual scene",
    "dialogue_summary": "Summary of any dialogue or speech bubbles",
    "characters_on_page": [
        {
            "name": "Character name",
            "action": "What they are doing",
            "dialogue": "Key thing they say (if any)",
            "emotion": "Their emotion (happy, sad, excited, worried, etc.)"
        }
    ],
    "key_vocabulary": ["word1", "word2"],
    "vocabulary_in_context": [
        {
            "word": "interesting word",
            "context": "The sentence where it appears"
        }
    ],
    "reading_questions": [
        "Question 1 about this page?",
        "Question 2 about this page?"
    ],
    "narrative_moment": "introduction|rising_action|climax|falling_action|resolution",
    "is_chapter_start": false,
    "chapter": null,
    "plot_connections": [
        {
            "title": "Related plot point",
            "relevance": "How this page relates to the plot"
        }
    ]
}

Focus on what a child would find interesting and educational.`;

  try {
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024'}`,
      },
      body: JSON.stringify({
        model: process.env.CHILD_AI_MODEL || 'qwen3-8b',
        messages: [
          { role: 'system', content: 'You are a children\'s book analyst. Respond only with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '{}';

    // Clean up response
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
    content = content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    content = content.replace(/```json\s*/g, '');
    content = content.replace(/```\s*/g, '');
    content = content.trim();

    // Extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return JSON.parse(content);
  } catch (error) {
    console.error(`[Page Analysis] LLM error for page ${pageNumber}:`, error);
    return {};
  }
}

async function createPageNode(
  bookId: string,
  pageNumber: number,
  analysis: PageAnalysis,
  neo4jSession: any
): Promise<void> {
  const pageId = `${bookId}_page_${pageNumber}`;

  // Create/update page node
  await neo4jSession.run(`
    MERGE (pg:BookPage {id: $pageId})
    SET pg.book_id = $bookId,
        pg.page_number = $pageNumber,
        pg.summary = $summary,
        pg.scene_description = $sceneDescription,
        pg.dialogue_summary = $dialogueSummary,
        pg.key_vocabulary = $keyVocabulary,
        pg.reading_questions = $readingQuestions,
        pg.chapter = $chapter,
        pg.is_chapter_start = $isChapterStart,
        pg.narrative_moment = $narrativeMoment,
        pg.analyzed_at = datetime()
    
    WITH pg
    MATCH (b:Book {id: $bookId})
    MERGE (pg)-[:PAGE_OF]->(b)
  `, {
    pageId,
    bookId,
    pageNumber,
    summary: analysis.summary || null,
    sceneDescription: analysis.scene_description || null,
    dialogueSummary: analysis.dialogue_summary || null,
    keyVocabulary: analysis.key_vocabulary || [],
    readingQuestions: analysis.reading_questions || [],
    chapter: analysis.chapter || null,
    isChapterStart: analysis.is_chapter_start || false,
    narrativeMoment: analysis.narrative_moment || null,
  });

  // Link characters to page
  for (const char of analysis.characters_on_page || []) {
    if (!char.name) continue;
    
    await neo4jSession.run(`
      MATCH (pg:BookPage {id: $pageId})
      MATCH (c:BookCharacter {book_id: $bookId})
      WHERE toLower(c.name) CONTAINS toLower($charName)
         OR toLower($charName) CONTAINS toLower(c.name)
      MERGE (c)-[r:APPEARS_ON]->(pg)
      SET r.action = $action,
          r.dialogue = $dialogue,
          r.emotion = $emotion
    `, {
      pageId,
      bookId,
      charName: char.name,
      action: char.action || null,
      dialogue: char.dialogue || null,
      emotion: char.emotion || null,
    });
  }

  // Link vocabulary to page
  for (const vocab of analysis.vocabulary_in_context || []) {
    if (!vocab.word) continue;
    
    await neo4jSession.run(`
      MATCH (pg:BookPage {id: $pageId})
      MATCH (v:VocabularyWord {book_id: $bookId})
      WHERE toLower(v.word) = toLower($word)
      MERGE (v)-[r:FOUND_ON]->(pg)
      SET r.context_sentence = $context
    `, {
      pageId,
      bookId,
      word: vocab.word,
      context: vocab.context || null,
    });
  }

  // Link plot points to page
  for (const plot of analysis.plot_connections || []) {
    if (!plot.title) continue;
    
    await neo4jSession.run(`
      MATCH (pg:BookPage {id: $pageId})
      MATCH (p:PlotPoint {book_id: $bookId})
      WHERE toLower(p.title) CONTAINS toLower($plotTitle)
         OR toLower($plotTitle) CONTAINS toLower(p.title)
      MERGE (p)-[r:SHOWN_ON]->(pg)
      SET r.relevance = $relevance
    `, {
      pageId,
      bookId,
      plotTitle: plot.title,
      relevance: plot.relevance || null,
    });
  }
}

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

  // Check if user is admin or parent
  const userResult = await pool.query(
    'SELECT role, account_type FROM users WHERE id = $1',
    [session.user.id]
  );
  
  const user = userResult.rows[0];
  if (!user || !['admin', 'parent'].includes(user.role) && user.account_type !== 'parent') {
    return res.status(403).json({ error: 'Admin or parent access required' });
  }

  const { bookId } = req.query;
  const { startPage = 1, endPage, batchSize = 3 } = req.body;

  if (!bookId || typeof bookId !== 'string') {
    return res.status(400).json({ error: 'Book ID required' });
  }

  try {
    // Get book info and page count
    const bookResult = await pool.query(
      'SELECT title, page_count FROM children_books WHERE id = $1',
      [bookId]
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = bookResult.rows[0];
    const maxPage = endPage || book.page_count || 10;

    // Get known characters from Neo4j
    const neo4jSession = driver.session();
    let knownCharacters: string[] = [];

    try {
      const charsResult = await neo4jSession.run(`
        MATCH (c:BookCharacter)-[:APPEARS_IN]->(b:Book {id: $bookId})
        RETURN collect(c.name) as characters
      `, { bookId });

      if (charsResult.records.length > 0) {
        knownCharacters = charsResult.records[0].get('characters').filter((c: any) => c);
      }
    } catch (e) {
      console.log('[Page Analysis] Could not fetch characters:', e);
    }

    const results = {
      bookId,
      bookTitle: book.title,
      pagesAnalyzed: 0,
      pagesFailed: 0,
      errors: [] as string[],
    };

    // Process pages
    for (let page = startPage; page <= maxPage; page += batchSize) {
      const batchEnd = Math.min(page + batchSize - 1, maxPage);
      console.log(`[Page Analysis] Processing pages ${page}-${batchEnd} of ${book.title}`);

      for (let pageNum = page; pageNum <= batchEnd; pageNum++) {
        try {
          // Get page content from database
          const pageResult = await pool.query(
            'SELECT text_content FROM book_pages WHERE book_id = $1 AND page_number = $2',
            [bookId, pageNum]
          );

          const textContent = pageResult.rows[0]?.text_content || '';

          // Analyze with LLM
          const analysis = await analyzePageWithLLM(
            pageNum,
            textContent,
            book.title,
            knownCharacters
          );

          // Create graph nodes
          await createPageNode(bookId, pageNum, analysis, neo4jSession);

          // Update book_pages table
          await pool.query(`
            UPDATE book_pages
            SET page_summary = $1,
                characters_detected = $2,
                vocabulary_words = $3,
                discussion_questions = $4,
                analyzed_at = NOW()
            WHERE book_id = $5 AND page_number = $6
          `, [
            analysis.summary,
            (analysis.characters_on_page || []).map(c => c.name),
            analysis.key_vocabulary || [],
            analysis.reading_questions || [],
            bookId,
            pageNum,
          ]);

          results.pagesAnalyzed++;
        } catch (error) {
          results.pagesFailed++;
          results.errors.push(`Page ${pageNum}: ${String(error)}`);
        }
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await neo4jSession.close();

    return res.status(200).json({
      success: true,
      ...results,
    });

  } catch (error) {
    console.error('[Page Analysis API] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze pages',
      details: String(error),
    });
  }
}
