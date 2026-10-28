/**
 * Agent Dispatch Orchestrator — Multi-agent lesson authoring pipeline coordinator.
 *
 * Takes a lesson through its lifecycle by:
 * 1. Planning which agents are needed based on subject/age/skill targets
 * 2. Creating agent tasks with proper dependency ordering
 * 3. Transitioning lesson state through the pipeline
 * 4. Dispatching ready tasks to the appropriate AI model via the AI Gateway
 *
 * Pipeline phases:
 *   draft → spec (Claude Opus writes design spec)
 *   spec → generating (all agents produce content in parallel where possible)
 *   generating → reviewing (human or agent reviews output)
 *   reviewing → approved (all reviews pass)
 *   approved → published (lesson goes live)
 *
 * The orchestrator is model-agnostic — it creates tasks and manages state.
 * The actual AI calls happen through AgentExecutionAdapters (next step).
 * This module provides the dispatch() method that picks up ready tasks
 * and routes them to the right adapter.
 */

import type { Pool } from 'pg';
import {
  LessonLifecycleService,
  AGENT_CAPABILITIES,
  AGENT_LABELS,
  canTransition,
  type Lesson,
  type LessonStep,
  type AgentTask,
  type AgentId,
  type TaskType,
  type LifecycleState,
  type LessonDesignSpec,
  type CreateStepInput,
} from './LessonLifecycleService';
import { agentRegistry } from './AgentRegistry';
import { blueprintSourceText, type BlueprintSourceRef } from './blueprint-sources';
import { getVisionModelId } from '@/lib/vision/vision-model-config';
import { getChildChatModel } from '@/lib/llm-model-config';

// ─── Gateway model mapping ──────────────────────────────────────────────────

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';

/**
 * Maps logical agent IDs to actual AI Gateway model IDs.
 * These are the models available on the gateway (see /api/gateway/models.ts).
 */
export const AGENT_MODEL_MAP: Record<AgentId, {
  gatewayModel: string;
  endpoint: string;
  isChildSafe: boolean;
}> = {
  'claude-opus': {
    gatewayModel: 'claude-opus-5',
    endpoint: `${AI_GATEWAY_URL}/api/v1/chat/completions`,
    isChildSafe: false, // used for lesson authoring, not child-facing
  },
  'gpt-5.5': {
    gatewayModel: 'gpt-5.6-terra',
    endpoint: `${AI_GATEWAY_URL}/api/v1/chat/completions`,
    isChildSafe: false,
  },
  'gemini-image-pro': {
    gatewayModel: 'gemini-3.1-pro-preview',
    endpoint: `${AI_GATEWAY_URL}/api/v1/chat/completions`,
    isChildSafe: false,
  },
  'nano-banana': {
    gatewayModel: 'gemini-3.1-flash-lite-preview',
    endpoint: `${AI_GATEWAY_URL}/api/v1/chat/completions`,
    isChildSafe: false,
  },
  'glm-5.2': {
    gatewayModel: 'glm-5.3-flash',
    endpoint: `${AI_GATEWAY_URL}/api/v1/chat/completions`,
    isChildSafe: true,
  },
  'minimax-m3': {
    gatewayModel: 'glm-5.3-flash', // legacy alias routes to glm-5.2
    endpoint: `${AI_GATEWAY_URL}/api/v1/chat/completions`,
    isChildSafe: true,
  },
  'local-llm': {
    gatewayModel: getChildChatModel(),
    endpoint: `${AI_GATEWAY_URL}/api/v1/chat/completions`,
    isChildSafe: true,
  },
  'qwen-vlm': {
    // Resolved through vision-model-config — swap the deployed VLM via env
    // or gateway routing rules without touching this map.
    gatewayModel: getVisionModelId(),
    endpoint: `${AI_GATEWAY_URL}/api/v1/chat/completions`,
    isChildSafe: true,
  },
  'human': {
    gatewayModel: '',
    endpoint: '',
    isChildSafe: false,
  },
};

// ─── Pipeline phase definitions ─────────────────────────────────────────────

export interface PipelinePhase {
  state: LifecycleState;
  leadAgent: AgentId;
  taskTypes: TaskType[];
  nextStateOnComplete: LifecycleState;
  description: string;
}

export const PIPELINE_PHASES: PipelinePhase[] = [
  {
    state: 'draft',
    leadAgent: 'claude-opus',
    taskTypes: ['design_spec'],
    nextStateOnComplete: 'spec',
    description: 'Claude Opus analyzes the lesson requirements and creates a pedagogical design spec',
  },
  {
    state: 'spec',
    leadAgent: 'claude-opus',
    taskTypes: ['write_content', 'generate_problem', 'create_assessment', 'generate_image', 'generate_audio'],
    nextStateOnComplete: 'reviewing',
    description: 'All agents generate lesson content, problems, visuals, and audio in parallel',
  },
  {
    state: 'reviewing',
    leadAgent: 'human',
    taskTypes: ['review_content', 'review_safety', 'manual_review'],
    nextStateOnComplete: 'approved',
    description: 'Human and agent reviewers check pedagogical quality, safety, and accuracy',
  },
  {
    state: 'approved',
    leadAgent: 'claude-opus',
    taskTypes: ['assemble'],
    nextStateOnComplete: 'published',
    description: 'Final assembly — package all content and assets into a publishable lesson',
  },
];

// ─── Step templates by subject ──────────────────────────────────────────────

interface StepTemplate {
  stepType: LessonStep['stepType'];
  title: string;
  description: string;
  stepEmoji: string;
  contentAgent: AgentId;
  visualAgent?: AgentId;
  taskTypes: TaskType[];
}

/**
 * Default step templates for a lesson.
 * The orchestrator uses these to scaffold steps during the spec phase.
 * Claude Opus can override or extend these during design_spec.
 */
export const DEFAULT_STEP_TEMPLATES: StepTemplate[] = [
  {
    stepType: 'intro',
    title: 'Introduction',
    description: 'Hook the learner with an engaging opening',
    stepEmoji: '👋',
    contentAgent: 'claude-opus',
    visualAgent: 'gemini-image-pro',
    taskTypes: ['write_content', 'generate_image'],
  },
  {
    stepType: 'concept',
    title: 'Core Concept',
    description: 'Teach the main concept with text and visuals',
    stepEmoji: '💡',
    contentAgent: 'claude-opus',
    visualAgent: 'gemini-image-pro',
    taskTypes: ['write_content', 'generate_image'],
  },
  {
    stepType: 'example',
    title: 'Worked Example',
    description: 'Walk through a concrete example step by step',
    stepEmoji: '📝',
    contentAgent: 'gpt-5.5',
    visualAgent: 'nano-banana',
    taskTypes: ['write_content', 'generate_image'],
  },
  {
    stepType: 'concept_check',
    title: 'Check Your Understanding',
    description: 'Predict-then-reveal interactive question',
    stepEmoji: '🤔',
    contentAgent: 'gpt-5.5',
    taskTypes: ['create_assessment'],
  },
  {
    stepType: 'practice',
    title: 'Practice Problem',
    description: 'Hands-on problem for the learner to solve',
    stepEmoji: '✏️',
    contentAgent: 'gpt-5.5',
    taskTypes: ['generate_problem'],
  },
  {
    stepType: 'celebration',
    title: 'Great Work!',
    description: 'Celebrate completion and show badge',
    stepEmoji: '🎉',
    contentAgent: 'glm-5.2',
    visualAgent: 'nano-banana',
    taskTypes: ['write_content', 'generate_image'],
  },
  {
    stepType: 'summary',
    title: 'Recap',
    description: 'Summarize what was learned',
    stepEmoji: '📋',
    contentAgent: 'glm-5.2',
    taskTypes: ['write_content'],
  },
];

// ─── Orchestrator ───────────────────────────────────────────────────────────

export interface DispatchResult {
  lessonId: string;
  tasksCreated: number;
  tasksDispatched: number;
  stateTransitioned: LifecycleState | null;
  message: string;
}

export interface PipelinePlan {
  lessonId: string;
  phases: {
    phase: PipelinePhase;
    tasks: { agentId: AgentId; taskType: TaskType; description: string }[];
  }[];
  estimatedSteps: number;
  agentsInvolved: AgentId[];
}

export class AgentDispatchOrchestrator {
  private service: LessonLifecycleService;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.service = new LessonLifecycleService(pool);
  }

  // ── Plan: show what the pipeline will do for a lesson ────────────────────

  async planPipeline(lessonId: string): Promise<PipelinePlan> {
    const lesson = await this.service.getLesson(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    const phases = PIPELINE_PHASES.map((phase) => {
      const tasks: { agentId: AgentId; taskType: TaskType; description: string }[] = [];

      for (const taskType of phase.taskTypes) {
        // Use the registry to resolve which agent is bound to this task type
        // This reflects any runtime rebindings the user has made
        try {
          const agentId = agentRegistry.resolveAgent(taskType);
          const binding = agentRegistry.getBinding(taskType);

          // For the spec phase, skip human tasks
          if (phase.state === 'spec' && agentId === 'human') continue;
          // For reviewing phase, prefer human first for non-safety tasks
          if (phase.state === 'reviewing' && agentId !== 'human' && taskType !== 'review_safety') continue;

          const negotiableLabel = binding?.negotiable ? '(swappable)' : '(locked)';
          tasks.push({
            agentId,
            taskType,
            description: `${AGENT_LABELS[agentId] || agentId} will ${taskType.replace(/_/g, ' ')} ${negotiableLabel}`,
          });
        } catch {
          // No binding for this task type in this phase
        }
      }

      return { phase, tasks };
    });

    const agentsInvolved = Array.from(
      new Set(phases.flatMap((p) => p.tasks.map((t) => t.agentId)))
    );

    return {
      lessonId,
      phases,
      estimatedSteps: DEFAULT_STEP_TEMPLATES.length,
      agentsInvolved,
    };
  }

  // ── Kick off the pipeline for a draft lesson ─────────────────────────────

  async startPipeline(lessonId: string): Promise<DispatchResult> {
    const lesson = await this.service.getLesson(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    if (lesson.lifecycleState !== 'draft') {
      throw new Error(`Lesson must be in 'draft' state to start pipeline (current: ${lesson.lifecycleState})`);
    }

    // Resolve the agent for design_spec from the registry (defaults to claude-opus, but swappable)
    const designSpecAgent = agentRegistry.resolveAgent('design_spec');

    // Assign the resolved agent as lead
    await this.service.assignAgent(lessonId, designSpecAgent, true);

    // Create the design_spec task
    const task = await this.service.createTask({
      lessonId,
      agentId: designSpecAgent,
      taskType: 'design_spec',
      inputPayload: {
        subject: lesson.subject,
        ageBand: lesson.ageBand,
        skillCodes: lesson.skillCodes,
        curriculumStandards: lesson.curriculumStandards,
        difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimatedMinutes,
        prerequisites: lesson.prerequisites,
        lessonTitle: lesson.title,
        lessonDescription: lesson.description,
      },
    });

    // Transition to spec phase
    await this.service.updateLessonState(lessonId, 'spec', designSpecAgent, 'agent');

    return {
      lessonId,
      tasksCreated: 1,
      tasksDispatched: 0,
      stateTransitioned: 'spec',
      message: `Pipeline started. ${AGENT_LABELS[designSpecAgent] || designSpecAgent} assigned to create design spec. Task ${task.id} ready for execution.`,
    };
  }

  // ── After design spec is complete, scaffold steps and create gen tasks ───

  async onDesignSpecComplete(
    lessonId: string,
    designSpec: LessonDesignSpec
  ): Promise<DispatchResult> {
    const lesson = await this.service.getLesson(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    // Save the design spec
    await this.service.updateLessonDesignSpec(lessonId, designSpec);

    // Determine step templates — use spec's interaction types if provided
    const stepTemplates = this.selectStepTemplates(designSpec);

    // Create steps
    const createdSteps: LessonStep[] = [];
    for (let i = 0; i < stepTemplates.length; i++) {
      const tmpl = stepTemplates[i];
      const step = await this.service.createStep({
        lessonId,
        stepNumber: i + 1,
        stepType: tmpl.stepType,
        title: tmpl.title,
        description: tmpl.description,
        stepEmoji: tmpl.stepEmoji,
        contentAgent: tmpl.contentAgent,
        visualAgent: tmpl.visualAgent,
      });
      createdSteps.push(step);
    }

    // Create generation tasks for each step
    let tasksCreated = 0;
    for (const step of createdSteps) {
      const tmpl = stepTemplates[step.stepNumber - 1];

      // Determine the content task type for this step
      const contentTaskType: TaskType = tmpl.taskTypes.includes('write_content') ? 'write_content' :
                tmpl.taskTypes.includes('generate_problem') ? 'generate_problem' :
                tmpl.taskTypes.includes('create_assessment') ? 'create_assessment' :
                'write_content';

      // Resolve the agent from the registry for this task type
      // This allows the user to swap which LLM writes content, generates problems, etc.
      // The template's contentAgent is used as a hint, but the registry has the final say
      const contentAgentId = agentRegistry.resolveAgent(contentTaskType);

      // Content task
      await this.service.createTask({
        lessonId,
        stepId: step.id,
        agentId: contentAgentId,
        taskType: contentTaskType,
        inputPayload: {
          stepId: step.id,
          stepType: step.stepType,
          stepTitle: step.title,
          designSpec,
          lessonSubject: lesson.subject,
          lessonAgeBand: lesson.ageBand,
          lessonDifficulty: lesson.difficulty,
          skillCodes: lesson.skillCodes,
        },
      });
      tasksCreated++;

      // Visual task (if needed) — locked to vision-capable models via registry
      if (tmpl.visualAgent && tmpl.taskTypes.includes('generate_image')) {
        const visualAgentId = agentRegistry.resolveAgent('generate_image');
        await this.service.createTask({
          lessonId,
          stepId: step.id,
          agentId: visualAgentId,
          taskType: 'generate_image',
          inputPayload: {
            stepId: step.id,
            stepType: step.stepType,
            stepTitle: step.title,
            visualStyle: designSpec.visualStyle,
            ageBand: lesson.ageBand,
          },
        });
        tasksCreated++;
      }
    }

    // Transition to generating
    await this.service.updateLessonState(lessonId, 'generating', 'claude-opus', 'agent');

    // Assign all involved agents
    const involvedAgents = Array.from(new Set(stepTemplates.flatMap((t) => [t.contentAgent, t.visualAgent].filter(Boolean) as AgentId[])));
    for (const agent of involvedAgents) {
      await this.service.assignAgent(lessonId, agent, false);
    }

    return {
      lessonId,
      tasksCreated,
      tasksDispatched: 0,
      stateTransitioned: 'generating',
      message: `Design spec saved. ${createdSteps.length} steps scaffolded. ${tasksCreated} generation tasks created. Transitioned to 'generating'.`,
    };
  }

  // ── Blueprint lessons: generate from the received spec + cited pages ──────

  /** A blueprint lesson (ADR-0010) arrives at 'spec' with its design spec and
   *  steps already created — this scaffolds generation tasks on the EXISTING
   *  steps (no template re-scaffolding), grounds every prompt in the cited
   *  curriculum pages, and adds the practice-bank task. */
  async generateFromBlueprint(lessonId: string): Promise<DispatchResult> {
    const lesson = await this.service.getLesson(lessonId);
    if (!lesson) throw new Error('Lesson not found');
    const spec = lesson.designSpec;
    if (!spec) throw new Error('Lesson has no design spec');

    const meta = (spec as unknown as { blueprint?: { sourceRefs?: BlueprintSourceRef[]; practiceSpec?: { count?: number; types?: string[]; difficulty?: number; answerKeyRule?: string } } }).blueprint;

    // Re-entry while generating: only ensure the practice-bank task exists
    // (an earlier partial send may have launched generation without it).
    if (lesson.lifecycleState === 'generating') {
      const practice = meta?.practiceSpec;
      if (!practice?.count) throw new Error(`Blueprint generation starts from 'spec' (current: generating, no practiceSpec)`);
      const tasks = await this.service.getTasks(lessonId);
      if (tasks.some(t => (t.inputPayload as Record<string, unknown> | null)?.practiceBank)) {
        return { lessonId, tasksCreated: 0, tasksDispatched: 0, stateTransitioned: null, message: 'Practice bank task already exists.' };
      }
      const sourceText = await blueprintSourceText(meta?.sourceRefs);
      const bankAgent = agentRegistry.resolveAgent('generate_problem');
      await this.service.createTask({
        lessonId,
        agentId: bankAgent,
        taskType: 'generate_problem',
        inputPayload: {
          practiceBank: {
            count: practice.count,
            types: practice.types ?? ['problem'],
            difficulty: practice.difficulty ?? lesson.difficulty,
            answerKeyRule: practice.answerKeyRule ?? 'deterministic',
          },
          designSpec: spec,
          lessonSubject: lesson.subject,
          lessonAgeBand: lesson.ageBand,
          skillCodes: lesson.skillCodes,
          ...(sourceText ? { sourceText } : {}),
        },
      });
      return { lessonId, tasksCreated: 1, tasksDispatched: 0, stateTransitioned: null, message: 'Practice bank task created (generation already running).' };
    }

    if (lesson.lifecycleState !== 'spec') {
      throw new Error(`Blueprint generation starts from 'spec' (current: ${lesson.lifecycleState})`);
    }
    const steps = await this.service.getSteps(lessonId);
    if (!steps.length) throw new Error('Lesson has no steps to generate');

    const sourceText = await blueprintSourceText(meta?.sourceRefs);

    let tasksCreated = 0;
    const usedAgents = new Set<AgentId>();
    for (const step of steps) {
      const contentTaskType: TaskType =
        step.stepType === 'practice' ? 'generate_problem' :
        (step.stepType === 'concept_check' || step.stepType === 'quiz') ? 'create_assessment' :
        'write_content';
      const contentAgentId = agentRegistry.resolveAgent(contentTaskType);
      usedAgents.add(contentAgentId);
      await this.service.createTask({
        lessonId,
        stepId: step.id,
        agentId: contentAgentId,
        taskType: contentTaskType,
        inputPayload: {
          stepId: step.id,
          stepType: step.stepType,
          stepTitle: step.title,
          designSpec: spec,
          lessonSubject: lesson.subject,
          lessonAgeBand: lesson.ageBand,
          lessonDifficulty: lesson.difficulty,
          skillCodes: lesson.skillCodes,
          ...(sourceText ? { sourceText } : {}),
        },
      });
      tasksCreated++;

      if (['intro', 'concept', 'example', 'celebration'].includes(step.stepType)) {
        const visualAgentId = agentRegistry.resolveAgent('generate_image');
        usedAgents.add(visualAgentId);
        await this.service.createTask({
          lessonId,
          stepId: step.id,
          agentId: visualAgentId,
          taskType: 'generate_image',
          inputPayload: {
            stepId: step.id,
            stepType: step.stepType,
            stepTitle: step.title,
            visualStyle: spec.visualStyle,
            ageBand: lesson.ageBand,
            ...(sourceText ? { sourceText } : {}),
          },
        });
        tasksCreated++;
      }
    }

    const practice = meta?.practiceSpec;
    if (practice?.count) {
      const bankAgent = agentRegistry.resolveAgent('generate_problem');
      usedAgents.add(bankAgent);
      await this.service.createTask({
        lessonId,
        agentId: bankAgent,
        taskType: 'generate_problem',
        inputPayload: {
          practiceBank: {
            count: practice.count,
            types: practice.types ?? ['problem'],
            difficulty: practice.difficulty ?? lesson.difficulty,
            answerKeyRule: practice.answerKeyRule ?? 'deterministic',
          },
          designSpec: spec,
          lessonSubject: lesson.subject,
          lessonAgeBand: lesson.ageBand,
          skillCodes: lesson.skillCodes,
          ...(sourceText ? { sourceText } : {}),
        },
      });
      tasksCreated++;
    }

    await this.service.updateLessonState(lessonId, 'generating', 'atlas-blueprint', 'system');
    for (const agent of usedAgents) {
      await this.service.assignAgent(lessonId, agent, false);
    }

    return {
      lessonId,
      tasksCreated,
      tasksDispatched: 0,
      stateTransitioned: 'generating',
      message: `Blueprint generation: ${steps.length} steps → ${tasksCreated} tasks${sourceText ? ' grounded in the cited pages' : ' (source pages unreachable — ungrounded)'}. Transitioned to 'generating'.`,
    };
  }

  // ── Dispatch: pick up ready tasks and route to execution adapters ────────

  async dispatchReadyTasks(lessonId: string): Promise<DispatchResult> {
    const lesson = await this.service.getLesson(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    const readyTasks = await this.service.getReadyTasks(lessonId);
    if (readyTasks.length === 0) {
      // Check if all tasks are completed → transition state
      const allTasks = await this.service.getTasks(lessonId);
      const allDone = allTasks.length > 0 && allTasks.every((t) => t.status === 'completed' || t.status === 'skipped');

      if (allDone && lesson.lifecycleState === 'generating') {
        await this.service.updateLessonState(lessonId, 'reviewing', 'system', 'system');
        return {
          lessonId,
          tasksCreated: 0,
          tasksDispatched: 0,
          stateTransitioned: 'reviewing',
          message: 'All generation tasks complete. Transitioned to reviewing.',
        };
      }

      if (allDone && lesson.lifecycleState === 'reviewing') {
        // Check if all reviews passed
        const reviews = await this.service.getReviews(lessonId);
        const hasRejections = reviews.some((r) => r.verdict === 'rejected');
        const hasRevisions = reviews.some((r) => r.verdict === 'revision_requested');

        if (hasRejections) {
          return {
            lessonId,
            tasksCreated: 0,
            tasksDispatched: 0,
            stateTransitioned: null,
            message: 'Reviews completed with rejections. Manual intervention needed.',
          };
        }

        if (!hasRevisions && reviews.length > 0) {
          await this.service.updateLessonState(lessonId, 'approved', 'system', 'system');
          return {
            lessonId,
            tasksCreated: 0,
            tasksDispatched: 0,
            stateTransitioned: 'approved',
            message: 'All reviews approved. Transitioned to approved.',
          };
        }
      }

      return {
        lessonId,
        tasksCreated: 0,
        tasksDispatched: 0,
        stateTransitioned: null,
        message: 'No ready tasks to dispatch.',
      };
    }

    // Mark tasks as started (the actual AI call happens in the execution adapter)
    let dispatched = 0;
    for (const task of readyTasks) {
      if (task.agentId === 'human') continue; // human tasks wait for manual action
      await this.service.startTask(task.id);
      dispatched++;
    }

    return {
      lessonId,
      tasksCreated: 0,
      tasksDispatched: dispatched,
      stateTransitioned: null,
      message: `${dispatched} tasks dispatched for execution.`,
    };
  }

  // ── Complete a task and check if we should advance the pipeline ──────────

  async onTaskComplete(
    taskId: string,
    outputPayload: Record<string, any>,
    qualityScore?: number
  ): Promise<{ task: AgentTask; pipelineAdvanced: boolean; message: string }> {
    const task = await this.service.completeTask(taskId, outputPayload, qualityScore);
    if (!task) throw new Error('Task not found');

    // If this was a design_spec task, scaffold steps
    if (task.taskType === 'design_spec' && outputPayload.designSpec) {
      const result = await this.onDesignSpecComplete(task.lessonId, outputPayload.designSpec);
      return {
        task,
        pipelineAdvanced: true,
        message: `Design spec task completed. ${result.message}`,
      };
    }

    // If this was a content/assessment task, update the step content
    if (outputPayload.stepContent && task.stepId) {
      await this.service.updateStepContent(task.stepId, outputPayload.stepContent, task.agentId);
    }

    // If this was a generate_image task, register the asset
    if (task.taskType === 'generate_image' && outputPayload.asset) {
      await this.service.createAsset({
        lessonId: task.lessonId,
        stepId: task.stepId || undefined,
        assetType: outputPayload.asset.assetType || 'illustration',
        generatingAgent: task.agentId,
        generationPrompt: outputPayload.asset.generationPrompt,
        assetUrl: outputPayload.asset.assetUrl,
        assetData: outputPayload.asset.assetData,
        thumbnailUrl: outputPayload.asset.thumbnailUrl,
        altText: outputPayload.asset.altText,
      });
    }

    // Check if all tasks for this lesson are done
    const allTasks = await this.service.getTasks(task.lessonId);
    const allDone = allTasks.every((t) => t.status === 'completed' || t.status === 'skipped');

    if (allDone) {
      const lesson = await this.service.getLesson(task.lessonId);
      if (lesson && lesson.lifecycleState === 'generating') {
        await this.service.updateLessonState(task.lessonId, 'reviewing', 'system', 'system');
        return {
          task,
          pipelineAdvanced: true,
          message: 'All generation tasks complete. Transitioned to reviewing.',
        };
      }
    }

    return {
      task,
      pipelineAdvanced: false,
      message: `Task ${task.taskType} completed by ${task.agentId}.`,
    };
  }

  // ── Review and approve ───────────────────────────────────────────────────

  async submitReview(
    lessonId: string,
    review: {
      reviewerType: 'human' | 'agent';
      reviewerId: string;
      reviewerName?: string;
      reviewKind: string;
      verdict: 'approved' | 'rejected' | 'revision_requested';
      score?: number;
      notes?: string;
      stepId?: string;
      assetId?: string;
    }
  ): Promise<{ message: string; stateTransitioned: LifecycleState | null }> {
    await this.service.addReview({ lessonId, ...review });

    const reviews = await this.service.getReviews(lessonId);
    const lesson = await this.service.getLesson(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    const hasRejections = reviews.some((r) => r.verdict === 'rejected');
    const hasRevisions = reviews.some((r) => r.verdict === 'revision_requested');
    const allApproved = reviews.length > 0 && reviews.every((r) => r.verdict === 'approved');

    if (hasRejections) {
      return {
        message: 'Review submitted with rejection. Lesson needs revision.',
        stateTransitioned: null,
      };
    }

    if (hasRevisions && lesson.lifecycleState === 'reviewing') {
      // Send back to generating
      await this.service.updateLessonState(lessonId, 'generating', review.reviewerId, review.reviewerType);
      return {
        message: 'Revision requested. Lesson sent back to generating.',
        stateTransitioned: 'generating',
      };
    }

    if (allApproved && lesson.lifecycleState === 'reviewing') {
      await this.service.updateLessonState(lessonId, 'approved', review.reviewerId, review.reviewerType);
      return {
        message: 'All reviews approved. Lesson transitioned to approved.',
        stateTransitioned: 'approved',
      };
    }

    return {
      message: 'Review submitted. Waiting for more reviews.',
      stateTransitioned: null,
    };
  }

  // ── Publish ──────────────────────────────────────────────────────────────

  async publishLesson(lessonId: string, publishedBy: string): Promise<Lesson | null> {
    const lesson = await this.service.getLesson(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    if (lesson.lifecycleState !== 'approved') {
      throw new Error(`Lesson must be in 'approved' state to publish (current: ${lesson.lifecycleState})`);
    }

    // Create the assemble task and complete it immediately
    const assembleTask = await this.service.createTask({
      lessonId,
      agentId: 'claude-opus',
      taskType: 'assemble',
      inputPayload: { lessonId },
    });
    await this.service.startTask(assembleTask.id);

    // Get all steps and assets for the final package
    const steps = await this.service.getSteps(lessonId);
    const assets = await this.service.getAssets(lessonId);

    await this.service.completeTask(assembleTask.id, {
      totalSteps: steps.length,
      totalAssets: assets.length,
      assembledAt: new Date().toISOString(),
    });

    // Publish
    const published = await this.service.publishLesson(lessonId, publishedBy);
    return published;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private selectStepTemplates(designSpec: LessonDesignSpec): StepTemplate[] {
    // If the design spec specifies interaction types, filter/adapt templates
    if (designSpec.interactionTypes && designSpec.interactionTypes.length > 0) {
      // Map interaction type strings to step types
      const interactionMap: Record<string, StepTemplate['stepType']> = {
        'multiple_choice': 'concept_check',
        'problem_solving': 'practice',
        'reading': 'passage',
        'interactive': 'interactive',
        'quiz': 'quiz',
      };

      // Start with intro and summary, add matched interactions
      const templates: StepTemplate[] = [
        DEFAULT_STEP_TEMPLATES[0], // intro
        DEFAULT_STEP_TEMPLATES[1], // concept
      ];

      for (const interaction of designSpec.interactionTypes) {
        const stepType = interactionMap[interaction];
        if (stepType) {
          const tmpl = DEFAULT_STEP_TEMPLATES.find((t) => t.stepType === stepType);
          if (tmpl && !templates.includes(tmpl)) {
            templates.push(tmpl);
          }
        }
      }

      // Always end with celebration + summary
      templates.push(DEFAULT_STEP_TEMPLATES[5]); // celebration
      templates.push(DEFAULT_STEP_TEMPLATES[6]); // summary

      return templates;
    }

    // Default: use all templates
    return DEFAULT_STEP_TEMPLATES;
  }

  // ── Status: get a dashboard view of the pipeline ─────────────────────────

  async getPipelineStatus(lessonId: string): Promise<{
    lesson: Lesson;
    phase: PipelinePhase | null;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    failedTasks: number;
    totalSteps: number;
    totalAssets: number;
    totalReviews: number;
    readyToAdvance: boolean;
    nextAction: string;
  }> {
    const full = await this.service.getFullLesson(lessonId);
    if (!full.lesson) throw new Error('Lesson not found');

    const phase = PIPELINE_PHASES.find((p) => p.state === full.lesson!.lifecycleState) || null;

    const totalTasks = full.tasks.length;
    const completedTasks = full.tasks.filter((t) => t.status === 'completed').length;
    const pendingTasks = full.tasks.filter((t) => t.status === 'pending').length;
    const inProgressTasks = full.tasks.filter((t) => t.status === 'in_progress').length;
    const failedTasks = full.tasks.filter((t) => t.status === 'failed').length;

    const readyToAdvance = totalTasks > 0 && completedTasks === totalTasks;

    let nextAction = 'No action needed';
    if (full.lesson.lifecycleState === 'draft') {
      nextAction = 'Call startPipeline() to begin';
    } else if (full.lesson.lifecycleState === 'spec' && pendingTasks > 0) {
      nextAction = `${pendingTasks} tasks waiting to be dispatched`;
    } else if (full.lesson.lifecycleState === 'generating' && pendingTasks > 0) {
      nextAction = `${pendingTasks} generation tasks ready for execution`;
    } else if (full.lesson.lifecycleState === 'generating' && readyToAdvance) {
      nextAction = 'All tasks complete — ready to transition to reviewing';
    } else if (full.lesson.lifecycleState === 'reviewing') {
      nextAction = 'Awaiting reviews — call submitReview()';
    } else if (full.lesson.lifecycleState === 'approved') {
      nextAction = 'Ready to publish — call publishLesson()';
    } else if (full.lesson.lifecycleState === 'published') {
      nextAction = 'Lesson is live';
    } else if (failedTasks > 0) {
      nextAction = `${failedTasks} tasks failed — needs attention`;
    }

    return {
      lesson: full.lesson,
      phase,
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      failedTasks,
      totalSteps: full.steps.length,
      totalAssets: full.assets.length,
      totalReviews: full.reviews.length,
      readyToAdvance,
      nextAction,
    };
  }
}
