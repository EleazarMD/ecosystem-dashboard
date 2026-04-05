import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

/**
 * Knowledge Graph Documents API
 * 
 * Retrieves documents stored in the Knowledge Graph
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In production, this would connect to the Knowledge Graph API
    // to fetch real document data
    
    const kgServiceAvailable = process.env.NEXT_PUBLIC_MOCK_KG_DATA !== 'true';
    
    if (!kgServiceAvailable) {
      // Return 503 with NO_REAL_DATA error code when KG service is unavailable
      return res.status(503).json({
        code: 'NO_REAL_DATA',
        message: 'Knowledge Graph service is unavailable',
        success: false,
      });
    }
    
    // Query parameters for filtering and pagination
    const { 
      type, 
      status,
      limit = '50',
      offset = '0'
    } = req.query;
    
    // Parse limit and offset
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    
    // Get sample documents (replace with actual Knowledge Graph API call)
    let documents = getSampleDocuments();
    
    // Apply filters if provided
    if (type) {
      documents = documents.filter(doc => doc.type === type);
    }
    
    if (status) {
      documents = documents.filter(doc => doc.status === status);
    }
    
    // Apply pagination
    documents = documents.slice(offsetNum, offsetNum + limitNum);
    
    return res.status(200).json({
      success: true,
      data: {
        documents,
        total: documents.length,
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch documents',
      message: error.message
    });
  }
}

// Sample document data for development and testing
function getSampleDocuments() {
  return [
    {
      id: 'doc-001',
      title: 'AI Homelab Architecture Overview',
      path: '/documentation/architecture/overview.md',
      type: 'markdown',
      status: 'indexed',
      dateAdded: '2025-07-10T14:30:00Z',
      size: 24560,
      entities: 87,
      relationships: 42,
      embeddings: 156
    },
    {
      id: 'doc-002',
      title: 'Knowledge Graph Integration Guide',
      path: '/documentation/integration/knowledge-graph.md',
      type: 'markdown',
      status: 'indexed',
      dateAdded: '2025-07-09T10:15:00Z',
      size: 18340,
      entities: 64,
      relationships: 39,
      embeddings: 127
    },
    {
      id: 'doc-003',
      title: 'Port Registry Specification',
      path: '/documentation/specifications/port-registry.yaml',
      type: 'yaml',
      status: 'indexed',
      dateAdded: '2025-07-08T16:45:00Z',
      size: 5120,
      entities: 32,
      relationships: 18,
      embeddings: 43
    },
    {
      id: 'doc-004',
      title: 'Agent Development Environment Setup',
      path: '/documentation/guides/ade-setup.md',
      type: 'markdown',
      status: 'analyzing',
      dateAdded: '2025-07-12T09:20:00Z',
      size: 31450
    },
    {
      id: 'doc-005',
      title: 'Kubernetes Deployment Instructions',
      path: '/documentation/deployment/kubernetes.md',
      type: 'markdown',
      status: 'indexed',
      dateAdded: '2025-07-05T13:10:00Z',
      size: 15780,
      entities: 53,
      relationships: 28,
      embeddings: 89
    },
    {
      id: 'doc-006',
      title: 'AI Gateway Integration Documentation',
      path: '/documentation/integration/ai-gateway.md',
      type: 'markdown',
      status: 'indexed',
      dateAdded: '2025-07-03T11:25:00Z',
      size: 12980,
      entities: 45,
      relationships: 31,
      embeddings: 78
    },
    {
      id: 'doc-007',
      title: 'AHIS Service Configuration',
      path: '/documentation/configuration/ahis-service.json',
      type: 'json',
      status: 'indexed',
      dateAdded: '2025-07-01T15:40:00Z',
      size: 3540,
      entities: 28,
      relationships: 17,
      embeddings: 31
    },
    {
      id: 'doc-008',
      title: 'IDE Memory Intelligence Protocol',
      path: '/documentation/protocols/ide-memory-protocol.md',
      type: 'markdown',
      status: 'analyzing',
      dateAdded: '2025-07-13T08:15:00Z',
      size: 22340
    },
    {
      id: 'doc-009',
      title: 'Dashboard Component Architecture',
      path: '/documentation/architecture/dashboard-components.svg',
      type: 'svg',
      status: 'indexed',
      dateAdded: '2025-06-28T10:30:00Z',
      size: 18540,
      entities: 41,
      relationships: 36,
      embeddings: 0
    },
    {
      id: 'doc-010',
      title: 'Error Handling Specifications',
      path: '/documentation/specifications/error-handling.md',
      type: 'markdown',
      status: 'indexed',
      dateAdded: '2025-06-25T14:20:00Z',
      size: 9870,
      entities: 37,
      relationships: 21,
      embeddings: 64
    }
  ];
}
