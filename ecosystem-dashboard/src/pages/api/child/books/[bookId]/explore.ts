/**
 * Book Exploration API for Children
 * 
 * Get GraphRAG data for a book - characters, themes, plot, vocabulary.
 * Kid-friendly responses for the book exploration UI.
 * Multi-tenant compliant.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// Neo4j connection for GraphRAG queries
const neo4j = require('neo4j-driver');
const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7688',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { bookId, section } = req.query;
  if (!bookId || typeof bookId !== 'string') {
    return res.status(400).json({ error: 'Book ID required' });
  }

  const userId = (session.user as any).id;

  try {
    // Verify book access
    const bookResult = await pool.query(`
      SELECT * FROM children_books 
      WHERE id = $1 
        AND (assigned_child_id = $2 OR assigned_child_id IS NULL)
        AND security_scan_passed = true
    `, [bookId, userId]);

    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found or not accessible' });
    }

    const book = bookResult.rows[0];

    // Get specific section or overview
    const sectionType = section as string || 'overview';
    
    const neo4jSession = driver.session();
    
    try {
      let data: any = {};

      switch (sectionType) {
        case 'overview':
          data = await getBookOverview(neo4jSession, bookId);
          break;
        case 'characters':
          data = await getCharacters(neo4jSession, bookId);
          break;
        case 'themes':
          data = await getThemes(neo4jSession, bookId);
          break;
        case 'story':
          data = await getPlotPoints(neo4jSession, bookId);
          break;
        case 'vocabulary':
          data = await getVocabulary(neo4jSession, bookId);
          break;
        case 'character-web':
          data = await getCharacterWeb(neo4jSession, bookId);
          break;
        default:
          data = await getBookOverview(neo4jSession, bookId);
      }

      return res.status(200).json({
        success: true,
        book: {
          id: book.id,
          title: book.title,
          series_name: book.series_name,
          author: book.author,
          page_count: book.page_count
        },
        section: sectionType,
        data
      });

    } finally {
      await neo4jSession.close();
    }

  } catch (error) {
    console.error('[Book Explore API] Error:', error);
    return res.status(500).json({ error: 'Failed to get book data' });
  }
}

async function getBookOverview(session: any, bookId: string) {
  const result = await session.run(`
    MATCH (b:Book {id: $bookId})
    OPTIONAL MATCH (c:BookCharacter)-[:APPEARS_IN]->(b)
    OPTIONAL MATCH (t:BookTheme)-[:THEME_OF]->(b)
    OPTIONAL MATCH (p:PlotPoint)-[:PART_OF]->(b)
    OPTIONAL MATCH (v:VocabularyWord)-[:FROM_BOOK]->(b)
    RETURN b.summary as summary,
           count(DISTINCT c) as characterCount,
           count(DISTINCT t) as themeCount,
           count(DISTINCT p) as plotPointCount,
           count(DISTINCT v) as vocabularyCount
  `, { bookId });

  const record = result.records[0];
  if (!record) {
    return { summary: null, stats: {} };
  }

  return {
    summary: record.get('summary'),
    stats: {
      characters: record.get('characterCount').toNumber(),
      themes: record.get('themeCount').toNumber(),
      storyParts: record.get('plotPointCount').toNumber(),
      vocabularyWords: record.get('vocabularyCount').toNumber()
    }
  };
}

async function getCharacters(session: any, bookId: string) {
  const result = await session.run(`
    MATCH (c:BookCharacter)-[:APPEARS_IN]->(b:Book {id: $bookId})
    RETURN c
    ORDER BY 
      CASE c.character_type 
        WHEN 'protagonist' THEN 1 
        WHEN 'supporting' THEN 2 
        WHEN 'friend' THEN 3
        WHEN 'family' THEN 4
        ELSE 5 
      END,
      c.name
  `, { bookId });

  return result.records.map((r: any) => {
    const c = r.get('c').properties;
    return {
      id: c.id,
      name: c.name,
      nickname: c.nickname,
      type: c.character_type,
      description: c.description,
      traits: c.traits || [],
      age: c.age,
      funFact: c.fun_fact
    };
  });
}

async function getThemes(session: any, bookId: string) {
  const result = await session.run(`
    MATCH (t:BookTheme)-[:THEME_OF]->(b:Book {id: $bookId})
    RETURN t
    ORDER BY t.category
  `, { bookId });

  return result.records.map((r: any) => {
    const t = r.get('t').properties;
    return {
      id: t.id,
      category: t.category,
      title: t.title,
      description: t.description,
      lesson: t.lesson,
      discussionQuestions: t.discussion_questions || []
    };
  });
}

async function getPlotPoints(session: any, bookId: string) {
  const result = await session.run(`
    MATCH (p:PlotPoint)-[:PART_OF]->(b:Book {id: $bookId})
    RETURN p
    ORDER BY p.sequence_order
  `, { bookId });

  return result.records.map((r: any) => {
    const p = r.get('p').properties;
    return {
      id: p.id,
      type: p.plot_type,
      title: p.title,
      description: p.description,
      emotions: p.emotions || [],
      pageRange: p.page_range
    };
  });
}

async function getVocabulary(session: any, bookId: string) {
  const result = await session.run(`
    MATCH (v:VocabularyWord)-[:FROM_BOOK]->(b:Book {id: $bookId})
    RETURN v
    ORDER BY v.difficulty, v.word
  `, { bookId });

  return result.records.map((r: any) => {
    const v = r.get('v').properties;
    return {
      id: v.id,
      word: v.word,
      definition: v.definition,
      example: v.example_sentence,
      difficulty: v.difficulty
    };
  });
}

async function getCharacterWeb(session: any, bookId: string) {
  // Get characters as nodes
  const charsResult = await session.run(`
    MATCH (c:BookCharacter)-[:APPEARS_IN]->(b:Book {id: $bookId})
    RETURN c.id as id, c.name as name, c.character_type as type, c.traits as traits
  `, { bookId });

  const nodes = charsResult.records.map((r: any) => ({
    id: r.get('id'),
    name: r.get('name'),
    type: r.get('type'),
    traits: r.get('traits') || []
  }));

  // Get relationships as links
  const relsResult = await session.run(`
    MATCH (c1:BookCharacter)-[r:KNOWS]->(c2:BookCharacter)
    WHERE c1.book_id = $bookId AND c2.book_id = $bookId
    RETURN c1.id as source, c2.id as target, r.type as type, 
           r.description as description, r.is_positive as isPositive
  `, { bookId });

  const links = relsResult.records.map((r: any) => ({
    source: r.get('source'),
    target: r.get('target'),
    type: r.get('type'),
    description: r.get('description'),
    isPositive: r.get('isPositive')
  }));

  return { nodes, links };
}
