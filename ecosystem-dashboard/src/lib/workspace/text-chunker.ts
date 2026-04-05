/**
 * Text Chunker
 * Splits text into chunks suitable for embedding generation
 * Optimized for Google text-embedding-004 (768 dimensions)
 */

export interface ChunkOptions {
  chunkSize?: number; // Target characters per chunk
  overlap?: number; // Overlap between chunks (characters)
  minChunkSize?: number; // Minimum chunk size to avoid tiny chunks
  preserveParagraphs?: boolean; // Try to keep paragraphs intact
  preserveSentences?: boolean; // Try to keep sentences intact
}

export interface TextChunk {
  text: string;
  index: number;
  startChar: number;
  endChar: number;
  pageNumber?: number;
}

export class TextChunker {
  private defaultOptions: Required<ChunkOptions> = {
    chunkSize: 1000, // ~500 tokens for Google embeddings
    overlap: 100,
    minChunkSize: 200,
    preserveParagraphs: true,
    preserveSentences: true
  };

  /**
   * Chunk text into segments
   */
  chunk(text: string, options?: ChunkOptions): TextChunk[] {
    const opts = { ...this.defaultOptions, ...options };
    
    if (!text || text.trim().length === 0) {
      return [];
    }

    console.log(`[TextChunker] Chunking ${text.length} characters with chunk size ${opts.chunkSize}`);

    if (opts.preserveParagraphs) {
      return this.chunkByParagraphs(text, opts);
    } else if (opts.preserveSentences) {
      return this.chunkBySentences(text, opts);
    } else {
      return this.chunkByCharacters(text, opts);
    }
  }

  /**
   * Chunk by paragraphs (preferred for PDFs)
   */
  private chunkByParagraphs(text: string, options: Required<ChunkOptions>): TextChunk[] {
    const paragraphs = text.split(/\n\n+/);
    const chunks: TextChunk[] = [];
    
    let currentChunk = '';
    let currentStartChar = 0;
    let chunkIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      
      if (!paragraph) continue;

      // Check if adding this paragraph exceeds chunk size
      if (currentChunk && (currentChunk.length + paragraph.length) > options.chunkSize) {
        // Save current chunk
        if (currentChunk.length >= options.minChunkSize) {
          chunks.push({
            text: currentChunk.trim(),
            index: chunkIndex++,
            startChar: currentStartChar,
            endChar: currentStartChar + currentChunk.length
          });

          // Start new chunk with overlap
          const overlapText = this.getOverlapText(currentChunk, options.overlap);
          currentChunk = overlapText + '\n\n' + paragraph;
          currentStartChar = currentStartChar + currentChunk.length - overlapText.length;
        } else {
          currentChunk += '\n\n' + paragraph;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Add final chunk
    if (currentChunk.trim().length >= options.minChunkSize) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex++,
        startChar: currentStartChar,
        endChar: currentStartChar + currentChunk.length
      });
    }

    console.log(`[TextChunker] Created ${chunks.length} chunks from paragraphs`);
    return chunks;
  }

  /**
   * Chunk by sentences (fallback)
   */
  private chunkBySentences(text: string, options: Required<ChunkOptions>): TextChunk[] {
    // Simple sentence splitting (can be improved with NLP libraries)
    const sentences = text.split(/[.!?]+\s+/);
    const chunks: TextChunk[] = [];
    
    let currentChunk = '';
    let currentStartChar = 0;
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (!trimmedSentence) continue;

      if (currentChunk && (currentChunk.length + trimmedSentence.length) > options.chunkSize) {
        if (currentChunk.length >= options.minChunkSize) {
          chunks.push({
            text: currentChunk.trim(),
            index: chunkIndex++,
            startChar: currentStartChar,
            endChar: currentStartChar + currentChunk.length
          });

          const overlapText = this.getOverlapText(currentChunk, options.overlap);
          currentChunk = overlapText + ' ' + trimmedSentence;
          currentStartChar = currentStartChar + currentChunk.length - overlapText.length;
        } else {
          currentChunk += ' ' + trimmedSentence;
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      }
    }

    if (currentChunk.trim().length >= options.minChunkSize) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex++,
        startChar: currentStartChar,
        endChar: currentStartChar + currentChunk.length
      });
    }

    console.log(`[TextChunker] Created ${chunks.length} chunks from sentences`);
    return chunks;
  }

  /**
   * Chunk by fixed character count (least preferred)
   */
  private chunkByCharacters(text: string, options: Required<ChunkOptions>): TextChunk[] {
    const chunks: TextChunk[] = [];
    let chunkIndex = 0;
    let startChar = 0;

    while (startChar < text.length) {
      const endChar = Math.min(startChar + options.chunkSize, text.length);
      const chunkText = text.substring(startChar, endChar);

      if (chunkText.trim().length >= options.minChunkSize) {
        chunks.push({
          text: chunkText.trim(),
          index: chunkIndex++,
          startChar,
          endChar
        });
      }

      startChar += options.chunkSize - options.overlap;
    }

    console.log(`[TextChunker] Created ${chunks.length} chunks by characters`);
    return chunks;
  }

  /**
   * Get overlap text from the end of current chunk
   */
  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
      return text;
    }

    // Try to find a sentence boundary in the overlap region
    const overlapText = text.slice(-overlapSize);
    const lastSentenceEnd = overlapText.lastIndexOf('. ');
    
    if (lastSentenceEnd !== -1) {
      return overlapText.substring(lastSentenceEnd + 2);
    }

    return overlapText;
  }

  /**
   * Chunk text from a PDF with page information
   */
  chunkWithPages(
    pages: Array<{ pageNumber: number; text: string }>,
    options?: ChunkOptions
  ): Array<TextChunk & { pageNumber: number }> {
    const allChunks: Array<TextChunk & { pageNumber: number }> = [];

    for (const page of pages) {
      const pageChunks = this.chunk(page.text, options);
      
      // Add page number to each chunk
      pageChunks.forEach(chunk => {
        allChunks.push({
          ...chunk,
          pageNumber: page.pageNumber
        });
      });
    }

    // Re-index all chunks
    allChunks.forEach((chunk, index) => {
      chunk.index = index;
    });

    console.log(`[TextChunker] Created ${allChunks.length} chunks across ${pages.length} pages`);
    return allChunks;
  }

  /**
   * Estimate token count from character count
   * Rough approximation: 1 token ≈ 4 characters for English
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get chunk statistics
   */
  getStats(chunks: TextChunk[]): {
    totalChunks: number;
    avgChunkSize: number;
    minChunkSize: number;
    maxChunkSize: number;
    totalCharacters: number;
  } {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        avgChunkSize: 0,
        minChunkSize: 0,
        maxChunkSize: 0,
        totalCharacters: 0
      };
    }

    const sizes = chunks.map(c => c.text.length);
    const totalCharacters = sizes.reduce((a, b) => a + b, 0);

    return {
      totalChunks: chunks.length,
      avgChunkSize: Math.round(totalCharacters / chunks.length),
      minChunkSize: Math.min(...sizes),
      maxChunkSize: Math.max(...sizes),
      totalCharacters
    };
  }
}

// Singleton instance
let textChunkerInstance: TextChunker | null = null;

export function getTextChunker(): TextChunker {
  if (!textChunkerInstance) {
    textChunkerInstance = new TextChunker();
  }
  return textChunkerInstance;
}
