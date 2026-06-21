# PCG Safety DB Migration Runbook

This runbook applies the PCG hard-cut migration for legacy safety objects.

## Migration file

- `database/migrations/20260616_rename_pic_to_pcg_safety_objects.sql`

## What it renames

- Tables:
  - `pic_parental_access_log` -> `pcg_parental_access_log`
  - `pic_access_patterns` -> `pcg_access_patterns`
  - `pic_learning_snapshots` -> `pcg_learning_snapshots`
  - `pic_wellness_indicators` -> `pcg_wellness_indicators`
  - `pic_parental_goals` -> `pcg_parental_goals`
- Function:
  - `check_pic_safety_rule(...)` -> `check_pcg_safety_rule(...)`
- Columns (on `pcg_parental_goals`):
  - `pic_recommendation` -> `pcg_recommendation`
  - `pic_reasoning` -> `pcg_reasoning`
- Access log value normalization:
  - `resource_type` values with `pic_*` -> corresponding `pcg_*`

The migration is idempotent and safe to rerun.

## Prerequisites

- You must have DB access to the environment that actually stores kids safety tables/functions.
- This is not necessarily the local `ecosystem_unified` database.

## Apply migration

Using a connection URL:

```bash
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/20260616_rename_pic_to_pcg_safety_objects.sql
```

Using host/user/db variables:

```bash
PGHOST="$TARGET_PGHOST" \
PGPORT="${TARGET_PGPORT:-5432}" \
PGUSER="$TARGET_PGUSER" \
PGPASSWORD="$TARGET_PGPASSWORD" \
PGDATABASE="$TARGET_PGDATABASE" \
psql -v ON_ERROR_STOP=1 -f database/migrations/20260616_rename_pic_to_pcg_safety_objects.sql
```

## Verify migration

```sql
SELECT n.nspname AS schema, c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','p')
  AND c.relname IN (
    'pic_parental_access_log','pic_access_patterns','pic_learning_snapshots','pic_wellness_indicators','pic_parental_goals',
    'pcg_parental_access_log','pcg_access_patterns','pcg_learning_snapshots','pcg_wellness_indicators','pcg_parental_goals'
  )
ORDER BY 1,2;

SELECT n.nspname AS schema, p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('check_pic_safety_rule','check_pcg_safety_rule')
ORDER BY 1,2,3;

SELECT table_schema, table_name, column_name
FROM information_schema.columns
WHERE table_name = 'pcg_parental_goals'
  AND column_name IN ('pic_recommendation','pic_reasoning','pcg_recommendation','pcg_reasoning')
ORDER BY 1,2,3;
```

Expected result after migration:

- Only `pcg_*` table names remain.
- Only `check_pcg_safety_rule` function remains.
- Only `pcg_recommendation` and `pcg_reasoning` columns remain.

## Notes from local verification

- Running the migration on local `ecosystem_unified` succeeded but was a no-op because none of the targeted objects exist there.
- If you see the same, run this migration against the actual kids safety datastore environment.
