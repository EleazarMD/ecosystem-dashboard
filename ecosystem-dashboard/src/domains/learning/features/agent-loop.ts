/**
 * Agent Loop Service — runs the cognitive loop (perceive → reason → plan → act
 * → reflect) with autonomous tool selection, replacing the single-shot LLM call.
 *
 * Contract: docs/FSD_AGENTIC_HARNESS.md §1.3 (cognitive loop) + §1.5 (Pi Code CLI)
 *           docs/KIDS_DASHBOARD_HARNESS_AUDIT.md Phase 6
 *
 * The loop:
 * 1. PERCEIVE — read learner message + context + content item state
 * 2. REASON — ask the AI Gateway to interpret intent and select a tool
 * 3. PLAN — the AI response includes which tool to call next (or "final_answer")
 * 4. ACT — execute the gated tool (Tool Gate check + safety lane)
 * 5. REFLECT — observe the tool result, decide if another hop is needed
 * 6. Loop until final answer or budget exhausted
 *
 * Every hop passes the Tool Gate. The deterministic fallback fires if the
 * AI Gateway is unavailable or the loop fails to converge.
 */

import { randomUUID } from 'crypto';
import { checkToolGate } from '../shared/tool-roster';
import type { ToolRoster, ToolId, ToolGateResult } from '../shared/tool-roster';
import { getToolApprovalService } from '../parent/tool-approval-service';
import type {
  AgentLoopInput,
  AgentLoopResult,
  ToolCall,
  ToolResult,
  ToolTrajectoryEntry,
  ConversationTurn,
  MasteryContext,
  SessionPhase,
} from '../shared/agent-loop-types';
import type { AdaptationPlan } from '../learner/learner-types';
import type { HarnessSafetyResult } from '@/lib/harness/types';
import { executeTool, buildAgentFallbackMessage, type ToolContext } from './agent-tools';
import { buildAdaptationDirective } from './adaptation-directive';
import {
  LEARN_TUTOR_MODEL,
  LEARN_TUTOR_CONTRACT,
} from './tutor-turn';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const CHILD_SAFETY_API_KEY = process.env.CHILD_SAFETY_API_KEY || 'child-safety-key';

const LEARN_AGENT_LOOP_MODEL = LEARN_TUTOR_MODEL;
const LEARN_AGENT_LOOP_CONTRACT = LEARN_TUTOR_CONTRACT;

// ─── AI Gateway response shape for tool selection ───────────────────────────

interface ToolSelectionResponse {
  /** Which tool to call, or 'final_answer' to stop. */
  nextAction: ToolId | 'final_answer';
  /** Arguments for the tool call. */
  arguments?: Record<string, unknown>;
  /** The final message if nextAction is 'final_answer'. */
  finalMessage?: string;
  /** Reasoning trace (for audit). */
  reasoning?: string;
}

// ─── Tool selection prompt ──────────────────────────────────────────────────

function buildToolSelectionSystemPrompt(roster: ToolRoster, sessionPhase?: SessionPhase, adaptationPlan?: AdaptationPlan): string {
  const toolList = roster.tools
    .map((t) => `- ${t.id}: ${t.description}`)
    .join('\n');

  const phaseGuidance: Record<SessionPhase, string> = {
    opening: [
      'SESSION PHASE: OPENING',
      'The learner is starting a new session. Your job is to:',
      '- Greet them warmly by name (if available in PCG context)',
      '- Set a simple goal for today (e.g. "let us practice 3 problems")',
      '- Build excitement with a preview of what they will learn',
      '- Keep it short and energizing. Use "final_answer" with your greeting.',
    ].join('\n'),
    coaching: [
      'SESSION PHASE: COACHING',
      'The learner got an answer wrong. Your job is to:',
      '- Coach them to the correct answer without revealing it',
      '- Use "give_hint" if hints are available',
      '- Use "ask_socratic" to guide their thinking',
      '- Reference what they tried and help them see where to adjust',
    ].join('\n'),
    celebrating: [
      'SESSION PHASE: CELEBRATING',
      'The learner got the answer right! Your job is to:',
      '- Celebrate their effort and strategy (not just "you are smart")',
      '- Use "celebrate" tool for a praise burst',
      '- Briefly explain WHY their answer was correct (reinforce learning)',
      '- If mastery is high, suggest a stretch challenge',
      '- Keep it brief and energizing',
    ].join('\n'),
    closing: [
      'SESSION PHASE: CLOSING',
      'The session is ending. Your job is to:',
      '- Recap what they practiced today (reference session stats)',
      '- Highlight their best moment (streak, improvement)',
      '- Ask a simple reflection question ("what was the trickiest part?")',
      '- Encourage them to come back tomorrow',
      '- Use "final_answer" with your recap + reflection prompt',
    ].join('\n'),
    free_chat: [
      'SESSION PHASE: FREE CHAT',
      'The learner is chatting freely (not tied to a specific problem).',
      '- Be a warm, knowledgeable companion',
      '- Use tools when the learner asks questions',
      '- Connect topics to things they are learning',
    ].join('\n'),
  };

  const phaseLine = sessionPhase ? `\n${phaseGuidance[sessionPhase]}\n` : '';

  const adaptationLines = adaptationPlan
    ? buildAdaptationDirective(adaptationPlan)
    : [];
  const adaptationBlock = adaptationLines.length > 0 ? `\n${adaptationLines.join('\n')}\n` : '';

  return [
    'You are a child learning tutor agent running a cognitive loop.',
    'You select tools to help the learner take one safe, concrete next step.',
    '',
    'Available tools:',
    toolList,
    '',
    'Rules:',
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
    'Adapt to the learner\'s mastery level (read "Mastery" in the context):',
    '- High mastery (>= 0.8 for the current skill): raise the challenge, move faster, ask a stretch question.',
    '- Low mastery (<= 0.4): slow down, take smaller steps, give more encouragement.',
    '- Reference recent topics to make it feel personal and connected.',
    phaseLine,
    adaptationBlock,
    'Respond as JSON: {"nextAction": "<tool_id or final_answer>", "arguments": {...}, "finalMessage": "...", "reasoning": "..."}',
  ].filter(Boolean).join('\n');
}

function buildConversationHistory(history: ConversationTurn[]): string {
  if (!history || history.length === 0) return '  (no prior conversation)';
  const recent = history.slice(-8);
  return recent
    .map((t, i) => `  [${t.role}] ${t.content.slice(0, 200)}`)
    .join('\n');
}

function buildMasterySummary(mastery?: MasteryContext): string {
  if (!mastery) return '';
  const lines: string[] = [];
  if (mastery.skillMastery && Object.keys(mastery.skillMastery).length > 0) {
    const masteryStr = Object.entries(mastery.skillMastery)
      .map(([k, v]) => `${k}=${v.toFixed(2)}`)
      .join(', ');
    lines.push(`Skill mastery: ${masteryStr}`);
  }
  if (mastery.currentSkill) {
    lines.push(`Current skill: ${mastery.currentSkill}`);
  }
  if (typeof mastery.sessionCorrect === 'number' && typeof mastery.sessionAttempts === 'number') {
    lines.push(`Session: ${mastery.sessionCorrect}/${mastery.sessionAttempts} correct`);
  }
  if (typeof mastery.currentStreak === 'number' && mastery.currentStreak > 0) {
    lines.push(`Current streak: ${mastery.currentStreak}`);
  }
  return lines.join('\n');
}

function buildToolSelectionUserPrompt(input: AgentLoopInput, previousHops: ToolTrajectoryEntry[]): string {
  const hintInfo = input.hintSet.length > 0
    ? `Hints available: ${input.hintSet.length} (current level: ${Math.min(input.attemptNumber - 1, input.hintSet.length - 1)})`
    : 'No hints available';

  const pcgSummary = input.pcgContext
    ? [
        input.pcgContext.childName ? `Name: ${input.pcgContext.childName}` : '',
        input.pcgContext.ageGroup ? `Age band: ${input.pcgContext.ageGroup}` : '',
        input.pcgContext.interests?.length ? `Interests: ${input.pcgContext.interests.slice(0, 3).join(', ')}` : '',
      ].filter(Boolean).join('\n')
    : '';

  const masterySummary = buildMasterySummary(input.mastery);

  const hopHistory = previousHops.length > 0
    ? previousHops.map((h) => `  Hop ${h.hop + 1}: ${h.call.toolId} → ${h.result.output.slice(0, 120)}`).join('\n')
    : '  (no previous hops)';

  const focus = input.context?.focus;
  const focusLine = focus
    ? [
        focus.title ? `On screen: ${focus.title}` : '',
        focus.summary ? `Learner is looking at: ${focus.summary}` : '',
        focus.entities && Object.keys(focus.entities).length
          ? `Details: ${JSON.stringify(focus.entities)}`
          : '',
      ].filter(Boolean).join('\n')
    : '';

  const historyLine = input.conversationHistory?.length
    ? `Conversation history (this session):\n${buildConversationHistory(input.conversationHistory)}`
    : '';

  return [
    `Learner message: ${input.learnerMessage}`,
    input.contentPrompt ? `Problem: ${input.contentPrompt}` : '',
    focusLine,
    `Attempt number: ${input.attemptNumber}`,
    hintInfo,
    '',
    'Previous hops this turn:',
    hopHistory,
    '',
    pcgSummary ? `PCG context:\n${pcgSummary}` : '',
    masterySummary ? `\nMastery:\n${masterySummary}` : '',
    historyLine ? `\n${historyLine}` : '',
    '',
    'What tool should you call next, or do you have a final answer?',
  ].filter(Boolean).join('\n');
}

// ─── Parse the AI Gateway response ──────────────────────────────────────────

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
    };
  } catch {
    return null;
  }
}

// ─── Call AI Gateway for tool selection ─────────────────────────────────────

async function selectNextTool(
  input: AgentLoopInput,
  previousHops: ToolTrajectoryEntry[],
): Promise<ToolSelectionResponse | null> {
  const systemPrompt = buildToolSelectionSystemPrompt(input.roster, input.sessionPhase, input.adaptationPlan);
  const userPrompt = buildToolSelectionUserPrompt(input, previousHops);

  try {
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CHILD_SAFETY_API_KEY}`,
      },
      body: JSON.stringify({
        model: LEARN_AGENT_LOOP_MODEL,
        contract: LEARN_AGENT_LOOP_CONTRACT,
        messages: [
          ...(input.safetySystemPrompt ? [{ role: 'system', content: input.safetySystemPrompt }] : []),
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
        metadata: {
          user_type: 'child',
          content_filter: 'strict',
          service_id: 'learn_tutor_agent_loop',
          hop: previousHops.length,
        },
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // The model may return JSON or markdown-wrapped JSON. Extract it.
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return parseToolSelection(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.warn('[agent-loop] tool selection failed:', error);
    return null;
  }
}

// ─── Execute a gated tool hop ───────────────────────────────────────────────

async function executeGatedHop(
  toolId: ToolId,
  args: Record<string, unknown>,
  roster: ToolRoster,
  ctx: ToolContext,
): Promise<{ result: ToolResult; gate: ToolGateResult }> {
  // Check if this tool requires parental approval
  const tool = roster.tools.find((t) => t.id === toolId);
  const approvalService = getToolApprovalService();

  let approvalGranted = false;
  if (tool?.requiresApproval) {
    // If already approved, proceed
    approvalGranted = approvalService.isApproved(ctx.childUserId, toolId);

    if (!approvalGranted) {
      // Create or reuse a pending approval request
      const req = approvalService.requestApproval({
        childId: ctx.childUserId,
        toolId,
        summary: `Agent wants to use ${tool.label} for skill ${ctx.skillCode || 'unknown'}`,
        agentReasoning: `Content: ${ctx.contentPrompt?.slice(0, 100)}`,
      });

      return {
        gate: {
          allowed: false,
          reason: `Tool "${toolId}" requires parental approval (request ${req.id} pending)`,
          tool,
        },
        result: {
          toolId,
          success: false,
          output: `I need your parent's permission to use ${tool.label}. I've sent them a request — try again after they approve!`,
          gate: {
            allowed: false,
            reason: `Tool "${toolId}" requires parental approval (request ${req.id} pending)`,
            tool,
          },
          safetyResult: 'pass' as HarnessSafetyResult,
          latencyMs: 0,
        },
      };
    }
  }

  const gate = checkToolGate(roster, toolId, { approvalGranted });

  if (!gate.allowed) {
    return {
      gate,
      result: {
        toolId,
        success: false,
        output: `Tool "${toolId}" denied by Tool Gate: ${gate.reason}`,
        gate,
        safetyResult: 'pass' as HarnessSafetyResult,
        latencyMs: 0,
      },
    };
  }

  const startedAt = Date.now();
  const execResult = await executeTool(toolId, args, ctx);
  const latencyMs = Date.now() - startedAt;

  return {
    gate,
    result: {
      toolId,
      success: execResult.success,
      output: execResult.output,
      gate,
      safetyResult: 'pass' as HarnessSafetyResult,
      latencyMs,
    },
  };
}

// ─── Main loop ──────────────────────────────────────────────────────────────

export async function runAgentLoop(input: AgentLoopInput): Promise<AgentLoopResult> {
  const maxHops = input.maxHops ?? 3;
  const trajectory: ToolTrajectoryEntry[] = [];
  const toolsUsed: ToolId[] = [];

  const ctx: ToolContext = {
    childUserId: input.childUserId,
    contentPrompt: input.contentPrompt,
    contentItemId: input.contentItemId,
    skillCode: input.skillCode,
    attemptNumber: input.attemptNumber,
    hintSet: input.hintSet,
    safetySystemPrompt: input.safetySystemPrompt,
    pcgContext: input.pcgContext,
    mastery: input.mastery,
    sessionPhase: input.sessionPhase,
    adaptationPlan: input.adaptationPlan,
    // Wire the on-screen focus frame through so tools (ask_socratic) can ground
    // "explain this" in the exact card / Pokémon / quiz the learner is viewing.
    focus: input.context?.focus
      ? {
          title: input.context.focus.title,
          summary: input.context.focus.summary,
          entities: input.context.focus.entities,
        }
      : null,
  };

  let finalMessage = '';
  let budgetExhausted = false;

  for (let hop = 0; hop < maxHops; hop++) {
    // REASON + PLAN: ask the AI which tool to call next
    const selection = await selectNextTool(input, trajectory);

    if (!selection) {
      // AI Gateway failed — fall back to deterministic
      return buildFallbackResult(input, trajectory, toolsUsed, false);
    }

    // If the AI says "final_answer", we're done
    if (selection.nextAction === 'final_answer') {
      finalMessage = selection.finalMessage || '';
      break;
    }

    // ACT: execute the gated tool
    const toolCall: ToolCall = {
      toolId: selection.nextAction,
      arguments: selection.arguments || {},
    };

    const { result, gate } = await executeGatedHop(
      toolCall.toolId,
      toolCall.arguments,
      input.roster,
      ctx,
    );

    trajectory.push({ call: toolCall, result, hop });
    if (!toolsUsed.includes(toolCall.toolId)) {
      toolsUsed.push(toolCall.toolId);
    }

    // If the tool was denied or failed, stop the loop
    if (!gate.allowed || !result.success) {
      // Try one more reasoning hop if we have budget
      if (hop >= maxHops - 1) {
        budgetExhausted = true;
      }
      continue;
    }

    // Check if we've exhausted the budget
    if (hop === maxHops - 1) {
      budgetExhausted = true;
    }
  }

  // If we didn't get a final message from the loop, do one final reasoning call
  if (!finalMessage) {
    const finalSelection = await selectNextTool(input, trajectory);
    if (finalSelection?.finalMessage) {
      finalMessage = finalSelection.finalMessage;
    } else {
      // Fall back to deterministic
      return buildFallbackResult(input, trajectory, toolsUsed, budgetExhausted);
    }
  }

  return {
    message: finalMessage,
    source: 'agent_loop',
    model: LEARN_AGENT_LOOP_MODEL,
    contract: LEARN_AGENT_LOOP_CONTRACT,
    trajectory,
    hopsExecuted: trajectory.length,
    budgetExhausted,
    toolsUsed,
  };
}

// ─── Fallback result builder ────────────────────────────────────────────────

function buildFallbackResult(
  input: AgentLoopInput,
  trajectory: ToolTrajectoryEntry[],
  toolsUsed: ToolId[],
  budgetExhausted: boolean,
): AgentLoopResult {
  const hintLevel = input.hintSet.length > 0
    ? Math.min(input.attemptNumber - 1, input.hintSet.length - 1)
    : undefined;
  const hint = hintLevel !== undefined ? input.hintSet[hintLevel] : undefined;

  const message = buildAgentFallbackMessage({
    contentPrompt: input.contentPrompt,
    attemptNumber: input.attemptNumber,
    hint,
    hintLevel,
    hintsAvailable: input.hintSet.length,
  });

  return {
    message,
    source: 'fallback_deterministic',
    model: LEARN_AGENT_LOOP_MODEL,
    contract: LEARN_AGENT_LOOP_CONTRACT,
    trajectory,
    hopsExecuted: trajectory.length,
    budgetExhausted,
    toolsUsed,
  };
}

// ─── Convenience: build a minimal roster for the learning domain ────────────

import type { ToolRoster as TRoster } from '../shared/tool-roster';

export const LEARNING_DOMAIN_ROSTER: TRoster = {
  id: 'learn-tutor-agent',
  tools: [
    {
      id: 'ask_socratic',
      label: 'Ask Socratic',
      description: 'Generate a Socratic tutoring prompt that guides the learner to the next step.',
    },
    {
      id: 'give_hint',
      label: 'Give Hint',
      description: 'Return the next hint from the hint set for this content item.',
    },
    {
      id: 'check_answer',
      label: 'Check Answer',
      description: 'Reason about a learner-proposed answer without revealing the correct answer.',
    },
    {
      id: 'define_word',
      label: 'Define Word',
      description: 'Look up a kid-friendly definition for a word.',
    },
    {
      id: 'explore_graph',
      label: 'Explore Graph',
      description: 'Suggest a Pokémon Lab lesson for interactive exploration.',
    },
  ],
};
