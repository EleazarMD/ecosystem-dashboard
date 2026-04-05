import type { NextApiRequest, NextApiResponse } from 'next';
import { getResearchSession } from '@/lib/db/research-storage';
import { addResearchMaterial, getProjectById } from '@/lib/db/podcast-studio-db';

/**
 * Export a research session to Podcast Studio as source material.
 * Separates the main body from sources/references for clean podcast scripting.
 * 
 * POST body: { sessionId, projectId, title }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, projectId, title } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  try {
    // Verify podcast project exists
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Podcast project not found' });
    }

    // Fetch research session from database
    const session = await getResearchSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Research session not found' });
    }

    if (!session.report) {
      return res.status(400).json({ error: 'Research session has no report content' });
    }

    // Separate body from sources/references
    const { body, sources, citations } = separateBodyAndSources(session.report);

    // Count words in the body
    const wordCount = body.split(/\s+/).filter(Boolean).length;

    // Build content for podcast studio: body only (sources as metadata)
    const materialContent = body;

    // Build metadata with sources kept separate
    const metadata: Record<string, any> = {
      researchSessionId: sessionId,
      researchQuestion: session.question,
      model: session.model,
      exportedAt: new Date().toISOString(),
      actualCost: session.actual_cost,
      inputTokens: session.input_tokens,
      outputTokens: session.output_tokens,
    };

    if (sources.length > 0) {
      metadata.sources = sources;
    }
    if (citations) {
      metadata.citations = citations;
    }
    // Also store the DB citations if available
    if (session.citations) {
      metadata.sessionCitations = session.citations;
    }

    // Add as research material to the podcast project
    const material = await addResearchMaterial({
      project_id: projectId,
      title: title || `Research: ${session.question.substring(0, 80)}`,
      type: 'document',
      url: null as any,
      file_path: null as any,
      content: materialContent,
      content_hash: null as any,
      page_count: null as any,
      word_count: wordCount,
      is_selected: true,
      metadata,
    });

    console.log(`🎙️ Exported research session ${sessionId} to podcast project ${projectId} (${wordCount} words, ${sources.length} sources)`);

    return res.status(200).json({
      success: true,
      materialId: material.id,
      wordCount,
      sourcesCount: sources.length,
    });

  } catch (error) {
    console.error('❌ Export to podcast failed:', error);
    return res.status(500).json({
      error: 'Export failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Separate a research report into body text and source references.
 * Sources can appear as:
 * - A "# References" or "## References" section at the end
 * - A "# Sources" or "## Sources" section
 * - Inline citation markers like [1], [2], etc.
 * - Perplexity-style citation blocks
 */
function separateBodyAndSources(report: string): {
  body: string;
  sources: Array<{ index?: number; title?: string; url?: string; text: string }>;
  citations: string | null;
} {
  const sources: Array<{ index?: number; title?: string; url?: string; text: string }> = [];
  let body = report;
  let citationsSection: string | null = null;

  // Extract References/Sources section (typically at the end)
  const referencesPattern = /\n#{1,2}\s*(References|Sources|Bibliography|Citations)\s*\n([\s\S]*?)$/i;
  const referencesMatch = body.match(referencesPattern);

  if (referencesMatch) {
    citationsSection = referencesMatch[2].trim();
    body = body.replace(referencesMatch[0], '').trim();

    // Parse individual references
    const refLines = citationsSection.split('\n').filter(l => l.trim());
    for (const line of refLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Match numbered references: "1. Title - URL" or "[1] Title (URL)"
      const numberedMatch = trimmed.match(/^[\[\(]?(\d+)[\]\)]?\.?\s*(.*)/);
      if (numberedMatch) {
        const index = parseInt(numberedMatch[1]);
        const rest = numberedMatch[2];
        const urlMatch = rest.match(/(https?:\/\/[^\s\)]+)/);
        sources.push({
          index,
          title: rest.replace(urlMatch?.[0] || '', '').replace(/[:\-–—]\s*$/, '').trim() || undefined,
          url: urlMatch?.[1],
          text: trimmed,
        });
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // Bullet-point references
        const content = trimmed.substring(2);
        const urlMatch = content.match(/(https?:\/\/[^\s\)]+)/);
        sources.push({
          title: content.replace(urlMatch?.[0] || '', '').replace(/[:\-–—]\s*$/, '').trim() || undefined,
          url: urlMatch?.[1],
          text: trimmed,
        });
      } else {
        sources.push({ text: trimmed });
      }
    }
  }

  // Also extract Perplexity-style inline citations if no section was found
  if (sources.length === 0) {
    const inlineCitations = body.match(/\[(\d+)\]/g);
    if (inlineCitations) {
      const numSet = new Set(inlineCitations.map(c => parseInt(c.replace(/[\[\]]/g, ''))));
      const uniqueNums = Array.from(numSet);
      for (const num of uniqueNums.sort((a, b) => a - b)) {
        sources.push({ index: num, text: `[${num}]` });
      }
    }
  }

  return { body, sources, citations: citationsSection };
}
