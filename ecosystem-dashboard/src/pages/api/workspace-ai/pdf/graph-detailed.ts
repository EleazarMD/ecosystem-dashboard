/**
 * Detailed Document Graph API Route
 * Returns rich knowledge graph with pages, chunks, content types for 3D exploration
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

type NodeType = 'document' | 'page' | 'chunk' | 'text' | 'table' | 'section' | 'topic';

interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  val: number;
  color: string;
  metadata?: {
    page_number?: number;
    content_type?: string;
    word_count?: number;
    text_preview?: string;
    chunk_id?: string;
  };
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
  weight: number;
}

const NODE_COLORS: Record<NodeType, string> = {
  document: '#3b82f6',  // blue
  page: '#8b5cf6',      // purple
  chunk: '#10b981',     // green
  text: '#06b6d4',      // cyan
  table: '#f59e0b',     // amber
  section: '#ec4899',   // pink
  topic: '#6366f1',     // indigo
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      workspace_id = 'my_workspace',
      document_name,
      detail_level = 'pages', // 'documents' | 'pages' | 'chunks'
      max_nodes = '200'
    } = req.query;

    const collection_name = `workspace_${workspace_id}`;
    const maxNodes = Math.min(parseInt(max_nodes as string) || 200, 500);

    const result = await buildGraphFromMilvus(
      collection_name,
      document_name as string | undefined,
      detail_level as string,
      maxNodes
    );

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('[Graph Detailed API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to build graph',
      message: error.message 
    });
  }
}

async function buildGraphFromMilvus(
  collection_name: string,
  document_name?: string,
  detail_level: string = 'pages',
  maxNodes: number = 200
): Promise<any> {
  const scriptContent = `
import json
import sys
from pymilvus import MilvusClient

args = json.loads(sys.argv[1])
collection_name = args['collection_name']
doc_filter = args.get('document_name')
detail_level = args.get('detail_level', 'pages')
max_nodes = args.get('max_nodes', 200)

client = MilvusClient(uri='http://nemo-rag-milvus:19530')

# Ensure collection is loaded before querying
try:
    client.load_collection(collection_name)
except Exception as e:
    pass  # Collection may already be loaded

results = client.query(
    collection_name=collection_name,
    filter='',
    output_fields=['pk', 'text', 'content_metadata', 'source'],
    limit=2000
)

nodes = []
links = []
node_ids = set()

# Group by document
documents = {}
for r in results:
    source = r.get('source', {})
    cm = r.get('content_metadata', {})
    text = r.get('text', '')
    
    source_name = source.get('source_name', '')
    filename = cm.get('filename', source_name.split('/')[-1] if source_name else 'unknown')
    page_num = cm.get('page_number', 0)
    ctype = cm.get('type', 'text')
    
    if doc_filter and doc_filter.lower() not in filename.lower():
        continue
    
    if filename not in documents:
        documents[filename] = {'pages': {}, 'chunks': [], 'types': {}}
    
    documents[filename]['types'][ctype] = documents[filename]['types'].get(ctype, 0) + 1
    
    if page_num not in documents[filename]['pages']:
        documents[filename]['pages'][page_num] = {'chunks': [], 'types': {}}
    
    documents[filename]['pages'][page_num]['chunks'].append({
        'pk': str(r.get('pk', '')),
        'text': text[:150] + '...' if len(text) > 150 else text,
        'full_text': text,
        'type': ctype,
        'word_count': len(text.split())
    })
    documents[filename]['pages'][page_num]['types'][ctype] = documents[filename]['pages'][page_num]['types'].get(ctype, 0) + 1

# Build graph based on detail level
node_count = 0

for doc_name, doc_data in documents.items():
    if node_count >= max_nodes:
        break
        
    # Document node
    doc_id = f"doc_{doc_name.replace(' ', '_').replace('.', '_')}"
    total_chunks = sum(len(p['chunks']) for p in doc_data['pages'].values())
    total_pages = len(doc_data['pages'])
    
    nodes.append({
        'id': doc_id,
        'name': doc_name.replace('.pdf', ''),
        'type': 'document',
        'val': 40,
        'color': '#3b82f6',
        'metadata': {
            'page_count': total_pages,
            'chunk_count': total_chunks,
            'content_types': doc_data['types']
        }
    })
    node_ids.add(doc_id)
    node_count += 1
    
    if detail_level == 'documents':
        # Add content type summary nodes
        for ctype, count in doc_data['types'].items():
            type_id = f"{doc_id}_type_{ctype}"
            type_color = '#06b6d4' if ctype == 'text' else '#f59e0b'
            nodes.append({
                'id': type_id,
                'name': f"{ctype}: {count}",
                'type': ctype if ctype in ['text', 'table'] else 'chunk',
                'val': 15 + min(count / 10, 15),
                'color': type_color,
                'metadata': {'content_type': ctype, 'count': count}
            })
            links.append({'source': doc_id, 'target': type_id, 'type': 'contains', 'weight': 2})
            node_count += 1
        continue
    
    # Page nodes
    sorted_pages = sorted(doc_data['pages'].keys())
    
    # For pages level, show page groups
    if detail_level == 'pages':
        # Group pages into sections (every 50 pages)
        section_size = 50
        sections = {}
        for page_num in sorted_pages:
            section_idx = page_num // section_size
            if section_idx not in sections:
                sections[section_idx] = {'pages': [], 'chunks': 0, 'types': {}}
            sections[section_idx]['pages'].append(page_num)
            sections[section_idx]['chunks'] += len(doc_data['pages'][page_num]['chunks'])
            for t, c in doc_data['pages'][page_num]['types'].items():
                sections[section_idx]['types'][t] = sections[section_idx]['types'].get(t, 0) + c
        
        for section_idx, section_data in sections.items():
            if node_count >= max_nodes:
                break
            start_page = section_idx * section_size + 1
            end_page = min((section_idx + 1) * section_size, max(sorted_pages) + 1)
            section_id = f"{doc_id}_section_{section_idx}"
            
            nodes.append({
                'id': section_id,
                'name': f"Pages {start_page}-{end_page}",
                'type': 'section',
                'val': 20 + min(section_data['chunks'] / 5, 15),
                'color': '#ec4899',
                'metadata': {
                    'page_range': [start_page, end_page],
                    'chunk_count': section_data['chunks'],
                    'content_types': section_data['types']
                }
            })
            links.append({'source': doc_id, 'target': section_id, 'type': 'contains', 'weight': 3})
            node_count += 1
            
            # Add content type nodes for each section
            for ctype, count in section_data['types'].items():
                if node_count >= max_nodes:
                    break
                type_id = f"{section_id}_type_{ctype}"
                type_color = '#06b6d4' if ctype == 'text' else '#f59e0b'
                nodes.append({
                    'id': type_id,
                    'name': f"{ctype}: {count}",
                    'type': ctype if ctype in ['text', 'table'] else 'chunk',
                    'val': 10 + min(count / 5, 10),
                    'color': type_color,
                    'metadata': {'content_type': ctype, 'count': count}
                })
                links.append({'source': section_id, 'target': type_id, 'type': 'has', 'weight': 2})
                node_count += 1
    
    # Chunks level - show individual pages and sample chunks
    elif detail_level == 'chunks':
        # Show first N pages with their chunks
        for page_num in sorted_pages[:20]:  # Limit to first 20 pages
            if node_count >= max_nodes:
                break
                
            page_id = f"{doc_id}_page_{page_num}"
            page_chunks = doc_data['pages'][page_num]['chunks']
            
            nodes.append({
                'id': page_id,
                'name': f"Page {page_num + 1}",
                'type': 'page',
                'val': 15 + min(len(page_chunks), 10),
                'color': '#8b5cf6',
                'metadata': {
                    'page_number': page_num + 1,
                    'chunk_count': len(page_chunks),
                    'content_types': doc_data['pages'][page_num]['types']
                }
            })
            links.append({'source': doc_id, 'target': page_id, 'type': 'contains', 'weight': 2})
            node_count += 1
            
            # Add chunk nodes (limit per page)
            for i, chunk in enumerate(page_chunks[:5]):
                if node_count >= max_nodes:
                    break
                    
                chunk_id = f"{page_id}_chunk_{i}"
                chunk_color = '#06b6d4' if chunk['type'] == 'text' else '#f59e0b'
                
                nodes.append({
                    'id': chunk_id,
                    'name': chunk['text'][:50] + '...' if len(chunk['text']) > 50 else chunk['text'],
                    'type': chunk['type'] if chunk['type'] in ['text', 'table'] else 'chunk',
                    'val': 8 + min(chunk['word_count'] / 20, 8),
                    'color': chunk_color,
                    'metadata': {
                        'page_number': page_num + 1,
                        'content_type': chunk['type'],
                        'word_count': chunk['word_count'],
                        'text_preview': chunk['text'],
                        'chunk_id': chunk['pk']
                    }
                })
                links.append({'source': page_id, 'target': chunk_id, 'type': 'has', 'weight': 1})
                node_count += 1

# Calculate stats
stats = {
    'total_nodes': len(nodes),
    'total_links': len(links),
    'documents': len(documents),
    'detail_level': detail_level,
    'node_types': {}
}
for n in nodes:
    t = n['type']
    stats['node_types'][t] = stats['node_types'].get(t, 0) + 1

result = {
    'nodes': nodes,
    'links': links,
    'stats': stats
}

print(json.dumps(result))
`;

  const tmpDir = os.tmpdir();
  const scriptPath = path.join(tmpDir, 'graph_query.py');
  fs.writeFileSync(scriptPath, scriptContent);

  const args = JSON.stringify({
    collection_name,
    document_name: document_name || null,
    detail_level,
    max_nodes: maxNodes,
  });

  try {
    execSync(`docker cp ${scriptPath} rag-ingestor-server:/tmp/graph_query.py`, { encoding: 'utf-8' });
    const stdout = execSync(
      `docker exec rag-ingestor-server python3 /tmp/graph_query.py '${args.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );
    
    return JSON.parse(stdout);
  } catch (error: any) {
    console.error('[Graph] Docker exec error:', error.stderr || error.message);
    throw new Error('Failed to build graph from Milvus');
  } finally {
    try { fs.unlinkSync(scriptPath); } catch {}
  }
}
