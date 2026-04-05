/**
 * Standardized Citation Types
 * 
 * Used across AI Research and Podcast Studio
 * Normalizes citations from different providers (OpenAI, Gemini, etc.)
 */

export interface StandardCitation {
  // Unique identifier
  id: string;
  
  // Core metadata
  title: string;
  url?: string;
  snippet?: string;
  
  // Optional academic metadata
  authors?: string[];
  publishedDate?: string;
  journal?: string;
  publisher?: string;
  doi?: string;
  
  // Source classification
  type: 'web' | 'academic' | 'documentation' | 'book' | 'video' | 'unknown';
  credibilityScore?: number; // 0-1 confidence in source quality
  
  // Provider-specific
  provider: 'openai' | 'gemini' | 'claude' | 'perplexity' | 'custom';
  rawMetadata?: Record<string, any>; // Original provider data
  
  // Usage tracking
  citedInMessage?: string; // Which message ID cited this
  citationCount?: number; // How many times cited in response
}

export interface CitationInText {
  // The citation marker in the text (e.g., "[1]", "(Source 1)")
  marker: string;
  
  // Which citation it refers to
  citationId: string;
  
  // Position in text
  startIndex: number;
  endIndex: number;
  
  // Context around the citation
  context?: string;
}

export interface ProcessedMessageWithCitations {
  // The message content with standardized citation markers
  content: string;
  
  // All citations found in this message
  citations: StandardCitation[];
  
  // Inline citation markers and their positions
  citationsInText: CitationInText[];
  
  // Original content (before processing)
  originalContent: string;
}
