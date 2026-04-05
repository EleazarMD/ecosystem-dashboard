import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { ecosystemApi, knowledgeApi } from '@/lib/api';
import { marked } from 'marked';
import useAHISDetection from '@/hooks/useAHISDetection';
import {
  Box,
  Heading,
  Input,
  Wrap,
  Tag as ChakraTag, 
  Button,
  Spinner,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure, 
  VStack,
  HStack,
  Select,
  Text,
  useToast,
  Grid,
  GridItem,
  Flex,
  Icon,
  Badge,
  Progress,
  Divider,
  IconButton,
  Tooltip,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  InputGroup,
  InputLeftElement,
  InputRightElement,
} from '@chakra-ui/react';
import {
  DocumentTextIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ClockIcon,
  TagIcon,
  FolderIcon,
  ArrowPathIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  CpuChipIcon,
  CloudArrowUpIcon,
  DocumentPlusIcon,
  BeakerIcon,
  CogIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  StopIcon,
  DocumentMagnifyingGlassIcon,
  ServerIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface DocumentationEntry {
  id: number;
  title: string;
  path: string;
  project_id: string | null;
  tags: string; 
  last_updated: string;
}

interface ScanResult {
  path: string;
  type: 'markdown' | 'text' | 'code' | 'config';
  size: number;
  lastModified: string;
  status: 'new' | 'updated' | 'existing';
  project?: string;
  estimatedTokens?: number;
}

interface ProjectScanStatus {
  project: string;
  path: string;
  status: 'scanning' | 'complete' | 'error';
  found: number;
  processed: number;
  errors: string[];
}

const DocumentationPage: React.FC = () => {
  const [documentation, setDocumentation] = useState<DocumentationEntry[]>([]);
  const [filteredDocumentation, setFilteredDocumentation] = useState<DocumentationEntry[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [selectedDocTitle, setSelectedDocTitle] = useState<string | null>(null);
  const [selectedDocContent, setSelectedDocContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Enhanced functionality state
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [projectScans, setProjectScans] = useState<ProjectScanStatus[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [pendingIngestion, setPendingIngestion] = useState<ScanResult[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestionProgress, setIngestionProgress] = useState(0);
  const [selectedScanResults, setSelectedScanResults] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'documents' | 'scanner' | 'ingestion'>('documents');

  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const { isOpen: isScanModalOpen, onOpen: onScanModalOpen, onClose: onScanModalClose } = useDisclosure();
  const { isOpen: isIngestionModalOpen, onOpen: onIngestionModalOpen, onClose: onIngestionModalClose } = useDisclosure();
  const toast = useToast();
  
  // AHIS Integration
  const { isAvailable: ahisAvailable, isDetecting, error: ahisError, checkAgain: recheckAhis } = useAHISDetection();
  
  // Color mode values
  const bgGradient = 'linear(135deg, blue.50 0%, purple.50 100%)';
  const borderColor = useSemanticToken('border.default');
  
  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast({
      title: 'Documentation refreshed',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ecosystemApi.getAllDocumentation(); 
      
      if (response?.success && Array.isArray(response.data)) {
          const docs: DocumentationEntry[] = response.data;
          setDocumentation(docs);

          const tagsSet = new Set<string>();
          docs.forEach((doc) => {
            if (doc.tags) {
              doc.tags.split(',').forEach(tag => {
                const trimmedTag = tag.trim();
                if (trimmedTag) {
                  tagsSet.add(trimmedTag);
                }
              });
            }
          });
          setAllTags(Array.from(tagsSet).sort());
      } else {
        throw new Error(response?.message || 'Failed to fetch documentation list or data is not an array.');
      }

    } catch (err: any) {
      console.error('Error fetching documentation list:', err);
      setError(err.message || 'Failed to load documentation.');
      setDocumentation([]); 
      setAllTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Enhanced AI Homelab Functionality - Real API Integration
  const handleEcosystemScan = async () => {
    if (!ahisAvailable) {
      toast({
        title: 'AHIS Required',
        description: 'AHIS server must be running to scan the ecosystem',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanResults([]);
    setProjectScans([]);
    onScanModalOpen();

    try {
      // Real AHIS ecosystem scanning
      const scanResponse = await knowledgeApi.scanEcosystemDocuments();
      
      if (!scanResponse.success) {
        throw new Error(scanResponse.error || 'Failed to initiate ecosystem scan');
      }

      const projects = ['ai-gateway', 'knowledge-graph', 'ecosystem-dashboard', 'authentik', 'monitoring'];
      const totalProjects = projects.length;
      
      // Process scan results from AHIS
      const scanData = scanResponse.data;
      
      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const scanStatus: ProjectScanStatus = {
          project,
          path: `/Users/eleazar/Projects/AIHomelab/${project}`,
          status: 'scanning',
          found: 0,
          processed: 0,
          errors: []
        };
        
        setProjectScans(prev => [...prev.filter(p => p.project !== project), scanStatus]);
        
        // Simulate processing delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Filter scan results for this project
        const projectResults = scanData.filter((result: any) => 
          result.project === project || result.path.includes(project)
        );
        
        // Convert API results to our ScanResult format
        const formattedResults: ScanResult[] = projectResults.map((result: any) => ({
          path: result.path || `${project}/${result.filename}`,
          type: result.type || 'markdown',
          size: result.size || 2048,
          lastModified: result.lastModified || new Date().toISOString(),
          status: result.status || 'new',
          project: result.project || project,
          estimatedTokens: result.estimatedTokens || Math.floor(result.size / 4) || 512
        }));
        
        setScanResults(prev => [...prev, ...formattedResults]);
        
        const completedStatus: ProjectScanStatus = {
          ...scanStatus,
          status: 'complete',
          found: formattedResults.length,
          processed: formattedResults.length,
          errors: result.errors || []
        };
        
        setProjectScans(prev => [...prev.filter(p => p.project !== project), completedStatus]);
        setScanProgress(((i + 1) / totalProjects) * 100);
      }
      
      toast({
        title: 'Ecosystem Scan Complete',
        description: `Found ${scanResults.length} documents across ${projects.length} projects`,
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Ecosystem scan error:', error);
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handlePrepareForIngestion = () => {
    const newDocuments = scanResults.filter(result => result.status === 'new' || result.status === 'updated');
    setPendingIngestion(newDocuments);
    setSelectedScanResults(newDocuments.map(doc => doc.path));
    onIngestionModalOpen();
  };

  const handleBulkIngestion = async () => {
    if (pendingIngestion.length === 0) return;
    
    setIsIngesting(true);
    setIngestionProgress(0);
    
    try {
      // Filter selected documents
      const selectedDocuments = pendingIngestion.filter(doc => 
        selectedScanResults.includes(doc.path)
      );
      
      if (selectedDocuments.length === 0) {
        throw new Error('No documents selected for ingestion');
      }
      
      // Step 1: Prepare documents for ingestion
      setIngestionProgress(10);
      const preparationResponse = await knowledgeApi.prepareDocumentsForIngestion(
        selectedDocuments.map(doc => doc.path)
      );
      
      if (!preparationResponse.success) {
        throw new Error(preparationResponse.error || 'Failed to prepare documents');
      }
      
      setIngestionProgress(30);
      
      // Step 2: Ingest documents into Knowledge Graph
      const ingestionResponse = await knowledgeApi.ingestDocuments(selectedDocuments);
      
      if (!ingestionResponse.success) {
        throw new Error(ingestionResponse.error || 'Failed to ingest documents');
      }
      
      setIngestionProgress(60);
      
      // Step 3: Monitor ingestion progress if async
      const ingestionId = ingestionResponse.data?.ingestion_id;
      if (ingestionId) {
        let completed = false;
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max
        
        while (!completed && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const progressResponse = await knowledgeApi.getIngestionProgress(ingestionId);
          if (progressResponse.success && progressResponse.data) {
            const progress = progressResponse.data.progress || 60;
            setIngestionProgress(Math.min(progress, 95));
            
            if (progressResponse.data.status === 'completed') {
              completed = true;
              setIngestionProgress(100);
            } else if (progressResponse.data.status === 'failed') {
              throw new Error(progressResponse.data.error || 'Ingestion failed');
            }
          }
          attempts++;
        }
        
        if (!completed) {
          console.warn('Ingestion may still be in progress');
        }
      } else {
        // Synchronous ingestion completed
        setIngestionProgress(100);
      }
      
      toast({
        title: 'Ingestion Complete',
        description: `Successfully ingested ${selectedDocuments.length} documents into Knowledge Graph`,
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      
      // Refresh documentation list
      await fetchData();
      setPendingIngestion([]);
      setSelectedScanResults([]);
      onIngestionModalClose();
      
    } catch (error) {
      console.error('Ingestion error:', error);
      toast({
        title: 'Ingestion Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsIngesting(false);
    }
  };

  const handleToggleSelection = (path: string) => {
    setSelectedScanResults(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uniqueProjectIds = useMemo(() => {
    const ids = new Set<string>();
    documentation.forEach(doc => {
      if (doc.project_id) {
        ids.add(doc.project_id);
      }
    });
    return Array.from(ids).sort((a, b) => {
      if (a === '_ecosystem') return -1;
      if (b === '_ecosystem') return 1;
      return a.localeCompare(b);
    });
  }, [documentation]);

  useEffect(() => {
    let filtered = documentation;

    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.path.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(doc => 
        selectedTags.every(tag => 
          doc.tags?.split(',').map(t => t.trim()).includes(tag)
        )
      );
    }

    if (selectedProjectId !== 'all') {
      filtered = filtered.filter(doc => doc.project_id === selectedProjectId);
    }

    setFilteredDocumentation(filtered);
  }, [documentation, searchTerm, selectedTags, selectedProjectId]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleProjectFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProjectId(event.target.value);
  };

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleViewContent = async (docId: number, docTitle: string) => {
    setSelectedDocId(docId);
    setSelectedDocTitle(docTitle);
    setSelectedDocContent(null);
    setIsLoadingContent(true);
    setError(null);
    onModalOpen();

    try {
      const response = await knowledgeApi.getDocumentationContent(docId);
      if (response?.success && response.data?.content) {
        const htmlContent = await marked(response.data.content);
        setSelectedDocContent(htmlContent);
      } else {
        throw new Error(response?.message || 'Failed to fetch document content.');
      }
    } catch (err: any) {
      console.error('Error fetching document content:', err);
      setError(err.message || 'Failed to load document content.');
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleCloseModal = () => {
    onModalClose();
    setSelectedDocId(null);
    setSelectedDocTitle(null);
    setSelectedDocContent(null);
    setError(null);
  };

  const columns = useMemo(() => [
    { Header: 'Title', accessor: 'title' as keyof DocumentationEntry },
    { Header: 'Path', accessor: 'path' as keyof DocumentationEntry },
    {
      Header: 'Tags',
      accessor: 'tags' as keyof DocumentationEntry,
      Cell: ({ value }: { value?: string }) => (
        <Wrap spacing="1" maxH="50px" overflowY="auto">
          {value?.split(',').map((tag) => {
            const trimmedTag = tag.trim();
            return trimmedTag ? (
              <ChakraTag key={trimmedTag} size="sm" colorScheme="cyan">
                {trimmedTag}
              </ChakraTag>
            ) : null;
          })}
        </Wrap>
      ),
    },
    {
      Header: 'Last Updated',
      accessor: 'last_updated' as keyof DocumentationEntry,
      Cell: ({ value }: { value?: string }) => (value ? new Date(value).toLocaleString() : 'N/A'),
    },
    {
      Header: 'Actions',
      id: 'actions',
      Cell: ({ row }: { row: { original: DocumentationEntry } }) => (
        <Button
          size="xs"
          colorScheme="teal"
          onClick={() => handleViewContent(row.original.id, row.original.title)}
          isLoading={isLoadingContent && selectedDocId === row.original.id}
          isDisabled={isLoadingContent && selectedDocId === row.original.id}
        >
          View
        </Button>
      ),
    },
  ], [handleViewContent, isLoadingContent, selectedDocId]);

  return (
    <DashboardLayout>
      <Head>
        <title>Documentation - AI Homelab Ecosystem</title>
        <meta name="description" content="Comprehensive documentation for the AI Homelab Ecosystem" />
      </Head>
      
      {/* Hero Header Section */}
      <Box
        bgGradient={bgGradient}
        borderRadius="2xl"
        p={8}
        mb={8}
        position="relative"
        overflow="hidden"
      >
        {/* Decorative Elements */}
        <Box
          position="absolute"
          top="-20px"
          right="-20px"
          width="120px"
          height="120px"
          borderRadius="full"
          bg="whiteAlpha.100"
          filter="blur(40px)"
        />
        <Box
          position="absolute"
          bottom="-30px"
          left="-30px"
          width="80px"
          height="80px"
          borderRadius="full"
          bg="whiteAlpha.200"
          filter="blur(30px)"
        />
        
        <Flex justify="space-between" align="center" mb={6}>
          <VStack align="start" spacing={2}>
            <HStack>
              <Icon as={BookOpenIcon} boxSize={8} color="blue.600" />
              <Heading size="xl" color={useSemanticToken('text.primary')}>
                Documentation Center
              </Heading>
            </HStack>
            <Text fontSize="lg" color={useSemanticToken('text.secondary')} maxW="600px">
              AI-powered documentation discovery, scanning, and ingestion for the AI Homelab Ecosystem
            </Text>
            <HStack spacing={2}>
              <Badge colorScheme={ahisAvailable ? 'green' : 'red'} variant="subtle">
                <HStack spacing={1}>
                  <Icon as={ServerIcon} boxSize={3} />
                  <Text>AHIS {ahisAvailable ? 'Connected' : 'Disconnected'}</Text>
                </HStack>
              </Badge>
              <Badge colorScheme="blue" variant="subtle">
                <HStack spacing={1}>
                  <Icon as={CircleStackIcon} boxSize={3} />
                  <Text>Knowledge Graph Ready</Text>
                </HStack>
              </Badge>
            </HStack>
          </VStack>
          
          <VStack spacing={3} align="end">
            <HStack spacing={3}>
              <Tooltip label="Scan ecosystem for new documents">
                <Button
                  leftIcon={<DocumentMagnifyingGlassIcon />}
                  onClick={handleEcosystemScan}
                  isLoading={isScanning}
                  colorScheme="purple"
                  size="md"
                  isDisabled={!ahisAvailable}
                >
                  Scan Ecosystem
                </Button>
              </Tooltip>
              
              <Tooltip label="Prepare documents for ingestion">
                <Button
                  leftIcon={<CloudArrowUpIcon />}
                  onClick={handlePrepareForIngestion}
                  colorScheme="green"
                  size="md"
                  isDisabled={scanResults.length === 0}
                >
                  Prepare Ingestion
                </Button>
              </Tooltip>
              
              <Tooltip label="Refresh documentation">
                <IconButton
                  aria-label="Refresh"
                  icon={<ArrowPathIcon />}
                  onClick={handleRefresh}
                  isLoading={refreshing}
                  colorScheme="blue"
                  variant="ghost"
                  size="md"
                />
              </Tooltip>
            </HStack>
            
            <HStack spacing={2}>
              <Badge colorScheme="orange" px={2} py={1} borderRadius="full">
                <HStack spacing={1}>
                  <Icon as={BeakerIcon} boxSize={3} />
                  <Text>AI Agent Ready</Text>
                </HStack>
              </Badge>
              <Badge colorScheme="green" px={2} py={1} borderRadius="full">
                Live Data
              </Badge>
            </HStack>
          </VStack>
        </Flex>
        
        {/* Enhanced Statistics Cards */}
        <SimpleGrid columns={{ base: 2, md: 6 }} spacing={4}>
          <GlassPanel variant="light" p={4}>
            <Stat>
              <StatLabel color={useSemanticToken('text.secondary')}>
                <HStack>
                  <Icon as={DocumentTextIcon} boxSize={4} />
                  <Text>Total Docs</Text>
                </HStack>
              </StatLabel>
              <StatNumber color="blue.600">{documentation.length}</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                Active entries
              </StatHelpText>
            </Stat>
          </GlassPanel>
          
          <GlassPanel variant="light" p={4}>
            <Stat>
              <StatLabel color={useSemanticToken('text.secondary')}>
                <HStack>
                  <Icon as={FolderIcon} boxSize={4} />
                  <Text>Projects</Text>
                </HStack>
              </StatLabel>
              <StatNumber color="purple.600">{uniqueProjectIds.length}</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                Documented
              </StatHelpText>
            </Stat>
          </GlassPanel>
          
          <GlassPanel variant="light" p={4}>
            <Stat>
              <StatLabel color={useSemanticToken('text.secondary')}>
                <HStack>
                  <Icon as={TagIcon} boxSize={4} />
                  <Text>Tags</Text>
                </HStack>
              </StatLabel>
              <StatNumber color="green.600">{allTags.length}</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                Categories
              </StatHelpText>
            </Stat>
          </GlassPanel>
          
          <GlassPanel variant="light" p={4}>
            <Stat>
              <StatLabel color={useSemanticToken('text.secondary')}>
                <HStack>
                  <Icon as={CheckCircleIcon} boxSize={4} />
                  <Text>Filtered</Text>
                </HStack>
              </StatLabel>
              <StatNumber color="orange.600">{filteredDocumentation.length}</StatNumber>
              <StatHelpText>
                <StatArrow type={filteredDocumentation.length === documentation.length ? 'increase' : 'decrease'} />
                Showing
              </StatHelpText>
            </Stat>
          </GlassPanel>
          
          <GlassPanel variant="light" p={4}>
            <Stat>
              <StatLabel color={useSemanticToken('text.secondary')}>
                <HStack>
                  <Icon as={DocumentMagnifyingGlassIcon} boxSize={4} />
                  <Text>Scanned</Text>
                </HStack>
              </StatLabel>
              <StatNumber color="purple.600">{scanResults.length}</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                Found
              </StatHelpText>
            </Stat>
          </GlassPanel>
          
          <GlassPanel variant="light" p={4}>
            <Stat>
              <StatLabel color={useSemanticToken('text.secondary')}>
                <HStack>
                  <Icon as={CloudArrowUpIcon} boxSize={4} />
                  <Text>Pending</Text>
                </HStack>
              </StatLabel>
              <StatNumber color="cyan.600">{pendingIngestion.length}</StatNumber>
              <StatHelpText>
                <StatArrow type={pendingIngestion.length > 0 ? 'increase' : 'decrease'} />
                Ingestion
              </StatHelpText>
            </Stat>
          </GlassPanel>
        </SimpleGrid>
      </Box>
      
      {/* Main Content */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 300px' }} gap={8}>
        <GridItem>
          <GlassPanel variant="medium" p={6}>
            {/* Search and Filter Controls */}
            <VStack spacing={6} align="stretch">
              <HStack justify="space-between" align="center">
                <Heading size="md" color="gray.700">
                  <HStack>
                    <Icon as={DocumentDuplicateIcon} boxSize={5} />
                    <Text>Documentation Library</Text>
                  </HStack>
                </Heading>
                <Badge colorScheme="blue" variant="subtle">
                  {filteredDocumentation.length} of {documentation.length}
                </Badge>
              </HStack>
              
              <HStack spacing={4} wrap="wrap">
                <InputGroup maxW="400px">
                  <InputLeftElement>
                    <Icon as={MagnifyingGlassIcon} color={useSemanticToken('text.tertiary')} />
                  </InputLeftElement>
                  <Input
                    placeholder="Search documentation..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    bg={useSemanticToken('surface.elevated')}
                    borderColor={borderColor}
                  />
                  {searchTerm && (
                    <InputRightElement>
                      <IconButton
                        aria-label="Clear search"
                        icon={<Text fontSize="sm">×</Text>}
                        size="sm"
                        variant="ghost"
                        onClick={() => setSearchTerm('')}
                      />
                    </InputRightElement>
                  )}
                </InputGroup>
                
                <Select
                  placeholder="All Projects"
                  value={selectedProjectId}
                  onChange={handleProjectFilterChange}
                  maxW="200px"
                  bg={useSemanticToken('surface.elevated')}
                  borderColor={borderColor}
                >
                  {uniqueProjectIds.map((projectId) => (
                    <option key={projectId} value={projectId}>
                      {projectId === '_ecosystem' ? 'Ecosystem' : projectId}
                    </option>
                  ))}
                </Select>
              </HStack>

              {/* Tag Filtering */}
              <Box>
                <Heading as="h3" size="sm" mb={2}>Filter by Tags:</Heading>
                <Wrap spacing={2}>
                  {allTags.length > 0 ? (
                    allTags.map((tag) => (
                      <ChakraTag
                        key={tag}
                        size="md"
                        colorScheme={selectedTags.includes(tag) ? 'blue' : 'gray'}
                        cursor="pointer"
                        onClick={() => handleTagClick(tag)}
                        _hover={{ transform: 'scale(1.05)' }}
                      >
                        {tag}
                      </ChakraTag>
                    ))
                  ) : null}
                </Wrap>
              </Box>

              {error && !isModalOpen && (
                <Alert status="error" variant="subtle">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              <TableContainer borderWidth="1px" borderRadius="md">
                <Table variant="simple" size="sm">
                  <Thead bg={useSemanticToken('surface.base')}>
                    <Tr>
                      {columns.map((col) => (
                        <Th key={col.Header || col.id} py={3}>{col.Header}</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {loading ? (
                      <Tr><Td colSpan={columns.length} textAlign="center" py={10}><Spinner size="lg" /> <Text mt={2}>Loading documentation...</Text></Td></Tr>
                    ) : filteredDocumentation.length === 0 ? (
                      <Tr><Td colSpan={columns.length} textAlign="center" py={10}><Text>No documentation entries found matching your criteria.</Text></Td></Tr>
                    ) : (
                       filteredDocumentation.map((doc) => (
                        <Tr key={doc.id} _hover={{ bg: 'gray.50' }}>
                          {columns.map(col => {
                             const cellValue = doc[col.accessor as keyof DocumentationEntry];
                             return (
                               <Td key={col.Header || col.id} py={2} verticalAlign="top">
                                 {col.Cell ? col.Cell({ value: cellValue != null ? String(cellValue) : undefined, row: { original: doc } }) :
                                   (cellValue != null ? String(cellValue) : 'N/A')}
                               </Td>
                             );
                          })}
                        </Tr>
                       ))
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
            </VStack>
          </GlassPanel>
        </GridItem>
        
        {/* Sidebar */}
        <GridItem>
          <GlassPanel variant="light" p={6}>
            <VStack spacing={4} align="stretch">
              <Heading size="sm" color="gray.700">
                <HStack>
                  <Icon as={ChartBarIcon} boxSize={4} />
                  <Text>Quick Stats</Text>
                </HStack>
              </Heading>
              
              <Divider />
              
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Recent Updates</Text>
                  <Badge colorScheme="green" size="sm">Live</Badge>
                </HStack>
                
                <Progress 
                  value={(filteredDocumentation.length / documentation.length) * 100} 
                  colorScheme="blue" 
                  size="sm" 
                  borderRadius="full"
                />
                
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  Showing {filteredDocumentation.length} of {documentation.length} documents
                </Text>
              </VStack>
            </VStack>
          </GlassPanel>
        </GridItem>
      </Grid>

      {/* Modal for Document Content */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} size="3xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader borderBottomWidth="1px">{selectedDocTitle || 'Document Content'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            {isLoadingContent ? (
              <Box textAlign="center" p={10}><Spinner size="xl"/> <Text mt={3}>Loading content...</Text></Box>
            ) : selectedDocContent ? (
              <Box 
                className="markdown-body" 
                dangerouslySetInnerHTML={{ __html: selectedDocContent }}
                sx={{
                  '& h1, & h2, & h3, & h4': { my: 3 },
                  '& p': { mb: 2, lineHeight: 'tall' },
                  '& ul, & ol': { pl: 5, mb: 2 },
                  '& pre': { bg: 'gray.50', p: 3, borderRadius: 'md', overflowX: 'auto', mb: 3 },
                  '& code': { fontFamily: 'monospace', fontSize: 'sm' },
                  '& blockquote': { borderLeft: '4px solid', borderColor: 'gray.300', pl: 4, color: 'gray.600', m: 0, mb: 2 },
                  '& table': { borderCollapse: 'collapse', width: '100%', mb: 3 },
                  '& th, & td': { border: '1px solid', borderColor: 'gray.200', p: 2 },
                  '& th': { bg: 'gray.100', textAlign: 'left' },
                  '& img': { maxWidth: '100%', height: 'auto', my: 3 }
                }}
              />
            ) : (
              <Text textAlign="center" p={10}>Content could not be loaded or is empty.</Text>
            )}
            {error && isModalOpen && (
                <Alert status="error" mt={4} variant="subtle">
                    <AlertIcon />
                    {error}
                </Alert>
            )}
          </ModalBody>
          <ModalFooter borderTopWidth="1px">
            <Button variant="ghost" onClick={handleCloseModal}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Ecosystem Scanning Modal */}
      <Modal isOpen={isScanModalOpen} onClose={onScanModalClose} size="4xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader borderBottomWidth="1px">
            <HStack>
              <Icon as={DocumentMagnifyingGlassIcon} boxSize={6} color="purple.500" />
              <Text>AI Homelab Ecosystem Scanner</Text>
              <Badge colorScheme={ahisAvailable ? 'green' : 'red'} ml={2}>
                AHIS {ahisAvailable ? 'Connected' : 'Required'}
              </Badge>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack spacing={6} align="stretch">
              {/* Scan Progress */}
              <GlassPanel variant="light" p={4}>
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Ecosystem Scan Progress</Text>
                    <Badge colorScheme={isScanning ? 'blue' : scanResults.length > 0 ? 'green' : 'gray'}>
                      {isScanning ? 'Scanning...' : scanResults.length > 0 ? 'Complete' : 'Ready'}
                    </Badge>
                  </HStack>
                  <Progress value={scanProgress} colorScheme="purple" size="lg" borderRadius="full" />
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    {isScanning ? `Scanning projects... ${Math.round(scanProgress)}%` : 
                     scanResults.length > 0 ? `Found ${scanResults.length} documents` : 'Click "Scan Ecosystem" to discover new documents'}
                  </Text>
                </VStack>
              </GlassPanel>

              {/* Project Status */}
              {projectScans.length > 0 && (
                <GlassPanel variant="light" p={4}>
                  <VStack spacing={3} align="stretch">
                    <Text fontWeight="semibold">Project Scan Status</Text>
                    {projectScans.map((project) => (
                      <HStack key={project.project} justify="space-between" p={3} bg={useSemanticToken('surface.base')} borderRadius="md">
                        <HStack>
                          <Icon as={FolderIcon} boxSize={4} color="blue.500" />
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="medium">{project.project}</Text>
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{project.path}</Text>
                          </VStack>
                        </HStack>
                        <HStack>
                          <Badge colorScheme={
                            project.status === 'complete' ? 'green' : 
                            project.status === 'scanning' ? 'blue' : 'red'
                          }>
                            {project.status}
                          </Badge>
                          <Text fontSize="sm">{project.found} found</Text>
                        </HStack>
                      </HStack>
                    ))}
                  </VStack>
                </GlassPanel>
              )}

              {/* Scan Results */}
              {scanResults.length > 0 && (
                <GlassPanel variant="light" p={4}>
                  <VStack spacing={3} align="stretch">
                    <HStack justify="space-between">
                      <Text fontWeight="semibold">Discovered Documents</Text>
                      <Badge colorScheme="purple">{scanResults.length} documents</Badge>
                    </HStack>
                    <TableContainer maxH="300px" overflowY="auto">
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Document</Th>
                            <Th>Type</Th>
                            <Th>Status</Th>
                            <Th>Size</Th>
                            <Th>Tokens</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {scanResults.map((result, index) => (
                            <Tr key={index}>
                              <Td>
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="sm" fontWeight="medium">{result.path.split('/').pop()}</Text>
                                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{result.project}</Text>
                                </VStack>
                              </Td>
                              <Td>
                                <Badge size="sm" colorScheme={
                                  result.type === 'markdown' ? 'blue' :
                                  result.type === 'code' ? 'green' :
                                  result.type === 'config' ? 'orange' : 'gray'
                                }>
                                  {result.type}
                                </Badge>
                              </Td>
                              <Td>
                                <Badge size="sm" colorScheme={
                                  result.status === 'new' ? 'green' :
                                  result.status === 'updated' ? 'yellow' : 'gray'
                                }>
                                  {result.status}
                                </Badge>
                              </Td>
                              <Td><Text fontSize="sm">{(result.size / 1024).toFixed(1)}KB</Text></Td>
                              <Td><Text fontSize="sm">{result.estimatedTokens || 0}</Text></Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </VStack>
                </GlassPanel>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter borderTopWidth="1px">
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onScanModalClose}>Close</Button>
              <Button 
                colorScheme="green" 
                onClick={handlePrepareForIngestion}
                isDisabled={scanResults.length === 0}
                leftIcon={<CloudArrowUpIcon />}
              >
                Prepare for Ingestion ({scanResults.filter(r => r.status !== 'existing').length})
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Document Ingestion Modal */}
      <Modal isOpen={isIngestionModalOpen} onClose={onIngestionModalClose} size="3xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader borderBottomWidth="1px">
            <HStack>
              <Icon as={CloudArrowUpIcon} boxSize={6} color="green.500" />
              <Text>Knowledge Graph Ingestion</Text>
              <Badge colorScheme="blue" ml={2}>
                {selectedScanResults.length} selected
              </Badge>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack spacing={6} align="stretch">
              {/* Ingestion Progress */}
              {isIngesting && (
                <GlassPanel variant="light" p={4}>
                  <VStack spacing={3} align="stretch">
                    <HStack justify="space-between">
                      <Text fontWeight="semibold">Ingestion Progress</Text>
                      <Badge colorScheme="blue">Processing...</Badge>
                    </HStack>
                    <Progress value={ingestionProgress} colorScheme="green" size="lg" borderRadius="full" />
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      Ingesting documents into Knowledge Graph... {Math.round(ingestionProgress)}%
                    </Text>
                  </VStack>
                </GlassPanel>
              )}

              {/* Document Selection */}
              <GlassPanel variant="light" p={4}>
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Documents for Ingestion</Text>
                    <HStack>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedScanResults(pendingIngestion.map(d => d.path))}>
                        Select All
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedScanResults([])}>
                        Clear All
                      </Button>
                    </HStack>
                  </HStack>
                  
                  <VStack spacing={2} align="stretch" maxH="400px" overflowY="auto">
                    {pendingIngestion.map((doc, index) => (
                      <HStack key={index} p={3} bg={useSemanticToken('surface.base')} borderRadius="md" justify="space-between">
                        <HStack spacing={3}>
                          <input 
                            type="checkbox" 
                            checked={selectedScanResults.includes(doc.path)}
                            onChange={() => handleToggleSelection(doc.path)}
                          />
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="medium">{doc.path.split('/').pop()}</Text>
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{doc.project} • {doc.type}</Text>
                          </VStack>
                        </HStack>
                        <HStack>
                          <Badge colorScheme={doc.status === 'new' ? 'green' : 'yellow'}>
                            {doc.status}
                          </Badge>
                          <Text fontSize="sm">{doc.estimatedTokens || 0} tokens</Text>
                        </HStack>
                      </HStack>
                    ))}
                  </VStack>
                  
                  <HStack justify="space-between" pt={2} borderTopWidth="1px">
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      {selectedScanResults.length} of {pendingIngestion.length} documents selected
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      Est. {pendingIngestion.filter(d => selectedScanResults.includes(d.path)).reduce((sum, d) => sum + (d.estimatedTokens || 0), 0)} tokens
                    </Text>
                  </HStack>
                </VStack>
              </GlassPanel>
            </VStack>
          </ModalBody>
          <ModalFooter borderTopWidth="1px">
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onIngestionModalClose} isDisabled={isIngesting}>
                Cancel
              </Button>
              <Button 
                colorScheme="green" 
                onClick={handleBulkIngestion}
                isLoading={isIngesting}
                isDisabled={selectedScanResults.length === 0}
                leftIcon={<CircleStackIcon />}
              >
                Ingest Selected Documents
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
};

export default DocumentationPage;
