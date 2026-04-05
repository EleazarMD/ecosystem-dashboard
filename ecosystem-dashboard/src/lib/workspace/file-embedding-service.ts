/**
 * File Embedding Service
 * Leverages existing Knowledge Graph Google text-embedding-004 infrastructure
 * for PDF and document embeddings via AI Gateway API
 */

import { Pool } from 'pg';

export interface FileChunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
  metadata?: Record<string, any>;
}

export interface EmbeddingResult {
  chunkIndex: number;
  embedding: number[];
  dimensions: number;
}

export interface SearchResult {
  chunkIndex: number;
  chunkText: string;
  pageNumber: number;
  distance: number;
  metadata?: Record<string, any>;
}

export class FileEmbeddingService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'ecosystem_unified',
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    });
  }

  /**
   * Generate embedding via NVIDIA NIM embedding service
   * Uses nvidia/nv-embedqa-e5-v5 model (1024 dimensions)
   * Same service used by other RAG systems in the homelab
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const EMBEDDING_URL = process.env.EMBEDDING_URL || 'http://localhost:8006';
    
    try {
      const response = await fetch(`${EMBEDDING_URL}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: [text],
          model: 'nvidia/nv-embedqa-e5-v5',
          input_type: 'passage',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding service returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.data || !data.data[0] || !data.data[0].embedding) {
        throw new Error('Invalid embedding response format');
      }

      return data.data[0].embedding;
    } catch (error) {
      console.error('[FileEmbeddingService] Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple file chunks
   * Uses existing Knowledge Graph Google text-embedding-004 service via AI Gateway
   */
  async embedFileChunks(chunks: FileChunk[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];

    console.log(`[FileEmbeddingService] Generating embeddings for ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Generate embedding via AI Gateway
        const embedding = await this.generateEmbedding(chunk.text);

        if (!embedding || !Array.isArray(embedding)) {
          throw new Error('Invalid embedding generated');
        }

        results.push({
          chunkIndex: chunk.chunkIndex,
          embedding,
          dimensions: embedding.length
        });

        // Log progress every 10 chunks
        if ((i + 1) % 10 === 0) {
          console.log(`[FileEmbeddingService] Progress: ${i + 1}/${chunks.length} chunks embedded`);
        }
      } catch (error) {
        console.error(`[FileEmbeddingService] Failed to embed chunk ${i}:`, error);
        throw new Error(`Failed to embed chunk ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`[FileEmbeddingService] Successfully embedded ${results.length} chunks`);
    return results;
  }

  /**
   * Store file chunks with embeddings in database
   */
  async storeFileEmbeddings(
    fileId: string,
    chunks: FileChunk[],
    embeddings: EmbeddingResult[]
  ): Promise<void> {
    if (chunks.length !== embeddings.length) {
      throw new Error('Chunks and embeddings count mismatch');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];

        await client.query(`
          INSERT INTO workspace.file_embeddings 
          (id, file_id, chunk_index, chunk_text, embedding, page_number, metadata, created_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
        `, [
          fileId,
          chunk.chunkIndex,
          chunk.text,
          JSON.stringify(embedding.embedding), // pgvector format
          chunk.pageNumber,
          JSON.stringify(chunk.metadata || {})
        ]);
      }

      await client.query('COMMIT');
      console.log(`[FileEmbeddingService] Stored ${chunks.length} embeddings for file ${fileId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[FileEmbeddingService] Failed to store embeddings:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search for similar chunks within a specific file
   */
  async searchInFile(
    fileId: string,
    query: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      // Generate query embedding via AI Gateway
      const queryEmbedding = await this.generateEmbedding(query);

      if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
        throw new Error('Failed to generate query embedding');
      }

      // Search using pgvector cosine similarity
      const result = await this.pool.query(`
        SELECT 
          chunk_index,
          chunk_text,
          page_number,
          metadata,
          embedding <-> $1::vector as distance
        FROM workspace.file_embeddings
        WHERE file_id = $2
        ORDER BY embedding <-> $1::vector
        LIMIT $3
      `, [JSON.stringify(queryEmbedding), fileId, limit]);

      return result.rows.map(row => ({
        chunkIndex: row.chunk_index,
        chunkText: row.chunk_text,
        pageNumber: row.page_number,
        distance: parseFloat(row.distance),
        metadata: row.metadata || {}
      }));
    } catch (error) {
      console.error('[FileEmbeddingService] Search error:', error);
      throw error;
    }
  }

  /**
   * Search across all files in a workspace
   */
  async searchInWorkspace(
    workspaceId: string,
    query: string,
    limit: number = 10
  ): Promise<Array<SearchResult & { fileId: string; fileName: string }>> {
    try {
      // Generate query embedding via AI Gateway
      const queryEmbedding = await this.generateEmbedding(query);

      // Search across all files in workspace
      const result = await this.pool.query(`
        SELECT 
          fe.chunk_index,
          fe.chunk_text,
          fe.page_number,
          fe.metadata,
          fe.embedding <-> $1::vector as distance,
          f.id as file_id,
          f.file_name
        FROM workspace.file_embeddings fe
        JOIN workspace.files f ON fe.file_id = f.id
        WHERE f.workspace_id = $2
        ORDER BY fe.embedding <-> $1::vector
        LIMIT $3
      `, [JSON.stringify(queryEmbedding), workspaceId, limit]);

      return result.rows.map(row => ({
        chunkIndex: row.chunk_index,
        chunkText: row.chunk_text,
        pageNumber: row.page_number,
        distance: parseFloat(row.distance),
        metadata: row.metadata || {},
        fileId: row.file_id,
        fileName: row.file_name
      }));
    } catch (error) {
      console.error('[FileEmbeddingService] Workspace search error:', error);
      throw error;
    }
  }

  /**
   * Delete embeddings for a file
   */
  async deleteFileEmbeddings(fileId: string): Promise<void> {
    try {
      await this.pool.query(`
        DELETE FROM workspace.file_embeddings
        WHERE file_id = $1
      `, [fileId]);

      console.log(`[FileEmbeddingService] Deleted embeddings for file ${fileId}`);
    } catch (error) {
      console.error('[FileEmbeddingService] Delete error:', error);
      throw error;
    }
  }

  /**
   * Get embedding statistics for a file
   */
  async getFileStats(fileId: string): Promise<{
    totalChunks: number;
    avgChunkLength: number;
    coverage: { min: number; max: number };
  }> {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total_chunks,
          AVG(LENGTH(chunk_text)) as avg_chunk_length,
          MIN(page_number) as min_page,
          MAX(page_number) as max_page
        FROM workspace.file_embeddings
        WHERE file_id = $1
      `, [fileId]);

      const row = result.rows[0];
      return {
        totalChunks: parseInt(row.total_chunks),
        avgChunkLength: parseFloat(row.avg_chunk_length),
        coverage: {
          min: parseInt(row.min_page),
          max: parseInt(row.max_page)
        }
      };
    } catch (error) {
      console.error('[FileEmbeddingService] Stats error:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Singleton instance
let fileEmbeddingServiceInstance: FileEmbeddingService | null = null;

export function getFileEmbeddingService(): FileEmbeddingService {
  if (!fileEmbeddingServiceInstance) {
    fileEmbeddingServiceInstance = new FileEmbeddingService();
  }
  return fileEmbeddingServiceInstance;
}
