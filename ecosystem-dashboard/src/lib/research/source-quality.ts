/**
 * Source Quality Scoring — rates research sources by authority, recency, and relevance.
 *
 * Provides a composite score (0-100) for each source based on:
 * - Domain authority (known high-quality domains)
 * - URL structure (academic patterns, government sites)
 * - Title relevance to the research query
 */

export interface SourceScore {
  url: string;
  title: string;
  authorityScore: number;   // 0-100
  relevanceScore: number;   // 0-100
  compositeScore: number;   // 0-100
  tier: 'excellent' | 'good' | 'fair' | 'low';
  badges: string[];          // e.g. ['Academic', 'Government', 'Peer-Reviewed']
}

// Domain authority tiers
const AUTHORITY_TIERS: Record<string, { score: number; badges: string[] }> = {
  // Tier 1: Academic & Government (90-100)
  'nature.com': { score: 98, badges: ['Academic', 'Peer-Reviewed'] },
  'science.org': { score: 98, badges: ['Academic', 'Peer-Reviewed'] },
  'thelancet.com': { score: 97, badges: ['Academic', 'Medical'] },
  'nejm.org': { score: 97, badges: ['Academic', 'Medical'] },
  'pubmed.gov': { score: 96, badges: ['Academic', 'Medical', 'Government'] },
  'ncbi.nlm.nih.gov': { score: 96, badges: ['Academic', 'Medical', 'Government'] },
  'nih.gov': { score: 95, badges: ['Government', 'Medical'] },
  'cdc.gov': { score: 95, badges: ['Government', 'Medical'] },
  'who.int': { score: 95, badges: ['International', 'Medical'] },
  'arxiv.org': { score: 94, badges: ['Academic', 'Preprint'] },
  'ieee.org': { score: 93, badges: ['Academic', 'Engineering'] },
  'acm.org': { score: 93, badges: ['Academic', 'Computing'] },
  'scholar.google.com': { score: 92, badges: ['Academic'] },
  'jstor.org': { score: 92, badges: ['Academic'] },
  'sec.gov': { score: 92, badges: ['Government', 'Financial'] },
  'gov.uk': { score: 91, badges: ['Government'] },
  'europa.eu': { score: 91, badges: ['Government', 'International'] },

  // Tier 2: Major news & reputable sources (75-89)
  'reuters.com': { score: 88, badges: ['News', 'Wire Service'] },
  'apnews.com': { score: 88, badges: ['News', 'Wire Service'] },
  'bbc.com': { score: 86, badges: ['News', 'International'] },
  'bbc.co.uk': { score: 86, badges: ['News', 'International'] },
  'nytimes.com': { score: 85, badges: ['News'] },
  'washingtonpost.com': { score: 84, badges: ['News'] },
  'theguardian.com': { score: 83, badges: ['News', 'International'] },
  'bloomberg.com': { score: 85, badges: ['News', 'Financial'] },
  'ft.com': { score: 85, badges: ['News', 'Financial'] },
  'wsj.com': { score: 84, badges: ['News', 'Financial'] },
  'economist.com': { score: 84, badges: ['News', 'Analysis'] },
  'statista.com': { score: 82, badges: ['Data', 'Statistics'] },
  'github.com': { score: 80, badges: ['Technical', 'Open Source'] },
  'stackoverflow.com': { score: 78, badges: ['Technical', 'Community'] },
  'docs.python.org': { score: 80, badges: ['Technical', 'Documentation'] },
  'developer.mozilla.org': { score: 80, badges: ['Technical', 'Documentation'] },
  'wikipedia.org': { score: 75, badges: ['Encyclopedia'] },

  // Tier 3: Industry & tech (60-74)
  'techcrunch.com': { score: 72, badges: ['Tech News'] },
  'wired.com': { score: 72, badges: ['Tech News'] },
  'arstechnica.com': { score: 73, badges: ['Tech News'] },
  'theverge.com': { score: 70, badges: ['Tech News'] },
  'hbr.org': { score: 78, badges: ['Business', 'Analysis'] },
  'mckinsey.com': { score: 77, badges: ['Business', 'Consulting'] },
  'forbes.com': { score: 68, badges: ['Business'] },
  'cnbc.com': { score: 70, badges: ['News', 'Financial'] },
};

// URL pattern bonuses
const URL_PATTERN_BONUSES: { pattern: RegExp; bonus: number; badge: string }[] = [
  { pattern: /\.edu\b/, bonus: 15, badge: 'Educational' },
  { pattern: /\.gov\b/, bonus: 15, badge: 'Government' },
  { pattern: /\.org\b/, bonus: 5, badge: '' },
  { pattern: /\/doi\.org\//, bonus: 10, badge: 'DOI' },
  { pattern: /\/papers\/|\/publications?\/|\/research\//, bonus: 8, badge: 'Research Paper' },
  { pattern: /\/journal\/|\/article\//, bonus: 8, badge: 'Journal Article' },
];

function getDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname;
  } catch {
    return '';
  }
}

function computeAuthorityScore(url: string): { score: number; badges: string[] } {
  const domain = getDomain(url);
  const badges: string[] = [];
  let score = 50; // default baseline

  // Check known domains
  for (const [knownDomain, info] of Object.entries(AUTHORITY_TIERS)) {
    if (domain === knownDomain || domain.endsWith('.' + knownDomain)) {
      score = info.score;
      badges.push(...info.badges);
      break;
    }
  }

  // Apply URL pattern bonuses
  for (const { pattern, bonus, badge } of URL_PATTERN_BONUSES) {
    if (pattern.test(url)) {
      score = Math.min(100, score + bonus);
      if (badge && !badges.includes(badge)) badges.push(badge);
    }
  }

  return { score: Math.min(100, score), badges };
}

function computeRelevanceScore(title: string, query: string): number {
  if (!query || !title) return 50;

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const titleLower = title.toLowerCase();

  if (queryWords.length === 0) return 50;

  const matches = queryWords.filter(w => titleLower.includes(w)).length;
  const ratio = matches / queryWords.length;

  return Math.round(30 + ratio * 70); // 30-100 range
}

function getTier(score: number): 'excellent' | 'good' | 'fair' | 'low' {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'low';
}

/**
 * Score a list of sources for quality.
 */
export function scoreSources(
  sources: { url: string; title: string }[],
  query: string = '',
): SourceScore[] {
  return sources.map(source => {
    const authority = computeAuthorityScore(source.url);
    const relevanceScore = computeRelevanceScore(source.title, query);
    const compositeScore = Math.round(authority.score * 0.6 + relevanceScore * 0.4);

    return {
      url: source.url,
      title: source.title,
      authorityScore: authority.score,
      relevanceScore,
      compositeScore,
      tier: getTier(compositeScore),
      badges: authority.badges,
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore);
}

/**
 * Get a color scheme for a quality tier.
 */
export function getTierColor(tier: SourceScore['tier']): string {
  switch (tier) {
    case 'excellent': return 'green';
    case 'good': return 'blue';
    case 'fair': return 'yellow';
    case 'low': return 'gray';
  }
}

/**
 * Get a summary of source quality for a set of scored sources.
 */
export function getQualitySummary(scores: SourceScore[]): {
  averageScore: number;
  excellent: number;
  good: number;
  fair: number;
  low: number;
  topBadges: string[];
} {
  if (scores.length === 0) {
    return { averageScore: 0, excellent: 0, good: 0, fair: 0, low: 0, topBadges: [] };
  }

  const averageScore = Math.round(scores.reduce((s, c) => s + c.compositeScore, 0) / scores.length);
  const badgeCounts = new Map<string, number>();
  scores.forEach(s => s.badges.forEach(b => badgeCounts.set(b, (badgeCounts.get(b) || 0) + 1)));
  const topBadges = [...badgeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([badge]) => badge);

  return {
    averageScore,
    excellent: scores.filter(s => s.tier === 'excellent').length,
    good: scores.filter(s => s.tier === 'good').length,
    fair: scores.filter(s => s.tier === 'fair').length,
    low: scores.filter(s => s.tier === 'low').length,
    topBadges,
  };
}
