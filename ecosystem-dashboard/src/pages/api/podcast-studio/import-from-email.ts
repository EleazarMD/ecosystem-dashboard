/**
 * POST /api/podcast-studio/import-from-email
 *
 * Imports an email attachment from workspace.files into a podcast project
 * as a research material. Bridges the cross-studio file storage with the
 * podcast source material system.
 *
 * Body: { projectId, fileId }
 *   - projectId: podcast project UUID
 *   - fileId: workspace.files UUID (source_type='email_attachment')
 *
 * Returns the created research_material record.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { addResearchMaterial, pool } from '@/lib/db/podcast-studio-db';
import { Pool } from 'pg';

const wsPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'ecosystem_unified',
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD || undefined,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // List available email attachments for import
    try {
      const result = await wsPool.query(`
        SELECT id, file_name, file_type, file_size, storage_url,
               source_email_id, metadata,
               extracted_text IS NOT NULL as has_text,
               CASE WHEN extracted_text IS NOT NULL THEN length(extracted_text) ELSE 0 END as text_length
        FROM workspace.files
        WHERE source_type = 'email_attachment'
          AND extracted_text IS NOT NULL
        ORDER BY uploaded_at DESC
        LIMIT 50
      `);
      return res.status(200).json({ files: result.rows });
    } catch (err: any) {
      console.error('[import-from-email] GET error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { projectId, fileId } = req.body;

  if (!projectId || !fileId) {
    return res.status(400).json({ error: 'projectId and fileId are required' });
  }

  try {
    // Fetch the email attachment file with extracted text
    const fileResult = await wsPool.query(`
      SELECT id, file_name, file_type, file_size, storage_url,
             source_email_id, extracted_text, metadata
      FROM workspace.files
      WHERE id = $1 AND source_type = 'email_attachment'
    `, [fileId]);

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email attachment file not found' });
    }

    const file = fileResult.rows[0];
    const metadata = typeof file.metadata === 'string'
      ? JSON.parse(file.metadata)
      : file.metadata || {};

    if (!file.extracted_text) {
      return res.status(422).json({
        error: 'No extracted text available for this attachment',
      });
    }

    // Sanitize content for PostgreSQL
    let content = file.extracted_text;
    if (typeof content === 'string') {
      content = content.replace(/\x00/g, '');
      content = content.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '');
    }

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const pageCount = metadata.page_count || 0;

    // Create research material linked to the podcast project
    const material = await addResearchMaterial({
      project_id: projectId,
      title: file.file_name || 'Email Attachment',
      type: file.file_type?.includes('pdf') ? 'pdf' : 'document',
      url: file.storage_url || undefined,
      file_path: file.storage_url || undefined,
      content,
      content_hash: undefined,
      page_count: pageCount,
      word_count: wordCount,
      is_selected: true,
      metadata: {
        source: 'email_attachment',
        workspace_file_id: file.id,
        email_subject: metadata.email_subject || '',
        email_from: metadata.email_from || '',
        email_date: metadata.email_date || '',
        source_email_id: file.source_email_id,
      },
    });

    console.log(
      `[import-from-email] Imported "${file.file_name}" → project ${projectId}`
    );

    return res.status(201).json(material);
  } catch (err: any) {
    console.error('[import-from-email] POST error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
