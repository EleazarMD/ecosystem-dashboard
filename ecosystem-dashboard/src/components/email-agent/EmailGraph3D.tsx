/**
 * Email Graph 3D Visualization
 * 
 * GPU-accelerated 3D force-directed graph using WebGL.
 * Leverages NVIDIA RTX 6000 for smooth rendering of large graphs.
 * 
 * Features:
 * - Interactive 3D navigation (rotate, zoom, pan)
 * - Node clustering by email frequency
 * - Directional particle animations on links
 * - Click-to-focus on contacts
 * - Real-time graph updates
 * 
 * @module components/email/EmailGraph3D
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
} from '@chakra-ui/react';
import {
  ArrowPathIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ViewfinderCircleIcon,
  CubeIcon,
  AdjustmentsHorizontalIcon,
  UserIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';

// Dynamic import for SSR compatibility
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
  email?: string;
  type: 'person' | 'email';
  person_type?: string;
  email_count?: number;
  sent_count?: number;
  received_count?: number;
  relationship_strength?: string;
  communication_direction?: string;
  first_seen?: string;
  last_seen?: string;
  recent_subjects?: string[];
  topics?: string[];
  val?: number;
  color?: string;
  fx?: number;
  fy?: number;
  fz?: number;
  // Runtime properties added by force-graph
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  weight?: number;
  type?: string;
  color?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  stats?: {
    total_nodes: number;
    total_links: number;
    contacts?: number;
  };
  center?: string;
}

interface EmailGraph3DProps {
  graphragUrl?: string;
  height?: string | number;
  initialPerson?: string;
}

export const EmailGraph3D: React.FC<EmailGraph3DProps> = ({
  graphragUrl = 'http://localhost:8780',
  height = '600px',
  initialPerson,
}) => {
  const fgRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'person'>('full');
  const [focusPerson, setFocusPerson] = useState<string | null>(initialPerson || null);
  
  // Visual settings
  const [showParticles, setShowParticles] = useState(true);
  const [nodeSize, setNodeSize] = useState(1);
  const [linkOpacity, setLinkOpacity] = useState(0.6);
  const [showLabels, setShowLabels] = useState(true);
  
  // Colors
  const bgColor = useColorModeValue('#1a1a2e', '#0a0a1a');
  const textColor = useColorModeValue('gray.100', 'gray.100');

  // Fetch graph data
  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let url = `${graphragUrl}/graph/full?limit=300`;
      
      if (viewMode === 'person' && focusPerson) {
        url = `${graphragUrl}/graph/person/${encodeURIComponent(focusPerson)}?include_emails=false`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch graph: ${response.statusText}`);
      }
      
      const data = await response.json();
      setGraphData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
      console.error('Graph fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [graphragUrl, viewMode, focusPerson]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Node click handler
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    
    // Zoom to node
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
  }, []);

  // Double-click to focus on person
  const handleNodeDoubleClick = useCallback((node: GraphNode) => {
    if (node.type === 'person' && node.email) {
      setFocusPerson(node.email);
      setViewMode('person');
    }
  }, []);

  // Reset view
  const handleResetView = useCallback(() => {
    setViewMode('full');
    setFocusPerson(null);
    setSelectedNode(null);
    
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 500 }, { x: 0, y: 0, z: 0 }, 1000);
    }
  }, []);

  // Zoom controls
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (fgRef.current) {
      const camera = fgRef.current.camera();
      const currentZ = camera.position.z;
      const newZ = direction === 'in' ? currentZ * 0.7 : currentZ * 1.4;
      fgRef.current.cameraPosition({ z: newZ }, null, 500);
    }
  }, []);

  // Node size calculation
  const nodeVal = useCallback((node: GraphNode) => {
    return Math.sqrt(node.val || 1) * nodeSize * 3;
  }, [nodeSize]);

  // Node color
  const nodeColor = useCallback((node: GraphNode) => {
    return node.color || '#6366f1';
  }, []);

  // Link styling
  const linkColor = useCallback((link: GraphLink) => {
    return link.color || '#4a5568';
  }, []);

  const linkWidth = useCallback((link: GraphLink) => {
    return Math.sqrt(link.weight || 1) * 0.5;
  }, []);

  // Person type badge colors
  const personTypeColors: Record<string, string> = {
    colleague: '#6366f1',
    owner: '#f59e0b',
    vendor: '#8b5cf6',
    newsletter: '#64748b',
    system: '#64748b',
    unknown: '#10b981',
  };

  // Memoized graph config
  const graphConfig = useMemo(() => ({
    nodeLabel: (node: GraphNode) => {
      const typeColor = personTypeColors[node.person_type || 'unknown'] || '#10b981';
      const topicsStr = node.topics?.slice(0, 3).join(', ') || '';
      const recentSubject = node.recent_subjects?.[0]?.substring(0, 40) || '';
      
      return `
        <div style="background: rgba(0,0,0,0.9); padding: 12px 16px; border-radius: 10px; font-family: system-ui; min-width: 220px; border-left: 3px solid ${typeColor};">
          <div style="font-weight: bold; color: #fff; font-size: 14px;">${node.name}</div>
          ${node.email ? `<div style="color: #a0aec0; font-size: 11px;">${node.email}</div>` : ''}
          ${node.person_type ? `<div style="display: inline-block; background: ${typeColor}; color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin-top: 6px;">${node.person_type}</div>` : ''}
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #333;">
            ${node.email_count ? `<div style="color: #68d391; font-size: 12px;">📧 ${node.email_count} emails</div>` : ''}
            <div style="display: flex; gap: 12px; margin-top: 4px;">
              ${node.sent_count ? `<span style="color: #63b3ed; font-size: 11px;">↑ ${node.sent_count} sent</span>` : ''}
              ${node.received_count ? `<span style="color: #fc8181; font-size: 11px;">↓ ${node.received_count} received</span>` : ''}
            </div>
            ${node.relationship_strength ? `<div style="color: #a78bfa; font-size: 11px; margin-top: 4px;">💪 ${node.relationship_strength}</div>` : ''}
          </div>
          ${topicsStr ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #333;"><div style="color: #fbbf24; font-size: 10px; font-weight: bold;">TOPICS</div><div style="color: #d1d5db; font-size: 11px; margin-top: 2px;">${topicsStr}</div></div>` : ''}
          ${recentSubject ? `<div style="margin-top: 6px;"><div style="color: #60a5fa; font-size: 10px; font-weight: bold;">RECENT</div><div style="color: #9ca3af; font-size: 11px; margin-top: 2px;">${recentSubject}...</div></div>` : ''}
        </div>
      `;
    },
    linkLabel: (link: GraphLink) => link.weight ? `${link.weight} emails` : '',
  }), []);

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
      {/* Controls Overlay */}
      <HStack
        position="absolute"
        top={4}
        left={4}
        zIndex={10}
        spacing={2}
      >
        <GlassPanel p={2}>
          <ButtonGroup size="sm" isAttached variant="ghost">
            <Tooltip label="Full Network">
              <IconButton
                aria-label="Full view"
                icon={<CubeIcon className="w-4 h-4" />}
                onClick={handleResetView}
                colorScheme={viewMode === 'full' ? 'purple' : 'gray'}
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
          <PopoverContent bg="gray.800" borderColor="gray.700" w="250px">
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
                <FormControl>
                  <FormLabel fontSize="sm">Node Size</FormLabel>
                  <Slider
                    value={nodeSize}
                    onChange={setNodeSize}
                    min={0.5}
                    max={2}
                    step={0.1}
                  >
                    <SliderTrack>
                      <SliderFilledTrack bg="purple.500" />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Link Opacity</FormLabel>
                  <Slider
                    value={linkOpacity}
                    onChange={setLinkOpacity}
                    min={0.1}
                    max={1}
                    step={0.1}
                  >
                    <SliderTrack>
                      <SliderFilledTrack bg="purple.500" />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                </FormControl>
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </HStack>

      {/* Stats Overlay */}
      <HStack
        position="absolute"
        top={4}
        right={4}
        zIndex={10}
        spacing={2}
      >
        <GlassPanel p={2} px={3}>
          <HStack spacing={3}>
            <HStack spacing={1}>
              <UserIcon className="w-4 h-4" style={{ color: '#a78bfa' }} />
              <Text fontSize="sm" fontWeight="bold" color="white">
                {graphData.stats?.total_nodes || graphData.nodes.length}
              </Text>
            </HStack>
            <HStack spacing={1}>
              <EnvelopeIcon className="w-4 h-4" style={{ color: '#34d399' }} />
              <Text fontSize="sm" fontWeight="bold" color="white">
                {graphData.stats?.total_links || graphData.links.length}
              </Text>
            </HStack>
          </HStack>
        </GlassPanel>
        
        {viewMode === 'person' && focusPerson && (
          <Badge colorScheme="purple" fontSize="sm" px={3} py={1}>
            Focus: {focusPerson.split('@')[0]}
          </Badge>
        )}
      </HStack>

      {/* Selected Node Info */}
      {selectedNode && (
        <GlassPanel
          position="absolute"
          bottom={4}
          left={4}
          zIndex={10}
          p={4}
          maxW="320px"
        >
          <VStack align="start" spacing={3}>
            <HStack>
              <Box
                w={3}
                h={3}
                borderRadius="full"
                bg={selectedNode.color || 'purple.500'}
              />
              <Text fontWeight="bold" color="white">{selectedNode.name}</Text>
              {selectedNode.person_type && (
                <Badge 
                  colorScheme={
                    selectedNode.person_type === 'colleague' ? 'purple' :
                    selectedNode.person_type === 'owner' ? 'yellow' :
                    selectedNode.person_type === 'vendor' ? 'pink' : 'gray'
                  }
                  fontSize="xs"
                >
                  {selectedNode.person_type}
                </Badge>
              )}
            </HStack>
            {selectedNode.email && (
              <Text fontSize="sm" color="gray.400">{selectedNode.email}</Text>
            )}
            <HStack spacing={3} flexWrap="wrap">
              {selectedNode.email_count && (
                <Badge colorScheme="purple">
                  📧 {selectedNode.email_count} emails
                </Badge>
              )}
              {selectedNode.sent_count !== undefined && selectedNode.sent_count > 0 && (
                <Badge colorScheme="blue">
                  ↑ {selectedNode.sent_count} sent
                </Badge>
              )}
              {selectedNode.received_count !== undefined && selectedNode.received_count > 0 && (
                <Badge colorScheme="green">
                  ↓ {selectedNode.received_count} received
                </Badge>
              )}
            </HStack>
            {selectedNode.relationship_strength && (
              <HStack>
                <Text fontSize="xs" color="gray.500">Relationship:</Text>
                <Badge colorScheme="pink">{selectedNode.relationship_strength}</Badge>
              </HStack>
            )}
            {selectedNode.topics && selectedNode.topics.length > 0 && (
              <VStack align="start" spacing={1} w="100%">
                <Text fontSize="xs" color="yellow.400" fontWeight="bold">TOPICS</Text>
                <HStack flexWrap="wrap" spacing={1}>
                  {selectedNode.topics.slice(0, 4).map((topic, i) => (
                    <Badge key={i} colorScheme="yellow" variant="subtle" fontSize="xs">
                      {topic}
                    </Badge>
                  ))}
                </HStack>
              </VStack>
            )}
            {selectedNode.recent_subjects && selectedNode.recent_subjects.length > 0 && (
              <VStack align="start" spacing={1} w="100%">
                <Text fontSize="xs" color="blue.400" fontWeight="bold">RECENT EMAILS</Text>
                {selectedNode.recent_subjects.slice(0, 2).map((subj, i) => (
                  <Text key={i} fontSize="xs" color="gray.400" noOfLines={1}>
                    • {subj}
                  </Text>
                ))}
              </VStack>
            )}
            {selectedNode.type === 'person' && (
              <Button
                size="sm"
                colorScheme="purple"
                w="100%"
                onClick={() => {
                  setFocusPerson(selectedNode.email || selectedNode.id);
                  setViewMode('person');
                }}
              >
                Focus on this contact
              </Button>
            )}
          </VStack>
        </GlassPanel>
      )}

      {/* Legend */}
      <GlassPanel
        position="absolute"
        bottom={4}
        right={4}
        zIndex={10}
        p={3}
      >
        <VStack align="start" spacing={1}>
          <Text fontSize="xs" color="gray.400" fontWeight="bold">CONTACT TYPES</Text>
          <HStack spacing={2}>
            <Box w={3} h={3} borderRadius="full" bg="#6366f1" />
            <Text fontSize="xs" color="gray.300">Colleague</Text>
          </HStack>
          <HStack spacing={2}>
            <Box w={3} h={3} borderRadius="full" bg="#f59e0b" />
            <Text fontSize="xs" color="gray.300">You (Owner)</Text>
          </HStack>
          <HStack spacing={2}>
            <Box w={3} h={3} borderRadius="full" bg="#8b5cf6" />
            <Text fontSize="xs" color="gray.300">Vendor</Text>
          </HStack>
          <HStack spacing={2}>
            <Box w={3} h={3} borderRadius="full" bg="#64748b" />
            <Text fontSize="xs" color="gray.300">Newsletter/System</Text>
          </HStack>
          <HStack spacing={2}>
            <Box w={3} h={3} borderRadius="full" bg="#10b981" />
            <Text fontSize="xs" color="gray.300">Other</Text>
          </HStack>
        </VStack>
      </GlassPanel>

      {/* 3D Graph */}
      <Box
        h="100%"
        w="100%"
        bg={bgColor}
        borderRadius="xl"
        overflow="hidden"
      >
        {loading ? (
          <Center h="100%">
            <VStack spacing={4}>
              <Spinner size="xl" color="purple.500" thickness="4px" speed="0.8s" />
              <Text color="gray.400">Loading graph data...</Text>
              <Text color="gray.500" fontSize="sm">
                Leveraging GPU acceleration
              </Text>
            </VStack>
          </Center>
        ) : (
          <ForceGraph3D
            ref={fgRef}
            graphData={graphData}
            backgroundColor={bgColor}
            nodeVal={nodeVal}
            nodeColor={nodeColor}
            nodeLabel={graphConfig.nodeLabel}
            onNodeClick={handleNodeClick}
            onNodeRightClick={handleNodeDoubleClick}
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkOpacity={linkOpacity}
            linkDirectionalParticles={showParticles ? 2 : 0}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleColor={() => '#a78bfa'}
            enableNodeDrag={true}
            enableNavigationControls={true}
            showNavInfo={false}
          />
        )}
      </Box>
    </Box>
  );
};

export default EmailGraph3D;
