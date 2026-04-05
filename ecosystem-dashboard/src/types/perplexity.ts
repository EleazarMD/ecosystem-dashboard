/**
 * Type definitions for Perplexity Sonar Deep Research API
 * Based on official Perplexity API documentation
 */

export interface PerplexityDeepResearchParams {
  // Standard OpenAI-compatible parameters
  temperature?: number;           // 0.0-2.0, default 0.7
  max_tokens?: number;            // 500-8000, recommended 3000-4000 for research
  top_p?: number;                 // 0.0-1.0, recommended 0.85-0.95 for research
  frequency_penalty?: number;     // -2.0 to 2.0
  presence_penalty?: number;      // -2.0 to 2.0
  stream?: boolean;               // Enable streaming responses
  
  // Perplexity-specific search parameters
  search_mode?: 'web' | 'academic';           // Default: 'web'
  search_domain_filter?: string[];            // Up to 20 domains, prefix with '-' to exclude
  search_recency_filter?: 'day' | 'week' | 'month' | 'year'; // Time-based filtering
  search_after_date_filter?: string;          // Format: "mm/dd/yyyy"
  search_before_date_filter?: string;         // Format: "mm/dd/yyyy"
  
  // Perplexity-specific output parameters
  return_images?: boolean;                    // Include image URLs in response
  return_related_questions?: boolean;         // Include related questions
  response_format?: 'markdown' | 'json';      // Output format
}

export interface DeepResearchState {
  phase: 'idle' | 'clarification' | 'planning' | 'approval' | 'executing' | 'complete';
  isActive: boolean;
  
  // User's original query
  originalQuery: string;
  
  // Conversation ID for this deep research session
  conversationId?: string;
  
  // Clarification responses from user
  clarificationResponses?: {
    researchType?: 'academic' | 'business' | 'news' | 'technical' | 'general';
    sourcePreference?: 'peer-reviewed' | 'reputable-news' | 'mixed';
    recencyNeed?: 'day' | 'week' | 'month' | 'year' | 'none';
    includeImages?: boolean;
    includeRelatedQuestions?: boolean;
  };
  
  // Goose's recommended parameters
  gooseRecommendedParams?: PerplexityDeepResearchParams;
  
  // User-modified parameters (if user overrides)
  userOverrideParams?: PerplexityDeepResearchParams;
  
  // Final parameters to use for research
  finalParams?: PerplexityDeepResearchParams;
  
  // Research plan details for display
  researchPlan?: ResearchPlan;
}

export interface ResearchPlan {
  // Query information
  query: string;
  refinedQuery?: string;          // Goose-optimized version of the query (Strategic Research Directive)
  queryRationale?: string;         // Why the query was refined / how it guides Perplexity
  
  // Search parameters (what we CAN control)
  searchMode: 'web' | 'academic';
  domains: string[];
  domainRationale: string;
  recencyFilter: string;
  recencyRationale: string;
  
  // Output parameters
  maxTokens: number;
  includeImages: boolean;
  relatedQuestions: boolean;
  temperature: number;
  topP?: number;
  responseFormat?: 'markdown' | 'json';
  
  // Strategic planning elements
  strategyOverview?: string;       // High-level approach (2-3 sentences)
  expectedOutcomes?: string[];     // What this research will deliver (tied to investigation points)
  
  fullRationale?: string;
}

export interface DomainPreset {
  id: string;
  name: string;
  icon: string;
  domains: string[];
  description: string;
  researchTypes: string[];
}

export const DOMAIN_PRESETS: DomainPreset[] = [
  {
    id: 'academic',
    name: 'Academic',
    icon: '🎓',
    domains: ['arxiv.org', 'scholar.google.com', 'pubmed.ncbi.nlm.nih.gov', 'jstor.org'],
    description: 'Peer-reviewed papers and academic research',
    researchTypes: ['academic', 'technical'],
  },
  {
    id: 'news',
    name: 'News',
    icon: '📰',
    domains: ['reuters.com', 'apnews.com', 'bbc.com', 'theguardian.com'],
    description: 'Reputable news organizations',
    researchTypes: ['news', 'general'],
  },
  {
    id: 'business',
    name: 'Business',
    icon: '💼',
    domains: ['bloomberg.com', 'wsj.com', 'ft.com', 'economist.com'],
    description: 'Business and financial news',
    researchTypes: ['business', 'general'],
  },
  {
    id: 'science',
    name: 'Science',
    icon: '🔬',
    domains: ['nature.com', 'science.org', 'cell.com', 'pnas.org'],
    description: 'Scientific journals and research',
    researchTypes: ['academic', 'technical'],
  },
  {
    id: 'tech',
    name: 'Tech',
    icon: '💻',
    domains: ['github.com', 'stackoverflow.com', 'docs.python.org', 'developer.mozilla.org'],
    description: 'Technical documentation and developer resources',
    researchTypes: ['technical'],
  },
];

/**
 * Get recommended parameters based on research type
 */
export function getRecommendedParams(
  researchType: 'academic' | 'business' | 'news' | 'technical' | 'general',
  recency: 'day' | 'week' | 'month' | 'year' | 'none' = 'month'
): PerplexityDeepResearchParams {
  const baseParams: PerplexityDeepResearchParams = {
    stream: true,
    response_format: 'markdown',
  };

  switch (researchType) {
    case 'academic':
      return {
        ...baseParams,
        search_mode: 'academic',
        search_domain_filter: DOMAIN_PRESETS.find(p => p.id === 'academic')?.domains,
        search_recency_filter: recency === 'none' ? 'year' : recency,
        temperature: 0.2,
        max_tokens: 4000,
        top_p: 0.85,
        return_images: false,
        return_related_questions: true,
      };

    case 'business':
      return {
        ...baseParams,
        search_mode: 'web',
        search_domain_filter: DOMAIN_PRESETS.find(p => p.id === 'business')?.domains,
        search_recency_filter: recency === 'none' ? 'week' : recency,
        temperature: 0.3,
        max_tokens: 3000,
        top_p: 0.9,
        return_images: true,
        return_related_questions: true,
      };

    case 'news':
      return {
        ...baseParams,
        search_mode: 'web',
        search_domain_filter: DOMAIN_PRESETS.find(p => p.id === 'news')?.domains,
        search_recency_filter: recency === 'none' ? 'day' : recency,
        temperature: 0.1,
        max_tokens: 2000,
        top_p: 0.95,
        return_images: true,
        return_related_questions: false,
      };

    case 'technical':
      return {
        ...baseParams,
        search_mode: 'web',
        search_domain_filter: DOMAIN_PRESETS.find(p => p.id === 'tech')?.domains,
        search_recency_filter: recency === 'none' ? 'month' : recency,
        temperature: 0.15,
        max_tokens: 3500,
        top_p: 0.9,
        return_images: false,
        return_related_questions: true,
      };

    case 'general':
    default:
      return {
        ...baseParams,
        search_mode: 'web',
        search_recency_filter: recency === 'none' ? 'month' : recency,
        temperature: 0.4,
        max_tokens: 3000,
        top_p: 0.9,
        return_images: true,
        return_related_questions: true,
      };
  }
}

/**
 * Parse Goose's research plan response
 * Looks for JSON parameters in Goose's response
 */
export function parseGooseResearchPlan(gooseResponse: string): ResearchPlan | null {
  try {
    // Look for JSON code block in response
    const jsonMatch = gooseResponse.match(/```json\s*\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[1]);
    if (!parsed.parameters) {
      return null;
    }

    const params = parsed.parameters;
    
    // Extract plan details from the markdown response
    const domainMatch = gooseResponse.match(/Domains:\s*\n([\s\S]*?)(?=\n\n|\nRationale:)/);
    const domains: string[] = [];
    if (domainMatch) {
      const domainLines = domainMatch[1].split('\n');
      domainLines.forEach(line => {
        const match = line.match(/[✓✗]\s*([a-zA-Z0-9.-]+)/);
        if (match) {
          domains.push(match[1]);
        }
      });
    }

    return {
      query: parsed.query || '',
      searchMode: params.search_mode || 'web',
      domains: params.search_domain_filter || domains,
      domainRationale: extractRationale(gooseResponse, 'domain') || 'Mixed sources for comprehensive coverage',
      recencyFilter: params.search_recency_filter || 'month',
      recencyRationale: extractRationale(gooseResponse, 'recency') || 'Balanced between recency and quality',
      maxTokens: params.max_tokens || 3000,
      includeImages: params.return_images ?? false,
      relatedQuestions: params.return_related_questions ?? true,
      temperature: params.temperature || 0.3,
      topP: params.top_p,
      responseFormat: params.response_format,
      fullRationale: gooseResponse,
    };
  } catch (error) {
    console.error('[parseGooseResearchPlan] Error parsing Goose response:', error);
    return null;
  }
}

/**
 * Extract rationale text from Goose's response
 */
function extractRationale(text: string, type: 'domain' | 'recency'): string | null {
  const rationaleMatch = text.match(
    type === 'domain'
      ? /\*\*Rationale:\*\*\s*([^\n]+)/i
      : /\*\*Rationale:\*\*\s*([^\n]+)/i
  );
  return rationaleMatch ? rationaleMatch[1].trim() : null;
}

/**
 * Convert ResearchPlan to API parameters
 */
export function researchPlanToParams(plan: ResearchPlan): PerplexityDeepResearchParams {
  return {
    search_mode: plan.searchMode,
    search_domain_filter: plan.domains,
    search_recency_filter: plan.recencyFilter as any,
    max_tokens: plan.maxTokens,
    return_images: plan.includeImages,
    return_related_questions: plan.relatedQuestions,
    temperature: plan.temperature,
    top_p: plan.topP,
    response_format: plan.responseFormat,
    stream: true,
  };
}
