import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../auth/[...nextauth]';
import { getLearningPhase1Service } from '@/domains/learning/features/attempt-grading';
import type { LearnAgeBand } from '@/domains/learning/shared/phase1-content';

interface PublicLearnContentItem {
  id: string;
  version: number;
  subject: 'math' | 'reading';
  skillCode: string;
  analyticalTags: string[];
  type: 'problem' | 'question';
  ageBand: LearnAgeBand;
  minGrade: string;
  maxGrade: string;
  difficulty: number;
  prompt: string;
  hintSet: string[];
  provenance: 'authored' | 'ai_generated';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const skillCode = asSingleQuery(req.query.skill);
    const ageBandRaw = asSingleQuery(req.query.ageBand);

    if (ageBandRaw && !isAgeBand(ageBandRaw)) {
      return res.status(400).json({ error: 'ageBand must be one of: early, middle, tween' });
    }

    const ageBand: LearnAgeBand | undefined = isAgeBand(ageBandRaw) ? ageBandRaw : undefined;

    const limitRaw = asSingleQuery(req.query.limit);
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 10;

    if (limitRaw && (!Number.isFinite(limit) || limit <= 0)) {
      return res.status(400).json({ error: 'limit must be a positive integer' });
    }

    const contentItems = await getLearningPhase1Service().listContent({
      skillCode: skillCode || undefined,
      ageBand,
      limit: Math.min(limit || 10, 25),
    });

    const publicItems: PublicLearnContentItem[] = contentItems.map((item) => ({
      id: item.id,
      version: item.version,
      subject: item.subject,
      skillCode: item.skillCode,
      analyticalTags: item.analyticalTags,
      type: item.type,
      ageBand: item.ageBand,
      minGrade: item.minGrade,
      maxGrade: item.maxGrade,
      difficulty: item.difficulty,
      prompt: item.prompt,
      hintSet: item.hintSet,
      provenance: item.provenance,
    }));

    return res.status(200).json({
      items: publicItems,
      count: publicItems.length,
      source: 'phase1_content_catalog',
    });
  } catch (error) {
    console.error('[api/learn/content] failed:', error);
    return res.status(500).json({ error: 'Failed to fetch learning content' });
  }
}

export function asSingleQuery(value: string | string[] | undefined): string {
  if (!value) {
    return '';
  }

  return Array.isArray(value) ? value[0] || '' : value;
}

export function isAgeBand(value: string): value is LearnAgeBand {
  if (value === 'early' || value === 'middle' || value === 'tween') {
    return true;
  }

  return false;
}
