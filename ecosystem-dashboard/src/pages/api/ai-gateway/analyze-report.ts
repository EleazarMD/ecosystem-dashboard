import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Analyze a research report via AI Gateway.
 * - Routine analysis: Qwen3 32B (fast, free, 32K context)
 * - Deep re-analysis with gathered research: Gemini 2.5 Flash (1M context)
 * Returns structured JSON: topics, gaps, overall assessment.
 */

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

const ANALYSIS_SYSTEM_PROMPT = `You are a research report analyst. Given a research report, analyze it and return a structured JSON object with the following schema. Return ONLY valid JSON, no markdown fences, no explanation.

{
  "topics": [
    {
      "id": "t1",
      "name": "Topic Name",
      "summary": "2-3 sentence summary of what was covered",
      "headings": ["H2/H3 headings from report relevant to this topic"],
      "depth": "shallow" | "moderate" | "deep",
      "coverage_pct": 15,
      "key_findings": ["finding 1", "finding 2"],
      "suggested_followup": "A specific follow-up research query to go deeper on this topic"
    }
  ],
  "gaps": [
    {
      "topic": "Missing Topic Name",
      "reason": "Why this should have been covered given the research question",
      "suggested_query": "Specific research query to fill this gap"
    }
  ],
  "overall_assessment": {
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "recommended_next_steps": ["step 1", "step 2"]
  }
}

Rules:
- depth: "shallow" = briefly mentioned (<5% of report), "moderate" = covered but not exhaustively (5-15%), "deep" = thorough treatment (>15%)
- coverage_pct: estimated percentage of the report dedicated to this topic (all topics should sum to ~100)
- Extract 4-12 topics depending on report length
- Identify 1-5 gaps (topics that SHOULD have been covered but weren't, or were too shallow)
- suggested_followup should be specific enough to use as a Perplexity deep research query
- Be critical and honest in the assessment`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { report: rawReport, question, useGemini } = req.body;

  if (!rawReport || typeof rawReport !== 'string') {
    return res.status(400).json({ error: 'report (string) is required' });
  }

  // Model selection: Gemini Flash for deep re-analysis (large context), Qwen3 for routine
  const model = useGemini ? 'gemini-2-5-flash' : 'qwen3-32b';
  const MAX_REPORT_CHARS = useGemini ? 500000 : 20000; // ~125K tokens for Gemini, ~5K for Qwen3
  const timeoutMs = useGemini ? 180000 : 120000; // 3 min for Gemini, 2 min for Qwen3

  const report = rawReport.length > MAX_REPORT_CHARS 
    ? rawReport.substring(0, MAX_REPORT_CHARS) + '\n\n[... report truncated for analysis ...]'
    : rawReport;

  try {
    console.log(`[Analyze Report] Sending to ${model}, report length: ${report.length} (original: ${rawReport.length})`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const userPrompt = `Research Question: ${question || 'Not provided'}\n\n--- REPORT START ---\n${report}\n--- REPORT END ---\n\nAnalyze this report and return the structured JSON.`;

    let response: Response;
    let rawContent: string | undefined;

    if (useGemini) {
      // Native Google Gemini API format via AI Gateway
      const geminiBody = {
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: ANALYSIS_SYSTEM_PROMPT }] },
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.3,
        },
      };

      response = await fetch(`${AI_GATEWAY_URL}/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'dashboard-report-analyzer',
        },
        body: JSON.stringify(geminiBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Analyze Report] AI Gateway Gemini error:', response.status, errorText);
        return res.status(response.status).json({
          error: `AI Gateway error: ${response.status}`,
          detail: errorText,
        });
      }

      const geminiData = await response.json();
      rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawContent) {
        console.error('[Analyze Report] Unexpected Gemini response:', JSON.stringify(geminiData).substring(0, 500));
        return res.status(500).json({ error: `No content in ${model} response` });
      }
    } else {
      // OpenAI-compatible format for Qwen3
      const messages = [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ];

      response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
          'X-Source': 'dashboard-report-analyzer',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 4096,
          temperature: 0.3,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Analyze Report] AI Gateway error:', response.status, errorText);
        return res.status(response.status).json({
          error: `AI Gateway error: ${response.status}`,
          detail: errorText,
        });
      }

      const data = await response.json();
      rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent) {
        return res.status(500).json({ error: `No content in ${model} response` });
      }
    }

    // Parse the JSON response — handle markdown fences if present
    let cleaned = rawContent.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    // Qwen3/Gemini sometimes wraps in <think> tags — strip those
    const thinkMatch = cleaned.match(/<think>[\s\S]*?<\/think>\s*([\s\S]*)/);
    if (thinkMatch) {
      cleaned = thinkMatch[1].trim();
    }

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('[Analyze Report] Failed to parse JSON:', cleaned.substring(0, 200));
      return res.status(500).json({
        error: `Failed to parse ${model} analysis as JSON`,
        raw: cleaned.substring(0, 500),
      });
    }

    return res.status(200).json({
      analysis,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      model,
    });
  } catch (error: any) {
    console.error('[Analyze Report] Error:', error);
    const isTimeout = error.name === 'AbortError';
    const isConnection = error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed');

    return res.status(isTimeout ? 504 : isConnection ? 503 : 500).json({
      error: isTimeout
        ? `Request timed out — ${model} took too long to respond`
        : isConnection
        ? 'AI Gateway not reachable — is the service running?'
        : `Analysis failed: ${error.message}`,
    });
  }
}
