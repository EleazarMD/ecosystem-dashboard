import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
} from '@chakra-ui/react';
import { FiCpu, FiZap, FiTool, FiRepeat, FiLayers } from 'react-icons/fi';
import { Agent, EventTrace } from './types';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface AgentGraphVisualizationProps {
  selectedAgent: Agent | null;
  events: EventTrace[];
}

// Custom node component
const AgentNode = ({ data }: any) => {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = data.isActive ? 'blue.500' : 'gray.300';
  
  return (
    <Box
      bg={bgColor}
      borderWidth="2px"
      borderColor={borderColor}
      borderRadius="lg"
      p={3}
      minW="180px"
      boxShadow="md"
    >
      <VStack spacing={2} align="start">
        <HStack>
          <Icon 
            as={data.icon || FiCpu} 
            color={data.color || 'blue.500'} 
            boxSize={5}
          />
          <Text fontSize="sm" fontWeight="bold" noOfLines={1}>
            {data.label}
          </Text>
        </HStack>
        
        {data.type && (
          <Badge size="xs" colorScheme={data.typeColor || 'gray'}>
            {data.type}
          </Badge>
        )}
        
        {data.tools && data.tools.length > 0 && (
          <HStack spacing={1}>
            <Icon as={FiTool} boxSize={3} />
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              {data.tools.length} tools
            </Text>
          </HStack>
        )}
        
        {data.capabilities && (
          <Text fontSize="xs" color={useSemanticToken('text.secondary')} noOfLines={1}>
            {Array.isArray(data.capabilities) 
              ? data.capabilities.length 
              : typeof data.capabilities === 'object' 
                ? Object.keys(data.capabilities).length 
                : 0} capabilities
          </Text>
        )}
      </VStack>
    </Box>
  );
};

const nodeTypes = {
  agentNode: AgentNode,
};

export const AgentGraphVisualization: React.FC<AgentGraphVisualizationProps> = ({
  selectedAgent,
  events,
}) => {
  const minimapBg = '#f8f9fa';
  
  // Generate nodes and edges from agent data and events
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!selectedAgent) {
      return { nodes: [], edges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Main agent node
    nodes.push({
      id: selectedAgent.id,
      type: 'agentNode',
      position: { x: 250, y: 50 },
      data: {
        label: selectedAgent.name,
        type: selectedAgent.type,
        typeColor: 'blue',
        icon: FiCpu,
        color: 'blue.500',
        capabilities: selectedAgent.capabilities,
        isActive: true,
      },
    });

    // Extract unique agents from events (agent interactions)
    const interactedAgents = new Map<string, { name: string; count: number }>();
    
    events.forEach((event) => {
      if (event.function_name && event.function_name !== selectedAgent.name) {
        const existing = interactedAgents.get(event.function_name) || { name: event.function_name, count: 0 };
        interactedAgents.set(event.function_name, { ...existing, count: existing.count + 1 });
      }
    });

    // Add interaction nodes in a circle around main agent
    const radius = 200;
    const angleStep = (2 * Math.PI) / Math.max(interactedAgents.size, 1);
    
    Array.from(interactedAgents.entries()).forEach(([id, data], index) => {
      const angle = index * angleStep;
      const x = 250 + radius * Math.cos(angle);
      const y = 200 + radius * Math.sin(angle);
      
      nodes.push({
        id: `interaction-${id}`,
        type: 'agentNode',
        position: { x, y },
        data: {
          label: data.name,
          type: 'interaction',
          typeColor: 'green',
          icon: FiZap,
          color: 'green.500',
          tools: [`${data.count} calls`],
        },
      });

      // Add edge from main agent to interaction
      edges.push({
        id: `edge-${selectedAgent.id}-${id}`,
        source: selectedAgent.id,
        target: `interaction-${id}`,
        animated: true,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#805AD5',
        },
        style: { stroke: '#805AD5' },
        label: `${data.count}×`,
      });
    });

    // Add tool/capability nodes if agent has them
    const caps = Array.isArray(selectedAgent.capabilities) 
      ? selectedAgent.capabilities 
      : (selectedAgent.capabilities && typeof selectedAgent.capabilities === 'object' 
          ? Object.keys(selectedAgent.capabilities) 
          : []);
    
    if (caps.length > 0) {
      const toolNodeY = 350;
      const capabilitySpacing = 150;
      const startX = 250 - (Math.min(caps.length, 4) * capabilitySpacing) / 2;

      caps.slice(0, 4).forEach((capability, index) => {
        const nodeId = `capability-${index}`;
        nodes.push({
          id: nodeId,
          type: 'agentNode',
          position: { x: startX + index * capabilitySpacing, y: toolNodeY },
          data: {
            label: String(capability).replace(/_/g, ' '),
            type: 'capability',
            typeColor: 'purple',
            icon: FiLayers,
            color: 'purple.500',
          },
        });

        edges.push({
          id: `edge-${selectedAgent.id}-${nodeId}`,
          source: selectedAgent.id,
          target: nodeId,
          type: 'smoothstep',
          style: { stroke: '#9F7AEA', strokeDasharray: '5,5' },
        });
      });

      if (caps.length > 4) {
        nodes.push({
          id: 'more-capabilities',
          type: 'agentNode',
          position: { x: startX + 4 * capabilitySpacing, y: toolNodeY },
          data: {
            label: `+${caps.length - 4} more`,
            type: 'capabilities',
            typeColor: 'gray',
            icon: FiRepeat,
            color: 'gray.500',
          },
        });
      }
    }

    return { nodes, edges };
  }, [selectedAgent, events]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  if (!selectedAgent) {
    return (
      <Box h="full" display="flex" alignItems="center" justifyContent="center" p={8}>
        <VStack spacing={2}>
          <Icon as={FiLayers} boxSize={12} color={useSemanticToken('text.tertiary')} />
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            Select an agent to view interaction graph
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box h="full" w="full" position="relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            if (node.data.isActive) return '#3182ce';
            if (node.data.color === 'green.500') return '#38a169';
            if (node.data.color === 'purple.500') return '#805ad5';
            return '#718096';
          }}
          style={{ backgroundColor: minimapBg }}
        />
      </ReactFlow>
    </Box>
  );
};

export default AgentGraphVisualization;
