import React, { useEffect, useRef, useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Heading,
  HStack,
  Select,
  Badge,
  Text,
} from '@chakra-ui/react';

interface Agent {
  id: string;
  name: string;
  port: number;
  status: 'healthy' | 'degraded' | 'offline';
  connections: string[];
}

export default function A2ANetworkGraph() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [layoutType, setLayoutType] = useState<'force' | 'hierarchical' | 'circular'>('force');
  const [agents, setAgents] = useState<Agent[]>([]);
  const bg = useSemanticToken('surface.base');

  useEffect(() => {
    // Fetch agents from API
    fetch('/api/agentic-control/agents')
      .then(res => res.json())
      .then(data => {
        setAgents(data.agents || []);
      })
      .catch(console.error);
  }, []);

  // Simple network visualization using DOM elements
  const renderNetwork = () => {
    const statusColor = (status: string) => {
      switch (status) {
        case 'healthy': return 'green';
        case 'degraded': return 'yellow';
        case 'offline': return 'red';
        default: return 'gray';
      }
    };

    return (
      <Box position="relative" h="100%" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center" gap={8}>
        {agents.map((agent, idx) => (
          <Box
            key={agent.id}
            position="relative"
            textAlign="center"
            p={4}
            bg={useSemanticToken('surface.elevated')}
            borderRadius="lg"
            border="2px solid"
            borderColor={statusColor(agent.status)}
            shadow="md"
            _hover={{ shadow: 'lg', transform: 'scale(1.05)' }}
            transition="all 0.2s"
          >
            <Badge colorScheme={statusColor(agent.status)} mb={2}>
              {agent.status.toUpperCase()}
            </Badge>
            <Text fontWeight="bold" fontSize="sm">{agent.name}</Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>:{agent.port}</Text>
            <Text fontSize="xs" mt={1}>
              {(agent as any).capabilities?.length || 0} capabilities
            </Text>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box h="100%">
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Agent Network Topology</Heading>
        <HStack>
          <Select
            size="sm"
            value={layoutType}
            onChange={(e) => setLayoutType(e.target.value as any)}
            w="150px"
          >
            <option value="force">Force Layout</option>
            <option value="hierarchical">Hierarchical</option>
            <option value="circular">Circular</option>
          </Select>
          <Badge colorScheme="purple">
            {agents.length} Agents
          </Badge>
        </HStack>
      </HStack>

      <Box
        ref={canvasRef}
        h="calc(100% - 60px)"
        bg={bg}
        borderRadius="md"
        overflow="auto"
        position="relative"
      >
        {renderNetwork()}
      </Box>
    </Box>
  );
}
