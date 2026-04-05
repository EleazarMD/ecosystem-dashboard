/**
 * Standardized Citation System
 * 
 * Export all citation utilities for use across the application
 */

export * from './types';
export * from './parsers';
export * from './useCitations';

// Re-export commonly used functions for convenience
export {
  parseAICitations,
  parseOpenAICitations,
  parseGeminiCitations,
  parseClaudeCitations,
  standardizeCitationMarkers,
} from './parsers';

export {
  useCitations,
  groupCitationsByType,
  exportCitations,
} from './useCitations';

export type {
  StandardCitation,
  CitationInText,
  ProcessedMessageWithCitations,
} from './types';
