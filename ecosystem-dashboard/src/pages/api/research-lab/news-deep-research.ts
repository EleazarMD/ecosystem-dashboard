/**
 * News Deep Research API Endpoint
 * POST /api/research-lab/news-deep-research
 * 
 * Triggers Brave API News Deep Research via Goose backend with local Qwen3 32B.
 * This is called when News Story output format is enabled in AI Research Studio.
 * 
 * Flow:
 * 1. Receives topic and category from AI Research Studio
 * 2. Calls Goose backend with News Deep Search recipe
 * 3. Goose uses Brave News API → Firecrawl → Qwen3 32B synthesis
 * 4. Returns synthesized news story with citations
 * 
 * Based on Chapter 20: Story Generation Architecture & Migration Plan
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const GOOSE_BACKEND_URL = process.env.GOOSE_BACKEND_URL || 'http://localhost:8405';
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';

interface NewsDeepResearchRequest {
  topic: string;
  category: 'science' | 'business' | 'politics' | 'healthcare' | 'technology';
  freshness?: '24h' | 'week' | 'month';
  articleCount?: number;
  audienceLevel?: string;
  generateAudio?: boolean;
  saveToDatabase?: boolean;
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
      category = 'technology',
      freshness = '24h',
      articleCount = 5,
      audienceLevel = 'general',
      generateAudio = false,
      saveToDatabase = true,
    } = req.body as NewsDeepResearchRequest;

    if (!topic) {
      return res.status(400).json({
        error: 'Missing required field: topic',
      });
    }

    console.log(`🔬 News Deep Research: "${topic}" (${category})`);

    // Step 1: Call Goose backend with News Deep Search message
    // This triggers the agentic loop with Brave News tools
    const gooseMessage = buildNewsResearchPrompt(topic, category, freshness, articleCount, audienceLevel);
    
    const gooseResponse = await fetch(`${GOOSE_BACKEND_URL}/api/goose/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: 'news-research-agent',
        message: gooseMessage,
        model: 'qwen3-32b',  // Local Qwen3 32B via AI Inferencing
        context: {
          type: 'news-deep-research',
          category,
          freshness,
          articleCount,
        },
        // Enable the Brave News tools
        tools: ['brave__news_search', 'brave__fetch_article', 'brave__synthesize_story', 'brave__news_deep_research'],
      }),
      signal: AbortSignal.timeout(180000), // 3 minute timeout for deep research
    });

    if (!gooseResponse.ok) {
      // Fallback: Call Brave News API directly if Goose backend unavailable
      console.log('⚠️ Goose backend unavailable, using direct API call');
      return await handleDirectBraveResearch(req, res, topic, category, freshness, articleCount);
    }

    const gooseResult = await gooseResponse.json();
    
    // Parse the research result
    let researchData;
    try {
      // Goose returns the story as JSON in the response
      const responseContent = gooseResult.response || gooseResult.content || '';
      const jsonMatch = responseContent.match(/\{[\s\S]*"narrative"[\s\S]*\}/);
      if (jsonMatch) {
        researchData = JSON.parse(jsonMatch[0]);
      } else {
        // If not JSON, treat the whole response as the narrative
        researchData = {
          topic,
          category,
          narrative: responseContent,
          citations: [],
          word_count: responseContent.split(/\s+/).length,
        };
      }
    } catch (parseError) {
      researchData = {
        topic,
        category,
        narrative: gooseResult.response || 'Research completed but parsing failed',
        citations: [],
        word_count: 0,
      };
    }

    // Step 2: Save to database if requested
    let storyId = null;
    if (saveToDatabase && researchData.narrative) {
      storyId = await saveNewsStory(researchData, category, generateAudio);
    }

    console.log(`✅ News Deep Research complete: ${researchData.word_count} words`);

    return res.status(200).json({
      success: true,
      research: {
        topic: researchData.topic || topic,
        category,
        headline: researchData.headline || topic,
        summary: researchData.summary || researchData.narrative?.substring(0, 200) + '...',
        narrative: researchData.narrative,
        citations: researchData.citations || [],
        style_guide: researchData.style_guide || getStyleGuide(category),
        word_count: researchData.word_count || 0,
        story_id: storyId,
      },
      metadata: {
        model: 'qwen3-32b',
        tools_used: gooseResult.tools_used || ['brave__news_deep_research'],
        iterations: gooseResult.iterations || 1,
        freshness,
        article_count: articleCount,
      },
    });

  } catch (error) {
    console.error('❌ News Deep Research error:', error);
    return res.status(500).json({
      error: 'News Deep Research failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function buildNewsResearchPrompt(
  topic: string,
  category: string,
  freshness: string,
  articleCount: number,
  audienceLevel: string
): string {
  const styleGuide = getStyleGuide(category);
  
  return `You are a senior news researcher. Your task is to create a comprehensive news story about: "${topic}"

INSTRUCTIONS:
1. Use the brave__news_deep_research tool to search for and synthesize news articles
2. The tool will:
   - Search Brave News API for recent articles (freshness: ${freshness})
   - Fetch full content from top ${articleCount} articles
   - Synthesize an original ${styleGuide}-style news story

PARAMETERS:
- Topic: ${topic}
- Category: ${category}
- Style Guide: ${styleGuide}
- Target Audience: ${audienceLevel}
- Freshness: ${freshness}
- Article Count: ${articleCount}

Call the brave__news_deep_research tool now with these parameters and return the synthesized story.`;
}

function getStyleGuide(category: string): string {
  const guides: Record<string, string> = {
    science: 'Quanta Magazine',
    business: 'Harvard Business Review',
    politics: 'The Economist',
    healthcare: 'STAT News',
    technology: 'Ars Technica',
  };
  return guides[category] || 'General';
}

async function handleDirectBraveResearch(
  req: NextApiRequest,
  res: NextApiResponse,
  topic: string,
  category: string,
  freshness: string,
  articleCount: number
) {
  // Direct fallback using internal API
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003';
    
    // Use the existing news pipeline
    const pipelineResponse = await fetch(`${baseUrl}/api/news/pipeline/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        count: 1,
        generate_audio: false,
        publish: false,
        depth: 'standard',
      }),
    });

    if (pipelineResponse.ok) {
      const pipelineResult = await pipelineResponse.json();
      return res.status(200).json({
        success: true,
        research: pipelineResult.results?.[0] || {},
        metadata: {
          model: 'fallback-pipeline',
          fallback: true,
        },
      });
    }

    throw new Error('Pipeline fallback also failed');
  } catch (fallbackError) {
    return res.status(500).json({
      error: 'News research failed',
      message: 'Both Goose backend and fallback pipeline unavailable',
    });
  }
}

async function saveNewsStory(
  researchData: any,
  category: string,
  generateAudio: boolean
): Promise<string | null> {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME || 'ecosystem_unified',
      user: process.env.DATABASE_USER || 'eleazar',
      password: process.env.DATABASE_PASSWORD || '',
    });

    const result = await pool.query(
      `INSERT INTO news.daily_stories 
       (title, headline, summary, full_narrative, category, style_guide, 
        citations, word_count, reading_time_minutes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ready')
       RETURNING id`,
      [
        researchData.topic,
        researchData.headline || researchData.topic,
        researchData.summary || researchData.narrative?.substring(0, 200) + '...',
        researchData.narrative,
        category,
        researchData.style_guide || getStyleGuide(category),
        JSON.stringify(researchData.citations || []),
        researchData.word_count || 0,
        Math.ceil((researchData.word_count || 0) / 200),
      ]
    );

    await pool.end();
    return result.rows[0]?.id || null;
  } catch (dbError) {
    console.error('Failed to save news story:', dbError);
    return null;
  }
}
