/**
 * Complete Single Story Generation Endpoint
 * POST /api/news/stories/generate-complete
 * 
 * Generates a complete news story with all assets:
 * - Text (narrative, headline, summary)
 * - Audio (TTS narration)
 * - Image (cover image)
 * - Metadata (citations, word count, reading time)
 * 
 * This is the single-story equivalent of the batch pipeline.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const BASE_URL = process.env.INTERNAL_API_URL || 'http://localhost:8404';

interface GenerateCompleteRequest {
  topic: string;
  category: string;
  sources?: string[];
  depth?: 'quick' | 'standard' | 'comprehensive';
  generate_audio?: boolean;
  generate_image?: boolean;
  verify?: boolean;
  publish?: boolean;
  voice?: string;
}

interface GenerateCompleteResponse {
  success: boolean;
  story: {
    id: string;
    title: string;
    headline: string;
    summary: string;
    category: string;
    word_count: number;
    reading_time_minutes: number;
    audio_url?: string;
    audio_duration_seconds?: number;
    voice_id?: string;
    image_url?: string;
    verification_status?: string;
    status: string;
    created_at: string;
  };
  generation_steps: {
    step: string;
    status: 'success' | 'failed' | 'skipped';
    duration_ms: number;
    error?: string;
  }[];
  total_duration_ms: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateCompleteResponse | { error: string; message?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    topic,
    category,
    sources = [],
    depth = 'standard',
    generate_audio = true,
    generate_image = true,
    verify = false,
    publish = true,
    voice,
  } = req.body as GenerateCompleteRequest;

  if (!topic || !category) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'topic and category are required',
    });
  }

  const startTime = Date.now();
  const steps: GenerateCompleteResponse['generation_steps'] = [];
  let storyId: string | null = null;
  let storyData: any = null;

  console.log(`🚀 Starting complete story generation for: "${topic}"`);

  try {
    // Step 1: Research and analyze sources
    const researchStart = Date.now();
    console.log('🔬 Step 1: Researching topic...');
    
    let researchData: any = null;
    
    if (sources.length > 0) {
      const researchResponse = await fetch(`${BASE_URL}/api/news/research/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          category,
          sources,
          depth,
        }),
      });

      if (researchResponse.ok) {
        researchData = await researchResponse.json();
        steps.push({
          step: 'research',
          status: 'success',
          duration_ms: Date.now() - researchStart,
        });
        console.log(`✅ Research complete: ${researchData.research?.articles?.length || 0} articles`);
      } else {
        const error = await researchResponse.text();
        steps.push({
          step: 'research',
          status: 'failed',
          duration_ms: Date.now() - researchStart,
          error,
        });
        console.error('❌ Research failed:', error);
      }
    } else {
      steps.push({
        step: 'research',
        status: 'skipped',
        duration_ms: 0,
      });
      console.log('⏭️ Research skipped (no sources provided)');
    }

    // Step 2: Generate story text
    const storyStart = Date.now();
    console.log('✍️ Step 2: Generating story...');

    const storyResponse = await fetch(`${BASE_URL}/api/news/stories/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        research: researchData?.research || {
          topic,
          category,
          articles: [],
          key_insights: [],
        },
        topic_id: null,
        generate_audio: false,
        publish,
      }),
    });

    if (!storyResponse.ok) {
      const error = await storyResponse.text();
      steps.push({
        step: 'story_generation',
        status: 'failed',
        duration_ms: Date.now() - storyStart,
        error,
      });
      return res.status(500).json({
        error: 'Story generation failed',
        message: error,
      });
    }

    const storyResult = await storyResponse.json();
    storyData = storyResult.story;
    storyId = storyData.id;

    steps.push({
      step: 'story_generation',
      status: 'success',
      duration_ms: Date.now() - storyStart,
    });
    console.log(`✅ Story generated: ${storyData.word_count} words`);

    // Step 3: Generate audio (if requested)
    if (generate_audio && storyId) {
      const audioStart = Date.now();
      console.log('🎙️ Step 3: Generating audio...');

      try {
        const audioResponse = await fetch(`${BASE_URL}/api/news/stories/${storyId}/generate-audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voice }),
        });

        if (audioResponse.ok) {
          const audioData = await audioResponse.json();
          storyData.audio_url = audioData.audioUrl;
          storyData.audio_duration_seconds = audioData.durationSeconds;
          storyData.voice_id = audioData.voiceId;

          steps.push({
            step: 'audio_generation',
            status: 'success',
            duration_ms: Date.now() - audioStart,
          });
          console.log(`✅ Audio generated: ${audioData.durationSeconds}s (${audioData.voiceId})`);
        } else {
          const error = await audioResponse.text();
          steps.push({
            step: 'audio_generation',
            status: 'failed',
            duration_ms: Date.now() - audioStart,
            error,
          });
          console.error('❌ Audio generation failed:', error);
        }
      } catch (audioError) {
        steps.push({
          step: 'audio_generation',
          status: 'failed',
          duration_ms: Date.now() - audioStart,
          error: audioError instanceof Error ? audioError.message : 'Unknown error',
        });
        console.error('❌ Audio generation error:', audioError);
      }
    } else {
      steps.push({
        step: 'audio_generation',
        status: 'skipped',
        duration_ms: 0,
      });
    }

    // Step 4: Generate image (if requested)
    if (generate_image && storyId) {
      const imageStart = Date.now();
      console.log('🖼️ Step 4: Generating image...');

      try {
        const imageResponse = await fetch(`${BASE_URL}/api/news/stories/${storyId}/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          storyData.image_url = imageData.imageUrl;

          steps.push({
            step: 'image_generation',
            status: 'success',
            duration_ms: Date.now() - imageStart,
          });
          console.log('✅ Image generated');
        } else {
          const error = await imageResponse.text();
          steps.push({
            step: 'image_generation',
            status: 'failed',
            duration_ms: Date.now() - imageStart,
            error,
          });
          console.error('❌ Image generation failed:', error);
        }
      } catch (imageError) {
        steps.push({
          step: 'image_generation',
          status: 'failed',
          duration_ms: Date.now() - imageStart,
          error: imageError instanceof Error ? imageError.message : 'Unknown error',
        });
        console.error('❌ Image generation error:', imageError);
      }
    } else {
      steps.push({
        step: 'image_generation',
        status: 'skipped',
        duration_ms: 0,
      });
    }

    // Step 5: Verify facts (if requested)
    if (verify && storyId) {
      const verifyStart = Date.now();
      console.log('🔍 Step 5: Verifying facts...');

      try {
        const verifyResponse = await fetch(`${BASE_URL}/api/news/stories/${storyId}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          storyData.verification_status = verifyData.verification?.overall_status;

          steps.push({
            step: 'verification',
            status: 'success',
            duration_ms: Date.now() - verifyStart,
          });
          console.log(`✅ Verification complete: ${verifyData.verification?.overall_status}`);
        } else {
          const error = await verifyResponse.text();
          steps.push({
            step: 'verification',
            status: 'failed',
            duration_ms: Date.now() - verifyStart,
            error,
          });
          console.error('❌ Verification failed:', error);
        }
      } catch (verifyError) {
        steps.push({
          step: 'verification',
          status: 'failed',
          duration_ms: Date.now() - verifyStart,
          error: verifyError instanceof Error ? verifyError.message : 'Unknown error',
        });
        console.error('❌ Verification error:', verifyError);
      }
    } else {
      steps.push({
        step: 'verification',
        status: 'skipped',
        duration_ms: 0,
      });
    }

    const totalDuration = Date.now() - startTime;
    console.log(`\n🏁 Complete story generation finished in ${totalDuration}ms`);

    return res.status(200).json({
      success: true,
      story: {
        id: storyData.id,
        title: storyData.title,
        headline: storyData.headline,
        summary: storyData.summary,
        category: storyData.category,
        word_count: storyData.word_count,
        reading_time_minutes: storyData.reading_time_minutes,
        audio_url: storyData.audio_url,
        audio_duration_seconds: storyData.audio_duration_seconds,
        voice_id: storyData.voice_id,
        image_url: storyData.image_url,
        verification_status: storyData.verification_status,
        status: storyData.status,
        created_at: storyData.created_at,
      },
      generation_steps: steps,
      total_duration_ms: totalDuration,
    });

  } catch (error) {
    console.error('❌ Complete story generation error:', error);
    return res.status(500).json({
      error: 'Story generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
