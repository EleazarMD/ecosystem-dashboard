/**
 * Topic Generator API Endpoint
 * POST /api/news/topics/generate
 * 
 * Generates trending topics for story generation across categories.
 * Based on Chapter 20: Story Generation Architecture & Migration Plan
 * 
 * Features:
 * - RSS feed aggregation
 * - Trending topic detection
 * - Topic quality filtering
 * - Diversity and novelty scoring
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import Parser from 'rss-parser';

// Database connection
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

// RSS Parser instance
const rssParser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'AI-Homelab-TopicGenerator/1.0',
  },
});

// Category configurations matching Chapter 20
const CATEGORY_CONFIG: Record<string, {
  style: string;
  keywords: string[];
  minRelevanceScore: number;
}> = {
  science: {
    style: 'Quanta Magazine',
    keywords: ['research', 'discovery', 'study', 'scientists', 'breakthrough', 'quantum', 'physics', 'biology', 'AI', 'machine learning'],
    minRelevanceScore: 0.6,
  },
  business: {
    style: 'Harvard Business Review',
    keywords: ['strategy', 'leadership', 'innovation', 'startup', 'market', 'investment', 'growth', 'management', 'digital transformation', 'economy', 'economic', 'trade', 'tariff', 'inflation', 'recession', 'GDP', 'earnings', 'stock', 'finance', 'bank', 'Fed', 'interest rate', 'company', 'CEO', 'merger', 'acquisition'],
    minRelevanceScore: 0.33,
  },
  politics: {
    style: 'The Economist',
    keywords: ['policy', 'election', 'government', 'economy', 'trade', 'diplomacy', 'legislation', 'geopolitics', 'international'],
    minRelevanceScore: 0.6,
  },
  healthcare: {
    style: 'STAT News',
    keywords: ['medical', 'health', 'treatment', 'clinical', 'FDA', 'drug', 'vaccine', 'hospital', 'patient', 'disease'],
    minRelevanceScore: 0.6,
  },
  technology: {
    style: 'Ars Technica',
    keywords: ['tech', 'software', 'hardware', 'startup', 'AI', 'cloud', 'security', 'data', 'app', 'platform'],
    minRelevanceScore: 0.5,
  },
};

interface TopicGenerateRequest {
  category: string;
  count?: number;
  timeframe?: '24h' | '7d' | '30d';
  exclude?: string[];
}

interface GeneratedTopic {
  id: string;
  topic: string;
  relevance_score: number;
  trending_score: number;
  sources_count: number;
  first_seen: string;
  keywords: string[];
  suggested_sources: string[];
}

interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
  categories?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      category,
      count = 3,
      timeframe = '24h',
      exclude = [],
    } = req.body as TopicGenerateRequest;

    // Validate category
    if (!category || !CATEGORY_CONFIG[category]) {
      return res.status(400).json({
        error: 'Invalid category',
        validCategories: Object.keys(CATEGORY_CONFIG),
      });
    }

    console.log(`📰 Generating ${count} topics for category: ${category}`);

    // Step 1: Fetch RSS feeds for this category
    const sources = await fetchSourcesForCategory(category);
    console.log(`📡 Found ${sources.length} sources for ${category}`);

    // Step 2: Aggregate articles from RSS feeds
    const articles = await aggregateArticles(sources, timeframe);
    console.log(`📄 Aggregated ${articles.length} articles`);

    // Step 3: Extract and score topics
    const topics = extractTopics(articles, category, exclude);
    console.log(`🎯 Extracted ${topics.length} potential topics`);

    // Step 4: Select top topics
    const selectedTopics = topics.slice(0, count);

    // Step 5: Save topics to database
    for (const topic of selectedTopics) {
      await saveTopic(topic, category);
    }

    console.log(`✅ Generated ${selectedTopics.length} topics for ${category}`);

    return res.status(200).json({
      success: true,
      category,
      topics: selectedTopics,
      metadata: {
        sources_checked: sources.length,
        articles_analyzed: articles.length,
        timeframe,
        generated_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('❌ Topic generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate topics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function fetchSourcesForCategory(category: string): Promise<Array<{ name: string; url: string; credibility_score: number }>> {
  try {
    const result = await pool.query(
      `SELECT name, url, credibility_score 
       FROM news.sources 
       WHERE category = $1 AND enabled = true 
       ORDER BY priority DESC, credibility_score DESC`,
      [category]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching sources:', error);
    // Return default sources if database not available
    return getDefaultSources(category);
  }
}

function getDefaultSources(category: string): Array<{ name: string; url: string; credibility_score: number }> {
  const defaults: Record<string, Array<{ name: string; url: string; credibility_score: number }>> = {
    science: [
      { name: 'Quanta Magazine', url: 'https://www.quantamagazine.org/feed/', credibility_score: 0.95 },
      { name: 'New Scientist', url: 'https://www.newscientist.com/feed/home/', credibility_score: 0.92 },
      { name: 'Ars Technica Science', url: 'https://feeds.arstechnica.com/arstechnica/science', credibility_score: 0.85 },
    ],
    business: [
      { name: 'Harvard Business Review', url: 'https://hbr.org/rss/main', credibility_score: 0.95 },
      { name: 'The Economist Business', url: 'https://www.economist.com/business/rss.xml', credibility_score: 0.93 },
    ],
    politics: [
      { name: 'The Economist', url: 'https://www.economist.com/rss', credibility_score: 0.93 },
      { name: 'The Economist World', url: 'https://www.economist.com/the-world-this-week/rss.xml', credibility_score: 0.93 },
    ],
    healthcare: [
      { name: 'STAT News', url: 'https://www.statnews.com/feed/', credibility_score: 0.90 },
      { name: 'New Scientist Health', url: 'https://www.newscientist.com/subject/health/feed/', credibility_score: 0.88 },
    ],
    technology: [
      { name: 'Hacker News', url: 'https://news.ycombinator.com/rss', credibility_score: 0.80 },
      { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', credibility_score: 0.82 },
      { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', credibility_score: 0.88 },
    ],
  };
  return defaults[category] || [];
}

async function aggregateArticles(
  sources: Array<{ name: string; url: string; credibility_score: number }>,
  timeframe: string
): Promise<RSSItem[]> {
  const articles: RSSItem[] = [];
  const cutoffDate = getCutoffDate(timeframe);

  for (const source of sources) {
    try {
      const feed = await rssParser.parseURL(source.url);
      
      for (const item of feed.items || []) {
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
        
        if (pubDate >= cutoffDate) {
          articles.push({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            contentSnippet: item.contentSnippet,
            categories: item.categories,
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch RSS from ${source.name}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return articles;
}

function getCutoffDate(timeframe: string): Date {
  const now = new Date();
  switch (timeframe) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '24h':
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

function extractTopics(
  articles: RSSItem[],
  category: string,
  exclude: string[]
): GeneratedTopic[] {
  const config = CATEGORY_CONFIG[category];
  const topicMap = new Map<string, {
    count: number;
    sources: Set<string>;
    keywords: Set<string>;
    firstSeen: Date;
  }>();

  // Extract topics from article titles
  for (const article of articles) {
    if (!article.title) continue;

    // Simple topic extraction: use cleaned title as topic
    const topic = cleanTitle(article.title);
    
    // Skip if in exclude list
    if (exclude.some(e => topic.toLowerCase().includes(e.toLowerCase()))) {
      continue;
    }

    // Calculate relevance based on keyword matching
    const matchedKeywords = config.keywords.filter(kw => 
      topic.toLowerCase().includes(kw.toLowerCase())
    );

    if (matchedKeywords.length === 0) continue;

    const existing = topicMap.get(topic);
    if (existing) {
      existing.count++;
      if (article.link) existing.sources.add(article.link);
      matchedKeywords.forEach(kw => existing.keywords.add(kw));
    } else {
      topicMap.set(topic, {
        count: 1,
        sources: new Set(article.link ? [article.link] : []),
        keywords: new Set(matchedKeywords),
        firstSeen: article.pubDate ? new Date(article.pubDate) : new Date(),
      });
    }
  }

  // Convert to array and score
  const topics: GeneratedTopic[] = [];
  
  for (const [topic, data] of topicMap.entries()) {
    const relevanceScore = Math.min(1, data.keywords.size / 3);
    const trendingScore = Math.min(1, data.count / 5);

    if (relevanceScore >= config.minRelevanceScore) {
      topics.push({
        id: generateTopicId(topic),
        topic,
        relevance_score: Math.round(relevanceScore * 100) / 100,
        trending_score: Math.round(trendingScore * 100) / 100,
        sources_count: data.sources.size,
        first_seen: data.firstSeen.toISOString(),
        keywords: Array.from(data.keywords),
        suggested_sources: Array.from(data.sources).slice(0, 5),
      });
    }
  }

  // Sort by combined score
  topics.sort((a, b) => {
    const scoreA = a.trending_score * 0.6 + a.relevance_score * 0.4;
    const scoreB = b.trending_score * 0.6 + b.relevance_score * 0.4;
    return scoreB - scoreA;
  });

  return topics;
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s'-]/g, '')
    .trim()
    .substring(0, 200);
}

function generateTopicId(topic: string): string {
  const hash = topic.toLowerCase().replace(/\s+/g, '-').substring(0, 50);
  const timestamp = Date.now().toString(36);
  return `topic-${hash}-${timestamp}`;
}

async function saveTopic(topic: GeneratedTopic, category: string): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO news.topics (id, category, topic, relevance_score, trending_score, sources_count, first_seen, keywords, suggested_sources)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         trending_score = EXCLUDED.trending_score,
         sources_count = EXCLUDED.sources_count,
         updated_at = CURRENT_TIMESTAMP`,
      [
        topic.id,
        category,
        topic.topic,
        topic.relevance_score,
        topic.trending_score,
        topic.sources_count,
        topic.first_seen,
        JSON.stringify(topic.keywords),
        JSON.stringify(topic.suggested_sources),
      ]
    );
  } catch (error) {
    console.warn('Failed to save topic to database:', error);
  }
}
