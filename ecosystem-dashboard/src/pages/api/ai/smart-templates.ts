/**
 * API endpoint for AI Smart Templates
 * POST /api/ai/smart-templates - Generate a template from a description
 * POST /api/ai/smart-templates/schema - Infer a database schema from description
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';
import { SmartTemplates } from '@/lib/ai/SmartTemplates';
import { DatabaseAutoPopulate } from '@/lib/ai/DatabaseAutoPopulate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const authUserId = getMobileOrSessionUserId(session?.user?.id, req);
  if (!authUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, purpose, description, context, schema, existingRows } = req.body;

  try {
    switch (action) {
      case 'generate-template': {
        if (!purpose) {
          return res.status(400).json({ error: 'purpose is required' });
        }
        const template = await SmartTemplates.generate({ purpose, context });
        return res.status(200).json(template);
      }

      case 'infer-schema': {
        if (!description) {
          return res.status(400).json({ error: 'description is required' });
        }
        const inferredSchema = DatabaseAutoPopulate.inferSchema(description);
        return res.status(200).json({ schema: inferredSchema });
      }

      case 'suggest-rows': {
        if (!schema || !existingRows) {
          return res.status(400).json({ error: 'schema and existingRows are required' });
        }
        const suggestions = DatabaseAutoPopulate.suggestNewRows({
          schema,
          existingRows,
          count: req.body.count || 3,
        });
        return res.status(200).json({ suggestions });
      }

      case 'fill-missing': {
        if (!schema || !req.body.row || !existingRows) {
          return res.status(400).json({ error: 'schema, row, and existingRows are required' });
        }
        const filled = DatabaseAutoPopulate.suggestMissingValues(req.body.row, schema, existingRows);
        return res.status(200).json({ suggestions: filled });
      }

      default:
        return res.status(400).json({
          error: 'Invalid action. Use: generate-template, infer-schema, suggest-rows, fill-missing',
        });
    }
  } catch (error: any) {
    console.error('Smart template API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
