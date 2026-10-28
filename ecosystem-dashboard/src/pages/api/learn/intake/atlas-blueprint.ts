/**
 * Atlas blueprint intake — the service-authed bridge from Dev Atlas (via
 * pi-workspace) into the lesson lifecycle. ADR-0010.
 *
 * POST /api/learn/intake/atlas-blueprint   { blueprint } → create or update
 * GET  /api/learn/intake/atlas-blueprint?blueprintId=X → per-version status
 *
 * Auth: X-Internal-Service-Key only (the session-gated lifecycle routes are
 * the human path; this is the service path). The blueprint is child-agnostic
 * by contract — strict shape validation rejects anything beyond it.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import {
  LessonLifecycleService,
  type CreateStepInput,
  type StepType,
  type LessonDesignSpec,
} from '@/lib/kids-pic/LessonLifecycleService';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const service = new LessonLifecycleService(pool);

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

const STEP_TYPES: readonly string[] = [
  'intro', 'concept', 'example', 'interactive', 'concept_check',
  'practice', 'quiz', 'passage', 'celebration', 'summary',
];
const AGE_BANDS: readonly string[] = ['early', 'middle', 'tween'];
const COURSE_CODE = 'atlas';

interface BlueprintSourceRef {
  setId?: string; module?: string; lesson?: string;
  documentSha256?: string; pages?: number[]; url?: string;
}

interface Blueprint {
  blueprintId: string; version: number;
  subject: string; ageBand: string;
  title: string; description?: string; lessonEmoji?: string;
  gradeMin?: string; gradeMax?: string; estimatedMinutes?: number;
  standards: string[]; skillCodes?: string[];
  objectives: string[]; misconceptions?: string[];
  sourceRefs?: BlueprintSourceRef[];
  steps: { stepType: string; title: string; intent?: string; estimatedMinutes?: number }[];
  practiceSpec?: { count: number; types?: string[]; difficulty?: number; answerKeyRule?: string };
  interactionTypes?: string[]; visualStyle?: string; narrativeArc?: string;
}

class Invalid extends Error {}

/** Lowercase slug: letters, digits, hyphens; starts alphanumeric. */
function isSlug(s: string): boolean {
  if (s.length < 2 || s.length > 63) return false;
  const alnum = (c: string) => (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');
  if (!alnum(s[0])) return false;
  for (const c of s) {
    if (!alnum(c) && c !== '-') return false;
  }
  return true;
}

function str(v: unknown, field: string, max = 300): string {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Invalid(`${field} must be a non-empty string (≤${max})`);
  return v.trim();
}
function optStr(v: unknown, field: string, max = 2000): string | undefined {
  if (v === undefined || v === null) return undefined;
  return str(v, field, max);
}
function strArr(v: unknown, field: string, maxItems: number): string[] {
  if (!Array.isArray(v) || v.length === 0 || v.length > maxItems) throw new Invalid(`${field} must be a non-empty array (≤${maxItems})`);
  return v.map((x, i) => str(x, `${field}[${i}]`, 120));
}

function parseBlueprint(body: unknown): Blueprint {
  if (typeof body !== 'object' || body === null) throw new Invalid('body must be an object');
  const b = body as Record<string, unknown>;
  const allowed = new Set(['blueprintId', 'version', 'subject', 'ageBand', 'title', 'description',
    'lessonEmoji', 'gradeMin', 'gradeMax', 'estimatedMinutes', 'standards', 'skillCodes',
    'objectives', 'misconceptions', 'sourceRefs', 'steps', 'practiceSpec', 'interactionTypes',
    'visualStyle', 'narrativeArc']);
  for (const k of Object.keys(b)) {
    if (!allowed.has(k)) throw new Invalid(`unknown field '${k}' — blueprints are child-agnostic (ADR-0010)`);
  }
  const id = str(b.blueprintId, 'blueprintId', 64);
  if (!isSlug(id)) throw new Invalid('blueprintId must be a lowercase slug');
  const version = b.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > 999) {
    throw new Invalid('version must be an integer 1–999');
  }
  const ageBand = str(b.ageBand, 'ageBand', 16);
  if (!AGE_BANDS.includes(ageBand)) throw new Invalid(`ageBand must be one of ${AGE_BANDS.join(', ')}`);
  const stepsRaw = b.steps;
  if (!Array.isArray(stepsRaw) || stepsRaw.length === 0 || stepsRaw.length > 20) {
    throw new Invalid('steps must be a non-empty array (≤20)');
  }
  const steps = stepsRaw.map((s, i) => {
    if (typeof s !== 'object' || s === null) throw new Invalid(`steps[${i}] must be an object`);
    const st = s as Record<string, unknown>;
    const stepType = str(st.stepType, `steps[${i}].stepType`, 24);
    if (!STEP_TYPES.includes(stepType)) throw new Invalid(`steps[${i}].stepType must be one of ${STEP_TYPES.join(', ')}`);
    return {
      stepType, title: str(st.title, `steps[${i}].title`, 160),
      intent: optStr(st.intent, `steps[${i}].intent`, 600),
      estimatedMinutes: typeof st.estimatedMinutes === 'number' ? st.estimatedMinutes : undefined,
    };
  });
  const practice = b.practiceSpec;
  let practiceSpec: Blueprint['practiceSpec'];
  if (practice !== undefined) {
    if (typeof practice !== 'object' || practice === null) throw new Invalid('practiceSpec must be an object');
    const p = practice as Record<string, unknown>;
    if (typeof p.count !== 'number' || !Number.isInteger(p.count) || p.count < 1 || p.count > 50) {
      throw new Invalid('practiceSpec.count must be an integer 1–50');
    }
    practiceSpec = {
      count: p.count,
      types: Array.isArray(p.types) ? p.types.map(String).slice(0, 4) : undefined,
      difficulty: typeof p.difficulty === 'number' ? p.difficulty : undefined,
      answerKeyRule: optStr(p.answerKeyRule, 'practiceSpec.answerKeyRule', 40),
    };
  }
  let sourceRefs: BlueprintSourceRef[] | undefined;
  if (b.sourceRefs !== undefined) {
    if (!Array.isArray(b.sourceRefs) || b.sourceRefs.length > 12) throw new Invalid('sourceRefs must be an array (≤12)');
    sourceRefs = b.sourceRefs.map((r, i) => {
      if (typeof r !== 'object' || r === null) throw new Invalid(`sourceRefs[${i}] must be an object`);
      const sr = r as Record<string, unknown>;
      const ref: BlueprintSourceRef = {
        setId: optStr(sr.setId, `sourceRefs[${i}].setId`, 80),
        module: optStr(sr.module, `sourceRefs[${i}].module`, 40),
        lesson: optStr(sr.lesson, `sourceRefs[${i}].lesson`, 40),
        documentSha256: optStr(sr.documentSha256, `sourceRefs[${i}].documentSha256`, 80),
        url: optStr(sr.url, `sourceRefs[${i}].url`, 500),
      };
      if (sr.pages !== undefined) {
        if (!Array.isArray(sr.pages) || sr.pages.length !== 2 || !sr.pages.every(n => typeof n === 'number')) {
          throw new Invalid(`sourceRefs[${i}].pages must be [start, end]`);
        }
        ref.pages = sr.pages as number[];
      }
      if (!Object.values(ref).some(v => v !== undefined)) throw new Invalid(`sourceRefs[${i}] is empty`);
      return ref;
    });
  }
  return {
    blueprintId: id, version,
    subject: str(b.subject, 'subject', 40),
    ageBand,
    title: str(b.title, 'title', 160),
    description: optStr(b.description, 'description', 1000),
    lessonEmoji: optStr(b.lessonEmoji, 'lessonEmoji', 8),
    gradeMin: optStr(b.gradeMin, 'gradeMin', 4),
    gradeMax: optStr(b.gradeMax, 'gradeMax', 4),
    estimatedMinutes: typeof b.estimatedMinutes === 'number' ? b.estimatedMinutes : undefined,
    standards: strArr(b.standards, 'standards', 12),
    skillCodes: b.skillCodes === undefined ? undefined : strArr(b.skillCodes, 'skillCodes', 12),
    objectives: strArr(b.objectives, 'objectives', 6),
    misconceptions: b.misconceptions === undefined ? undefined : strArr(b.misconceptions, 'misconceptions', 8),
    sourceRefs,
    steps,
    practiceSpec,
    interactionTypes: b.interactionTypes === undefined ? undefined : strArr(b.interactionTypes, 'interactionTypes', 8),
    visualStyle: optStr(b.visualStyle, 'visualStyle', 300),
    narrativeArc: optStr(b.narrativeArc, 'narrativeArc', 1000),
  };
}

/** Resolve TEKS codes → dashboard skill codes via skill_standard_mappings.
 * The dashboard stores subject-prefixed codes (MATH.5.3H); blueprints carry
 * bare TEKS codes (5.3H) — try both forms. */
async function resolveSkillCodes(subject: string, standards: string[], provided?: string[]): Promise<string[]> {
  const prefix = subject.toUpperCase() === 'READING' || subject.toUpperCase() === 'WRITING' ? 'ELA' : subject.toUpperCase().slice(0, 4);
  const forms = standards.flatMap(c => [c, `${prefix}.${c}`]);
  const out = new Set(provided ?? []);
  try {
    const r = await pool.query(
      `SELECT DISTINCT s.code FROM skill_standard_mappings m
       JOIN skills s ON s.id = m.skill_id
       JOIN curriculum_standards cs ON cs.id = m.standard_id
       WHERE cs.standard_code = ANY($1) OR cs.standard_code = ANY($2)`,
      [standards, forms]);
    for (const row of r.rows) if (row.code) out.add(row.code);
  } catch (err) {
    console.error('[atlas-blueprint-intake] skill resolution failed (standards kept as-is)', err);
  }
  return [...out];
}

function designSpecFor(bp: Blueprint, skillCodes: string[], sentBy: string, sentAt: string): LessonDesignSpec {
  return {
    objectives: bp.objectives,
    narrativeArc: bp.narrativeArc ?? '',
    visualStyle: bp.visualStyle ?? '',
    interactionTypes: bp.interactionTypes ?? [],
    targetSkills: skillCodes,
    adaptationNotes: bp.misconceptions?.length
      ? `Misconception patterns to target: ${bp.misconceptions.join('; ')}`
      : undefined,
    ...({
      blueprint: {
        blueprintId: bp.blueprintId, version: bp.version, sourceRefs: bp.sourceRefs ?? [],
        sentBy, sentAt,
        practiceSpec: bp.practiceSpec ?? null,
      },
    }),
  } as LessonDesignSpec;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const serviceKey = req.headers['x-internal-service-key'] as string;
  if (!INTERNAL_SERVICE_KEY || serviceKey !== INTERNAL_SERVICE_KEY) {
    return res.status(401).json({ error: 'Service authentication required' });
  }

  if (req.method === 'GET') {
    const blueprintId = req.query.blueprintId as string;
    if (!blueprintId || !isSlug(blueprintId)) {
      return res.status(400).json({ error: 'blueprintId query parameter required' });
    }
    try {
      const r = await pool.query(
        `SELECT l.id, l.lesson_code, l.lifecycle_state, l.review_status, l.published_at, l.updated_at,
                COALESCE(json_agg(json_build_object('childUserId', a.child_user_id, 'status', a.status))
                         FILTER (WHERE a.id IS NOT NULL), '[]') AS assignments
         FROM lessons l LEFT JOIN lesson_assignments a ON a.lesson_id = l.id
         WHERE l.course_code = 'atlas' AND l.lesson_code LIKE $1
         GROUP BY l.id ORDER BY l.lesson_code`,
        [`${blueprintId}.v%`]);
      return res.status(200).json({
        blueprintId,
        versions: r.rows.map(row => ({
          lessonId: row.id, lessonCode: row.lesson_code,
          state: row.lifecycle_state, reviewStatus: row.review_status,
          publishedAt: row.published_at, updatedAt: row.updated_at,
          assignments: row.assignments,
        })),
      });
    } catch (error: any) {
      console.error('[atlas-blueprint-intake]', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let bp: Blueprint;
  try {
    bp = parseBlueprint(req.body?.blueprint ?? req.body);
  } catch (err) {
    if (err instanceof Invalid) return res.status(400).json({ error: err.message });
    throw err;
  }

  const lessonCode = `${bp.blueprintId}.v${bp.version}`;
  const sentAt = new Date().toISOString();
  const sentBy = 'atlas-pi-workspace';

  try {
    const existing = await service.getLessonByCode(COURSE_CODE, lessonCode);
    const skillCodes = await resolveSkillCodes(bp.subject, bp.standards, bp.skillCodes);
    const spec = designSpecFor(bp, skillCodes, sentBy, sentAt);

    if (existing) {
      // Merge, not replace: a partial re-send must not wipe provenance the
      // earlier full send carried (practiceSpec, sourceRefs).
      const prev = (existing.designSpec as unknown as { blueprint?: Record<string, unknown> } | null)?.blueprint;
      if (prev && typeof prev === 'object') {
        (spec as unknown as { blueprint: Record<string, unknown> }).blueprint = { ...prev, ...(((spec as unknown as { blueprint?: Record<string, unknown> }).blueprint) ?? {}) };
      }
      const updated = await service.updateLessonDesignSpec(existing.id, spec);
      return res.status(200).json({ lesson: updated, updated: true, skillCodes });
    }

    const lesson = await service.createLesson({
      courseCode: COURSE_CODE,
      lessonCode,
      title: bp.title,
      description: bp.description,
      lessonEmoji: bp.lessonEmoji,
      subject: bp.subject,
      ageBand: bp.ageBand,
      minGrade: bp.gradeMin,
      maxGrade: bp.gradeMax,
      difficulty: bp.practiceSpec?.difficulty ?? 2,
      skillCodes,
      curriculumStandards: bp.standards,
      estimatedMinutes: bp.estimatedMinutes,
      createdBy: sentBy,
    });

    await service.updateLessonDesignSpec(lesson.id, spec);
    for (let i = 0; i < bp.steps.length; i++) {
      const s = bp.steps[i];
      const stepInput: CreateStepInput = {
        lessonId: lesson.id,
        stepNumber: i + 1,
        stepType: s.stepType as StepType,
        title: s.title,
        description: s.intent,
      };
      await service.createStep(stepInput);
    }
    // The blueprint IS the design spec — skip the Opus design_spec phase.
    const atSpec = await service.updateLessonState(lesson.id, 'spec', sentBy, 'system');
    return res.status(201).json({ lesson: atSpec ?? lesson, updated: false, skillCodes });
  } catch (error: any) {
    console.error('[atlas-blueprint-intake]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
