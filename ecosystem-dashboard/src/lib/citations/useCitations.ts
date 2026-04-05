/**
 * React Hook for Citation Processing
 * 
 * Standardizes citations across AI Research and Podcast Studio
 */

import { useMemo } from 'react';
import { parseAICitations, standardizeCitationMarkers } from './parsers';
import { ProcessedMessageWithCitations, StandardCitation } from './types';

interface UseCitationsOptions {
  content: string;
  provider?: 'openai' | 'gemini' | 'claude';
  sources?: any[];
  groundingMetadata?: any;
  metadata?: Record<string, any>;
}

export function useCitations(options: UseCitationsOptions) {
  const { content, provider, sources, groundingMetadata, metadata } = options;
  
  const processed = useMemo(() => {
    return parseAICitations(content, {
      provider,
      sources,
      groundingMetadata,
    });
  }, [content, provider, sources, groundingMetadata]);
  
  const standardizedContent = useMemo(() => {
    return standardizeCitationMarkers(processed);
  }, [processed]);
  
  const hasCitations = processed.citations.length > 0;
  
  return {
    // The content with standardized citation markers
    content: standardizedContent,
    
    // Original content
    originalContent: processed.originalContent,
    
    // All citations with full metadata
    citations: processed.citations,
    
    // Inline citation positions
    citationsInText: processed.citationsInText,
    
    // Utility
    hasCitations,
    citationCount: processed.citations.length,
  };
}

/**
 * Group citations by type for better organization
 */
export function groupCitationsByType(citations: StandardCitation[]): Record<string, StandardCitation[]> {
  return citations.reduce((groups, citation) => {
    const type = citation.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(citation);
    return groups;
  }, {} as Record<string, StandardCitation[]>);
}

/**
 * Export citations in different formats
 */
export function exportCitations(citations: StandardCitation[], format: 'json' | 'bibtex' | 'markdown'): string {
  switch (format) {
    case 'json':
      return JSON.stringify(citations, null, 2);
      
    case 'bibtex':
      return citations.map((c, i) => {
        const key = c.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) + c.publishedDate?.slice(0, 4) || '';
        return `@article{${key},
  title={${c.title}},
  ${c.authors ? `author={${c.authors.join(' and ')}},` : ''}
  ${c.journal ? `journal={${c.journal}},` : ''}
  ${c.publishedDate ? `year={${c.publishedDate.slice(0, 4)}},` : ''}
  ${c.doi ? `doi={${c.doi}},` : ''}
  ${c.url ? `url={${c.url}}` : ''}
}`;
      }).join('\n\n');
      
    case 'markdown':
      return citations.map((c, i) => {
        let md = `${i + 1}. **${c.title}**`;
        if (c.authors && c.authors.length > 0) {
          md += ` by ${c.authors.join(', ')}`;
        }
        if (c.publishedDate) {
          md += ` (${c.publishedDate})`;
        }
        if (c.url) {
          md += `\n   - URL: ${c.url}`;
        }
        if (c.doi) {
          md += `\n   - DOI: ${c.doi}`;
        }
        if (c.snippet) {
          md += `\n   - "${c.snippet}"`;
        }
        return md;
      }).join('\n\n');
      
    default:
      return '';
  }
}
