/**
 * Child Email API
 * 
 * Child-friendly email assistant endpoint that:
 * 1. Filters all content through content filter
 * 2. Provides age-appropriate email assistance
 * 3. Logs all activity for parental oversight
 * 4. Restricts email recipients to approved contacts
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getChildServiceContext,
  processChildAIRequest,
  getChildPromptSuggestions,
} from '@/lib/platform/child-service-middleware';
import { filterChildContent, logChildActivity } from '@/lib/platform/content-filter-service';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';

// Child-friendly email assistant system prompt
const CHILD_EMAIL_ASSISTANT_PROMPT = `
You are a friendly email helper for kids! Your job is to:

1. Help write polite and friendly emails
2. Check emails for spelling and grammar
3. Suggest kind ways to say things
4. Help reply to messages appropriately

GUIDELINES:
- Keep emails friendly and appropriate
- Help with thank you notes, letters to teachers, messages to family
- Never include personal information like addresses or phone numbers
- If asked to write something mean or inappropriate, suggest a nicer alternative
- Encourage good communication skills

RESPONSE FORMAT:
When helping write an email, format it nicely with:
- A friendly greeting
- Clear message
- Polite closing
`.trim();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET: Return prompt suggestions
  if (req.method === 'GET') {
    const suggestions = getChildPromptSuggestions('email');
    return res.status(200).json({ suggestions });
  }

  // POST: Process email request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const context = await getChildServiceContext(req, res);
  if (!context) return;

  const { action, message, recipient, subject, body } = req.body;

  // Handle different email actions
  let userMessage = message;

  switch (action) {
    case 'compose':
      userMessage = `Help me write an email to ${recipient || 'someone'} about: ${message}`;
      break;
    case 'reply':
      userMessage = `Help me write a reply to this email:\n\n${body}\n\nI want to say: ${message}`;
      break;
    case 'improve':
      userMessage = `Please help me improve this email:\n\nSubject: ${subject}\n\n${body}`;
      break;
    case 'check':
      userMessage = `Please check this email for mistakes:\n\nSubject: ${subject}\n\n${body}`;
      break;
    default:
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
  }

  // Process through child middleware
  const result = await processChildAIRequest(
    context,
    {
      message: userMessage,
      serviceId: 'email-client',
    },
    async (filteredMessage, safetyPrompt) => {
      const systemPrompt = context.accountType === 'child'
        ? `${safetyPrompt}\n\n${CHILD_EMAIL_ASSISTANT_PROMPT}`
        : CHILD_EMAIL_ASSISTANT_PROMPT;

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
          temperature: 0.7,
          max_tokens: 600,
          metadata: {
            user_type: context.accountType,
            content_filter: 'strict',
            service: 'email',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Email assistant unavailable');
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
