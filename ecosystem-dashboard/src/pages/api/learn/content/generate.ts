import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../auth/[...nextauth]';
import { filterContent } from '@/lib/platform/content-filter-service';
import { getAIChildSafetyMonitor } from '@/domains/learning/features/safety-monitor';
import dbPool from '@/lib/db/client';
import { HARNESS_EVENT_TYPES } from '@/lib/harness/events/types';
import { emitHarnessEventSafe, runHarnessPipeline, toApiHarnessMetadata } from '@/lib/harness/runtime/pipeline';
import type { HarnessPipelineEventInput } from '@/lib/harness/runtime/pipeline';
import type { HarnessAgentRequest } from '@/lib/harness/types';
import type {
  LearnAgeBand,
  LearnContentItem,
  LearnContentType,
  DeterministicAnswerKey,
} from '@/domains/learning/shared/phase1-content';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';

interface GenerateRequestBody {
  skillCode?: string;
  ageBand?: string;
  type?: string;
  count?: number;
  subject?: string;
  difficulty?: number;
}

interface GeneratedCandidate {
  item: LearnContentItem;
  safetyPassed: boolean;
  safetyConcerns: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startedAt = Date.now();
    const policyDecisions: string[] = ['auth:allow', 'method:post'];

    const body = (req.body || {}) as GenerateRequestBody;
    const skillCode = `${body.skillCode || ''}`.trim();
    const ageBandRaw = `${body.ageBand || ''}`.trim();
    const typeRaw = `${body.type || ''}`.trim();
    const subject = `${body.subject || ''}`.trim();
    const count = Math.min(Math.max(body.count || 3, 1), 10);
    const difficulty = body.difficulty || undefined;

    if (!skillCode) {
      return res.status(400).json({ error: 'skillCode is required' });
    }

    if (ageBandRaw && !isValidAgeBand(ageBandRaw)) {
      return res.status(400).json({ error: 'ageBand must be one of: early, middle, tween' });
    }

    if (typeRaw && !isValidContentType(typeRaw)) {
      return res.status(400).json({ error: 'type must be one of: problem, question, writing, reasoning' });
    }

    policyDecisions.push('payload:valid');

    const ageBand = (ageBandRaw || 'middle') as LearnAgeBand;
    const contentType = (typeRaw || 'problem') as LearnContentType;

    const userId = session.user.id || '';
    const harnessRequest: HarnessAgentRequest = {
      requestId: randomUUID(),
      domain: 'learning',
      agentId: 'learn_content_gen',
      agentRole: 'orchestrator',
      userId,
      goal: 'Generate age-appropriate learning content items via AI Gateway',
      payload: { skillCode, ageBand, contentType, count },
      priority: 'normal',
      metadata: { route: '/api/learn/content/generate' },
    };

    // Generate content via AI Gateway using child-safety key
    const generationResult = await generateContentViaGateway({
      skillCode,
      ageBand,
      contentType,
      subject: subject || inferSubject(skillCode),
      count,
      difficulty,
    });

    if (generationResult.candidates.length === 0) {
      return res.status(200).json({
        candidates: [],
        generated: 0,
        passedSafety: 0,
        message: 'AI Gateway returned no parseable candidates',
      });
    }

    // Auto safety screen each candidate
    const screened: GeneratedCandidate[] = [];
    for (const candidate of generationResult.candidates) {
      const safetyResult = await safetyScreenContent(candidate, skillCode, ageBand, contentType);
      screened.push(safetyResult);
    }

    const passed = screened.filter((c) => c.safetyPassed);
    const failed = screened.filter((c) => !c.safetyPassed);

    const harnessEvents: HarnessPipelineEventInput[] = [
      {
        domain: harnessRequest.domain,
        type: HARNESS_EVENT_TYPES.PLAN_GENERATED,
        userId: harnessRequest.userId,
        payload: {
          requestId: harnessRequest.requestId,
          skillCode,
          ageBand,
          generated: generationResult.candidates.length,
          passedSafety: passed.length,
          failedSafety: failed.length,
        },
      },
    ];

    const { response: harnessResponse } = await runHarnessPipeline({
      request: harnessRequest,
      startedAt,
      policyDecisions,
      safetyInputResult: 'pass',
      safetyOutputResult: passed.length > 0 ? 'pass' : 'block',
      status: 'success',
      content: {
        generated: generationResult.candidates.length,
        passedSafety: passed.length,
      },
      source: 'ai_gateway_content_gen',
      model: process.env.CHILD_AI_MODEL || 'minimax-m3',
      contract: 'learn-content-generate-v1',
      evaluation: {
        method: 'none',
      },
      events: harnessEvents,
      eventWarnPrefix: '[api/learn/content/generate] harness event emission failed:',
    });

    return res.status(200).json({
      candidates: screened.map((c) => ({
        ...c.item,
        safetyPassed: c.safetyPassed,
        safetyConcerns: c.safetyConcerns,
      })),
      generated: screened.length,
      passedSafety: passed.length,
      failedSafety: failed.length,
      harness: toApiHarnessMetadata(harnessResponse),
    });
  } catch (error) {
    console.error('[api/learn/content/generate] failed:', error);
    return res.status(500).json({ error: 'Failed to generate content' });
  }
}

// ============================================================================
// AI Gateway content generation
// ============================================================================

interface GatewayCandidate {
  prompt: string;
  answerKey?: DeterministicAnswerKey;
  hintSet?: string[];
  rubricCriteria?: string[];
  expectedReasoning?: string[];
  analyticalTags?: string[];
  difficulty?: number;
}

async function generateContentViaGateway(input: {
  skillCode: string;
  ageBand: LearnAgeBand;
  contentType: LearnContentType;
  subject: string;
  count: number;
  difficulty?: number;
}): Promise<{ candidates: GatewayCandidate[] }> {
  const systemPrompt = buildContentGenerationPrompt(input);
  const userPrompt = `Generate ${input.count} learning content item${input.count > 1 ? 's' : ''} as JSON array. Each item must have: prompt (string), answerKey (object with kind "number" or "exact_text", value, acceptedForms, tolerance), hintSet (array of 3 strings), difficulty (1-5). Respond ONLY with a JSON array, no markdown.`;

  const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CHILD_SAFETY_API_KEY || 'child-safety-key'}`,
    },
    body: JSON.stringify({
      model: process.env.CHILD_AI_MODEL || 'minimax-m3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
      metadata: {
        user_type: 'child',
        content_filter: 'strict',
      },
    }),
  });

  if (!response.ok) {
    console.warn(`[api/learn/content/generate] AI Gateway responded ${response.status}`);
    return { candidates: [] };
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content || '';
  const candidates = parseGeneratedContent(rawText);

  return { candidates };
}

function buildContentGenerationPrompt(input: {
  skillCode: string;
  ageBand: LearnAgeBand;
  contentType: LearnContentType;
  subject: string;
  count: number;
  difficulty?: number;
}): string {
  const ageDescription = input.ageBand === 'early'
    ? 'ages 5-7 (grades K-2)'
    : input.ageBand === 'middle'
      ? 'ages 8-10 (grades 3-5)'
      : 'ages 11-12 (grades 6-7)';

  const typeDescription = input.contentType === 'problem'
    ? 'math word problems with numeric answers'
    : input.contentType === 'question'
      ? 'reading comprehension questions with exact text answers'
      : input.contentType === 'writing'
        ? 'writing prompts (no answerKey, include rubricCriteria array of 4 strings)'
        : 'reasoning prompts (no answerKey, include expectedReasoning array of 3 strings and rubricCriteria)';

  const difficultyHint = input.difficulty
    ? `Target difficulty: ${input.difficulty} (1=easy, 5=hard).`
    : 'Vary difficulty from 1-3.';

  return [
    'You are an educational content generator for a children\'s learning platform.',
    `Generate ${input.contentType} content for the skill "${input.skillCode}" in the subject "${input.subject}".`,
    `Target audience: ${ageDescription}.`,
    `Content type: ${typeDescription}.`,
    difficultyHint,
    'All content must be age-appropriate, encouraging, and free of any harmful themes.',
    'Each problem should be solvable with the skill indicated.',
    'For numeric answers, include tolerance if the answer involves rounding.',
    'Hints should be progressive: first hint is gentle, last hint is nearly the answer.',
  ].join(' ');
}

function parseGeneratedContent(rawText: string): GatewayCandidate[] {
  // Try to extract JSON array from the response
  let jsonText = rawText.trim();

  // Strip markdown code fences if present
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim();
  }

  // Find the first JSON array in the text
  const arrayStart = jsonText.indexOf('[');
  const arrayEnd = jsonText.lastIndexOf(']');
  if (arrayStart === -1 || arrayEnd === -1) {
    return [];
  }

  jsonText = jsonText.slice(arrayStart, arrayEnd + 1);

  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry: unknown) => normalizeCandidate(entry))
      .filter((c: GatewayCandidate | null): c is GatewayCandidate => c !== null);
  } catch {
    console.warn('[api/learn/content/generate] failed to parse AI Gateway response as JSON');
    return [];
  }
}

function normalizeCandidate(entry: unknown): GatewayCandidate | null {
  if (!entry || typeof entry !== 'object') return null;
  const obj = entry as Record<string, unknown>;

  const prompt = typeof obj.prompt === 'string' ? obj.prompt.trim() : '';
  if (!prompt) return null;

  const candidate: GatewayCandidate = {
    prompt,
    hintSet: Array.isArray(obj.hintSet)
      ? obj.hintSet.map((h) => String(h)).slice(0, 4)
      : ['Think about what the question is asking.', 'Break it into smaller steps.', 'Check your work.'],
    difficulty: typeof obj.difficulty === 'number' ? Math.min(Math.max(obj.difficulty, 1), 5) : 2,
  };

  // Parse answerKey if present
  if (obj.answerKey && typeof obj.answerKey === 'object') {
    const ak = obj.answerKey as Record<string, unknown>;
    const kind = ak.kind === 'number' ? 'number' : ak.kind === 'exact_text' ? 'exact_text' : null;
    if (kind === 'number' && typeof ak.value === 'number') {
      candidate.answerKey = {
        kind: 'number',
        value: ak.value,
        acceptedForms: Array.isArray(ak.acceptedForms) ? ak.acceptedForms.map(String) : undefined,
        tolerance: typeof ak.tolerance === 'number' ? ak.tolerance : undefined,
      };
    } else if (kind === 'exact_text' && typeof ak.value === 'string') {
      candidate.answerKey = {
        kind: 'exact_text',
        value: ak.value,
        acceptedForms: Array.isArray(ak.acceptedForms) ? ak.acceptedForms.map(String) : undefined,
        caseSensitive: false,
      };
    }
  }

  if (Array.isArray(obj.rubricCriteria)) {
    candidate.rubricCriteria = obj.rubricCriteria.map(String);
  }

  if (Array.isArray(obj.expectedReasoning)) {
    candidate.expectedReasoning = obj.expectedReasoning.map(String);
  }

  if (Array.isArray(obj.analyticalTags)) {
    candidate.analyticalTags = obj.analyticalTags.map(String);
  }

  return candidate;
}

// ============================================================================
// Safety screening
// ============================================================================

async function safetyScreenContent(
  candidate: GatewayCandidate,
  skillCode: string,
  ageBand: LearnAgeBand,
  contentType: LearnContentType,
): Promise<GeneratedCandidate> {
  const concerns: string[] = [];

  // 1. Content filter — strict level, output direction
  try {
    const filterResult = await filterContent(candidate.prompt, 'strict', 'output');
    if (!filterResult.passed) {
      concerns.push(...filterResult.violations.map((v) => `${v.ruleName}: ${v.matchedText}`));
    }
  } catch (error) {
    console.warn('[api/learn/content/generate] content filter skipped:', error);
  }

  // 2. AI Child Safety Monitor — analyze as if it were an AI response to a child
  try {
    const monitor = getAIChildSafetyMonitor(dbPool);
    const analysis = await monitor.analyzeMessage({
      childId: 'content-generation',
      sessionId: 'content-gen-screen',
      childMessage: 'Generate a learning activity.',
      aiResponse: candidate.prompt,
      timestamp: new Date(),
    });

    if (!analysis.safe) {
      concerns.push(...analysis.concerns);
    }
    if (analysis.shouldBlock) {
      concerns.push('Safety monitor flagged content for blocking');
    }
  } catch (error) {
    console.warn('[api/learn/content/generate] safety monitor skipped:', error);
  }

  // 3. Validate answer key is present for deterministic types
  if (!candidate.answerKey && !candidate.rubricCriteria && !candidate.expectedReasoning) {
    concerns.push('Missing answerKey or rubric criteria — cannot grade');
  }

  const safetyPassed = concerns.length === 0;

  const item: LearnContentItem = {
    id: `gen.${randomUUID().slice(0, 8)}`,
    version: 1,
    subject: inferSubjectFromCandidate(candidate),
    skillCode,
    analyticalTags: candidate.analyticalTags || [],
    type: contentType,
    ageBand,
    minGrade: ageBand === 'early' ? 'K' : ageBand === 'middle' ? '2' : '4',
    maxGrade: ageBand === 'early' ? '2' : ageBand === 'middle' ? '5' : '7',
    difficulty: candidate.difficulty || 2,
    prompt: candidate.prompt,
    answerKey: candidate.answerKey,
    hintSet: candidate.hintSet || [],
    rubricCriteria: candidate.rubricCriteria,
    expectedReasoning: candidate.expectedReasoning,
    provenance: 'ai_generated',
    reviewStatus: 'draft',
    safetyStatus: safetyPassed ? 'passed' : 'failed',
    lowStakesOnly: true,
  };

  return {
    item,
    safetyPassed,
    safetyConcerns: concerns,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function isValidAgeBand(value: string): value is LearnAgeBand {
  return value === 'early' || value === 'middle' || value === 'tween';
}

function isValidContentType(value: string): value is LearnContentType {
  return value === 'problem' || value === 'question' || value === 'writing' || value === 'reasoning';
}

function inferSubject(skillCode: string): string {
  if (skillCode.startsWith('math.')) return 'math';
  if (skillCode.startsWith('reading.')) return 'reading';
  if (skillCode.startsWith('writing.')) return 'writing';
  if (skillCode.startsWith('analytical.')) return 'analytical';
  if (skillCode.startsWith('science.')) return 'science';
  return 'math';
}

function inferSubjectFromCandidate(candidate: GatewayCandidate): LearnContentItem['subject'] {
  if (candidate.rubricCriteria && !candidate.answerKey) return 'writing';
  if (candidate.expectedReasoning) return 'analytical';
  return 'math';
}
