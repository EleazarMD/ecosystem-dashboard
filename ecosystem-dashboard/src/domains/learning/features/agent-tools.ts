/**
 * Agent Tools — CORE tool implementations for the child learning agent loop.
 *
 * Contract: docs/FSD_AGENTIC_HARNESS.md §4.6 (Tool Roster + Tool Gate)
 *
 * Each tool is a pure function that takes arguments and returns a string
 * output. The AgentLoopService wraps each call with the Tool Gate
 * (allow-list check) and Safety Lane (input/output filtering).
 *
 * Tools map to existing dashboard surfaces:
 *   ask_socratic   → tutor prompt generation (AI Gateway)
 *   give_hint      → hintSet escalation
 *   check_answer   → attempt grading (server-side)
 *   define_word    → dictionary lookup
 *   explore_graph  → Pokémon Lab lesson launch
 */

import { ToolId } from '../shared/tool-roster';
import { activityRegistry } from '../shared/activity-types';
import { getTodayUsage } from '@/lib/parental-controls/usageTracker';
import {
  LEARN_TUTOR_MODEL,
  LEARN_TUTOR_CONTRACT,
} from './tutor-turn';
import { buildDeterministicTutorMessage } from './tutor-turn';
import type { MasteryContext, SessionPhase } from '../shared/agent-loop-types';
import type { AdaptationPlan } from '../learner/learner-types';
import { buildAdaptationDirective } from './adaptation-directive';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const CHILD_SAFETY_API_KEY = process.env.CHILD_SAFETY_API_KEY || 'child-safety-key';

// ─── Tool argument / output types ───────────────────────────────────────────

export interface ToolContext {
  childUserId: string;
  contentPrompt: string;
  contentItemId: string;
  skillCode: string;
  attemptNumber: number;
  hintSet: string[];
  safetySystemPrompt?: string;
  pcgContext?: {
    childName?: string;
    ageGroup?: string;
    interests?: string[];
    goals?: string[];
  } | null;
  /**
   * In-focus context frame — what is on the learner's screen right now. Lets the
   * tutor ground "explain this" in the exact card / Pokémon / quiz being viewed.
   * (Context Hub §3 → the wire that the transport now forwards.)
   */
  focus?: {
    title?: string;
    summary?: string;
    entities?: Record<string, string | number | string[]>;
  } | null;
  /** Current mastery signals for the learner. */
  mastery?: MasteryContext;
  /** Phase of the learning session this turn is in. */
  sessionPhase?: SessionPhase;
  /** Adaptation plan from AdaptationEngine (pacing, difficulty, hints, celebration). */
  adaptationPlan?: AdaptationPlan;
}

export interface ToolExecutionResult {
  output: string;
  /** Whether the tool call succeeded. */
  success: boolean;
}

// ─── ask_socratic: generate a Socratic tutoring prompt via AI Gateway ───────

export async function executeAskSocratic(
  args: { learnerMessage: string; strategy?: string },
  ctx: ToolContext,
): Promise<ToolExecutionResult> {
  const adaptationLines = ctx.adaptationPlan
    ? buildAdaptationDirective(ctx.adaptationPlan)
    : [];

  const systemPrompt = [
    'You are a child learning tutor. Be warm, brief, and age-appropriate.',
    'Tutor policy:',
    '- Use Socratic scaffolding. Do not reveal the final answer directly.',
    '- Give exactly one concrete next step at a time.',
    '- Praise effort and strategy, not fixed traits.',
    '- Keep guidance under 80 words.',
    '- Never manipulate, guilt, pressure, or emotionally influence the learner.',
    ...adaptationLines,
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
    `Learner message: ${args.learnerMessage}`,
    `Problem: ${ctx.contentPrompt}`,
    focusLine,
    `Attempt number: ${ctx.attemptNumber}`,
    args.strategy ? `Suggested strategy: ${args.strategy}` : '',
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
        max_tokens: 500,
        metadata: {
          user_type: 'child',
          content_filter: 'strict',
          service_id: 'learn_tutor_agent',
          tool: 'ask_socratic',
        },
      }),
    });

    if (!response.ok) {
      return { output: '', success: false };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { output: '', success: false };
    }
    return { output: content, success: true };
  } catch {
    return { output: '', success: false };
  }
}

// ─── give_hint: return the next hint from the hintSet ───────────────────────

export function executeGiveHint(
  args: { hintLevel?: number },
  ctx: ToolContext,
): ToolExecutionResult {
  const hintsAvailable = ctx.hintSet.length;
  if (hintsAvailable === 0) {
    return {
      output: 'No hints available for this problem. Try re-reading it carefully.',
      success: true,
    };
  }

  const level = args.hintLevel != null
    ? Math.min(args.hintLevel, hintsAvailable - 1)
    : Math.min(ctx.attemptNumber - 1, hintsAvailable - 1);

  const hint = ctx.hintSet[level];
  const label = `Hint ${level + 1} of ${hintsAvailable}: ${hint}`;

  return { output: label, success: true };
}

// ─── check_answer: verify a learner's answer (delegates to grading) ─────────

export function executeCheckAnswer(
  args: { learnerResponse: string },
  ctx: ToolContext,
): ToolExecutionResult {
  // The actual grading happens server-side via /api/learn/attempt.
  // This tool gives the agent a way to reason about the response without
  // doing the grading itself (grading stays server-side per §4.6).
  const snippet = args.learnerResponse.length > 100
    ? `${args.learnerResponse.slice(0, 100)}...`
    : args.learnerResponse;

  return {
    output: `The learner proposed: "${snippet}". Grade this via /api/learn/attempt to verify correctness. Do not reveal the answer.`,
    success: true,
  };
}

// ─── define_word: look up a word definition ─────────────────────────────────

export function executeDefineWord(
  args: { word: string },
  _ctx: ToolContext,
): ToolExecutionResult {
  // Simple kid-friendly definition placeholder.
  // In production this would call the dictionary API.
  const word = args.word.trim();
  if (!word) {
    return { output: 'No word provided to define.', success: false };
  }
  return {
    output: `"${word}" — look this up in the dictionary for a kid-friendly definition. Suggest the learner tap the word to see its meaning.`,
    success: true,
  };
}

// ─── explore_graph: suggest a Pokémon Lab lesson ────────────────────────────

export function executeExploreGraph(
  args: { lessonId?: string },
  _ctx: ToolContext,
): ToolExecutionResult {
  const lesson = args.lessonId
    ? `Pokémon Lab lesson: ${args.lessonId}`
    : 'Pokémon Lab — explore the knowledge graph interactively';

  return {
    output: `${lesson}. Open the Pokémon Lab to explore this topic. Completion will be tracked as measured learning.`,
    success: true,
  };
}

// ─── get_child_stats: fetch today's usage + progress facts ──────────────────

export async function executeGetChildStats(
  _args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolExecutionResult> {
  const childId = ctx.childUserId;
  if (!childId || childId === 'unknown') {
    return {
      output: 'Child user id is not available, so I cannot look up stats right now.',
      success: true,
    };
  }

  try {
    const usage = await getTodayUsage(childId);
    const minutes = usage.todayMinutes || 0;
    const limit = usage.limitMinutes || 0;
    const remaining = usage.remainingMinutes || 0;

    return {
      output: `Today: ${minutes} minutes spent on the platform. ${limit > 0 ? `Daily limit is ${limit} minutes, ${remaining} minutes remaining.` : 'No daily time limit is set.'} Keep up the great work!`,
      success: true,
    };
  } catch (error) {
    return {
      output: 'I could not fetch your stats right now. Try again in a moment!',
      success: false,
    };
  }
}

// ─── recommend_activity: pick the next activity to try ────────────────────────

export function executeRecommendActivity(
  args: { category?: string; exclude?: string },
  ctx: ToolContext,
): ToolExecutionResult {
  const requestedCategory = String(args.category || '').toLowerCase();
  const excludeId = String(args.exclude || '');
  const all = activityRegistry.all();

  const candidates = all.filter((a) => {
    if (excludeId && a.id === excludeId) return false;
    if (requestedCategory && a.category !== requestedCategory) return false;
    if (a.navVisible === false) return false;
    return true;
  });

  if (candidates.length === 0) {
    return {
      output: 'I looked around but could not find a perfect match. Want to try the Art Studio or Pokémon Lab?',
      success: true,
    };
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const name = ctx.pcgContext?.childName || 'friend';

  return {
    output: `How about ${pick.name} ${pick.icon || ''}? ${pick.description || ''} Tap it to get started!`,
    success: true,
  };
}

// ─── generate_problem: create a new practice problem ───────────────────────

export function executeGenerateProblem(
  args: { skillCode?: string; difficulty?: number },
  ctx: ToolContext,
): ToolExecutionResult {
  const skill = args.skillCode || ctx.skillCode || 'general-math';
  const difficulty = typeof args.difficulty === 'number' ? args.difficulty : 1;
  const name = ctx.pcgContext?.childName || 'friend';

  const problems: Record<string, string[]> = {
    'addition': ['What is 7 + 5?', 'What is 12 + 8?', 'What is 9 + 6?'],
    'subtraction': ['What is 15 - 7?', 'What is 20 - 9?', 'What is 14 - 6?'],
    'general-math': ['What is 4 × 6?', 'What is 24 ÷ 3?', 'What is 9 + 7?'],
    'spelling': ['How do you spell "friend"?', 'How do you spell "together"?', 'How do you spell "learn"?'],
    'reading': ['Read this sentence: "The cat sat on the mat."', 'Read this word: "adventure"', 'Read this word: "curious"'],
  };

  const bucket = problems[skill] || problems['general-math'];
  const pick = bucket[Math.min(difficulty, bucket.length - 1)];

  return {
    output: `Here is a practice problem for you, ${name}: ${pick} Take your time and give it your best try!`,
    success: true,
  };
}

// ─── Tool dispatcher ────────────────────────────────────────────────────────

export async function executeTool(
  toolId: ToolId,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolExecutionResult> {
  switch (toolId) {
    case 'ask_socratic':
      return executeAskSocratic(
        { learnerMessage: String(args.learnerMessage || ''), strategy: args.strategy as string | undefined },
        ctx,
      );
    case 'give_hint':
      return executeGiveHint(
        { hintLevel: args.hintLevel as number | undefined },
        ctx,
      );
    case 'check_answer':
      return executeCheckAnswer(
        { learnerResponse: String(args.learnerResponse || '') },
        ctx,
      );
    case 'define_word':
      return executeDefineWord(
        { word: String(args.word || '') },
        ctx,
      );
    case 'explore_graph':
      return executeExploreGraph(
        { lessonId: args.lessonId as string | undefined },
        ctx,
      );
    case 'get_child_stats':
      return executeGetChildStats(args, ctx);
    case 'recommend_activity':
      return executeRecommendActivity(
        { category: args.category as string | undefined, exclude: args.exclude as string | undefined },
        ctx,
      );
    case 'generate_problem':
      return executeGenerateProblem(
        { skillCode: args.skillCode as string | undefined, difficulty: args.difficulty as number | undefined },
        ctx,
      );
    case 'celebrate':
      return {
        output: `Great effort, ${ctx.pcgContext?.childName || 'friend'}! 🎉 You showed real persistence and smart thinking. Keep it up!`,
        success: true,
      };
    case 'draw_image':
      return {
        output: `The child wants to create art. Encourage them to use the canvas tools. Suggest a creative prompt based on what they're interested in.`,
        success: true,
      };
    case 'journal_write':
      return {
        output: `Help the child reflect. Ask a gentle, open-ended question about their day or feelings. Keep it warm and non-judgmental.`,
        success: true,
      };
    case 'read_with_me':
      return {
        output: `Offer to read the current passage aloud. Break long sentences into shorter parts. Ask a gentle comprehension question after.`,
        success: true,
      };
    case 'show_passage':
      return {
        output: `Display the current reading passage. If the child is stuck on a word, suggest tapping it for a definition.`,
        success: true,
      };
    case 'workspace_create_page':
    case 'workspace_add_block':
    case 'workspace_update_block':
    case 'workspace_delete_block':
    case 'workspace_get_pages':
    case 'workspace_search':
    case 'pokedex_search':
    case 'pokedex_detail':
    case 'pokedex_type_effectiveness':
    case 'pokedex_evolution':
    case 'pokedex_nl_query': {
      console.log(`[agent-tools] Dispatching ${toolId} to skillRegistry with args: ${JSON.stringify(args).slice(0, 200)}`);
      const { skillRegistry } = await import('../skills');
      const result = await skillRegistry.execute(toolId, args, ctx);
      console.log(`[agent-tools] skillRegistry ${toolId} result: success=${result.success} output=${result.output.slice(0, 200)}`);
      return result;
    }
    default:
      return { output: `Unknown tool: ${toolId}`, success: false };
  }
}

// ─── Deterministic fallback (agent_fallback path) ───────────────────────────

export function buildAgentFallbackMessage(input: {
  contentPrompt: string;
  attemptNumber: number;
  hint?: string;
  hintLevel?: number;
  hintsAvailable: number;
}): string {
  return buildDeterministicTutorMessage({
    prompt: input.contentPrompt,
    attemptNumber: input.attemptNumber,
    hint: input.hint,
    hintLevel: input.hintLevel,
    hintsAvailable: input.hintsAvailable,
  });
}
