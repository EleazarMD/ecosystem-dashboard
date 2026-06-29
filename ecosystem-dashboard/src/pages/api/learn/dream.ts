/**
 * Dream API — Phase 8 Kids Dreaming.
 *
 * GET  /api/learn/dream?childId=...  → retrieve latest dream insights + digest
 * POST /api/learn/dream               → trigger consolidation for a child
 *
 * The dream cycle:
 * 1. Collects analytics snapshots + patterns for the child
 * 2. Runs DreamEngine.consolidate() to extract insights
 * 3. Generates a parent-readable digest
 * 4. Returns insights + digest + recommended focus skills for the planner
 *
 * Acceptance: after a session day, the next plan is informed by consolidated
 * insight and the parent receives a digest.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getDreamEngine } from '@/domains/learning/analytics/dream-engine';
import { getDreamConsolidator } from '@/domains/learning/processes/dream-consolidator';
import { getAnalyticsCollector } from '@/domains/learning/analytics/analytics-collector';
import { getPatternDetector } from '@/domains/learning/analytics/pattern-detector';
import type { DreamInsight } from '@/domains/learning/analytics/analytics-types';

interface DreamResponse {
  insights: DreamInsight[];
  digest: string;
  dreamCount: number;
  recommendedFocusSkills: string[];
}

/**
 * Generate a parent-readable digest from dream insights.
 */
function buildParentDigest(
  childName: string,
  insights: DreamInsight[],
  dreamCount: number,
): string {
  if (insights.length === 0) {
    return `No new insights for ${childName} yet. The dreaming engine needs at least 3 sessions of data to start consolidating patterns.`;
  }

  const lines: string[] = [];
  lines.push(`🌙 Dream Report #${dreamCount} for ${childName}`);
  lines.push('');

  const actionable = insights.filter((i) => i.actionable);
  const informational = insights.filter((i) => !i.actionable);

  if (informational.length > 0) {
    lines.push('📊 Progress Summary:');
    for (const insight of informational) {
      lines.push(`  • ${insight.insight}`);
    }
    lines.push('');
  }

  if (actionable.length > 0) {
    lines.push('💡 Recommendations:');
    for (const insight of actionable) {
      lines.push(`  • ${insight.insight}`);
      for (const action of insight.suggestedActions) {
        lines.push(`    → ${action}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Extract skill codes from dream insights for planner steering.
 * Scans insight text for known skill patterns and surfaces skills
 * from struggle/breakthrough patterns.
 */
function extractFocusSkills(insights: DreamInsight[]): string[] {
  const skills = new Set<string>();
  const skillPattern = /([a-z_]+\.[a-z_]+)/g;

  for (const insight of insights) {
    if (!insight.actionable) continue;
    const matches = insight.insight.match(skillPattern);
    if (matches) {
      for (const match of matches) {
        skills.add(match);
      }
    }
  }

  return Array.from(skills).slice(0, 5);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const accountType = (session.user as { accountType?: string }).accountType;
  if (accountType === 'child') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    const childId = (req.query.childId as string || '').trim();
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const dreamEngine = getDreamEngine();
    const insights = dreamEngine.getInsights(childId, 10);
    const dreamCount = dreamEngine.getDreamCount(childId);

    // Get child name from query param if available
    const childName = (req.query.childName as string) || 'your child';
    const digest = buildParentDigest(childName, insights, dreamCount);
    const recommendedFocusSkills = extractFocusSkills(insights);

    const response: DreamResponse = {
      insights,
      digest,
      dreamCount,
      recommendedFocusSkills,
    };

    return res.status(200).json(response);
  }

  if (req.method === 'POST') {
    const { childId, childName } = req.body;

    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    // Trigger consolidation
    const consolidator = getDreamConsolidator();
    await consolidator.consolidate(childId);

    // Return the latest results
    const dreamEngine = getDreamEngine();
    const insights = dreamEngine.getInsights(childId, 10);
    const dreamCount = dreamEngine.getDreamCount(childId);
    const digest = buildParentDigest(childName || 'your child', insights, dreamCount);
    const recommendedFocusSkills = extractFocusSkills(insights);

    const response: DreamResponse = {
      insights,
      digest,
      dreamCount,
      recommendedFocusSkills,
    };

    return res.status(200).json(response);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
