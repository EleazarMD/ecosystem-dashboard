/**
 * Database Schema Validation API
 * Endpoint for DashAI to check database consistency
 * 
 * GET /api/db/validate-schema
 * Returns validation report
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db/podcast-studio-db';
import SchemaValidator, { validateDatabaseSchema } from '../../../lib/db/schema-validator';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { format = 'json', detailed = 'true' } = req.query;

    const validator = new SchemaValidator(pool);

    if (detailed === 'true') {
      // Full validation report
      const report = await validator.generateReport();

      if (format === 'markdown') {
        const markdown = validator.formatReport(report);
        return res.status(200).send(markdown);
      }

      return res.status(200).json({
        success: true,
        report,
        timestamp: new Date().toISOString()
      });
    } else {
      // Quick validation
      const connectionResult = await validator.validateConnection();
      
      return res.status(200).json({
        success: connectionResult.valid,
        database: connectionResult.database,
        schema: connectionResult.schema,
        issues: connectionResult.issues,
        warnings: connectionResult.warnings,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Schema validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate schema',
      message: error.message
    });
  }
}
