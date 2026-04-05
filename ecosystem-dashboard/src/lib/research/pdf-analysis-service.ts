/**
 * PDF Analysis Service
 * Unified service for PDF analysis with intelligent routing:
 * - Gemini API: Large documents (>32K tokens), complex multimodal content
 * - Qwen VLM: PDFs with images/charts/tables (local, via AI Gateway)
 * - Qwen3-32B: Smaller text-only documents (local, via AI Gateway)
 * 
 * All documents are saved locally with vector embeddings for RAG retrieval.
 */

import { PDFExtractor, PDFExtractionResult, getPDFExtractor } from '../workspace/pdf-extractor';
import { TextChunker, TextChunk, getTextChunker } from '../workspace/text-chunker';
import { FileEmbeddingService, FileChunk, getFileEmbeddingService } from '../workspace/file-embedding-service';
import { extractPDFPagesToImages, cleanupExtractedImages, ExtractedPage } from './pdf-image-extractor';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Model routing thresholds
const SMALL_DOC_TOKEN_LIMIT = 8000;   // Use local Qwen3 for docs under 8K tokens
const MEDIUM_DOC_TOKEN_LIMIT = 32000; // Use Qwen VLM for docs under 32K tokens
// Above 32K tokens -> Use Gemini API

export interface PDFAnalysisRequest {
  filePath: string;
  fileName: string;
  workspaceId: string;
  analysisPrompt?: string;
  forceModel?: 'gemini' | 'qwen-vlm' | 'qwen3';
  saveToDatabase?: boolean;
}

export interface PDFAnalysisResult {
  success: boolean;
  fileId?: string;
  analysis?: string;
  model: string;
  tokenCount: number;
  pageCount: number;
  hasImages: boolean;
  processingTimeMs: number;
  savedToDatabase: boolean;
  chunkCount?: number;
  error?: string;
}

export interface DocumentMetadata {
  fileId: string;
  fileName: string;
  workspaceId: string;
  pageCount: number;
  tokenCount: number;
  hasImages: boolean;
  analysisModel: string;
  createdAt: Date;
}

export class PDFAnalysisService {
  private pool: Pool;
  private pdfExtractor: PDFExtractor;
  private textChunker: TextChunker;
  private embeddingService: FileEmbeddingService;
  
  private aiGatewayUrl: string;
  private aiGatewayApiKey: string;
  private vlmUrl: string;
  private geminiApiKey: string | null;

  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || process.env.DATABASE_PORT || '5432'),
      database: process.env.POSTGRES_DB || process.env.DATABASE_NAME || 'ecosystem_unified',
      user: process.env.POSTGRES_USER || process.env.DATABASE_USER,
      password: process.env.POSTGRES_PASSWORD || process.env.DATABASE_PASSWORD,
    });

    this.pdfExtractor = getPDFExtractor();
    this.textChunker = getTextChunker();
    this.embeddingService = getFileEmbeddingService();

    this.aiGatewayUrl = process.env.AI_GATEWAY_AI_URL || 'http://localhost:8777';
    this.aiGatewayApiKey = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
    // VLM service disabled - use Gemini for all multimodal content
    this.vlmUrl = process.env.QWEN_VLM_URL || '';
    this.geminiApiKey = process.env.GEMINI_DEEP_RESEARCH_API_KEY || process.env.GOOGLE_API_KEY || null;
  }

  /**
   * Estimate token count from text (rough: 1 token ≈ 4 chars for English)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Detect if PDF likely contains images/charts/tables
   * This is a heuristic based on text density per page
   */
  private detectMultimodalContent(extraction: PDFExtractionResult): boolean {
    if (extraction.pages.length === 0) return false;
    
    const avgCharsPerPage = extraction.text.length / extraction.pages.length;
    // If average chars per page is low, likely has images/charts
    // Typical text-heavy page has 2000-4000 chars
    return avgCharsPerPage < 1500;
  }

  /**
   * Determine which model to use based on document characteristics
   */
  private selectModel(
    tokenCount: number,
    hasImages: boolean,
    forceModel?: 'gemini' | 'qwen-vlm' | 'qwen3'
  ): { model: string; provider: 'local' | 'gemini' | 'vlm' } {
    if (forceModel) {
      switch (forceModel) {
        case 'gemini':
          return { model: 'gemini-2.0-flash', provider: 'gemini' };
        case 'qwen-vlm':
          // Qwen VLM available at localhost:8792 with model name 'qwen-vision'
          return { model: 'qwen-vision', provider: 'vlm' };
        case 'qwen3':
          return { model: 'qwen3-32b', provider: 'local' };
      }
    }

    // Auto-routing: All PDFs -> Gemini (1M context, native PDF support, reliable vision)
    // Local VLM (Qwen2.5-VL-7B) not viable for dense document page images
    return { model: 'gemini-2.0-flash', provider: 'gemini' };
  }

  /**
   * Analyze PDF using Gemini API (for large documents)
   */
  private async analyzeWithGemini(
    filePath: string,
    prompt: string
  ): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Read PDF as base64
    const pdfBuffer = await fs.readFile(filePath);
    const pdfBase64 = pdfBuffer.toString('base64');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: 'application/pdf',
                  data: pdfBase64
                }
              },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis generated';
  }

  /**
   * Analyze PDF using dual-model approach:
   * - Qwen VLM: Analyzes images/charts/diagrams (vision-only)
   * - Qwen3-32B: Analyzes extracted text (larger context, better reasoning)
   * Then combines both analyses for comprehensive results
   */
  private async analyzeWithQwenVLM(
    filePath: string,
    extractedText: string,
    prompt: string
  ): Promise<string> {
    console.log(`[PDF Analysis] Using dual-model approach: VLM for images + Qwen3 for text`);

    // Extract PDF pages as images (max 4 pages at 150 DPI - VLM now has 32K context)
    console.log(`[PDF Analysis] Extracting images from PDF: ${filePath}`);
    const extraction = await extractPDFPagesToImages(filePath, 4, 150);
    
    console.log(`[PDF Analysis] Image extraction result: success=${extraction.success}, pages=${extraction.pages.length}, totalPages=${extraction.totalPages}, outputDir=${extraction.outputDir}${extraction.error ? ', error=' + extraction.error : ''}`);
    
    if (!extraction.success || extraction.pages.length === 0) {
      console.warn('[PDF Analysis] Image extraction failed, using Qwen3 text-only analysis. Error:', extraction.error);
      return this.analyzeWithQwen3(extractedText, prompt);
    }

    try {
      // Run both analyses in parallel for speed
      const [imageAnalysis, textAnalysis] = await Promise.all([
        this.analyzeImagesWithVLM(extraction.pages, prompt),
        this.analyzeTextWithQwen3(extractedText, prompt),
      ]);

      // Combine both analyses
      const combinedAnalysis = await this.combineAnalyses(imageAnalysis, textAnalysis, prompt);
      
      return combinedAnalysis;

    } finally {
      // Clean up extracted images
      await cleanupExtractedImages(extraction.outputDir);
    }
  }

  /**
   * Analyze images only with Qwen VLM (no text, just visual content)
   */
  private async analyzeImagesWithVLM(
    pages: ExtractedPage[],
    prompt: string
  ): Promise<string> {
    // Check if VLM service is configured
    if (!this.vlmUrl) {
      console.warn('[PDF Analysis] VLM service not configured, skipping image analysis');
      return 'Image analysis unavailable (VLM service not configured). Visual content was not analyzed.';
    }

    // Build multimodal content array with images only
    const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
    
    // Add the vision-focused prompt
    contentParts.push({
      type: 'text',
      text: `Analyze the visual content in these ${pages.length} document page(s). Focus ONLY on visual elements:\n\n1. **Charts & Graphs**: Describe data visualizations, trends, axes labels, values\n2. **Tables**: Extract table data and structure\n3. **Diagrams & Figures**: Describe flowcharts, diagrams, illustrations\n4. **Images**: Describe any photos, logos, or embedded images\n5. **Layout**: Note any important visual formatting\n\nOriginal request: ${prompt}`
    });

    // Add each page image
    for (const page of pages) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${page.base64}`
        }
      });
    }

    // Log image sizes for debugging
    const imageSizes = pages.map(p => ({ page: p.pageNumber, base64Length: p.base64.length, sizeKB: Math.round(p.base64.length * 0.75 / 1024) }));
    console.log(`[PDF Analysis] VLM analyzing ${pages.length} page images:`, JSON.stringify(imageSizes));
    console.log(`[PDF Analysis] VLM URL: ${this.vlmUrl}`);

    const requestBody = {
      model: 'qwen-vision',
      messages: [
        { 
          role: 'system', 
          content: 'You are a visual document analyst. Focus on describing and extracting information from visual elements like charts, graphs, tables, diagrams, and figures. Be specific about data values, trends, and visual details.' 
        },
        { 
          role: 'user', 
          content: contentParts 
        }
      ],
      temperature: 0.5,
      max_tokens: 2048,
    };

    try {
      const response = await fetch(`${this.vlmUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`[PDF Analysis] VLM response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const error = await response.text();
        console.error('[PDF Analysis] VLM image analysis error response:', error);
        return `Image analysis unavailable. VLM returned ${response.status}: ${error.substring(0, 200)}`;
      }

      const data = await response.json();
      const result = data.choices?.[0]?.message?.content || 'No visual content detected.';
      console.log(`[PDF Analysis] VLM analysis result length: ${result.length} chars`);
      return result;
    } catch (fetchError) {
      console.error('[PDF Analysis] VLM fetch error:', fetchError);
      return `Image analysis unavailable. Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`;
    }
  }

  /**
   * Analyze text only with Qwen3-32B (larger context, better reasoning)
   */
  private async analyzeTextWithQwen3(
    extractedText: string,
    prompt: string
  ): Promise<string> {
    // Qwen3 can handle more text - use 30K chars
    const MAX_CHARS = 30000;
    const truncatedText = extractedText.length > MAX_CHARS 
      ? extractedText.substring(0, MAX_CHARS) + '\n\n[... text truncated ...]'
      : extractedText;

    const textPrompt = `Analyze the following document text. Focus on:\n\n1. **Summary**: Main points and conclusions\n2. **Key Findings**: Important facts, statistics, claims\n3. **Structure**: How the document is organized\n4. **Details**: Specific information relevant to the request\n\nOriginal request: ${prompt}\n\n---\n\nDocument text:\n${truncatedText}`;

    console.log(`[PDF Analysis] Qwen3 analyzing ${truncatedText.length} chars of text`);

    const response = await fetch(`${this.aiGatewayUrl}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.aiGatewayApiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen3-32b',
        messages: [
          { role: 'system', content: 'You are an expert document analyst. Provide thorough, well-structured analysis of the document text.' },
          { role: 'user', content: textPrompt }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[PDF Analysis] Qwen3 text analysis error:', error);
      return 'Text analysis unavailable.';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No text analysis generated.';
  }

  /**
   * Combine image and text analyses into a unified report
   */
  private async combineAnalyses(
    imageAnalysis: string,
    textAnalysis: string,
    originalPrompt: string
  ): Promise<string> {
    const combinePrompt = `You have two analyses of the same PDF document - one from visual content (images, charts, tables) and one from extracted text. Combine them into a single, coherent, comprehensive analysis.

**Original Request:** ${originalPrompt}

---

## Visual Analysis (from images/charts/tables):
${imageAnalysis}

---

## Text Analysis (from extracted text):
${textAnalysis}

---

Please synthesize these into a unified analysis that:
1. Integrates insights from both visual and textual content
2. Resolves any contradictions or fills in gaps
3. Provides a comprehensive summary
4. Highlights key findings with supporting evidence from both sources`;

    console.log(`[PDF Analysis] Qwen3 combining analyses`);

    const response = await fetch(`${this.aiGatewayUrl}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.aiGatewayApiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen3-32b',
        messages: [
          { role: 'system', content: 'You are an expert at synthesizing information from multiple sources into clear, comprehensive reports.' },
          { role: 'user', content: combinePrompt }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      })
    });

    if (!response.ok) {
      // If combination fails, just concatenate the analyses
      console.warn('[PDF Analysis] Failed to combine analyses, returning concatenated result');
      return `## Visual Content Analysis\n\n${imageAnalysis}\n\n---\n\n## Text Content Analysis\n\n${textAnalysis}`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || `## Visual Content Analysis\n\n${imageAnalysis}\n\n---\n\n## Text Content Analysis\n\n${textAnalysis}`;
  }

  /**
   * Analyze PDF using local Qwen3-32B (for smaller text documents)
   */
  private async analyzeWithQwen3(
    extractedText: string,
    prompt: string
  ): Promise<string> {
    // Truncate to ~30K chars (~7500 tokens) to stay within context limits
    const MAX_CHARS = 30000;
    const truncatedText = extractedText.length > MAX_CHARS 
      ? extractedText.substring(0, MAX_CHARS) + '\n\n[... document truncated ...]'
      : extractedText;
    const fullPrompt = `${prompt}\n\nDocument content:\n${truncatedText}`;

    const response = await fetch(`${this.aiGatewayUrl}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.aiGatewayApiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen3-32b',
        messages: [
          { role: 'system', content: 'You are an expert document analyst. Analyze the provided document thoroughly and provide detailed insights.' },
          { role: 'user', content: fullPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Qwen3 error: ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No analysis generated';
  }

  /**
   * Save document to database with vector embeddings
   */
  private async saveToDatabase(
    fileId: string,
    fileName: string,
    workspaceId: string,
    filePath: string,
    extraction: PDFExtractionResult,
    analysisModel: string
  ): Promise<number> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get file stats
      const stats = await fs.stat(filePath);

      // Insert file record
      await client.query(`
        INSERT INTO workspace.files 
        (id, workspace_id, file_name, file_type, file_size, storage_url, vectorized, metadata, uploaded_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (id) DO UPDATE SET
          vectorized = EXCLUDED.vectorized,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `, [
        fileId,
        workspaceId,
        fileName,
        'application/pdf',
        stats.size,
        filePath,
        false,
        JSON.stringify({
          pageCount: extraction.metadata.totalPages,
          title: extraction.metadata.title,
          author: extraction.metadata.author,
          analysisModel,
        })
      ]);

      // Chunk the text
      const chunks = this.textChunker.chunkWithPages(
        extraction.pages.map(p => ({ pageNumber: p.pageNumber, text: p.text })),
        { chunkSize: 1000, overlap: 100 }
      );

      // Convert to FileChunk format
      const fileChunks: FileChunk[] = chunks.map((chunk, i) => ({
        text: chunk.text,
        pageNumber: chunk.pageNumber || 1,
        chunkIndex: i,
        metadata: {
          fileName,
          startChar: chunk.startChar,
          endChar: chunk.endChar,
        }
      }));

      // Generate embeddings
      const embeddings = await this.embeddingService.embedFileChunks(fileChunks);

      // Store embeddings
      await this.embeddingService.storeFileEmbeddings(fileId, fileChunks, embeddings);

      // Update file as vectorized
      await client.query(`
        UPDATE workspace.files 
        SET vectorized = true, updated_at = NOW()
        WHERE id = $1
      `, [fileId]);

      await client.query('COMMIT');

      console.log(`[PDFAnalysisService] Saved ${fileChunks.length} chunks for ${fileName}`);
      return fileChunks.length;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PDFAnalysisService] Database save error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Main analysis method - analyzes PDF and optionally saves to database
   */
  async analyzePDF(request: PDFAnalysisRequest): Promise<PDFAnalysisResult> {
    const startTime = Date.now();
    const fileId = randomUUID();

    try {
      // Extract text from PDF
      console.log(`[PDFAnalysisService] Extracting text from ${request.fileName}`);
      const extraction = await this.pdfExtractor.extractText(request.filePath);

      const tokenCount = this.estimateTokens(extraction.text);
      const hasImages = this.detectMultimodalContent(extraction);
      const pageCount = extraction.metadata.totalPages;

      console.log(`[PDFAnalysisService] Document: ${pageCount} pages, ~${tokenCount} tokens, hasImages: ${hasImages}`);

      // Select model
      const { model, provider } = this.selectModel(tokenCount, hasImages, request.forceModel);
      console.log(`[PDFAnalysisService] Selected model: ${model} (${provider})`);

      // Default analysis prompt
      const prompt = request.analysisPrompt || 
        'Analyze this document comprehensively. Provide a summary, key findings, main topics, and any notable insights.';

      // Perform analysis based on provider
      let analysis: string;
      if (provider === 'gemini') {
        analysis = await this.analyzeWithGemini(request.filePath, prompt);
      } else if (provider === 'vlm') {
        // Use Qwen VLM at localhost:8792
        analysis = await this.analyzeWithQwenVLM(request.filePath, extraction.text, prompt);
      } else {
        // Default to Qwen3 for text-only analysis
        analysis = await this.analyzeWithQwen3(extraction.text, prompt);
      }

      // Save to database if requested (default: true)
      let chunkCount = 0;
      const shouldSave = request.saveToDatabase !== false;
      
      if (shouldSave) {
        try {
          chunkCount = await this.saveToDatabase(
            fileId,
            request.fileName,
            request.workspaceId,
            request.filePath,
            extraction,
            model
          );
        } catch (dbError) {
          console.error('[PDFAnalysisService] Failed to save to database:', dbError);
          // Continue - analysis was successful even if DB save failed
        }
      }

      const processingTimeMs = Date.now() - startTime;

      return {
        success: true,
        fileId,
        analysis,
        model,
        tokenCount,
        pageCount,
        hasImages,
        processingTimeMs,
        savedToDatabase: shouldSave && chunkCount > 0,
        chunkCount,
      };

    } catch (error) {
      console.error('[PDFAnalysisService] Analysis error:', error);
      return {
        success: false,
        model: 'none',
        tokenCount: 0,
        pageCount: 0,
        hasImages: false,
        processingTimeMs: Date.now() - startTime,
        savedToDatabase: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Query saved documents using semantic search
   */
  async queryDocuments(
    workspaceId: string,
    query: string,
    limit: number = 5
  ): Promise<Array<{
    chunkText: string;
    fileName: string;
    pageNumber: number;
    distance: number;
  }>> {
    return this.embeddingService.searchInWorkspace(workspaceId, query, limit);
  }

  /**
   * Get document metadata
   */
  async getDocumentMetadata(fileId: string): Promise<DocumentMetadata | null> {
    try {
      const result = await this.pool.query(`
        SELECT id, file_name, workspace_id, metadata, created_at
        FROM workspace.files
        WHERE id = $1
      `, [fileId]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      const metadata = row.metadata || {};

      return {
        fileId: row.id,
        fileName: row.file_name,
        workspaceId: row.workspace_id,
        pageCount: metadata.pageCount || 0,
        tokenCount: metadata.tokenCount || 0,
        hasImages: metadata.hasImages || false,
        analysisModel: metadata.analysisModel || 'unknown',
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error('[PDFAnalysisService] Metadata fetch error:', error);
      return null;
    }
  }

  /**
   * List documents in workspace
   */
  async listDocuments(workspaceId: string, limit: number = 50): Promise<DocumentMetadata[]> {
    try {
      const result = await this.pool.query(`
        SELECT id, file_name, workspace_id, metadata, created_at
        FROM workspace.files
        WHERE workspace_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [workspaceId, limit]);

      return result.rows.map(row => {
        const metadata = row.metadata || {};
        return {
          fileId: row.id,
          fileName: row.file_name,
          workspaceId: row.workspace_id,
          pageCount: metadata.pageCount || 0,
          tokenCount: metadata.tokenCount || 0,
          hasImages: metadata.hasImages || false,
          analysisModel: metadata.analysisModel || 'unknown',
          createdAt: row.created_at,
        };
      });
    } catch (error) {
      console.error('[PDFAnalysisService] List documents error:', error);
      return [];
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    await this.embeddingService.close();
  }
}

// Singleton instance
let pdfAnalysisServiceInstance: PDFAnalysisService | null = null;

export function getPDFAnalysisService(): PDFAnalysisService {
  if (!pdfAnalysisServiceInstance) {
    pdfAnalysisServiceInstance = new PDFAnalysisService();
  }
  return pdfAnalysisServiceInstance;
}
