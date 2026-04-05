/**
 * Citation Parsers for Different AI Providers
 * 
 * Normalizes citations from OpenAI, Gemini, Claude, etc. into StandardCitation format
 */

import { StandardCitation, ProcessedMessageWithCitations, CitationInText } from './types';

/**
 * Parse OpenAI Deep Research citations
 * Format: Inline citations like [1], [2] with sources array in metadata
 */
export function parseOpenAICitations(
  content: string,
  sourcesMetadata?: any[]
): ProcessedMessageWithCitations {
  const citations: StandardCitation[] = [];
  const citationsInText: CitationInText[] = [];
  
  // Parse sources from metadata
  if (sourcesMetadata) {
    sourcesMetadata.forEach((source, index) => {
      citations.push({
        id: `openai_${index + 1}`,
        title: source.title || source.url || `Source ${index + 1}`,
        url: source.url,
        snippet: source.snippet || source.text,
        type: source.type || 'web',
        provider: 'openai',
        rawMetadata: source,
        citationCount: 0,
      });
    });
  }
  
  // Find inline citations like [1], [2]
  const inlinePattern = /\[(\d+)\]/g;
  let match;
  
  while ((match = inlinePattern.exec(content)) !== null) {
    const citationNumber = parseInt(match[1], 10);
    const citationId = `openai_${citationNumber}`;
    
    citationsInText.push({
      marker: match[0],
      citationId,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
    
    // Increment citation count
    const citation = citations.find(c => c.id === citationId);
    if (citation) {
      citation.citationCount = (citation.citationCount || 0) + 1;
    }
  }
  
  return {
    content,
    citations,
    citationsInText,
    originalContent: content,
  };
}

/**
 * Parse Gemini grounding citations
 * Format: Inline markers with grounding_metadata structure
 */
export function parseGeminiCitations(
  content: string,
  groundingMetadata?: any
): ProcessedMessageWithCitations {
  const citations: StandardCitation[] = [];
  const citationsInText: CitationInText[] = [];
  
  if (groundingMetadata?.grounding_chunks) {
    groundingMetadata.grounding_chunks.forEach((chunk: any, index: number) => {
      const webData = chunk.web || chunk.retrievedContext;
      
      citations.push({
        id: `gemini_${index + 1}`,
        title: webData?.title || webData?.uri || `Source ${index + 1}`,
        url: webData?.uri || webData?.url,
        snippet: webData?.snippet,
        type: 'web',
        provider: 'gemini',
        rawMetadata: chunk,
        citationCount: 0,
      });
    });
  }
  
  // Gemini uses different patterns
  const patterns = [
    /\[(\d+)\]/g,                           // Numbered citations
    /\(@[A-Z0-9]+\)/g,                      // Grounding references like (@ABC123)
    /\(Source\s+(\d+)\)/gi,                 // Source references
  ];
  
  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern);
    
    while ((match = regex.exec(content)) !== null) {
      const citationNumber = match[1] ? parseInt(match[1], 10) : citationsInText.length + 1;
      const citationId = `gemini_${citationNumber}`;
      
      citationsInText.push({
        marker: match[0],
        citationId,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
      
      const citation = citations.find(c => c.id === citationId);
      if (citation) {
        citation.citationCount = (citation.citationCount || 0) + 1;
      }
    }
  });
  
  return {
    content,
    citations,
    citationsInText,
    originalContent: content,
  };
}

/**
 * Parse Claude citations
 * Format: Citations in <cite> tags or footnote-style
 */
export function parseClaudeCitations(
  content: string,
  sources?: any[]
): ProcessedMessageWithCitations {
  const citations: StandardCitation[] = [];
  const citationsInText: CitationInText[] = [];
  
  if (sources) {
    sources.forEach((source, index) => {
      citations.push({
        id: `claude_${index + 1}`,
        title: source.title || source.url || `Source ${index + 1}`,
        url: source.url,
        snippet: source.excerpt,
        type: source.type || 'web',
        provider: 'claude',
        rawMetadata: source,
        citationCount: 0,
      });
    });
  }
  
  // Claude typically uses [1], [2] format
  const inlinePattern = /\[(\d+)\]/g;
  let match;
  
  while ((match = inlinePattern.exec(content)) !== null) {
    const citationNumber = parseInt(match[1], 10);
    const citationId = `claude_${citationNumber}`;
    
    citationsInText.push({
      marker: match[0],
      citationId,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
    
    const citation = citations.find(c => c.id === citationId);
    if (citation) {
      citation.citationCount = (citation.citationCount || 0) + 1;
    }
  }
  
  return {
    content,
    citations,
    citationsInText,
    originalContent: content,
  };
}

/**
 * Auto-detect and parse citations from any provider
 */
export function parseAICitations(
  content: string,
  metadata?: {
    provider?: 'openai' | 'gemini' | 'claude';
    sources?: any[];
    groundingMetadata?: any;
  }
): ProcessedMessageWithCitations {
  const provider = metadata?.provider;
  
  switch (provider) {
    case 'openai':
      return parseOpenAICitations(content, metadata.sources);
    case 'gemini':
      return parseGeminiCitations(content, metadata.groundingMetadata);
    case 'claude':
      return parseClaudeCitations(content, metadata.sources);
    default:
      // Fallback: Try to detect format from content
      if (metadata?.groundingMetadata) {
        return parseGeminiCitations(content, metadata.groundingMetadata);
      } else if (metadata?.sources) {
        return parseOpenAICitations(content, metadata.sources);
      } else {
        // Generic parser - just look for numbered citations
        return {
          content,
          citations: [],
          citationsInText: [],
          originalContent: content,
        };
      }
  }
}

/**
 * Render citations in a standardized format
 * Converts provider-specific markers to consistent [1], [2], [3] format
 */
export function standardizeCitationMarkers(
  processed: ProcessedMessageWithCitations
): string {
  let standardized = processed.content;
  
  // Sort by position (descending) to avoid index shifting
  const sorted = [...processed.citationsInText].sort((a, b) => b.startIndex - a.startIndex);
  
  sorted.forEach((citation, index) => {
    // Find which citation number this is
    const citationIndex = processed.citations.findIndex(c => c.id === citation.citationId);
    const standardMarker = `[${citationIndex + 1}]`;
    
    // Replace the original marker with standardized marker
    standardized =
      standardized.slice(0, citation.startIndex) +
      standardMarker +
      standardized.slice(citation.endIndex);
  });
  
  return standardized;
}
