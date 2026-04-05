/**
 * News Story Image Generation Endpoint
 * POST /api/news/stories/[id]/generate-image
 * 
 * Generates a cover image for a news story using Gemini Imagen.
 * Images are saved to permanent storage and URL is stored in database.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Gemini API configuration
const GEMINI_API_KEY = process.env.NEWS_PIPELINE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_IMAGEN_URL = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict';

// Permanent storage location for news images
const NEWS_IMAGE_DIR = process.env.NEWS_IMAGE_DIR || '/home/eleazar/Projects/AIHomelab/data/images/news-stories';

function getNewsPool() {
  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'ecosystem_unified',
    user: process.env.POSTGRES_USER || 'eleazar',
    password: process.env.POSTGRES_PASSWORD || '',
  });
}

// Category-specific image style prompts
const CATEGORY_IMAGE_STYLES: Record<string, string> = {
  technology: 'Modern, sleek, digital aesthetic with blue and cyan tones. Abstract tech visualization, circuit patterns, or futuristic interfaces.',
  science: 'Scientific visualization, laboratory setting, or abstract representation of scientific concepts. Clean, educational aesthetic with warm lighting.',
  business: 'Professional corporate aesthetic, financial charts, modern office environments, or abstract business concepts. Sophisticated color palette.',
  politics: 'Governmental buildings, diplomatic settings, or abstract representations of policy and governance. Formal, authoritative aesthetic.',
  healthcare: 'Medical imagery, healthcare settings, or abstract health concepts. Clean, clinical aesthetic with calming colors.',
  general: 'Professional news photography aesthetic. Clean, modern, journalistic style.',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Story ID is required' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const { style_override } = req.body;
  const newsPool = getNewsPool();

  try {
    // Fetch the story
    const storyResult = await newsPool.query(
      'SELECT id, title, headline, summary, category FROM news.daily_stories WHERE id = $1',
      [id]
    );

    if (storyResult.rows.length === 0) {
      await newsPool.end();
      return res.status(404).json({ error: 'Story not found' });
    }

    const story = storyResult.rows[0];
    const category = story.category || 'general';
    const categoryStyle = CATEGORY_IMAGE_STYLES[category] || CATEGORY_IMAGE_STYLES.general;

    // Build image generation prompt
    const imagePrompt = buildImagePrompt(story, categoryStyle, style_override);

    console.log(`🖼️ Generating image for story: ${story.headline || story.title}`);
    console.log(`   Category: ${category}`);
    console.log(`   Prompt: ${imagePrompt.substring(0, 100)}...`);

    // Call Gemini Imagen API
    const response = await fetch(`${GEMINI_IMAGEN_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt: imagePrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          personGeneration: 'dont_allow',
          safetyFilterLevel: 'block_medium_and_above',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Image generation failed:', errorText);
      await newsPool.end();
      return res.status(500).json({
        error: 'Image generation failed',
        message: errorText,
      });
    }

    const data = await response.json();
    
    // Extract base64 image from response
    const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!imageBase64) {
      await newsPool.end();
      return res.status(500).json({ error: 'No image generated' });
    }

    // Save image to permanent storage
    if (!fs.existsSync(NEWS_IMAGE_DIR)) {
      fs.mkdirSync(NEWS_IMAGE_DIR, { recursive: true });
    }

    const imageFilename = `${id}.png`;
    const imageFilePath = path.join(NEWS_IMAGE_DIR, imageFilename);
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    fs.writeFileSync(imageFilePath, imageBuffer);

    // URL path for the image (served via API endpoint)
    const imageUrl = `/api/news/stories/${id}/image`;

    // Update story with image URL
    await newsPool.query(
      'UPDATE news.daily_stories SET image_url = $1 WHERE id = $2',
      [imageUrl, id]
    );

    await newsPool.end();

    console.log(`✅ Image generated successfully, saved to ${imageFilePath}`);

    return res.status(200).json({
      success: true,
      imageUrl,
      storyId: id,
      prompt: imagePrompt,
    });

  } catch (error) {
    console.error('❌ Image generation error:', error);
    await newsPool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function buildImagePrompt(
  story: { title: string; headline: string; summary: string; category: string },
  categoryStyle: string,
  styleOverride?: string
): string {
  const headline = story.headline || story.title;
  const summary = story.summary || '';

  // Build a descriptive prompt for the image
  const basePrompt = `Create a professional news article cover image for the following story:

Title: "${headline}"
Summary: ${summary.substring(0, 200)}

Style requirements:
${styleOverride || categoryStyle}

Important:
- No text or words in the image
- Professional, editorial quality
- Suitable for a news publication
- 16:9 aspect ratio composition
- High quality, photorealistic or stylized illustration`;

  return basePrompt;
}
