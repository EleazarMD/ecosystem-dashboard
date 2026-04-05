/**
 * Personal Knowledge Base (PKB) - GraphRAG Dashboard
 * 
 * Interactive dashboard for the GraphRAG-powered Personal Knowledge Graph.
 * Features 3D visualization, semantic search, and entity management.
 * 
 * Distinct from email-graphrag which handles email-specific knowledge.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Spinner,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  Badge,
  Input,
  Textarea,
  InputGroup,
  InputLeftElement,
  Select,
  Divider,
  Icon,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiRefreshCw,
  FiSearch,
  FiDatabase,
  FiGitBranch,
  FiUpload,
  FiZap,
  FiLayers,
  FiActivity,
  FiBox,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import dynamic from 'next/dynamic';

const PersonalKG3D = dynamic(
  () => import('@/components/knowledge-graph/PersonalKG3D'),
  { ssr: false, loading: () => <Spinner size="xl" /> }
);

const GRAPHRAG_API = 'http://localhost:8765';

interface Entity {
  id: string;
  name: string;
  type: string;
  description?: string;
  created_at?: string;
}

interface GraphStats {
  entities: number;
  relationships: number;
  documents: number;
  communities: number;
  by_type: Array<{ type: string; count: number }>;
}

interface SearchResult {
  id: string;
  content: string;
  score: number;
  entity_type?: string;
  metadata?: Record<string, any>;
}

export default function KnowledgeGraphGraphRAG() {
  const toast = useToast();
  const { isOpen: isIngestOpen, onOpen: onIngestOpen, onClose: onIngestClose } = useDisclosure();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [filterType, setFilterType] = useState('all');
  
  // Ingest form
  const [ingestContent, setIngestContent] = useState('');
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingesting, setIngesting] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${GRAPHRAG_API}/health`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats?.graph || null);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchEntities = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filterType !== 'all') {
        params.set('type', filterType);
      }
      
      const response = await fetch(`${GRAPHRAG_API}/api/kg/entities?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEntities(data.entities || []);
      }
    } catch (err) {
      console.error('Failed to fetch entities:', err);
    }
  }, [filterType]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const response = await fetch(`${GRAPHRAG_API}/api/kg/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 10 }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.entities || []);
      }
    } catch (err) {
      toast({
        title: 'Search failed',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSearching(false);
    }
  }, [searchQuery, toast]);

  const handleIngest = useCallback(async () => {
    if (!ingestContent.trim()) return;
    
    setIngesting(true);
    try {
      const response = await fetch(`${GRAPHRAG_API}/api/kg/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: ingestContent,
          title: ingestTitle || 'Manual Entry',
          source: 'dashboard',
          extract_entities: true,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Content ingested',
          description: `Extracted ${data.entities_extracted} entities and ${data.relationships_extracted} relationships`,
          status: 'success',
          duration: 5000,
        });
        setIngestContent('');
        setIngestTitle('');
        onIngestClose();
        fetchStats();
        fetchEntities();
      } else {
        throw new Error('Ingestion failed');
      }
    } catch (err) {
      toast({
        title: 'Ingestion failed',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIngesting(false);
    }
  }, [ingestContent, ingestTitle, toast, onIngestClose, fetchStats, fetchEntities]);

  const handleBuildCommunities = useCallback(async () => {
    try {
      const response = await fetch(`${GRAPHRAG_API}/api/kg/communities/build`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Communities built',
          description: data.message,
          status: 'success',
          duration: 3000,
        });
        fetchStats();
      }
    } catch (err) {
      toast({
        title: 'Failed to build communities',
        status: 'error',
        duration: 3000,
      });
    }
  }, [toast, fetchStats]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchEntities()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStats, fetchEntities]);

  const entityTypes = ['all', 'person', 'project', 'technology', 'concept', 'organization', 'topic'];

  if (loading) {
    return (
      <DashboardLayout>
        <VStack py={20}>
          <Spinner size="xl" color="purple.500" />
          <Text>Loading Knowledge Graph...</Text>
        </VStack>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box p={{ base: 3, md: 6 }} maxW="1600px" mx="auto">
        {/* Header */}
        <VStack align="stretch" spacing={4} mb={6}>
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <Box>
              <Heading size="lg">
                <Icon as={FiDatabase} mr={2} color="purple.400" />
                Personal Knowledge Graph
              </Heading>
              <Text color="gray.500" fontSize="sm">
                GraphRAG-powered knowledge management with Neo4j + ChromaDB
              </Text>
            </Box>
            <HStack>
              <Button
                leftIcon={<FiUpload />}
                colorScheme="purple"
                onClick={onIngestOpen}
              >
                Ingest Content
              </Button>
              <IconButton
                aria-label="Refresh"
                icon={<FiRefreshCw />}
                onClick={() => { fetchStats(); fetchEntities(); }}
              />
            </HStack>
          </HStack>
        </VStack>

        {/* Stats */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
          <GlassPanel p={4}>
            <Stat>
              <StatLabel>
                <Icon as={FiBox} mr={1} />
                Entities
              </StatLabel>
              <StatNumber color="purple.400">{stats?.entities || 0}</StatNumber>
            </Stat>
          </GlassPanel>
          <GlassPanel p={4}>
            <Stat>
              <StatLabel>
                <Icon as={FiGitBranch} mr={1} />
                Relationships
              </StatLabel>
              <StatNumber color="cyan.400">{stats?.relationships || 0}</StatNumber>
            </Stat>
          </GlassPanel>
          <GlassPanel p={4}>
            <Stat>
              <StatLabel>
                <Icon as={FiLayers} mr={1} />
                Documents
              </StatLabel>
              <StatNumber color="blue.400">{stats?.documents || 0}</StatNumber>
            </Stat>
          </GlassPanel>
          <GlassPanel p={4}>
            <Stat>
              <StatLabel>
                <Icon as={FiActivity} mr={1} />
                Communities
              </StatLabel>
              <StatNumber color="green.400">{stats?.communities || 0}</StatNumber>
            </Stat>
          </GlassPanel>
        </SimpleGrid>

        {/* Main Content */}
        <Tabs colorScheme="purple">
          <TabList>
            <Tab><Icon as={FiGitBranch} mr={2} />3D Graph</Tab>
            <Tab><Icon as={FiSearch} mr={2} />Search</Tab>
            <Tab><Icon as={FiBox} mr={2} />Entities</Tab>
            <Tab><Icon as={FiZap} mr={2} />GraphRAG Query</Tab>
          </TabList>

          <TabPanels>
            {/* 3D Graph Tab */}
            <TabPanel px={0}>
              <GlassPanel p={0} overflow="hidden">
                <PersonalKG3D
                  graphragUrl={GRAPHRAG_API}
                  height="600px"
                  onEntitySelect={(entity) => setSelectedEntity(entity as Entity)}
                />
              </GlassPanel>
            </TabPanel>

            {/* Search Tab */}
            <TabPanel px={0}>
              <GlassPanel p={4}>
                <VStack align="stretch" spacing={4}>
                  <HStack>
                    <InputGroup>
                      <InputLeftElement>
                        <FiSearch />
                      </InputLeftElement>
                      <Input
                        placeholder="Semantic search across entities and documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </InputGroup>
                    <Button
                      colorScheme="purple"
                      onClick={handleSearch}
                      isLoading={searching}
                    >
                      Search
                    </Button>
                  </HStack>

                  {searchResults.length > 0 && (
                    <VStack align="stretch" spacing={2}>
                      <Text fontWeight="bold" color="gray.400">
                        {searchResults.length} Results
                      </Text>
                      {searchResults.map((result) => (
                        <GlassPanel key={result.id} p={3}>
                          <HStack justify="space-between">
                            <VStack align="start" spacing={1}>
                              <Text fontWeight="bold">
                                {result.metadata?.name || result.content?.split('\n')[0]}
                              </Text>
                              <Text fontSize="sm" color="gray.400" noOfLines={2}>
                                {result.content}
                              </Text>
                            </VStack>
                            <VStack align="end">
                              <Badge colorScheme="purple">
                                {(result.score * 100).toFixed(0)}%
                              </Badge>
                              {result.entity_type && (
                                <Badge colorScheme="cyan">{result.entity_type}</Badge>
                              )}
                            </VStack>
                          </HStack>
                        </GlassPanel>
                      ))}
                    </VStack>
                  )}
                </VStack>
              </GlassPanel>
            </TabPanel>

            {/* Entities Tab */}
            <TabPanel px={0}>
              <GlassPanel p={4}>
                <VStack align="stretch" spacing={4}>
                  <HStack>
                    <Select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      w="200px"
                    >
                      {entityTypes.map((type) => (
                        <option key={type} value={type}>
                          {type === 'all' ? 'All Types' : type}
                        </option>
                      ))}
                    </Select>
                    <Text color="gray.400">{entities.length} entities</Text>
                  </HStack>

                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                    {entities.map((entity) => (
                      <GlassPanel
                        key={entity.id}
                        p={3}
                        cursor="pointer"
                        _hover={{ borderColor: 'purple.500' }}
                        onClick={() => setSelectedEntity(entity)}
                      >
                        <HStack justify="space-between" mb={2}>
                          <Text fontWeight="bold" noOfLines={1}>{entity.name}</Text>
                          <Badge colorScheme="purple">{entity.type}</Badge>
                        </HStack>
                        {entity.description && (
                          <Text fontSize="sm" color="gray.400" noOfLines={2}>
                            {entity.description}
                          </Text>
                        )}
                      </GlassPanel>
                    ))}
                  </SimpleGrid>
                </VStack>
              </GlassPanel>
            </TabPanel>

            {/* GraphRAG Query Tab */}
            <TabPanel px={0}>
              <GraphRAGQueryPanel />
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Ingest Modal */}
        <Modal isOpen={isIngestOpen} onClose={onIngestClose} size="xl">
          <ModalOverlay />
          <ModalContent bg="gray.900">
            <ModalHeader>Ingest Content</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack align="stretch" spacing={4}>
                <Input
                  placeholder="Title (optional)"
                  value={ingestTitle}
                  onChange={(e) => setIngestTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Paste content here. Entities and relationships will be automatically extracted..."
                  value={ingestContent}
                  onChange={(e) => setIngestContent(e.target.value)}
                  rows={10}
                />
                <Text fontSize="sm" color="gray.400">
                  The LLM will extract entities (people, projects, technologies, etc.) 
                  and relationships from your content automatically.
                </Text>
                <Button
                  colorScheme="purple"
                  onClick={handleIngest}
                  isLoading={ingesting}
                  isDisabled={!ingestContent.trim()}
                >
                  Ingest & Extract Entities
                </Button>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </DashboardLayout>
  );
}

// GraphRAG Query Panel Component
function GraphRAGQueryPanel() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('hybrid');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${GRAPHRAG_API}/api/kg/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode, max_results: 10 }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      }
    } catch (err) {
      toast({
        title: 'Query failed',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassPanel p={4}>
      <VStack align="stretch" spacing={4}>
        <Text fontWeight="bold" color="purple.300">
          GraphRAG Query
        </Text>
        <Text fontSize="sm" color="gray.400">
          Ask questions about your knowledge graph. Uses entity traversal + semantic search.
        </Text>
        
        <HStack>
          <Input
            placeholder="What technologies are used in the AI Homelab?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
          />
          <Select value={mode} onChange={(e) => setMode(e.target.value)} w="150px">
            <option value="hybrid">Hybrid</option>
            <option value="local">Local</option>
            <option value="global">Global</option>
          </Select>
          <Button colorScheme="purple" onClick={handleQuery} isLoading={loading}>
            Query
          </Button>
        </HStack>

        {result && (
          <VStack align="stretch" spacing={3} mt={4}>
            <HStack>
              <Badge colorScheme="purple">
                {result.entities_used?.length || 0} entities
              </Badge>
              <Badge colorScheme="cyan">
                {result.relationships_used?.length || 0} relationships
              </Badge>
              <Badge colorScheme={result.confidence > 0.7 ? 'green' : 'yellow'}>
                {(result.confidence * 100).toFixed(0)}% confidence
              </Badge>
            </HStack>
            
            <Divider />
            
            <Box bg="whiteAlpha.100" p={4} borderRadius="md">
              <Text whiteSpace="pre-wrap">{result.answer}</Text>
            </Box>

            {result.entities_used?.length > 0 && (
              <Box>
                <Text fontSize="sm" fontWeight="bold" color="gray.400" mb={2}>
                  Entities Used
                </Text>
                <SimpleGrid columns={2} spacing={2}>
                  {result.entities_used.slice(0, 6).map((entity: Entity) => (
                    <HStack key={entity.id} p={2} bg="whiteAlpha.50" borderRadius="md">
                      <Text fontSize="sm">{entity.name}</Text>
                      <Badge size="sm">{entity.type}</Badge>
                    </HStack>
                  ))}
                </SimpleGrid>
              </Box>
            )}
          </VStack>
        )}
      </VStack>
    </GlassPanel>
  );
}
