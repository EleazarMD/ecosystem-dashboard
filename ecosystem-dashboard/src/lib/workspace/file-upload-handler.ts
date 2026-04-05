/**
 * File Upload Handler
 * Handles file uploads, validation, and processing for workspace files
 * Integrates with FileEmbeddingService for automatic vectorization
 */

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getPDFExtractor } from './pdf-extractor';
import { getTextChunker } from './text-chunker';
import { getFileEmbeddingService } from './file-embedding-service';

export interface FileUploadConfig {
  workspaceId: string;
  uploadDir: string;
  maxFileSize: number; // in bytes
  allowedTypes: string[];
  chunkSize?: number;
  overlap?: number;
}

export interface FileUploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageUrl: string;
  vectorized: boolean;
  chunkCount?: number;
  processingTimeMs?: number;
  error?: string;
}

export interface FileMetadata {
  id: string;
  workspaceId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageUrl: string;
  uploadedAt: Date;
  vectorized: boolean;
  chunkCount?: number;
}

// Supported file types
const SUPPORTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/json': ['.json'],
  'text/javascript': ['.js', '.jsx', '.ts', '.tsx'],
  'text/x-python': ['.py'],
  'text/html': ['.html', '.htm'],
  'text/css': ['.css'],
  'application/xml': ['.xml'],
};

// Default configuration
const DEFAULT_CONFIG: Partial<FileUploadConfig> = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: Object.keys(SUPPORTED_FILE_TYPES),
  chunkSize: 1000,
  overlap: 100,
};

/**
 * File Upload Handler Class
 */
export class FileUploadHandler {
  private config: FileUploadConfig;
  private embeddingService: ReturnType<typeof getFileEmbeddingService>;
  private pdfExtractor: ReturnType<typeof getPDFExtractor>;
  private textChunker: ReturnType<typeof getTextChunker>;

  constructor(config: FileUploadConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.embeddingService = getFileEmbeddingService();
    this.pdfExtractor = getPDFExtractor();
    this.textChunker = getTextChunker();
  }

  /**
   * Validate file before processing
   */
  private validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${this.config.maxFileSize / (1024 * 1024)}MB`,
      };
    }

    // Check file type
    if (!this.config.allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type ${file.mimetype} is not supported`,
      };
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = Object.values(SUPPORTED_FILE_TYPES).flat();
    if (!allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `File extension ${ext} is not supported`,
      };
    }

    return { valid: true };
  }

  /**
   * Extract text from file based on type
   */
  private async extractText(filePath: string, mimeType: string): Promise<string> {
    switch (mimeType) {
      case 'application/pdf':
        const pdfResult = await this.pdfExtractor.extractText(filePath);
        return pdfResult.text; // Extract text property from PDFExtractionResult

      case 'text/plain':
      case 'text/markdown':
      case 'text/javascript':
      case 'text/x-python':
      case 'text/html':
      case 'text/css':
      case 'application/json':
      case 'application/xml':
        return await fs.readFile(filePath, 'utf-8');

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        // TODO: Implement DOCX extraction using mammoth
        throw new Error('DOCX extraction not yet implemented');

      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  /**
   * Process uploaded file: extract, chunk, embed, store
   */
  async processFile(file: Express.Multer.File): Promise<FileUploadResult> {
    const startTime = Date.now();

    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          fileId: '',
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          storageUrl: '',
          vectorized: false,
          error: validation.error,
        };
      }

      // Generate file ID and storage path
      const fileId = randomUUID();
      const ext = path.extname(file.originalname);
      const storagePath = path.join(this.config.uploadDir, `${fileId}${ext}`);

      // Move uploaded file to storage directory
      await fs.mkdir(this.config.uploadDir, { recursive: true });
      await fs.copyFile(file.path, storagePath);
      await fs.unlink(file.path); // Remove temp file

      console.log(`[FileUploadHandler] File uploaded: ${file.originalname} (${fileId})`);

      // Create file record in database first (required for foreign key)
      await this.embeddingService['pool'].query(
        `
        INSERT INTO workspace.files 
        (id, workspace_id, file_name, file_type, file_size, storage_url, vectorized, uploaded_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `,
        [fileId, this.config.workspaceId, file.originalname, file.mimetype, file.size, storagePath, false]
      );

      console.log(`[FileUploadHandler] File record created in database`);

      // Extract text from file
      const text = await this.extractText(storagePath, file.mimetype);
      console.log(`[FileUploadHandler] Extracted ${text.length} characters`);

      // Chunk text
      const textChunks = this.textChunker.chunk(text, {
        chunkSize: this.config.chunkSize,
        overlap: this.config.overlap,
        preserveParagraphs: true,
      });
      console.log(`[FileUploadHandler] Created ${textChunks.length} chunks`);

      // Convert TextChunk[] to FileChunk[] format
      const fileChunks = textChunks.map((chunk, i) => ({
        text: chunk.text,
        pageNumber: 1, // TODO: Extract actual page numbers from PDF
        chunkIndex: i,
        metadata: {
          fileName: file.originalname,
          fileType: file.mimetype,
          startChar: chunk.startChar,
          endChar: chunk.endChar,
        },
      }));

      // Generate and store embeddings
      const embeddings = await this.embeddingService.embedFileChunks(fileChunks);
      await this.embeddingService.storeFileEmbeddings(fileId, fileChunks, embeddings);

      // Update file record to mark as vectorized
      await this.embeddingService['pool'].query(
        `
        UPDATE workspace.files 
        SET vectorized = true, chunk_count = $1
        WHERE id = $2
      `,
        [fileChunks.length, fileId]
      );

      const processingTimeMs = Date.now() - startTime;

      console.log(
        `[FileUploadHandler] File processing complete: ${fileChunks.length} chunks, ${processingTimeMs}ms`
      );

      return {
        success: true,
        fileId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storageUrl: storagePath,
        vectorized: true,
        chunkCount: fileChunks.length,
        processingTimeMs,
      };
    } catch (error) {
      console.error('[FileUploadHandler] Error processing file:', error);

      // Clean up on error
      try {
        if (file.path) {
          await fs.unlink(file.path).catch(() => {});
        }
      } catch (cleanupError) {
        console.error('[FileUploadHandler] Cleanup error:', cleanupError);
      }

      return {
        success: false,
        fileId: '',
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storageUrl: '',
        vectorized: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get file metadata by ID
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      const result = await this.embeddingService['pool'].query(
        `
        SELECT id, workspace_id, file_name, file_type, file_size, storage_url, uploaded_at, vectorized, chunk_count
        FROM workspace.files
        WHERE id = $1
      `,
        [fileId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        workspaceId: row.workspace_id,
        fileName: row.file_name,
        fileType: row.file_type,
        fileSize: row.file_size,
        storageUrl: row.storage_url,
        uploadedAt: row.uploaded_at,
        vectorized: row.vectorized,
        chunkCount: row.chunk_count,
      };
    } catch (error) {
      console.error('[FileUploadHandler] Error fetching file metadata:', error);
      return null;
    }
  }

  /**
   * List files in workspace
   */
  async listFiles(workspaceId: string, limit: number = 50): Promise<FileMetadata[]> {
    try {
      const result = await this.embeddingService['pool'].query(
        `
        SELECT id, workspace_id, file_name, file_type, file_size, storage_url, uploaded_at, vectorized, chunk_count
        FROM workspace.files
        WHERE workspace_id = $1
        ORDER BY uploaded_at DESC
        LIMIT $2
      `,
        [workspaceId, limit]
      );

      return result.rows.map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        fileName: row.file_name,
        fileType: row.file_type,
        fileSize: row.file_size,
        storageUrl: row.storage_url,
        uploadedAt: row.uploaded_at,
        vectorized: row.vectorized,
        chunkCount: row.chunk_count,
      }));
    } catch (error) {
      console.error('[FileUploadHandler] Error listing files:', error);
      return [];
    }
  }

  /**
   * Delete file and its embeddings
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      // Get file metadata to get storage path
      const metadata = await this.getFileMetadata(fileId);
      if (!metadata) {
        return false;
      }

      // Delete embeddings
      await this.embeddingService.deleteFileEmbeddings(fileId);

      // Delete file record (this will cascade to embeddings if not already deleted)
      await this.embeddingService['pool'].query(
        `
        DELETE FROM workspace.files WHERE id = $1
      `,
        [fileId]
      );

      // Delete physical file
      try {
        await fs.unlink(metadata.storageUrl);
      } catch (fileError) {
        console.warn('[FileUploadHandler] Could not delete physical file:', fileError);
      }

      console.log(`[FileUploadHandler] Deleted file ${fileId}`);
      return true;
    } catch (error) {
      console.error('[FileUploadHandler] Error deleting file:', error);
      return false;
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.embeddingService.close();
  }
}

/**
 * Get singleton instance of FileUploadHandler
 */
let handlerInstance: FileUploadHandler | null = null;

export function getFileUploadHandler(config: FileUploadConfig): FileUploadHandler {
  if (!handlerInstance) {
    handlerInstance = new FileUploadHandler(config);
  }
  return handlerInstance;
}
