import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  HStack,
  VStack,
  useToast,
  Icon,
  Spinner,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Select,
  Checkbox,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Tooltip,
} from '@chakra-ui/react';
import { FiRefreshCw, FiDownload, FiZoomIn, FiZoomOut, FiSettings } from 'react-icons/fi';
// @ts-ignore - Type definitions may not be available
import ForceGraph3D from 'react-force-graph-3d';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface GraphNode {
  id: string;
  name: string;
  type: string;
  category?: string;
  entityCount?: number;
  occurrences?: number;
  filePath?: string;
  sourceDocuments?: string[];
  val: number; // Node size
  color: string;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
  confidence?: number;
  value: number; // Link thickness
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface KnowledgeGraphData {
  entities: any[];
  relationships: any[];
  statistics: {
    totalEntities: number;
    totalDocuments: number;
    totalRelationships: number;
    entityTypes: Record<string, number>;
    documentStats: {
      byCategory: Record<string, number>;
    };
  };
}

const Neo4jGraphView: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [rawData, setRawData] = useState<KnowledgeGraphData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filters, setFilters] = useState({
    entityTypes: new Set<string>(),
    categories: new Set<string>(),
    minOccurrences: 1,
    showDocuments: true,
    showEntities: true,
    showCategories: true
  });
  
  const fgRef = useRef<any>(null);
  const toast = useToast();
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const loadGraphData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/knowledge-graph/graph-statistics');
      
      if (!response.ok) {
        throw new Error(`Failed to load graph data: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        setRawData(result.data);
        processGraphData(result.data);
      } else {
        throw new Error(result.message || 'Invalid data format');
      }
    } catch (err: any) {
      console.error('Error loading graph data:', err);
      setError(err.message);
      
      // Load sample data for development
      const sampleData = generateSampleData();
      setRawData(sampleData);
      processGraphData(sampleData);
    } finally {
      setIsLoading(false);
    }
  };

  const processGraphData = (data: KnowledgeGraphData) => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    
    // Color scheme for different node types
    const typeColors = {
      Document: '#4299E1',
      Category: '#48BB78', 
      Port: '#ED8936',
      Service: '#9F7AEA',
      Technology: '#ECC94B',
      Unknown: '#718096'
    };

    // Process entities as nodes
    for (const entity of data.entities) {
      if (!shouldIncludeNode(entity)) continue;
      
      const nodeSize = entity.type === 'Document' ? 
        Math.max(3, Math.min(10, (entity.entityCount || 1) * 0.5)) :
        Math.max(2, Math.min(8, (entity.occurrences || 1) * 0.3));
      
      nodes.push({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        category: entity.category,
        entityCount: entity.entityCount,
        occurrences: entity.occurrences,
        filePath: entity.filePath,
        sourceDocuments: entity.sourceDocuments,
        val: nodeSize,
        color: typeColors[entity.type as keyof typeof typeColors] || typeColors.Unknown
      });
    }

    // Process relationships as links
    for (const rel of data.relationships) {
      if (!nodes.find(n => n.id === rel.from) || !nodes.find(n => n.id === rel.to)) {
        continue; // Skip if nodes are filtered out
      }
      
      links.push({
        source: rel.from,
        target: rel.to,
        type: rel.type,
        confidence: rel.properties?.confidence || 1.0,
        value: Math.max(1, (rel.properties?.confidence || 1.0) * 3)
      });
    }

    setGraphData({ nodes, links });
  };

  const shouldIncludeNode = (entity: any): boolean => {
    // Apply current filters
    if (!filters.showDocuments && entity.type === 'Document') return false;
    if (!filters.showEntities && entity.type !== 'Document' && entity.type !== 'Category') return false;
    if (!filters.showCategories && entity.type === 'Category') return false;
    
    if (filters.entityTypes.size > 0 && !filters.entityTypes.has(entity.type)) return false;
    if (filters.categories.size > 0 && entity.category && !filters.categories.has(entity.category)) return false;
    
    const occurrences = entity.occurrences || entity.entityCount || 1;
    if (occurrences < filters.minOccurrences) return false;
    
    return true;
  };

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
    
    // Center camera on node
    if (fgRef.current) {
      const distance = 40;
      const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
      
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        3000
      );
    }
  };

  const handleFilterChange = (filterType: string, value: any) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      switch (filterType) {
        case 'entityType':
          if (newFilters.entityTypes.has(value)) {
            newFilters.entityTypes.delete(value);
          } else {
            newFilters.entityTypes.add(value);
          }
          break;
        case 'category':
          if (newFilters.categories.has(value)) {
            newFilters.categories.delete(value);
          } else {
            newFilters.categories.add(value);
          }
          break;
        case 'minOccurrences':
          newFilters.minOccurrences = value;
          break;
        case 'showDocuments':
          newFilters.showDocuments = value;
          break;
        case 'showEntities':
          newFilters.showEntities = value;
          break;
        case 'showCategories':
          newFilters.showCategories = value;
          break;
      }
      
      return newFilters;
    });
  };

  const exportGraph = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      nodes: graphData.nodes.length,
      links: graphData.links.length,
      filters,
      data: graphData
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-graph-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Graph Exported',
      description: 'Graph data exported successfully',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const generateSampleData = (): KnowledgeGraphData => ({
    entities: [
      { id: 'doc_agents_README', type: 'Document', name: 'Agent README', category: 'agents', entityCount: 5 },
      { id: 'doc_core_architecture', type: 'Document', name: 'Core Architecture', category: 'core', entityCount: 8 },
      { id: 'Port_8080', type: 'Port', name: '8080', occurrences: 3 },
      { id: 'Service_KnowledgeGraph', type: 'Service', name: 'Knowledge Graph', occurrences: 5 },
      { id: 'category_agents', type: 'Category', name: 'agents', documentCount: 4 },
      { id: 'category_core', type: 'Category', name: 'core', documentCount: 3 }
    ],
    relationships: [
      { from: 'doc_agents_README', to: 'Port_8080', type: 'CONTAINS', properties: { confidence: 1.0 } },
      { from: 'doc_core_architecture', to: 'Service_KnowledgeGraph', type: 'CONTAINS', properties: { confidence: 0.9 } },
      { from: 'doc_agents_README', to: 'category_agents', type: 'BELONGS_TO', properties: { confidence: 1.0 } },
      { from: 'doc_core_architecture', to: 'category_core', type: 'BELONGS_TO', properties: { confidence: 1.0 } }
    ],
    statistics: {
      totalEntities: 6,
      totalDocuments: 2,
      totalRelationships: 4,
      entityTypes: { Document: 2, Port: 1, Service: 1, Category: 2 },
      documentStats: { byCategory: { agents: 1, core: 1 } }
    }
  });

  useEffect(() => {
    loadGraphData();
  }, []);

  useEffect(() => {
    if (rawData) {
      processGraphData(rawData);
    }
  }, [filters, rawData]);

  const entityTypes = rawData ? Object.keys(rawData.statistics.entityTypes) : [];
  const categories = rawData ? Object.keys(rawData.statistics.documentStats.byCategory) : [];

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading as="h2" size="lg">Knowledge Graph Visualization</Heading>
          <Text color={useSemanticToken('text.secondary')}>
            Interactive 3D network of documents, entities, and relationships
          </Text>
        </Box>
        <HStack>
          <Button
            leftIcon={<Icon as={FiDownload} />}
            onClick={exportGraph}
            variant="outline"
            size="sm"
          >
            Export
          </Button>
          <Button
            leftIcon={<Icon as={FiRefreshCw} />}
            onClick={loadGraphData}
            isLoading={isLoading}
            colorScheme="blue"
            size="sm"
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      {error && (
        <Alert status="warning" mb={6}>
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Using sample data</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
        </Alert>
      )}

      <Flex gap={6} height="600px">
        {/* Graph Controls */}
        <Box width="250px" bg={bgColor} borderWidth={1} borderRadius="md" p={4}>
          <VStack spacing={4} align="stretch">
            <Box>
              <Text fontWeight="bold" mb={2}>Display Options</Text>
              <VStack spacing={2} align="stretch">
                <Checkbox
                  isChecked={filters.showDocuments}
                  onChange={(e) => handleFilterChange('showDocuments', e.target.checked)}
                >
                  Documents
                </Checkbox>
                <Checkbox
                  isChecked={filters.showEntities}
                  onChange={(e) => handleFilterChange('showEntities', e.target.checked)}
                >
                  Entities
                </Checkbox>
                <Checkbox
                  isChecked={filters.showCategories}
                  onChange={(e) => handleFilterChange('showCategories', e.target.checked)}
                >
                  Categories
                </Checkbox>
              </VStack>
            </Box>

            <Box>
              <Text fontWeight="bold" mb={2}>Entity Types</Text>
              <VStack spacing={1} align="stretch" maxH="120px" overflowY="auto">
                {entityTypes.map(type => (
                  <Checkbox
                    key={type}
                    size="sm"
                    isChecked={filters.entityTypes.has(type)}
                    onChange={() => handleFilterChange('entityType', type)}
                  >
                    {type} ({rawData?.statistics.entityTypes[type]})
                  </Checkbox>
                ))}
              </VStack>
            </Box>

            <Box>
              <Text fontWeight="bold" mb={2}>Categories</Text>
              <VStack spacing={1} align="stretch" maxH="100px" overflowY="auto">
                {categories.map(category => (
                  <Checkbox
                    key={category}
                    size="sm"
                    isChecked={filters.categories.has(category)}
                    onChange={() => handleFilterChange('category', category)}
                  >
                    {category} ({rawData?.statistics.documentStats.byCategory[category]})
                  </Checkbox>
                ))}
              </VStack>
            </Box>

            <Box>
              <Text fontWeight="bold" mb={2}>Min Occurrences: {filters.minOccurrences}</Text>
              <Slider
                value={filters.minOccurrences}
                min={1}
                max={10}
                onChange={(value) => handleFilterChange('minOccurrences', value)}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </Box>

            {selectedNode && (
              <Box p={3} bg="blue.50" borderRadius="md" borderLeftWidth={4} borderLeftColor="blue.500">
                <Text fontWeight="bold" fontSize="sm">{selectedNode.name}</Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Type: {selectedNode.type}</Text>
                {selectedNode.category && (
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Category: {selectedNode.category}</Text>
                )}
                {selectedNode.occurrences && (
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Occurrences: {selectedNode.occurrences}</Text>
                )}
                {selectedNode.entityCount && (
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Entities: {selectedNode.entityCount}</Text>
                )}
              </Box>
            )}
          </VStack>
        </Box>

        {/* 3D Graph */}
        <Box flex={1} bg={bgColor} borderWidth={1} borderRadius="md" position="relative">
          {isLoading && (
            <Flex 
              position="absolute" 
              top={0} 
              left={0} 
              right={0} 
              bottom={0} 
              align="center" 
              justify="center" 
              bg={useSemanticToken('glass.background')}
              zIndex={10}
            >
              <VStack>
                <Spinner size="xl" />
                <Text>Loading graph data...</Text>
              </VStack>
            </Flex>
          )}
          
          <ForceGraph3D
            ref={fgRef}
            graphData={graphData}
            nodeLabel="name"
            nodeColor="color"
            nodeVal="val"
            linkWidth="value"
            linkColor={() => 'rgba(100,100,100,0.3)'}
            onNodeClick={handleNodeClick}
            onNodeHover={(node) => {
              if (node) {
                document.body.style.cursor = 'pointer';
              } else {
                document.body.style.cursor = 'default';
              }
            }}
            backgroundColor="rgba(0,0,0,0)"
            controlType="orbit"
            showNavInfo={false}
            enableNodeDrag={true}
            width={undefined}
            height={undefined}
          />

          {/* Graph Stats Overlay */}
          <Box position="absolute" top={4} right={4} bg={useSemanticToken('glass.background')} p={2} borderRadius="md">
            <VStack spacing={1} align="start">
              <Text fontSize="xs" fontWeight="bold">Graph Stats</Text>
              <Text fontSize="xs">Nodes: {graphData.nodes.length}</Text>
              <Text fontSize="xs">Links: {graphData.links.length}</Text>
            </VStack>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
};

export default Neo4jGraphView;
