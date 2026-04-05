/**
 * File Detail Modal Component - Chakra UI Version
 * Detailed view of a file with statistics, search, and chunk exploration
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Spinner,
  SimpleGrid,
  Badge,
  Divider,
  useToast,
} from '@chakra-ui/react';
import { FiArrowLeft, FiSearch, FiCheck } from 'react-icons/fi';
import { FileMetadata } from '@/lib/workspace/file-upload-handler';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface FileDetailModalProps {
  fileId: string;
  workspaceId: string;
  onClose: () => void;
}

interface FileStats {
  totalChunks: number;
  avgChunkLength: number;
  coverage: { min: number; max: number };
}

interface SearchResult {
  chunkIndex: number;
  chunkText: string;
  pageNumber: number;
  distance: number;
  metadata: Record<string, any>;
}

export default function FileDetailModal({ fileId, workspaceId, onClose }: FileDetailModalProps) {
  const [file, setFile] = useState<FileMetadata | null>(null);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchFileDetails();
  }, [fileId]);

  const fetchFileDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/workspace-ai/files/${fileId}?includeStats=true`
      );

      if (!response.ok) {
        throw new Error('Failed to load file details');
      }

      const data = await response.json();

      if (data.success && data.file) {
        setFile(data.file);
        setStats(data.file.stats || null);
      } else {
        throw new Error(data.error || 'Failed to load file');
      }
    } catch (err) {
      console.error('Error fetching file details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);

      const response = await fetch('/api/workspace-ai/search-in-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          query: searchQuery,
          limit: 5,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();

      if (data.success) {
        setSearchResults(data.results || []);
      }
    } catch (err) {
      toast({
        title: 'Search failed',
        description: err instanceof Error ? err.message : 'Failed to search file',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSearching(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getMatchPercentage = (distance: number) => {
    // Convert cosine distance to similarity percentage
    const similarity = Math.max(0, Math.min(1, 1 - distance / 2));
    return Math.round(similarity * 100);
  };

  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalBody py={12}>
            <VStack>
              <Spinner size="xl" color="blue.500" thickness="4px" />
              <Text mt={4} color={useSemanticToken('text.secondary')}>
                Loading file details...
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  if (error || !file) {
    return (
      <Modal isOpen={true} onClose={onClose} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalBody p={8} textAlign="center">
            <Text color="red.500">{error || 'File not found'}</Text>
            <Button mt={4} onClick={onClose} variant="outline">
              Close
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} size="4xl">
      <ModalOverlay />
      <ModalContent maxH="90vh" overflow="hidden" display="flex" flexDirection="column">
        <ModalHeader borderBottom="1px solid" borderColor={useSemanticToken('border.default')}>
          <VStack align="start" spacing={2}>
            <Button
              leftIcon={<FiArrowLeft />}
              variant="ghost"
              size="sm"
              onClick={onClose}
              mb={2}
            >
              Back to Files
            </Button>
            <Text fontSize="2xl" fontWeight="semibold" noOfLines={1}>
              {file.fileName}
            </Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody flex={1} overflow="auto">
          <VStack spacing={6} align="stretch" pb={6}>
            {/* File Statistics */}
            <Box p={6} bg={useSemanticToken('surface.base')} borderRadius="md" border="1px solid" borderColor={useSemanticToken('border.default')}>
              <Text fontSize="lg" fontWeight="semibold" mb={4}>
                📊 File Statistics
              </Text>
              
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Size</Text>
                  <Text fontSize="lg" fontWeight="semibold" mt={1}>
                    {formatFileSize(file.fileSize)}
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Type</Text>
                  <Text fontSize="sm" fontWeight="medium" mt={1}>
                    {file.fileType.split('/').pop()?.toUpperCase()}
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Uploaded</Text>
                  <Text fontSize="sm" fontWeight="medium" mt={1}>
                    {formatDate(file.uploadedAt)}
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Status</Text>
                  <Box mt={1}>
                    {file.vectorized ? (
                      <Badge colorScheme="green" display="flex" alignItems="center" gap={1} w="fit-content">
                        <FiCheck />
                        Vectorized
                      </Badge>
                    ) : (
                      <Badge colorScheme="yellow">Processing</Badge>
                    )}
                  </Box>
                </Box>
              </SimpleGrid>

              {stats && (
                <>
                  <Divider my={6} />
                  <Text fontSize="sm" fontWeight="semibold" mb={3}>
                    📦 Embedding Details
                  </Text>
                  <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
                    <Box>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Total Chunks</Text>
                      <Text fontSize="lg" fontWeight="semibold" mt={1}>
                        {stats.totalChunks}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Avg Length</Text>
                      <Text fontSize="lg" fontWeight="semibold" mt={1}>
                        {stats.avgChunkLength} chars
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Model</Text>
                      <Text fontSize="sm" fontWeight="medium" mt={1}>
                        text-embedding-004
                      </Text>
                    </Box>
                  </SimpleGrid>
                </>
              )}
            </Box>

            {/* Search Within File */}
            <Box>
              <Text fontSize="lg" fontWeight="semibold" mb={3}>
                🔍 Search within this file
              </Text>
              
              <Box as="form" onSubmit={handleSearch}>
                <HStack spacing={2}>
                  <Input
                    placeholder="e.g., authentication methods..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button
                    type="submit"
                    colorScheme="blue"
                    isLoading={searching}
                    isDisabled={!searchQuery.trim()}
                  >
                    Search
                  </Button>
                </HStack>
              </Box>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <VStack spacing={3} align="stretch" mt={4}>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    Found {searchResults.length} relevant section{searchResults.length > 1 ? 's' : ''}
                  </Text>
                  
                  {searchResults.map((result, index) => (
                    <Box
                      key={index}
                      p={4}
                      border="1px solid"
                      borderColor={useSemanticToken('border.default')}
                      borderRadius="md"
                      bg={useSemanticToken('surface.elevated')}
                      transition="all 0.2s"
                      _hover={{ borderColor: 'blue.400', shadow: 'md' }}
                    >
                      <HStack justify="space-between" mb={2}>
                        <Badge colorScheme="blue">
                          🎯 {getMatchPercentage(result.distance)}% match
                        </Badge>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                          Page {result.pageNumber}, Chunk {result.chunkIndex + 1}
                        </Text>
                      </HStack>
                      
                      <Text fontSize="sm" lineHeight="relaxed">
                        {result.chunkText.length > 300
                          ? `${result.chunkText.substring(0, 300)}...`
                          : result.chunkText}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              )}

              {searchQuery && searchResults.length === 0 && !searching && (
                <Box
                  mt={4}
                  p={6}
                  border="1px solid"
                  borderColor={useSemanticToken('border.default')}
                  borderRadius="md"
                  bg={useSemanticToken('surface.base')}
                  textAlign="center"
                >
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    No results found for "{searchQuery}"
                  </Text>
                </Box>
              )}
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
