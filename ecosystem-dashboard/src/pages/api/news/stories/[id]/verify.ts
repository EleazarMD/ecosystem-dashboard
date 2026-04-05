/**
 * News Story Fact Verification Endpoint
 * POST /api/news/stories/[id]/verify
 * 
 * Verifies facts, citations, and claims in a news story using LLM analysis.
 * Updates the story's verification_status field.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const GEMINI_API_KEY = process.env.NEWS_PIPELINE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

function getNewsPool() {
  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'ecosystem_unified',
    user: process.env.POSTGRES_USER || 'eleazar',
    password: process.env.POSTGRES_PASSWORD || '',
  });
}

interface VerificationResult {
  overall_status: 'verified' | 'partially_verified' | 'unverified' | 'flagged';
  confidence_score: number;
  citations_verified: number;
  citations_total: number;
  claims_analyzed: ClaimAnalysis[];
  issues: VerificationIssue[];
  recommendations: string[];
}

interface ClaimAnalysis {
  claim: string;
  status: 'verified' | 'unverified' | 'uncertain' | 'flagged';
  source_support: string;
  confidence: number;
}

interface VerificationIssue {
  type: 'factual_error' | 'unsupported_claim' | 'citation_missing' | 'outdated_info' | 'bias_detected';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Story ID is required' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const newsPool = getNewsPool();

  try {
    // Fetch the story with citations
    const storyResult = await newsPool.query(
      `SELECT id, title, headline, summary, full_narrative, citations, research_package, category
       FROM news.daily_stories WHERE id = $1`,
      [id]
    );

    if (storyResult.rows.length === 0) {
      await newsPool.end();
      return res.status(404).json({ error: 'Story not found' });
    }

    const story = storyResult.rows[0];

    console.log(`🔍 Verifying story: ${story.headline || story.title}`);

    // Step 1: Verify citations are reachable
    const citationResults = await verifyCitations(story.citations || []);

    // Step 2: Analyze claims using LLM
    const claimAnalysis = await analyzeClaimsWithLLM(story);

    // Step 3: Calculate overall verification status
    const verificationResult = calculateVerificationResult(citationResults, claimAnalysis);

    // Update story verification status
    await newsPool.query(
      `UPDATE news.daily_stories 
       SET verification_status = $1, 
           verification_result = $2,
           verified_at = NOW()
       WHERE id = $3`,
      [verificationResult.overall_status, JSON.stringify(verificationResult), id]
    );

    await newsPool.end();

    console.log(`✅ Verification complete: ${verificationResult.overall_status} (${verificationResult.confidence_score}%)`);

    return res.status(200).json({
      success: true,
      storyId: id,
      verification: verificationResult,
    });

  } catch (error) {
    console.error('❌ Verification error:', error);
    await newsPool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function verifyCitations(citations: any[]): Promise<{ verified: number; total: number; results: any[] }> {
  if (!citations || citations.length === 0) {
    return { verified: 0, total: 0, results: [] };
  }

  const results = [];
  let verified = 0;

  for (const citation of citations) {
    if (!citation.url) {
      results.push({ ...citation, reachable: false, reason: 'no_url' });
      continue;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(citation.url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'AIHomelab-FactChecker/1.0' },
      });

      clearTimeout(timeout);

      const reachable = response.ok || response.status === 403 || response.status === 405;
      if (reachable) verified++;

      results.push({
        ...citation,
        reachable,
        httpStatus: response.status,
      });
    } catch (error: any) {
      results.push({
        ...citation,
        reachable: false,
        reason: error.name === 'AbortError' ? 'timeout' : error.message,
      });
    }
  }

  return { verified, total: citations.length, results };
}

async function analyzeClaimsWithLLM(story: any): Promise<ClaimAnalysis[]> {
  const prompt = `Analyze the following news article for factual accuracy and identify key claims.

HEADLINE: ${story.headline || story.title}

SUMMARY: ${story.summary || ''}

FULL ARTICLE:
${story.full_narrative || ''}

CITED SOURCES:
${JSON.stringify(story.citations || [], null, 2)}

Please analyze this article and identify:
1. Key factual claims made in the article
2. Whether each claim is supported by the cited sources
3. Any potential factual errors or unsupported claims
4. Any signs of bias or misleading information

Respond in JSON format:
{
  "claims": [
    {
      "claim": "The specific claim made",
      "status": "verified|unverified|uncertain|flagged",
      "source_support": "Which citation supports this, or why it's unsupported",
      "confidence": 0.0-1.0
    }
  ],
  "issues": [
    {
      "type": "factual_error|unsupported_claim|citation_missing|outdated_info|bias_detected",
      "severity": "low|medium|high",
      "description": "Description of the issue",
      "location": "Where in the article"
    }
  ],
  "recommendations": ["List of recommendations to improve accuracy"]
}`;

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('LLM analysis failed:', await response.text());
      return [];
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.claims || [];
    }

    return [];
  } catch (error) {
    console.error('Error analyzing claims:', error);
    return [];
  }
}

function calculateVerificationResult(
  citationResults: { verified: number; total: number; results: any[] },
  claimAnalysis: ClaimAnalysis[]
): VerificationResult {
  // Calculate citation verification rate
  const citationRate = citationResults.total > 0 
    ? citationResults.verified / citationResults.total 
    : 1;

  // Calculate claim verification rate
  const verifiedClaims = claimAnalysis.filter(c => c.status === 'verified').length;
  const flaggedClaims = claimAnalysis.filter(c => c.status === 'flagged').length;
  const claimRate = claimAnalysis.length > 0 
    ? verifiedClaims / claimAnalysis.length 
    : 1;

  // Calculate overall confidence
  const confidence = Math.round((citationRate * 0.4 + claimRate * 0.6) * 100);

  // Determine overall status
  let overall_status: VerificationResult['overall_status'];
  if (flaggedClaims > 0) {
    overall_status = 'flagged';
  } else if (confidence >= 80) {
    overall_status = 'verified';
  } else if (confidence >= 50) {
    overall_status = 'partially_verified';
  } else {
    overall_status = 'unverified';
  }

  // Collect issues from claim analysis
  const issues: VerificationIssue[] = [];
  for (const claim of claimAnalysis) {
    if (claim.status === 'flagged' || claim.status === 'unverified') {
      issues.push({
        type: claim.status === 'flagged' ? 'factual_error' : 'unsupported_claim',
        severity: claim.status === 'flagged' ? 'high' : 'medium',
        description: `Claim: "${claim.claim}" - ${claim.source_support}`,
      });
    }
  }

  // Add citation issues
  for (const citation of citationResults.results) {
    if (!citation.reachable) {
      issues.push({
        type: 'citation_missing',
        severity: 'low',
        description: `Citation unreachable: ${citation.title || citation.url}`,
      });
    }
  }

  return {
    overall_status,
    confidence_score: confidence,
    citations_verified: citationResults.verified,
    citations_total: citationResults.total,
    claims_analyzed: claimAnalysis,
    issues,
    recommendations: generateRecommendations(issues),
  };
}

function generateRecommendations(issues: VerificationIssue[]): string[] {
  const recommendations: string[] = [];

  const hasFactualErrors = issues.some(i => i.type === 'factual_error');
  const hasUnsupportedClaims = issues.some(i => i.type === 'unsupported_claim');
  const hasMissingCitations = issues.some(i => i.type === 'citation_missing');

  if (hasFactualErrors) {
    recommendations.push('Review and correct flagged factual errors before publishing');
  }
  if (hasUnsupportedClaims) {
    recommendations.push('Add supporting citations for unsupported claims or remove them');
  }
  if (hasMissingCitations) {
    recommendations.push('Update or replace unreachable citation links');
  }
  if (issues.length === 0) {
    recommendations.push('Story passes verification checks');
  }

  return recommendations;
}
