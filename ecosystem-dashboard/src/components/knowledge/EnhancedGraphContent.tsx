/**
 * Enhanced Knowledge Graph Dashboard Page Content - Client-side only component
 * 
 * This component provides a modern, comprehensive interface for interacting with
 * the Knowledge Graph, featuring AI-powered queries, advanced visualization,
 * and real-time data exploration capabilities.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  VStack,
  HStack,
  Button,
  IconButton,
  Badge,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Card,
  CardHeader,
  CardBody,
  useDisclosure,
  Flex,
  Spacer,
  Grid,
  GridItem,
  Spinner,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Fade,
  ScaleFade,
} from '@chakra-ui/react';
import {
  InfoIcon,
  RepeatIcon,
  SettingsIcon,
  ViewIcon,
  DownloadIcon,
  ExternalLinkIcon,
} from '@chakra-ui/icons';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Import existing components
import { GraphViewer } from '../knowledge/graph/GraphViewer';
import { GraphControls } from '../knowledge/graph/GraphControls';
import GlassPanel from '../ui/GlassPanel';
import { useAuth } from '../../context/AuthContext';

// Import new enhanced component
import KnowledgeQueryInterface from '../knowledge/KnowledgeQueryInterface';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Node {
  id: string;
  label: string;
  type: string;
  properties: {
    doc_id?: string;
    title?: string;
    description?: string;
    status?: string;
    version?: string;
    created_date?: string;
    last_updated_date?: string;
    [key: string]: any;
  };
}

interface GraphData {
  nodes: Node[];
  edges: any[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    nodeTypes: Record<string, number>;
    relationshipTypes: Record<string, number>;
  };
}

const EnhancedGraphContent: React.FC = () => {
  const { hasPermission } = useAuth();
  const isDark = false;
  const bgGradient = 'linear(to-br, blue.50, purple.50, pink.50)';
  const toast = useToast();
  const { isOpen: isFullscreen, onOpen: openFullscreen, onClose: closeFullscreen } = useDisclosure();
  const { isOpen: showQueryInterface, onToggle: toggleQueryInterface } = useDisclosure({ defaultIsOpen: true });
  
  // Graph state
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Graph visualization settings
  const [focusEntity, setFocusEntity] = useState<string>('');
  const [depth, setDepth] = useState<number>(2);
  const [limit, setLimit] = useState<number>(100);
  const [relationTypes, setRelationTypes] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // Knowledge Graph API base URL
  const KG_API_BASE = '/api/knowledge-graph';
  
  // Load initial graph data
  useEffect(() => {
    loadGraphOverview();
  }, []);
  
  // Load graph overview
  const loadGraphOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load basic graph statistics and sample data
      const response = await axios.get(`${KG_API_BASE}/overview`);
      setGraphData(response.data);
      toast({
        title: 'Success',
        description: 'Graph data loaded successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load graph data';
      setError(errorMessage);
      console.error('Failed to load graph overview:', err);
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [KG_API_BASE, toast]);
  
  // Execute query (natural language or Cypher)
  const handleQueryExecute = useCallback(async (query: string, type: 'natural' | 'cypher'): Promise<any[]> => {
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${KG_API_BASE}/query`, {
        query,
        type,
        limit: 100
      });
      
      const results = response.data.results || [];
      
      // Update graph data with query results if available
      if (results.length > 0 && response.data.graphData) {
        setGraphData(response.data.graphData);
      }
      
      toast({
        title: 'Query Executed',
        description: `Found ${results.length} results`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query execution failed';
      toast({
        title: 'Query Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [KG_API_BASE, toast]);
  
  // Handle node selection
  const handleNodeSelect = useCallback((node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle visualization of query results
  const handleVisualize = useCallback((data: any) => {
    if (data && (data.nodes || data.edges)) {
      setGraphData(data);
    }
  }, []);

  return (
    <Box bgGradient={bgGradient} minHeight="100vh" p={4}>
      {/* Header */}
      <Flex mb={6} alignItems="center">
        <VStack align="start" spacing={1}>
          <Heading as="h1" size="xl">
            Knowledge Graph Dashboard
          </Heading>
          <HStack>
            <Badge colorScheme="purple" fontSize="sm">
              Enhanced
            </Badge>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              {graphData ? `${graphData.stats?.totalNodes || 0} nodes • ${graphData.stats?.totalEdges || 0} relationships` : 'Loading...'}
            </Text>
          </HStack>
        </VStack>
        <Spacer />
        <HStack>
          <Button
            leftIcon={<RepeatIcon />}
            colorScheme="blue"
            variant="outline"
            onClick={() => loadGraphOverview()}
            isLoading={isLoading}
          >
            Refresh
          </Button>
          <IconButton
            aria-label="View fullscreen"
            icon={<ViewIcon />}
            onClick={openFullscreen}
            variant="ghost"
          />
          <IconButton
            aria-label="Settings"
            icon={<SettingsIcon />}
            variant="ghost"
          />
        </HStack>
      </Flex>

      {/* Knowledge Graph Control Section */}
      <Box mb={6}>
        <Card bg="green.50" borderColor="green.200" borderWidth={2} borderRadius="lg">
          <CardHeader>
            <Heading size="md" color="green.700">🧠 Knowledge Graph Control</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>System Offline</AlertTitle>
                  <AlertDescription>
                    Knowledge Graph system is not running. Click to start all 12 services.
                  </AlertDescription>
                </Box>
              </Alert>
              
              <Button 
                colorScheme="green" 
                size="lg" 
                width="100%" 
                height="60px"
                fontSize="lg"
                fontWeight="bold"
                onClick={() => alert('🚀 Starting Knowledge Graph System!\n\nThis would start:\n• Neo4j Database (Port 7474)\n• Knowledge Graph API (Port 8765)\n• IDE Memory Backend (Port 9579)\n• Memory Watcher (Port 9578)\n• AI Gateway (Port 8777)\n• 7 AI Agents (Ports 41240-41246)')}
                shadow="md"
                _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                transition="all 0.2s"
              >
                🚀 Start Knowledge Graph System
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </Box>

      {/* Main content */}
      <Grid templateColumns="repeat(12, 1fr)" gap={4}>
        {/* Left panel - Query interface */}
        <GridItem colSpan={{ base: 12, lg: 4 }}>
          <AnimatePresence>
            {showQueryInterface && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <VStack spacing={4} align="stretch">
                  <GlassPanel>
                    <KnowledgeQueryInterface
                      onQueryExecute={handleQueryExecute}
                      onVisualize={handleVisualize}
                    />
                  </GlassPanel>

                  {selectedNode && (
                    <GlassPanel>
                      <VStack align="stretch" spacing={3}>
                        <Heading size="md">Node Details</Heading>
                        <HStack>
                          <Badge colorScheme="blue">{selectedNode.type}</Badge>
                          <Text fontWeight="bold">{selectedNode.label}</Text>
                        </HStack>
                        <Divider />
                        <VStack align="stretch" spacing={2}>
                          {Object.entries(selectedNode.properties).map(([key, value]) => (
                            <HStack key={key} justify="space-between">
                              <Text fontSize="sm" fontWeight="medium">{key}:</Text>
                              <Text fontSize="sm" isTruncated maxWidth="60%">
                                {typeof value === 'string' ? value : JSON.stringify(value)}
                              </Text>
                            </HStack>
                          ))}
                        </VStack>
                      </VStack>
                    </GlassPanel>
                  )}
                </VStack>
              </motion.div>
            )}
          </AnimatePresence>
        </GridItem>

        {/* Main graph visualization area */}
        <GridItem colSpan={{ base: 12, lg: showQueryInterface ? 8 : 12 }}>
          <GlassPanel height="70vh">
            {error && (
              <Alert status="error" mb={4}>
                <AlertIcon />
                {error}
              </Alert>
            )}
            
            {isLoading && !graphData && (
              <Flex height="100%" justify="center" align="center">
                <VStack spacing={4}>
                  <Spinner size="xl" />
                  <Text>Loading Knowledge Graph...</Text>
                </VStack>
              </Flex>
            )}
            
            {graphData && (
              <Box position="relative" height="100%">
                <GraphControls
                  onFocusChange={setFocusEntity}
                  onDepthChange={setDepth}
                  onLimitChange={setLimit}
                  onRelationTypesChange={setRelationTypes}
                  onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                  nodeTypes={Object.keys(graphData.stats?.nodeTypes || {})}
                  relationshipTypes={Object.keys(graphData.stats?.relationshipTypes || {})}
                />
                
                <GraphViewer
                  data={graphData}
                  onNodeSelect={handleNodeSelect}
                  focusEntity={focusEntity}
                  refreshTrigger={refreshTrigger}
                />
              </Box>
            )}
          </GlassPanel>
          
          {/* Statistics panels */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mt={4}>
            {graphData?.stats && (
              <>
                <GlassPanel>
                  <VStack align="start">
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Total Nodes</Text>
                    <Heading size="lg">{graphData.stats.totalNodes}</Heading>
                  </VStack>
                </GlassPanel>
                
                <GlassPanel>
                  <VStack align="start">
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Total Relationships</Text>
                    <Heading size="lg">{graphData.stats.totalEdges}</Heading>
                  </VStack>
                </GlassPanel>
                
                <GlassPanel>
                  <VStack align="start">
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Node Types</Text>
                    <Heading size="lg">{Object.keys(graphData.stats.nodeTypes).length}</Heading>
                  </VStack>
                </GlassPanel>
                
                <GlassPanel>
                  <VStack align="start">
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Relationship Types</Text>
                    <Heading size="lg">{Object.keys(graphData.stats.relationshipTypes).length}</Heading>
                  </VStack>
                </GlassPanel>
              </>
            )}
          </SimpleGrid>
        </GridItem>
      </Grid>

      {/* Fullscreen modal */}
      <Modal isOpen={isFullscreen} onClose={closeFullscreen} size="full">
        <ModalOverlay />
        <ModalContent bg={isDark ? 'gray.900' : 'white'}>
          <ModalHeader>Knowledge Graph Explorer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {graphData && (
              <Box height="calc(100vh - 120px)">
                <GraphViewer
                  data={graphData}
                  onNodeSelect={handleNodeSelect}
                  focusEntity={focusEntity}
                  refreshTrigger={refreshTrigger}
                  isFullscreen
                />
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default EnhancedGraphContent;
