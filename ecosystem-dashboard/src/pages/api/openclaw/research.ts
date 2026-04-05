/**
 * OpenClaw Deep Research Integration API
 * 
 * Handles research requests from OpenClaw with full support for:
 * - Research settings (model, output formats, data sources)
 * - Sub-research under parent projects/sessions
 * - Research analyzer jobs (gap analysis, weak area identification)
 * - Follow-up research based on analysis
 * 
 * Model Routing Strategy (matching Deep Research Studio):
 * - Brief queries / no web search: Qwen3-32B (local, free, 32K context)
 * - Web search enabled: Perplexity Sonar Pro/Deep Research (128K context)
 * - Deep research mode: Perplexity sonar-deep-research
 * - Large context analysis: Gemini 2.5 Flash (1M context)
 * - News story generation: Qwen3-32B via Goose agent
 * 
 * This endpoint routes to the Deep Research Studio APIs internally.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { registerWebhook } from './research/webhook-notify';

const DASHBOARD_API_BASE = process.env.DASHBOARD_API_BASE || 'http://localhost:8404';
const GOOSE_BACKEND_URL = process.env.GOOSE_BACKEND_URL || 'http://localhost:8405';
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'openclaw-gateway-2024-key';

// Research models available - mapped to actual API models
type ResearchModel = 
  | 'sonar-deep-research'  // Perplexity deep research (web + synthesis)
  | 'sonar-pro'            // Perplexity conversational with web
  | 'qwen3-32b'            // Local Qwen3 (brief queries, no web, free)
  | 'gemini-2-5-flash'     // Gemini Flash (large context re-analysis)
  | 'o1'                   // OpenAI O1 reasoning
  | 'o3'                   // OpenAI O3 reasoning
  | 'claude-sonnet-4';     // Claude Sonnet 4

// Research mode determines model selection
type ResearchMode = 
  | 'deep_research'        // Full web research with Perplexity
  | 'quick_query'          // Brief local query with Qwen3 (no web)
  | 'news_story'           // News synthesis via Goose agent
  | 'large_context';       // Re-analysis with Gemini (1M context)

// Output format options
interface OutputFormats {
  academicReport?: boolean;
  executiveSummary?: boolean;
  podcastScript?: boolean;
  presentationSlides?: boolean;
  newsStory?: boolean;
}

// Data source options
interface DataSources {
  webResearch?: boolean;
  knowledgeGraph?: boolean;
  codeAnalysis?: boolean;
  customMCP?: boolean;
  emailIntelligence?: boolean;
  contactNetwork?: boolean;
}

// Research settings matching the UI
interface ResearchSettings {
  sourceRecency?: 'any' | 'past_day' | 'past_week' | 'past_month' | 'past_year';
  domainFocus?: string[];
  targetAudience?: 'general' | 'technical' | 'executive' | 'academic';
}

// Analyzer settings
interface AnalyzerSettings {
  analysisModel?: string;
  deepResearchModel?: ResearchModel;
  includeReportContext?: boolean;
}

// Sub-topic definition for research plans
interface SubTopic {
  topic: string;
  instructions?: string;           // Specific instructions for this sub-topic
  outputFormat?: keyof OutputFormats; // Per-topic output format
  depth?: 'shallow' | 'moderate' | 'deep';
  model?: ResearchModel;           // Override model for this sub-topic
  dataSources?: DataSources;       // Override data sources
}

// Research plan for orchestrated multi-topic research
interface ResearchPlan {
  subTopics: SubTopic[];
  synthesize?: boolean;            // Combine all sub-research into final report
  synthesisModel?: ResearchModel;  // Model for synthesis (default: gemini-2-5-flash)
  finalOutputFormat?: keyof OutputFormats;
  parallelExecution?: boolean;     // Execute sub-topics in parallel (default: true)
  maxConcurrent?: number;          // Max concurrent sub-topics (default: 3)
}

// Extended response for research plans
interface ResearchPlanResponse {
  success: boolean;
  projectId?: string;
  planId?: string;
  status: 'created' | 'processing' | 'completed' | 'partial' | 'failed';
  subTopicResults?: Array<{
    topic: string;
    sessionId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    outputFormat?: string;
    error?: string;
  }>;
  synthesisSessionId?: string;
  synthesizedReport?: string;
  error?: string;
  timestamp: string;
}

// OpenClaw research request
interface OpenClawResearchRequest {
  // Core research parameters
  query: string;
  model?: ResearchModel;
  researchMode?: ResearchMode;  // Determines model selection strategy
  
  // Research settings
  outputFormats?: OutputFormats;
  dataSources?: DataSources;
  researchSettings?: ResearchSettings;
  
  // Sub-research / follow-up
  parentSessionId?: string;
  parentProjectId?: string;
  sessionType?: 'original' | 'follow_up' | 'qwen3_query' | 'analysis';
  
  // Context preamble (for follow-up research with prior context)
  contextPreamble?: string;
  
  // Research plan for multi-topic orchestration
  researchPlan?: ResearchPlan;
  
  // Analyzer job
  analyzerJob?: {
    enabled: boolean;
    targetTopicIds?: string[];
    targetGapTopics?: string[];
    analyzerSettings?: AnalyzerSettings;
  };
  
  // Context from OpenClaw
  context?: {
    channel: string;
    session_id?: string;
    user_message?: string;
  };
  
  // Execution mode
  mode?: 'synchronous' | 'async';
  
  // Webhook/notification on completion
  onComplete?: {
    webhook?: string;           // URL to POST when research completes
    notifyChannel?: string;     // OpenClaw channel to notify
    includeReport?: boolean;    // Include full report in webhook payload (default: false)
  };
}

interface OpenClawResearchResponse {
  success: boolean;
  sessionId?: string;
  projectId?: string;
  status?: 'created' | 'processing' | 'completed' | 'failed';
  report?: string;
  analysis?: {
    topics: Array<{
      id: string;
      name: string;
      depth: 'shallow' | 'moderate' | 'deep';
      coverage_pct: number;
      suggested_followup: string;
    }>;
    gaps: Array<{
      topic: string;
      reason: string;
      suggested_query: string;
    }>;
    overall_assessment: {
      strengths: string[];
      weaknesses: string[];
      recommended_next_steps: string[];
    };
  };
  error?: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OpenClawResearchResponse | ResearchPlanResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const request: OpenClawResearchRequest = req.body;

    if (!request.query) {
      return res.status(400).json({
        success: false,
        error: 'query is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Handle research plan orchestration
    if (request.researchPlan && request.researchPlan.subTopics?.length > 0) {
      return await handleResearchPlan(request, res);
    }

    console.log('[OpenClaw Research] Request:', {
      query: request.query.substring(0, 100),
      model: request.model,
      researchMode: request.researchMode,
      parentSessionId: request.parentSessionId,
      parentProjectId: request.parentProjectId,
      analyzerJob: request.analyzerJob?.enabled,
      channel: request.context?.channel,
    });

    // Determine model based on research mode (matching Deep Research Studio logic)
    const outputFormats = request.outputFormats || { academicReport: true };
    const dataSources = request.dataSources || { webResearch: true };
    const mode = request.mode || 'async';
    
    // Model selection strategy:
    // 1. If explicit model provided, use it
    // 2. Otherwise, infer from researchMode or dataSources
    let model: string = request.model || 'sonar-deep-research';
    let sessionType = request.sessionType || 'original';
    
    if (!request.model) {
      const researchMode = request.researchMode || 
        (dataSources.webResearch ? 'deep_research' : 'quick_query');
      
      switch (researchMode) {
        case 'quick_query':
          // Brief local query with Qwen3 (no web, free, 32K context)
          model = 'qwen3-32b';
          sessionType = 'qwen3_query';
          break;
        case 'news_story':
          // News synthesis via Goose agent with Qwen3
          model = 'qwen3-32b';
          break;
        case 'large_context':
          // Re-analysis with Gemini (1M context for combining reports)
          model = 'gemini-2-5-flash';
          sessionType = 'analysis';
          break;
        case 'deep_research':
        default:
          // Full web research with Perplexity
          model = 'sonar-deep-research';
          break;
      }
      
      console.log('[OpenClaw Research] Model selected:', model, 'for mode:', researchMode);
    }

    // Step 1: Create or use existing project
    let projectId = request.parentProjectId;
    if (!projectId && !request.parentSessionId) {
      // Create a new project for this research
      const projectResponse = await fetch(`${DASHBOARD_API_BASE}/api/research-lab/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `OpenClaw: ${request.query.substring(0, 50)}...`,
          description: `Research initiated via OpenClaw (${request.context?.channel || 'unknown'})`,
          color: 'blue',
          icon: 'search',
          tags: ['openclaw', request.context?.channel || 'api'],
        }),
      });

      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        projectId = projectData.project?.project_id;
        console.log('[OpenClaw Research] Created project:', projectId);
      }
    }

    // Step 2: Handle news story mode via Goose agent
    if (request.researchMode === 'news_story' && outputFormats.newsStory) {
      return await handleNewsStoryResearch(request, res, projectId);
    }

    // Step 3: Handle quick query mode via conversational-research (Qwen3, no web)
    if (request.researchMode === 'quick_query' || 
        (model === 'qwen3-32b' && !dataSources.webResearch)) {
      return await handleQuickQuery(request, res, projectId);
    }

    // Step 4: Create deep research session (Perplexity, O1, Claude, Gemini)
    const sessionPayload: Record<string, unknown> = {
      question: request.query,
      contextPreamble: request.contextPreamble, // Prior research context
      model,
      mode,
      skipClarification: true, // OpenClaw requests skip clarification
      parentSessionId: request.parentSessionId,
      sessionType,
      outputFormats: {
        academicReport: outputFormats.academicReport ?? true,
        executiveSummary: outputFormats.executiveSummary ?? false,
        podcastScript: outputFormats.podcastScript ?? false,
        presentationSlides: outputFormats.presentationSlides ?? false,
      },
      dataSources: {
        webResearch: dataSources.webResearch ?? true,
        knowledgeGraph: dataSources.knowledgeGraph ?? false,
        codeAnalysis: dataSources.codeAnalysis ?? false,
        customMCP: dataSources.customMCP ?? false,
      },
    };

    const sessionResponse = await fetch(`${DASHBOARD_API_BASE}/api/research-lab/session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionPayload),
    });

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Session creation failed: ${sessionResponse.status}`);
    }

    const sessionData = await sessionResponse.json();
    const sessionId = sessionData.sessionId;

    console.log('[OpenClaw Research] Session created:', sessionId, {
      status: sessionData.status,
      mode,
    });

    // Register webhook if onComplete is configured (for async mode)
    if (request.onComplete && mode === 'async') {
      await registerWebhook(sessionId, request.query, {
        webhook: request.onComplete.webhook,
        notifyChannel: request.onComplete.notifyChannel,
        includeReport: request.onComplete.includeReport,
      });
    }

    // Step 3: If analyzer job is requested and mode is synchronous, run analysis
    let analysis = null;
    if (request.analyzerJob?.enabled && mode === 'synchronous' && sessionData.report) {
      console.log('[OpenClaw Research] Running analyzer job...');
      
      // Fetch analysis for the session
      const analysisResponse = await fetch(
        `${DASHBOARD_API_BASE}/api/research-lab/session/${sessionId}/analysis`,
        { method: 'GET' }
      );

      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        analysis = analysisData.analysis;
      }
    }

    // Build response
    const response: OpenClawResearchResponse = {
      success: true,
      sessionId,
      projectId,
      status: mode === 'synchronous' ? 'completed' : 'processing',
      timestamp: new Date().toISOString(),
    };

    if (sessionData.report) {
      response.report = sessionData.report;
    }

    if (analysis) {
      response.analysis = analysis;
    }

    // Include polling info for async mode
    if (mode === 'async') {
      console.log('[OpenClaw Research] Async session started. Poll status at:', 
        `/api/research-lab/session/${sessionId}/status`);
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('[OpenClaw Research] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle quick query mode via conversational-research API
 * Uses Qwen3-32B locally (free, 32K context, no web search)
 */
async function handleQuickQuery(
  request: OpenClawResearchRequest,
  res: NextApiResponse<OpenClawResearchResponse>,
  projectId: string | undefined
): Promise<void> {
  console.log('[OpenClaw Research] Quick query mode via Qwen3-32B');

  const response = await fetch(`${DASHBOARD_API_BASE}/api/research-lab/conversational-research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: request.query,
      sessionId: undefined,
      parentSessionId: request.parentSessionId,
      model: 'qwen3-32b',
      webSearch: false, // Quick queries don't use web search
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    res.status(response.status).json({
      success: false,
      error: errorData.error || `Quick query failed: ${response.status}`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const data = await response.json();

  res.status(200).json({
    success: true,
    sessionId: data.sessionId,
    projectId,
    status: 'completed',
    report: data.response,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle news story mode via Goose agent
 * Uses Brave News API → Firecrawl → Qwen3-32B synthesis
 */
async function handleNewsStoryResearch(
  request: OpenClawResearchRequest,
  res: NextApiResponse<OpenClawResearchResponse>,
  projectId: string | undefined
): Promise<void> {
  console.log('[OpenClaw Research] News story mode via Goose agent');

  // Determine news category from query or default to technology
  const categoryKeywords: Record<string, string[]> = {
    science: ['science', 'research', 'study', 'discovery', 'physics', 'biology', 'chemistry'],
    business: ['business', 'market', 'stock', 'economy', 'finance', 'company', 'startup'],
    politics: ['politics', 'government', 'election', 'policy', 'congress', 'senate'],
    healthcare: ['health', 'medical', 'hospital', 'disease', 'treatment', 'drug', 'vaccine'],
    technology: ['tech', 'ai', 'software', 'hardware', 'computer', 'digital', 'cyber'],
  };

  let category = 'technology';
  const queryLower = request.query.toLowerCase();
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => queryLower.includes(kw))) {
      category = cat;
      break;
    }
  }

  const response = await fetch(`${DASHBOARD_API_BASE}/api/research-lab/news-deep-research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: request.query,
      category,
      freshness: request.researchSettings?.sourceRecency === 'past_day' ? '24h' 
        : request.researchSettings?.sourceRecency === 'past_week' ? 'week' : 'month',
      articleCount: 5,
      audienceLevel: request.researchSettings?.targetAudience || 'general',
      generateAudio: false,
      saveToDatabase: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    res.status(response.status).json({
      success: false,
      error: errorData.error || `News story generation failed: ${response.status}`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const data = await response.json();

  res.status(200).json({
    success: true,
    sessionId: data.research?.story_id ? `news-${data.research.story_id}` : undefined,
    projectId,
    status: 'completed',
    report: data.research?.narrative,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle research plan orchestration
 * Executes multiple sub-topics with per-topic settings, then optionally synthesizes
 */
async function handleResearchPlan(
  request: OpenClawResearchRequest,
  res: NextApiResponse<ResearchPlanResponse>
): Promise<void> {
  const plan = request.researchPlan!;
  const planId = `plan-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  console.log('[OpenClaw Research Plan] Starting orchestration:', {
    mainQuery: request.query.substring(0, 50),
    subTopics: plan.subTopics.length,
    synthesize: plan.synthesize,
    parallel: plan.parallelExecution !== false,
  });

  // Step 1: Create project for this research plan
  let projectId: string | undefined;
  try {
    const projectResponse = await fetch(`${DASHBOARD_API_BASE}/api/research-lab/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Research Plan: ${request.query.substring(0, 40)}...`,
        description: `Multi-topic research plan with ${plan.subTopics.length} sub-topics. Initiated via OpenClaw.`,
        color: 'purple',
        icon: 'layers',
        tags: ['openclaw', 'research-plan', request.context?.channel || 'api'],
      }),
    });

    if (projectResponse.ok) {
      const projectData = await projectResponse.json();
      projectId = projectData.project?.project_id;
      console.log('[OpenClaw Research Plan] Created project:', projectId);
    }
  } catch (err) {
    console.error('[OpenClaw Research Plan] Failed to create project:', err);
  }

  // Step 2: Execute sub-topics
  const subTopicResults: ResearchPlanResponse['subTopicResults'] = [];
  const completedReports: Array<{ topic: string; report: string; outputFormat: string }> = [];
  
  const executeSubTopic = async (subTopic: SubTopic, index: number) => {
    const outputFormat = subTopic.outputFormat || 'academicReport';
    const outputFormats: OutputFormats = { [outputFormat]: true };
    
    // Determine model based on depth
    let model = subTopic.model || request.model;
    if (!model) {
      switch (subTopic.depth) {
        case 'shallow':
          model = 'sonar-pro';
          break;
        case 'deep':
          model = 'sonar-deep-research';
          break;
        default:
          model = 'sonar-deep-research';
      }
    }

    // Build context preamble with main query context and specific instructions
    let contextPreamble = `This research is part of a larger study on: "${request.query}"\n\n`;
    if (subTopic.instructions) {
      contextPreamble += `Specific instructions for this sub-topic:\n${subTopic.instructions}\n\n`;
    }
    contextPreamble += `Focus area: ${subTopic.topic}`;

    try {
      console.log(`[OpenClaw Research Plan] Executing sub-topic ${index + 1}/${plan.subTopics.length}: "${subTopic.topic}"`);
      
      const sessionResponse = await fetch(`${DASHBOARD_API_BASE}/api/research-lab/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: subTopic.topic,
          contextPreamble,
          model,
          mode: 'synchronous', // Wait for each sub-topic to complete
          skipClarification: true,
          sessionType: 'follow_up',
          outputFormats,
          dataSources: subTopic.dataSources || request.dataSources || { webResearch: true },
        }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}));
        subTopicResults.push({
          topic: subTopic.topic,
          sessionId: '',
          status: 'failed',
          outputFormat,
          error: errorData.error || `Failed: ${sessionResponse.status}`,
        });
        return;
      }

      const sessionData = await sessionResponse.json();
      
      subTopicResults.push({
        topic: subTopic.topic,
        sessionId: sessionData.sessionId,
        status: sessionData.report ? 'completed' : 'processing',
        outputFormat,
      });

      if (sessionData.report) {
        completedReports.push({
          topic: subTopic.topic,
          report: sessionData.report,
          outputFormat,
        });
      }

      console.log(`[OpenClaw Research Plan] Sub-topic completed: "${subTopic.topic}" (${sessionData.sessionId})`);
      
    } catch (err) {
      console.error(`[OpenClaw Research Plan] Sub-topic failed: "${subTopic.topic}"`, err);
      subTopicResults.push({
        topic: subTopic.topic,
        sessionId: '',
        status: 'failed',
        outputFormat,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  // Execute sub-topics (parallel or sequential)
  if (plan.parallelExecution !== false) {
    const maxConcurrent = plan.maxConcurrent || 3;
    // Execute in batches
    for (let i = 0; i < plan.subTopics.length; i += maxConcurrent) {
      const batch = plan.subTopics.slice(i, i + maxConcurrent);
      await Promise.all(batch.map((st, idx) => executeSubTopic(st, i + idx)));
    }
  } else {
    // Sequential execution
    for (let i = 0; i < plan.subTopics.length; i++) {
      await executeSubTopic(plan.subTopics[i], i);
    }
  }

  // Step 3: Synthesize if requested
  let synthesisSessionId: string | undefined;
  let synthesizedReport: string | undefined;

  if (plan.synthesize && completedReports.length > 0) {
    console.log('[OpenClaw Research Plan] Synthesizing', completedReports.length, 'reports...');
    
    const synthesisModel = plan.synthesisModel || 'gemini-2-5-flash'; // Large context for combining
    const finalFormat = plan.finalOutputFormat || 'academicReport';
    
    // Build synthesis prompt with all sub-reports
    const synthesisContext = completedReports.map((r, i) => 
      `## Sub-Topic ${i + 1}: ${r.topic}\n\n${r.report}`
    ).join('\n\n---\n\n');

    const synthesisPrompt = `Synthesize the following ${completedReports.length} research reports into a comprehensive, unified ${finalFormat} on the main topic: "${request.query}"

The synthesis should:
1. Integrate key findings from all sub-topics
2. Identify connections and themes across sub-topics
3. Provide a cohesive narrative structure
4. Include proper citations from the original reports
5. Highlight any contradictions or gaps between sub-topics

---

${synthesisContext}`;

    try {
      const synthesisResponse = await fetch(`${DASHBOARD_API_BASE}/api/research-lab/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Synthesis: ${request.query}`,
          contextPreamble: synthesisPrompt,
          model: synthesisModel,
          mode: 'synchronous',
          skipClarification: true,
          sessionType: 'analysis',
          outputFormats: { [finalFormat]: true },
          dataSources: { webResearch: false }, // Synthesis doesn't need web search
        }),
      });

      if (synthesisResponse.ok) {
        const synthesisData = await synthesisResponse.json();
        synthesisSessionId = synthesisData.sessionId;
        synthesizedReport = synthesisData.report;
        console.log('[OpenClaw Research Plan] Synthesis completed:', synthesisSessionId);
      }
    } catch (err) {
      console.error('[OpenClaw Research Plan] Synthesis failed:', err);
    }
  }

  // Build response
  const successCount = subTopicResults.filter(r => r.status === 'completed').length;
  const failedCount = subTopicResults.filter(r => r.status === 'failed').length;
  
  let status: ResearchPlanResponse['status'] = 'completed';
  if (failedCount === subTopicResults.length) {
    status = 'failed';
  } else if (failedCount > 0) {
    status = 'partial';
  }

  console.log(`[OpenClaw Research Plan] Complete: ${successCount}/${subTopicResults.length} succeeded`);

  res.status(200).json({
    success: status !== 'failed',
    projectId,
    planId,
    status,
    subTopicResults,
    synthesisSessionId,
    synthesizedReport,
    timestamp: new Date().toISOString(),
  });
}
