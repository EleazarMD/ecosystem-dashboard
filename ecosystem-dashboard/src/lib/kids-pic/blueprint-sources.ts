/**
 * Blueprint source pages → bounded text for generation prompts (ADR-0010 P2).
 *
 * The blueprint's sourceRefs cite kids-pcg's content-addressed curriculum PDFs
 * (sha256 + page range). Generation tasks teach from THOSE pages, not from
 * invention: the PDF bytes come from kids-pcg with the dashboard's read key
 * (Infisical /kids-dashboard KIDS_PCG_READ_KEY), text is extracted with the
 * workspace PDFExtractor, and everything is bounded + cached per document.
 */
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { getPDFExtractor } from '@/lib/workspace/pdf-extractor';

const KIDS_PCG_URL = (process.env.KIDS_PCG_URL || 'http://127.0.0.1:8771').replace(/\/$/, '');
const KIDS_PCG_READ_KEY = process.env.KIDS_PCG_READ_KEY || '';
const MAX_CHARS_PER_DOC = 6000;
const MAX_TOTAL_CHARS = 14000;
const MAX_REFS = 4;
const CACHE_TTL_MS = 10 * 60_000;

export interface BlueprintSourceRef {
  setId?: string; module?: string; lesson?: string;
  documentSha256?: string; pages?: number[]; url?: string;
}

const docCache = new Map<string, { at: number; pages: { pageNumber: number; text: string }[] }>();

async function docPages(sha256: string): Promise<{ pageNumber: number; text: string }[] | null> {
  const hit = docCache.get(sha256);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.pages;

  if (!KIDS_PCG_READ_KEY) {
    console.warn('[blueprint-sources] KIDS_PCG_READ_KEY not configured — generation runs without source pages');
    return null;
  }
  const res = await fetch(`${KIDS_PCG_URL}/api/curriculum/documents/${sha256}`, {
    headers: { 'X-PCG-Key': KIDS_PCG_READ_KEY },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    console.warn(`[blueprint-sources] document ${sha256.slice(0, 12)} answered ${res.status}`);
    return null;
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  const tmp = path.join(os.tmpdir(), `bp-src-${randomUUID().slice(0, 8)}.pdf`);
  try {
    await fs.writeFile(tmp, bytes);
    const extracted = await getPDFExtractor().extractText(tmp);
    const pages = extracted.pages.map(p => ({ pageNumber: p.pageNumber, text: p.text }));
    docCache.set(sha256, { at: Date.now(), pages });
    return pages;
  } catch (err) {
    console.warn(`[blueprint-sources] extraction failed for ${sha256.slice(0, 12)}:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

/** Bounded source text for the generation prompts, or '' when nothing is
 *  reachable (generation still runs — ungrounded — and the review notes it). */
export async function blueprintSourceText(refs: BlueprintSourceRef[] | undefined | null): Promise<string> {
  if (!Array.isArray(refs) || refs.length === 0) return '';
  const chunks: string[] = [];
  let total = 0;
  for (const ref of refs.slice(0, MAX_REFS)) {
    if (!ref.documentSha256 || total >= MAX_TOTAL_CHARS) break;
    const pages = await docPages(ref.documentSha256);
    if (!pages) continue;
    const [start, end] = ref.pages ?? [1, Math.min(pages.length, 6)];
    const picked = pages
      .filter(p => p.pageNumber >= start && p.pageNumber <= end)
      .map(p => `[page ${p.pageNumber}]\n${p.text}`)
      .join('\n\n')
      .slice(0, MAX_CHARS_PER_DOC);
    const room = MAX_TOTAL_CHARS - total;
    const text = picked.slice(0, room);
    if (!text) break;
    const label = [ref.setId, ref.module, ref.lesson].filter(Boolean).join(' ') || 'curriculum';
    chunks.push(`Source: ${label} (sha256 ${ref.documentSha256.slice(0, 12)})\n${text}`);
    total += text.length;
  }
  return chunks.join('\n\n---\n\n');
}
