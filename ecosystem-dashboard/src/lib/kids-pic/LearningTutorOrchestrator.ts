const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const CHILD_SAFETY_API_KEY = process.env.CHILD_SAFETY_API_KEY || 'child-safety-key';

export const LEARN_TUTOR_MODEL = process.env.LEARN_TUTOR_MODEL || process.env.CHILD_AI_MODEL || 'qwen3-8b';
export const LEARN_TUTOR_CONTRACT = process.env.LEARN_TUTOR_CONTRACT || 'minor-restricted';

export type TutorResponseSource = 'ai_gateway_learn_tutor' | 'fallback_deterministic_learn_tutor';

export interface LearningTutorPcgContext {
  childName?: string;
  ageGroup?: string;
  interests?: string[];
  goals?: string[];
}

export interface LearningTutorGenerationInput {
  learnerMessage: string;
  contentPrompt: string;
  hint?: string;
  hintLevel?: number;
  hintsAvailable: number;
  attemptNumber: number;
  safetySystemPrompt?: string;
  pcgContext?: LearningTutorPcgContext | null;
}

export interface LearningTutorGenerationResult {
  message: string;
  source: TutorResponseSource;
  model: string;
  contract: string;
}

export function buildDeterministicTutorMessage(input: {
  prompt: string;
  attemptNumber: number;
  hint?: string;
  hintLevel?: number;
  hintsAvailable: number;
}): string {
  const coachingPrefix = 'Nice effort. Let us solve this step by step.';

  if (input.hint) {
    const hintLabel =
      typeof input.hintLevel === 'number'
        ? `Hint ${input.hintLevel + 1} of ${Math.max(input.hintsAvailable, 1)}:`
        : 'Hint:';

    return `${coachingPrefix} ${hintLabel} ${input.hint} Then try your answer again in your own words.`;
  }

  const promptSnippet = input.prompt.length > 180 ? `${input.prompt.slice(0, 180)}...` : input.prompt;

  return `${coachingPrefix} Re-read the problem and focus on the key detail: "${promptSnippet}".`;
}

function buildTutorPolicyPrompt(): string {
  return [
    'You are a child learning tutor. Be warm, brief, and age-appropriate.',
    'Tutor policy:',
    '- Use Socratic scaffolding. Do not reveal the final answer directly.',
    '- Give exactly one concrete next step at a time.',
    '- Praise effort and strategy, not fixed traits.',
    '- Keep guidance under 80 words.',
    '- If a hint is available, incorporate it naturally without saying the final answer.',
    '- Never manipulate, guilt, pressure, or emotionally influence the learner.',
    '- Do not grade free-play activities or non-assessment conversation.',
  ].join('\n');
}

function buildPcgSummary(pcgContext?: LearningTutorPcgContext | null): string {
  if (!pcgContext) {
    return '';
  }

  return [
    pcgContext.childName ? `Name: ${pcgContext.childName}` : '',
    pcgContext.ageGroup ? `Age band: ${pcgContext.ageGroup}` : '',
    pcgContext.interests?.length ? `Interests: ${pcgContext.interests.slice(0, 3).join(', ')}` : '',
    pcgContext.goals?.length ? `Active goals: ${pcgContext.goals.slice(0, 2).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildTutorUserPrompt(input: LearningTutorGenerationInput): string {
  const pcgSummary = buildPcgSummary(input.pcgContext);

  return [
    `Learner message: ${input.learnerMessage}`,
    `Problem: ${input.contentPrompt}`,
    `Attempt number: ${input.attemptNumber}`,
    `Hints available: ${input.hintsAvailable}`,
    typeof input.hintLevel === 'number' ? `Current hint level: ${input.hintLevel + 1}` : '',
    input.hint ? `Hint guidance to use: ${input.hint}` : 'Hint guidance to use: Encourage close rereading.',
    pcgSummary ? `PCG context:\n${pcgSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function generateTutorMessageViaOrchestrator(
  input: LearningTutorGenerationInput,
): Promise<LearningTutorGenerationResult> {
  const tutorPolicyPrompt = buildTutorPolicyPrompt();
  const userPrompt = buildTutorUserPrompt(input);

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
          ...(input.safetySystemPrompt ? [{ role: 'system', content: input.safetySystemPrompt }] : []),
          { role: 'system', content: tutorPolicyPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 220,
        metadata: {
          user_type: 'child',
          content_filter: 'strict',
          service_id: 'learn_tutor',
          attempt_number: input.attemptNumber,
          contract: LEARN_TUTOR_CONTRACT,
          model_family: 'minimax',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway responded ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('AI Gateway returned empty tutor content');
    }

    return {
      message: content,
      source: 'ai_gateway_learn_tutor',
      model: LEARN_TUTOR_MODEL,
      contract: LEARN_TUTOR_CONTRACT,
    };
  } catch (error) {
    console.warn('[learn-tutor-orchestrator] AI Gateway tutor generation failed, using deterministic fallback:', error);

    return {
      message: buildDeterministicTutorMessage({
        prompt: input.contentPrompt,
        attemptNumber: input.attemptNumber,
        hint: input.hint,
        hintLevel: input.hintLevel,
        hintsAvailable: input.hintsAvailable,
      }),
      source: 'fallback_deterministic_learn_tutor',
      model: LEARN_TUTOR_MODEL,
      contract: LEARN_TUTOR_CONTRACT,
    };
  }
}
