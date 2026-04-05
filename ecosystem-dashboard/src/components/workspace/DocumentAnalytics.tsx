/**
 * Document Analytics Component
 * Deep dive into PDF document contents with filtering, search, and drill-down
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Button,
  ButtonGroup,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Tooltip,
  useToast,
  Spinner,
  Center,
  Collapse,
  useDisclosure,
  Divider,
  Progress,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Textarea,
  Flex,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import {
  FiSearch,
  FiFilter,
  FiCopy,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiLayers,
  FiGrid,
  FiList,
  FiBook,
  FiHash,
  FiType,
  FiRefreshCw,
  FiDownload,
  FiMaximize2,
  FiX,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ChunkData {
  pk: string;
  text: string;
  page_number: number;
  content_type: string;
  filename: string;
  source_name: string;
}

interface DocumentSummary {
  filename: string;
  total_chunks: number;
  total_pages: number;
  page_range: { min: number; max: number };
  content_types: Record<string, number>;
  word_count: number;
}

interface AnalyticsData {
  collection_name: string;
  documents: DocumentSummary[];
  filtered: {
    total_chunks: number;
    returned_chunks: number;
    offset: number;
    limit: number;
    content_types: Record<string, number>;
    page_range: { min: number; max: number };
    total_pages: number;
    word_count: number;
  };
  chunks: ChunkData[];
}

interface DocumentAnalyticsProps {
  workspaceId?: string;
  onChunkSelect?: (chunk: ChunkData) => void;
  onClose?: () => void;
}

const CONTENT_TYPE_COLORS: Record<string, string> = {
  text: 'blue',
  structured: 'purple',
  table: 'green',
  chart: 'orange',
  image: 'pink',
};

export default function DocumentAnalytics({
  workspaceId = 'my_workspace',
  onChunkSelect,
  onClose,
}: DocumentAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  
  // Pagination
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  
  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Expanded chunk
  const [expandedChunk, setExpandedChunk] = useState<ChunkData | null>(null);
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  
  const toast = useToast();
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        offset: offset.toString(),
        limit: limit.toString(),
      });
      
      if (selectedDocument) params.append('document_name', selectedDocument);
      if (selectedPage) params.append('page', selectedPage);
      if (selectedType) params.append('content_type', selectedType);
      if (debouncedSearch) params.append('search', debouncedSearch);
      
      const response = await fetch(`/api/workspace-ai/pdf/analytics?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, selectedDocument, selectedPage, selectedType, debouncedSearch, offset, limit]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Copy text to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  }, [toast]);

  // Open chunk in modal
  const openChunkModal = useCallback((chunk: ChunkData) => {
    setExpandedChunk(chunk);
    onModalOpen();
  }, [onModalOpen]);

  // Pagination handlers
  const handlePrevPage = () => setOffset(Math.max(0, offset - limit));
  const handleNextPage = () => {
    if (data && offset + limit < data.filtered.total_chunks) {
      setOffset(offset + limit);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSelectedDocument('');
    setSelectedPage('');
    setSelectedType('');
    setSearchQuery('');
    setOffset(0);
  };

  if (error && !data) {
    return (
      <Center h="400px">
        <VStack spacing={4}>
          <Text color="red.400">{error}</Text>
          <Button onClick={fetchAnalytics} leftIcon={<FiRefreshCw />} colorScheme="blue" size="sm">
            Retry
          </Button>
        </VStack>
      </Center>
    );
  }

  return (
    <Box h="100%" overflow="hidden">
      <VStack spacing={4} align="stretch" h="100%">
        {/* Header */}
        <HStack justify="space-between" px={4} pt={4}>
          <HStack spacing={3}>
            <FiBook size={24} />
            <VStack align="start" spacing={0}>
              <Heading size="md">Document Analytics</Heading>
              <Text fontSize="sm" color={mutedColor}>
                {data?.documents.length || 0} documents • {data?.filtered.total_chunks || 0} chunks
              </Text>
            </VStack>
          </HStack>
          <HStack>
            <Tooltip label="Refresh">
              <IconButton
                aria-label="Refresh"
                icon={<FiRefreshCw />}
                onClick={fetchAnalytics}
                isLoading={loading}
                size="sm"
                variant="ghost"
              />
            </Tooltip>
            {onClose && (
              <IconButton
                aria-label="Close"
                icon={<FiX />}
                onClick={onClose}
                size="sm"
                variant="ghost"
              />
            )}
          </HStack>
        </HStack>

        {/* Document Overview Cards */}
        {data?.documents && data.documents.length > 0 && (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3} px={4}>
            {data.documents.map((doc) => (
              <Card
                key={doc.filename}
                bg={selectedDocument === doc.filename ? 'blue.50' : cardBg}
                borderColor={selectedDocument === doc.filename ? 'blue.400' : borderColor}
                borderWidth={1}
                cursor="pointer"
                onClick={() => setSelectedDocument(selectedDocument === doc.filename ? '' : doc.filename)}
                _hover={{ borderColor: 'blue.300' }}
                size="sm"
              >
                <CardBody py={3}>
                  <VStack align="start" spacing={2}>
                    <HStack justify="space-between" w="100%">
                      <Text fontWeight="600" fontSize="sm" noOfLines={1}>
                        {doc.filename.replace('.pdf', '')}
                      </Text>
                      <Badge colorScheme="blue" fontSize="xs">{doc.total_pages} pages</Badge>
                    </HStack>
                    <HStack spacing={4} fontSize="xs" color={mutedColor}>
                      <HStack>
                        <FiLayers size={12} />
                        <Text>{doc.total_chunks} chunks</Text>
                      </HStack>
                      <HStack>
                        <FiType size={12} />
                        <Text>{doc.word_count.toLocaleString()} words</Text>
                      </HStack>
                    </HStack>
                    <Wrap spacing={1}>
                      {Object.entries(doc.content_types).map(([type, count]) => (
                        <WrapItem key={type}>
                          <Badge
                            colorScheme={CONTENT_TYPE_COLORS[type] || 'gray'}
                            fontSize="xs"
                            variant="subtle"
                          >
                            {type}: {count}
                          </Badge>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        )}

        <Divider />

        {/* Filters */}
        <HStack px={4} spacing={3} flexWrap="wrap">
          <InputGroup size="sm" maxW="250px">
            <InputLeftElement>
              <FiSearch size={14} />
            </InputLeftElement>
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>

          <Select
            size="sm"
            maxW="120px"
            placeholder="Page"
            value={selectedPage}
            onChange={(e) => { setSelectedPage(e.target.value); setOffset(0); }}
          >
            {data?.filtered.page_range && Array.from(
              { length: data.filtered.page_range.max - data.filtered.page_range.min + 1 },
              (_, i) => data.filtered.page_range.min + i
            ).slice(0, 100).map((p) => (
              <option key={p} value={p}>Page {p + 1}</option>
            ))}
          </Select>

          <Select
            size="sm"
            maxW="140px"
            placeholder="Content type"
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setOffset(0); }}
          >
            {data?.filtered.content_types && Object.keys(data.filtered.content_types).map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>

          {(selectedDocument || selectedPage || selectedType || searchQuery) && (
            <Button size="sm" variant="ghost" onClick={resetFilters} leftIcon={<FiX />}>
              Clear
            </Button>
          )}

          <Box flex={1} />

          <ButtonGroup size="sm" isAttached variant="outline">
            <IconButton
              aria-label="List view"
              icon={<FiList />}
              isActive={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            />
            <IconButton
              aria-label="Grid view"
              icon={<FiGrid />}
              isActive={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
            />
          </ButtonGroup>
        </HStack>

        {/* Results info */}
        <HStack px={4} justify="space-between">
          <Text fontSize="sm" color={mutedColor}>
            Showing {offset + 1}-{Math.min(offset + limit, data?.filtered.total_chunks || 0)} of {data?.filtered.total_chunks || 0} chunks
            {debouncedSearch && ` matching "${debouncedSearch}"`}
          </Text>
          <HStack>
            <IconButton
              aria-label="Previous"
              icon={<FiChevronLeft />}
              size="sm"
              variant="ghost"
              isDisabled={offset === 0}
              onClick={handlePrevPage}
            />
            <IconButton
              aria-label="Next"
              icon={<FiChevronRight />}
              size="sm"
              variant="ghost"
              isDisabled={!data || offset + limit >= data.filtered.total_chunks}
              onClick={handleNextPage}
            />
          </HStack>
        </HStack>

        {/* Chunks List */}
        <Box flex={1} overflow="auto" px={4} pb={4}>
          {loading ? (
            <Center h="200px">
              <Spinner size="lg" />
            </Center>
          ) : viewMode === 'list' ? (
            <VStack spacing={2} align="stretch">
              {data?.chunks.map((chunk) => (
                <Card
                  key={chunk.pk}
                  bg={cardBg}
                  borderColor={borderColor}
                  borderWidth={1}
                  size="sm"
                  _hover={{ borderColor: 'blue.300' }}
                >
                  <CardBody py={2} px={3}>
                    <VStack align="stretch" spacing={2}>
                      <HStack justify="space-between">
                        <HStack spacing={2}>
                          <Badge colorScheme="gray" fontSize="xs">
                            Page {chunk.page_number + 1}
                          </Badge>
                          <Badge
                            colorScheme={CONTENT_TYPE_COLORS[chunk.content_type] || 'gray'}
                            fontSize="xs"
                          >
                            {chunk.content_type}
                          </Badge>
                        </HStack>
                        <HStack spacing={1}>
                          <Tooltip label="Copy text">
                            <IconButton
                              aria-label="Copy"
                              icon={<FiCopy />}
                              size="xs"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(chunk.text); }}
                            />
                          </Tooltip>
                          <Tooltip label="Expand">
                            <IconButton
                              aria-label="Expand"
                              icon={<FiMaximize2 />}
                              size="xs"
                              variant="ghost"
                              onClick={() => openChunkModal(chunk)}
                            />
                          </Tooltip>
                        </HStack>
                      </HStack>
                      <Text
                        fontSize="sm"
                        noOfLines={3}
                        cursor="pointer"
                        onClick={() => openChunkModal(chunk)}
                        _hover={{ color: 'blue.500' }}
                      >
                        {chunk.text}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
              {data?.chunks.map((chunk) => (
                <Card
                  key={chunk.pk}
                  bg={cardBg}
                  borderColor={borderColor}
                  borderWidth={1}
                  size="sm"
                  cursor="pointer"
                  onClick={() => openChunkModal(chunk)}
                  _hover={{ borderColor: 'blue.300' }}
                >
                  <CardBody py={2} px={3}>
                    <VStack align="stretch" spacing={2}>
                      <HStack justify="space-between">
                        <Badge colorScheme="gray" fontSize="xs">P{chunk.page_number + 1}</Badge>
                        <Badge
                          colorScheme={CONTENT_TYPE_COLORS[chunk.content_type] || 'gray'}
                          fontSize="xs"
                        >
                          {chunk.content_type}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" noOfLines={4}>
                        {chunk.text}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Box>
      </VStack>

      {/* Chunk Detail Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack justify="space-between">
              <VStack align="start" spacing={0}>
                <Text>Chunk Details</Text>
                <HStack spacing={2}>
                  <Badge colorScheme="gray">Page {(expandedChunk?.page_number || 0) + 1}</Badge>
                  <Badge colorScheme={CONTENT_TYPE_COLORS[expandedChunk?.content_type || ''] || 'gray'}>
                    {expandedChunk?.content_type}
                  </Badge>
                </HStack>
              </VStack>
              <HStack>
                <Tooltip label="Copy text">
                  <IconButton
                    aria-label="Copy"
                    icon={<FiCopy />}
                    size="sm"
                    onClick={() => expandedChunk && copyToClipboard(expandedChunk.text)}
                  />
                </Tooltip>
              </HStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontSize="xs" color={mutedColor} mb={1}>Source</Text>
                <Text fontSize="sm">{expandedChunk?.filename}</Text>
              </Box>
              <Box>
                <Text fontSize="xs" color={mutedColor} mb={1}>Content</Text>
                <Box
                  bg="gray.50"
                  _dark={{ bg: 'gray.800' }}
                  p={4}
                  borderRadius="md"
                  maxH="400px"
                  overflow="auto"
                >
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {expandedChunk?.text}
                  </Text>
                </Box>
              </Box>
              <HStack justify="flex-end">
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={() => {
                    onChunkSelect?.(expandedChunk!);
                    onModalClose();
                  }}
                >
                  Use in Assignment
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
