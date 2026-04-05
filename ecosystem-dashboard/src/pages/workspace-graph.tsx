/**
 * Workspace Document Graph Page
 * Minimalist 3D visualization of document knowledge graph
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Tooltip,
  Select,
  Badge,
  Spinner,
} from '@chakra-ui/react';
import { FiUpload, FiArrowLeft, FiBarChart2 } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DocumentGraph3D from '@/components/workspace/DocumentGraph3D';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';

interface Collection {
  collection_name: string;
  num_entities: number;
}

interface Document {
  document_name: string;
  chunk_count?: number;
}

export default function WorkspaceGraphPage() {
  const [workspaceId, setWorkspaceId] = useState('my_workspace');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | undefined>(undefined);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [graphData, setGraphData] = useState<any>(null);

  // Right panel context for Graph Tutor
  const { setContext, setCustomData, setActiveTab } = useRightPanel();

  // Set context to knowledge-graph on mount
  useEffect(() => {
    setContext('knowledge-graph');
    setActiveTab('graph-tutor');
  }, [setContext, setActiveTab]);

  // Handle node selection - update right panel with node info
  const handleNodeSelect = useCallback((node: any) => {
    if (!node || !graphData) return;
    
    // Find connected nodes
    const connectedNodes: any[] = [];
    graphData.links?.forEach((link: any) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
      
      if (sourceId === node.id) {
        const targetNode = graphData.nodes?.find((n: any) => n.id === targetId);
        if (targetNode) {
          connectedNodes.push({ ...targetNode, relationLabel: link.label });
        }
      } else if (targetId === node.id) {
        const sourceNode = graphData.nodes?.find((n: any) => n.id === sourceId);
        if (sourceNode) {
          connectedNodes.push({ ...sourceNode, relationLabel: link.label });
        }
      }
    });

    // Update right panel with selected node data
    setCustomData({
      type: 'node-selected',
      selectedNode: node,
      connectedNodes,
      graphStats: graphData.stats,
      nodeTypes: graphData.stats?.node_types || {},
      workspaceId,
      documentId: selectedDocument,
    });
    setActiveTab('graph-tutor');
  }, [graphData, setCustomData, setActiveTab, workspaceId, selectedDocument]);

  // Handle graph data loaded
  const handleGraphLoaded = useCallback((data: any) => {
    setGraphData(data);
    // Update explorer panel with stats
    setCustomData({
      graphStats: data.stats,
      nodeTypes: data.stats?.node_types || {},
    });
  }, [setCustomData]);

  // Fetch available collections on mount
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await fetch('/api/workspace-ai/pdf/collections');
        if (res.ok) {
          const data = await res.json();
          // Filter to only workspace_ collections with entities
          const workspaceCollections = (data.collections || [])
            .filter((c: Collection) => c.collection_name.startsWith('workspace_') && c.num_entities > 0);
          setCollections(workspaceCollections);
          // Auto-select first collection with data
          if (workspaceCollections.length > 0) {
            const firstCollection = workspaceCollections[0].collection_name.replace('workspace_', '');
            setWorkspaceId(firstCollection);
          }
        }
      } catch (err) {
        console.error('Failed to fetch collections:', err);
      } finally {
        setLoadingCollections(false);
      }
    };
    fetchCollections();
  }, []);

  // Fetch documents when workspace changes
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!workspaceId) return;
      setLoadingDocuments(true);
      try {
        const res = await fetch(`/api/workspace-ai/pdf/documents?workspace_id=${workspaceId}`);
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents || []);
          // Auto-select first document for better graph
          if (data.documents?.length > 0) {
            setSelectedDocument(data.documents[0].document_name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch documents:', err);
      } finally {
        setLoadingDocuments(false);
      }
    };
    fetchDocuments();
  }, [workspaceId]);

  // Semantic tokens
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  const handleUploadClick = () => {
    window.location.href = '/workspace-ai';
  };

  const handleBackClick = () => {
    window.location.href = '/workspace-ai';
  };

  return (
    <DashboardLayout>
      <Box h="calc(100vh - 70px)" overflow="hidden" position="relative">
        {/* Minimal Header Overlay */}
        <HStack
          position="absolute"
          top={4}
          left={4}
          right={4}
          zIndex={20}
          justify="space-between"
          pointerEvents="none"
        >
          {/* Left - Back & Title & Collection Selector */}
          <HStack spacing={3} pointerEvents="auto">
            <Tooltip label="Back to Workspace AI" fontSize="xs">
              <IconButton
                aria-label="Back"
                icon={<FiArrowLeft size={16} />}
                onClick={handleBackClick}
                size="sm"
                variant="ghost"
                bg="rgba(0,0,0,0.3)"
                color="white"
                backdropFilter="blur(8px)"
                _hover={{ bg: 'rgba(0,0,0,0.5)' }}
              />
            </Tooltip>
            <VStack align="start" spacing={0}>
              <Text fontSize="md" fontWeight="600" color="white" textShadow="0 1px 3px rgba(0,0,0,0.5)">
                Knowledge Graph
              </Text>
              <Text fontSize="xs" color="rgba(255,255,255,0.6)">
                PDF Document Visualization
              </Text>
            </VStack>
            
            {/* Document Selector */}
            {loadingCollections || loadingDocuments ? (
              <Spinner size="sm" color="white" />
            ) : documents.length > 0 ? (
              <Select
                size="sm"
                w="280px"
                value={selectedDocument || ''}
                onChange={(e) => setSelectedDocument(e.target.value || undefined)}
                bg="rgba(0,0,0,0.4)"
                backdropFilter="blur(8px)"
                border="1px solid rgba(255,255,255,0.2)"
                color="white"
                fontSize="xs"
                _hover={{ borderColor: 'rgba(255,255,255,0.4)' }}
                sx={{ option: { bg: '#1a1a1a', color: 'white' } }}
              >
                <option value="">All Documents</option>
                {documents.map((doc) => (
                  <option key={doc.document_name} value={doc.document_name}>
                    📄 {doc.document_name.replace('.pdf', '').slice(0, 40)}
                  </option>
                ))}
              </Select>
            ) : (
              <Badge colorScheme="yellow" fontSize="xs">No documents uploaded</Badge>
            )}
          </HStack>

          {/* Right - Analytics & Upload */}
          <HStack spacing={2} pointerEvents="auto">
            <Tooltip label="Document Analytics" fontSize="xs">
              <IconButton
                aria-label="Analytics"
                icon={<FiBarChart2 size={16} />}
                onClick={() => window.location.href = '/workspace-analytics'}
                size="sm"
                variant="ghost"
                bg="rgba(16, 185, 129, 0.3)"
                color="white"
                backdropFilter="blur(8px)"
                _hover={{ bg: 'rgba(16, 185, 129, 0.5)' }}
              />
            </Tooltip>
            <Tooltip label="Upload PDF to Workspace AI" fontSize="xs">
              <IconButton
                aria-label="Upload PDF"
                icon={<FiUpload size={16} />}
                onClick={handleUploadClick}
                size="sm"
                variant="ghost"
                bg="rgba(59, 130, 246, 0.3)"
                color="white"
                backdropFilter="blur(8px)"
                _hover={{ bg: 'rgba(59, 130, 246, 0.5)' }}
              />
            </Tooltip>
          </HStack>
        </HStack>

        {/* Full-screen 3D Graph */}
        <DocumentGraph3D
          workspaceId={workspaceId}
          documentId={selectedDocument}
          height="100%"
          onNodeSelect={handleNodeSelect}
          onGraphLoaded={handleGraphLoaded}
        />
      </Box>
    </DashboardLayout>
  );
}
