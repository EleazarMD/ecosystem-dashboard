/**
 * OpenClaw Research Analyzer API
 * 
 * Triggers analysis on completed research sessions:
 * - Topic extraction with depth/coverage ratings
 * - Gap identification (weak research areas)
 * - Follow-up query suggestions
 * - Overall assessment with strengths/weaknesses
 * 
 * Model Selection Strategy (matching Deep Research Studio):
 * - Routine first-pass analysis: Qwen3-32B (fast, free, 32K context / ~20K chars)
 * - Re-analysis with gathered research: Gemini 2.5 Flash (1M context / ~500K chars)
 * 
 * Can also trigger follow-up research on identified gaps using:
 * - Perplexity sonar-deep-research for web research
 * - Qwen3-32B for quick follow-up questions (no web)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const DASHBOARD_API_BASE = process.env.DASHBOARD_API_BASE || 'http://localhost:8404';
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'openclaw-gateway-2024-key';

// Context window limits for model selection
const QWEN3_MAX_CHARS = 20000;   // ~5K tokens, safe for 32K context
const GEMINI_MAX_CHARS = 500000; // ~125K tokens, safe for 1M context

interface AnalyzeRequest {
  sessionId: string;
  
  // Analysis options
  analysisModel?: string; // Default: qwen3-32b
  includeReportContext?: boolean;
  forceRefresh?: boolean; // Force re-analysis even if cached
  
  // Auto follow-up on gaps
  autoFollowUp?: {
    enabled: boolean;
    maxFollowUps?: number;
    targetGapTopics?: string[];
    followUpModel?: string;
  };
  
  // Context
  context?: {
    channel: string;
    session_id?: string;
  };
}

interface AnalysisTopic {
  id: string;
  name: string;
  summary: string;
  depth: 'shallow' | 'moderate' | 'deep';
  coverage_pct: number;
  key_findings: string[];
  suggested_followup: string;
}

interface AnalysisGap {
  topic: string;
  reason: string;
  suggested_query: string;
}

interface AnalysisResult {
  topics: AnalysisTopic[];
  gaps: AnalysisGap[];
  overall_assessment: {
    strengths: string[];
    weaknesses: string[];
    recommended_next_steps: string[];
  };
}

interface AnalyzeResponse {
  success: boolean;
  sessionId: string;
  analysis?: AnalysisResult;
  followUpSessions?: string[];
  error?: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalyzeResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      sessionId: '',
      error: 'Method not allowed',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const request: AnalyzeRequest = req.body;

    if (!request.sessionId) {
      return res.status(400).json({
        success: false,
        sessionId: '',
        error: 'sessionId is required',
        timestamp: new Date().toISOString(),
      });
    }

    console.log('[OpenClaw Analyze] Request:', {
      sessionId: request.sessionId,
      analysisModel: request.analysisModel,
      autoFollowUp: request.autoFollowUp?.enabled,
      channel: request.context?.channel,
    });

    // Step 1: Get the research session and its report
    const sessionResponse = await fetch(
      `${DASHBOARD_API_BASE}/api/research-lab/session/${request.sessionId}/result`,
      { method: 'GET' }
    );

    if (!sessionResponse.ok) {
      throw new Error(`Session not found: ${request.sessionId}`);
    }

    const sessionData = await sessionResponse.json();
    
    if (!sessionData.report) {
      throw new Error('Session has no completed report to analyze');
    }

    // Step 2: Check if analysis already exists (unless forceRefresh)
    let analysis: AnalysisResult | null = null;

    if (!request.forceRefresh) {
      const existingAnalysisResponse = await fetch(
        `${DASHBOARD_API_BASE}/api/research-lab/session/${request.sessionId}/analysis`,
        { method: 'GET' }
      );

      if (existingAnalysisResponse.ok) {
        const existingData = await existingAnalysisResponse.json();
        // Only use cached analysis if it has valid topics (not a failed analysis)
        if (existingData.analysis && existingData.analysis.topics?.length > 0) {
          console.log('[OpenClaw Analyze] Using existing analysis');
          analysis = existingData.analysis;
        }
      }
    }

    // Step 3: Generate new analysis if needed
    if (!analysis) {
      // Select model based on report size (matching Deep Research Studio logic)
      // - Small reports (<20K chars): Qwen3-32B (fast, free)
      // - Large reports (>20K chars): Gemini 2.5 Flash (1M context)
      const reportLength = sessionData.report.length;
      const needsLargeContext = reportLength > QWEN3_MAX_CHARS;
      const analysisModel = request.analysisModel || (needsLargeContext ? 'gemini-2-5-flash' : 'qwen3-32b');
      
      console.log('[OpenClaw Analyze] Generating new analysis with AI...', {
        reportLength,
        needsLargeContext,
        model: analysisModel,
      });
      
      analysis = await generateAnalysis(sessionData.report, sessionData.question, analysisModel);

      // Save analysis to session
      await fetch(
        `${DASHBOARD_API_BASE}/api/research-lab/session/${request.sessionId}/analysis`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysis }),
        }
      );

      console.log('[OpenClaw Analyze] Analysis saved:', {
        topics: analysis.topics.length,
        gaps: analysis.gaps.length,
      });
    }

    // Step 4: Auto follow-up on gaps if requested
    const followUpSessions: string[] = [];
    
    if (request.autoFollowUp?.enabled && analysis.gaps.length > 0) {
      const maxFollowUps = request.autoFollowUp.maxFollowUps || 3;
      const targetGaps = request.autoFollowUp.targetGapTopics 
        ? analysis.gaps.filter(g => request.autoFollowUp!.targetGapTopics!.includes(g.topic))
        : analysis.gaps.slice(0, maxFollowUps);

      console.log('[OpenClaw Analyze] Starting follow-up research for', targetGaps.length, 'gaps');

      for (const gap of targetGaps) {
        try {
          const followUpResponse = await fetch(`${DASHBOARD_API_BASE}/api/openclaw/research`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: gap.suggested_query,
              model: request.autoFollowUp.followUpModel || 'sonar-deep-research',
              parentSessionId: request.sessionId,
              sessionType: 'follow_up',
              mode: 'async',
              context: request.context,
            }),
          });

          if (followUpResponse.ok) {
            const followUpData = await followUpResponse.json();
            if (followUpData.sessionId) {
              followUpSessions.push(followUpData.sessionId);
              console.log('[OpenClaw Analyze] Follow-up started:', followUpData.sessionId, 'for gap:', gap.topic);
            }
          }
        } catch (err) {
          console.error('[OpenClaw Analyze] Follow-up failed for gap:', gap.topic, err);
        }
      }
    }

    return res.status(200).json({
      success: true,
      sessionId: request.sessionId,
      analysis,
      followUpSessions: followUpSessions.length > 0 ? followUpSessions : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[OpenClaw Analyze] Error:', error);
    return res.status(500).json({
      success: false,
      sessionId: req.body?.sessionId || '',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Generate analysis using AI model
 * - Qwen3-32B: Fast, free, 32K context (~20K chars)
 * - Gemini 2.5 Flash: Large context (1M tokens, ~500K chars)
 */
async function generateAnalysis(
  report: string,
  question: string,
  model: string
): Promise<AnalysisResult> {
  const systemPrompt = `You are a research analysis expert. Analyze the provided research report and extract:

1. **Topics**: Identify main topics covered, rate their depth (shallow/moderate/deep), estimate coverage percentage, and suggest follow-up queries for each.

2. **Gaps**: Identify areas that are weakly covered or missing entirely. For each gap, explain why it's a gap and suggest a specific research query to fill it.

3. **Overall Assessment**: Provide strengths, weaknesses, and recommended next steps.

Return your analysis as valid JSON matching this structure:
{
  "topics": [
    {
      "id": "topic_1",
      "name": "Topic Name",
      "summary": "Brief summary of coverage",
      "depth": "shallow|moderate|deep",
      "coverage_pct": 75,
      "key_findings": ["finding 1", "finding 2"],
      "suggested_followup": "Specific follow-up query"
    }
  ],
  "gaps": [
    {
      "topic": "Missing Topic",
      "reason": "Why this is a gap",
      "suggested_query": "Research query to fill this gap"
    }
  ],
  "overall_assessment": {
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "recommended_next_steps": ["step 1", "step 2"]
  }
}`;

  // Truncate report based on model context limits
  const isGemini = model.includes('gemini');
  const maxChars = isGemini ? GEMINI_MAX_CHARS : QWEN3_MAX_CHARS;
  const truncatedReport = report.length > maxChars 
    ? report.substring(0, maxChars) + '\n\n[Report truncated for analysis...]'
    : report;

  const userPrompt = `Original Research Question: ${question}

Research Report:
${truncatedReport}

Analyze this report and provide structured JSON output.`;

  try {
    let response: Response;
    let content: string;

    if (isGemini) {
      // Use Gemini native API format via AI Gateway
      const geminiBody = {
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.3,
        },
      };

      response = await fetch(`${AI_GATEWAY_URL}/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'openclaw-analyzer',
        },
        body: JSON.stringify(geminiBody),
      });

      if (!response.ok) {
        throw new Error(`AI Gateway Gemini error: ${response.status}`);
      }

      const geminiData = await response.json();
      content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      // Use OpenAI-compatible format for Qwen3
      response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const data = await response.json();
      content = data.choices?.[0]?.message?.content || '';
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in AI response');
    }

    const analysis = JSON.parse(jsonMatch[0]) as AnalysisResult;

    // Validate structure
    if (!analysis.topics || !analysis.gaps || !analysis.overall_assessment) {
      throw new Error('Invalid analysis structure');
    }

    // Add IDs to topics if missing
    analysis.topics = analysis.topics.map((t, i) => ({
      ...t,
      id: t.id || `topic_${i + 1}`,
    }));

    return analysis;

  } catch (error) {
    console.error('[OpenClaw Analyze] AI analysis failed:', error);
    
    // Return minimal analysis on failure
    return {
      topics: [],
      gaps: [{
        topic: 'Analysis Failed',
        reason: error instanceof Error ? error.message : 'Unknown error',
        suggested_query: question,
      }],
      overall_assessment: {
        strengths: [],
        weaknesses: ['Analysis could not be completed'],
        recommended_next_steps: ['Retry analysis with different model'],
      },
    };
  }
}
