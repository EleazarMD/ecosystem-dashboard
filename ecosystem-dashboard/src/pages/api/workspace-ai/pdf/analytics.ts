/**
 * Document Analytics API Route
 * Provides deep analysis of PDF documents: chunks, pages, content types, text search
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const MILVUS_URI = process.env.MILVUS_URI || 'http://localhost:19530';

interface ChunkData {
  pk: string;
  text: string;
  page_number: number;
  content_type: string;
  filename: string;
  source_name: string;
}

interface DocumentAnalytics {
  document_name: string;
  total_chunks: number;
  total_pages: number;
  content_types: Record<string, number>;
  page_range: { min: number; max: number };
  chunks: ChunkData[];
  word_count: number;
  avg_chunk_length: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      workspace_id = 'my_workspace',
      document_name,
      page,
      content_type,
      search,
      offset = '0',
      limit = '50'
    } = req.method === 'GET' ? req.query : req.body;

    const collection_name = `workspace_${workspace_id}`;
    const offsetNum = parseInt(offset as string) || 0;
    const limitNum = Math.min(parseInt(limit as string) || 50, 200);

    const result = await queryMilvusViaDocker(
      collection_name,
      document_name as string | undefined,
      page as string | undefined,
      content_type as string | undefined,
      search as string | undefined,
      offsetNum,
      limitNum
    );

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('[Analytics API] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

async function queryMilvusViaDocker(
  collection_name: string,
  document_name?: string,
  page?: string,
  content_type?: string,
  search?: string,
  offset: number = 0,
  limit: number = 50
): Promise<any> {
  // Write Python script to temp file to avoid shell escaping issues
  const scriptContent = `
import json
import sys
from pymilvus import MilvusClient

# Parse args
args = json.loads(sys.argv[1])
collection_name = args['collection_name']
doc_filter = args.get('document_name')
page_filter = args.get('page')
type_filter = args.get('content_type')
search_filter = args.get('search')
offset = args.get('offset', 0)
limit_count = args.get('limit', 50)

client = MilvusClient(uri='http://nemo-rag-milvus:19530')

results = client.query(
    collection_name=collection_name,
    filter='',
    output_fields=['pk', 'text', 'content_metadata', 'source'],
    limit=2000
)

chunks = []
documents = {}
content_types = {}
pages = set()
total_words = 0

for r in results:
    source = r.get('source', {})
    cm = r.get('content_metadata', {})
    text = r.get('text', '')
    
    source_name = source.get('source_name', '')
    filename = cm.get('filename', source_name.split('/')[-1] if source_name else 'unknown')
    page_num = cm.get('page_number', -1)
    ctype = cm.get('type', 'text')
    
    if filename not in documents:
        documents[filename] = {'chunks': 0, 'pages': set(), 'types': {}, 'words': 0}
    documents[filename]['chunks'] += 1
    documents[filename]['pages'].add(page_num)
    documents[filename]['types'][ctype] = documents[filename]['types'].get(ctype, 0) + 1
    documents[filename]['words'] += len(text.split())
    
    if doc_filter and doc_filter.lower() not in filename.lower():
        continue
    if page_filter is not None and page_num != int(page_filter):
        continue
    if type_filter and ctype != type_filter:
        continue
    if search_filter and search_filter.lower() not in text.lower():
        continue
    
    content_types[ctype] = content_types.get(ctype, 0) + 1
    if page_num >= 0:
        pages.add(page_num)
    total_words += len(text.split())
    
    chunks.append({
        'pk': str(r.get('pk', '')),
        'text': text,
        'page_number': page_num,
        'content_type': ctype,
        'filename': filename,
        'source_name': source_name
    })

chunks.sort(key=lambda x: (x['page_number'], x['pk']))
total_filtered = len(chunks)
chunks = chunks[offset:offset + limit_count]

doc_summaries = []
for fname, stats in documents.items():
    doc_summaries.append({
        'filename': fname,
        'total_chunks': stats['chunks'],
        'total_pages': len(stats['pages']),
        'page_range': {'min': min(stats['pages']) if stats['pages'] else 0, 'max': max(stats['pages']) if stats['pages'] else 0},
        'content_types': stats['types'],
        'word_count': stats['words']
    })

result = {
    'collection_name': collection_name,
    'documents': doc_summaries,
    'filtered': {
        'total_chunks': total_filtered,
        'returned_chunks': len(chunks),
        'offset': offset,
        'limit': limit_count,
        'content_types': content_types,
        'page_range': {'min': min(pages) if pages else 0, 'max': max(pages) if pages else 0},
        'total_pages': len(pages),
        'word_count': total_words
    },
    'chunks': chunks
}

print(json.dumps(result))
`;

  // Write script to temp file
  const tmpDir = os.tmpdir();
  const scriptPath = path.join(tmpDir, 'milvus_query.py');
  fs.writeFileSync(scriptPath, scriptContent);

  // Build args JSON
  const args = JSON.stringify({
    collection_name,
    document_name: document_name || null,
    page: page || null,
    content_type: content_type || null,
    search: search || null,
    offset,
    limit,
  });

  try {
    // Copy script to container and execute
    execSync(`docker cp ${scriptPath} rag-ingestor-server:/tmp/milvus_query.py`, { encoding: 'utf-8' });
    const stdout = execSync(
      `docker exec rag-ingestor-server python3 /tmp/milvus_query.py '${args.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );
    
    return JSON.parse(stdout);
  } catch (error: any) {
    console.error('[Analytics] Docker exec error:', error.stderr || error.message);
    throw new Error('Failed to query document analytics');
  } finally {
    // Cleanup
    try { fs.unlinkSync(scriptPath); } catch {}
  }
}
