import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Knowledge Graph Document Analysis API
 * 
 * Retrieves analysis information for a specific document stored in the Knowledge Graph
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { documentId } = req.query;

    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    // In production, this would connect to the Knowledge Graph API
    // to fetch real document analysis data
    const kgServiceAvailable = process.env.NEXT_PUBLIC_MOCK_KG_DATA !== 'true';
    
    if (!kgServiceAvailable) {
      // Return 503 with NO_REAL_DATA error code when KG service is unavailable
      return res.status(503).json({
        code: 'NO_REAL_DATA',
        message: 'Knowledge Graph service is unavailable',
        success: false,
      });
    }

    // Get sample document analysis (replace with actual Knowledge Graph API call)
    const documentAnalysis = getSampleDocumentAnalysis(documentId as string);
    
    if (!documentAnalysis) {
      return res.status(404).json({
        success: false,
        error: 'Document analysis not found',
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        analysis: documentAnalysis
      }
    });
  } catch (error: any) {
    console.error(`Error fetching analysis for document ID ${req.query.documentId}:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch document analysis',
      message: error.message
    });
  }
}

// Sample document analysis data for development and testing
function getSampleDocumentAnalysis(documentId: string) {
  const analysisData: Record<string, any> = {
    'doc-001': {
      id: 'analysis-doc-001',
      documentId: 'doc-001',
      entityCount: 87,
      relationshipCount: 42,
      keyTopics: ['AI Homelab', 'Architecture', 'System Design', 'Microservices', 'Knowledge Graph'],
      sentiment: 'Neutral',
      lastUpdated: '2025-07-12T10:15:00Z'
    },
    'doc-002': {
      id: 'analysis-doc-002',
      documentId: 'doc-002',
      entityCount: 64,
      relationshipCount: 39,
      keyTopics: ['Knowledge Graph', 'Neo4j', 'Integration', 'API', 'Entity Resolution'],
      sentiment: 'Positive',
      lastUpdated: '2025-07-11T14:30:00Z'
    },
    'doc-003': {
      id: 'analysis-doc-003',
      documentId: 'doc-003',
      entityCount: 32,
      relationshipCount: 18,
      keyTopics: ['Port Registry', 'Configuration', 'Service Discovery', 'Networking', 'API Gateway'],
      sentiment: 'Neutral',
      lastUpdated: '2025-07-10T09:45:00Z'
    },
    'doc-005': {
      id: 'analysis-doc-005',
      documentId: 'doc-005',
      entityCount: 53,
      relationshipCount: 28,
      keyTopics: ['Kubernetes', 'Deployment', 'k3d', 'Containers', 'DevOps'],
      sentiment: 'Neutral',
      lastUpdated: '2025-07-08T11:20:00Z'
    },
    'doc-006': {
      id: 'analysis-doc-006',
      documentId: 'doc-006',
      entityCount: 45,
      relationshipCount: 31,
      keyTopics: ['AI Gateway', 'Integration', 'Authentication', 'API', 'LLM'],
      sentiment: 'Positive',
      lastUpdated: '2025-07-06T16:10:00Z'
    },
    'doc-007': {
      id: 'analysis-doc-007',
      documentId: 'doc-007',
      entityCount: 28,
      relationshipCount: 17,
      keyTopics: ['AHIS', 'Configuration', 'JSON Schema', 'Settings', 'Services'],
      sentiment: 'Neutral',
      lastUpdated: '2025-07-05T13:40:00Z'
    },
    'doc-009': {
      id: 'analysis-doc-009',
      documentId: 'doc-009',
      entityCount: 41,
      relationshipCount: 36,
      keyTopics: ['Dashboard', 'Architecture', 'Components', 'React', 'Next.js'],
      sentiment: 'Neutral',
      lastUpdated: '2025-07-02T15:30:00Z'
    },
    'doc-010': {
      id: 'analysis-doc-010',
      documentId: 'doc-010',
      entityCount: 37,
      relationshipCount: 21,
      keyTopics: ['Error Handling', 'Specifications', 'Status Codes', 'REST API', 'Circuit Breaker'],
      sentiment: 'Mixed',
      lastUpdated: '2025-06-30T11:15:00Z'
    }
  };
  
  return analysisData[documentId] || null;
}
