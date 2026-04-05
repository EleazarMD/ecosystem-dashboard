/**
 * AI Research Studio - Article Analysis Endpoint
 * POST /api/news/research/analyze
 * 
 * Fetches full article content using Firecrawl and performs multi-source analysis.
 * Based on Chapter 20: Story Generation Architecture & Migration Plan
 * 
 * Features:
 * - Full article content fetching (not just snippets)
 * - Multi-source analysis (5-10 articles per topic)
 * - Key insight extraction
 * - Quote and statistic extraction
 * - Proper citation generation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

// AI Gateway for LLM analysis
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

// Dedicated Gemini API key for news pipeline (large context window)
const GEMINI_API_KEY = process.env.NEWS_PIPELINE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';
const FIRECRAWL_URL = process.env.FIRECRAWL_URL || 'https://api.firecrawl.dev/v1';
const FIRECRAWL_CONCURRENCY = parseInt(process.env.FIRECRAWL_CONCURRENCY || '2'); // Free tier limit

interface AnalyzeRequest {
  topic: string;
  topic_id?: string;
  category: string;
  sources: string[]; // URLs to analyze
  depth?: 'quick' | 'standard' | 'comprehensive';
}

interface ArticleContent {
  url: string;
  title: string;
  author?: string;
  published_at?: string;
  content: string;
  excerpt: string;
  word_count: number;
  source_name: string;
}

interface ResearchPackage {
  topic: string;
  category: string;
  articles: ArticleContent[];
  key_insights: string[];
  statistics: Array<{ value: string; source: string; context: string }>;
  quotes: Array<{ text: string; speaker: string; source: string }>;
  citations: Array<{
    number: number;
    title: string;
    url: string;
    author?: string;
    source: string;
    accessed_at: string;
  }>;
  analysis_model: string;
  analyzed_at: string;
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
      topic,
      topic_id,
      category,
      sources,
      depth = 'standard',
    } = req.body as AnalyzeRequest;

    if (!topic || !category || !sources || sources.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['topic', 'category', 'sources'],
      });
    }

    console.log(`🔬 Analyzing topic: "${topic}" with ${sources.length} sources`);

    // Determine how many articles to fetch based on depth
    const maxArticles = depth === 'quick' ? 3 : depth === 'comprehensive' ? 10 : 5;
    const sourcesToAnalyze = sources.slice(0, maxArticles);

    // Step 1: Fetch full article content
    const articles = await fetchArticleContents(sourcesToAnalyze);
    console.log(`📄 Fetched ${articles.length} full articles`);

    if (articles.length === 0) {
      return res.status(400).json({
        error: 'No articles could be fetched',
        message: 'All source URLs failed to return content',
      });
    }

    // Step 2: Analyze articles with LLM
    const analysis = await analyzeArticles(topic, category, articles);
    console.log(`🧠 Analysis complete: ${analysis.key_insights.length} insights extracted`);

    // Step 3: Generate citations
    const citations = articles.map((article, index) => ({
      number: index + 1,
      title: article.title,
      url: article.url,
      author: article.author,
      source: article.source_name,
      accessed_at: new Date().toISOString(),
    }));

    // Step 4: Build research package
    const researchPackage: ResearchPackage = {
      topic,
      category,
      articles,
      key_insights: analysis.key_insights,
      statistics: analysis.statistics,
      quotes: analysis.quotes,
      citations,
      analysis_model: 'gemini-2.5-flash',
      analyzed_at: new Date().toISOString(),
    };

    // Step 5: Mark topic as used
    if (topic_id) {
      await markTopicUsed(topic_id);
    }

    console.log(`✅ Research package ready for: "${topic}"`);

    return res.status(200).json({
      success: true,
      research: researchPackage,
      metadata: {
        articles_fetched: articles.length,
        articles_requested: sourcesToAnalyze.length,
        depth,
        processing_time_ms: Date.now(),
      },
    });

  } catch (error) {
    console.error('❌ Research analysis error:', error);
    return res.status(500).json({
      error: 'Failed to analyze articles',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function fetchArticleContents(urls: string[]): Promise<ArticleContent[]> {
  const articles: ArticleContent[] = [];
  
  // Process URLs in batches to respect Firecrawl concurrency limit
  for (let i = 0; i < urls.length; i += FIRECRAWL_CONCURRENCY) {
    const batch = urls.slice(i, i + FIRECRAWL_CONCURRENCY);
    console.log(`📄 Fetching batch ${Math.floor(i / FIRECRAWL_CONCURRENCY) + 1}: ${batch.length} URLs (concurrency: ${FIRECRAWL_CONCURRENCY})`);
    
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        try {
          // Check cache first
          const cached = await getCachedArticle(url);
          if (cached) {
            return cached;
          }

          // Fetch with Firecrawl if API key available
          let content: ArticleContent | null = null;
          
          if (FIRECRAWL_API_KEY) {
            content = await fetchWithFirecrawl(url);
          } else {
            // Fallback: Use simple fetch with readability-like extraction
            content = await fetchWithSimpleExtraction(url);
          }

          if (content) {
            // Cache the result
            await cacheArticle(content);
            return content;
          }
          return null;
        } catch (error) {
          console.warn(`⚠️ Failed to fetch ${url}:`, error instanceof Error ? error.message : 'Unknown error');
          return null;
        }
      })
    );
    
    // Add successful results to articles array
    for (const result of batchResults) {
      if (result) {
        articles.push(result);
      }
    }
    
    // Small delay between batches to be nice to the API
    if (i + FIRECRAWL_CONCURRENCY < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return articles;
}

async function fetchWithFirecrawl(url: string): Promise<ArticleContent | null> {
  try {
    const response = await fetch(`${FIRECRAWL_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.data) {
      return null;
    }

    const content = data.data.markdown || data.data.content || '';
    
    return {
      url,
      title: data.data.metadata?.title || extractTitleFromUrl(url),
      author: data.data.metadata?.author,
      published_at: data.data.metadata?.publishedTime,
      content,
      excerpt: content.substring(0, 500),
      word_count: content.split(/\s+/).length,
      source_name: extractSourceName(url),
    };
  } catch (error) {
    console.warn(`Firecrawl failed for ${url}:`, error);
    return null;
  }
}

async function fetchWithSimpleExtraction(url: string): Promise<ArticleContent | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Homelab-Research/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    
    // Simple extraction: get text content from common article selectors
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : extractTitleFromUrl(url);

    // Extract main content (simplified - in production use readability library)
    const content = extractMainContent(html);
    
    if (!content || content.length < 100) {
      return null;
    }

    return {
      url,
      title,
      content,
      excerpt: content.substring(0, 500),
      word_count: content.split(/\s+/).length,
      source_name: extractSourceName(url),
    };
  } catch (error) {
    return null;
  }
}

function extractMainContent(html: string): string {
  // Remove scripts, styles, and HTML tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Take a reasonable portion
  return text.substring(0, 10000);
}

function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.split('/').filter(Boolean).pop() || '';
    return path.replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
  } catch {
    return 'Unknown Article';
  }
}

function extractSourceName(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown Source';
  }
}

async function getCachedArticle(url: string): Promise<ArticleContent | null> {
  try {
    const urlHash = crypto.createHash('sha256').update(url).digest('hex');
    
    const result = await pool.query(
      `SELECT url, title, author, published_at, content, excerpt, word_count, source_name
       FROM news.article_cache
       WHERE url_hash = $1 AND expires_at > NOW()`,
      [urlHash]
    );

    if (result.rows.length > 0) {
      // Update access count
      await pool.query(
        `UPDATE news.article_cache 
         SET access_count = access_count + 1, last_accessed_at = NOW()
         WHERE url_hash = $1`,
        [urlHash]
      );
      return result.rows[0];
    }
    return null;
  } catch {
    return null;
  }
}

async function cacheArticle(article: ArticleContent): Promise<void> {
  try {
    const urlHash = crypto.createHash('sha256').update(article.url).digest('hex');
    
    await pool.query(
      `INSERT INTO news.article_cache 
       (url, url_hash, title, author, published_at, content, excerpt, word_count, source_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (url) DO UPDATE SET
         content = EXCLUDED.content,
         fetched_at = NOW(),
         expires_at = NOW() + INTERVAL '7 days'`,
      [
        article.url,
        urlHash,
        article.title,
        article.author,
        article.published_at,
        article.content,
        article.excerpt,
        article.word_count,
        article.source_name,
      ]
    );
  } catch (error) {
    console.warn('Failed to cache article:', error);
  }
}

async function analyzeArticles(
  topic: string,
  category: string,
  articles: ArticleContent[]
): Promise<{
  key_insights: string[];
  statistics: Array<{ value: string; source: string; context: string }>;
  quotes: Array<{ text: string; speaker: string; source: string }>;
}> {
  // Prepare article summaries for LLM
  const articleSummaries = articles.map((a, i) => 
    `[${i + 1}] ${a.title} (${a.source_name})\n${a.excerpt}`
  ).join('\n\n');

  const prompt = `Analyze these articles about "${topic}" and extract:

1. KEY INSIGHTS: 5-7 main takeaways that synthesize information across sources
2. STATISTICS: Any specific numbers, percentages, or data points with their sources
3. QUOTES: Notable quotes from experts or officials with attribution

Articles:
${articleSummaries}

Respond in JSON format:
{
  "key_insights": ["insight 1", "insight 2", ...],
  "statistics": [{"value": "50%", "source": "Source Name", "context": "what it means"}],
  "quotes": [{"text": "quote text", "speaker": "Person Name", "source": "Source Name"}]
}`;

  try {
    // Use Gemini Flash for large context window (multiple articles)
    if (GEMINI_API_KEY) {
      const geminiUrl = `${GEMINI_API_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const geminiPrompt = `You are a research analyst extracting key information from news articles. Always respond with valid JSON.\n\n${prompt}`;
      
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    }

    // Fallback to AI Gateway with local model
    const response = await fetch(`${AI_GATEWAY_URL}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'qwen3-32b',
        messages: [
          { role: 'system', content: 'You are a research analyst extracting key information from news articles. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.warn('LLM analysis failed:', error);
  }

  // Fallback: basic extraction
  return {
    key_insights: articles.map(a => `Key point from ${a.source_name}: ${a.title}`),
    statistics: [],
    quotes: [],
  };
}

async function markTopicUsed(topicId: string): Promise<void> {
  try {
    await pool.query(
      `UPDATE news.topics 
       SET last_used = NOW(), usage_count = usage_count + 1
       WHERE id = $1`,
      [topicId]
    );
  } catch (error) {
    console.warn('Failed to mark topic as used:', error);
  }
}
