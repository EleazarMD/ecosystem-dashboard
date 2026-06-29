/**
 * Pi Code Agent Transport — the Agent Execution Engine implementation.
 *
 * Contract: docs/FSD_AGENTIC_HARNESS.md §1.5 (Pi Code CLI)
 *           docs/KIDS_PLATFORM_CONTRACTS.md §4.1 (Agent Transport swap-point)
 *
 * This transport implements the cognitive loop (perceive → reason → plan →
 * act → reflect) using the AI Gateway as the LLM backend, the Context Hub
 * for ambient context, and the Tool Roster for gated tool selection.
 *
 * It mirrors the Pi Code CLI's ambient-context pattern (`.picode/ambient.json`):
 * - Providers with active/passive slots, priority, and a budgetTokens ceiling
 * - Focus tier is highest priority (never dropped)
 * - Long-form tier fills remaining budget by priority
 *
 * The loop:
 * 1. PERCEIVE — compose ContextEnvelope from the Context Hub
 * 2. REASON — ask the AI Gateway to interpret intent and select a tool
 * 3. PLAN — the AI response includes which tool to call next (or "final_answer")
 * 4. ACT — execute the gated tool (Tool Gate check + safety)
 * 5. REFLECT — observe the tool result, decide if another hop is needed
 * 6. Loop until final answer or budget exhausted
 *
 * Every hop passes the Tool Gate. Falls back to deterministic if the
 * AI Gateway is unavailable or the loop fails to converge.
 */

import {
  AgentTransport,
  AgentTransportRequest,
  AgentEvent,
  CompanionMessage,
  CompanionIntent,
  ConceptCheckPayload,
  HintCardPayload,
  ExampleCardPayload,
  CelebrationPayload,
  PassagePayload,
} from '../agent-transport';
import { ContextEnvelope, ContextFrame } from '../context-hub';
import { ToolRoster, ToolId, ToolDescriptor, checkToolGate } from '../tool-roster';
import { getContextHub, ComposedEnvelope } from '../context-hub-service';
import { executeTool, ToolContext } from '../../features/agent-tools';
import { activityRegistry } from '../activity-types';
import { getToolLabel } from '../tool-hop-labels';
import type { PersonaRef } from '../agent-transport';
import type { DevelopmentalSummary } from '../../learner/developmental-profile';
import { spawn } from 'child_process';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const CHILD_SAFETY_API_KEY = process.env.CHILD_SAFETY_API_KEY || 'child-safety-key';
const CHILD_AI_MODEL = process.env.CHILD_AI_MODEL || 'minimax-m3';

const MAX_HOPS = 4;
const PICODE_EXTERNAL_CLI = process.env.PICODE_EXTERNAL_CLI === 'true';
const PICODE_CLI_PATH = process.env.PICODE_CLI_PATH || 'npx ts-node src/scripts/picode-agent-cli.ts';

export type PiCodeRuntimeMode = 'in-process' | 'external-cli';

export function getPiCodeRuntimeMode(): PiCodeRuntimeMode {
  return PICODE_EXTERNAL_CLI ? 'external-cli' : 'in-process';
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ToolSelectionResponse {
  nextAction: ToolId | 'final_answer';
  arguments?: Record<string, unknown>;
  finalMessage?: string;
  reasoning?: string;
  conceptCheck?: ConceptCheckPayload;
  hintCard?: HintCardPayload;
  exampleCard?: ExampleCardPayload;
  celebration?: CelebrationPayload;
  passage?: PassagePayload;
}

interface HopResult {
  toolId: ToolId;
  success: boolean;
  output: string;
  reasoning?: string;
}

// ─── Token estimation ───────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─── System prompt builder ──────────────────────────────────────────────────

/**
 * Convert a DevelopmentalSummary (from the ContextEnvelope) into
 * LLM adaptation directives injected into the system prompt.
 */
function buildLearnerDirectivesFromSummary(d: DevelopmentalSummary): string {
  const pronoun = d.pronoun
    ? d.pronoun
    : d.gender === 'male' ? 'he'
    : d.gender === 'female' ? 'she'
    : 'they';
  const obj = pronoun === 'they' ? 'them' : pronoun === 'he' ? 'him' : 'her';

  const maxWords = d.ageBand === 'early' ? 50
    : d.ageBand === 'middle' ? 80
    : d.ageBand === 'tween' ? 120 : 200;
  const vocab = d.ageBand === 'early' ? 'simple'
    : d.ageBand === 'teen' ? 'rich' : 'moderate';

  const lines: string[] = [
    'LEARNER PROFILE:',
    `- Name context: age ${d.age} (${d.ageBand} band)`,
    `- Gender: ${d.gender} (use ${pronoun}/${obj} pronouns)`,
    `- Cognitive maturity: ${d.cognitiveLevel} (score: ${d.cognitiveMaturityScore.toFixed(2)})`,
    `- Reading level: ${d.readingLevel}`,
    `- Attention span: ${d.attentionSpan}`,
    `- Learning modality: ${d.learningModality}`,
    `- Pacing: ${d.pacingPreference}`,
    `- Difficulty: ${d.difficultyLevel}/5`,
    `- Celebration response: ${d.celebrationResponse}`,
  ];

  if (d.interests.length > 0) lines.push(`- Interests: ${d.interests.join(', ')}`);
  if (d.recentStruggles.length > 0) lines.push(`- Struggling with: ${d.recentStruggles.join(', ')}`);
  if (d.recentStrengths.length > 0) lines.push(`- Excelling at: ${d.recentStrengths.join(', ')}`);

  lines.push('');
  lines.push('ADAPTATION RULES:');
  lines.push(`- Keep responses under ${maxWords} words.`);
  lines.push(`- Use ${vocab} vocabulary.`);

  if (d.cognitiveLevel === 'emerging') {
    lines.push(
      '- Break concepts into very small steps. Use concrete, tangible examples.',
      '- Repeat key ideas. Offer lots of encouragement.',
    );
  } else if (d.cognitiveLevel === 'developing') {
    lines.push(
      '- Use scaffolding: model, then guide, then let them try.',
      '- Connect new ideas to things they already know.',
    );
  } else if (d.cognitiveLevel === 'proficient') {
    lines.push(
      '- Introduce richer vocabulary and multi-step reasoning.',
      '- Ask stretch questions. Let the child lead exploration.',
    );
  } else {
    lines.push(
      '- Offer complex, open-ended challenges.',
      '- Encourage teaching back as a mastery check.',
    );
  }

  if (d.attentionSpan === 'short') {
    lines.push('- Keep interactions punchy. Change stimulus every 2-3 minutes.');
  } else if (d.attentionSpan === 'long') {
    lines.push('- Longer explanations and deeper dives are OK.');
  }

  if (d.celebrationResponse === 'shy') {
    lines.push('- Use gentle, quiet praise. Avoid exclamation-heavy celebration.');
  } else if (d.celebrationResponse === 'energized') {
    lines.push('- Use enthusiastic, high-energy celebration with emojis!');
  } else {
    lines.push('- Use measured, factual praise.');
  }

  if (d.readingLevel === 'below-grade') {
    lines.push('- Use shorter sentences. Define unfamiliar words immediately.');
  } else if (d.readingLevel === 'above-grade') {
    lines.push('- Richer text and longer passages are welcome.');
  }

  if (d.learningModality === 'visual') {
    lines.push('- Describe images, use spatial metaphors, suggest drawing.');
  } else if (d.learningModality === 'auditory') {
    lines.push('- Use rhythm, rhyme, and verbal repetition cues.');
  } else if (d.learningModality === 'kinesthetic') {
    lines.push('- Suggest hands-on activities and physical metaphors.');
  }

  if (d.pacingPreference === 'slow') {
    lines.push('- Pace slowly. One idea at a time. Check understanding.');
  } else if (d.pacingPreference === 'fast') {
    lines.push('- Pace briskly. Move to the next challenge.');
  }

  return lines.join('\n');
}

function buildSystemPrompt(
  roster: ToolRoster,
  persona?: PersonaRef,
  safetySystemPrompt?: string,
  activityId?: string,
  developmental?: DevelopmentalSummary,
): string {
  const toolList = roster.tools
    .map((t) => `- ${t.id}: ${t.description}`)
    .join('\n');

  const personaLine = persona?.systemPrompt
    ? `\nPersona: ${persona.systemPrompt}`
    : '';

  const safetyLine = safetySystemPrompt
    ? `\nSafety: ${safetySystemPrompt}`
    : '';

  // §10: Activity-specific rules come from the registry's agentRules field.
  // All activities with specialized coaching (Learning Path, Pokémon Lab, Workspace)
  // have their rules centralized in the registry. The default fallback is the
  // general tutor prompt for activities without agentRules (Free Chat, Home, etc.).
  const registeredActivity = activityId ? activityRegistry.get(activityId) : undefined;

  const activityRules = registeredActivity?.agentRules
    ? registeredActivity.agentRules
    : [
        'You are a warm, world-class tutor for a child — like a great human tutor who',
        'makes concepts click. You run a cognitive loop and pick tools to help the',
        'learner take one safe, concrete next step.',
        '',
        'Available tools:',
        toolList,
        '',
        'Core rules:',
        '- Select exactly one tool per turn, or return "final_answer" with your message.',
        '- Use Socratic scaffolding. Never reveal the final answer directly.',
        '- Give exactly one concrete next step at a time.',
        '- Praise effort and strategy, not fixed traits.',
        '- Keep guidance under 80 words.',
        '- If the learner is stuck, use "give_hint".',
        '- If the learner proposes an answer, use "check_answer" then "final_answer".',
        '- If a word needs defining, use "define_word".',
        '- For exploration activities, use "explore_graph".',
        '- If the learner asks about time spent, streak, progress, or "how am I doing", use "get_child_stats" first.',
        '- If the learner asks what to do next, use "recommend_activity" first.',
        '- If the learner wants a practice problem, use "generate_problem" first.',
        '- Be warm, age-appropriate, and encouraging.',
        '',
        'Adapt to exactly where the learner is (read "Mastery" in the context):',
        '- High mastery (>= 0.8 for the current skill): raise the challenge, move faster,',
        '  ask a stretch question.',
        '- Low mastery (<= 0.4): slow down, take smaller steps, give more encouragement,',
        '  and connect to something they already know.',
        '- Reference recent topics to make it feel personal and connected.',
        '',
        'Teach by showing, not just telling. When it helps understanding, include an',
        'interactive concept-check in your final_answer: a short multiple-choice question',
        'that makes the learner PREDICT before they see the answer. Getting it wrong is',
        'fine — the "explanation" is where the learning happens.',
        '- conceptCheck format: {"question": "...", "choices": [{"id":"a","label":"...","correct":true|false}, ...],',
        '  "explanation": "the why, 1-2 sentences", "hint": "a Socratic nudge", "skillCode": "<skill>"}',
        '- Provide 2-4 choices, exactly one correct. Keep labels short.',
        '- Only include conceptCheck when it genuinely aids learning; omit it for pure chat.',
        '',
        'Rich message types (include in final_answer JSON when they help learning):',
        '- hintCard: {"hints": ["nudge 1", "bigger nudge 2", ...], "currentLevel": 1} — tiered hint ladder',
        '- exampleCard: {"title": "Worked Example", "steps": ["step 1", "step 2", ...]} — step-by-step reveal',
        '- celebration: {"emoji": "🎉", "message": "You got it!", "xpGained": 10} — praise burst',
        '- passage: {"title": "Reading", "text": "..."} — embedded reading with read-aloud',
        'Only include these when they genuinely add value; omit for simple chat.',
      ];

  // Build learner directives from developmental profile (if available)
  const learnerDirectives = developmental
    ? buildLearnerDirectivesFromSummary(developmental)
    : '';

  return [
    ...activityRules,
    learnerDirectives ? '' : '',
    learnerDirectives,
    '',
    'Respond as JSON: {"nextAction": "<tool_id or final_answer>", "arguments": {...},',
    '"finalMessage": "...", "reasoning": "...", "conceptCheck": { ... } (optional),',
    '"hintCard": { ... } (optional), "exampleCard": { ... } (optional),',
    '"celebration": { ... } (optional), "passage": { ... } (optional)}',
    'If unsure which tool to call, return "final_answer" with a warm question instead of guessing.',
    personaLine,
    safetyLine,
  ].filter(Boolean).join('\n');
}

// ─── User prompt builder (context-aware) ────────────────────────────────────

function buildUserPrompt(
  message: string,
  envelope: ContextEnvelope,
  previousHops: HopResult[],
): string {
  const focus = envelope.focus;
  const learner = envelope.learner;

  // Focus tier — what's on screen
  const focusLines = [
    focus.title ? `On screen: ${focus.title}` : '',
    focus.summary ? `Learner is looking at: ${focus.summary}` : '',
    focus.entities && Object.keys(focus.entities).length
      ? `Details: ${JSON.stringify(focus.entities)}`
      : '',
  ].filter(Boolean).join('\n');

  // Long-form tier — learner model
  const learnerLines = learner
    ? [
        learner.childName ? `Name: ${learner.childName}` : '',
        learner.ageBand ? `Age band: ${learner.ageBand}` : '',
        learner.skillMastery
          ? `Mastery: ${Object.entries(learner.skillMastery)
              .map(([k, v]) => `${k}=${v.toFixed(2)}`)
              .join(', ')}`
          : '',
        learner.recentTopics?.length
          ? `Recent topics: ${learner.recentTopics.join(', ')}`
          : '',
        learner.developmental
          ? `Developmental: age=${learner.developmental.age}, cognitive=${learner.developmental.cognitiveLevel} (${learner.developmental.cognitiveMaturityScore.toFixed(2)}), reading=${learner.developmental.readingLevel}, attention=${learner.developmental.attentionSpan}, modality=${learner.developmental.learningModality}`
          : '',
        learner.recentInsights?.length
          ? `Recent insights from overnight consolidation: ${learner.recentInsights.join('; ')}`
          : '',
      ].filter(Boolean).join('\n')
    : '';

  // Hop history
  const hopHistory = previousHops.length > 0
    ? previousHops
        .map((h, i) => `  Hop ${i + 1}: ${h.toolId} → ${h.output.slice(0, 120)}`)
        .join('\n')
    : '  (no previous hops)';

  return [
    `Learner message: ${message}`,
    focusLines,
    learnerLines,
    '',
    'Previous hops this turn:',
    hopHistory,
    '',
    'What tool should you call next, or do you have a final answer?',
  ].filter(Boolean).join('\n');
}

// ─── Parse AI Gateway response ──────────────────────────────────────────────

/**
 * Defensively validate a model-produced concept-check. Returns undefined unless
 * it has a question, 2-4 choices, and exactly one correct choice — so a
 * malformed card can never reach the UI.
 */
export function sanitizeConceptCheck(raw: unknown): ConceptCheckPayload | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const question = typeof obj.question === 'string' ? obj.question.trim() : '';
  const explanation = typeof obj.explanation === 'string' ? obj.explanation.trim() : '';
  if (!question || !explanation) return undefined;

  const rawChoices = Array.isArray(obj.choices) ? obj.choices : [];
  const choices = rawChoices
    .map((c, i) => {
      const co = (c || {}) as Record<string, unknown>;
      const label = typeof co.label === 'string' ? co.label.trim() : '';
      if (!label) return null;
      return {
        id: typeof co.id === 'string' && co.id ? co.id : String.fromCharCode(97 + i),
        label,
        correct: co.correct === true,
      };
    })
    .filter((c): c is { id: string; label: string; correct: boolean } => c !== null);

  if (choices.length < 2 || choices.length > 4) return undefined;
  if (choices.filter((c) => c.correct).length !== 1) return undefined;

  return {
    question,
    choices,
    explanation,
    hint: typeof obj.hint === 'string' ? obj.hint.trim() : undefined,
    skillCode: typeof obj.skillCode === 'string' ? obj.skillCode : undefined,
  };
}

function sanitizeHintCard(raw: unknown): HintCardPayload | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const rawHints = Array.isArray(obj.hints) ? obj.hints : [];
  const hints = rawHints
    .map((h) => (typeof h === 'string' ? h.trim() : ''))
    .filter((h) => h.length > 0);
  if (hints.length === 0) return undefined;
  const currentLevel = typeof obj.currentLevel === 'number' ? Math.max(1, Math.min(obj.currentLevel, hints.length)) : 1;
  return { hints, currentLevel };
}

function sanitizeExampleCard(raw: unknown): ExampleCardPayload | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const rawSteps = Array.isArray(obj.steps) ? obj.steps : [];
  const steps = rawSteps
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter((s) => s.length > 0);
  if (!title || steps.length === 0) return undefined;
  return { title, steps };
}

function sanitizeCelebration(raw: unknown): CelebrationPayload | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const emoji = typeof obj.emoji === 'string' ? obj.emoji.trim() : '';
  const message = typeof obj.message === 'string' ? obj.message.trim() : '';
  if (!emoji || !message) return undefined;
  const xpGained = typeof obj.xpGained === 'number' ? Math.max(0, Math.min(obj.xpGained, 100)) : 0;
  return { emoji, message, xpGained };
}

function sanitizePassage(raw: unknown): PassagePayload | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const text = typeof obj.text === 'string' ? obj.text.trim() : '';
  if (!title || !text) return undefined;
  return { title, text };
}

function parseToolSelection(data: unknown): ToolSelectionResponse | null {
  try {
    const obj = data as Record<string, unknown>;
    const nextAction = obj.nextAction as string | undefined;
    if (!nextAction) return null;

    return {
      nextAction: nextAction as ToolId | 'final_answer',
      arguments: (obj.arguments as Record<string, unknown>) || {},
      finalMessage: obj.finalMessage as string | undefined,
      reasoning: obj.reasoning as string | undefined,
      conceptCheck: sanitizeConceptCheck(obj.conceptCheck),
      hintCard: sanitizeHintCard(obj.hintCard),
      exampleCard: sanitizeExampleCard(obj.exampleCard),
      celebration: sanitizeCelebration(obj.celebration),
      passage: sanitizePassage(obj.passage),
    };
  } catch {
    return null;
  }
}

// ─── Call AI Gateway for tool selection ─────────────────────────────────────

async function selectNextTool(
  message: string,
  envelope: ContextEnvelope,
  roster: ToolRoster,
  persona: PersonaRef | undefined,
  safetySystemPrompt: string | undefined,
  previousHops: HopResult[],
  hop: number,
): Promise<ToolSelectionResponse | null> {
  const activityId = envelope.focus.activityId;
  const developmental = envelope.learner?.developmental;
  const systemPrompt = buildSystemPrompt(roster, persona, safetySystemPrompt, activityId, developmental);
  const userPrompt = buildUserPrompt(message, envelope, previousHops);
  const isWorkspace = activityId === 'workspace';
  const isPokemonLab = activityId === 'pokemon-lab';
  const needsMoreTokens = isWorkspace || isPokemonLab;

  console.log(`[picode-transport] selectNextTool hop=${hop} activityId=${activityId} message="${message.slice(0, 80)}"`);
  console.log(`[picode-transport] systemPrompt (first 300 chars): ${systemPrompt.slice(0, 300)}`);
  console.log(`[picode-transport] roster tools: [${roster.tools.map(t => t.id).join(', ')}]`);

  try {
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CHILD_SAFETY_API_KEY}`,
      },
      body: JSON.stringify({
        model: CHILD_AI_MODEL,
        messages: [
          ...(safetySystemPrompt ? [{ role: 'system', content: safetySystemPrompt }] : []),
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: needsMoreTokens ? 1200 : 600,
        metadata: {
          user_type: 'child',
          content_filter: 'strict',
          service_id: 'picode_agent_loop',
          hop,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`[picode-transport] AI Gateway returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      console.warn('[picode-transport] AI Gateway returned empty content');
      return null;
    }

    console.log(`[picode-transport] AI response (first 500 chars): ${content.slice(0, 500)}`);

    // The model may return JSON or markdown-wrapped JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[picode-transport] No JSON found in AI response');
      return null;
    }

    const parsed = parseToolSelection(JSON.parse(jsonMatch[0]));
    console.log(`[picode-transport] Parsed tool selection: nextAction=${parsed?.nextAction} args=${JSON.stringify(parsed?.arguments)} finalMessage=${parsed?.finalMessage?.slice(0, 100) ?? '(none)'}`);
    return parsed;
  } catch (error) {
    console.warn('[picode-transport] tool selection failed:', error);
    return null;
  }
}

// ─── Execute a gated tool hop ───────────────────────────────────────────────

async function executeGatedHop(
  toolId: ToolId,
  args: Record<string, unknown>,
  roster: ToolRoster,
  ctx: ToolContext,
): Promise<HopResult> {
  const gate = checkToolGate(roster, toolId);
  console.log(`[picode-transport] executeGatedHop toolId=${toolId} allowed=${gate.allowed} reason=${gate.reason}`);

  if (!gate.allowed) {
    console.warn(`[picode-transport] Tool Gate DENIED: ${toolId} — ${gate.reason}`);
    return {
      toolId,
      success: false,
      output: `Tool "${toolId}" denied by Tool Gate: ${gate.reason}`,
    };
  }

  const execResult = await executeTool(toolId, args, ctx);
  console.log(`[picode-transport] Tool ${toolId} result: success=${execResult.success} output (first 200 chars)=${execResult.output.slice(0, 200)}`);

  return {
    toolId,
    success: execResult.success,
    output: execResult.output,
  };
}

// ─── Build tool context from envelope ───────────────────────────────────────

function buildToolContext(
  envelope: ContextEnvelope,
  childUserId: string,
): ToolContext {
  const focus = envelope.focus;
  return {
    childUserId,
    contentPrompt: focus.payload?.prompt as string || focus.summary || '',
    contentItemId: (focus.entities?.contentItemId as string) || (focus.entities?.lessonId as string) || '',
    skillCode: (focus.entities?.skillCode as string) || '',
    attemptNumber: (focus.entities?.attemptNumber as number) || 1,
    hintSet: (focus.payload?.hintSet as string[]) || [],
    safetySystemPrompt: undefined, // set by the API route
    pcgContext: envelope.learner
      ? {
          childName: envelope.learner.childName,
          ageGroup: envelope.learner.ageBand,
        }
      : null,
    focus: {
      title: focus.title,
      summary: focus.summary,
      entities: focus.entities,
    },
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── External CLI streaming helper ──────────────────────────────────────────

async function* streamExternalCli(
  req: AgentTransportRequest,
): AsyncIterable<AgentEvent> {
  const [cmd, ...args] = PICODE_CLI_PATH.split(' ');
  const child = spawn(cmd, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PICODE_EXTERNAL_CLI: 'false' },
  });

  let stderr = '';
  child.stderr.on('data', (data: Buffer) => {
    stderr += data.toString('utf-8');
  });

  const requestJson = JSON.stringify(req);
  child.stdin.write(requestJson);
  child.stdin.end();

  const buffer: Buffer[] = [];
  for await (const chunk of child.stdout) {
    buffer.push(Buffer.from(chunk));
  }
  const output = Buffer.concat(buffer).toString('utf-8');

  const exitCode = await new Promise<number>((resolve) => {
    child.on('close', (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0 && !output.trim()) {
    yield { type: 'error', error: `PiCode CLI exited ${exitCode}: ${stderr || 'unknown error'}` };
    return;
  }

  for (const line of output.split('\n').filter((l) => l.trim())) {
    try {
      const event = JSON.parse(line) as AgentEvent;
      yield event;
    } catch {
      // Ignore non-JSON lines
    }
  }
}

// ─── PiCodeTransport class ──────────────────────────────────────────────────

/**
 * Pi Code Agent Transport — implements the cognitive loop with the AI Gateway
 * as the LLM backend, using the Context Hub for ambient context and the Tool
 * Roster for gated tool selection.
 *
 * This is the Agent Execution Engine (FSD §1.5). It runs the loop; the harness
 * rails (Policy Gate, Safety Lane, Evaluation) bound it from outside.
 */
export class PiCodeTransport implements AgentTransport {
  private hub = getContextHub();

  async *stream(req: AgentTransportRequest): AsyncIterable<AgentEvent> {
    if (PICODE_EXTERNAL_CLI) {
      yield* streamExternalCli(req);
      return;
    }

    try {
      // 1. PERCEIVE — compose the ContextEnvelope from the Hub
      let composed: ComposedEnvelope;
      try {
        composed = await this.hub.composeEnvelope();
      } catch {
        // No focus set — build a minimal envelope from the request
        const fallbackFrame: ContextFrame = {
          kind: 'conversation',
          activityId: 'free-chat',
          title: 'Chat',
          summary: 'The child is in a conversation.',
        };
        composed = {
          envelope: {
            focus: fallbackFrame,
            safety: { contentFilter: 'strict', user_type: 'child' },
            assembledAt: new Date().toISOString(),
          },
          roster: req.roster || { id: 'core', tools: [] },
          persona: req.persona,
          budget: { totalTokens: 3000, used: 0, dropped: [] },
        };
      }

      const { envelope, roster, persona } = composed;

      // Extract the user message
      const lastUserMsg = [...req.messages].reverse().find((m) => m.role === 'user');
      const message = lastUserMsg?.content ?? '';
      if (!message) {
        yield { type: 'error', error: 'No user message provided' };
        return;
      }

      // 2-5. Run the cognitive loop
      const hops: HopResult[] = [];
      let finalMessage = '';
      let conceptCheck: ConceptCheckPayload | undefined;
      let hintCard: HintCardPayload | undefined;
      let exampleCard: ExampleCardPayload | undefined;
      let celebration: CelebrationPayload | undefined;
      let passage: PassagePayload | undefined;
      let budgetExhausted = false;

      const ctx = buildToolContext(envelope, req.childUserId || envelope.learner?.childUserId || 'unknown');

      for (let hop = 0; hop < MAX_HOPS; hop++) {
        // REASON + PLAN: ask the AI which tool to call next
        const selection = await selectNextTool(
          message,
          envelope,
          roster,
          persona,
          req.context?.safety ? undefined : undefined, // safety prompt handled by API route
          hops,
          hop,
        );

        if (!selection) {
          // AI Gateway call failed — retry once before giving up
          console.warn(`[picode-transport] hop ${hop}: selectNextTool returned null, retrying`);
          const retry = await selectNextTool(message, envelope, roster, persona, undefined, hops, hop);
          if (!retry) {
            console.error(`[picode-transport] hop ${hop}: selectNextTool retry also failed`);
            yield { type: 'error', error: 'AI Gateway unavailable — please try again' };
            return;
          }
          // Process retry result the same way
          if (retry.nextAction === 'final_answer') {
            finalMessage = retry.finalMessage || '';
            conceptCheck = retry.conceptCheck;
            hintCard = retry.hintCard;
            exampleCard = retry.exampleCard;
            celebration = retry.celebration;
            passage = retry.passage;
            break;
          }
          // Execute the tool from retry
          const retryLabel = getToolLabel(retry.nextAction);
          yield { type: 'hop', toolId: retry.nextAction, label: retryLabel.label, emoji: retryLabel.emoji };
          const retryResult = await executeGatedHop(retry.nextAction, retry.arguments || {}, roster, ctx);
          hops.push(retryResult);
          yield { type: 'chunk', text: retryResult.success ? retryResult.output : '' };
          if (!retryResult.success && hop === MAX_HOPS - 1) budgetExhausted = true;
          continue;
        }

        // If the AI says "final_answer", we're done
        if (selection.nextAction === 'final_answer') {
          console.log(`[picode-transport] hop ${hop}: final_answer — message="${(selection.finalMessage || '').slice(0, 200)}"`);
          finalMessage = selection.finalMessage || '';
          conceptCheck = selection.conceptCheck;
          hintCard = selection.hintCard;
          exampleCard = selection.exampleCard;
          celebration = selection.celebration;
          passage = selection.passage;
          break;
        }

        console.log(`[picode-transport] hop ${hop}: executing tool ${selection.nextAction}`);

        // ACT: execute the gated tool
        const toolLabel = getToolLabel(selection.nextAction);

        // Stream the hop event for tool-hop visualization
        yield {
          type: 'hop',
          toolId: selection.nextAction,
          label: toolLabel.label,
          emoji: toolLabel.emoji,
        };

        const hopResult = await executeGatedHop(
          selection.nextAction,
          selection.arguments || {},
          roster,
          ctx,
        );

        hops.push(hopResult);

        // Stream the tool output as a chunk
        yield {
          type: 'chunk',
          text: hopResult.success ? hopResult.output : '',
        };

        // If the tool failed, try one more reasoning hop
        if (!hopResult.success && hop === MAX_HOPS - 1) {
          budgetExhausted = true;
        }
      }

      // If we didn't get a final message, do one final reasoning call
      if (!finalMessage) {
        console.log(`[picode-transport] No final message after ${MAX_HOPS} hops, doing final reasoning call. Hops so far: [${hops.map(h => h.toolId).join(', ')}]`);
        const finalSelection = await selectNextTool(
          message,
          envelope,
          roster,
          persona,
          undefined,
          hops,
          MAX_HOPS,
        );
        if (finalSelection?.finalMessage) {
          finalMessage = finalSelection.finalMessage;
          conceptCheck = conceptCheck ?? finalSelection.conceptCheck;
          hintCard = hintCard ?? finalSelection.hintCard;
          exampleCard = exampleCard ?? finalSelection.exampleCard;
          celebration = celebration ?? finalSelection.celebration;
          passage = passage ?? finalSelection.passage;
        } else {
          console.error('[picode-transport] Final reasoning call failed — no AI response available');
          yield { type: 'error', error: 'AI Gateway unavailable — please try again' };
          return;
        }
      }

      // Emit the final message as a chunk
      yield { type: 'chunk', text: finalMessage };

      const companionMessage: CompanionMessage = {
        id: generateId(),
        role: 'assistant',
        content: finalMessage,
        timestamp: Date.now(),
        intent: req.intent,
        conceptCheck,
        hintCard,
        exampleCard,
        celebration,
        passage,
        metadata: {
          source: 'picode_agent_loop',
          toolsUsed: hops.map((h) => h.toolId),
          hops: hops.length,
          budgetExhausted,
        },
      };

      // 6. REFLECT — record outcome for write-back
      await this.hub.recordOutcome({
        childId: envelope.focus.activityId,
        activityId: envelope.focus.activityId,
        message,
        response: finalMessage,
        toolsUsed: hops.map((h) => h.toolId),
        source: 'picode_agent_loop',
      });

      yield { type: 'done', message: companionMessage };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      yield { type: 'error', error: errorMsg };
    }
  }

  async send(req: AgentTransportRequest): Promise<CompanionMessage> {
    let result: CompanionMessage | null = null;

    for await (const event of this.stream(req)) {
      if (event.type === 'done') {
        result = event.message;
      }
      if (event.type === 'error') {
        throw new Error(event.error);
      }
    }

    if (!result) {
      throw new Error('PiCodeTransport produced no result');
    }
    return result;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _picodeTransport: PiCodeTransport | null = null;

/** Get the singleton PiCodeTransport instance. */
export function getPiCodeTransport(): PiCodeTransport {
  if (!_picodeTransport) {
    _picodeTransport = new PiCodeTransport();
  }
  return _picodeTransport;
}

/**
 * Run a single agent turn with the Pi Code transport.
 * Convenience for server-side use (API routes).
 */
export async function runAgentTurn(input: {
  message: string;
  intent?: CompanionIntent;
  activityId?: string;
  childUserId: string;
  safetySystemPrompt?: string;
  roster?: ToolRoster;
  persona?: PersonaRef;
}): Promise<{
  message: string;
  source: string;
  toolsUsed: string[];
  hops: number;
}> {
  const transport = getPiCodeTransport();
  const hub = getContextHub();

  // Set focus if an activity id is provided
  if (input.activityId) {
    hub.setFocus(input.activityId);
  }

  const req: AgentTransportRequest = {
    messages: [
      {
        id: generateId(),
        role: 'user',
        content: input.message,
        timestamp: Date.now(),
        intent: input.intent,
      },
    ],
    intent: input.intent || 'talk',
    context: await hub.composeEnvelope().then((c) => c.envelope).catch(() => ({
      focus: {
        kind: 'conversation' as const,
        activityId: input.activityId || 'free-chat',
        title: 'Chat',
      },
      safety: { contentFilter: 'strict' as const, user_type: 'child' as const },
      assembledAt: new Date().toISOString(),
    })),
    persona: input.persona,
    roster: input.roster,
  };

  const result = await transport.send(req);

  return {
    message: result.content,
    source: result.metadata?.source || 'picode_agent_loop',
    toolsUsed: result.metadata?.toolsUsed || [],
    hops: result.metadata?.hops || 0,
  };
}
