import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Card,
  CardBody,
  CardHeader,
  Button,
  HStack,
  VStack,
  Spinner,
  Icon,
  Badge,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Flex,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { FiRefreshCw, FiExternalLink, FiZoomIn, FiZoomOut, FiMaximize2 } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Dynamically import the 3D graph component to avoid SSR issues
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => (
    <Box textAlign="center" py={10}>
      <Spinner size="xl" color="purple.500" thickness="4px" />
      <Text mt={4}>Loading 3D graph visualization...</Text>
    </Box>
  ),
});

interface GraphNode {
  id: string;
  name: string;
  type: string;
  val: number;
  color: string;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
  value: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface KnowledgeGraphStats {
  totalEntities: number;
  totalDocuments: number;
  totalRelationships: number;
  entityTypes: Record<string, number>;
}

const GraphTab: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [stats, setStats] = useState<KnowledgeGraphStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodeLimit, setNodeLimit] = useState(100);
  const [selectedNodeType, setSelectedNodeType] = useState<string>('all');
  const [usingDemoData, setUsingDemoData] = useState(false);
  const toast = useToast();

  const fetchGraphData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        // Fetch from Knowledge Graph API
        const response = await fetch(
          `http://localhost:8765/api/graph/visualization?limit=${nodeLimit}&type=${selectedNodeType}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
          setGraphData(data.graph || { nodes: [], links: [] });
          setStats(data.statistics);
          setUsingDemoData(false);
          return; // Success - don't load mock data
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Check if it's a network/timeout error
        if (fetchError.name === 'AbortError') {
          console.debug('Knowledge Graph API timeout - using mock data');
        } else {
          console.debug('Knowledge Graph API unavailable:', fetchError.message);
        }
        
        // Load mock data silently
        setUsingDemoData(true);
        loadMockData();
        
        // Don't show toast - demo data is fine for graph visualization
        // The main ingestion functionality works independently
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError('Unable to load graph data');
      loadMockData();
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockData = () => {
    // Sample mock data for demonstration
    const mockNodes: GraphNode[] = [
      { id: '1', name: 'AI Homelab', type: 'Project', val: 30, color: '#8B5CF6' },
      { id: '2', name: 'Knowledge Graph', type: 'Service', val: 25, color: '#3B82F6' },
      { id: '3', name: 'Dashboard', type: 'Service', val: 20, color: '#3B82F6' },
      { id: '4', name: 'Neo4j', type: 'Database', val: 15, color: '#10B981' },
      { id: '5', name: 'PostgreSQL', type: 'Database', val: 15, color: '#10B981' },
      { id: '6', name: 'Documentation', type: 'Resource', val: 10, color: '#F59E0B' },
      { id: '7', name: 'API Gateway', type: 'Service', val: 20, color: '#3B82F6' },
    ];

    const mockLinks: GraphLink[] = [
      { source: '1', target: '2', type: 'CONTAINS', value: 5 },
      { source: '1', target: '3', type: 'CONTAINS', value: 5 },
      { source: '2', target: '4', type: 'USES', value: 3 },
      { source: '2', target: '5', type: 'USES', value: 3 },
      { source: '3', target: '7', type: 'CONNECTS_TO', value: 4 },
      { source: '1', target: '6', type: 'HAS', value: 2 },
    ];

    setGraphData({ nodes: mockNodes, links: mockLinks });
    setStats({
      totalEntities: 7,
      totalDocuments: 25,
      totalRelationships: 6,
      entityTypes: {
        'Project': 1,
        'Service': 3,
        'Database': 2,
        'Resource': 1,
      },
    });
  };

  useEffect(() => {
    fetchGraphData();
  }, [nodeLimit, selectedNodeType]);

  const getNodeColor = (node: any) => {
    return node.color || '#8B5CF6';
  };

  return (
    <Box>
      {/* Demo Data Indicator */}
      {usingDemoData && (
        <Alert status="info" mb={4} borderRadius="md">
          <AlertIcon />
          <AlertTitle>Demo Mode</AlertTitle>
          <AlertDescription>
            Showing sample data. Start the Knowledge Graph services to see live data.
          </AlertDescription>
        </Alert>
      )}

      {/* Header with Controls */}
      <Card mb={6}>
        <CardBody>
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <VStack align="start" spacing={1}>
              <Heading size="md">Knowledge Graph Visualization</Heading>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                Interactive 3D visualization of ecosystem entities and relationships
              </Text>
            </VStack>

            <HStack spacing={4} flexWrap="wrap">
              <HStack>
                <Text fontSize="sm" fontWeight="medium">Node Type:</Text>
                <Select
                  size="sm"
                  value={selectedNodeType}
                  onChange={(e) => setSelectedNodeType(e.target.value)}
                  width="150px"
                >
                  <option value="all">All Types</option>
                  <option value="Project">Projects</option>
                  <option value="Service">Services</option>
                  <option value="Database">Databases</option>
                  <option value="Resource">Resources</option>
                </Select>
              </HStack>

              <Button
                leftIcon={<Icon as={FiRefreshCw} />}
                colorScheme="purple"
                variant="outline"
                onClick={fetchGraphData}
                isLoading={isLoading}
                size="sm"
              >
                Refresh
              </Button>

              <Link href="/knowledge-graph" passHref legacyBehavior>
                <ChakraLink>
                  <Button
                    leftIcon={<Icon as={FiMaximize2} />}
                    colorScheme="blue"
                    variant="ghost"
                    size="sm"
                  >
                    Full View
                  </Button>
                </ChakraLink>
              </Link>
            </HStack>
          </Flex>
        </CardBody>
      </Card>

      {/* Statistics Cards */}
      {stats && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Entities</StatLabel>
                <StatNumber color="purple.500">{stats.totalEntities}</StatNumber>
                <StatHelpText>Total nodes</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Relationships</StatLabel>
                <StatNumber color="blue.500">{stats.totalRelationships}</StatNumber>
                <StatHelpText>Connections</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Documents</StatLabel>
                <StatNumber color="green.500">{stats.totalDocuments}</StatNumber>
                <StatHelpText>Indexed</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Entity Types</StatLabel>
                <StatNumber color="orange.500">{Object.keys(stats.entityTypes).length}</StatNumber>
                <StatHelpText>Categories</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
      )}

      {/* Error Alert */}
      {error && (
        <Alert status="info" mb={6}>
          <AlertIcon />
          <Box>
            <AlertTitle>Demo Mode</AlertTitle>
            <AlertDescription>
              Knowledge Graph API unavailable. Showing sample visualization.
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {/* 3D Graph Visualization */}
      <Card>
        <CardBody p={0}>
          <Box height="600px" borderRadius="md" overflow="hidden" position="relative">
            {isLoading && graphData.nodes.length === 0 ? (
              <Flex justify="center" align="center" height="100%">
                <VStack spacing={4}>
                  <Spinner size="xl" color="purple.500" thickness="4px" />
                  <Text color={useSemanticToken('text.secondary')}>Loading knowledge graph...</Text>
                </VStack>
              </Flex>
            ) : graphData.nodes.length > 0 ? (
              <ForceGraph3D
                graphData={graphData}
                nodeLabel="name"
                nodeColor={getNodeColor}
                nodeVal="val"
                linkColor={() => 'rgba(139, 92, 246, 0.3)'}
                linkWidth="value"
                backgroundColor="#FFFFFF"
                onNodeClick={(node: any) => {
                  toast({
                    title: node.name,
                    description: `Type: ${node.type}`,
                    status: 'info',
                    duration: 2000,
                    isClosable: true,
                  });
                }}
                enableNodeDrag={true}
                enableNavigationControls={true}
              />
            ) : (
              <Flex justify="center" align="center" height="100%" flexDirection="column" gap={4}>
                <Icon as={FiExternalLink} boxSize={12} color={useSemanticToken('text.tertiary')} />
                <VStack spacing={2}>
                  <Text fontSize="lg" fontWeight="bold" color={useSemanticToken('text.secondary')}>
                    No Graph Data Available
                  </Text>
                  <Text fontSize="sm" color={useSemanticToken('text.tertiary')} textAlign="center" maxW="md">
                    The Knowledge Graph is empty or the API is not responding. Start by indexing
                    documents in the Documents tab.
                  </Text>
                  <Button
                    mt={4}
                    colorScheme="purple"
                    variant="outline"
                    onClick={loadMockData}
                    leftIcon={<Icon as={FiRefreshCw} />}
                  >
                    Load Sample Data
                  </Button>
                </VStack>
              </Flex>
            )}
          </Box>
        </CardBody>
      </Card>

      {/* Node Limit Control */}
      <Card mt={6}>
        <CardBody>
          <VStack align="stretch" spacing={4}>
            <Flex justify="space-between" align="center">
              <Text fontWeight="medium">Node Limit: {nodeLimit}</Text>
              <Badge colorScheme="purple">{graphData.nodes.length} nodes displayed</Badge>
            </Flex>
            <Slider
              value={nodeLimit}
              onChange={setNodeLimit}
              min={10}
              max={500}
              step={10}
              colorScheme="purple"
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              Adjust the number of nodes to display. Higher values may impact performance.
            </Text>
          </VStack>
        </CardBody>
      </Card>

      {/* Help Card */}
      <Card mt={6}>
        <CardBody>
          <VStack align="stretch" spacing={2}>
            <Heading size="sm">💡 Tips</Heading>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              • Click and drag to rotate the graph
            </Text>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              • Scroll to zoom in/out
            </Text>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              • Click on nodes to see details
            </Text>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              • Use the "Full View" button for advanced features
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default GraphTab;
