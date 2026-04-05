/**
 * GET /api/email/attachment-files
 *
 * Query imported email attachment files from workspace.files.
 * Used by all studios (Deep Research, Podcast, Workspace, Voice, Email)
 * to discover and access document content from email attachments.
 *
 * Query params:
 *   - email_id: filter by source email
 *   - workspace_id: filter by workspace (default: all)
 *   - source_type: filter by source type (default: email_attachment)
 *   - search: text search in extracted_text
 *   - limit: max results (default: 50)
 *   - include_text: include full extracted_text in response (default: false)
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  database: process.env.POSTGRES_DB || "ecosystem_unified",
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD || undefined,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    email_id,
    workspace_id,
    source_type = "email_attachment",
    search,
    limit = "50",
    include_text = "false",
  } = req.query as Record<string, string>;

  try {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (source_type) {
      conditions.push(`source_type = $${paramIdx++}`);
      params.push(source_type);
    }

    if (email_id) {
      conditions.push(`source_email_id = $${paramIdx++}`);
      params.push(email_id);
    }

    if (workspace_id) {
      conditions.push(`workspace_id = $${paramIdx++}`);
      params.push(workspace_id);
    }

    if (search) {
      conditions.push(`extracted_text ILIKE $${paramIdx++}`);
      params.push(`%${search}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    params.push(parseInt(limit) || 50);

    const includeTextCol = include_text === "true" ? ", extracted_text" : "";

    const result = await pool.query(
      `SELECT
         id, workspace_id, file_name, file_type, file_size, storage_url,
         source_type, source_email_id, vectorized, metadata,
         uploaded_at, created_at,
         (extracted_text IS NOT NULL) as has_text,
         CASE WHEN extracted_text IS NOT NULL THEN length(extracted_text) ELSE 0 END as text_length
         ${includeTextCol}
       FROM workspace.files
       ${whereClause}
       ORDER BY uploaded_at DESC
       LIMIT $${paramIdx}`,
      params
    );

    return res.status(200).json({
      files: result.rows,
      count: result.rows.length,
    });
  } catch (err: any) {
    console.error("[attachment-files] Error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
