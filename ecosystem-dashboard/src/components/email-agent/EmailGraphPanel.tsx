/**
 * Email Graph Panel - Inline Knowledge Graph View
 * 
 * Embedded 3D graph visualization within the Email Platform.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Spinner,
  Icon,
  Button,
  ButtonGroup,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  ArrowPathIcon,
  UserGroupIcon,
  TagIcon,
  FaceSmileIcon,
  FolderIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import dynamic from 'next/dynamic';

// Dynamically import ForceGraph3D to avoid SSR issues
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

interface EmailGraphPanelProps {
  graphragUrl: string;
}

// Node type configuration
const NODE_TYPES = {
  person: { label: 'Contacts', icon: UserGroupIcon, color: '#6366f1' },
  topic: { label: 'Topics', icon: TagIcon, color: '#f59e0b' },
  sentiment: { label: 'Sentiments', icon: FaceSmileIcon, color: '#10b981' },
  category: { label: 'Categories', icon: FolderIcon, color: '#8b5cf6' },
  account: { label: 'Accounts', icon: EnvelopeIcon, color: '#007AFF' },
};

interface GraphNode {
  id: string;
  name: string;
  type: 'person' | 'topic' | 'sentiment' | 'category' | 'account';
  email?: string;
  email_count?: number;
  val: number;
  color: string;
  // Force-graph adds these at runtime
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  stats: {
    total_nodes: number;
    total_links: number;
    node_types: {
      person: number;
      topic: number;
      sentiment: number;
      category: number;
      account: number;
    };
  };
}

export const EmailGraphPanel: React.FC<EmailGraphPanelProps> = ({ graphragUrl }) => {
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(['person', 'topic', 'account']));
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const graphRef = useRef<any>(null);

  const bgColor = useColorModeValue('gray.50', 'gray.900');

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${graphragUrl}/graph/full`);
      if (response.ok) {
        const data = await response.json();
        
        // Process nodes with colors and sizes
        const processedNodes = (data.nodes || []).map((node: any) => ({
          ...node,
          val: Math.max(1, node.email_count || node.count || 1),
          color: NODE_TYPES[node.type as keyof typeof NODE_TYPES]?.color || '#888',
        }));

        setGraphData({
          nodes: processedNodes,
          links: data.links || [],
          stats: data.stats || {
            total_nodes: processedNodes.length,
            total_links: (data.links || []).length,
            node_types: { person: 0, topic: 0, sentiment: 0, category: 0 },
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = (type: string) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(type)) {
      newFilters.delete(type);
    } else {
      newFilters.add(type);
    }
    setActiveFilters(newFilters);
  };

  const filteredData = graphData ? {
    nodes: graphData.nodes.filter(n => activeFilters.has(n.type)),
    links: graphData.links.filter(l => {
      const sourceNode = graphData.nodes.find(n => n.id === (typeof l.source === 'string' ? l.source : (l.source as any).id));
      const targetNode = graphData.nodes.find(n => n.id === (typeof l.target === 'string' ? l.target : (l.target as any).id));
      return sourceNode && targetNode && activeFilters.has(sourceNode.type) && activeFilters.has(targetNode.type);
    }),
  } : null;

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    // Zoom to node
    if (graphRef.current) {
      const distance = 100;
      const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);
      graphRef.current.cameraPosition(
        { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
        node,
        1000
      );
    }
  }, []);

  const handleZoom = (direction: 'in' | 'out') => {
    if (graphRef.current) {
      const camera = graphRef.current.camera();
      const currentDistance = camera.position.length();
      const newDistance = direction === 'in' ? currentDistance * 0.7 : currentDistance * 1.4;
      graphRef.current.cameraPosition({ z: newDistance }, null, 500);
    }
  };

  if (loading) {
    return (
      <Box h="full" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="purple.400" />
          <Text color="gray.500">Loading knowledge graph...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box h="full" display="flex" flexDirection="column" overflow="hidden">
      {/* Header */}
      <HStack p={4} justify="space-between" flexShrink={0}>
        <VStack align="start" spacing={0}>
          <Heading size="lg">Knowledge Graph</Heading>
          <Text color="gray.500" fontSize="sm">
            {graphData?.stats.total_nodes || 0} nodes • {graphData?.stats.total_links || 0} connections
          </Text>
        </VStack>
        <HStack spacing={2}>
          <ButtonGroup size="sm" isAttached variant="outline">
            <Tooltip label="Zoom In">
              <Button onClick={() => handleZoom('in')}>
                <Icon as={MagnifyingGlassPlusIcon} boxSize={4} />
              </Button>
            </Tooltip>
            <Tooltip label="Zoom Out">
              <Button onClick={() => handleZoom('out')}>
                <Icon as={MagnifyingGlassMinusIcon} boxSize={4} />
              </Button>
            </Tooltip>
          </ButtonGroup>
          <Button
            leftIcon={<Icon as={ArrowPathIcon} boxSize={4} />}
            size="sm"
            variant="ghost"
            onClick={fetchGraphData}
          >
            Refresh
          </Button>
        </HStack>
      </HStack>

      {/* Filters */}
      <HStack px={4} pb={2} spacing={2} flexWrap="wrap" flexShrink={0}>
        {Object.entries(NODE_TYPES).map(([type, config]) => (
          <Badge
            key={type}
            px={3}
            py={1}
            borderRadius="full"
            cursor="pointer"
            bg={activeFilters.has(type) ? config.color : 'gray.600'}
            color="white"
            opacity={activeFilters.has(type) ? 1 : 0.5}
            onClick={() => toggleFilter(type)}
            _hover={{ opacity: 0.8 }}
            transition="all 0.2s"
          >
            <HStack spacing={1}>
              <Icon as={config.icon} boxSize={3} />
              <Text fontSize="xs">{config.label}</Text>
              <Text fontSize="xs" opacity={0.7}>
                ({graphData?.stats?.node_types?.[type as keyof typeof NODE_TYPES] || 0})
              </Text>
            </HStack>
          </Badge>
        ))}
      </HStack>

      {/* Graph Container */}
      <Box flex={1} position="relative" bg={bgColor} borderRadius="lg" mx={4} mb={4} overflow="hidden">
        {filteredData && filteredData.nodes.length > 0 ? (
          <ForceGraph3D
            ref={graphRef}
            graphData={filteredData}
            nodeLabel={(node: any) => `${node.name}${node.email ? ` (${node.email})` : ''}`}
            nodeColor={(node: any) => node.color}
            nodeVal={(node: any) => node.val}
            nodeOpacity={0.9}
            linkColor={() => 'rgba(255,255,255,0.2)'}
            linkWidth={1}
            linkOpacity={0.3}
            backgroundColor="rgba(0,0,0,0)"
            onNodeClick={handleNodeClick}
            enableNodeDrag={true}
            enableNavigationControls={true}
            showNavInfo={false}
          />
        ) : (
          <VStack h="full" justify="center" spacing={4}>
            <Text color="gray.500">No data to display</Text>
            <Text color="gray.400" fontSize="sm">Select node types above to visualize</Text>
          </VStack>
        )}

        {/* Selected Node Info */}
        {selectedNode && (
          <GlassPanel
            position="absolute"
            bottom={4}
            left={4}
            right={4}
            p={4}
            maxW="400px"
          >
            <VStack align="start" spacing={2}>
              <HStack>
                <Badge colorScheme={
                  selectedNode.type === 'person' ? 'blue' :
                  selectedNode.type === 'topic' ? 'yellow' :
                  selectedNode.type === 'sentiment' ? 'green' : 'purple'
                }>
                  {selectedNode.type}
                </Badge>
                <Text fontWeight="bold">{selectedNode.name}</Text>
              </HStack>
              {selectedNode.email && (
                <Text fontSize="sm" color="gray.500">{selectedNode.email}</Text>
              )}
              {selectedNode.email_count && (
                <Text fontSize="sm">{selectedNode.email_count} emails</Text>
              )}
              <Button size="xs" variant="ghost" onClick={() => setSelectedNode(null)}>
                Close
              </Button>
            </VStack>
          </GlassPanel>
        )}
      </Box>
    </Box>
  );
};

export default EmailGraphPanel;
