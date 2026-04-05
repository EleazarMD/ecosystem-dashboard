/**
 * PDF Text Extractor
 * Extracts text from PDF files for embedding generation
 */

import pdf from 'pdf-parse';
import fs from 'fs/promises';

export interface PDFPage {
  pageNumber: number;
  text: string;
  lines: number;
}

export interface PDFExtractionResult {
  text: string;
  pages: PDFPage[];
  metadata: {
    totalPages: number;
    title?: string;
    author?: string;
    creationDate?: Date;
    keywords?: string[];
  };
}

export class PDFExtractor {
  /**
   * Extract text from a PDF file
   */
  async extractText(filePath: string): Promise<PDFExtractionResult> {
    try {
      console.log(`[PDFExtractor] Reading file: ${filePath}`);
      
      // Read PDF file
      const dataBuffer = await fs.readFile(filePath);
      
      // Parse PDF
      const data = await pdf(dataBuffer);
      
      console.log(`[PDFExtractor] Extracted ${data.numpages} pages`);
      
      // Extract page-by-page text
      const pages: PDFPage[] = [];
      
      // pdf-parse doesn't provide page-by-page text easily
      // So we'll split by page breaks (heuristic)
      const pageTexts = this.splitIntoPages(data.text, data.numpages);
      
      pageTexts.forEach((text, index) => {
        pages.push({
          pageNumber: index + 1,
          text: text.trim(),
          lines: text.split('\n').length
        });
      });
      
      return {
        text: data.text,
        pages,
        metadata: {
          totalPages: data.numpages,
          title: data.info?.Title,
          author: data.info?.Author,
          creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
          keywords: data.info?.Keywords ? data.info.Keywords.split(',') : undefined
        }
      };
    } catch (error) {
      console.error('[PDFExtractor] Extraction error:', error);
      throw new Error(`Failed to extract PDF text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Split text into approximate pages
   * This is a heuristic since pdf-parse doesn't give page boundaries
   */
  private splitIntoPages(text: string, numPages: number): string[] {
    // Estimate characters per page
    const avgCharsPerPage = Math.ceil(text.length / numPages);
    
    const pages: string[] = [];
    const paragraphs = text.split('\n\n');
    
    let currentPage = '';
    let currentPageChars = 0;
    
    for (const paragraph of paragraphs) {
      if (currentPageChars + paragraph.length > avgCharsPerPage && currentPage) {
        pages.push(currentPage);
        currentPage = paragraph;
        currentPageChars = paragraph.length;
      } else {
        currentPage += (currentPage ? '\n\n' : '') + paragraph;
        currentPageChars += paragraph.length;
      }
    }
    
    // Add last page
    if (currentPage) {
      pages.push(currentPage);
    }
    
    // Ensure we have the right number of pages
    while (pages.length < numPages) {
      pages.push('');
    }
    
    return pages.slice(0, numPages);
  }

  /**
   * Extract text with detailed page information
   * Uses a more sophisticated approach to preserve structure
   */
  async extractWithStructure(filePath: string): Promise<PDFExtractionResult> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      
      // Custom render function to preserve structure
      const options = {
        pagerender: (pageData: any) => {
          return pageData.getTextContent().then((textContent: any) => {
            let lastY, text = '';
            
            for (const item of textContent.items) {
              if (lastY === item.transform[5] || !lastY) {
                text += item.str;
              } else {
                text += '\n' + item.str;
              }
              lastY = item.transform[5];
            }
            
            return text;
          });
        }
      };
      
      const data = await pdf(dataBuffer, options);
      
      const pages: PDFPage[] = [];
      const pageTexts = this.splitIntoPages(data.text, data.numpages);
      
      pageTexts.forEach((text, index) => {
        pages.push({
          pageNumber: index + 1,
          text: text.trim(),
          lines: text.split('\n').length
        });
      });
      
      return {
        text: data.text,
        pages,
        metadata: {
          totalPages: data.numpages,
          title: data.info?.Title,
          author: data.info?.Author,
          creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
          keywords: data.info?.Keywords ? data.info.Keywords.split(',') : undefined
        }
      };
    } catch (error) {
      console.error('[PDFExtractor] Structure extraction error:', error);
      // Fallback to simple extraction
      return this.extractText(filePath);
    }
  }

  /**
   * Validate if file is a valid PDF
   */
  async isValidPDF(filePath: string): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath);
      // Check PDF magic number
      const header = buffer.slice(0, 5).toString();
      return header === '%PDF-';
    } catch {
      return false;
    }
  }

  /**
   * Get PDF metadata without extracting full text
   */
  async getMetadata(filePath: string): Promise<PDFExtractionResult['metadata']> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      
      return {
        totalPages: data.numpages,
        title: data.info?.Title,
        author: data.info?.Author,
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        keywords: data.info?.Keywords ? data.info.Keywords.split(',') : undefined
      };
    } catch (error) {
      console.error('[PDFExtractor] Metadata extraction error:', error);
      throw error;
    }
  }
}

// Singleton instance
let pdfExtractorInstance: PDFExtractor | null = null;

export function getPDFExtractor(): PDFExtractor {
  if (!pdfExtractorInstance) {
    pdfExtractorInstance = new PDFExtractor();
  }
  return pdfExtractorInstance;
}
