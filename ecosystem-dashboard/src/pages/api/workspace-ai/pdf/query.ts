/**
 * PDF RAG Query API Route
 * Performs vector search using embeddings and Milvus
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const EMBEDDING_URL = process.env.EMBEDDING_URL || 'http://localhost:8006';
const MILVUS_URL = process.env.MILVUS_URL || 'http://localhost:19530';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, workspace_id, top_k = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const collection_name = workspace_id ? `workspace_${workspace_id}` : 'workspace_default';

    // Get query embedding from NIM embeddings service
    const embeddingResponse = await fetch(`${EMBEDDING_URL}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: [query],
        model: 'nvidia/nv-embedqa-e5-v5',
        input_type: 'query',
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('[PDF Query] Embedding error:', errorText);
      return res.status(500).json({ 
        error: 'Failed to generate query embedding',
        details: errorText 
      });
    }

    const embeddingData = await embeddingResponse.json();
    const queryVector = embeddingData.data[0].embedding;

    // Search Milvus
    const searchResponse = await fetch(`${MILVUS_URL}/v1/vector/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collectionName: collection_name,
        vector: queryVector,
        limit: top_k,
        outputFields: ['content', 'filename', 'page', 'chunk_index'],
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[PDF Query] Milvus search error:', errorText);
      return res.status(500).json({ 
        error: 'Failed to search documents',
        details: errorText 
      });
    }

    const searchData = await searchResponse.json();
    
    // Format results
    const results = (searchData.data || []).map((hit: any) => ({
      content: hit.content,
      filename: hit.filename,
      page: hit.page,
      chunk_index: hit.chunk_index,
      score: hit.distance,
    }));

    return res.status(200).json({
      query,
      results,
      total: results.length,
    });

  } catch (error: any) {
    console.error('[PDF Query] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
