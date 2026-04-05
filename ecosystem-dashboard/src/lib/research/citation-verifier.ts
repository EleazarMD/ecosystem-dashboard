/**
 * Citation Verifier — validates URLs found in research reports.
 *
 * Extracts URLs from markdown content, checks if they're reachable
 * via HEAD requests, and returns a verification report.
 */

export interface CitationCheck {
  url: string;
  title: string;
  status: 'valid' | 'broken' | 'timeout' | 'pending';
  httpStatus?: number;
  responseTimeMs?: number;
}

export interface VerificationReport {
  totalCitations: number;
  valid: number;
  broken: number;
  timeout: number;
  pending: number;
  checks: CitationCheck[];
  verifiedAt: number;
}

/**
 * Extract URLs from markdown content.
 * Matches [text](url) patterns and bare https:// URLs.
 */
export function extractCitations(markdown: string): { url: string; title: string }[] {
  const citations: { url: string; title: string }[] = [];
  const seen = new Set<string>();

  // Match markdown links: [title](url)
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let match;
  while ((match = mdLinkRegex.exec(markdown)) !== null) {
    const url = match[2].replace(/[.,;:!?)]+$/, '');
    if (!seen.has(url)) {
      seen.add(url);
      citations.push({ title: match[1], url });
    }
  }

  // Match bare URLs not already captured
  const bareUrlRegex = /(?<!\()(https?:\/\/[^\s<>\[\]()]+)/g;
  while ((match = bareUrlRegex.exec(markdown)) !== null) {
    const url = match[1].replace(/[.,;:!?)]+$/, '');
    if (!seen.has(url)) {
      seen.add(url);
      citations.push({ title: new URL(url).hostname, url });
    }
  }

  return citations;
}

/**
 * Verify a single URL via the server-side proxy endpoint.
 */
async function checkUrl(url: string, timeoutMs = 5000): Promise<{ status: 'valid' | 'broken' | 'timeout'; httpStatus?: number; responseTimeMs: number }> {
  const start = Date.now();
  try {
    const res = await fetch('/api/research-lab/verify-citation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, timeoutMs }),
    });
    const elapsed = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      return { status: data.reachable ? 'valid' : 'broken', httpStatus: data.httpStatus, responseTimeMs: elapsed };
    }
    return { status: 'broken', responseTimeMs: elapsed };
  } catch {
    const elapsed = Date.now() - start;
    return { status: elapsed >= timeoutMs ? 'timeout' : 'broken', responseTimeMs: elapsed };
  }
}

/**
 * Verify all citations in a markdown report.
 * Runs checks in parallel with concurrency limit.
 */
export async function verifyCitations(
  markdown: string,
  onProgress?: (report: VerificationReport) => void,
  concurrency = 3,
): Promise<VerificationReport> {
  const citations = extractCitations(markdown);

  const report: VerificationReport = {
    totalCitations: citations.length,
    valid: 0,
    broken: 0,
    timeout: 0,
    pending: citations.length,
    checks: citations.map(c => ({ ...c, status: 'pending' as const })),
    verifiedAt: Date.now(),
  };

  if (citations.length === 0) return report;

  // Process in batches
  for (let i = 0; i < citations.length; i += concurrency) {
    const batch = citations.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (citation, batchIdx) => {
        const idx = i + batchIdx;
        const result = await checkUrl(citation.url);
        report.checks[idx] = {
          ...report.checks[idx],
          status: result.status,
          httpStatus: result.httpStatus,
          responseTimeMs: result.responseTimeMs,
        };
        report.pending--;
        if (result.status === 'valid') report.valid++;
        else if (result.status === 'broken') report.broken++;
        else report.timeout++;
        return result;
      })
    );
    onProgress?.(structuredClone(report));
  }

  return report;
}
