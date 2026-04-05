/**
 * Schema Sync Library
 * Helper functions for migrations to document schema changes
 * 
 * Usage in migrations:
 * 
 * import { documentTableCreation } from '@/lib/workspace/schema-sync';
 * 
 * export async function up(knex: Knex) {
 *   await knex.schema.createTable('my_table', ...);
 *   await documentTableCreation(knex, { ... });
 * }
 */

import { Pool } from 'pg';

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  primary_key?: boolean;
  unique?: boolean;
  default?: string;
  description?: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  type?: string; // 'btree', 'gin', 'gist', 'hash'
  unique?: boolean;
  where?: string; // Partial index condition
}

export interface ForeignKeyDefinition {
  constraint_name: string;
  column: string;
  references_schema: string;
  references_table: string;
  references_column: string;
  on_delete?: string;
  on_update?: string;
}

export interface ConstraintDefinition {
  name: string;
  type: 'check' | 'unique' | 'primary_key';
  definition: string;
}

export interface TableDocumentation {
  schema_name: string;
  table_name: string;
  description: string;
  purpose?: string;
  owner_service: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
  foreign_keys?: ForeignKeyDefinition[];
  constraints?: ConstraintDefinition[];
  migration_version: string;
}

/**
 * Document a table creation in the workspace
 */
export async function documentTableCreation(
  pool: Pool | any,
  doc: TableDocumentation
): Promise<string> {
  const query = `
    INSERT INTO workspace.ecosystem_data_models (
      schema_name,
      table_name,
      description,
      purpose,
      owner_service,
      columns,
      indexes,
      foreign_keys,
      constraints,
      migration_version,
      created_by_migration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
    ON CONFLICT (database_name, schema_name, table_name)
    DO UPDATE SET
      description = EXCLUDED.description,
      purpose = EXCLUDED.purpose,
      columns = EXCLUDED.columns,
      indexes = EXCLUDED.indexes,
      foreign_keys = EXCLUDED.foreign_keys,
      constraints = EXCLUDED.constraints,
      updated_at = CURRENT_TIMESTAMP,
      schema_version = workspace.ecosystem_data_models.schema_version + 1
    RETURNING id
  `;

  const result = await pool.query(query, [
    doc.schema_name,
    doc.table_name,
    doc.description,
    doc.purpose || null,
    doc.owner_service,
    JSON.stringify(doc.columns),
    JSON.stringify(doc.indexes || []),
    JSON.stringify(doc.foreign_keys || []),
    JSON.stringify(doc.constraints || []),
    doc.migration_version
  ]);

  // Log the change
  await logSchemaChange(pool, {
    schema_name: doc.schema_name,
    table_name: doc.table_name,
    change_type: 'create',
    change_description: `Created table: ${doc.description}`,
    detected_by: 'migration',
    migration_file: doc.migration_version
  });

  return result.rows[0].id;
}

/**
 * Document a column addition
 */
export async function documentColumnAddition(
  pool: Pool | any,
  params: {
    schema_name: string;
    table_name: string;
    column: ColumnDefinition;
    migration_version: string;
  }
): Promise<void> {
  // Get current columns
  const currentResult = await pool.query(
    'SELECT columns FROM workspace.ecosystem_data_models WHERE schema_name = $1 AND table_name = $2',
    [params.schema_name, params.table_name]
  );

  if (currentResult.rows.length === 0) {
    throw new Error(`Table ${params.schema_name}.${params.table_name} not documented. Document it first.`);
  }

  const columns = currentResult.rows[0].columns;
  columns.push(params.column);

  // Update
  await pool.query(
    `UPDATE workspace.ecosystem_data_models 
     SET columns = $1, 
         updated_at = CURRENT_TIMESTAMP,
         schema_version = schema_version + 1,
         migration_version = $2
     WHERE schema_name = $3 AND table_name = $4`,
    [JSON.stringify(columns), params.migration_version, params.schema_name, params.table_name]
  );

  // Log
  await logSchemaChange(pool, {
    schema_name: params.schema_name,
    table_name: params.table_name,
    object_type: 'column',
    change_type: 'alter',
    change_description: `Added column: ${params.column.name} (${params.column.type})`,
    detected_by: 'migration',
    migration_file: params.migration_version,
    after_state: params.column
  });
}

/**
 * Document an index addition
 */
export async function documentIndexAddition(
  pool: Pool | any,
  params: {
    schema_name: string;
    table_name: string;
    index: IndexDefinition;
    migration_version: string;
  }
): Promise<void> {
  // Get current indexes
  const currentResult = await pool.query(
    'SELECT indexes FROM workspace.ecosystem_data_models WHERE schema_name = $1 AND table_name = $2',
    [params.schema_name, params.table_name]
  );

  if (currentResult.rows.length === 0) {
    throw new Error(`Table ${params.schema_name}.${params.table_name} not documented`);
  }

  const indexes = currentResult.rows[0].indexes || [];
  indexes.push(params.index);

  // Update
  await pool.query(
    `UPDATE workspace.ecosystem_data_models 
     SET indexes = $1, 
         updated_at = CURRENT_TIMESTAMP,
         migration_version = $2
     WHERE schema_name = $3 AND table_name = $4`,
    [JSON.stringify(indexes), params.migration_version, params.schema_name, params.table_name]
  );

  // Log
  await logSchemaChange(pool, {
    schema_name: params.schema_name,
    table_name: params.table_name,
    object_type: 'index',
    change_type: 'create',
    change_description: `Added index: ${params.index.name} on (${params.index.columns.join(', ')})`,
    detected_by: 'migration',
    migration_file: params.migration_version
  });
}

/**
 * Document a foreign key addition
 */
export async function documentForeignKeyAddition(
  pool: Pool | any,
  params: {
    schema_name: string;
    table_name: string;
    foreign_key: ForeignKeyDefinition;
    migration_version: string;
  }
): Promise<void> {
  // Get current FKs
  const currentResult = await pool.query(
    'SELECT foreign_keys FROM workspace.ecosystem_data_models WHERE schema_name = $1 AND table_name = $2',
    [params.schema_name, params.table_name]
  );

  if (currentResult.rows.length === 0) {
    throw new Error(`Table ${params.schema_name}.${params.table_name} not documented`);
  }

  const foreign_keys = currentResult.rows[0].foreign_keys || [];
  foreign_keys.push(params.foreign_key);

  // Update
  await pool.query(
    `UPDATE workspace.ecosystem_data_models 
     SET foreign_keys = $1, 
         updated_at = CURRENT_TIMESTAMP,
         migration_version = $2
     WHERE schema_name = $3 AND table_name = $4`,
    [JSON.stringify(foreign_keys), params.migration_version, params.schema_name, params.table_name]
  );

  // Also add to relationships table
  await pool.query(
    `INSERT INTO workspace.schema_relationships (
      source_schema, source_table, source_column,
      target_schema, target_table, target_column,
      relationship_type, constraint_name, on_delete, on_update
    ) VALUES ($1, $2, $3, $4, $5, $6, 'foreign_key', $7, $8, $9)
    ON CONFLICT DO NOTHING`,
    [
      params.schema_name,
      params.table_name,
      params.foreign_key.column,
      params.foreign_key.references_schema,
      params.foreign_key.references_table,
      params.foreign_key.references_column,
      params.foreign_key.constraint_name,
      params.foreign_key.on_delete || 'NO ACTION',
      params.foreign_key.on_update || 'NO ACTION'
    ]
  );

  // Log
  await logSchemaChange(pool, {
    schema_name: params.schema_name,
    table_name: params.table_name,
    object_type: 'constraint',
    change_type: 'create',
    change_description: `Added FK: ${params.foreign_key.constraint_name} → ${params.foreign_key.references_schema}.${params.foreign_key.references_table}`,
    detected_by: 'migration',
    migration_file: params.migration_version
  });
}

/**
 * Document a table drop
 */
export async function documentTableDrop(
  pool: Pool | any,
  params: {
    schema_name: string;
    table_name: string;
    migration_version: string;
    reason?: string;
  }
): Promise<void> {
  // Get current state before deletion
  const currentResult = await pool.query(
    'SELECT * FROM workspace.ecosystem_data_models WHERE schema_name = $1 AND table_name = $2',
    [params.schema_name, params.table_name]
  );

  const beforeState = currentResult.rows[0] || null;

  // Log the drop
  await logSchemaChange(pool, {
    schema_name: params.schema_name,
    table_name: params.table_name,
    change_type: 'drop',
    change_description: `Dropped table: ${params.reason || 'No reason provided'}`,
    detected_by: 'migration',
    migration_file: params.migration_version,
    before_state: beforeState,
    breaking_change: true
  });

  // Mark as deleted (don't actually delete for history)
  await pool.query(
    `UPDATE workspace.ecosystem_data_models 
     SET description = 'DELETED: ' || description,
         updated_at = CURRENT_TIMESTAMP
     WHERE schema_name = $1 AND table_name = $2`,
    [params.schema_name, params.table_name]
  );
}

/**
 * Log a schema change
 */
async function logSchemaChange(
  pool: Pool | any,
  params: {
    schema_name: string;
    table_name?: string;
    object_type?: string;
    change_type: string;
    change_description: string;
    detected_by: string;
    migration_file?: string;
    before_state?: any;
    after_state?: any;
    breaking_change?: boolean;
  }
): Promise<void> {
  await pool.query(
    `INSERT INTO workspace.schema_change_log (
      schema_name, table_name, object_type, change_type,
      change_description, detected_by, migration_file,
      before_state, after_state, breaking_change
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      params.schema_name,
      params.table_name || null,
      params.object_type || null,
      params.change_type,
      params.change_description,
      params.detected_by,
      params.migration_file || null,
      params.before_state ? JSON.stringify(params.before_state) : null,
      params.after_state ? JSON.stringify(params.after_state) : null,
      params.breaking_change || false
    ]
  );
}

/**
 * Validate schema documentation exists
 */
export async function validateDocumentation(
  pool: Pool | any,
  schema_name: string,
  table_name: string
): Promise<boolean> {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM workspace.ecosystem_data_models WHERE schema_name = $1 AND table_name = $2',
    [schema_name, table_name]
  );

  return result.rows[0].count > 0;
}
