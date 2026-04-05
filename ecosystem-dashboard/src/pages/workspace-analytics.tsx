/**
 * Workspace Document Analytics Page
 * Full-featured document analysis and exploration tool
 */

import React, { useState, useEffect } from 'react';
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
  useToast,
} from '@chakra-ui/react';
import { FiArrowLeft, FiUpload, FiGrid } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DocumentAnalytics from '@/components/workspace/DocumentAnalytics';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Collection {
  collection_name: string;
  num_entities: number;
}

export default function WorkspaceAnalyticsPage() {
  const [workspaceId, setWorkspaceId] = useState('my_workspace');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const toast = useToast();

  // Fetch available collections on mount
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await fetch('/api/workspace-ai/pdf/collections');
        if (res.ok) {
          const data = await res.json();
          const workspaceCollections = (data.collections || [])
            .filter((c: Collection) => c.collection_name.startsWith('workspace_') && c.num_entities > 0);
          setCollections(workspaceCollections);
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

  const handleBackClick = () => {
    window.location.href = '/workspace-ai';
  };

  const handleGraphClick = () => {
    window.location.href = '/workspace-graph';
  };

  const handleUploadClick = () => {
    window.location.href = '/workspace-ai';
  };

  const handleChunkSelect = (chunk: any) => {
    // Copy chunk text and show toast
    navigator.clipboard.writeText(chunk.text);
    toast({
      title: 'Chunk copied',
      description: 'Text copied to clipboard. You can paste it into an assignment.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <DashboardLayout>
      <Box h="calc(100vh - 70px)" overflow="hidden" display="flex" flexDirection="column">
        {/* Header */}
        <HStack
          px={4}
          py={3}
          borderBottomWidth={1}
          borderColor="gray.200"
          justify="space-between"
          bg="white"
          _dark={{ borderColor: 'gray.700', bg: 'gray.900' }}
        >
          <HStack spacing={3}>
            <Tooltip label="Back to Workspace AI" fontSize="xs">
              <IconButton
                aria-label="Back"
                icon={<FiArrowLeft size={18} />}
                onClick={handleBackClick}
                size="sm"
                variant="ghost"
              />
            </Tooltip>
            <VStack align="start" spacing={0}>
              <Text fontSize="lg" fontWeight="600">
                Document Analytics
              </Text>
              <Text fontSize="xs" color="gray.500">
                Explore, search, and analyze your PDF documents
              </Text>
            </VStack>
          </HStack>

          <HStack spacing={3}>
            {/* Collection Selector */}
            {loadingCollections ? (
              <Spinner size="sm" />
            ) : collections.length > 0 ? (
              <Select
                size="sm"
                w="220px"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
              >
                {collections.map((c) => (
                  <option key={c.collection_name} value={c.collection_name.replace('workspace_', '')}>
                    {c.collection_name.replace('workspace_', '')} ({c.num_entities} chunks)
                  </option>
                ))}
              </Select>
            ) : (
              <Badge colorScheme="yellow" fontSize="xs">No documents</Badge>
            )}

            <Tooltip label="View Knowledge Graph" fontSize="xs">
              <IconButton
                aria-label="Graph"
                icon={<FiGrid size={18} />}
                onClick={handleGraphClick}
                size="sm"
                variant="ghost"
              />
            </Tooltip>

            <Tooltip label="Upload PDF" fontSize="xs">
              <IconButton
                aria-label="Upload"
                icon={<FiUpload size={18} />}
                onClick={handleUploadClick}
                size="sm"
                colorScheme="blue"
                variant="solid"
              />
            </Tooltip>
          </HStack>
        </HStack>

        {/* Analytics Content */}
        <Box flex={1} overflow="hidden">
          <DocumentAnalytics
            workspaceId={workspaceId}
            onChunkSelect={handleChunkSelect}
          />
        </Box>
      </Box>
    </DashboardLayout>
  );
}
