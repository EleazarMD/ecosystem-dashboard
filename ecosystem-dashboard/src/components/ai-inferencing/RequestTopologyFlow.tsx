/**
 * Request Topology Flow
 * Interactive topology diagram showing LLM request routing
 * Client → AI Inferencing → AI Gateway → Provider
 */

import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import {
  FiActivity,
  FiServer,
  FiCpu,
  FiCloud,
  FiClock,
  FiZap,
  FiCheckCircle,
} from 'react-icons/fi';

// Custom Node Component
function CustomNode({ data }: any) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = data.status === 'healthy' ? 'green.400' : 'orange.400';
  
  return (
    <Box
      bg={bgColor}
      borderWidth="2px"
      borderColor={borderColor}
      borderRadius="lg"
      p={4}
      minW="280px"
      boxShadow="lg"
    >
      <VStack align="stretch" spacing={2}>
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Icon as={data.icon} boxSize={5} color={borderColor} />
            <Text fontWeight="700" fontSize="sm">
              {data.label}
            </Text>
          </HStack>
          <Badge
            colorScheme={data.status === 'healthy' ? 'green' : 'orange'}
            fontSize="xs"
          >
            {data.status}
          </Badge>
        </HStack>

        {/* Metrics */}
        <VStack align="stretch" spacing={1} pt={2} borderTopWidth="1px">
          <HStack justify="space-between" fontSize="xs">
            <HStack>
              <Icon as={FiClock} boxSize={3} />
              <Text color={useSemanticToken('text.secondary')}>Latency</Text>
            </HStack>
            <Text fontWeight="600">{data.latency}ms</Text>
          </HStack>

          <HStack justify="space-between" fontSize="xs">
            <HStack>
              <Icon as={FiZap} boxSize={3} />
              <Text color={useSemanticToken('text.secondary')}>Throughput</Text>
            </HStack>
            <Text fontWeight="600">{data.throughput} req/min</Text>
          </HStack>

          <HStack justify="space-between" fontSize="xs">
            <HStack>
              <Icon as={FiCheckCircle} boxSize={3} />
              <Text color={useSemanticToken('text.secondary')}>Success</Text>
            </HStack>
            <Text fontWeight="600" color="green.500">
              {data.successRate}%
            </Text>
          </HStack>

          <HStack justify="space-between" fontSize="xs">
            <HStack>
              <Icon as={FiActivity} boxSize={3} />
              <Text color={useSemanticToken('text.secondary')}>Active</Text>
            </HStack>
            <Badge colorScheme="blue" fontSize="2xs">
              {data.activeRequests}
            </Badge>
          </HStack>
        </VStack>
      </VStack>
    </Box>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

interface RequestTopologyFlowProps {
  selectedProvider?: string;
}

export default function RequestTopologyFlow({ selectedProvider = 'openai' }: RequestTopologyFlowProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [metrics, setMetrics] = useState<any>(null);

  const edgeColor = 'blue.500';
  const labelBgColor = useSemanticToken('surface.elevated');

  // Fetch metrics and update topology
  useEffect(() => {
    fetchTopologyData();
    const interval = setInterval(fetchTopologyData, 3000); // Update every 3s
    return () => clearInterval(interval);
  }, [selectedProvider]);

  const fetchTopologyData = async () => {
    try {
      // Fetch real topology data from AI Inferencing Service
      const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
      const ADMIN_KEY = process.env.NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY || 'ai-inferencing-admin-key-2024';
      
      const response = await fetch(`${AI_INFERENCING_URL}/api/v1/topology/${selectedProvider}`, {
        headers: {
          'X-Admin-Key': ADMIN_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch topology: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch topology');
      }

      // Map icons from string to icon component
      const iconMap: Record<string, any> = {
        FiActivity,
        FiServer,
        FiCpu,
        FiCloud,
      };

      // Add icons to nodes
      const nodesWithIcons = data.nodes.map((node: any) => ({
        ...node,
        icon: iconMap[node.icon] || FiActivity,
      }));

      updateTopology({
        nodes: nodesWithIcons,
        edges: data.edges,
      });
    } catch (error) {
      console.error('Failed to fetch topology:', error);
    }
  };

  const updateTopology = (data: any) => {
    // Create nodes
    const newNodes: Node[] = data.nodes.map((node: any, index: number) => ({
      id: node.id,
      type: 'custom',
      position: { x: index * 350, y: 100 },
      data: node,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));

    // Create edges
    const newEdges: Edge[] = data.edges.map((edge: any, index: number) => ({
      id: `e${index}`,
      source: edge.from,
      target: edge.to,
      animated: true,
      label: `${edge.latency}ms`,
      labelStyle: { fontSize: 12, fontWeight: 600 },
      labelBgStyle: { fill: labelBgColor },
      style: { stroke: edgeColor, strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edgeColor,
      },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  };

  return (
    <Box h="500px" w="100%" borderRadius="lg" overflow="hidden" position="relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </Box>
  );
}
