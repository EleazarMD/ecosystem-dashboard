import { SkillModule, ToolContext, ToolExecutionResult } from '../shared/skill-module';
import { LEARN_TUTOR_MODEL, LEARN_TUTOR_CONTRACT } from '../features/tutor-turn';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const CHILD_SAFETY_API_KEY = process.env.CHILD_SAFETY_API_KEY || 'child-safety-key';

export const askSocraticSkill: SkillModule = {
  id: 'ask_socratic',
  label: 'Ask Socratic',
  description: 'Generate a warm, Socratic next-step prompt that never reveals the answer.',
  category: 'tutoring',
  async execute(args, ctx): Promise<ToolExecutionResult> {
    const learnerMessage = String(args.learnerMessage || '');
    const strategy = args.strategy as string | undefined;

    const systemPrompt = [
      'You are a child learning tutor. Be warm, brief, and age-appropriate.',
      'Tutor policy:',
      '- Use Socratic scaffolding. Do not reveal the final answer directly.',
      '- Give exactly one concrete next step at a time.',
      '- Praise effort and strategy, not fixed traits.',
      '- Keep guidance under 80 words.',
      '- Never manipulate, guilt, pressure, or emotionally influence the learner.',
    ].join('\n');

    const focusLine = ctx.focus
      ? [
          ctx.focus.title ? `On screen: ${ctx.focus.title}` : '',
          ctx.focus.summary ? `What the learner is looking at: ${ctx.focus.summary}` : '',
          ctx.focus.entities && Object.keys(ctx.focus.entities).length
            ? `Details: ${JSON.stringify(ctx.focus.entities)}`
            : '',
        ].filter(Boolean).join('\n')
      : '';

    const userPrompt = [
      `Learner message: ${learnerMessage}`,
      `Problem: ${ctx.contentPrompt}`,
      focusLine,
      `Attempt number: ${ctx.attemptNumber}`,
      strategy ? `Suggested strategy: ${strategy}` : '',
    ].filter(Boolean).join('\n\n');

    try {
      const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CHILD_SAFETY_API_KEY}`,
        },
        body: JSON.stringify({
          model: LEARN_TUTOR_MODEL,
          contract: LEARN_TUTOR_CONTRACT,
          messages: [
            ...(ctx.safetySystemPrompt ? [{ role: 'system', content: ctx.safetySystemPrompt }] : []),
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 220,
          metadata: {
            user_type: 'child',
            content_filter: 'strict',
            service_id: 'learn_tutor_agent',
            tool: 'ask_socratic',
          },
        }),
      });

      if (!response.ok) return { output: '', success: false };

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) return { output: '', success: false };
      return { output: content, success: true };
    } catch {
      return { output: '', success: false };
    }
  },
};
