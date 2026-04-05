/**
 * Book Chat API for Children's Reading Buddy
 * 
 * Routes through the child's GooseMind agent for personalized, character-driven responses.
 * Fetches book context from GraphRAG and page content from database.
 * Includes content safety filtering via GooseMind middleware.
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

// Determine action from message content
function detectAction(message: string): 'explain-page' | 'vocabulary' | 'quiz' | 'characters' | 'chat' {
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('explain') || lowerMsg.includes("what's happening") || lowerMsg.includes('what is happening')) {
    return 'explain-page';
  }
  if (lowerMsg.includes('word') || lowerMsg.includes('vocabulary') || lowerMsg.includes('new words')) {
    return 'vocabulary';
  }
  if (lowerMsg.includes('quiz') || lowerMsg.includes('test me') || lowerMsg.includes('question')) {
    return 'quiz';
  }
  if (lowerMsg.includes('character') || lowerMsg.includes('who is') || lowerMsg.includes('who are')) {
    return 'characters';
  }
  return 'chat';
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

  const { message, bookId, bookTitle, currentPage, totalPages, action: explicitAction } = req.body;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message required' });
  }

  const isPageMode = currentPage && totalPages;
  const action = explicitAction || detectAction(message);

  // Variables to store book metadata for GooseMind
  let summary: string | null = null;
  let characters: string[] = [];
  let themes: string[] = [];
  let pageContent: string = '';

  try {
    // Get book context from GraphRAG if bookId provided
    let bookContext = '';
    if (bookId) {
      const neo4jSession = driver.session();
      try {
        const result = await neo4jSession.run(`
          MATCH (b:Book {id: $bookId})
          OPTIONAL MATCH (c:BookCharacter)-[:APPEARS_IN]->(b)
          OPTIONAL MATCH (t:BookTheme)-[:THEME_OF]->(b)
          OPTIONAL MATCH (p:PlotPoint)-[:PART_OF]->(b)
          RETURN b.summary as summary,
                 collect(DISTINCT c.name)[0..5] as characters,
                 collect(DISTINCT t.title)[0..3] as themes,
                 collect(DISTINCT p.title)[0..3] as plotPoints
        `, { bookId });

        const record = result.records[0];
        if (record) {
          summary = record.get('summary');
          characters = record.get('characters').filter((c: any) => c);
          themes = record.get('themes').filter((t: any) => t);
          const plotPoints = record.get('plotPoints').filter((p: any) => p);

          bookContext = `
Book: ${bookTitle}
Summary: ${summary || 'A wonderful story for young readers'}
Main Characters: ${characters.join(', ') || 'Various characters'}
Themes: ${themes.join(', ') || 'Adventure and learning'}
Story Parts: ${plotPoints.join(', ') || 'An exciting journey'}
`;

          // Add page context if in page-reading mode
          if (isPageMode) {
            bookContext += `\nCurrent Reading Position: Page ${currentPage} of ${totalPages}`;
          }
        }
        // Get PAGE-LEVEL GraphRAG data if in page mode
        if (isPageMode && currentPage) {
          const pageId = `${bookId}_page_${currentPage}`;
          
          // Get page node with analysis
          const pageResult = await neo4jSession.run(`
            MATCH (pg:BookPage {id: $pageId})
            RETURN pg.summary as pageSummary, pg.scene_description as scene,
                   pg.dialogue_summary as dialogue, pg.key_vocabulary as vocabulary,
                   pg.reading_questions as questions, pg.narrative_moment as moment
          `, { pageId });
          
          const pageRecord = pageResult.records[0];
          if (pageRecord) {
            const pageSummary = pageRecord.get('pageSummary');
            const scene = pageRecord.get('scene');
            if (pageSummary) {
              pageContent += `\n\n[Page Analysis]\nSummary: ${pageSummary}`;
            }
            if (scene) {
              pageContent += `\nScene: ${scene}`;
            }
          }
          
          // Get characters appearing on THIS page with their actions
          const pageCharsResult = await neo4jSession.run(`
            MATCH (c:BookCharacter)-[r:APPEARS_ON]->(pg:BookPage {id: $pageId})
            RETURN c.name as name, r.action as action, r.dialogue as dialogue, r.emotion as emotion
          `, { pageId });
          
          if (pageCharsResult.records.length > 0) {
            const pageChars = pageCharsResult.records.map((r: any) => {
              const name = r.get('name');
              const action = r.get('action');
              const emotion = r.get('emotion');
              return `${name}${action ? ` (${action})` : ''}${emotion ? ` - feeling ${emotion}` : ''}`;
            });
            pageContent += `\n\n[Characters on this page]: ${pageChars.join('; ')}`;
          }
          
          // Get vocabulary words on THIS page
          const pageVocabResult = await neo4jSession.run(`
            MATCH (v:VocabularyWord)-[r:FOUND_ON]->(pg:BookPage {id: $pageId})
            RETURN v.word as word, v.definition as definition, r.context_sentence as context
          `, { pageId });
          
          if (pageVocabResult.records.length > 0) {
            const vocabList = pageVocabResult.records.map((r: any) => {
              const word = r.get('word');
              const definition = r.get('definition');
              return `${word}: ${definition}`;
            });
            pageContent += `\n\n[Vocabulary on this page]: ${vocabList.join('; ')}`;
          }
          
          // Get plot points related to THIS page
          const pagePlotResult = await neo4jSession.run(`
            MATCH (p:PlotPoint)-[r:SHOWN_ON]->(pg:BookPage {id: $pageId})
            RETURN p.title as title, p.description as description
          `, { pageId });
          
          if (pagePlotResult.records.length > 0) {
            const plotList = pagePlotResult.records.map((r: any) => r.get('title'));
            pageContent += `\n\n[Story moment]: ${plotList.join(', ')}`;
          }
        }
      } finally {
        await neo4jSession.close();
      }
    }

    // Fetch page content AND page analysis from database if in page mode
    if (isPageMode && bookId) {
      try {
        const pageResult = await pool.query(
          `SELECT text_content, image_descriptions, characters_detected,
                  page_summary, vocabulary_words, discussion_questions
           FROM book_pages 
           WHERE book_id = $1 AND page_number = $2`,
          [bookId, currentPage]
        );
        
        if (pageResult.rows.length > 0) {
          const page = pageResult.rows[0];
          
          // Use pre-analyzed page summary if available (from page-level GraphRAG)
          if (page.page_summary) {
            pageContent = `\n\n[Page ${currentPage} Analysis]\nSummary: ${page.page_summary}`;
          } else if (page.text_content) {
            pageContent = `\n\nPage ${currentPage} Content:\n${page.text_content}`;
          }
          
          if (page.image_descriptions?.length > 0) {
            pageContent += `\n\nWhat's shown on this page: ${page.image_descriptions.join(', ')}`;
          }
          if (page.characters_detected?.length > 0) {
            pageContent += `\nCharacters on this page: ${page.characters_detected.join(', ')}`;
          }
          if (page.vocabulary_words?.length > 0) {
            pageContent += `\nKey vocabulary: ${page.vocabulary_words.join(', ')}`;
          }
          if (page.discussion_questions?.length > 0) {
            pageContent += `\nDiscussion questions: ${page.discussion_questions.join('; ')}`;
          }
        }
      } catch (e) {
        console.log('[Book Chat] Could not fetch page content:', e);
      }
    }

    // Route through GooseMind for personalized, character-driven responses
    // This uses the child's assigned character and applies content safety
    // ALWAYS use localhost for internal server-to-server calls to avoid network issues
    const gooseMindUrl = 'http://localhost:3000/api/child/goosemind/chat';
    
    // Build bookReaderMode payload for GooseMind
    const bookReaderMode = {
      enabled: true,
      action: action,
      bookId: bookId,
      bookTitle: bookTitle,
      currentPage: currentPage || 1,
      totalPages: totalPages || 1,
      pageContent: pageContent || undefined,
      characters: characters.length > 0 ? characters : undefined,
      themes: themes.length > 0 ? themes : undefined,
      summary: summary || undefined,
    };

    // Forward cookies for session authentication
    console.log('[Book Chat] Calling GooseMind at:', gooseMindUrl);
    console.log('[Book Chat] Book context:', { bookId, bookTitle, currentPage, action, hasPageContent: !!pageContent });
    
    const response = await fetch(gooseMindUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: JSON.stringify({
        message,
        bookReaderMode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Book Chat] GooseMind error:', response.status, errorText);
      throw new Error(`GooseMind request failed: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    let aiResponse = data.response || data.message || "I'm not sure how to answer that. Can you ask me something else about the book? 📚";

    return res.status(200).json({
      success: true,
      response: aiResponse.trim(),
      blocked: false,
    });

  } catch (error) {
    console.error('[Book Chat API] Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'AI service temporarily unavailable. Please try again.',
    });
  }
}
