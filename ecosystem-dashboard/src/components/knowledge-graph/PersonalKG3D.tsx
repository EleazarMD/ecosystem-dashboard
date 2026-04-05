/**
 * Personal Knowledge Base (PKB) 3D Visualization
 * 
 * GPU-accelerated 3D force-directed graph for the Personal Knowledge Graph.
 * Visualizes entities, relationships, and communities from Neo4j.
 * 
 * Features:
 * - Interactive 3D navigation (rotate, zoom, pan)
 * - Entity clustering by type (person, project, technology, concept)
 * - Relationship visualization with directional particles
 * - Community highlighting
 * - Click-to-focus on entities
 * - Real-time graph updates
 * 
 * Distinct from EmailGraph3D which visualizes email-specific relationships.
 * 
 * @module components/knowledge-graph/PersonalKG3D
 */

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonGroup,
  Badge,
  Spinner,
  Center,
  useColorModeValue,
  Tooltip,
  IconButton,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Switch,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import {
  ArrowPathIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ViewfinderCircleIcon,
  CubeIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  CircleStackIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => (
    <Center h="100%">
      <VStack>
        <Spinner size="xl" color="purple.500" thickness="4px" />
        <Text color="gray.400">Initializing WebGL...</Text>
      </VStack>
    </Center>
  ),
});

interface GraphNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  properties?: Record<string, any>;
  community_id?: string;
  source_document_id?: string;
  created_at?: string;
  val?: number;
  color?: string;
  fx?: number;
  fy?: number;
  fz?: number;
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
  description?: string;
  weight?: number;
  color?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  stats?: {
    total_entities: number;
    total_relationships: number;
    by_type: Array<{ type: string; count: number }>;
  };
}

interface KnowledgeGraph3DProps {
  graphragUrl?: string;
  height?: string | number;
  initialEntityId?: string;
  onEntitySelect?: (entity: GraphNode) => void;
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  person: '#f59e0b',
  project: '#6366f1',
  technology: '#10b981',
  concept: '#8b5cf6',
  organization: '#ec4899',
  topic: '#14b8a6',
  location: '#f97316',
  event: '#ef4444',
  document: '#64748b',
  default: '#6b7280',
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  created_by: '#f59e0b',
  part_of: '#6366f1',
  uses: '#10b981',
  related_to: '#8b5cf6',
  works_at: '#ec4899',
  knows: '#14b8a6',
  default: '#4a5568',
};

export const PersonalKG3D: React.FC<KnowledgeGraph3DProps> = ({
  graphragUrl = 'http://localhost:8765',
  height = '600px',
  initialEntityId,
  onEntitySelect,
}) => {
  const fgRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  const [showParticles, setShowParticles] = useState(true);
  const [nodeSize, setNodeSize] = useState(1);
  const [linkOpacity, setLinkOpacity] = useState(0.6);
  const [showLabels, setShowLabels] = useState(true);
  
  const bgColor = useColorModeValue('#1a1a2e', '#0a0a1a');

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filterType !== 'all') {
        params.set('type', filterType);
      }
      
      const response = await fetch(`${graphragUrl}/api/kg/graph?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch graph: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      const nodes: GraphNode[] = (data.entities || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        type: e.type || 'default',
        description: e.description,
        properties: e.properties,
        community_id: e.community_id,
        source_document_id: e.source_document_id,
        created_at: e.created_at,
        val: 5,
        color: ENTITY_TYPE_COLORS[e.type] || ENTITY_TYPE_COLORS.default,
      }));
      
      const links: GraphLink[] = (data.relationships || []).map((r: any) => ({
        source: r.source_entity_id || r.source_entity,
        target: r.target_entity_id || r.target_entity,
        type: r.type,
        description: r.description,
        weight: r.weight || 1,
        color: RELATIONSHIP_COLORS[r.type] || RELATIONSHIP_COLORS.default,
      }));
      
      setGraphData({ nodes, links, stats: data.stats });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
      console.error('Graph fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [graphragUrl, filterType]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    onEntitySelect?.(node);
    
    if (fgRef.current) {
      const distance = 150;
      const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);
      
      fgRef.current.cameraPosition(
        {
          x: (node.x || 0) * distRatio,
          y: (node.y || 0) * distRatio,
          z: (node.z || 0) * distRatio,
        },
        node,
        2000
      );
    }
  }, [onEntitySelect]);

  const handleResetView = useCallback(() => {
    setSelectedNode(null);
    setSearchQuery('');
    
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 500 }, { x: 0, y: 0, z: 0 }, 1000);
    }
  }, []);

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (fgRef.current) {
      const camera = fgRef.current.camera();
      const currentZ = camera.position.z;
      const newZ = direction === 'in' ? currentZ * 0.7 : currentZ * 1.4;
      fgRef.current.cameraPosition({ z: newZ }, null, 500);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await fetch(`${graphragUrl}/api/kg/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 5 }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const topEntity = data.entities?.[0];
        if (topEntity) {
          const node = graphData.nodes.find(n => n.id === topEntity.id);
          if (node) {
            handleNodeClick(node);
          }
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  }, [searchQuery, graphragUrl, graphData.nodes, handleNodeClick]);

  const nodeVal = useCallback((node: GraphNode) => {
    return Math.sqrt(node.val || 1) * nodeSize * 3;
  }, [nodeSize]);

  const nodeColor = useCallback((node: GraphNode) => {
    if (selectedNode && node.id === selectedNode.id) {
      return '#ffffff';
    }
    return node.color || ENTITY_TYPE_COLORS.default;
  }, [selectedNode]);

  const linkColor = useCallback((link: GraphLink) => {
    return link.color || RELATIONSHIP_COLORS.default;
  }, []);

  const linkWidth = useCallback((link: GraphLink) => {
    return Math.sqrt(link.weight || 1) * 0.5;
  }, []);

  const graphConfig = useMemo(() => ({
    nodeLabel: (node: GraphNode) => {
      const typeColor = ENTITY_TYPE_COLORS[node.type] || ENTITY_TYPE_COLORS.default;
      
      return `
        <div style="background: rgba(0,0,0,0.95); padding: 12px 16px; border-radius: 10px; font-family: system-ui; min-width: 220px; border-left: 3px solid ${typeColor}; max-width: 350px;">
          <div style="font-weight: bold; color: #fff; font-size: 14px;">${node.name}</div>
          <div style="display: inline-block; background: ${typeColor}; color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin-top: 6px; text-transform: uppercase;">${node.type}</div>
          ${node.description ? `<div style="color: #a0aec0; font-size: 12px; margin-top: 8px; line-height: 1.4;">${node.description.substring(0, 150)}${node.description.length > 150 ? '...' : ''}</div>` : ''}
          ${node.community_id ? `<div style="color: #8b5cf6; font-size: 11px; margin-top: 6px;">🏘️ Community: ${node.community_id}</div>` : ''}
          ${node.created_at ? `<div style="color: #64748b; font-size: 10px; margin-top: 4px;">Created: ${new Date(node.created_at).toLocaleDateString()}</div>` : ''}
        </div>
      `;
    },
    linkLabel: (link: GraphLink) => {
      const linkType = link.type || 'related';
      return `
        <div style="background: rgba(0,0,0,0.9); padding: 6px 10px; border-radius: 6px; font-family: system-ui;">
          <div style="color: #a78bfa; font-size: 11px; text-transform: uppercase;">${linkType.replace(/_/g, ' ')}</div>
          ${link.description ? `<div style="color: #9ca3af; font-size: 10px; margin-top: 2px;">${link.description.substring(0, 80)}</div>` : ''}
        </div>
      `;
    },
  }), []);

  const entityTypes = useMemo(() => {
    const types = new Set(graphData.nodes.map(n => n.type));
    return ['all', ...Array.from(types)];
  }, [graphData.nodes]);

  if (error) {
    return (
      <GlassPanel p={6} h={height}>
        <Center h="100%">
          <VStack spacing={4}>
            <Text color="red.400" fontSize="lg">⚠️ {error}</Text>
            <Button onClick={fetchGraph} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
              Retry
            </Button>
          </VStack>
        </Center>
      </GlassPanel>
    );
  }

  return (
    <Box position="relative" h={height} w="100%">
      {/* Controls Overlay - Top Left */}
      <HStack position="absolute" top={4} left={4} zIndex={10} spacing={2}>
        <GlassPanel p={2}>
          <ButtonGroup size="sm" isAttached variant="ghost">
            <Tooltip label="Reset View">
              <IconButton
                aria-label="Reset view"
                icon={<CubeIcon className="w-4 h-4" />}
                onClick={handleResetView}
              />
            </Tooltip>
            <Tooltip label="Zoom In">
              <IconButton
                aria-label="Zoom in"
                icon={<MagnifyingGlassPlusIcon className="w-4 h-4" />}
                onClick={() => handleZoom('in')}
              />
            </Tooltip>
            <Tooltip label="Zoom Out">
              <IconButton
                aria-label="Zoom out"
                icon={<MagnifyingGlassMinusIcon className="w-4 h-4" />}
                onClick={() => handleZoom('out')}
              />
            </Tooltip>
            <Tooltip label="Refresh">
              <IconButton
                aria-label="Refresh"
                icon={<ArrowPathIcon className="w-4 h-4" />}
                onClick={fetchGraph}
                isLoading={loading}
              />
            </Tooltip>
          </ButtonGroup>
        </GlassPanel>

        {/* Settings Popover */}
        <Popover placement="bottom-start">
          <PopoverTrigger>
            <IconButton
              aria-label="Settings"
              icon={<AdjustmentsHorizontalIcon className="w-4 h-4" />}
              size="sm"
              variant="ghost"
            />
          </PopoverTrigger>
          <PopoverContent bg="gray.900" borderColor="gray.700" w="250px">
            <PopoverBody>
              <VStack spacing={4} align="stretch">
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb={0} fontSize="sm">Particles</FormLabel>
                  <Switch
                    isChecked={showParticles}
                    onChange={(e) => setShowParticles(e.target.checked)}
                    colorScheme="purple"
                  />
                </FormControl>
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb={0} fontSize="sm">Labels</FormLabel>
                  <Switch
                    isChecked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                    colorScheme="purple"
                  />
                </FormControl>
                <Box>
                  <Text fontSize="sm" mb={2}>Node Size</Text>
                  <Slider
                    value={nodeSize}
                    min={0.5}
                    max={2}
                    step={0.1}
                    onChange={setNodeSize}
                  >
                    <SliderTrack><SliderFilledTrack bg="purple.500" /></SliderTrack>
                    <SliderThumb />
                  </Slider>
                </Box>
                <Box>
                  <Text fontSize="sm" mb={2}>Link Opacity</Text>
                  <Slider
                    value={linkOpacity}
                    min={0.1}
                    max={1}
                    step={0.1}
                    onChange={setLinkOpacity}
                  >
                    <SliderTrack><SliderFilledTrack bg="purple.500" /></SliderTrack>
                    <SliderThumb />
                  </Slider>
                </Box>
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </HStack>

      {/* Search & Filter - Top Right */}
      <HStack position="absolute" top={4} right={4} zIndex={10} spacing={2}>
        <GlassPanel p={2}>
          <HStack spacing={2}>
            <InputGroup size="sm" w="200px">
              <InputLeftElement>
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
              </InputLeftElement>
              <Input
                placeholder="Search entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                bg="whiteAlpha.100"
                border="none"
              />
            </InputGroup>
            <Select
              size="sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              w="120px"
              bg="whiteAlpha.100"
              border="none"
            >
              {entityTypes.map(type => (
                <option key={type} value={type} style={{ background: '#1a1a2e' }}>
                  {type === 'all' ? 'All Types' : type}
                </option>
              ))}
            </Select>
          </HStack>
        </GlassPanel>
      </HStack>

      {/* Stats Badge - Bottom Left */}
      <HStack position="absolute" bottom={4} left={4} zIndex={10} spacing={2}>
        <GlassPanel p={2}>
          <HStack spacing={3} fontSize="xs">
            <HStack>
              <CircleStackIcon className="w-4 h-4 text-purple-400" />
              <Text color="gray.300">{graphData.nodes.length} entities</Text>
            </HStack>
            <HStack>
              <SparklesIcon className="w-4 h-4 text-cyan-400" />
              <Text color="gray.300">{graphData.links.length} relationships</Text>
            </HStack>
          </HStack>
        </GlassPanel>
      </HStack>

      {/* Legend - Bottom Right */}
      <VStack position="absolute" bottom={4} right={4} zIndex={10} align="end" spacing={1}>
        <GlassPanel p={2}>
          <VStack align="start" spacing={1} fontSize="xs">
            <Text color="gray.400" fontWeight="bold" mb={1}>Entity Types</Text>
            {Object.entries(ENTITY_TYPE_COLORS).slice(0, 6).map(([type, color]) => (
              <HStack key={type} spacing={2}>
                <Box w={3} h={3} borderRadius="full" bg={color} />
                <Text color="gray.300" textTransform="capitalize">{type}</Text>
              </HStack>
            ))}
          </VStack>
        </GlassPanel>
      </VStack>

      {/* Selected Entity Panel */}
      {selectedNode && (
        <Box
          position="absolute"
          top={16}
          left={4}
          zIndex={10}
          maxW="300px"
        >
          <GlassPanel p={4}>
            <VStack align="start" spacing={2}>
              <HStack justify="space-between" w="full">
                <Text fontWeight="bold" color="white">{selectedNode.name}</Text>
                <Badge colorScheme="purple">{selectedNode.type}</Badge>
              </HStack>
              {selectedNode.description && (
                <Text fontSize="sm" color="gray.300" noOfLines={3}>
                  {selectedNode.description}
                </Text>
              )}
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setSelectedNode(null)}
              >
                Clear Selection
              </Button>
            </VStack>
          </GlassPanel>
        </Box>
      )}

      {/* 3D Graph */}
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        backgroundColor={bgColor}
        nodeVal={nodeVal}
        nodeColor={nodeColor}
        nodeLabel={graphConfig.nodeLabel}
        nodeOpacity={0.9}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkOpacity={linkOpacity}
        linkLabel={graphConfig.linkLabel}
        linkDirectionalParticles={showParticles ? 2 : 0}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        onNodeClick={handleNodeClick}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
      />
    </Box>
  );
};

export default PersonalKG3D;
