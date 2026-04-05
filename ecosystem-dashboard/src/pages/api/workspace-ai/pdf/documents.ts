/**
 * PDF Documents List API Route
 * Lists indexed documents from Milvus via Docker exec
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workspace_id } = req.query;
    const collection_name = workspace_id ? `workspace_${workspace_id}` : 'workspace_default';

    const result = await getDocumentsFromMilvus(collection_name);
    return res.status(200).json(result);

  } catch (error: any) {
    console.error('[PDF Documents] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

async function getDocumentsFromMilvus(collection_name: string): Promise<any> {
  const scriptContent = `
import json
import sys
from pymilvus import MilvusClient

args = json.loads(sys.argv[1])
collection_name = args['collection_name']

client = MilvusClient(uri='http://nemo-rag-milvus:19530')

# Ensure collection is loaded
try:
    client.load_collection(collection_name)
except Exception as e:
    pass

results = client.query(
    collection_name=collection_name,
    filter='',
    output_fields=['content_metadata', 'source'],
    limit=5000
)

# Group by document
documents = {}
for r in results:
    cm = r.get('content_metadata', {})
    source = r.get('source', {})
    filename = cm.get('filename', source.get('source_name', '').split('/')[-1] if source.get('source_name') else 'unknown')
    
    if not filename or filename == 'unknown':
        continue
    
    if filename not in documents:
        documents[filename] = {
            'document_name': filename,
            'chunk_count': 0,
            'pages': set()
        }
    
    documents[filename]['chunk_count'] += 1
    page = cm.get('page_number', 0)
    documents[filename]['pages'].add(page)

# Convert to list
output = []
for filename, data in documents.items():
    output.append({
        'document_name': data['document_name'],
        'chunk_count': data['chunk_count'],
        'page_count': len(data['pages'])
    })

print(json.dumps({
    'documents': output,
    'total_documents': len(output)
}))
`;

  const tmpDir = os.tmpdir();
  const scriptPath = path.join(tmpDir, 'docs_query.py');
  fs.writeFileSync(scriptPath, scriptContent);

  const args = JSON.stringify({ collection_name });

  try {
    execSync(`docker cp ${scriptPath} rag-ingestor-server:/tmp/docs_query.py`, { encoding: 'utf-8' });
    const stdout = execSync(
      `docker exec rag-ingestor-server python3 /tmp/docs_query.py '${args.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    return JSON.parse(stdout);
  } catch (error: any) {
    console.error('[Documents] Docker exec error:', error.stderr || error.message);
    throw new Error('Failed to list documents from Milvus');
  } finally {
    try { fs.unlinkSync(scriptPath); } catch {}
  }
}
