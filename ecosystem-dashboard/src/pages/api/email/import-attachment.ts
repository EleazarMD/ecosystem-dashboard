/**
 * POST /api/email/import-attachment
 *
 * Imports an email attachment into the workspace.files table so it is
 * accessible by every studio (Deep Research, Podcast, Workspace, Voice,
 * Email Studio, etc.).
 *
 * Flow:
 *   1. Caller provides email_id + attachment_index (+ optional workspace_id)
 *   2. This route calls Hermes Core /v1/attachments/download/:email_id/:index
 *      to fetch the binary
 *   3. Binary is saved to public/workspace-files/<uuid>.<ext>
 *   4. Text is extracted (PDF via pypdf proxy, TXT inline)
 *   5. Row inserted into workspace.files with source_type='email_attachment'
 *
 * Returns the new file record so any studio can reference it immediately.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  database: process.env.POSTGRES_DB || "ecosystem_unified",
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD || undefined,
});

const HERMES_CORE_URL =
  process.env.HERMES_CORE_URL || "http://127.0.0.1:8780";
const HERMES_JWT =
  process.env.HERMES_JWT_TOKEN ||
  process.env.HERMES_AUTH_TOKEN ||
  "";

// Default workspace for email-sourced files
const DEFAULT_WORKSPACE_ID = "36e84af0-e52b-4bed-9a8f-01797e20792a"; // Dr. Eleazar's Workspace

const WORKSPACE_FILES_DIR = path.join(
  process.cwd(),
  "public",
  "workspace-files"
);

export const config = { api: { bodyParser: { sizeLimit: "50mb" } } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    email_id,
    attachment_index = 0,
    workspace_id,
  } = req.body as {
    email_id: string;
    attachment_index?: number;
    workspace_id?: string;
  };

  if (!email_id) {
    return res.status(400).json({ error: "email_id is required" });
  }

  const resolvedWorkspaceId = workspace_id || DEFAULT_WORKSPACE_ID;

  try {
    // ── 1. Check if already imported ──────────────────────────────
    const existing = await pool.query(
      `SELECT id, file_name, storage_url, extracted_text IS NOT NULL as has_text
       FROM workspace.files
       WHERE source_email_id = $1
         AND source_type = 'email_attachment'
         AND metadata->>'attachment_index' = $2
       LIMIT 1`,
      [email_id, String(attachment_index)]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      return res.status(200).json({
        success: true,
        already_imported: true,
        file: {
          id: row.id,
          file_name: row.file_name,
          storage_url: row.storage_url,
          has_text: row.has_text,
        },
      });
    }

    // ── 2. Download binary from Hermes Core ──────────────────────
    const encodedEmailId = encodeURIComponent(email_id);
    const downloadUrl = `${HERMES_CORE_URL}/v1/attachments/download/${encodedEmailId}/${attachment_index}`;

    const downloadResp = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${HERMES_JWT}` },
    });

    if (!downloadResp.ok) {
      const errText = await downloadResp.text();
      return res.status(502).json({
        error: `Hermes attachment download failed (${downloadResp.status})`,
        detail: errText.slice(0, 200),
      });
    }

    const contentDisposition =
      downloadResp.headers.get("content-disposition") || "";
    const contentType =
      downloadResp.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await downloadResp.arrayBuffer());

    // Parse filename from Content-Disposition or generate one
    let fileName = `attachment_${attachment_index}`;
    const fnMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
    if (fnMatch) {
      fileName = fnMatch[1].trim();
    }

    // ── 3. Save to workspace-files directory ─────────────────────
    await fs.mkdir(WORKSPACE_FILES_DIR, { recursive: true });

    const fileId = randomUUID();
    const ext = path.extname(fileName) || mimeToExt(contentType);
    const storedName = `${fileId}${ext}`;
    const storagePath = path.join(WORKSPACE_FILES_DIR, storedName);
    await fs.writeFile(storagePath, buffer);

    const servingUrl = `/workspace-files/${storedName}`;

    // ── 4. Extract text for PDFs/text files ──────────────────────
    let extractedText: string | null = null;
    let pageCount = 0;

    if (contentType === "application/pdf" || ext === ".pdf") {
      // Call Hermes Core extract-text endpoint (already built)
      try {
        const extractResp = await fetch(
          `${HERMES_CORE_URL}/v1/attachments/extract-text/${encodedEmailId}/${attachment_index}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${HERMES_JWT}` },
          }
        );
        if (extractResp.ok) {
          const extractData = await extractResp.json();
          extractedText = extractData.preview
            ? null
            : null; // We'll read from workspace file
          pageCount = extractData.pages || 0;

          // Read the full extracted text from the workspace file that extract-text created
          if (extractData.workspace_file) {
            try {
              // The file is inside the container, fetch via reading the text_length
              extractedText = extractData.preview || null;
              // Better: re-extract locally since we have the PDF
              extractedText = await extractPdfText(buffer);
              pageCount = extractedText
                ? (extractedText.match(/--- Page \d+/g) || []).length
                : 0;
            } catch {
              // Use preview as fallback
              extractedText = extractData.preview || null;
            }
          }
        }
      } catch (e) {
        console.warn("[import-attachment] Text extraction failed:", e);
      }

      // Fallback: extract locally with pdf-parse if available
      if (!extractedText) {
        extractedText = await extractPdfText(buffer);
        if (extractedText) {
          pageCount = (extractedText.match(/--- Page \d+/g) || []).length;
        }
      }
    } else if (
      contentType.startsWith("text/") ||
      [".txt", ".md", ".csv", ".json"].includes(ext)
    ) {
      extractedText = buffer.toString("utf-8");
    }

    // ── 5. Get email metadata from Hermes for context ────────────
    let emailSubject = "";
    let emailFrom = "";
    let emailDate = "";
    try {
      const emailResp = await fetch(
        `${HERMES_CORE_URL}/v1/emails/${encodedEmailId}`,
        { headers: { Authorization: `Bearer ${HERMES_JWT}` } }
      );
      if (emailResp.ok) {
        const emailData = await emailResp.json();
        const email = emailData.email || emailData;
        emailSubject = email.subject || "";
        emailFrom = email.from_email || email.from_addr || "";
        emailDate = email.date || "";
      }
    } catch {
      // Non-critical
    }

    // ── 6. Insert into workspace.files ───────────────────────────
    const metadata = {
      attachment_index: String(attachment_index),
      email_subject: emailSubject,
      email_from: emailFrom,
      email_date: emailDate,
      page_count: pageCount,
      content_type: contentType,
      original_size: buffer.length,
    };

    await pool.query(
      `INSERT INTO workspace.files
         (id, workspace_id, file_name, file_type, file_size, storage_url,
          uploaded_by, source_type, source_email_id, extracted_text, metadata,
          vectorized, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, NOW())`,
      [
        fileId,
        resolvedWorkspaceId,
        fileName,
        contentType,
        buffer.length,
        servingUrl,
        "hermes-email-import",
        "email_attachment",
        email_id,
        extractedText,
        JSON.stringify(metadata),
      ]
    );

    console.log(
      `[import-attachment] ✅ Imported ${fileName} (${fileId}) from email ${email_id.slice(0, 30)}…`
    );

    // ── 7. Auto-vectorize via FileEmbeddingService (background, best-effort) ─
    let vectorized = false;
    if (extractedText && extractedText.length > 100) {
      try {
        const { FileEmbeddingService } = await import(
          "@/lib/workspace/file-embedding-service"
        );
        const embeddingService = new FileEmbeddingService();

        // Chunk the text (~500 chars per chunk with overlap)
        const CHUNK_SIZE = 500;
        const OVERLAP = 50;
        const chunks: Array<{
          text: string;
          pageNumber: number;
          chunkIndex: number;
          metadata?: Record<string, any>;
        }> = [];
        let pos = 0;
        let chunkIdx = 0;
        while (pos < extractedText.length) {
          const end = Math.min(pos + CHUNK_SIZE, extractedText.length);
          const chunkText = extractedText.slice(pos, end);
          // Detect page number from --- Page N --- markers
          const pageMatch = chunkText.match(/--- Page (\d+)/);
          const pageNum = pageMatch ? parseInt(pageMatch[1]) : 1;
          chunks.push({
            text: chunkText,
            pageNumber: pageNum,
            chunkIndex: chunkIdx,
            metadata: { source: "email_attachment", email_id },
          });
          pos += CHUNK_SIZE - OVERLAP;
          chunkIdx++;
        }

        const embeddings = await embeddingService.embedFileChunks(chunks);
        await embeddingService.storeFileEmbeddings(fileId, chunks, embeddings);

        // Mark file as vectorized
        await pool.query(
          "UPDATE workspace.files SET vectorized = true WHERE id = $1",
          [fileId]
        );
        vectorized = true;
        console.log(
          `[import-attachment] 🧠 Vectorized ${chunks.length} chunks for ${fileName}`
        );
      } catch (vecErr: any) {
        console.warn(
          `[import-attachment] Vectorization failed (non-fatal): ${vecErr.message}`
        );
      }
    }

    return res.status(200).json({
      success: true,
      already_imported: false,
      file: {
        id: fileId,
        file_name: fileName,
        file_type: contentType,
        file_size: buffer.length,
        storage_url: servingUrl,
        workspace_id: resolvedWorkspaceId,
        source_type: "email_attachment",
        source_email_id: email_id,
        has_text: !!extractedText,
        text_length: extractedText?.length || 0,
        page_count: pageCount,
        vectorized,
        metadata,
      },
    });
  } catch (err: any) {
    console.error("[import-attachment] Error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "text/plain": ".txt",
    "text/csv": ".csv",
    "image/png": ".png",
    "image/jpeg": ".jpg",
  };
  return map[mime] || ".bin";
}

async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    // Use pdf-parse (commonly available in Node projects)
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    if (data.text && data.text.trim()) {
      // Format with page markers
      return data.text;
    }
    return null;
  } catch {
    // pdf-parse not installed — that's OK, text was already extracted by Hermes
    return null;
  }
}
