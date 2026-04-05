/**
 * Email Draft Generation API
 * 
 * Uses AI Gateway to generate email drafts based on prompts and tone
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, prompt, tone, model = 'gemini-2-5-pro' } = req.body;

  if (!prompt && !subject) {
    return res.status(400).json({ error: 'Prompt or subject required' });
  }

  const toneInstructions: Record<string, string> = {
    professional: 'Use a professional, business-appropriate tone. Be clear and respectful.',
    friendly: 'Use a warm, friendly tone while remaining appropriate. Be personable.',
    casual: 'Use a casual, relaxed tone. Keep it conversational but clear.',
    formal: 'Use a formal, traditional business tone. Be precise and courteous.',
    concise: 'Be extremely brief and to the point. No fluff, just essential information.',
  };

  const systemPrompt = `You are an expert email writer. Generate a well-crafted email based on the user's request.

${toneInstructions[tone] || toneInstructions.professional}

Guidelines:
- Write only the email body (no subject line unless asked)
- Use appropriate greeting and sign-off
- Be clear and purposeful
- Match the requested tone exactly
- Keep it appropriately sized for the content

${to ? `Recipient: ${to}` : ''}
${subject ? `Subject: ${subject}` : ''}`;

  const userPrompt = prompt || `Write an email about: ${subject}`;

  try {
    const response = await fetch(`${AI_GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'ecosystem-dashboard',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Email Generate] AI Gateway error:', error);
      return res.status(response.status).json({ error: 'Failed to generate draft' });
    }

    const data = await response.json();
    const body = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({
      body,
      model,
      tone,
    });
  } catch (error) {
    console.error('[Email Generate] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
