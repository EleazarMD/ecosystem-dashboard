/**
 * Mastery sync process — reconciles the authoritative kids-pcg (Neo4j) learner
 * model with the Postgres analytics/proficiency overlay (Decision D1).
 *
 * kids-pcg is authoritative for: skill graph, prerequisites, mastery state,
 * misconceptions, and next-objectives planning.
 * Postgres is the analytics layer: proficiency snapshots, assessment history,
 * milestones, curriculum alignments.
 *
 * This module provides:
 * - `fetchKidsPcgMastery` — read mastery state from kids-pcg REST API
 * - `fetchPostgresSnapshot` — read proficiency from SkillProgressService
 * - `compareMastery` — diff the two stores, return per-skill discrepancies
 * - `syncMasteryToPostgres` — push kids-pcg authoritative scores into Postgres
 * - `runMasterySync` — full reconciliation cycle (fetch → compare → sync → report)
 *
 * All network/DB operations are injected via interfaces so the module is
 * unit-testable without live services.
 */

import type { ChildSkillSummary, SkillProgress } from './SkillProgressService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Mastery state for a single skill as reported by kids-pcg (authoritative). */
export interface KidsPcgMasteryEntry {
  skillCode: string;
  /** Mastery score 0–1 from kids-pcg. */
  masteryScore: number;
  /** Whether kids-pcg considers this skill mastered. */
  isMastered: boolean;
  /** Last time evidence was recorded in kids-pcg (ISO string). */
  lastEvidenceAt?: string;
}

/** Result of fetching mastery from kids-pcg for a child. */
export interface KidsPcgMasteryResult {
  childId: string;
  skills: KidsPcgMasteryEntry[];
}

/** Discrepancy between kids-pcg (authoritative) and Postgres (analytics). */
export interface MasteryDiscrepancy {
  skillCode: string;
  skillName: string;
  /** Score from kids-pcg (authoritative). */
  pcgScore: number;
  /** Score from Postgres (analytics overlay). */
  postgresScore: number;
  /** Absolute difference. */
  delta: number;
  /** Whether kids-pcg marks this as mastered but Postgres doesn't (or vice versa). */
  masteryMismatch: boolean;
  /** Direction of the discrepancy. */
  direction: 'pcg_higher' | 'postgres_higher' | 'in_sync';
}

/** Result of a sync operation for a single skill. */
export interface SyncResultEntry {
  skillCode: string;
  status: 'synced' | 'skipped' | 'failed';
  detail?: string;
}

/** Full sync report for a child. */
export interface MasterySyncReport {
  childId: string;
  /** Total skills compared. */
  totalCompared: number;
  /** Skills that were in sync. */
  inSync: number;
  /** Skills with discrepancies. */
  discrepancies: MasteryDiscrepancy[];
  /** Skills pushed from kids-pcg → Postgres. */
  syncedToPostgres: SyncResultEntry[];
  /** Skills that could not be synced. */
  failedSyncs: SyncResultEntry[];
  /** Whether the overall sync succeeded. */
  success: boolean;
}

// ---------------------------------------------------------------------------
// Ports (injectable interfaces for testability)
// ---------------------------------------------------------------------------

/** Fetches mastery state from kids-pcg. */
export interface KidsPcgMasteryFetcher {
  fetch(childId: string): Promise<KidsPcgMasteryResult>;
}

/** Fetches proficiency snapshot from Postgres and can record assessments. */
export interface PostgresMasteryPort {
  fetchSummary(childId: string): Promise<ChildSkillSummary | null>;
  recordAssessment(input: {
    childId: string;
    skillCode: string;
    score: number;
    sourceType: string;
    sourceId?: string;
  }): Promise<void>;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Score difference threshold below which the two stores are considered in sync. */
export const SYNC_SCORE_TOLERANCE = 0.05;

/** Source type for sync-generated assessments in Postgres. */
export const SYNC_SOURCE_TYPE = 'mastery_sync';

// ---------------------------------------------------------------------------
// Pure comparison logic
// ---------------------------------------------------------------------------

function flattenPostgresScores(summary: ChildSkillSummary): Map<string, { score: number; skillName: string }> {
  const map = new Map<string, { score: number; skillName: string }>();
  for (const domain of summary.domains) {
    for (const skill of domain.skills) {
      if (!map.has(skill.skillCode)) {
        map.set(skill.skillCode, {
          score: skill.currentScore,
          skillName: skill.skillName,
        });
      }
    }
  }
  return map;
}

/**
 * Compare kids-pcg mastery entries against a Postgres proficiency snapshot.
 * Returns discrepancies sorted by largest delta first.
 */
export function compareMastery(
  pcgResult: KidsPcgMasteryResult,
  postgresSummary: ChildSkillSummary | null,
): MasteryDiscrepancy[] {
  const pgScores = postgresSummary ? flattenPostgresScores(postgresSummary) : new Map();
  const discrepancies: MasteryDiscrepancy[] = [];

  for (const pcgEntry of pcgResult.skills) {
    const pgEntry = pgScores.get(pcgEntry.skillCode);
    const pgScore = pgEntry?.score ?? 0;
    const delta = Math.abs(pcgEntry.masteryScore - pgScore);

    if (delta > SYNC_SCORE_TOLERANCE) {
      const masteryMismatch = pcgEntry.isMastered !== (pgScore >= 0.7);
      discrepancies.push({
        skillCode: pcgEntry.skillCode,
        skillName: pgEntry?.skillName ?? pcgEntry.skillCode,
        pcgScore: pcgEntry.masteryScore,
        postgresScore: pgScore,
        delta,
        masteryMismatch,
        direction: pcgEntry.masteryScore > pgScore ? 'pcg_higher' : 'postgres_higher',
      });
    }
  }

  discrepancies.sort((a, b) => b.delta - a.delta);
  return discrepancies;
}

// ---------------------------------------------------------------------------
// Sync execution
// ---------------------------------------------------------------------------

/**
 * Push kids-pcg authoritative mastery scores into Postgres for the given
 * discrepancies. Returns per-skill results.
 */
export async function syncMasteryToPostgres(
  childId: string,
  discrepancies: MasteryDiscrepancy[],
  postgresPort: PostgresMasteryPort,
): Promise<SyncResultEntry[]> {
  const results: SyncResultEntry[] = [];

  for (const disc of discrepancies) {
    if (disc.direction !== 'pcg_higher') {
      results.push({
        skillCode: disc.skillCode,
        status: 'skipped',
        detail: 'postgres score is higher; not overwriting analytics with lower authoritative score',
      });
      continue;
    }

    try {
      await postgresPort.recordAssessment({
        childId,
        skillCode: disc.skillCode,
        score: disc.pcgScore,
        sourceType: SYNC_SOURCE_TYPE,
      });
      results.push({
        skillCode: disc.skillCode,
        status: 'synced',
      });
    } catch (error) {
      results.push({
        skillCode: disc.skillCode,
        status: 'failed',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Run a full mastery sync cycle for a child:
 * 1. Fetch mastery from kids-pcg (authoritative)
 * 2. Fetch proficiency snapshot from Postgres (analytics)
 * 3. Compare and identify discrepancies
 * 4. Push authoritative scores into Postgres where kids-pcg is higher
 * 5. Return a full report
 */
export async function runMasterySync(
  childId: string,
  pcgFetcher: KidsPcgMasteryFetcher,
  postgresPort: PostgresMasteryPort,
): Promise<MasterySyncReport> {
  const [pcgResult, postgresSummary] = await Promise.all([
    pcgFetcher.fetch(childId),
    postgresPort.fetchSummary(childId),
  ]);

  const discrepancies = compareMastery(pcgResult, postgresSummary);
  const syncResults = await syncMasteryToPostgres(childId, discrepancies, postgresPort);

  const syncedToPostgres = syncResults.filter((r) => r.status === 'synced');
  const failedSyncs = syncResults.filter((r) => r.status === 'failed');
  const inSync = pcgResult.skills.length - discrepancies.length;

  return {
    childId,
    totalCompared: pcgResult.skills.length,
    inSync: Math.max(0, inSync),
    discrepancies,
    syncedToPostgres,
    failedSyncs,
    success: failedSyncs.length === 0,
  };
}

// ---------------------------------------------------------------------------
// kids-pcg REST API adapter (production implementation)
// ---------------------------------------------------------------------------

/**
 * Production KidsPcgMasteryFetcher that reads from the kids-pcg REST API.
 * Uses the learner mastery status endpoint.
 */
export class KidsPcgMasteryApiFetcher implements KidsPcgMasteryFetcher {
  private readonly baseUrl: string;
  private readonly adminKey: string;
  private readonly ownerId: string;
  private readonly masteryPath: string;

  constructor(opts: {
    baseUrl?: string;
    adminKey?: string;
    ownerId: string;
    masteryPath?: string;
  }) {
    this.baseUrl = opts.baseUrl || process.env.KIDS_PCG_URL || 'http://127.0.0.1:8771';
    this.adminKey = opts.adminKey || process.env.KIDS_PCG_ADMIN_KEY || '';
    this.ownerId = opts.ownerId;
    this.masteryPath = opts.masteryPath || process.env.KIDS_PCG_MASTERY_PATH || '/api/learner/mastery';
  }

  async fetch(childId: string): Promise<KidsPcgMasteryResult> {
    if (!this.adminKey) {
      return { childId, skills: [] };
    }

    const url = `${this.baseUrl}${this.masteryPath}`;
    const response = await fetch(url, {
      headers: {
        'X-PCG-Key': this.adminKey,
        'X-PCG-Owner-Id': this.ownerId,
      },
    });

    if (!response.ok) {
      throw new Error(`kids-pcg mastery fetch failed (${response.status})`);
    }

    const data = await response.json() as Record<string, unknown>;
    const rawSkills = Array.isArray(data.skills) ? data.skills : [];
    const skills: KidsPcgMasteryEntry[] = rawSkills.map((raw: Record<string, unknown>) => ({
      skillCode: String(raw.skill_id ?? raw.skillCode ?? ''),
      masteryScore: Number(raw.mastery_score ?? raw.masteryScore ?? 0),
      isMastered: Boolean(raw.is_mastered ?? raw.isMastered ?? false),
      lastEvidenceAt: raw.last_evidence_at ? String(raw.last_evidence_at) : undefined,
    }));

    return { childId, skills };
  }
}

/**
 * Production PostgresMasteryPort backed by SkillProgressService.
 */
export class SkillProgressServiceMasteryPort implements PostgresMasteryPort {
  private readonly service: {
    getChildSkillSummary(childId: string): Promise<ChildSkillSummary | null>;
    recordSkillAssessment(input: {
      childId: string;
      skillCode: string;
      sourceType: string;
      sourceId?: string;
      score: number;
      evidenceType?: string;
      evidenceData?: Record<string, unknown>;
    }): Promise<void>;
  };

  constructor(service: InstanceType<typeof import('./SkillProgressService').SkillProgressService>) {
    this.service = service;
  }

  async fetchSummary(childId: string): Promise<ChildSkillSummary | null> {
    return this.service.getChildSkillSummary(childId);
  }

  async recordAssessment(input: {
    childId: string;
    skillCode: string;
    score: number;
    sourceType: string;
    sourceId?: string;
  }): Promise<void> {
    await this.service.recordSkillAssessment({
      childId: input.childId,
      skillCode: input.skillCode,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      score: input.score,
      evidenceType: 'mastery_sync',
      evidenceData: { source: 'kids_pcg_sync' },
    });
  }
}
