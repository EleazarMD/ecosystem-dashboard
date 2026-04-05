/**
 * PDF Image Extractor
 * Converts PDF pages to images for multimodal VLM analysis
 * Uses pdftoppm (poppler-utils) directly via child_process
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ExtractedPage {
  pageNumber: number;
  imagePath: string;
  base64: string;
  width?: number;
  height?: number;
}

export interface PDFImageExtractionResult {
  success: boolean;
  pages: ExtractedPage[];
  totalPages: number;
  outputDir: string;
  error?: string;
}

const TEMP_DIR = process.env.PDF_IMAGE_TEMP_DIR || '/tmp/pdf-images';

/**
 * Extract PDF pages as images using pdftoppm
 * @param pdfPath Path to the PDF file
 * @param maxPages Maximum number of pages to extract (default: 4 for VLM context limits)
 * @param dpi Resolution for image extraction (default: 150 for balance of quality/size)
 */
export async function extractPDFPagesToImages(
  pdfPath: string,
  maxPages: number = 4,
  dpi: number = 150
): Promise<PDFImageExtractionResult> {
  const extractionId = randomUUID().substring(0, 8);
  const outputDir = path.join(TEMP_DIR, extractionId);

  try {
    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    const baseName = 'page';
    const outputPrefix = path.join(outputDir, baseName);
    
    // Use pdftoppm to convert PDF to PNG images
    // -png: output PNG format
    // -r: resolution in DPI
    // -l: last page to convert (limits pages)
    const cmd = `pdftoppm -png -r ${dpi} -l ${maxPages} "${pdfPath}" "${outputPrefix}"`;
    
    console.log(`[PDFImageExtractor] Running: ${cmd}`);
    await execAsync(cmd, { timeout: 60000 }); // 60 second timeout

    // Read generated images (pdftoppm outputs: page-1.png, page-2.png, etc.)
    const files = await fs.readdir(outputDir);
    const imageFiles = files
      .filter(f => f.endsWith('.png'))
      .sort((a, b) => {
        // Sort by page number (filename format: page-1.png, page-2.png, etc.)
        const numA = parseInt(a.match(/-(\d+)\.png$/)?.[1] || '0');
        const numB = parseInt(b.match(/-(\d+)\.png$/)?.[1] || '0');
        return numA - numB;
      })
      .slice(0, maxPages);

    const pages: ExtractedPage[] = [];

    for (const file of imageFiles) {
      const imagePath = path.join(outputDir, file);
      const imageBuffer = await fs.readFile(imagePath);
      const base64 = imageBuffer.toString('base64');
      
      // Extract page number from filename
      const pageMatch = file.match(/-(\d+)\.png$/);
      const pageNumber = pageMatch ? parseInt(pageMatch[1]) : pages.length + 1;

      pages.push({
        pageNumber,
        imagePath,
        base64,
      });
    }

    console.log(`[PDFImageExtractor] Extracted ${pages.length} pages from PDF`);

    return {
      success: true,
      pages,
      totalPages: files.filter(f => f.endsWith('.png')).length,
      outputDir,
    };

  } catch (error: any) {
    console.error('[PDFImageExtractor] Error:', error);
    return {
      success: false,
      pages: [],
      totalPages: 0,
      outputDir,
      error: error.message,
    };
  }
}

/**
 * Clean up extracted images after processing
 */
export async function cleanupExtractedImages(outputDir: string): Promise<void> {
  try {
    const files = await fs.readdir(outputDir);
    for (const file of files) {
      await fs.unlink(path.join(outputDir, file));
    }
    await fs.rmdir(outputDir);
    console.log(`[PDFImageExtractor] Cleaned up ${outputDir}`);
  } catch (error) {
    console.warn('[PDFImageExtractor] Cleanup warning:', error);
  }
}

/**
 * Get image size estimate in KB
 */
export function estimateImageSizeKB(base64: string): number {
  // Base64 is ~33% larger than binary, so divide by 1.33 then by 1024
  return Math.round((base64.length / 1.33) / 1024);
}
