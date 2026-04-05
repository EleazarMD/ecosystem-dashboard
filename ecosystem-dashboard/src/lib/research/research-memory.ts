/**
 * Research Memory — lightweight knowledge base for persisting research findings.
 *
 * Stores research summaries in localStorage indexed by topic keywords.
 * Provides search across past research to enrich future queries with context.
 */

export interface ResearchMemoryEntry {
  id: string;
  query: string;
  summary: string;         // first ~500 chars of the report
  model: string;
  keywords: string[];      // extracted topic keywords
  sourceCount: number;
  wordCount: number;
  createdAt: number;       // epoch ms
  sessionId?: string;
}

const STORAGE_KEY = 'research-memory-kb';
const MAX_ENTRIES = 100;
const SUMMARY_LENGTH = 500;

// ── CRUD ────────────────────────────────────────────────────────

function getAll(): ResearchMemoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(entries: ResearchMemoryEntry[]): void {
  // Keep only the most recent MAX_ENTRIES
  const trimmed = entries.slice(-MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * Extract simple keywords from a query string.
 * Strips common stop words and returns unique lowercase tokens.
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'just', 'because', 'but', 'and', 'or', 'if', 'while', 'about', 'what',
    'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'it',
    'its', 'my', 'your', 'his', 'her', 'our', 'their', 'me', 'him', 'us',
    'them', 'i', 'you', 'he', 'she', 'we', 'they', 'research', 'provide',
    'detailed', 'comprehensive', 'analysis', 'based', 'please', 'give',
  ]);

  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !stopWords.has(t));

  return [...new Set(tokens)].slice(0, 15);
}

// ── Public API ──────────────────────────────────────────────────

export function getResearchMemory(): ResearchMemoryEntry[] {
  return getAll();
}

export function addResearchMemory(opts: {
  query: string;
  report: string;
  model: string;
  sourceCount?: number;
  sessionId?: string;
}): ResearchMemoryEntry {
  const entries = getAll();

  // Deduplicate by sessionId
  if (opts.sessionId && entries.some(e => e.sessionId === opts.sessionId)) {
    return entries.find(e => e.sessionId === opts.sessionId)!;
  }

  const wordCount = opts.report.split(/\s+/).filter(Boolean).length;
  const summary = opts.report.substring(0, SUMMARY_LENGTH).replace(/\n+/g, ' ').trim();
  const keywords = extractKeywords(opts.query);

  const entry: ResearchMemoryEntry = {
    id: `mem-${Date.now()}`,
    query: opts.query,
    summary,
    model: opts.model,
    keywords,
    sourceCount: opts.sourceCount || 0,
    wordCount,
    createdAt: Date.now(),
    sessionId: opts.sessionId,
  };

  entries.push(entry);
  persist(entries);
  return entry;
}

export function deleteResearchMemory(id: string): void {
  persist(getAll().filter(e => e.id !== id));
}

export function clearResearchMemory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Search the research memory for entries matching a query.
 * Uses keyword overlap scoring.
 */
export function searchResearchMemory(query: string, limit = 5): ResearchMemoryEntry[] {
  const queryKeywords = extractKeywords(query);
  if (queryKeywords.length === 0) return [];

  const entries = getAll();
  const scored = entries.map(entry => {
    const overlap = entry.keywords.filter(k => queryKeywords.includes(k)).length;
    // Also check if query words appear in the entry's query text
    const queryLower = query.toLowerCase();
    const entryQueryLower = entry.query.toLowerCase();
    const textBonus = queryKeywords.filter(k => entryQueryLower.includes(k)).length * 0.5;
    return { entry, score: overlap + textBonus };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry);
}

/**
 * Build a context string from relevant past research to inject into a new query.
 */
export function buildMemoryContext(query: string): string | null {
  const relevant = searchResearchMemory(query, 3);
  if (relevant.length === 0) return null;

  const lines = relevant.map((r, i) =>
    `[Past Research ${i + 1}] "${r.query}" (${r.model}, ${r.wordCount} words, ${new Date(r.createdAt).toLocaleDateString()}):\n${r.summary}…`
  );

  return `--- RESEARCH MEMORY CONTEXT ---\nThe following are summaries of your previous research that may be relevant:\n\n${lines.join('\n\n')}\n--- END MEMORY CONTEXT ---\n\n`;
}

export function getMemoryStats(): { totalEntries: number; totalWords: number; oldestDate: string | null; newestDate: string | null } {
  const entries = getAll();
  if (entries.length === 0) return { totalEntries: 0, totalWords: 0, oldestDate: null, newestDate: null };
  const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0);
  const sorted = [...entries].sort((a, b) => a.createdAt - b.createdAt);
  return {
    totalEntries: entries.length,
    totalWords,
    oldestDate: new Date(sorted[0].createdAt).toLocaleDateString(),
    newestDate: new Date(sorted[sorted.length - 1].createdAt).toLocaleDateString(),
  };
}
