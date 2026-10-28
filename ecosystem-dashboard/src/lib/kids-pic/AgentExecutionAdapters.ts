/**
 * Agent Execution Adapters — call AI models through the AI Gateway
 * to produce lesson content, problems, assessments, and images.
 *
 * Each adapter:
 * 1. Picks up an agent task from the pipeline
 * 2. Builds the appropriate system + user prompt
 * 3. Calls the AI Gateway with the correct model
 * 4. Parses the response into structured output
 * 5. Returns the output payload for the orchestrator
 *
 * Adapters are designed to be called by the orchestrator's dispatch loop
 * or independently via the /api/learn/lessons/execute endpoint.
 */

import { agentRegistry } from './AgentRegistry';
import { AGENT_LABELS, type AgentId, type TaskType, type LessonDesignSpec } from './LessonLifecycleService';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
// Child-safe gateway calls need the rotated child-safety key (Infisical
// /kids-dashboard). No source default — a missing key fails closed below.
const CHILD_SAFETY_API_KEY = process.env.CHILD_SAFETY_API_KEY || '';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TaskInput {
  stepId?: string;
  stepType?: string;
  stepTitle?: string;
  subject?: string;
  ageBand?: string;
  difficulty?: number;
  skillCodes?: string[];
  curriculumStandards?: string[];
  estimatedMinutes?: number;
  prerequisites?: string[];
  lessonTitle?: string;
  lessonDescription?: string;
  designSpec?: LessonDesignSpec;
  visualStyle?: string;
  /** Bounded text from the blueprint's cited curriculum pages (ADR-0010 P2) —
   *  generation teaches from this instead of inventing. */
  sourceText?: string;
  /** When set, generate_problem produces a whole practice bank for the
   *  session loop instead of one step problem (items land in
   *  learning_content_items on completion). */
  practiceBank?: {
    count: number;
    types?: string[];
    difficulty?: number;
    answerKeyRule?: string;
  };
}

export interface TaskOutput {
  stepContent?: Record<string, any>;
  /** Practice-bank items (generate_problem with practiceBank) — execute.ts
   *  inserts these into learning_content_items. */
  items?: Record<string, any>[];
  designSpec?: LessonDesignSpec;
  asset?: {
    assetType?: string;
    generationPrompt?: string;
    assetUrl?: string;
    assetData?: Record<string, any>;
    thumbnailUrl?: string;
    altText?: string;
  };
  rawResponse?: string;
  model?: string;
  tokensUsed?: number;
}

export interface ExecuteResult {
  success: boolean;
  output: TaskOutput;
  error?: string;
  durationMs: number;
}

// ─── Gateway call helper ────────────────────────────────────────────────────
//
// Uses the AgentRegistry to resolve which model to call.
// The registry handles:
//   - Which agent is bound to this task type (swappable via registry.rebindTask)
//   - Which gateway model ID to use (updatable via registry.updateProviderModel)
//   - Whether to use child-safe auth
//   - Temperature/maxTokens overrides per task type
//
// If a task is locked (non-negotiable), the registry enforces the binding.
// If a task is negotiable, any capable agent can be swapped in at runtime.

interface GatewayCallParams {
  /** Override the registry binding's maxTokens — reasoning models can burn
   *  the whole binding budget on hidden reasoning and return empty content
   *  (finish_reason=length, content=''). */
  maxTokensOverride?: number;
  /** The task type — the registry resolves the agent from this */
  taskType: TaskType;
  /** Override the resolved agent (used when executing a task that already has an agentId assigned) */
  agentIdOverride?: AgentId;
  systemPrompt: string;
  userPrompt: string;
  responseFormat?: 'text' | 'json';
}

async function callGateway(params: GatewayCallParams): Promise<{
  content: string;
  model: string;
  tokensUsed: number;
  agentUsed: AgentId;
}> {
  // Resolve gateway params from the registry
  const registryParams = agentRegistry.getGatewayParams(params.taskType);

  // If an override is provided (e.g. the task already has an agent assigned), use it
  let agentId = params.agentIdOverride || registryParams.agentId;
  let model = registryParams.model;
  let endpoint = registryParams.endpoint;
  let authKey = registryParams.authKey;
  let isChildSafe = registryParams.isChildSafe;

  // If the override agent differs from the registry's resolved agent, look up its provider config
  if (params.agentIdOverride && params.agentIdOverride !== registryParams.agentId) {
    const provider = agentRegistry.getProvider(params.agentIdOverride);
    if (provider && provider.enabled) {
      model = provider.gatewayModel;
      endpoint = provider.endpoint;
      isChildSafe = provider.isChildSafe;
      authKey = isChildSafe ? CHILD_SAFETY_API_KEY : AI_GATEWAY_API_KEY;
    } else {
      // Fallback to registry-resolved agent
      agentId = registryParams.agentId;
      model = registryParams.model;
      endpoint = registryParams.endpoint;
      authKey = registryParams.authKey;
      isChildSafe = registryParams.isChildSafe;
    }
  }

  if (!model) {
    throw new Error(`No model configured for agent ${agentId} (task: ${params.taskType})`);
  }

  if (!authKey) {
    throw new Error(
      `No gateway API key for ${isChildSafe ? 'child-safe' : 'authoring'} call (task: ${params.taskType}) — set CHILD_SAFETY_API_KEY`);
  }

  const body: Record<string, any> = {
    model,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt },
    ],
    temperature: registryParams.temperature,
    max_tokens: params.maxTokensOverride ?? registryParams.maxTokens,
  };

  if (params.responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }

  if (isChildSafe) {
    body.metadata = { user_type: 'child', content_filter: 'strict' };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gateway returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || 0;

  return { content, model, tokensUsed, agentUsed: agentId };
}

// ─── JSON extraction helper ─────────────────────────────────────────────────

function extractJSON(text: string): Record<string, any> | null {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try to find JSON block in the text
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // pass
      }
    }
    // Try to find first { ... } block
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.substring(start, end + 1));
      } catch {
        // pass
      }
    }
  }
  return null;
}

// ─── Prompt builders ────────────────────────────────────────────────────────

function buildDesignSpecPrompt(input: TaskInput): { system: string; user: string } {
  const system = `You are an expert curriculum designer and pedagogical architect. Your task is to create a detailed lesson design specification.

You must output ONLY valid JSON with this exact structure:
{
  "objectives": ["Learning objective 1", "Learning objective 2", ...],
  "narrativeArc": "A brief description of the lesson's story/narrative flow",
  "visualStyle": "Description of the visual style (e.g., 'colorful cartoon', 'clean minimalist', 'Pokemon-inspired')",
  "interactionTypes": ["multiple_choice", "problem_solving", ...],
  "targetSkills": ["skill1", "skill2", ...],
  "adaptationNotes": "Notes on how to adapt for different skill levels"
}

Available interaction types: multiple_choice, problem_solving, reading, interactive, quiz`;

  const user = `Design a lesson with these parameters:
- Title: ${input.lessonTitle || 'Untitled'}
- Subject: ${input.subject}
- Age band: ${input.ageBand}
- Difficulty: ${input.difficulty || 1}/5
- Skill codes: ${(input.skillCodes || []).join(', ')}
- Curriculum standards: ${(input.curriculumStandards || []).join(', ') || 'none specified'}
- Estimated duration: ${input.estimatedMinutes || 10} minutes
- Prerequisites: ${(input.prerequisites || []).join(', ') || 'none'}
${input.lessonDescription ? `- Description: ${input.lessonDescription}` : ''}

Create a pedagogically sound design spec that will engage a ${input.ageBand} learner. Include 3-5 clear objectives, a compelling narrative arc, and appropriate interaction types for the age group.`;

  return { system, user };
}

/** The cited-pages block for generation prompts — present only when the
 *  blueprint's source pages were actually fetched. */
function sourceBlock(sourceText?: string): string {
  if (!sourceText) return '';
  return `

Source material (the lesson's cited curriculum pages — teach from this; keep its method, notation and numbers faithful):
${sourceText}`;
}

/** Generate the blueprint's practice bank: `count` items shaped like
 *  learning_content_items candidates (prompt, deterministic answerKey,
 *  progressive hints), from one gateway call. */
async function generatePracticeBank(input: TaskInput): Promise<{ items: Record<string, any>[]; raw: string; model: string; tokensUsed: number }> {
  const bank = input.practiceBank!;
  const system = `You are an expert practice-item designer for children's education. Generate a bank of practice items for an adaptive session loop.

You must output ONLY a valid JSON array. Each element:
{
  "prompt": "The problem or question statement",
  "answerKey": { "kind": "number" | "exact_text", "value": <number or exact string>, "acceptedForms": ["alternate accepted spellings/forms"], "tolerance": <number, numbers only> },
  "hintSet": ["gentle hint", "more specific hint", "nearly the answer"],
  "difficulty": 1-5,
  "analyticalTags": ["what the item discriminates, e.g. 'unlike-denominators'"]
}

Rules:
- Every item MUST have a deterministic answerKey (a number, or exact short text) — grading is done in code, never by a model.
- Items progress from easier to harder across the bank.
- Vary contexts and numbers between items; no two items the same.
- Age-appropriate, encouraging, free of harmful themes.`;

  const user = `Generate ${bank.count} practice items for:
- Subject: ${input.subject}
- Age band: ${input.ageBand}
- Difficulty target: ${bank.difficulty || input.difficulty || 2}/5
- Skill codes: ${(input.skillCodes || []).join(', ')}
- Lesson objectives: ${input.designSpec?.objectives?.join('; ') || '(see source)'}${input.designSpec?.adaptationNotes ? `
- Misconception patterns to target: ${input.designSpec.adaptationNotes}` : ''}${sourceBlock(input.sourceText)}`;

  const result = await callGateway({
    taskType: 'generate_problem',
    agentIdOverride: (input as any)._agentId,
    systemPrompt: system,
    userPrompt: user,
    responseFormat: 'json',
    maxTokensOverride: 6000,
  });

  // The bank is a JSON array — slice the outermost brackets and parse
  // (same approach as content/generate's parseGeneratedContent).
  const raw = result.content.trim();
  const arrStart = raw.indexOf('[');
  const arrEnd = raw.lastIndexOf(']');
  let arr: unknown[] | null = null;
  if (arrStart !== -1 && arrEnd > arrStart) {
    try { arr = JSON.parse(raw.slice(arrStart, arrEnd + 1)); if (!Array.isArray(arr)) arr = null; } catch { arr = null; }
  }
  // Accept both the bank answerKey shape ({kind, value}) and the single-problem
  // shape ({answer, explanation}) — normalize to {kind, value}.
  const normalizeItem = (x: any) => {
    if (!x || typeof x.prompt !== 'string' || !x.prompt.trim()) return null;
    let ak = x.answerKey;
    if (ak && typeof ak === 'object' && ak.kind === undefined && (ak.answer !== undefined || ak.value !== undefined)) {
      const v = ak.value !== undefined ? ak.value : ak.answer;
      ak = typeof v === 'number' ? { kind: 'number', value: v } : { kind: 'exact_text', value: String(v) };
    }
    if (!ak || (ak.kind !== 'number' && ak.kind !== 'exact_text') || ak.value === undefined || ak.value === '') return null;
    return { ...x, answerKey: ak };
  };
  const items = (arr ?? []).map(normalizeItem).filter(Boolean).slice(0, bank.count);
  if (!items.length) {
    throw new Error(`Practice bank generation returned no usable items (raw head: ${result.content.slice(0, 240)})`);
  }
  return { items, raw: result.content, model: result.model, tokensUsed: result.tokensUsed };
}

function buildWriteContentPrompt(input: TaskInput): { system: string; user: string } {
  const ageContext = getAgeContext(input.ageBand);
  const visualStyle = input.designSpec?.visualStyle || 'colorful and friendly';

  const system = `You are a children's educational content writer. Write engaging, age-appropriate content for a lesson step.

Target audience: ${input.ageBand} age group (${ageContext}).
Visual style: ${visualStyle}

You must output ONLY valid JSON with this structure:
{
  "bodyText": "The main text content for this step (2-4 paragraphs for concept/example, 1-2 for intro/celebration)",
  "prompt": "A question or prompt to display to the learner (if applicable)",
  "narrativeHook": "An engaging hook or story element (if applicable)",
  "funFact": "An optional fun fact related to the topic"
}

Write in a warm, encouraging tone. Use simple language appropriate for the age group. Avoid jargon.`;

  const user = `Write content for this lesson step:
- Step type: ${input.stepType}
- Step title: ${input.stepTitle || 'Untitled step'}
- Subject: ${input.subject}
- Skill codes: ${(input.skillCodes || []).join(', ')}
${input.designSpec ? `- Lesson objectives: ${input.designSpec.objectives?.join(', ')}` : ''}
${input.designSpec ? `- Narrative arc: ${input.designSpec.narrativeArc}` : ''}

Write content that fits naturally into the lesson flow. The content should be engaging and educational.${sourceBlock(input.sourceText)}`;

  return { system, user };
}

function buildGenerateProblemPrompt(input: TaskInput): { system: string; user: string } {
  const system = `You are an expert problem designer for children's education. Create practice problems that are engaging, age-appropriate, and pedagogically sound.

You must output ONLY valid JSON with this structure:
{
  "prompt": "The problem statement presented to the learner",
  "answerKey": { "answer": "the correct answer", "explanation": "why this is correct" },
  "hintSet": ["Hint 1 (gentle)", "Hint 2 (more specific)", "Hint 3 (nearly gives it away)"],
  "choices": [{"id": "a", "label": "Option A", "correct": false}, {"id": "b", "label": "Option B", "correct": true}],
  "difficulty": 1
}

Include 3-4 multiple choice options for younger learners. Always include a clear explanation in the answer key. Provide 3 progressive hints.`;

  const user = `Create a practice problem for:
- Subject: ${input.subject}
- Age band: ${input.ageBand}
- Difficulty: ${input.difficulty || 1}/5
- Skill codes: ${(input.skillCodes || []).join(', ')}
- Step title: ${input.stepTitle || 'Practice'}

Make the problem concrete and relatable. Use real-world scenarios when possible. The problem should test understanding, not just memorization.${sourceBlock(input.sourceText)}`;

  return { system, user };
}

function buildCreateAssessmentPrompt(input: TaskInput): { system: string; user: string } {
  const system = `You are an assessment designer for children's education. Create a "predict-then-reveal" concept check question.

You must output ONLY valid JSON with this structure:
{
  "question": "The question to ask the learner",
  "choices": [
    {"id": "a", "label": "Choice A", "correct": false},
    {"id": "b", "label": "Choice B", "correct": true},
    {"id": "c", "label": "Choice C", "correct": false}
  ],
  "explanation": "Why the correct answer is right and others are wrong",
  "hint": "An optional hint to show if the learner is stuck",
  "xpReward": 10
}

Use 2-4 choices. Exactly one must be correct. The question should make the learner think before answering.`;

  const user = `Create a concept check assessment for:
- Step title: ${input.stepTitle || 'Concept Check'}
- Subject: ${input.subject}
- Age band: ${input.ageBand}
- Skill codes: ${(input.skillCodes || []).join(', ')}
${input.designSpec ? `- Lesson objectives: ${input.designSpec.objectives?.join(', ')}` : ''}

Design a question that checks understanding of the core concept. The explanation should be educational — even if the learner gets it wrong, they should learn from the explanation.${sourceBlock(input.sourceText)}`;

  return { system, user };
}

function buildGenerateImagePrompt(input: TaskInput): { system: string; user: string } {
  const visualStyle = input.designSpec?.visualStyle || input.visualStyle || 'colorful and friendly';

  const system = `You are a visual design spec writer for educational content. Create a detailed image generation prompt that will be used with an AI image generator.

You must output ONLY valid JSON with this structure:
{
  "illustrationPrompt": "A detailed prompt for generating the illustration",
  "diagramType": "Type of diagram if applicable (bar_chart, number_line, venn_diagram, none)",
  "altText": "Accessibility description of the image",
  "styleNotes": "Style guidance (colors, mood, composition)"
}

The illustration prompt should be specific enough for an AI image generator to produce a high-quality result. Include style, subject, composition, and mood.`;

  const user = `Create a visual spec for this lesson step:
- Step type: ${input.stepType}
- Step title: ${input.stepTitle || 'Untitled'}
- Subject: ${input.subject}
- Age band: ${input.ageBand}
- Visual style: ${visualStyle}

Generate an illustration prompt that will produce an engaging, age-appropriate image for this step. The image should support the learning objective, not just decorate.`;

  return { system, user };
}

function buildGenerateAudioPrompt(input: TaskInput): { system: string; user: string } {
  const system = `You are a narration script writer for educational content. Write a TTS-ready narration script for a lesson step.

You must output ONLY valid JSON with this structure:
{
  "narrationScript": "The full narration text, ready for text-to-speech",
  "ssmlMarks": [{"text": "word", "emphasis": "strong"}, ...],
  "estimatedDurationSeconds": 30
}

The narration should be warm, clear, and paced for the target age group. Use simple sentences for younger learners.`;

  const user = `Write narration for this lesson step:
- Step type: ${input.stepType}
- Step title: ${input.stepTitle || 'Untitled'}
- Age band: ${input.ageBand}

Write a narration script that a text-to-speech engine will read aloud. Keep it concise and engaging.`;

  return { system, user };
}

function getAgeContext(ageBand?: string): string {
  switch (ageBand) {
    case 'early': return 'ages 4-7, pre-K to 1st grade';
    case 'middle': return 'ages 8-10, 2nd to 4th grade';
    case 'tween': return 'ages 11-13, 5th to 7th grade';
    default: return 'elementary school age';
  }
}

// ─── Adapter registry ───────────────────────────────────────────────────────

type AdapterFn = (input: TaskInput) => Promise<TaskOutput>;

const adapters: Partial<Record<TaskType, { agentId: AgentId; execute: AdapterFn }>> = {
  design_spec: {
    agentId: 'claude-opus', // default; registry can rebind to any capable agent
    execute: async (input: TaskInput): Promise<TaskOutput> => {
      const { system, user } = buildDesignSpecPrompt(input);
      const result = await callGateway({
        taskType: 'design_spec',
        agentIdOverride: (input as any)._agentId,
        systemPrompt: system,
        userPrompt: user,
        responseFormat: 'json',
      });

      const parsed = extractJSON(result.content);
      if (!parsed) throw new Error('Failed to parse design spec JSON');

      return {
        designSpec: {
          objectives: parsed.objectives || [],
          narrativeArc: parsed.narrativeArc || '',
          visualStyle: parsed.visualStyle || 'colorful and friendly',
          interactionTypes: parsed.interactionTypes || [],
          targetSkills: parsed.targetSkills || [],
          adaptationNotes: parsed.adaptationNotes,
        },
        rawResponse: result.content,
        model: result.model,
        tokensUsed: result.tokensUsed,
      };
    },
  },

  write_content: {
    agentId: 'claude-opus', // default; registry can rebind
    execute: async (input: TaskInput): Promise<TaskOutput> => {
      const { system, user } = buildWriteContentPrompt(input);
      const result = await callGateway({
        taskType: 'write_content',
        agentIdOverride: (input as any)._agentId,
        systemPrompt: system,
        userPrompt: user,
        responseFormat: 'json',
      });

      const parsed = extractJSON(result.content);
      if (!parsed) throw new Error('Failed to parse content JSON');

      return {
        stepContent: {
          bodyText: parsed.bodyText || '',
          prompt: parsed.prompt || '',
          narrativeHook: parsed.narrativeHook || '',
          funFact: parsed.funFact || '',
        },
        rawResponse: result.content,
        model: result.model,
        tokensUsed: result.tokensUsed,
      };
    },
  },

  generate_problem: {
    agentId: 'gpt-5.5', // default; registry can rebind
    execute: async (input: TaskInput): Promise<TaskOutput> => {
      // Blueprint practice bank (ADR-0010 P2): count items with deterministic
      // answer keys for the session loop, grounded in the cited pages.
      if (input.practiceBank?.count) {
        const bank = await generatePracticeBank(input);
        return { items: bank.items, rawResponse: bank.raw, model: bank.model, tokensUsed: bank.tokensUsed };
      }
      const { system, user } = buildGenerateProblemPrompt(input);
      const result = await callGateway({
        taskType: 'generate_problem',
        agentIdOverride: (input as any)._agentId,
        systemPrompt: system,
        userPrompt: user,
        responseFormat: 'json',
      });

      const parsed = extractJSON(result.content);
      if (!parsed) throw new Error('Failed to parse problem JSON');

      return {
        stepContent: {
          prompt: parsed.prompt || '',
          answerKey: parsed.answerKey || {},
          hintSet: parsed.hintSet || [],
          choices: parsed.choices || [],
          difficulty: parsed.difficulty || 1,
        },
        rawResponse: result.content,
        model: result.model,
        tokensUsed: result.tokensUsed,
      };
    },
  },

  create_assessment: {
    agentId: 'gpt-5.5', // default; registry can rebind
    execute: async (input: TaskInput): Promise<TaskOutput> => {
      const { system, user } = buildCreateAssessmentPrompt(input);
      const result = await callGateway({
        taskType: 'create_assessment',
        agentIdOverride: (input as any)._agentId,
        systemPrompt: system,
        userPrompt: user,
        responseFormat: 'json',
      });

      const parsed = extractJSON(result.content);
      if (!parsed) throw new Error('Failed to parse assessment JSON');

      return {
        stepContent: {
          question: parsed.question || '',
          choices: parsed.choices || [],
          explanation: parsed.explanation || '',
          hint: parsed.hint || '',
          xpReward: parsed.xpReward || 10,
        },
        rawResponse: result.content,
        model: result.model,
        tokensUsed: result.tokensUsed,
      };
    },
  },

  generate_image: {
    agentId: 'gemini-image-pro', // LOCKED: must use vision-capable model (registry enforces)
    execute: async (input: TaskInput): Promise<TaskOutput> => {
      const { system, user } = buildGenerateImagePrompt(input);
      const result = await callGateway({
        taskType: 'generate_image',
        agentIdOverride: (input as any)._agentId,
        systemPrompt: system,
        userPrompt: user,
        responseFormat: 'json',
      });

      const parsed = extractJSON(result.content);
      if (!parsed) throw new Error('Failed to parse image spec JSON');

      return {
        asset: {
          assetType: 'illustration',
          generationPrompt: parsed.illustrationPrompt || '',
          altText: parsed.altText || '',
          assetData: {
            diagramType: parsed.diagramType || 'none',
            styleNotes: parsed.styleNotes || '',
          },
        },
        rawResponse: result.content,
        model: result.model,
        tokensUsed: result.tokensUsed,
      };
    },
  },

  generate_audio: {
    agentId: 'glm-5.2', // LOCKED: must use child-safe TTS model (registry enforces)
    execute: async (input: TaskInput): Promise<TaskOutput> => {
      const { system, user } = buildGenerateAudioPrompt(input);
      const result = await callGateway({
        taskType: 'generate_audio',
        agentIdOverride: (input as any)._agentId,
        systemPrompt: system,
        userPrompt: user,
        responseFormat: 'json',
      });

      const parsed = extractJSON(result.content);
      if (!parsed) throw new Error('Failed to parse audio script JSON');

      return {
        stepContent: {
          narrationScript: parsed.narrationScript || '',
          ssmlMarks: parsed.ssmlMarks || [],
          estimatedDurationSeconds: parsed.estimatedDurationSeconds || 30,
        },
        rawResponse: result.content,
        model: result.model,
        tokensUsed: result.tokensUsed,
      };
    },
  },

  review_content: {
    agentId: 'claude-opus', // default; registry can rebind
    execute: async (input: TaskInput): Promise<TaskOutput> => {
      const system = `You are an expert educational content reviewer. Evaluate the provided lesson content for pedagogical quality, accuracy, and age-appropriateness.

Output ONLY valid JSON:
{
  "verdict": "approved" | "rejected" | "revision_requested",
  "score": 0.0-1.0,
  "notes": "Detailed feedback",
  "suggestedChanges": [{"field": "bodyText", "current": "...", "suggested": "..."}]
}`;

      const user = `Review this lesson content:
- Step type: ${input.stepType}
- Step title: ${input.stepTitle}
- Subject: ${input.subject}
- Age band: ${input.ageBand}

Evaluate: Is it pedagogically sound? Is it accurate? Is it age-appropriate? Is it engaging?`;

      const result = await callGateway({
        taskType: 'review_content',
        agentIdOverride: (input as any)._agentId,
        systemPrompt: system,
        userPrompt: user,
        responseFormat: 'json',
      });

      const parsed = extractJSON(result.content);
      return {
        stepContent: parsed || { verdict: 'revision_requested', notes: 'Could not parse review' },
        rawResponse: result.content,
        model: result.model,
        tokensUsed: result.tokensUsed,
      };
    },
  },

  review_safety: {
    agentId: 'local-llm', // LOCKED: must use safety-trained model (registry enforces)
    execute: async (input: TaskInput): Promise<TaskOutput> => {
      const system = `You are a child safety content reviewer. Evaluate the provided lesson content for safety, ensuring it is appropriate for children.

Output ONLY valid JSON:
{
  "verdict": "approved" | "rejected",
  "score": 0.0-1.0,
  "notes": "Safety assessment notes",
  "flags": ["list of any safety concerns"]
}

Reject content that: contains violence, inappropriate themes, scary imagery, or is not suitable for the target age group.`;

      const user = `Safety review for:
- Step type: ${input.stepType}
- Step title: ${input.stepTitle}
- Age band: ${input.ageBand}
- Subject: ${input.subject}

Check for: age-appropriateness, safety, no harmful content.`;

      const result = await callGateway({
        taskType: 'review_safety',
        agentIdOverride: (input as any)._agentId,
        systemPrompt: system,
        userPrompt: user,
        responseFormat: 'json',
      });

      const parsed = extractJSON(result.content);
      return {
        stepContent: parsed || { verdict: 'rejected', notes: 'Could not parse safety review' },
        rawResponse: result.content,
        model: result.model,
        tokensUsed: result.tokensUsed,
      };
    },
  },
};

// ─── Public execution function ──────────────────────────────────────────────

export async function executeTask(
  taskType: TaskType,
  agentId: AgentId,
  input: TaskInput
): Promise<ExecuteResult> {
  const startTime = Date.now();
  const adapter = adapters[taskType];

  if (!adapter) {
    return {
      success: false,
      output: {},
      error: `No adapter registered for task type: ${taskType}`,
      durationMs: 0,
    };
  }

  try {
    // The agentId from the task record is passed as an override.
    // The registry will use it if the provider is enabled, otherwise
    // it falls back to the registry's resolved agent for this task type.
    // For locked tasks (generate_image, generate_audio, review_safety),
    // the registry enforces the binding regardless of the override.
    const inputWithAgent = { ...input, _agentId: agentId } as TaskInput & { _agentId: AgentId };
    const output = await adapter.execute(inputWithAgent);

    return {
      success: true,
      output,
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      output: {},
      error: error.message || 'Execution failed',
      durationMs: Date.now() - startTime,
    };
  }
}

export function getAdapterForTask(taskType: TaskType): { agentId: AgentId; execute: AdapterFn } | null {
  return adapters[taskType] || null;
}

export function listSupportedTaskTypes(): TaskType[] {
  return Object.keys(adapters) as TaskType[];
}
