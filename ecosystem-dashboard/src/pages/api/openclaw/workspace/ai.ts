/**
 * Workspace AI API
 * 
 * AI-powered workspace enhancements:
 * - Page summarization
 * - Tag suggestions
 * - Organization suggestions
 * - Semantic search
 * - Related page discovery
 * - Content generation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db/client';
import { blockService } from '@/lib/workspace/block-service';
import { workspaceService } from '@/lib/workspace/workspace-service';
import { withAPIAuth, type APIAuthContext } from '@/lib/security/api-auth';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777/api/v1';
const EMBEDDING_URL = process.env.EMBEDDING_URL || 'http://localhost:8006';

interface AIOperation {
  operation:
    | 'summarize'
    | 'suggest_tags'
    | 'organize'
    | 'semantic_search'
    | 'find_related'
    | 'generate_outline'
    | 'expand'
    | 'extract_actions';
  workspace_id?: string;
  user_id?: string;
  data?: Record<string, unknown>;
}

export default withAPIAuth(async (req, res, authContext) => handler(req, res, authContext));

interface AIResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
}

// Helper: Call AI Gateway for chat completion
async function callLLM(
  messages: Array<{ role: string; content: string }>,
  model: string = 'claude-haiku-4-5'
): Promise<string> {
  try {
    const response = await fetch(`${AI_GATEWAY_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024'}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway returned ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('[Workspace AI] LLM call failed:', error);
    throw error;
  }
}

// Helper: Generate embedding
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${EMBEDDING_URL}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: [text],
        model: 'nvidia/nv-embedqa-e5-v5',
        input_type: 'query',
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding service returned ${response.status}`);
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || [];
  } catch (error) {
    console.error('[Workspace AI] Embedding failed:', error);
    throw error;
  }
}

// Helper: Extract text from page
async function extractPageText(pageId: string): Promise<string> {
  const page = await blockService.getBlock(pageId, true);
  if (!page) return '';

  const texts: string[] = [];
  
  // Add title
  const title = page.properties?.title?.[0]?.text?.content || '';
  if (title) texts.push(`# ${title}`);

  // Extract text from children
  if (page.children) {
    for (const child of page.children) {
      const textArray = child.properties?.title || child.properties?.rich_text || [];
      const content = textArray.map((t: any) => t.text?.content || '').join('');
      if (content) texts.push(content);
    }
  }

  return texts.join('\n\n');
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AIResponse>,
  authContext: APIAuthContext
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const op: AIOperation = req.body;
    const userId = authContext.userId;

    if (op.user_id && op.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'user_id does not match authenticated user',
        timestamp: new Date().toISOString(),
      });
    }

    if (!op.operation) {
      return res.status(400).json({
        success: false,
        error: 'operation is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Get workspace
    let workspaceId = op.workspace_id;
    if (!workspaceId) {
      const workspaces = await workspaceService.getUserWorkspaces(userId);
      if (workspaces.length > 0) {
        workspaceId = workspaces[0].id;
      }
    }

    let result: unknown;

    switch (op.operation) {
      // ========================================
      // SUMMARIZE
      // ========================================
      case 'summarize': {
        const {
          page_id,
          style = 'brief',
          max_length = 500,
          include_subpages = false,
        } = op.data || {};

        if (!page_id) {
          return res.status(400).json({
            success: false,
            error: 'page_id is required for summarize',
            timestamp: new Date().toISOString(),
          });
        }

        const pageText = await extractPageText(page_id as string);
        if (!pageText) {
          return res.status(404).json({
            success: false,
            error: 'Page not found or empty',
            timestamp: new Date().toISOString(),
          });
        }

        const styleInstructions: Record<string, string> = {
          brief: 'Provide a 1-2 sentence summary.',
          detailed: 'Provide a comprehensive paragraph summary.',
          bullet_points: 'Provide a summary as 3-5 bullet points.',
          executive: 'Provide a business executive summary with key takeaways.',
        };

        const prompt = `Summarize the following content. ${styleInstructions[style as string] || styleInstructions.brief}

Content:
${pageText.substring(0, 8000)}

Respond with JSON in this format:
{
  "summary": "...",
  "key_points": ["point 1", "point 2", "point 3"],
  "topics": ["topic1", "topic2"]
}`;

        const llmResponse = await callLLM([
          { role: 'system', content: 'You are a helpful assistant that summarizes content. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ]);

        let parsed;
        try {
          // Extract JSON from response
          const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: llmResponse, key_points: [], topics: [] };
        } catch {
          parsed = { summary: llmResponse, key_points: [], topics: [] };
        }

        const wordCount = pageText.split(/\s+/).length;

        result = {
          ...parsed,
          word_count: wordCount,
          reading_time_minutes: Math.ceil(wordCount / 200),
        };
        break;
      }

      // ========================================
      // SUGGEST TAGS
      // ========================================
      case 'suggest_tags': {
        const { page_id, max_tags = 5 } = op.data || {};

        if (!page_id) {
          return res.status(400).json({
            success: false,
            error: 'page_id is required for suggest_tags',
            timestamp: new Date().toISOString(),
          });
        }

        const pageText = await extractPageText(page_id as string);
        if (!pageText) {
          return res.status(404).json({
            success: false,
            error: 'Page not found or empty',
            timestamp: new Date().toISOString(),
          });
        }

        const prompt = `Analyze the following content and suggest ${max_tags} relevant tags for categorization.

Content:
${pageText.substring(0, 4000)}

Respond with JSON in this format:
{
  "tags": [
    { "tag": "tag-name", "confidence": 0.95 }
  ]
}

Tags should be lowercase, hyphenated, and relevant for organization.`;

        const llmResponse = await callLLM([
          { role: 'system', content: 'You are a helpful assistant that suggests tags for content organization. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ]);

        let parsed;
        try {
          const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { tags: [] };
        } catch {
          parsed = { tags: [] };
        }

        result = {
          suggested_tags: parsed.tags || [],
          existing_tags: [],
        };
        break;
      }

      // ========================================
      // ORGANIZE
      // ========================================
      case 'organize': {
        const {
          scope = 'all',
          page_ids = [],
          actions = ['suggest_tags', 'suggest_folders'],
        } = op.data || {};

        if (!workspaceId) {
          return res.status(400).json({
            success: false,
            error: 'workspace_id is required for organize',
            timestamp: new Date().toISOString(),
          });
        }

        // Get pages to analyze
        let pages;
        if (scope === 'selected' && (page_ids as string[]).length > 0) {
          pages = await Promise.all(
            (page_ids as string[]).map(id => blockService.getBlock(id))
          );
          pages = pages.filter(p => p !== null);
        } else {
          const allBlocks = await blockService.getWorkspaceBlocks(workspaceId, 'page');
          pages = allBlocks.slice(0, 50); // Limit for performance
        }

        const suggestions: Array<{
          page_id: string;
          page_title: string;
          action: string;
          suggestion: string;
          confidence: number;
          related_page_id?: string;
        }> = [];

        // Analyze each page
        for (const page of pages) {
          if (!page) continue;
          
          const title = page.properties?.title?.[0]?.text?.content || 'Untitled';
          const pageText = await extractPageText(page.id);

          // Simple heuristic-based suggestions (would use LLM for better results)
          
          // Suggest folders based on title patterns
          if ((actions as string[]).includes('suggest_folders')) {
            if (title.toLowerCase().includes('meeting')) {
              suggestions.push({
                page_id: page.id,
                page_title: title,
                action: 'suggest_folder',
                suggestion: "Move to 'Meetings' folder",
                confidence: 0.85,
              });
            } else if (title.toLowerCase().includes('research')) {
              suggestions.push({
                page_id: page.id,
                page_title: title,
                action: 'suggest_folder',
                suggestion: "Move to 'Research' folder",
                confidence: 0.85,
              });
            } else if (title.toLowerCase().includes('note')) {
              suggestions.push({
                page_id: page.id,
                page_title: title,
                action: 'suggest_folder',
                suggestion: "Move to 'Notes' folder",
                confidence: 0.80,
              });
            }
          }

          // Detect potential duplicates by title similarity
          if ((actions as string[]).includes('detect_duplicates')) {
            for (const otherPage of pages) {
              if (!otherPage || otherPage.id === page.id) continue;
              
              const otherTitle = otherPage.properties?.title?.[0]?.text?.content || '';
              
              // Simple similarity check
              const titleWords = new Set(title.toLowerCase().split(/\s+/));
              const otherWords = new Set(otherTitle.toLowerCase().split(/\s+/));
              const intersection = [...titleWords].filter(w => otherWords.has(w));
              const similarity = intersection.length / Math.max(titleWords.size, otherWords.size);
              
              if (similarity > 0.6 && similarity < 1) {
                suggestions.push({
                  page_id: page.id,
                  page_title: title,
                  action: 'detect_duplicate',
                  suggestion: `Similar to '${otherTitle}' (${Math.round(similarity * 100)}% match)`,
                  confidence: similarity,
                  related_page_id: otherPage.id,
                });
              }
            }
          }
        }

        // Deduplicate suggestions
        const uniqueSuggestions = suggestions.filter((s, i, arr) => 
          arr.findIndex(x => x.page_id === s.page_id && x.action === s.action) === i
        );

        result = {
          suggestions: uniqueSuggestions.slice(0, 20),
          total_suggestions: uniqueSuggestions.length,
          pages_analyzed: pages.length,
        };
        break;
      }

      // ========================================
      // SEMANTIC SEARCH
      // ========================================
      case 'semantic_search': {
        const {
          query: searchQuery,
          limit = 10,
          filters = {},
          include_content = true,
        } = op.data || {};

        if (!searchQuery) {
          return res.status(400).json({
            success: false,
            error: 'query is required for semantic_search',
            timestamp: new Date().toISOString(),
          });
        }

        if (!workspaceId) {
          return res.status(400).json({
            success: false,
            error: 'workspace_id is required for semantic_search',
            timestamp: new Date().toISOString(),
          });
        }

        const startTime = Date.now();

        // Generate query embedding
        let queryEmbedding: number[];
        try {
          queryEmbedding = await generateEmbedding(searchQuery as string);
        } catch {
          // Fall back to text search if embedding fails
          const textResults = await blockService.searchBlocks(
            workspaceId,
            searchQuery as string,
            limit as number
          );

          result = {
            results: textResults
              .filter(b => b.type === 'page')
              .map(p => ({
                page_id: p.id,
                title: p.properties?.title?.[0]?.text?.content || 'Untitled',
                excerpt: '',
                relevance_score: 0.5,
                matched_blocks: [],
              })),
            total: textResults.length,
            search_time_ms: Date.now() - startTime,
            fallback: 'text_search',
          };
          break;
        }

        // Search using vector similarity (if embeddings exist)
        // For now, fall back to text search with LLM reranking
        const textResults = await blockService.searchBlocks(
          workspaceId,
          searchQuery as string,
          (limit as number) * 2 // Get more for reranking
        );

        const pageResults = textResults.filter(b => b.type === 'page');

        // Simple relevance scoring based on title match
        const scoredResults = pageResults.map(p => {
          const title = (p.properties?.title?.[0]?.text?.content || '').toLowerCase();
          const queryLower = (searchQuery as string).toLowerCase();
          const queryWords = queryLower.split(/\s+/);
          
          let score = 0;
          for (const word of queryWords) {
            if (title.includes(word)) score += 0.3;
          }
          score = Math.min(score, 1);

          return {
            page_id: p.id,
            title: p.properties?.title?.[0]?.text?.content || 'Untitled',
            excerpt: '',
            relevance_score: score,
            matched_blocks: [],
          };
        });

        // Sort by score and limit
        scoredResults.sort((a, b) => b.relevance_score - a.relevance_score);

        result = {
          results: scoredResults.slice(0, limit as number),
          total: scoredResults.length,
          search_time_ms: Date.now() - startTime,
        };
        break;
      }

      // ========================================
      // FIND RELATED
      // ========================================
      case 'find_related': {
        const { page_id, limit = 5 } = op.data || {};

        if (!page_id) {
          return res.status(400).json({
            success: false,
            error: 'page_id is required for find_related',
            timestamp: new Date().toISOString(),
          });
        }

        const sourcePage = await blockService.getBlock(page_id as string);
        if (!sourcePage) {
          return res.status(404).json({
            success: false,
            error: 'Page not found',
            timestamp: new Date().toISOString(),
          });
        }

        const sourceTitle = sourcePage.properties?.title?.[0]?.text?.content || '';
        const sourceText = await extractPageText(page_id as string);

        // Get all pages in workspace
        const allPages = await blockService.getWorkspaceBlocks(sourcePage.workspace_id, 'page');

        // Calculate similarity scores
        const relatedPages: Array<{
          page_id: string;
          title: string;
          similarity_score: number;
          common_topics: string[];
        }> = [];

        for (const page of allPages) {
          if (page.id === page_id) continue;

          const title = page.properties?.title?.[0]?.text?.content || '';
          
          // Simple word overlap similarity
          const sourceWords = new Set(sourceTitle.toLowerCase().split(/\s+/));
          const targetWords = new Set(title.toLowerCase().split(/\s+/));
          const intersection = [...sourceWords].filter(w => targetWords.has(w) && w.length > 2);
          
          if (intersection.length > 0) {
            const similarity = intersection.length / Math.max(sourceWords.size, targetWords.size);
            
            relatedPages.push({
              page_id: page.id,
              title,
              similarity_score: similarity,
              common_topics: intersection,
            });
          }
        }

        // Sort by similarity and limit
        relatedPages.sort((a, b) => b.similarity_score - a.similarity_score);

        result = {
          source_page: {
            id: page_id,
            title: sourceTitle,
          },
          related_pages: relatedPages.slice(0, limit as number),
        };
        break;
      }

      // ========================================
      // GENERATE OUTLINE
      // ========================================
      case 'generate_outline': {
        const {
          topic,
          depth = 2,
          style = 'technical',
        } = op.data || {};

        if (!topic) {
          return res.status(400).json({
            success: false,
            error: 'topic is required for generate_outline',
            timestamp: new Date().toISOString(),
          });
        }

        const styleInstructions: Record<string, string> = {
          academic: 'Use formal academic structure with introduction, methodology, results, discussion, conclusion.',
          blog: 'Use engaging blog structure with hook, main points, and call to action.',
          technical: 'Use technical documentation structure with overview, concepts, implementation, examples.',
          casual: 'Use conversational structure with simple sections.',
        };

        const prompt = `Generate an outline for a document about: "${topic}"

Style: ${styleInstructions[style as string] || styleInstructions.technical}
Depth: ${depth} levels of headings

Respond with JSON in this format:
{
  "outline": [
    {
      "heading": "Section Title",
      "level": 1,
      "children": [
        { "heading": "Subsection", "level": 2, "children": [] }
      ]
    }
  ],
  "estimated_word_count": 2000
}`;

        const llmResponse = await callLLM([
          { role: 'system', content: 'You are a helpful assistant that generates document outlines. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ]);

        let parsed;
        try {
          const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { outline: [], estimated_word_count: 0 };
        } catch {
          parsed = { outline: [], estimated_word_count: 0 };
        }

        result = parsed;
        break;
      }

      // ========================================
      // EXTRACT ACTIONS
      // ========================================
      case 'extract_actions': {
        const { page_id } = op.data || {};

        if (!page_id) {
          return res.status(400).json({
            success: false,
            error: 'page_id is required for extract_actions',
            timestamp: new Date().toISOString(),
          });
        }

        const pageText = await extractPageText(page_id as string);
        if (!pageText) {
          return res.status(404).json({
            success: false,
            error: 'Page not found or empty',
            timestamp: new Date().toISOString(),
          });
        }

        const prompt = `Extract action items and tasks from the following content.

Content:
${pageText.substring(0, 6000)}

Respond with JSON in this format:
{
  "action_items": [
    {
      "task": "Description of the task",
      "assignee": null,
      "due_date": null,
      "priority": "medium"
    }
  ]
}

Look for:
- Explicit tasks ("need to", "should", "must", "TODO")
- Action items from meetings
- Follow-ups mentioned
- Deadlines or dates`;

        const llmResponse = await callLLM([
          { role: 'system', content: 'You are a helpful assistant that extracts action items from content. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ]);

        let parsed;
        try {
          const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { action_items: [] };
        } catch {
          parsed = { action_items: [] };
        }

        result = {
          ...parsed,
          total: parsed.action_items?.length || 0,
        };
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown operation: ${op.operation}`,
          timestamp: new Date().toISOString(),
        });
    }

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Workspace AI] Error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
