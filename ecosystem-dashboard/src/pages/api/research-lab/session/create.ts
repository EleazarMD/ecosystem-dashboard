import type { NextApiRequest, NextApiResponse } from 'next';
import { queryGraphRAG, formatGraphRAGContext } from '@/lib/research/graphrag-service';
import { createResearchSession, updateResearchSession, initializeResearchDatabase, getResearchSession } from '@/lib/db/research-storage';

const AI_INFERENCING_URL = process.env.AI_INFERENCING_URL || 'http://localhost:9000';
const HERMES_CORE_URL = process.env.HERMES_CORE_URL || 'http://localhost:8780';

// Fetch OpenAI API key from AI Inferencing service
async function getOpenAIKey(): Promise<string> {
  try {
    const response = await fetch(`${AI_INFERENCING_URL}/api/v1/keys/research-agent/openai`);
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAI key: ${response.status}`);
    }
    const data = await response.json();
    return data.apiKey;
  } catch (error) {
    console.error('[Deep Research] Failed to fetch OpenAI key from AI Inferencing:', error);
    throw new Error('OpenAI API key not available');
  }
}

// Get Perplexity API key - AI Inferencing DB first (source of truth), env var fallback
async function getPerplexityKey(): Promise<string | null> {
  // Try AI Inferencing service first (source of truth, always has latest key)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${AI_INFERENCING_URL}/api/v1/keys/research-agent/perplexity`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (response.ok) {
      const data = await response.json();
      if (data.apiKey) {
        console.log('[Deep Research] Using Perplexity key from AI Inferencing');
        return data.apiKey;
      }
    }
  } catch (error) {
    console.warn('[Deep Research] AI Inferencing key fetch failed/timed out:', error);
  }

  // Fallback: environment variable
  const envKey = process.env.PERPLEXITY_API_KEY;
  if (envKey) {
    console.log('[Deep Research] Using Perplexity key from environment');
    return envKey;
  }
  
  console.warn('[Deep Research] Perplexity API key not available');
  return null;
}

// Get Gemini Deep Research API key from environment
function getGeminiDeepResearchKey(): string | null {
  const key = process.env.GEMINI_DEEP_RESEARCH_API_KEY || process.env.GOOGLE_API_KEY;
  if (key) {
    console.log('[Deep Research] Using Gemini Deep Research API key');
    return key;
  }
  console.warn('[Deep Research] Gemini Deep Research API key not available');
  return null;
}

interface CreateSessionRequest {
  question: string;
  contextPreamble?: string; // Prior research context — prepended to prompt but NOT stored as the question/title
  model: string;
  mode?: 'synchronous' | 'async';
  skipClarification?: boolean; // Skip clarifying questions if user wants to proceed directly
  clarificationAnswers?: Record<number, string>; // Answers to clarifying questions
  parentSessionId?: string; // Parent session for follow-up research
  sessionType?: 'original' | 'follow_up' | 'qwen3_query' | 'analysis' | 'pdf_analysis';
  skipResearch?: boolean; // Skip research and just create session with provided report (for PDF analysis)
  report?: string; // Pre-generated report content (for PDF analysis)
  outputFormats?: {
    academicReport: boolean;
    executiveSummary: boolean;
    podcastScript: boolean;
    presentationSlides: boolean;
  };
  dataSources?: {
    webResearch: boolean;
    knowledgeGraph: boolean;
    codeAnalysis: boolean;
    customMCP: boolean;
  };
}

interface ResearchSession {
  sessionId: string;
  question: string;
  optimizedQuery: string;
  model: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  report?: string;
  sources?: string[];
  cost?: number;
}

// In-memory session storage (replace with database in production)
const sessions = new Map<string, ResearchSession>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      question,
      contextPreamble,
      model,
      mode = 'synchronous',
      skipClarification = false,
      clarificationAnswers,
      parentSessionId,
      sessionType = 'original',
      skipResearch = false,
      report: providedReport,
      outputFormats,
      dataSources,
    } = req.body as CreateSessionRequest;

    // Build the full research prompt: context + question (but DB stores only clean question)
    const researchQuestion = contextPreamble
      ? `${contextPreamble}\n${question}`
      : question;

    // Safety net: strip context preamble from question if it was accidentally included
    let cleanQuestion = question;
    if (cleanQuestion.includes('CONTEXT FROM PRIOR RESEARCH')) {
      const marker = 'NEW RESEARCH REQUEST:';
      const markerIdx = cleanQuestion.indexOf(marker);
      if (markerIdx !== -1) {
        cleanQuestion = cleanQuestion.substring(markerIdx + marker.length).trim();
      }
    }

    // Validate required fields
    if (!cleanQuestion || !model) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Inherit project_id from parent session (so follow-ups stay in the same project)
    let inheritedProjectId: string | undefined;
    if (parentSessionId) {
      try {
        await initializeResearchDatabase();
        const parentSession = await getResearchSession(parentSessionId);
        if (parentSession?.project_id) {
          inheritedProjectId = parentSession.project_id;
          console.log(`[Session Create] Inheriting project_id=${inheritedProjectId} from parent ${parentSessionId}`);
        }
      } catch (err) {
        console.warn('[Session Create] Failed to look up parent project:', err);
      }
    }

    // Handle skipResearch mode (for PDF analysis - just create session with provided report)
    if (skipResearch && providedReport) {
      const sessionId = `pdf-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Initialize database if needed
      await initializeResearchDatabase();
      
      // Create session directly with completed status
      await createResearchSession({
        session_id: sessionId,
        question: cleanQuestion,
        model: model as any,
        status: 'completed',
        progress: 100,
        report: providedReport,
        parent_session_id: parentSessionId,
        session_type: sessionType as 'original' | 'follow_up' | 'qwen3_query' | 'analysis',
        project_id: inheritedProjectId,
      });

      console.log(`[PDF Analysis] Created session ${sessionId} for: ${question.substring(0, 50)}`);

      return res.status(200).json({
        sessionId,
        status: 'completed',
        report: providedReport,
      });
    }

    // Fetch API keys from AI Inferencing
    let OPENAI_API_KEY: string;
    let PERPLEXITY_API_KEY: string | null = null;
    
    try {
      OPENAI_API_KEY = await getOpenAIKey();
    } catch (error) {
      return res.status(500).json({
        error: 'OpenAI API key not available',
        message: error instanceof Error ? error.message : 'Failed to fetch API key from AI Inferencing',
      });
    }

    // Fetch Perplexity key if needed
    if (model.startsWith('sonar') || model === 'perplexity' || dataSources?.webResearch) {
      PERPLEXITY_API_KEY = await getPerplexityKey();
    }

    // Generate session ID
    const sessionId = `research-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    console.log(`[Deep Research] Starting session ${sessionId}`, {
      question: question.substring(0, 100),
      model,
      mode,
      dataSources,
      skipClarification,
    });

    // Initialize database
    await initializeResearchDatabase();

    // Step 1: Generate clarifying questions (only for OpenAI models, not Perplexity/Sonar)
    const isPerplexityModel = model.startsWith('sonar') || model === 'perplexity' || (dataSources?.webResearch && !model.startsWith('o1') && !model.startsWith('o3'));
    if (!skipClarification && !clarificationAnswers && !isPerplexityModel) {
      const clarifyingQuestions = await generateClarifyingQuestions(question, dataSources, outputFormats, OPENAI_API_KEY);
      
      if (clarifyingQuestions.length > 0) {
        console.log(`[Deep Research] Generated ${clarifyingQuestions.length} clarifying questions`);
        
        // Return clarifying questions to user
        return res.status(200).json({
          needsClarification: true,
          sessionId,
          questions: clarifyingQuestions,
          message: 'Please answer these questions to help refine your research.',
        });
      }
    }

    // Step 2: Optimize the query with GPT-4 (using clarification answers if provided)
    // Use full researchQuestion (with context) for the research prompt, but store clean question in DB
    const optimizedQuery = await optimizeResearchQuery(researchQuestion, dataSources, OPENAI_API_KEY, clarificationAnswers);
    console.log(`[Deep Research] Optimized query: ${optimizedQuery.substring(0, 100)}...`);

    // Create session record in database (inheritedProjectId resolved earlier)
    const dbSession = await createResearchSession({
      session_id: sessionId,
      question: cleanQuestion,
      model: model as any,
      status: 'in_progress',
      progress: 0,
      current_step: 'Optimizing query',
      estimated_cost: 0,
      output_formats: outputFormats,
      data_sources: dataSources,
      conversation_history: [],
      parent_session_id: parentSessionId,
      session_type: sessionType,
      project_id: inheritedProjectId,
    });

    console.log(`[Deep Research] Session saved to database: ${dbSession.session_id}`);

    // Create in-memory session record (for backward compatibility)
    const session: ResearchSession = {
      sessionId,
      question: cleanQuestion,
      optimizedQuery,
      model,
      status: 'processing',
      createdAt: Date.now(),
    };
    sessions.set(sessionId, session);

    if (mode === 'synchronous') {
      // Synchronous mode - wait for completion
      try {
        const result = await conductDeepResearch(
          optimizedQuery,
          model,
          dataSources,
          outputFormats,
          OPENAI_API_KEY,
          PERPLEXITY_API_KEY
        );

        session.status = 'completed';
        session.completedAt = Date.now();
        session.report = result.content;
        session.sources = result.sources;
        session.cost = result.cost;

        // Update database with completed research
        await updateResearchSession(sessionId, {
          status: 'completed',
          progress: 100,
          report: result.content,
          actual_cost: result.cost,
          completed_at: new Date(),
        });

        console.log(`[Deep Research] Session ${sessionId} completed and saved to database (${result.content.length} chars)`);

        return res.status(200).json({
          success: true,
          sessionId,
          report: result.content,
          sources: result.sources,
          actualCost: result.cost,
          processingTime: Date.now() - session.createdAt,
        });

      } catch (error) {
        session.status = 'failed';
        
        // Update database with failure
        await updateResearchSession(sessionId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
        
        throw error;
      }

    } else {
      // Async mode - start background job (fire-and-forget, persists to DB)
      conductDeepResearchAsync(sessionId, optimizedQuery, model, dataSources, outputFormats, OPENAI_API_KEY, PERPLEXITY_API_KEY).catch(err => {
        console.error(`[Deep Research] Unhandled async error for ${sessionId}:`, err);
      });

      return res.status(202).json({
        success: true,
        sessionId,
        status: 'processing',
        message: 'Deep research started. Poll /api/research-lab/session/status for updates.',
        estimatedTime: '5-15 minutes',
      });
    }

  } catch (error) {
    console.error('[Deep Research] Error:', error);
    return res.status(500).json({
      error: 'Failed to create research session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Generate clarifying questions to refine the research scope
 */
async function generateClarifyingQuestions(
  question: string,
  dataSources: CreateSessionRequest['dataSources'],
  outputFormats: CreateSessionRequest['outputFormats'],
  apiKey: string
): Promise<Array<{ number: number; text: string }>> {
  const systemPrompt = `You are a research planning assistant. Your task is to generate 3-5 clarifying questions that will help refine and improve the research output.

Focus on:
- Understanding the primary goal and target audience
- Clarifying the desired depth vs breadth
- Identifying specific aspects to emphasize or exclude
- Understanding time constraints and recency requirements
- Determining the appropriate level of technical detail

Generate questions that are:
- Specific and actionable
- Relevant to the research topic
- Designed to improve research quality
- Easy to answer with brief responses

Return ONLY a numbered list of questions (1., 2., 3., etc.), nothing else.`;

  const userPrompt = `Research topic: ${question}

Data sources enabled: ${Object.entries(dataSources).filter(([_, enabled]) => enabled).map(([source]) => source).join(', ')}
Output format: ${Object.entries(outputFormats).filter(([_, enabled]) => enabled).map(([format]) => format).join(', ')}

Generate 3-5 clarifying questions to help refine this research.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.warn('[Deep Research] Failed to generate clarifying questions, proceeding without them');
      return [];
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    // Ensure content is a string
    if (!content || typeof content !== 'string') {
      console.warn('[Deep Research] Invalid content from GPT-4, skipping clarifying questions');
      return [];
    }
    
    const contentStr = content.trim();
    
    // Parse numbered questions
    const questions: Array<{ number: number; text: string }> = [];
    const questionRegex = /(\d+)\.\s+(.+)/g;
    let match;
    
    while ((match = questionRegex.exec(contentStr)) !== null) {
      const number = parseInt(match[1]);
      const text = match[2].trim();
      if (text.length > 10) {
        questions.push({ number, text });
      }
    }
    
    return questions;
  } catch (error) {
    console.error('[Deep Research] Error generating clarifying questions:', error);
    return [];
  }
}

/**
 * Optimize research query using GPT-4
 */
async function optimizeResearchQuery(
  question: string,
  dataSources: CreateSessionRequest['dataSources'],
  apiKey: string,
  clarificationAnswers?: Record<number, string>
): Promise<string> {
  let userPrompt = question;
  
  // Incorporate clarification answers if provided
  if (clarificationAnswers && Object.keys(clarificationAnswers).length > 0) {
    const answersText = Object.entries(clarificationAnswers)
      .map(([num, answer]) => `${num}. ${answer}`)
      .join('\n');
    userPrompt = `Original question: ${question}\n\nClarification answers:\n${answersText}\n\nOptimize this research query based on the clarifications provided.`;
  }

  const systemPrompt = `You are a research query optimizer. Your task is to transform user questions into optimized research queries that will yield comprehensive, accurate results.

Consider:
- Breaking complex questions into sub-queries
- Adding relevant context and constraints
- Identifying key concepts and entities
- Suggesting search strategies
- Incorporating any clarification answers provided

Available data sources: ${Object.entries(dataSources).filter(([_, enabled]) => enabled).map(([source]) => source).join(', ')}

Return ONLY the optimized query, no explanation.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    console.warn('[Deep Research] Query optimization failed, using original query');
    return question;
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

/**
 * Conduct deep research using O1/O3 or Perplexity
 */
async function conductDeepResearch(
  query: string,
  model: string,
  dataSources: CreateSessionRequest['dataSources'],
  outputFormats: CreateSessionRequest['outputFormats'],
  apiKey: string,
  perplexityKey: string | null
): Promise<{ content: string; sources: string[]; cost: number }> {
  
  // Query knowledge graph if enabled
  let graphContext = '';
  if (dataSources.knowledgeGraph) {
    console.log('[Deep Research] Querying knowledge graph...');
    const graphData = await queryGraphRAG(query);
    graphContext = formatGraphRAGContext(graphData);
    console.log('[Deep Research] Knowledge graph context:', graphContext.length, 'chars');
  }
  
  // Build comprehensive research prompt
  const researchPrompt = buildResearchPrompt(query, dataSources, outputFormats, graphContext);

  // Route to appropriate research provider based on model
  if (model === 'gemini-deep-research') {
    // Use Gemini Deep Research API
    const geminiKey = getGeminiDeepResearchKey();
    if (!geminiKey) {
      throw new Error('Gemini Deep Research API key not configured');
    }
    return await conductGeminiDeepResearch(researchPrompt, geminiKey);
  } else if ((model.startsWith('sonar') || model === 'perplexity') && perplexityKey) {
    return await conductPerplexityResearch(researchPrompt, model, perplexityKey);
  } else if (dataSources.webResearch && perplexityKey && !model.startsWith('o1') && !model.startsWith('o3')) {
    // Use Perplexity deep research for web research if available and not using O1/O3
    return await conductPerplexityResearch(researchPrompt, 'sonar-deep-research', perplexityKey);
  } else {
    return await conductO1Research(researchPrompt, model, apiKey);
  }
}

function buildResearchPrompt(
  query: string,
  dataSources: CreateSessionRequest['dataSources'],
  outputFormats: CreateSessionRequest['outputFormats'],
  graphContext?: string
): string {
  let prompt = `Conduct comprehensive research on the following topic:\n\n${query}\n\n`;

  // Include knowledge graph context if available
  if (graphContext) {
    prompt += graphContext + '\n\n';
  }

  prompt += `## Research Requirements:\n`;
  
  if (dataSources.webResearch) {
    prompt += `- Use current web sources and cite them\n`;
  }
  if (dataSources.knowledgeGraph) {
    prompt += `- Reference relevant knowledge graph entities and relationships shown above\n`;
  }
  if (dataSources.codeAnalysis) {
    prompt += `- Include code examples and technical analysis where relevant\n`;
  }

  prompt += `\n## Output Format:\n`;
  
  if (outputFormats.academicReport) {
    prompt += `Provide a comprehensive academic-style report with:
- Executive Summary
- Introduction and Background
- Methodology
- Findings and Analysis
- Discussion
- Conclusions
- References

Use proper citations and maintain academic rigor.`;
  } else if (outputFormats.executiveSummary) {
    prompt += `Provide a concise executive summary (1-2 pages) with key findings and actionable insights.`;
  } else if (outputFormats.podcastScript) {
    prompt += `Write an engaging podcast script discussing the research findings in a conversational tone.`;
  } else if (outputFormats.presentationSlides) {
    prompt += `Structure the research as presentation slides with clear headings, bullet points, and key takeaways.`;
  } else {
    prompt += `Provide a well-structured research report with clear sections and comprehensive coverage.`;
  }

  return prompt;
}

async function conductPerplexityResearch(prompt: string, model: string, apiKey: string): Promise<{ content: string; sources: string[]; cost: number }> {
  // Only use sonar-pro if explicitly requested; everything else gets sonar-deep-research
  const apiModel = model === 'sonar-pro' ? 'sonar-pro' : 'sonar-deep-research';
  console.log(`[Deep Research] Using Perplexity model: ${apiModel}`);

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: apiModel,
      messages: [
        {
          role: 'system',
          content: 'You are a deep research assistant. Provide comprehensive, well-cited research reports.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Perplexity content may be a string, array of content blocks, or nested object
  let rawContent = data.choices?.[0]?.message?.content;
  let content: string;
  if (typeof rawContent === 'string') {
    content = rawContent;
  } else if (Array.isArray(rawContent)) {
    // Content blocks: [{type:'text', text:'...'}, ...]
    content = rawContent.map((block: any) => {
      if (typeof block === 'string') return block;
      if (block?.text) return block.text;
      if (block?.content) return block.content;
      return JSON.stringify(block);
    }).join('\n');
  } else if (rawContent && typeof rawContent === 'object') {
    content = rawContent.text || rawContent.content || JSON.stringify(rawContent);
  } else {
    console.error('[Deep Research] Unexpected Perplexity content type:', typeof rawContent, rawContent);
    content = String(rawContent || '');
  }

  console.log(`[Deep Research] Perplexity response: ${content.length} chars, content type: ${typeof rawContent}`);
  
  // Extract citations — prefer Perplexity's native citations array, fallback to URL extraction
  let sources: string[] = [];
  if (data.citations && Array.isArray(data.citations)) {
    sources = data.citations;
  } else {
    sources = extractCitations(content);
  }
  
  // Cost: sonar-deep-research ($2/$8 per million tokens), sonar-pro ($1/$5)
  const inputTokens = data.usage?.prompt_tokens || 2000;
  const outputTokens = data.usage?.completion_tokens || 3000;
  const isDeepResearch = apiModel === 'sonar-deep-research';
  const cost = isDeepResearch
    ? (inputTokens * 2 + outputTokens * 8) / 1_000_000
    : (inputTokens * 1 + outputTokens * 5) / 1_000_000;

  return { content, sources, cost };
}

async function conductO1Research(prompt: string, model: string, apiKey: string): Promise<{ content: string; sources: string[]; cost: number }> {
  const modelMap: Record<string, string> = {
    'o1': 'o1',
    'o1-pro': 'o1-pro',
    'o1-mini': 'o3-mini', // o1-mini doesn't exist, use o3-mini
    'o3': 'o3',
    'o3-mini': 'o3-mini',
    'o3-deep-research': 'o3-deep-research',
    'o3-pro': 'o3-pro',
    'o4-mini': 'o3-mini',
  };

  const apiModel = modelMap[model.toLowerCase()] || 'o3-mini';

  // O1 models use the /v1/responses endpoint, not /v1/chat/completions
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: apiModel,
      input: prompt,
      reasoning: {
        effort: 'high', // O1 models support reasoning effort
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  // v1/responses endpoint returns output as an array of items
  let content: string;
  if (typeof data.output === 'string') {
    content = data.output;
  } else if (Array.isArray(data.output)) {
    // output: [{type:'message', content:[{type:'output_text', text:'...'}]}]
    content = data.output.map((item: any) => {
      if (typeof item === 'string') return item;
      if (item?.text) return item.text;
      if (Array.isArray(item?.content)) {
        return item.content.map((c: any) => c?.text || '').join('\n');
      }
      if (item?.content && typeof item.content === 'string') return item.content;
      return '';
    }).filter(Boolean).join('\n');
  } else {
    content = data.choices?.[0]?.message?.content || '';
  }
  
  // O1 doesn't provide web sources, so extract any URLs mentioned
  const sources = extractUrls(content);
  
  // Estimate cost (O1: $15/$60 per million tokens, O1-mini: $3/$12)
  const inputTokens = data.usage.prompt_tokens;
  const outputTokens = data.usage.completion_tokens;
  const costMultiplier = apiModel === 'o1' ? [15, 60] : [3, 12];
  const cost = (inputTokens * costMultiplier[0] + outputTokens * costMultiplier[1]) / 1_000_000;

  return { content, sources, cost };
}

/**
 * Conduct deep research using Gemini Deep Research API (Interactions API)
 * Uses the deep-research-pro-preview agent for comprehensive multi-step research
 */
async function conductGeminiDeepResearch(
  prompt: string,
  apiKey: string
): Promise<{ content: string; sources: string[]; cost: number }> {
  console.log('[Deep Research] Starting Gemini Deep Research...');

  // Step 1: Create the interaction (starts async research)
  const createResponse = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/interactions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        input: prompt,
        agent: 'deep-research-pro-preview-12-2025',
        background: true,
      }),
    }
  );

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Gemini Deep Research API error: ${createResponse.status} - ${error}`);
  }

  const createData = await createResponse.json();
  const interactionId = createData.id || createData.name;

  if (!interactionId) {
    throw new Error('Gemini Deep Research: No interaction ID returned');
  }

  console.log(`[Deep Research] Gemini interaction started: ${interactionId}`);

  // Step 2: Poll for completion (max 60 minutes, check every 15 seconds)
  const maxWaitMs = 60 * 60 * 1000; // 60 minutes
  const pollIntervalMs = 15000; // 15 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const statusResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/interactions/${interactionId}`,
      {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      }
    );

    if (!statusResponse.ok) {
      console.warn(`[Deep Research] Gemini status check failed: ${statusResponse.status}`);
      continue;
    }

    const statusData = await statusResponse.json();
    const status = statusData.status || statusData.state;

    console.log(`[Deep Research] Gemini status: ${status} (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);

    if (status === 'completed' || status === 'COMPLETED' || status === 'done' || status === 'DONE') {
      // Extract the research output
      let content = '';
      if (statusData.outputs && Array.isArray(statusData.outputs)) {
        content = statusData.outputs
          .map((output: any) => output.text || output.content || '')
          .filter(Boolean)
          .join('\n\n');
      } else if (statusData.output) {
        content = typeof statusData.output === 'string' 
          ? statusData.output 
          : statusData.output.text || JSON.stringify(statusData.output);
      } else if (statusData.result) {
        content = typeof statusData.result === 'string'
          ? statusData.result
          : statusData.result.text || JSON.stringify(statusData.result);
      }

      // Extract citations
      let sources: string[] = [];
      if (statusData.citations && Array.isArray(statusData.citations)) {
        sources = statusData.citations.map((c: any) => c.url || c.uri || c).filter(Boolean);
      } else {
        sources = extractCitations(content);
      }

      // Estimate cost: Gemini 3 Pro pricing ($2/$12 per 1M tokens)
      const inputTokens = statusData.usage?.inputTokens || statusData.usage?.prompt_tokens || 5000;
      const outputTokens = statusData.usage?.outputTokens || statusData.usage?.completion_tokens || 10000;
      const cost = (inputTokens * 2 + outputTokens * 12) / 1_000_000;

      console.log(`[Deep Research] Gemini completed: ${content.length} chars, ${sources.length} sources`);

      return { content, sources, cost };
    }

    if (status === 'failed' || status === 'FAILED' || status === 'error' || status === 'ERROR') {
      const errorMsg = statusData.error?.message || statusData.errorMessage || 'Unknown error';
      throw new Error(`Gemini Deep Research failed: ${errorMsg}`);
    }
  }

  throw new Error('Gemini Deep Research timed out after 60 minutes');
}

function extractCitations(text: unknown): string[] {
  if (typeof text !== 'string' || !text) return [];
  const citations: string[] = [];
  const urlRegex = /https?:\/\/[^\s\)]+/g;
  const matches = text.match(urlRegex);
  if (matches) {
    citations.push(...matches);
  }
  return Array.from(new Set(citations)); // Remove duplicates
}

function extractUrls(text: unknown): string[] {
  return extractCitations(text);
}

/**
 * Async research - runs in background, persists all state to database.
 * The in-memory Map is updated for fast polling, but the DB is the source of truth.
 */
async function conductDeepResearchAsync(
  sessionId: string,
  query: string,
  model: string,
  dataSources: CreateSessionRequest['dataSources'],
  outputFormats: CreateSessionRequest['outputFormats'],
  apiKey: string,
  perplexityKey: string | null
) {
  const session = sessions.get(sessionId);

  try {
    // Update DB progress
    await updateResearchSession(sessionId, {
      status: 'in_progress',
      progress: 10,
      current_step: 'Conducting deep research',
    });

    const result = await conductDeepResearch(query, model, dataSources, outputFormats, apiKey, perplexityKey);

    // Update in-memory cache
    if (session) {
      session.status = 'completed';
      session.completedAt = Date.now();
      session.report = result.content;
      session.sources = result.sources;
      session.cost = result.cost;
    }

    // Persist to database (source of truth)
    await updateResearchSession(sessionId, {
      status: 'completed',
      progress: 100,
      report: result.content,
      actual_cost: result.cost,
      completed_at: new Date(),
    });

    console.log(`[Deep Research] Async session ${sessionId} completed and saved to database (${result.content.length} chars)`);
  } catch (error) {
    // Update in-memory cache
    if (session) {
      session.status = 'failed';
    }

    // Persist failure to database
    await updateResearchSession(sessionId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    }).catch(dbErr => console.error('[Deep Research] Failed to persist error to DB:', dbErr));

    console.error(`[Deep Research] Async session ${sessionId} failed:`, error);
  }
}

// Export session getter for status endpoint
export function getSession(sessionId: string): ResearchSession | undefined {
  return sessions.get(sessionId);
}
