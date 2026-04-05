import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '@/lib/db/podcast-studio-db';
import crypto from 'crypto';

// Use AI Gateway for all LLM calls
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_KEY = process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

interface ResearchMaterial {
  id: string;
  title: string;
  content?: string;
  metadata?: {
    summary?: string;
    keyPoints?: string[];
    mainThemes?: string[];
  };
}

/**
 * Generate a hash from source material IDs to use as cache key
 */
function generateSourceHash(materials: ResearchMaterial[]): string {
  const sortedIds = materials.map(m => m.id).sort().join('|');
  return crypto.createHash('sha256').update(sortedIds).digest('hex').substring(0, 64);
}

/**
 * Check if cached context exists for these sources
 */
async function getCachedContext(sourceHash: string): Promise<any | null> {
  try {
    const result = await pool.query(
      `SELECT title, combined_summary, key_themes, talking_points, created_at 
       FROM podcast.podcast_context_cache 
       WHERE source_hash = $1`,
      [sourceHash]
    );
    
    if (result.rows.length > 0) {
      const cached = result.rows[0];
      return {
        title: cached.title,
        combinedSummary: cached.combined_summary,
        keyThemes: cached.key_themes || [],
        talkingPoints: cached.talking_points || [],
        cachedAt: cached.created_at,
        fromCache: true
      };
    }
    return null;
  } catch (error) {
    console.warn('⚠️ Cache lookup failed:', error);
    return null;
  }
}

/**
 * Save generated context to cache
 */
async function saveToCache(
  sourceHash: string, 
  materialIds: string[],
  context: { title: string; combinedSummary: string; keyThemes: string[]; talkingPoints: string[] },
  aiModel: string,
  generationTimeMs: number
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO podcast.podcast_context_cache 
       (source_hash, source_material_ids, title, combined_summary, key_themes, talking_points, ai_model, generation_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (source_hash) 
       DO UPDATE SET 
         title = EXCLUDED.title,
         combined_summary = EXCLUDED.combined_summary,
         key_themes = EXCLUDED.key_themes,
         talking_points = EXCLUDED.talking_points,
         ai_model = EXCLUDED.ai_model,
         generation_time_ms = EXCLUDED.generation_time_ms,
         updated_at = NOW()`,
      [
        sourceHash,
        JSON.stringify(materialIds),
        context.title,
        context.combinedSummary,
        JSON.stringify(context.keyThemes),
        JSON.stringify(context.talkingPoints),
        aiModel,
        generationTimeMs
      ]
    );
    console.log('💾 Context saved to cache');
  } catch (error) {
    console.warn('⚠️ Failed to save to cache:', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { materials, forceRegenerate = false } = req.body as { materials: ResearchMaterial[]; forceRegenerate?: boolean };

    if (!materials || materials.length === 0) {
      return res.status(400).json({ error: 'Materials are required' });
    }

    console.log(`🎙️ Podcast context request for ${materials.length} materials`);
    
    // Generate hash from source IDs
    const sourceHash = generateSourceHash(materials);
    console.log(`🔑 Source hash: ${sourceHash.substring(0, 16)}...`);
    
    // Check cache first (unless force regenerate)
    if (!forceRegenerate) {
      const cached = await getCachedContext(sourceHash);
      if (cached) {
        console.log(`✅ Using cached context (generated at ${cached.cachedAt})`);
        return res.json({
          success: true,
          ...cached,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    console.log(`🔄 Generating new context (not in cache or force regenerate)`);
    const startTime = Date.now();

    // Combine all material content and summaries
    const combinedContent = materials.map(m => {
      const summary = m.metadata?.summary || '';
      const keyPoints = m.metadata?.keyPoints?.join('\n- ') || '';
      const themes = m.metadata?.mainThemes?.join(', ') || '';
      
      return `
Title: ${m.title}
Summary: ${summary}
Key Points:
- ${keyPoints}
Themes: ${themes}
      `.trim();
    }).join('\n\n---\n\n');

    console.log(`📚 Sources: ${materials.length}`);
    console.log(`🔌 Using AI Gateway: ${AI_GATEWAY_URL}`);

    // Prepare source content
    const sourceContent = combinedContent;

    // Truncate if too long (keep within token limits)
    const maxContentLength = 8000;
    const truncatedContent = sourceContent.length > maxContentLength 
      ? sourceContent.substring(0, maxContentLength) + '...'
      : sourceContent;

    console.log(`📄 Content length: ${truncatedContent.length} characters`);

    // Call AI Gateway
    const aiResponse = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_GATEWAY_KEY,
      },
      body: JSON.stringify({
        model: 'qwen3-32b',
        messages: [
          {
            role: 'system',
            content: `You are a podcast production assistant. Generate a cohesive podcast context from multiple research materials.

Your task:
1. Create an engaging podcast title (5-10 words)
2. Write a combined summary that synthesizes all materials (3-4 sentences)
3. Identify 3-5 key themes that connect the materials
4. Generate 5-7 talking points for the podcast host

Format your response as JSON:
{
  "title": "Engaging Podcast Title",
  "combinedSummary": "Cohesive summary...",
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "talkingPoints": ["Point 1", "Point 2", "Point 3"]
}

Be creative, engaging, and focus on connections between the materials.`
          },
          {
            role: 'user',
            content: `Generate podcast context from these research materials:\n\n${combinedContent}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ AI Inferencing error:', aiResponse.status, errorData);
      throw new Error(errorData.error || `AI service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantResponse = aiData.choices?.[0]?.message?.content;

    if (!assistantResponse) {
      console.error('Invalid AI response format:', JSON.stringify(aiData, null, 2));
      throw new Error('Invalid AI response format');
    }

    // Parse JSON response
    let parsedResponse;
    try {
      const jsonMatch = assistantResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create basic structure
        parsedResponse = {
          title: `Podcast: ${materials[0].title}${materials.length > 1 ? ' and more' : ''}`,
          combinedSummary: assistantResponse.substring(0, 300),
          keyThemes: materials.flatMap(m => m.metadata?.mainThemes || []).slice(0, 5),
          talkingPoints: materials.flatMap(m => m.metadata?.keyPoints || []).slice(0, 7)
        };
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse AI response, using fallback');
      parsedResponse = {
        title: `Podcast: ${materials[0].title}${materials.length > 1 ? ' and more' : ''}`,
        combinedSummary: assistantResponse.substring(0, 300),
        keyThemes: materials.flatMap(m => m.metadata?.mainThemes || []).slice(0, 5),
        talkingPoints: materials.flatMap(m => m.metadata?.keyPoints || []).slice(0, 7)
      };
    }

    const generationTimeMs = Date.now() - startTime;
    console.log(`✅ Podcast context generated: "${parsedResponse.title}" (${generationTimeMs}ms)`);

    const contextData = {
      title: parsedResponse.title || 'Untitled Podcast',
      combinedSummary: parsedResponse.combinedSummary || '',
      keyThemes: parsedResponse.keyThemes || [],
      talkingPoints: parsedResponse.talkingPoints || [],
    };
    
    // Save to cache for future requests
    await saveToCache(
      sourceHash,
      materials.map(m => m.id),
      contextData,
      'qwen3-32b',
      generationTimeMs
    );

    res.json({
      success: true,
      ...contextData,
      fromCache: false,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Podcast context generation error:', error);

    let errorMessage = 'Failed to generate podcast context';
    let statusCode = 500;

    if (error.code === 'ECONNREFUSED') {
      errorMessage = `AI Gateway is offline (${AI_GATEWAY_URL})`;
      statusCode = 503;
    } else if (error.response?.status === 503) {
      errorMessage = 'AI Gateway is temporarily unavailable';
      statusCode = 503;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. Please try again.';
      statusCode = 408;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
}
