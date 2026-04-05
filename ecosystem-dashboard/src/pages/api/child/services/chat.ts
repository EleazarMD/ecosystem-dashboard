/**
 * Child Chat API
 * 
 * Child-friendly AI chat endpoint that:
 * 1. Filters all input/output through content filter
 * 2. Uses child safety system prompt
 * 3. Logs all activity for parental oversight
 * 4. Routes through AI Gateway
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getChildServiceContext,
  processChildAIRequest,
  getChildPromptSuggestions,
} from '@/lib/platform/child-service-middleware';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET: Return prompt suggestions
  if (req.method === 'GET') {
    const suggestions = getChildPromptSuggestions('personal-ai');
    return res.status(200).json({ suggestions });
  }

  // POST: Process chat message
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const context = await getChildServiceContext(req, res);
  if (!context) return; // Response already sent

  const { message, conversationId } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Process through child middleware with AI Gateway
  const result = await processChildAIRequest(
    context,
    {
      message,
      conversationId,
      serviceId: 'personal-ai',
    },
    async (filteredMessage, systemPrompt) => {
      // Call AI Gateway
      const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CHILD_SAFETY_API_KEY || 'child-safety-key'}`,
        },
        body: JSON.stringify({
          model: process.env.CHILD_AI_MODEL || 'qwen3-8b',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: filteredMessage },
          ],
          temperature: 0.7,
          max_tokens: 500,
          // Child-safe parameters
          metadata: {
            user_type: 'child',
            content_filter: 'strict',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('AI service unavailable');
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "I'm not sure how to respond to that.";
    }
  );

  if (result.success) {
    return res.status(200).json({
      response: result.response,
      remainingMinutes: result.remainingMinutes,
    });
  } else if (result.blocked) {
    return res.status(200).json({
      blocked: true,
      message: result.blockReason,
    });
  } else {
    return res.status(500).json({ error: result.error });
  }
}
