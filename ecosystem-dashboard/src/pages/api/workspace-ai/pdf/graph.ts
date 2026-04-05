/**
 * Document Graph API Route
 * Returns knowledge graph data for PDF documents
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const INGESTOR_URL = process.env.INGESTOR_URL || 'http://localhost:8082';

// Node types
type NodeType = 'document' | 'chapter' | 'concept' | 'entity' | 'topic' | 'person' | 'organization' | 'location';

interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  document_id?: string;
  val?: number;
  color?: string;
}

interface GraphLink {
  source: string;
  target: string;
  weight?: number;
  type?: string;
}

// Node type colors
const NODE_COLORS: Record<NodeType, string> = {
  document: '#3b82f6',
  chapter: '#8b5cf6',
  concept: '#10b981',
  entity: '#f59e0b',
  topic: '#ec4899',
  person: '#6366f1',
  organization: '#14b8a6',
  location: '#f97316',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workspace_id, document_id } = req.query;
    const collection_name = workspace_id ? `workspace_${workspace_id}` : 'workspace_default';

    // Try to get documents from NeMo RAG
    let documents: any[] = [];
    let collectionInfo: any = null;
    
    try {
      // Get collection info
      const collectionsRes = await fetch(`${INGESTOR_URL}/collections`);
      if (collectionsRes.ok) {
        const data = await collectionsRes.json();
        collectionInfo = data.collections?.find((c: any) => c.collection_name === collection_name);
      }
      
      // Get documents list
      const docsResponse = await fetch(
        `${INGESTOR_URL}/documents?collection_name=${collection_name}`
      );
      if (docsResponse.ok) {
        const data = await docsResponse.json();
        documents = data.documents || [];
      }
    } catch (e) {
      console.log('[Graph API] Could not fetch documents from Ingestor Server');
    }

    // Build graph from documents
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    if (documents.length > 0) {
      // Add document nodes
      documents.forEach((doc, idx) => {
        const docName = doc.document_name || doc.filename || `Document ${idx + 1}`;
        const docId = `doc_${idx}`;
        
        nodes.push({
          id: docId,
          name: docName.replace('.pdf', ''),
          type: 'document',
          val: 30,
          color: NODE_COLORS.document,
        });

        // Add chunk count as a concept node
        if (collectionInfo?.num_entities) {
          const chunksId = `chunks_${idx}`;
          nodes.push({
            id: chunksId,
            name: `${collectionInfo.num_entities} chunks`,
            type: 'concept',
            val: 15,
            color: NODE_COLORS.concept,
          });
          links.push({
            source: docId,
            target: chunksId,
            type: 'contains',
            weight: 3,
          });
        }
      });

      // Add collection info node
      nodes.push({
        id: 'collection',
        name: collection_name,
        type: 'topic',
        val: 20,
        color: NODE_COLORS.topic,
      });

      // Link documents to collection
      documents.forEach((_, idx) => {
        links.push({
          source: `doc_${idx}`,
          target: 'collection',
          type: 'stored_in',
          weight: 2,
        });
      });
    }

    // If no data from Ingestor Server, return demo data
    if (nodes.length === 0) {
      return res.status(200).json(generateDemoGraph());
    }

    return res.status(200).json({
      nodes,
      links,
      stats: {
        total_nodes: nodes.length,
        total_links: links.length,
        documents: documents.length,
        concepts: nodes.filter(n => n.type === 'concept').length,
        collection: collection_name,
        entities: collectionInfo?.num_entities || 0,
      },
    });

  } catch (error: any) {
    console.error('[Graph API] Error:', error);
    // Return demo data on error
    return res.status(200).json(generateDemoGraph());
  }
}

function generateDemoGraph() {
  const nodes: GraphNode[] = [
    // Documents
    { id: 'doc1', name: 'AI Engineering', type: 'document', val: 30, color: NODE_COLORS.document },
    
    // Chapters
    { id: 'ch1', name: 'Introduction to AI', type: 'chapter', document_id: 'doc1', val: 20, color: NODE_COLORS.chapter },
    { id: 'ch2', name: 'Machine Learning Fundamentals', type: 'chapter', document_id: 'doc1', val: 20, color: NODE_COLORS.chapter },
    { id: 'ch3', name: 'Deep Learning', type: 'chapter', document_id: 'doc1', val: 20, color: NODE_COLORS.chapter },
    { id: 'ch4', name: 'LLM Applications', type: 'chapter', document_id: 'doc1', val: 20, color: NODE_COLORS.chapter },
    
    // Concepts
    { id: 'c1', name: 'Neural Networks', type: 'concept', val: 15, color: NODE_COLORS.concept },
    { id: 'c2', name: 'Transformers', type: 'concept', val: 14, color: NODE_COLORS.concept },
    { id: 'c3', name: 'Attention Mechanism', type: 'concept', val: 12, color: NODE_COLORS.concept },
    { id: 'c4', name: 'Fine-tuning', type: 'concept', val: 11, color: NODE_COLORS.concept },
    { id: 'c5', name: 'Embeddings', type: 'concept', val: 13, color: NODE_COLORS.concept },
    { id: 'c6', name: 'RAG', type: 'concept', val: 10, color: NODE_COLORS.concept },
    { id: 'c7', name: 'Prompt Engineering', type: 'concept', val: 12, color: NODE_COLORS.concept },
    { id: 'c8', name: 'Vector Databases', type: 'concept', val: 9, color: NODE_COLORS.concept },
    
    // Topics
    { id: 't1', name: 'Model Training', type: 'topic', val: 10, color: NODE_COLORS.topic },
    { id: 't2', name: 'Inference Optimization', type: 'topic', val: 10, color: NODE_COLORS.topic },
    { id: 't3', name: 'Data Pipelines', type: 'topic', val: 10, color: NODE_COLORS.topic },
    
    // People
    { id: 'p1', name: 'Chip Huyen', type: 'person', val: 12, color: NODE_COLORS.person },
    { id: 'p2', name: 'Andrej Karpathy', type: 'person', val: 8, color: NODE_COLORS.person },
    
    // Organizations
    { id: 'o1', name: 'OpenAI', type: 'organization', val: 10, color: NODE_COLORS.organization },
    { id: 'o2', name: 'Google', type: 'organization', val: 10, color: NODE_COLORS.organization },
    { id: 'o3', name: 'NVIDIA', type: 'organization', val: 8, color: NODE_COLORS.organization },
  ];

  const links: GraphLink[] = [
    // Document to chapters
    { source: 'doc1', target: 'ch1', type: 'contains', weight: 3 },
    { source: 'doc1', target: 'ch2', type: 'contains', weight: 3 },
    { source: 'doc1', target: 'ch3', type: 'contains', weight: 3 },
    { source: 'doc1', target: 'ch4', type: 'contains', weight: 3 },
    
    // Chapters to concepts
    { source: 'ch2', target: 'c1', type: 'discusses', weight: 2 },
    { source: 'ch3', target: 'c1', type: 'discusses', weight: 3 },
    { source: 'ch3', target: 'c2', type: 'discusses', weight: 3 },
    { source: 'ch3', target: 'c3', type: 'discusses', weight: 2 },
    { source: 'ch4', target: 'c4', type: 'discusses', weight: 2 },
    { source: 'ch4', target: 'c5', type: 'discusses', weight: 2 },
    { source: 'ch4', target: 'c6', type: 'discusses', weight: 3 },
    { source: 'ch4', target: 'c7', type: 'discusses', weight: 2 },
    { source: 'ch4', target: 'c8', type: 'discusses', weight: 2 },
    
    // Concept relationships
    { source: 'c2', target: 'c3', type: 'related', weight: 3 },
    { source: 'c1', target: 'c5', type: 'related', weight: 2 },
    { source: 'c6', target: 'c8', type: 'related', weight: 3 },
    { source: 'c6', target: 'c5', type: 'related', weight: 2 },
    { source: 'c4', target: 'c2', type: 'related', weight: 2 },
    
    // Topics to concepts
    { source: 't1', target: 'c1', type: 'includes', weight: 1 },
    { source: 't1', target: 'c4', type: 'includes', weight: 1 },
    { source: 't2', target: 'c2', type: 'includes', weight: 1 },
    { source: 't3', target: 'c6', type: 'includes', weight: 1 },
    
    // People to concepts
    { source: 'p1', target: 'c6', type: 'authored', weight: 2 },
    { source: 'p1', target: 'c7', type: 'authored', weight: 2 },
    { source: 'p2', target: 'c1', type: 'contributed', weight: 2 },
    
    // Organizations to concepts
    { source: 'o1', target: 'c2', type: 'developed', weight: 3 },
    { source: 'o1', target: 'c7', type: 'developed', weight: 2 },
    { source: 'o2', target: 'c2', type: 'developed', weight: 3 },
    { source: 'o3', target: 'c8', type: 'developed', weight: 2 },
    
    // Author connection
    { source: 'p1', target: 'doc1', type: 'authored', weight: 4 },
  ];

  return {
    nodes,
    links,
    stats: {
      total_nodes: nodes.length,
      total_links: links.length,
      documents: 1,
      concepts: 8,
      entities: 5,
    },
  };
}
