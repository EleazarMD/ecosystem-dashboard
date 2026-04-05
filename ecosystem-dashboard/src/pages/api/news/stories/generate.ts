/**
 * Podcast Studio - Story Synthesis Endpoint
 * POST /api/news/stories/generate
 * 
 * Synthesizes a news story from research package with proper attribution.
 * Based on Chapter 20: Story Generation Architecture & Migration Plan
 * 
 * Features:
 * - Category-specific style guides (Quanta, HBR, Economist)
 * - Inline citations throughout narrative
 * - Transformative content (fair use)
 * - Audio generation integration
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
const TTS_SERVICE_URL = process.env.TTS_SERVICE_URL || 'http://localhost:5003';

// Dedicated Gemini API key for news pipeline (large context window)
const GEMINI_API_KEY = process.env.NEWS_PIPELINE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Strip <think>...</think> tags from LLM output (Qwen3 thinking mode)
function stripThinkingOutput(text: string): string {
  if (!text) return text;
  // Remove <think>...</think> blocks (including multiline)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Also handle unclosed <think> tags at the start
  cleaned = cleaned.replace(/^<think>[\s\S]*$/gi, '');
  // Trim leading/trailing whitespace
  return cleaned.trim();
}

// Style guides per category (from Chapter 20)
const STYLE_GUIDES: Record<string, {
  name: string;
  tone: string;
  structure: string;
  wordCount: { min: number; max: number };
}> = {
  science: {
    name: 'Quanta Magazine',
    tone: 'Intellectually curious, accessible yet rigorous. Explain complex concepts clearly without dumbing down.',
    structure: 'Lead with the breakthrough, explain the science, discuss implications, quote researchers.',
    wordCount: { min: 800, max: 1200 },
  },
  business: {
    name: 'Harvard Business Review',
    tone: 'Authoritative, practical, evidence-based. Focus on actionable insights for leaders.',
    structure: 'Start with the business challenge, present data, offer frameworks, conclude with recommendations.',
    wordCount: { min: 800, max: 1200 },
  },
  politics: {
    name: 'The Economist',
    tone: 'Analytical, balanced, globally-minded. Present multiple perspectives with clear reasoning.',
    structure: 'Context first, then analysis, consider counterarguments, end with outlook.',
    wordCount: { min: 800, max: 1200 },
  },
  healthcare: {
    name: 'STAT News',
    tone: 'Clear, accurate, patient-focused. Balance scientific rigor with accessibility.',
    structure: 'Lead with patient impact, explain the science, quote experts, discuss next steps.',
    wordCount: { min: 800, max: 1200 },
  },
  technology: {
    name: 'Ars Technica',
    tone: 'Technical but accessible, enthusiastic about innovation, skeptical of hype.',
    structure: 'Hook with the tech, deep dive into how it works, discuss implications and limitations.',
    wordCount: { min: 800, max: 1200 },
  },
};

interface ResearchPackage {
  topic: string;
  category: string;
  articles: Array<{
    url: string;
    title: string;
    author?: string;
    content: string;
    source_name: string;
  }>;
  key_insights: string[];
  statistics: Array<{ value: string; source: string; context: string }>;
  quotes: Array<{ text: string; speaker: string; source: string }>;
  citations: Array<{
    number: number;
    title: string;
    url: string;
    author?: string;
    source: string;
  }>;
}

interface GenerateStoryRequest {
  research: ResearchPackage;
  topic_id?: string;
  generate_audio?: boolean;
  publish?: boolean;
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
      research,
      topic_id,
      generate_audio = false,
      publish = false,
    } = req.body as GenerateStoryRequest;

    if (!research || !research.topic || !research.category) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['research.topic', 'research.category'],
      });
    }

    const { topic, category, articles, key_insights, statistics, quotes, citations } = research;
    const styleGuide = STYLE_GUIDES[category] || STYLE_GUIDES.technology;

    console.log(`📝 Synthesizing story: "${topic}" in ${styleGuide.name} style`);

    // Step 1: Generate the narrative with LLM
    const narrative = await synthesizeNarrative(
      topic,
      category,
      styleGuide,
      articles,
      key_insights,
      statistics,
      quotes,
      citations
    );

    if (!narrative) {
      return res.status(500).json({
        error: 'Failed to synthesize narrative',
        message: 'LLM did not return a valid story',
      });
    }

    console.log(`✍️ Generated ${narrative.split(/\s+/).length} word narrative`);

    // Step 2: Generate headline and summary
    const { headline, summary } = await generateHeadlineAndSummary(topic, narrative);

    // Step 3: Calculate metrics
    const wordCount = narrative.split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    // Step 4: Save to database
    // topic_id may be a slug string, not a UUID - only use if valid UUID
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topic_id || '');
    
    const storyId = await saveStory({
      topic_id: isValidUUID ? topic_id : null,
      category,
      title: topic,
      headline,
      summary,
      full_narrative: narrative,
      research_package: research,
      citations,
      style_guide: styleGuide.name,
      word_count: wordCount,
      reading_time_minutes: readingTimeMinutes,
      status: publish ? 'published' : 'ready',
    });

    console.log(`💾 Story saved with ID: ${storyId}`);

    // Step 5: Generate audio if requested
    let audioUrl: string | null = null;
    let audioDuration: number | null = null;

    if (generate_audio) {
      const audioResult = await generateAudio(storyId, narrative, category);
      if (audioResult) {
        audioUrl = audioResult.url;
        audioDuration = audioResult.duration;
        console.log(`🔊 Audio generated: ${audioDuration}s`);
      }
    }

    console.log(`✅ Story generation complete: "${topic}"`);

    return res.status(200).json({
      success: true,
      story: {
        id: storyId,
        title: topic,
        headline,
        summary,
        full_narrative: narrative,
        category,
        style_guide: styleGuide.name,
        word_count: wordCount,
        reading_time_minutes: readingTimeMinutes,
        citations,
        audio_url: audioUrl,
        audio_duration_seconds: audioDuration,
        status: publish ? 'published' : 'ready',
        created_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('❌ Story generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate story',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function synthesizeNarrative(
  topic: string,
  category: string,
  styleGuide: typeof STYLE_GUIDES[string],
  articles: ResearchPackage['articles'],
  keyInsights: string[],
  statistics: ResearchPackage['statistics'],
  quotes: ResearchPackage['quotes'],
  citations: ResearchPackage['citations']
): Promise<string | null> {
  // Build context from research
  const articleContext = articles.map((a, i) => 
    `[${i + 1}] "${a.title}" - ${a.source_name}\n${a.content.substring(0, 1000)}`
  ).join('\n\n');

  const insightsContext = keyInsights.length > 0 
    ? `Key Insights:\n${keyInsights.map((i, idx) => `- ${i}`).join('\n')}`
    : '';

  const statsContext = statistics.length > 0
    ? `Statistics:\n${statistics.map(s => `- ${s.value}: ${s.context} (${s.source})`).join('\n')}`
    : '';

  const quotesContext = quotes.length > 0
    ? `Expert Quotes:\n${quotes.map(q => `- "${q.text}" - ${q.speaker}, ${q.source}`).join('\n')}`
    : '';

  const citationsList = citations.map(c => 
    `[${c.number}] ${c.title} - ${c.source} (${c.url})`
  ).join('\n');

  const prompt = `You are a senior journalist writing for ${styleGuide.name}. 

TOPIC: ${topic}
CATEGORY: ${category}

STYLE GUIDE:
- Tone: ${styleGuide.tone}
- Structure: ${styleGuide.structure}
- Target length: ${styleGuide.wordCount.min}-${styleGuide.wordCount.max} words

SOURCE MATERIAL:
${articleContext}

${insightsContext}

${statsContext}

${quotesContext}

CITATIONS (use inline references like [1], [2]):
${citationsList}

REQUIREMENTS:
1. Write an original, transformative narrative that synthesizes insights from multiple sources
2. Use inline citations [1], [2], etc. when referencing specific facts or quotes
3. Add your own analysis and connections between sources
4. Follow the ${styleGuide.name} style guide
5. Include a compelling opening hook
6. End with forward-looking implications or next steps
7. Do NOT copy text verbatim - synthesize and transform
8. Target ${styleGuide.wordCount.min}-${styleGuide.wordCount.max} words

Write the story now:`;

  try {
    // Use Gemini Flash for large context window (research packages can be large)
    if (GEMINI_API_KEY) {
      const geminiUrl = `${GEMINI_API_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a senior journalist for ${styleGuide.name}. Write engaging, well-researched articles with proper attribution.\n\n${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 3000,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
      return rawText ? stripThinkingOutput(rawText) : null;
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
          { 
            role: 'system', 
            content: `You are a senior journalist for ${styleGuide.name}. Write engaging, well-researched articles with proper attribution.` 
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || null;
    return rawText ? stripThinkingOutput(rawText) : null;
  } catch (error) {
    console.error('Narrative synthesis failed:', error);
    return null;
  }
}

async function generateHeadlineAndSummary(
  topic: string,
  narrative: string
): Promise<{ headline: string; summary: string }> {
  const prompt = `Generate a compelling headline and 2-sentence summary for this article. Respond ONLY with valid JSON: {"headline": "...", "summary": "..."}\n\nTopic: ${topic}\n\nArticle:\n${narrative.substring(0, 2000)}`;
  
  try {
    // Use Gemini Flash
    if (GEMINI_API_KEY) {
      const geminiUrl = `${GEMINI_API_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 200 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        // Strip thinking output before parsing JSON
        const content = stripThinkingOutput(rawContent);
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    }

    // Fallback to AI Gateway
    const response = await fetch(`${AI_GATEWAY_URL}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'qwen3-32b',
        messages: [
          { role: 'system', content: 'Generate a compelling headline and 2-sentence summary. Respond in JSON: {"headline": "...", "summary": "..."}' },
          { role: 'user', content: `Topic: ${topic}\n\nArticle:\n${narrative.substring(0, 2000)}` },
        ],
        temperature: 0.5,
        max_tokens: 200,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '';
      // Strip thinking output before parsing JSON
      const content = stripThinkingOutput(rawContent);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    console.warn('Headline generation failed:', error);
  }

  // Fallback
  return {
    headline: topic,
    summary: narrative.substring(0, 200) + '...',
  };
}

async function saveStory(story: {
  topic_id?: string;
  category: string;
  title: string;
  headline: string;
  summary: string;
  full_narrative: string;
  research_package: ResearchPackage;
  citations: ResearchPackage['citations'];
  style_guide: string;
  word_count: number;
  reading_time_minutes: number;
  status: string;
}): Promise<string> {
  const result = await pool.query(
    `INSERT INTO news.daily_stories 
     (topic_id, category, title, headline, summary, full_narrative, 
      research_package, citations, style_guide, word_count, 
      reading_time_minutes, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id`,
    [
      story.topic_id,
      story.category,
      story.title,
      story.headline,
      story.summary,
      story.full_narrative,
      JSON.stringify(story.research_package),
      JSON.stringify(story.citations),
      story.style_guide,
      story.word_count,
      story.reading_time_minutes,
      story.status,
      story.status === 'published' ? new Date() : null,
    ]
  );

  return result.rows[0].id;
}

async function generateAudio(
  storyId: string,
  narrative: string,
  category: string
): Promise<{ url: string; duration: number } | null> {
  try {
    const response = await fetch(`${TTS_SERVICE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: narrative,
        story_id: storyId,
        category,
        voice: 'alloy', // Default voice
        speed: 1.0,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      
      // Update story with audio info
      await pool.query(
        `UPDATE news.daily_stories 
         SET audio_generated = true, audio_url = $1, audio_duration_seconds = $2
         WHERE id = $3`,
        [data.audio_url, data.duration, storyId]
      );

      return {
        url: data.audio_url,
        duration: data.duration,
      };
    }
  } catch (error) {
    console.warn('Audio generation failed:', error);
  }

  return null;
}
