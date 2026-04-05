/**
 * Story Generation Pipeline Orchestrator
 * POST /api/news/pipeline/run
 * 
 * Orchestrates the complete story generation pipeline:
 * 1. Topic Generator → 2. AI Research Studio → 3. Podcast Studio → 4. Database
 * 
 * Based on Chapter 20: Story Generation Architecture & Migration Plan
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// Use localhost for internal API calls (NEXT_PUBLIC_BASE_URL may be external hostname)
const BASE_URL = process.env.INTERNAL_API_URL || 'http://localhost:8404';

interface PipelineRequest {
  category: string;
  count?: number;
  generate_audio?: boolean;
  publish?: boolean;
  depth?: 'quick' | 'standard' | 'comprehensive';
}

interface PipelineResult {
  topic: string;
  story_id?: string;
  status: 'success' | 'failed';
  error?: string;
  audio_url?: string;
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
      count = 1,
      generate_audio = false,
      publish = false,
      depth = 'standard',
    } = req.body as PipelineRequest;

    if (!category) {
      return res.status(400).json({
        error: 'Category required',
        validCategories: ['science', 'business', 'politics', 'healthcare', 'technology'],
      });
    }

    console.log(`🚀 Starting pipeline for ${count} ${category} stories`);
    const startTime = Date.now();
    const results: PipelineResult[] = [];

    // Step 1: Generate topics
    console.log('📰 Step 1: Generating topics...');
    const topicsResponse = await fetch(`${BASE_URL}/api/news/topics/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        count,
        timeframe: '24h',
      }),
    });

    if (!topicsResponse.ok) {
      const error = await topicsResponse.json();
      return res.status(500).json({
        error: 'Topic generation failed',
        details: error,
      });
    }

    const topicsData = await topicsResponse.json();
    const topics = topicsData.topics || [];

    if (topics.length === 0) {
      return res.status(400).json({
        error: 'No topics generated',
        message: 'Could not find trending topics for this category',
      });
    }

    console.log(`✅ Generated ${topics.length} topics`);

    // Process each topic through the pipeline
    for (const topic of topics) {
      console.log(`\n📝 Processing: "${topic.topic}"`);
      
      try {
        // Step 2: Research and analyze
        console.log('🔬 Step 2: Analyzing articles...');
        const researchResponse = await fetch(`${BASE_URL}/api/news/research/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topic.topic,
            topic_id: topic.id,
            category,
            sources: topic.suggested_sources || [],
            depth,
          }),
        });

        if (!researchResponse.ok) {
          const error = await researchResponse.json();
          results.push({
            topic: topic.topic,
            status: 'failed',
            error: `Research failed: ${error.message || error.error}`,
          });
          continue;
        }

        const researchData = await researchResponse.json();
        console.log(`✅ Research complete: ${researchData.research?.articles?.length || 0} articles`);

        // Step 3: Generate story
        console.log('✍️ Step 3: Synthesizing story...');
        const storyResponse = await fetch(`${BASE_URL}/api/news/stories/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            research: researchData.research,
            topic_id: topic.id,
            generate_audio,
            publish,
          }),
        });

        if (!storyResponse.ok) {
          const error = await storyResponse.json();
          results.push({
            topic: topic.topic,
            status: 'failed',
            error: `Story generation failed: ${error.message || error.error}`,
          });
          continue;
        }

        const storyData = await storyResponse.json();
        console.log(`✅ Story generated: ${storyData.story?.word_count} words`);

        // Step 4: Generate audio if requested
        let audioUrl = storyData.story?.audio_url;
        if (generate_audio && storyData.story?.id && !audioUrl) {
          console.log('🎙️ Step 4: Generating audio...');
          try {
            const audioResponse = await fetch(`${BASE_URL}/api/news/stories/${storyData.story.id}/generate-audio`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}), // Voice auto-selected based on category
            });

            if (audioResponse.ok) {
              const audioData = await audioResponse.json();
              audioUrl = audioData.audioUrl;
              console.log(`✅ Audio generated: ${audioData.durationSeconds}s (${audioData.voiceId})`);
            } else {
              console.error('⚠️ Audio generation failed, but story was created');
            }
          } catch (audioError) {
            console.error('⚠️ Audio generation error:', audioError);
          }
        }

        results.push({
          topic: topic.topic,
          story_id: storyData.story?.id,
          status: 'success',
          audio_url: audioUrl,
        });

      } catch (error) {
        console.error(`❌ Pipeline error for "${topic.topic}":`, error);
        results.push({
          topic: topic.topic,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'success').length;

    console.log(`\n🏁 Pipeline complete: ${successCount}/${results.length} stories in ${duration}ms`);

    return res.status(200).json({
      success: true,
      category,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
        duration_ms: duration,
      },
    });

  } catch (error) {
    console.error('❌ Pipeline orchestration error:', error);
    return res.status(500).json({
      error: 'Pipeline failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
