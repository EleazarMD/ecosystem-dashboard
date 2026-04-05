/**
 * Book Processing API
 * 
 * Triggers NVIDIA NeMo Retriever + GraphRAG processing for a book.
 * Extracts characters, themes, plot points, vocabulary using OCR and LLM.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Pool } from 'pg';
import { spawn } from 'child_process';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow admin/administrator
  const accountType = (session.user as any).accountType;
  if (accountType === 'child') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { bookId } = req.query;
  if (!bookId || typeof bookId !== 'string') {
    return res.status(400).json({ error: 'Book ID required' });
  }

  try {
    // Get book details
    const bookResult = await pool.query(
      'SELECT * FROM children_books WHERE id = $1',
      [bookId]
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = bookResult.rows[0];

    // Check if already processing
    if (book.processing_status === 'processing') {
      return res.status(409).json({ 
        error: 'Already processing',
        message: 'This book is already being processed'
      });
    }

    // Update status to processing
    await pool.query(
      `UPDATE children_books SET processing_status = 'processing', updated_at = NOW() WHERE id = $1`,
      [bookId]
    );

    // Get tenant_id for multi-tenant
    let tenantId = null;
    try {
      const tenantResult = await pool.query(
        `SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 LIMIT 1`,
        [session.user.id]
      );
      tenantId = tenantResult.rows[0]?.tenant_id;
    } catch (e) {
      console.log('[Book Process] Could not get tenant_id');
    }

    // Start processing in background using Python processor with NVIDIA pipeline
    const processorScript = path.join(process.cwd(), 'services', 'book-graphrag', 'run_processor.py');
    
    console.log(`[Book Process] Starting NVIDIA pipeline for: ${book.title}`);
    console.log(`[Book Process] File: ${book.file_path}`);

    // Spawn Python processor with NVIDIA integration
    const pythonProcess = spawn('python3', [
      processorScript,
      '--book-id', bookId,
      '--file-path', book.file_path,
      '--title', book.title,
      '--author', book.author || 'Unknown',
      '--series', book.series_name || '',
      '--tenant-id', tenantId || '',
      '--child-id', book.assigned_child_id || '',
      '--use-nvidia', 'true'
    ], {
      env: {
        ...process.env,
        NVIDIA_INGEST_URL: process.env.NVIDIA_INGEST_URL || 'http://localhost:8082',
        BOOK_COLLECTION_NAME: 'children_books',
      },
      cwd: path.join(process.cwd(), 'services', 'book-graphrag'),
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Log output for debugging
    pythonProcess.stdout?.on('data', (data) => {
      console.log(`[Book Process] ${data.toString().trim()}`);
    });
    
    pythonProcess.stderr?.on('data', (data) => {
      console.error(`[Book Process Error] ${data.toString().trim()}`);
    });

    pythonProcess.on('exit', async (code) => {
      console.log(`[Book Process] Process exited with code ${code}`);
      
      // Update status based on exit code
      const status = code === 0 ? 'completed' : 'failed';
      try {
        await pool.query(
          `UPDATE children_books 
           SET processing_status = $1, 
               is_processed = $2,
               graphrag_indexed = $2,
               updated_at = NOW() 
           WHERE id = $3`,
          [status, code === 0, bookId]
        );
      } catch (e) {
        console.error('[Book Process] Failed to update status:', e);
      }
    });

    pythonProcess.unref();

    // Return immediately - processing happens in background
    return res.status(202).json({
      success: true,
      message: 'Book processing started with NVIDIA NeMo Retriever',
      bookId,
      status: 'processing',
      pipeline: 'nvidia-nemo-retriever'
    });

  } catch (error) {
    console.error('[Book Process] Error:', error);
    
    // Update status to failed
    try {
      await pool.query(
        `UPDATE children_books SET processing_status = 'failed', updated_at = NOW() WHERE id = $1`,
        [bookId]
      );
    } catch (e) {}

    return res.status(500).json({
      error: 'Failed to start processing',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
