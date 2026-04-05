/**
 * PDF Analysis API Endpoint
 * Analyzes PDFs using intelligent model routing:
 * - Gemini: Large documents (>32K tokens)
 * - Qwen VLM: Documents with images/charts
 * - Qwen3-32B: Small text documents
 * 
 * All documents are saved with vector embeddings for RAG retrieval.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { getPDFAnalysisService } from '../../../../lib/research/pdf-analysis-service';

// Disable Next.js body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const UPLOAD_DIR = process.env.PDF_UPLOAD_DIR || '/tmp/research-lab-pdfs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Parse multipart form data
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // 100MB max
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    // Validate file type
    if (!file.mimetype?.includes('pdf')) {
      await fs.unlink(file.filepath).catch(() => {});
      return res.status(400).json({ error: 'File must be a PDF' });
    }

    const workspaceIdInput = fields.workspace_id?.[0] || 'default';
    // Map workspace name to UUID - 'research-studio' -> AI Homelab Workspace UUID
    const workspaceId = workspaceIdInput === 'research-studio' || workspaceIdInput === 'default'
      ? '3c8a382d-01f8-4699-9bea-d3c5082cfbbe'
      : workspaceIdInput;
    
    const analysisPrompt = fields.prompt?.[0];
    const forceModel = fields.force_model?.[0] as 'gemini' | 'qwen-vlm' | 'qwen3' | undefined;
    const saveToDatabase = fields.save_to_database?.[0] !== 'false';

    console.log(`[PDF Analyze] Processing ${file.originalFilename} for workspace ${workspaceId}`);

    // Get the PDF analysis service
    const pdfService = getPDFAnalysisService();

    // Analyze the PDF
    const result = await pdfService.analyzePDF({
      filePath: file.filepath,
      fileName: file.originalFilename || 'document.pdf',
      workspaceId,
      analysisPrompt,
      forceModel,
      saveToDatabase,
    });

    // Clean up temp file if not saved to database
    if (!result.savedToDatabase) {
      await fs.unlink(file.filepath).catch(() => {});
    }

    if (!result.success) {
      return res.status(500).json({
        error: 'PDF analysis failed',
        message: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      fileId: result.fileId,
      fileName: file.originalFilename,
      analysis: result.analysis,
      metadata: {
        model: result.model,
        tokenCount: result.tokenCount,
        pageCount: result.pageCount,
        hasImages: result.hasImages,
        processingTimeMs: result.processingTimeMs,
        savedToDatabase: result.savedToDatabase,
        chunkCount: result.chunkCount,
      },
    });

  } catch (error: any) {
    console.error('[PDF Analyze] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
