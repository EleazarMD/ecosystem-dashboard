/**
 * Email Graph 3D Visualization (Simplified)
 * 
 * GPU-accelerated 3D force-directed graph using WebGL.
 */

import React, { useRef, useState, useEffect, memo } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';

// Dynamic import for SSR compatibility - must be outside component
const ForceGraph3D = dynamic(
  () => import('react-force-graph-3d').then(mod => mod.default),
  { ssr: false }
);

interface GraphNode {
  id: string;
  name: string;
  email?: string;
  type: 'person' | 'email';
  email_count?: number;
  sent_count?: number;
  received_count?: number;
  val?: number;
  color?: string;
}

interface GraphLink {
  source: string;
  target: string;
  weight?: number;
  type?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface EmailGraph3DProps {
  graphragUrl?: string;
  height?: string | number;
}

// Memoized graph component to prevent re-renders
const Graph3DRenderer = memo(({ 
  data, 
  onNodeClick 
}: { 
  data: GraphData; 
  onNodeClick: (node: GraphNode) => void;
}) => {
  const fgRef = useRef<any>(null);

  if (!data.nodes.length) {
    return (
      <Center h="100%">
        <Text color="gray.400">No graph data available</Text>
      </Center>
    );
  }

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={data}
      backgroundColor="#0a0a1a"
      nodeVal={(node: GraphNode) => Math.sqrt(node.val || 1) * 3}
      nodeColor={(node: GraphNode) => node.color || '#6366f1'}
      nodeLabel={(node: GraphNode) => `${node.name} (${node.email_count || 0} emails)`}
      onNodeClick={onNodeClick}
      linkColor={() => '#4a5568'}
      linkWidth={(link: GraphLink) => Math.sqrt(link.weight || 1) * 0.5}
      linkOpacity={0.6}
      linkDirectionalParticles={2}
      linkDirectionalParticleWidth={2}
      linkDirectionalParticleSpeed={0.005}
      linkDirectionalParticleColor={() => '#a78bfa'}
      enableNodeDrag={true}
      enableNavigationControls={true}
      showNavInfo={false}
    />
  );
});

Graph3DRenderer.displayName = 'Graph3DRenderer';

export const EmailGraph3D: React.FC<EmailGraph3DProps> = ({
  graphragUrl = 'http://localhost:8780',
  height = '600px',
}) => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch graph data only once on mount
  useEffect(() => {
    if (hasFetched) return;
    
    const fetchGraph = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${graphragUrl}/graph/full?limit=200`);
        if (!response.ok) {
          throw new Error(`Failed to fetch graph: ${response.statusText}`);
        }
        
        const data = await response.json();
        setGraphData(data);
        setHasFetched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load graph');
        console.error('Graph fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [graphragUrl, hasFetched]);

  const handleRefresh = () => {
    setHasFetched(false);
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
  };

  if (error) {
    return (
      <GlassPanel p={6} h={height}>
        <Center h="100%">
          <VStack spacing={4}>
            <Text color="red.400" fontSize="lg">⚠️ {error}</Text>
            <Button onClick={handleRefresh} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
              Retry
            </Button>
          </VStack>
        </Center>
      </GlassPanel>
    );
  }

  return (
    <Box position="relative" h={height} w="100%">
      {/* Controls */}
      <HStack position="absolute" top={4} left={4} zIndex={10} spacing={2}>
        <GlassPanel p={2}>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            isLoading={loading}
            leftIcon={<ArrowPathIcon className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </GlassPanel>
      </HStack>

      {/* Stats */}
      <HStack position="absolute" top={4} right={4} zIndex={10}>
        <GlassPanel p={2} px={3}>
          <HStack spacing={3}>
            <Text fontSize="sm" color="white">
              {graphData.nodes.length} contacts
            </Text>
            <Text fontSize="sm" color="gray.400">•</Text>
            <Text fontSize="sm" color="white">
              {graphData.links.length} connections
            </Text>
          </HStack>
        </GlassPanel>
      </HStack>

      {/* Selected Node Info */}
      {selectedNode && (
        <GlassPanel position="absolute" bottom={4} left={4} zIndex={10} p={4} maxW="300px">
          <VStack align="start" spacing={2}>
            <HStack>
              <Box w={3} h={3} borderRadius="full" bg={selectedNode.color || 'purple.500'} />
              <Text fontWeight="bold" color="white">{selectedNode.name}</Text>
            </HStack>
            {selectedNode.email && (
              <Text fontSize="sm" color="gray.400">{selectedNode.email}</Text>
            )}
            <HStack spacing={2}>
              {selectedNode.email_count && (
                <Badge colorScheme="purple">{selectedNode.email_count} emails</Badge>
              )}
              {selectedNode.sent_count && (
                <Badge colorScheme="blue">↑ {selectedNode.sent_count}</Badge>
              )}
              {selectedNode.received_count && (
                <Badge colorScheme="green">↓ {selectedNode.received_count}</Badge>
              )}
            </HStack>
          </VStack>
        </GlassPanel>
      )}

      {/* Legend */}
      <GlassPanel position="absolute" bottom={4} right={4} zIndex={10} p={3}>
        <VStack align="start" spacing={1}>
          <Text fontSize="xs" color="gray.400" fontWeight="bold">LEGEND</Text>
          <HStack spacing={2}>
            <Box w={3} h={3} borderRadius="full" bg="#6366f1" />
            <Text fontSize="xs" color="gray.300">More sent</Text>
          </HStack>
          <HStack spacing={2}>
            <Box w={3} h={3} borderRadius="full" bg="#10b981" />
            <Text fontSize="xs" color="gray.300">More received</Text>
          </HStack>
        </VStack>
      </GlassPanel>

      {/* 3D Graph */}
      <Box h="100%" w="100%" bg="#0a0a1a" borderRadius="xl" overflow="hidden">
        {loading ? (
          <Center h="100%">
            <VStack spacing={4}>
              <Spinner size="xl" color="purple.500" thickness="4px" speed="0.8s" />
              <Text color="gray.400">Loading graph data...</Text>
            </VStack>
          </Center>
        ) : (
          <Graph3DRenderer data={graphData} onNodeClick={handleNodeClick} />
        )}
      </Box>
    </Box>
  );
};

export default EmailGraph3D;
