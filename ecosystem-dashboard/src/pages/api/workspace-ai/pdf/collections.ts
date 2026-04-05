/**
 * Collections API Route
 * Returns list of available Milvus collections via Docker exec
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
    const result = await getCollectionsFromMilvus();
    return res.status(200).json(result);

  } catch (error: any) {
    console.error('[Collections API] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

async function getCollectionsFromMilvus(): Promise<any> {
  const scriptContent = `
import json
from pymilvus import MilvusClient

client = MilvusClient(uri='http://nemo-rag-milvus:19530')

collections = client.list_collections()

output = []
for coll_name in collections:
    try:
        # Get collection stats
        stats = client.get_collection_stats(coll_name)
        num_entities = stats.get('row_count', 0)
        output.append({
            'collection_name': coll_name,
            'num_entities': num_entities
        })
    except Exception as e:
        output.append({
            'collection_name': coll_name,
            'num_entities': 0
        })

print(json.dumps({
    'collections': output,
    'total_collections': len(output)
}))
`;

  const tmpDir = os.tmpdir();
  const scriptPath = path.join(tmpDir, 'colls_query.py');
  fs.writeFileSync(scriptPath, scriptContent);

  try {
    execSync(`docker cp ${scriptPath} rag-ingestor-server:/tmp/colls_query.py`, { encoding: 'utf-8' });
    const stdout = execSync(
      `docker exec rag-ingestor-server python3 /tmp/colls_query.py`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    return JSON.parse(stdout);
  } catch (error: any) {
    console.error('[Collections] Docker exec error:', error.stderr || error.message);
    throw new Error('Failed to list collections from Milvus');
  } finally {
    try { fs.unlinkSync(scriptPath); } catch {}
  }
}
