/**
 * Child Workspace API
 * 
 * Child-friendly workspace/writing assistant endpoint that:
 * 1. Filters all content through content filter
 * 2. Provides age-appropriate writing assistance
 * 3. Logs all activity for parental oversight
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getChildServiceContext,
  processChildAIRequest,
  getChildPromptSuggestions,
} from '@/lib/platform/child-service-middleware';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';

// Child-friendly writing assistant system prompt
const CHILD_WRITING_ASSISTANT_PROMPT = `
You are a friendly writing helper for kids! Your job is to:

1. Help with creative writing (stories, poems, letters)
2. Assist with homework and school assignments
3. Improve spelling and grammar in a kind way
4. Encourage creativity and self-expression
5. Keep all content age-appropriate

GUIDELINES:
- Be encouraging and positive
- Explain things simply
- Use fun examples
- Never write anything scary, violent, or inappropriate
- If asked to write something inappropriate, suggest a fun alternative
- Help kids learn while having fun!

When helping with writing:
- Offer suggestions, don't just rewrite everything
- Explain why changes make the writing better
- Celebrate their creativity!
`.trim();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET: Return prompt suggestions
  if (req.method === 'GET') {
    const suggestions = getChildPromptSuggestions('workspace');
    return res.status(200).json({ suggestions });
  }

  // POST: Process writing request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const context = await getChildServiceContext(req, res);
  if (!context) return;

  const { message, action, content } = req.body;

  // Build the request based on action type
  let userMessage = message;
  if (action === 'improve') {
    userMessage = `Please help me improve this writing:\n\n${content}`;
  } else if (action === 'continue') {
    userMessage = `Please help me continue this story:\n\n${content}`;
  } else if (action === 'check') {
    userMessage = `Please check this for spelling and grammar mistakes:\n\n${content}`;
  } else if (action === 'ideas') {
    userMessage = `I need ideas for writing about: ${message}`;
  }

  if (!userMessage || typeof userMessage !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Process through child middleware
  const result = await processChildAIRequest(
    context,
    {
      message: userMessage,
      serviceId: 'workspace',
    },
    async (filteredMessage, safetyPrompt) => {
      // Combine safety prompt with writing assistant prompt
      const systemPrompt = context.accountType === 'child'
        ? `${safetyPrompt}\n\n${CHILD_WRITING_ASSISTANT_PROMPT}`
        : CHILD_WRITING_ASSISTANT_PROMPT;

      const response = await fetch(`${AI_GATEWAY_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CHILD_SAFETY_API_KEY || 'child-safety-key'}`,
        },
        body: JSON.stringify({
          model: process.env.CHILD_AI_MODEL || 'llama3.2:3b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: filteredMessage },
          ],
          temperature: 0.8,
          max_tokens: 800,
          metadata: {
            user_type: context.accountType,
            content_filter: 'strict',
            service: 'workspace',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Writing assistant unavailable');
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "I'm having trouble helping right now. Try again!";
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
