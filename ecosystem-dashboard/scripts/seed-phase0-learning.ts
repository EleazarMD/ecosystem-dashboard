import { Pool, PoolClient } from 'pg';

import {
  PHASE0_CHILDREN,
  PHASE0_DOMAINS,
  PHASE0_SKILLS,
  Phase0SkillSeed,
  Phase0Subject,
} from '../src/lib/kids-pic/phase0-seed-data';

const POSTGRES_POOL = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number.parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'ecosystem_unified',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

const KIDS_PCG_URL = process.env.KIDS_PCG_URL || 'http://127.0.0.1:8771';
const KIDS_PCG_ADMIN_KEY = process.env.KIDS_PCG_ADMIN_KEY || '';
const MASTERY_THRESHOLD = Number.parseFloat(process.env.PHASE0_MASTERY_THRESHOLD || '0.8');
const SEED_PCG = parseBool(process.env.SEED_PCG, true);
const SEED_POSTGRES = parseBool(process.env.SEED_POSTGRES, true);
const REQUIRE_CHILD_OWNER_IDS = parseBool(process.env.REQUIRE_CHILD_OWNER_IDS, false);

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function asSkillLevel(skill: Phase0SkillSeed): string {
  return `g${skill.minGrade}_to_g${skill.maxGrade}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

function groupSortOrder(skills: Phase0SkillSeed[]): Map<string, number> {
  const map = new Map<string, number>();
  const bySubject = new Map<Phase0Subject, number>();

  for (const skill of skills) {
    const next = (bySubject.get(skill.subject) || 0) + 1;
    bySubject.set(skill.subject, next);
    map.set(skill.skillId, next);
  }

  return map;
}

async function requireTable(client: PoolClient, tableName: string): Promise<boolean> {
  const result = await client.query<{ exists: string | null }>(
    `SELECT to_regclass($1) AS exists`,
    [`public.${tableName}`],
  );
  return !!result.rows[0]?.exists;
}

async function getColumns(client: PoolClient, tableName: string): Promise<Set<string>> {
  const result = await client.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  );

  return new Set(result.rows.map((row) => row.column_name));
}

async function getColumnTypes(client: PoolClient, tableName: string): Promise<Map<string, string>> {
  const result = await client.query<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  );

  return new Map(result.rows.map((row) => [row.column_name, row.data_type]));
}

function isNumericType(dataType: string | undefined): boolean {
  if (!dataType) {
    return false;
  }

  return [
    'smallint',
    'integer',
    'bigint',
    'decimal',
    'numeric',
    'real',
    'double precision',
  ].includes(dataType);
}

function normalizeGrade(grade: string): number | null {
  if (grade.toUpperCase() === 'K') {
    return 0;
  }

  const parsed = Number.parseInt(grade, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function upsertDomainsAndSkills(): Promise<void> {
  const client = await POSTGRES_POOL.connect();

  try {
    const hasDomainsTable = await requireTable(client, 'skill_domains');
    const hasSkillsTable = await requireTable(client, 'skills');

    if (!hasDomainsTable || !hasSkillsTable) {
      console.warn(
        `[phase0-seed] Skipping Postgres mirror because required tables are missing: skill_domains=${hasDomainsTable}, skills=${hasSkillsTable}`,
      );
      return;
    }

    const domainColumns = await getColumns(client, 'skill_domains');
    const skillColumns = await getColumns(client, 'skills');
    const skillColumnTypes = await getColumnTypes(client, 'skills');
    const skillSortOrder = groupSortOrder(PHASE0_SKILLS);

    await client.query('BEGIN');

    for (const domain of PHASE0_DOMAINS) {
      const insertColumns: string[] = ['code', 'name', 'description'];
      const values: unknown[] = [domain.code, domain.name, domain.description];
      const updates: string[] = ['name = EXCLUDED.name', 'description = EXCLUDED.description'];

      if (domainColumns.has('icon')) {
        insertColumns.push('icon');
        values.push(domain.icon);
        updates.push('icon = EXCLUDED.icon');
      }
      if (domainColumns.has('color')) {
        insertColumns.push('color');
        values.push(domain.color);
        updates.push('color = EXCLUDED.color');
      }
      if (domainColumns.has('sort_order')) {
        insertColumns.push('sort_order');
        values.push(domain.sortOrder);
        updates.push('sort_order = EXCLUDED.sort_order');
      }
      if (domainColumns.has('is_active')) {
        insertColumns.push('is_active');
        values.push(true);
        updates.push('is_active = EXCLUDED.is_active');
      }

      const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
      await client.query(
        `INSERT INTO skill_domains (${insertColumns.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT (code) DO UPDATE SET ${updates.join(', ')}`,
        values,
      );
    }

    const domainIds = new Map<string, string>();
    const domainResult = await client.query<{ id: string; code: string }>(
      `SELECT id, code FROM skill_domains WHERE code = ANY($1::text[])`,
      [PHASE0_DOMAINS.map((d) => d.code)],
    );
    for (const row of domainResult.rows) {
      domainIds.set(row.code, row.id);
    }

    for (const skill of PHASE0_SKILLS) {
      const domainId = domainIds.get(skill.subject);
      if (!domainId) {
        throw new Error(`Missing domain_id for subject ${skill.subject}`);
      }

      const insertColumns: string[] = ['domain_id', 'code', 'name', 'description'];
      const values: unknown[] = [domainId, skill.skillId, skill.name, skill.description];
      const updates: string[] = [
        'domain_id = EXCLUDED.domain_id',
        'name = EXCLUDED.name',
        'description = EXCLUDED.description',
      ];

      if (skillColumns.has('min_grade')) {
        insertColumns.push('min_grade');
        if (isNumericType(skillColumnTypes.get('min_grade'))) {
          values.push(normalizeGrade(skill.minGrade));
        } else {
          values.push(skill.minGrade);
        }
        updates.push('min_grade = EXCLUDED.min_grade');
      }
      if (skillColumns.has('max_grade')) {
        insertColumns.push('max_grade');
        if (isNumericType(skillColumnTypes.get('max_grade'))) {
          values.push(normalizeGrade(skill.maxGrade));
        } else {
          values.push(skill.maxGrade);
        }
        updates.push('max_grade = EXCLUDED.max_grade');
      }
      if (skillColumns.has('skill_level')) {
        insertColumns.push('skill_level');
        if (isNumericType(skillColumnTypes.get('skill_level'))) {
          values.push(normalizeGrade(skill.maxGrade) || (skillSortOrder.get(skill.skillId) || 1));
        } else {
          values.push(asSkillLevel(skill));
        }
        updates.push('skill_level = EXCLUDED.skill_level');
      }
      if (skillColumns.has('assessment_type')) {
        insertColumns.push('assessment_type');
        values.push(skill.assessmentType);
        updates.push('assessment_type = EXCLUDED.assessment_type');
      }
      if (skillColumns.has('mastery_threshold')) {
        insertColumns.push('mastery_threshold');
        values.push(MASTERY_THRESHOLD);
        updates.push('mastery_threshold = EXCLUDED.mastery_threshold');
      }
      if (skillColumns.has('sort_order')) {
        insertColumns.push('sort_order');
        values.push(skillSortOrder.get(skill.skillId) || 1);
        updates.push('sort_order = EXCLUDED.sort_order');
      }
      if (skillColumns.has('is_active')) {
        insertColumns.push('is_active');
        values.push(true);
        updates.push('is_active = EXCLUDED.is_active');
      }
      if (skillColumns.has('parent_skill_id')) {
        insertColumns.push('parent_skill_id');
        values.push(null);
        updates.push('parent_skill_id = EXCLUDED.parent_skill_id');
      }

      const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
      await client.query(
        `INSERT INTO skills (${insertColumns.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT (code) DO UPDATE SET ${updates.join(', ')}`,
        values,
      );
    }

    await client.query('COMMIT');
    console.log(`[phase0-seed] Postgres mirror upserted ${PHASE0_DOMAINS.length} domains and ${PHASE0_SKILLS.length} skills`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function pcgPost(path: string, ownerId: string, body: unknown): Promise<void> {
  const response = await fetch(`${KIDS_PCG_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PCG-Key': KIDS_PCG_ADMIN_KEY,
      'X-PCG-Owner-Id': ownerId,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`PCG ${path} failed (${response.status}): ${detail}`);
  }
}

async function pcgPut(path: string, ownerId: string, body: unknown): Promise<void> {
  const response = await fetch(`${KIDS_PCG_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-PCG-Key': KIDS_PCG_ADMIN_KEY,
      'X-PCG-Owner-Id': ownerId,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`PCG ${path} failed (${response.status}): ${detail}`);
  }
}

function resolveSeedOwnerId(): string {
  const candidates = [
    process.env.KIDS_PCG_SEED_OWNER_ID,
    process.env.KIDS_PCG_DEFAULT_OWNER_ID,
    process.env.LUCA_OWNER_ID,
    process.env.SOFIA_OWNER_ID,
  ];

  const owner = candidates.find((value) => !!value && value.trim().length > 0);
  if (!owner) {
    throw new Error(
      'Missing seed owner id. Set KIDS_PCG_SEED_OWNER_ID (or KIDS_PCG_DEFAULT_OWNER_ID/LUCA_OWNER_ID/SOFIA_OWNER_ID).',
    );
  }

  return owner;
}

async function seedKidsPCG(): Promise<void> {
  if (!KIDS_PCG_ADMIN_KEY) {
    throw new Error('Missing KIDS_PCG_ADMIN_KEY for kids-pcg seed operations.');
  }

  const seedOwnerId = resolveSeedOwnerId();

  for (const skill of PHASE0_SKILLS) {
    await pcgPost('/api/learner/skills', seedOwnerId, {
      skill_id: skill.skillId,
      name: skill.name,
      subject: skill.subject,
      standard: null,
      description: skill.description,
      prerequisites: skill.prerequisites,
    });
  }

  console.log(`[phase0-seed] kids-pcg upserted ${PHASE0_SKILLS.length} skills`);

  for (const child of PHASE0_CHILDREN) {
    const ownerId = process.env[child.ownerIdEnvVar];

    if (!ownerId) {
      const message = `[phase0-seed] ${child.ownerIdEnvVar} is not set, skipping ${child.name} readiness target upsert.`;
      if (REQUIRE_CHILD_OWNER_IDS) {
        throw new Error(message);
      }
      console.warn(message);
      continue;
    }

    await pcgPut('/api/pic/identity', ownerId, {
      name: child.name,
      age_band: child.ageBand,
      grade: child.grade,
    });

    await pcgPost('/api/pic/readiness-targets', ownerId, {
      target_code: child.readinessTargetCode,
      title: child.readinessTargetTitle,
      description: child.readinessDescription,
      mastery_threshold: MASTERY_THRESHOLD,
      skill_ids: [
        ...child.readinessSkillsBySubject.math,
        ...child.readinessSkillsBySubject.reading,
      ],
      metadata: {
        phase: 'phase0',
        child_key: child.key,
        child_name: child.name,
        age: child.age,
        age_band: child.ageBand,
        entering_grade: child.grade,
        readiness_skills_by_subject: child.readinessSkillsBySubject,
        stretch_skills_by_subject: child.stretchSkillsBySubject,
        reading_level_source: 'phase1_diagnostic',
        curriculum_overlay_default: 'off',
      },
    });

    console.log(`[phase0-seed] upserted readiness target for ${child.name}`);
  }
}

async function main(): Promise<void> {
  console.log('[phase0-seed] starting');
  console.log(`[phase0-seed] toggles: SEED_POSTGRES=${SEED_POSTGRES} SEED_PCG=${SEED_PCG}`);

  if (SEED_POSTGRES) {
    await upsertDomainsAndSkills();
  }

  if (SEED_PCG) {
    await seedKidsPCG();
  }

  console.log('[phase0-seed] done');
}

main()
  .catch((error) => {
    console.error('[phase0-seed] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await POSTGRES_POOL.end();
  });
