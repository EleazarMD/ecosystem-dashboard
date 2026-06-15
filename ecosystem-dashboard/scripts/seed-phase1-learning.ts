import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

import { PHASE1_STARTER_CONTENT } from '../src/lib/kids-pic/phase1-starter-content';

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

const APPLY_SCHEMA = parseBool(process.env.PHASE1_APPLY_SCHEMA, true);
const SEED_CATALOG = parseBool(process.env.PHASE1_SEED_CATALOG, true);

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

async function ensureSchemaApplied(): Promise<void> {
  const schemaPath = path.resolve(process.cwd(), 'src/lib/platform/learning-schema.sql');
  const schemaSql = await readFile(schemaPath, 'utf8');
  await POSTGRES_POOL.query(schemaSql);
  console.log('[phase1-seed] applied learning schema file');
}

async function requireLearningContentTable(): Promise<void> {
  const result = await POSTGRES_POOL.query<{ exists: string | null }>(
    'SELECT to_regclass($1) AS exists',
    ['public.learning_content_items'],
  );

  if (!result.rows[0]?.exists) {
    throw new Error('learning_content_items table is missing. Apply src/lib/platform/learning-schema.sql first.');
  }
}

async function upsertStarterCatalog(): Promise<void> {
  await requireLearningContentTable();

  const client = await POSTGRES_POOL.connect();
  try {
    await client.query('BEGIN');

    for (const item of PHASE1_STARTER_CONTENT) {
      await client.query(
        `INSERT INTO learning_content_items (
          id,
          version,
          subject,
          skill_code,
          analytical_tags,
          content_type,
          age_band,
          min_grade,
          max_grade,
          difficulty,
          prompt,
          answer_key,
          hint_set,
          provenance,
          review_status,
          safety_status,
          low_stakes_only,
          updated_at
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5::jsonb,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12::jsonb,
          $13::jsonb,
          $14,
          $15,
          $16,
          $17,
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          version = EXCLUDED.version,
          subject = EXCLUDED.subject,
          skill_code = EXCLUDED.skill_code,
          analytical_tags = EXCLUDED.analytical_tags,
          content_type = EXCLUDED.content_type,
          age_band = EXCLUDED.age_band,
          min_grade = EXCLUDED.min_grade,
          max_grade = EXCLUDED.max_grade,
          difficulty = EXCLUDED.difficulty,
          prompt = EXCLUDED.prompt,
          answer_key = EXCLUDED.answer_key,
          hint_set = EXCLUDED.hint_set,
          provenance = EXCLUDED.provenance,
          review_status = EXCLUDED.review_status,
          safety_status = EXCLUDED.safety_status,
          low_stakes_only = EXCLUDED.low_stakes_only,
          updated_at = NOW()`,
        [
          item.id,
          item.version,
          item.subject,
          item.skillCode,
          JSON.stringify(item.analyticalTags || []),
          item.type,
          item.ageBand,
          item.minGrade,
          item.maxGrade,
          item.difficulty,
          item.prompt,
          JSON.stringify(item.answerKey),
          JSON.stringify(item.hintSet || []),
          item.provenance,
          item.reviewStatus,
          item.safetyStatus,
          item.lowStakesOnly,
        ],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const count = await POSTGRES_POOL.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM learning_content_items');
  console.log(
    `[phase1-seed] upserted ${PHASE1_STARTER_CONTENT.length} starter items (table now has ${count.rows[0]?.count || '0'} rows)`,
  );
}

async function main(): Promise<void> {
  if (!APPLY_SCHEMA && !SEED_CATALOG) {
    console.log('[phase1-seed] nothing to do (PHASE1_APPLY_SCHEMA=false and PHASE1_SEED_CATALOG=false)');
    return;
  }

  if (APPLY_SCHEMA) {
    await ensureSchemaApplied();
  }

  if (SEED_CATALOG) {
    await upsertStarterCatalog();
  }

  console.log('[phase1-seed] complete');
}

main()
  .catch((error) => {
    console.error('[phase1-seed] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await POSTGRES_POOL.end().catch(() => undefined);
  });
