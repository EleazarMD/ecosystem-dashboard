-- PCG hard-cut migration: rename legacy PIC safety objects to PCG naming.
-- This migration is idempotent and safe to rerun.

BEGIN;

-- 1) Rename core safety tables from pic_* to pcg_* when needed.
DO $$
DECLARE
  rename_rec RECORD;
  source_schema TEXT;
BEGIN
  FOR rename_rec IN
    SELECT *
    FROM (
      VALUES
        ('pic_parental_access_log', 'pcg_parental_access_log'),
        ('pic_access_patterns', 'pcg_access_patterns'),
        ('pic_learning_snapshots', 'pcg_learning_snapshots'),
        ('pic_wellness_indicators', 'pcg_wellness_indicators'),
        ('pic_parental_goals', 'pcg_parental_goals')
    ) AS mapping(old_name, new_name)
  LOOP
    source_schema := NULL;

    SELECT n.nspname
      INTO source_schema
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = rename_rec.old_name
      AND c.relkind IN ('r', 'p')
    ORDER BY CASE WHEN n.nspname = 'public' THEN 0 ELSE 1 END, n.nspname
    LIMIT 1;

    IF source_schema IS NULL THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = source_schema
        AND c.relname = rename_rec.new_name
        AND c.relkind IN ('r', 'p')
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE %I.%I RENAME TO %I',
      source_schema,
      rename_rec.old_name,
      rename_rec.new_name
    );
  END LOOP;
END $$;

-- 2) Rename safety-check function from check_pic_safety_rule -> check_pcg_safety_rule.
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT
      n.nspname AS schema_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'check_pic_safety_rule'
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_proc p2
      JOIN pg_namespace n2 ON n2.oid = p2.pronamespace
      WHERE n2.nspname = fn.schema_name
        AND p2.proname = 'check_pcg_safety_rule'
        AND pg_get_function_identity_arguments(p2.oid) = fn.identity_args
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER FUNCTION %I.check_pic_safety_rule(%s) RENAME TO check_pcg_safety_rule',
      fn.schema_name,
      fn.identity_args
    );
  END LOOP;
END $$;

-- 3) Rename parental goals columns from pic_* to pcg_* if still present.
DO $$
DECLARE
  target_schema TEXT;
BEGIN
  SELECT n.nspname
    INTO target_schema
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'pcg_parental_goals'
    AND c.relkind IN ('r', 'p')
  ORDER BY CASE WHEN n.nspname = 'public' THEN 0 ELSE 1 END, n.nspname
  LIMIT 1;

  IF target_schema IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = target_schema
      AND table_name = 'pcg_parental_goals'
      AND column_name = 'pic_recommendation'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = target_schema
      AND table_name = 'pcg_parental_goals'
      AND column_name = 'pcg_recommendation'
  ) THEN
    EXECUTE format(
      'ALTER TABLE %I.pcg_parental_goals RENAME COLUMN pic_recommendation TO pcg_recommendation',
      target_schema
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = target_schema
      AND table_name = 'pcg_parental_goals'
      AND column_name = 'pic_reasoning'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = target_schema
      AND table_name = 'pcg_parental_goals'
      AND column_name = 'pcg_reasoning'
  ) THEN
    EXECUTE format(
      'ALTER TABLE %I.pcg_parental_goals RENAME COLUMN pic_reasoning TO pcg_reasoning',
      target_schema
    );
  END IF;
END $$;

-- 4) Normalize legacy resource_type values in access logs (if present).
DO $$
DECLARE
  access_schema TEXT;
BEGIN
  SELECT n.nspname
    INTO access_schema
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'pcg_parental_access_log'
    AND c.relkind IN ('r', 'p')
  ORDER BY CASE WHEN n.nspname = 'public' THEN 0 ELSE 1 END, n.nspname
  LIMIT 1;

  IF access_schema IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = access_schema
      AND table_name = 'pcg_parental_access_log'
      AND column_name = 'resource_type'
  ) THEN
    EXECUTE format(
      'UPDATE %I.pcg_parental_access_log
       SET resource_type = CASE resource_type
         WHEN ''pic_learning_snapshots'' THEN ''pcg_learning_snapshots''
         WHEN ''pic_wellness_indicators'' THEN ''pcg_wellness_indicators''
         WHEN ''pic_parental_goals'' THEN ''pcg_parental_goals''
         ELSE resource_type
       END
       WHERE resource_type IN (''pic_learning_snapshots'', ''pic_wellness_indicators'', ''pic_parental_goals'')',
      access_schema
    );
  END IF;
END $$;

COMMIT;
