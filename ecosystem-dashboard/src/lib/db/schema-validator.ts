/**
 * Database Schema Consistency Validator
 * Tool for DashAI to check database connections and schema usage
 */

import { Pool } from 'pg';

interface ValidationResult {
  valid: boolean;
  database: string;
  schema?: string;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}

interface ConnectionConfig {
  database: string;
  expectedSchema: string;
  searchPath?: string;
}

export class SchemaValidator {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Validate current database connection
   */
  async validateConnection(): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      database: '',
      issues: [],
      warnings: [],
      recommendations: []
    };

    try {
      // Check which database we're connected to
      const dbResult = await this.pool.query('SELECT current_database()');
      result.database = dbResult.rows[0].current_database;

      // Check if it's the correct database
      if (result.database !== 'ecosystem_unified') {
        result.valid = false;
        result.issues.push(
          `❌ Connected to wrong database: '${result.database}'`
        );
        result.recommendations.push(
          `Update connection to use 'ecosystem_unified' database`
        );
      }

      // Check current search_path
      const pathResult = await this.pool.query('SHOW search_path');
      const searchPath = pathResult.rows[0].search_path;
      result.schema = searchPath;

      // Validate search path includes necessary schemas
      const requiredSchemas = ['podcast', 'workspace', 'public'];
      const missingSchemas = requiredSchemas.filter(
        schema => !searchPath.includes(schema)
      );

      if (missingSchemas.length > 0) {
        result.warnings.push(
          `⚠️ Search path missing schemas: ${missingSchemas.join(', ')}`
        );
        result.recommendations.push(
          `Add to connection options: '-c search_path=${requiredSchemas.join(',')}'`
        );
      }

      // Check if schemas exist
      const schemasResult = await this.pool.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name IN ('podcast', 'ai_gateway', 'workspace', 'knowledge', 'research')
      `);
      const existingSchemas = schemasResult.rows.map(r => r.schema_name);

      const expectedSchemas = ['podcast', 'ai_gateway', 'workspace', 'knowledge'];
      const missingDbSchemas = expectedSchemas.filter(
        s => !existingSchemas.includes(s)
      );

      if (missingDbSchemas.length > 0) {
        result.valid = false;
        result.issues.push(
          `❌ Missing schemas in database: ${missingDbSchemas.join(', ')}`
        );
      }

    } catch (error) {
      result.valid = false;
      result.issues.push(`❌ Connection error: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate that a table exists in the correct schema
   */
  async validateTable(tableName: string, expectedSchema: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      database: '',
      schema: expectedSchema,
      issues: [],
      warnings: [],
      recommendations: []
    };

    try {
      // Check if table exists in expected schema
      const tableCheck = await this.pool.query(`
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_name = $1
      `, [tableName]);

      if (tableCheck.rows.length === 0) {
        result.valid = false;
        result.issues.push(`❌ Table '${tableName}' not found in any schema`);
        return result;
      }

      const foundSchemas = tableCheck.rows.map(r => r.table_schema);

      // Check if it's in the expected schema
      if (!foundSchemas.includes(expectedSchema)) {
        result.valid = false;
        result.issues.push(
          `❌ Table '${tableName}' not found in schema '${expectedSchema}'`
        );
        result.issues.push(
          `Found in schemas: ${foundSchemas.join(', ')}`
        );
      }

      // Check if table exists in multiple schemas (potential confusion)
      if (foundSchemas.length > 1) {
        result.warnings.push(
          `⚠️ Table '${tableName}' exists in multiple schemas: ${foundSchemas.join(', ')}`
        );
        result.recommendations.push(
          `Use schema-qualified queries: ${expectedSchema}.${tableName}`
        );
      }

    } catch (error) {
      result.valid = false;
      result.issues.push(`❌ Validation error: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate a SQL query for proper schema usage
   */
  async validateQuery(query: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      database: '',
      issues: [],
      warnings: [],
      recommendations: []
    };

    // Extract table names from query (simple regex, not perfect)
    const tablePattern = /(?:FROM|JOIN)\s+([a-z_]+)/gi;
    const tables: string[] = [];
    let match;
    while ((match = tablePattern.exec(query)) !== null) {
      tables.push(match[1]);
    }

    // Check if tables are schema-qualified
    for (const table of tables) {
      if (!table.includes('.')) {
        result.warnings.push(
          `⚠️ Unqualified table reference: '${table}'`
        );
        result.recommendations.push(
          `Consider using schema-qualified name for clarity`
        );
      }
    }

    // Check for references to old database names in comments
    if (query.includes('ecosystem_dashboard') || 
        query.includes('ai_gateway_db') ||
        query.includes('knowledge_graph')) {
      result.warnings.push(
        `⚠️ Query contains reference to old database names`
      );
      result.recommendations.push(
        `Update comments/references to use 'ecosystem_unified'`
      );
    }

    return result;
  }

  /**
   * Get schema catalog information (from workspace)
   */
  async getSchemaCatalog(): Promise<any[]> {
    try {
      const result = await this.pool.query(`
        SELECT 
          source_database,
          source_schema,
          source_table,
          business_description,
          data_classification,
          contains_pii
        FROM workspace.table_catalog_entries
        WHERE sync_status = 'synced'
        ORDER BY source_schema, source_table
      `);
      return result.rows;
    } catch (error) {
      console.error('Failed to fetch schema catalog:', error);
      return [];
    }
  }

  /**
   * Comprehensive validation report
   */
  async generateReport(): Promise<{
    overall: 'PASS' | 'WARN' | 'FAIL';
    connection: ValidationResult;
    tables: Record<string, ValidationResult>;
    summary: {
      totalIssues: number;
      totalWarnings: number;
      criticalIssues: string[];
    };
  }> {
    const connectionResult = await this.validateConnection();

    // Check common tables
    const tablesToCheck = [
      { name: 'podcast_projects', schema: 'podcast' },
      { name: 'projects', schema: 'ai_gateway' },
      { name: 'workspaces', schema: 'workspace' },
      { name: 'knowledge_documents', schema: 'knowledge' }
    ];

    const tableResults: Record<string, ValidationResult> = {};
    for (const { name, schema } of tablesToCheck) {
      tableResults[`${schema}.${name}`] = await this.validateTable(name, schema);
    }

    const totalIssues = connectionResult.issues.length + 
      Object.values(tableResults).reduce((sum, r) => sum + r.issues.length, 0);
    
    const totalWarnings = connectionResult.warnings.length + 
      Object.values(tableResults).reduce((sum, r) => sum + r.warnings.length, 0);

    const criticalIssues = [
      ...connectionResult.issues,
      ...Object.values(tableResults).flatMap(r => r.issues)
    ];

    const overall = totalIssues > 0 ? 'FAIL' : (totalWarnings > 0 ? 'WARN' : 'PASS');

    return {
      overall,
      connection: connectionResult,
      tables: tableResults,
      summary: {
        totalIssues,
        totalWarnings,
        criticalIssues
      }
    };
  }

  /**
   * Format validation report for display
   */
  formatReport(report: Awaited<ReturnType<typeof this.generateReport>>): string {
    let output = '# 🔍 Database Schema Validation Report\n\n';
    
    output += `**Overall Status**: ${report.overall === 'PASS' ? '✅ PASS' : 
                                       report.overall === 'WARN' ? '⚠️ WARNINGS' : 
                                       '❌ FAILED'}\n\n`;

    // Connection validation
    output += '## 📡 Connection Validation\n\n';
    output += `- Database: \`${report.connection.database}\`\n`;
    output += `- Search Path: \`${report.connection.schema}\`\n\n`;

    if (report.connection.issues.length > 0) {
      output += '### ❌ Issues\n\n';
      report.connection.issues.forEach(issue => {
        output += `- ${issue}\n`;
      });
      output += '\n';
    }

    if (report.connection.warnings.length > 0) {
      output += '### ⚠️ Warnings\n\n';
      report.connection.warnings.forEach(warn => {
        output += `- ${warn}\n`;
      });
      output += '\n';
    }

    if (report.connection.recommendations.length > 0) {
      output += '### 💡 Recommendations\n\n';
      report.connection.recommendations.forEach(rec => {
        output += `- ${rec}\n`;
      });
      output += '\n';
    }

    // Table validation
    output += '## 📊 Table Validation\n\n';
    Object.entries(report.tables).forEach(([table, result]) => {
      const status = result.valid ? '✅' : '❌';
      output += `### ${status} ${table}\n\n`;
      
      if (result.issues.length > 0) {
        result.issues.forEach(issue => output += `- ${issue}\n`);
      }
      if (result.warnings.length > 0) {
        result.warnings.forEach(warn => output += `- ${warn}\n`);
      }
      output += '\n';
    });

    // Summary
    output += '## 📈 Summary\n\n';
    output += `- **Total Issues**: ${report.summary.totalIssues}\n`;
    output += `- **Total Warnings**: ${report.summary.totalWarnings}\n`;

    if (report.summary.criticalIssues.length > 0) {
      output += '\n### 🚨 Critical Issues\n\n';
      report.summary.criticalIssues.forEach(issue => {
        output += `- ${issue}\n`;
      });
    }

    return output;
  }
}

/**
 * Quick validation function for DashAI to call
 */
export async function validateDatabaseSchema(pool: Pool): Promise<string> {
  const validator = new SchemaValidator(pool);
  const report = await validator.generateReport();
  return validator.formatReport(report);
}

/**
 * Export for use in API endpoints
 */
export default SchemaValidator;
