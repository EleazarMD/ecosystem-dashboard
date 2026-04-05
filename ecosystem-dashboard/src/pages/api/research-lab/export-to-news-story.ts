/**
 * Export Research to News Story
 * POST /api/research-lab/export-to-news-story
 * 
 * Converts AI Research Studio output into a Daily News Story.
 * This bridges the AI Research Studio with the News Stories pipeline.
 * Based on Chapter 20: Story Generation Architecture & Migration Plan
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

// Category detection keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  science: ['research', 'study', 'scientists', 'discovery', 'quantum', 'physics', 'biology', 'chemistry', 'astronomy', 'neuroscience', 'AI', 'machine learning'],
  business: ['company', 'market', 'investment', 'startup', 'CEO', 'revenue', 'growth', 'strategy', 'leadership', 'management'],
  politics: ['government', 'policy', 'election', 'congress', 'senate', 'legislation', 'diplomacy', 'geopolitics', 'trade'],
  healthcare: ['medical', 'health', 'patient', 'treatment', 'FDA', 'drug', 'vaccine', 'hospital', 'clinical', 'disease'],
  technology: ['software', 'hardware', 'app', 'platform', 'cloud', 'security', 'data', 'tech', 'digital'],
};

// Style guides per category
const STYLE_GUIDES: Record<string, string> = {
  science: 'Quanta Magazine',
  business: 'Harvard Business Review',
  politics: 'The Economist',
  healthcare: 'STAT News',
  technology: 'Ars Technica',
};

interface ExportRequest {
  sessionId: string;
  title: string;
  content: string; // The research report content
  citations?: Array<{
    title: string;
    url: string;
    source?: string;
  }>;
  category?: string; // Optional - will auto-detect if not provided
  generateAudio?: boolean;
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
      sessionId,
      title,
      content,
      citations = [],
      category: providedCategory,
      generateAudio = false,
      publish = false,
    } = req.body as ExportRequest;

    if (!sessionId || !title || !content) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['sessionId', 'title', 'content'],
      });
    }

    console.log(`📰 Converting research to news story: "${title}"`);

    // Step 1: Detect category if not provided
    const category = providedCategory || detectCategory(title + ' ' + content);
    const styleGuide = STYLE_GUIDES[category] || 'General';
    console.log(`📂 Category: ${category} (${styleGuide} style)`);

    // Step 2: Transform research into news story format
    const newsStory = await transformToNewsStory(title, content, category, styleGuide, citations);

    if (!newsStory) {
      return res.status(500).json({
        error: 'Failed to transform research into news story',
      });
    }

    // Step 3: Save to daily_stories table
    const storyId = await saveNewsStory({
      title: newsStory.title,
      headline: newsStory.headline,
      summary: newsStory.summary,
      fullNarrative: newsStory.narrative,
      category,
      styleGuide,
      citations: newsStory.citations,
      researchPackage: {
        sessionId,
        originalTitle: title,
        originalContent: content.substring(0, 5000), // Store first 5000 chars
        transformedAt: new Date().toISOString(),
      },
      wordCount: newsStory.narrative.split(/\s+/).length,
      status: publish ? 'published' : 'ready',
    });

    console.log(`💾 News story saved: ${storyId}`);

    // Step 4: Generate audio if requested
    let audioUrl: string | null = null;
    if (generateAudio) {
      audioUrl = await generateAudioForStory(storyId, newsStory.narrative, category);
    }

    console.log(`✅ Research exported to news story: ${storyId}`);

    return res.status(200).json({
      success: true,
      story: {
        id: storyId,
        title: newsStory.title,
        headline: newsStory.headline,
        summary: newsStory.summary,
        category,
        style_guide: styleGuide,
        word_count: newsStory.narrative.split(/\s+/).length,
        audio_url: audioUrl,
        status: publish ? 'published' : 'ready',
      },
      message: 'Research successfully converted to news story',
    });

  } catch (error) {
    console.error('❌ Export to news story error:', error);
    return res.status(500).json({
      error: 'Failed to export research to news story',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function detectCategory(text: string): string {
  const lowerText = text.toLowerCase();
  let bestCategory = 'technology'; // Default
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(kw => lowerText.includes(kw.toLowerCase())).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

async function transformToNewsStory(
  title: string,
  content: string,
  category: string,
  styleGuide: string,
  citations: Array<{ title: string; url: string; source?: string }>
): Promise<{
  title: string;
  headline: string;
  summary: string;
  narrative: string;
  citations: Array<{ number: number; title: string; url: string; source: string }>;
} | null> {
  const citationsList = citations.map((c, i) => ({
    number: i + 1,
    title: c.title,
    url: c.url,
    source: c.source || new URL(c.url).hostname.replace('www.', ''),
  }));

  const citationsText = citationsList.length > 0
    ? `\n\nCitations:\n${citationsList.map(c => `[${c.number}] ${c.title} - ${c.source}`).join('\n')}`
    : '';

  const prompt = `Transform this research report into a compelling news story in the style of ${styleGuide}.

ORIGINAL RESEARCH:
Title: ${title}

Content:
${content.substring(0, 8000)}
${citationsText}

REQUIREMENTS:
1. Write a compelling headline (different from title)
2. Write a 2-sentence summary
3. Write an 800-1200 word narrative in ${styleGuide} style
4. Use inline citations [1], [2] where appropriate
5. Add original analysis and insights
6. Include a compelling opening hook
7. End with forward-looking implications

Respond in JSON format:
{
  "headline": "Compelling headline here",
  "summary": "Two sentence summary here.",
  "narrative": "Full 800-1200 word story here with [1] citations..."
}`;

  try {
    const response = await fetch(`${AI_GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a senior journalist for ${styleGuide}. Transform research into engaging, well-attributed news stories.`,
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
    const responseContent = data.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title,
        headline: parsed.headline || title,
        summary: parsed.summary || content.substring(0, 200) + '...',
        narrative: parsed.narrative || content,
        citations: citationsList,
      };
    }

    // Fallback if JSON parsing fails
    return {
      title,
      headline: title,
      summary: content.substring(0, 200) + '...',
      narrative: content,
      citations: citationsList,
    };
  } catch (error) {
    console.error('Transform error:', error);
    return null;
  }
}

async function saveNewsStory(story: {
  title: string;
  headline: string;
  summary: string;
  fullNarrative: string;
  category: string;
  styleGuide: string;
  citations: Array<{ number: number; title: string; url: string; source: string }>;
  researchPackage: any;
  wordCount: number;
  status: string;
}): Promise<string> {
  const result = await pool.query(
    `INSERT INTO news.daily_stories 
     (title, headline, summary, full_narrative, category, style_guide, 
      citations, research_package, word_count, reading_time_minutes, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      story.title,
      story.headline,
      story.summary,
      story.fullNarrative,
      story.category,
      story.styleGuide,
      JSON.stringify(story.citations),
      JSON.stringify(story.researchPackage),
      story.wordCount,
      Math.ceil(story.wordCount / 200),
      story.status,
      story.status === 'published' ? new Date() : null,
    ]
  );

  return result.rows[0].id;
}

async function generateAudioForStory(
  storyId: string,
  narrative: string,
  category: string
): Promise<string | null> {
  try {
    const TTS_SERVICE_URL = process.env.TTS_SERVICE_URL || 'http://localhost:5003';
    
    const response = await fetch(`${TTS_SERVICE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: narrative,
        story_id: storyId,
        category,
        voice: 'alloy',
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

      return data.audio_url;
    }
  } catch (error) {
    console.warn('Audio generation failed:', error);
  }

  return null;
}
