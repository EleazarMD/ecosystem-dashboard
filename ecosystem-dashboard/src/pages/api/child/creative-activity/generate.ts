/**
 * Creative Activity Image Generation API
 * 
 * Generates the final image for a completed creative activity.
 * Uses the child image service with the activity's compiled prompt.
 * 
 * POST /api/child/creative-activity/generate
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getChildServiceContext } from '@/lib/platform/child-service-middleware';
import {
  getSession,
  generateActivityImage,
  completeActivityWithImage,
} from '@/lib/platform/creative-activity-service';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || process.env.AI_GATEWAY_AI_URL || 'http://localhost:8777';

// Extended timeout for image generation
export const config = {
  maxDuration: 300, // 5 minutes
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const context = await getChildServiceContext(req, res);
  if (!context) return;

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Get and validate session
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== context.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (session.status !== 'reviewing') {
      return res.status(400).json({ 
        error: 'Activity not ready for image generation',
        status: session.status,
      });
    }

    // Generate the prompt from the activity
    const { prompt } = await generateActivityImage(sessionId);

    console.log('[Creative Activity Generate] Prompt:', prompt);
    console.log('[Creative Activity Generate] Style:', session.template.imageSettings.style);

    // Determine image style based on template
    const styleMap: Record<string, { style: string; styleLabel: string; styleDescription: string }> = {
      pixel: { style: 'pixel', styleLabel: 'Pixel Art', styleDescription: 'Retro 8-bit game style' },
      cartoon: { style: 'cartoon', styleLabel: 'Cartoon', styleDescription: 'Fun and colorful' },
      storybook: { style: 'storybook', styleLabel: 'Storybook', styleDescription: 'Whimsical fairy tale art' },
      '3d': { style: '3d', styleLabel: '3D Render', styleDescription: 'Smooth CGI style' },
      watercolor: { style: 'watercolor', styleLabel: 'Watercolor', styleDescription: 'Soft artistic painting' },
    };

    const styleConfig = styleMap[session.template.imageSettings.style] || styleMap.cartoon;

    // Call the child image service to generate the image
    // This reuses all the safety filters and augmentation from the main image service
    const imageResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/child/services/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: JSON.stringify({
        prompt,
        style: styleConfig.style,
        styleLabel: styleConfig.styleLabel,
        styleDescription: styleConfig.styleDescription,
        // Pass activity metadata
        metadata: {
          activityId: session.templateId,
          activityName: session.template.name,
          sessionId: session.id,
        },
      }),
    });

    const imageData = await imageResponse.json();

    if (imageData.blocked) {
      return res.status(200).json({
        blocked: true,
        message: imageData.message || "Let's try a different design!",
      });
    }

    if (imageData.error || !imageData.imageUrl) {
      console.error('[Creative Activity Generate] Image generation failed:', imageData);
      return res.status(500).json({
        error: 'Image generation failed',
        details: imageData.error,
      });
    }

    // Complete the activity with the generated image
    const completedSession = await completeActivityWithImage(
      sessionId,
      imageData.imageUrl,
      imageData.imageId
    );

    return res.status(200).json({
      success: true,
      session: completedSession,
      imageUrl: imageData.imageUrl,
      imageId: imageData.imageId,
      message: `🎨 Your ${session.template.name} is ready!`,
    });

  } catch (error: any) {
    console.error('[Creative Activity Generate] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message,
    });
  }
}
