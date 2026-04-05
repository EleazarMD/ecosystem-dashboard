/**
 * AI Agents Widget
 * Shows status and activity of AI agents in the system
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Button,
  Progress,
  Spinner,
} from '@chakra-ui/react';
import {
  FiCpu,
  FiZap,
  FiActivity,
  FiCheckCircle,
  FiAlertCircle,
  FiExternalLink,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import NextLink from 'next/link';

interface AgentStatus {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'error';
  requestsToday: number;
  avgResponseTime: number;
  successRate: number;
}

export default function AIAgentsWidget() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const textSecondary = useSemanticToken('text.secondary');
  const bgSubtle = useSemanticToken('surface.subtle');

  useEffect(() => {
    fetchAgentStatus();
    const interval = setInterval(fetchAgentStatus, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const fetchAgentStatus = async () => {
    try {
      const res = await fetch('/api/admin/agents/status');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'idle': return 'gray';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return FiCheckCircle;
      case 'error': return FiAlertCircle;
      default: return FiActivity;
    }
  };

  if (loading) {
    return (
      <GlassPanel variant="light" p={6}>
        <VStack spacing={4}>
          <Spinner size="lg" />
          <Text color={textSecondary}>Loading agent status...</Text>
        </VStack>
      </GlassPanel>
    );
  }

  const totalRequests = agents.reduce((sum, agent) => sum + agent.requestsToday, 0);
  const activeAgents = agents.filter(a => a.status === 'active').length;

  return (
    <GlassPanel variant="light" p={6}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiCpu} boxSize={5} color="cyan.500" />
            <Text fontSize="lg" fontWeight="bold">AI Agents</Text>
          </HStack>
          <Badge colorScheme="cyan">
            {activeAgents}/{agents.length} active
          </Badge>
        </HStack>

        <HStack spacing={4} p={3} bg={bgSubtle} borderRadius="md">
          <VStack align="start" spacing={0} flex={1}>
            <Text fontSize="xs" color={textSecondary}>Total Requests Today</Text>
            <Text fontSize="2xl" fontWeight="bold">{totalRequests.toLocaleString()}</Text>
          </VStack>
          <Icon as={FiZap} boxSize={8} color="cyan.500" />
        </HStack>

        <VStack spacing={2} align="stretch" maxH="300px" overflowY="auto">
          {agents.map((agent) => (
            <Box
              key={agent.id}
              p={3}
              bg={bgSubtle}
              borderRadius="md"
              borderLeft="3px solid"
              borderLeftColor={`${getStatusColor(agent.status)}.500`}
            >
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between">
                  <HStack>
                    <Icon
                      as={getStatusIcon(agent.status)}
                      boxSize={4}
                      color={`${getStatusColor(agent.status)}.500`}
                    />
                    <Text fontSize="sm" fontWeight="medium">{agent.name}</Text>
                  </HStack>
                  <Badge colorScheme={getStatusColor(agent.status)} fontSize="xs">
                    {agent.status}
                  </Badge>
                </HStack>

                <HStack spacing={4} fontSize="xs" color={textSecondary}>
                  <Text>{agent.requestsToday} requests</Text>
                  <Text>{agent.avgResponseTime}ms avg</Text>
                </HStack>

                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" color={textSecondary}>Success Rate</Text>
                    <Text fontSize="xs" fontWeight="medium">{agent.successRate}%</Text>
                  </HStack>
                  <Progress
                    value={agent.successRate}
                    size="xs"
                    colorScheme={agent.successRate > 95 ? 'green' : agent.successRate > 80 ? 'yellow' : 'red'}
                    borderRadius="full"
                  />
                </Box>
              </VStack>
            </Box>
          ))}
        </VStack>

        <Button
          as={NextLink}
          href="/agentic-control"
          size="sm"
          variant="outline"
          colorScheme="cyan"
          rightIcon={<FiExternalLink />}
        >
          Manage Agents
        </Button>
      </VStack>
    </GlassPanel>
  );
}
