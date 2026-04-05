/**
 * Agent Registry Metrics Dashboard
 * 
 * Real-time metrics and monitoring dashboard for the Agent Registry Hub
 * Shows model usage, costs, performance, and ecosystem health
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Grid,
  GridItem,
  Card,
  CardHeader,
  CardBody,
  Heading
} from '@chakra-ui/react';
import { useAgentRegistryMetrics } from '../../hooks/useAgentRegistryMetrics';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export const AgentMetricsDashboard: React.FC = () => {
  const { metrics, modelStats, agents, isLoading, error, connectionStatus, refreshMetrics } = useAgentRegistryMetrics();
  
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const statBg = useSemanticToken('surface.base');

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading agent registry metrics...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <Box>
          <AlertTitle>Failed to load metrics!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Box>
        <Button ml={4} size="sm" onClick={refreshMetrics}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header with Connection Status */}
      <HStack justify="space-between">
        <VStack align="start" spacing={1}>
          <Heading size="lg">Agent Registry Metrics</Heading>
          <HStack spacing={2}>
            <Badge 
              colorScheme={connectionStatus.registry ? 'green' : 'red'}
              variant="solid"
            >
              Registry: {connectionStatus.registry ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge 
              colorScheme={connectionStatus.websocket ? 'blue' : 'gray'}
              variant={connectionStatus.websocket ? 'solid' : 'outline'}
            >
              Real-time: {connectionStatus.websocket ? 'Live' : 'Polling'}
            </Badge>
          </HStack>
        </VStack>
        
        <VStack align="end" spacing={1}>
          <Button size="sm" onClick={refreshMetrics}>
            Refresh
          </Button>
          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
            Last update: {new Date(connectionStatus.lastUpdate).toLocaleTimeString()}
          </Text>
        </VStack>
      </HStack>

      {/* Overview Stats */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
        <GridItem>
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Total Agents</StatLabel>
                <StatNumber>{metrics.totalAgents}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  {metrics.activeAgents} active
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Daily Cost Estimate</StatLabel>
                <StatNumber>${metrics.costEstimate.toFixed(2)}</StatNumber>
                <StatHelpText>
                  Based on current usage
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Avg Response Time</StatLabel>
                <StatNumber>{Math.round(metrics.avgResponseTime)}ms</StatNumber>
                <StatHelpText>
                  <StatArrow type={metrics.avgResponseTime < 2000 ? "decrease" : "increase"} />
                  Cross-model average
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Error Rate</StatLabel>
                <StatNumber>{(metrics.errorRate * 100).toFixed(2)}%</StatNumber>
                <StatHelpText>
                  <StatArrow type={metrics.errorRate < 0.02 ? "decrease" : "increase"} />
                  Last 24 hours
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Model Distribution */}
      <Card bg={cardBg} borderColor={borderColor}>
        <CardHeader>
          <Heading size="md">Model Distribution</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={3} align="stretch">
            {Object.entries(metrics.modelDistribution)
              .sort(([,a], [,b]) => b - a)
              .map(([model, count]) => {
                const percentage = (count / metrics.totalAgents) * 100;
                return (
                  <HStack key={model} spacing={4}>
                    <Text minW="200px" fontSize="sm" fontFamily="mono">
                      {model}
                    </Text>
                    <Box flex={1}>
                      <Progress
                        value={percentage}
                        colorScheme={getModelColorScheme(model)}
                        size="md"
                        borderRadius="md"
                      />
                    </Box>
                    <Badge colorScheme={getModelColorScheme(model)}>
                      {count} ({percentage.toFixed(1)}%)
                    </Badge>
                  </HStack>
                );
              })}
          </VStack>
        </CardBody>
      </Card>

      {/* Model Performance Table */}
      <Card bg={cardBg} borderColor={borderColor}>
        <CardHeader>
          <Heading size="md">Model Performance & Cost Analysis</Heading>
        </CardHeader>
        <CardBody>
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Model</Th>
                  <Th isNumeric>Agents</Th>
                  <Th isNumeric>Est. Daily Requests</Th>
                  <Th isNumeric>Avg Response Time</Th>
                  <Th isNumeric>Error Rate</Th>
                  <Th isNumeric>Cost/Request</Th>
                  <Th isNumeric>Daily Cost</Th>
                </Tr>
              </Thead>
              <Tbody>
                {modelStats.map((stat) => (
                  <Tr key={stat.model}>
                    <Td>
                      <Text fontSize="sm" fontFamily="mono">
                        {stat.model}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Badge colorScheme={getModelColorScheme(stat.model)}>
                        {stat.agentCount}
                      </Badge>
                    </Td>
                    <Td isNumeric>{stat.requestCount.toLocaleString()}</Td>
                    <Td isNumeric>
                      <Text color={stat.avgResponseTime > 3000 ? 'red.500' : stat.avgResponseTime > 1500 ? 'yellow.500' : 'green.500'}>
                        {Math.round(stat.avgResponseTime)}ms
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Text color={stat.errorRate > 0.02 ? 'red.500' : stat.errorRate > 0.01 ? 'yellow.500' : 'green.500'}>
                        {(stat.errorRate * 100).toFixed(2)}%
                      </Text>
                    </Td>
                    <Td isNumeric>${stat.costPerRequest.toFixed(3)}</Td>
                    <Td isNumeric>
                      <Text fontWeight="bold" color={stat.totalCost > 5 ? 'red.500' : stat.totalCost > 2 ? 'yellow.500' : 'green.500'}>
                        ${stat.totalCost.toFixed(2)}
                      </Text>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>

      {/* Active Agents List */}
      <Card bg={cardBg} borderColor={borderColor}>
        <CardHeader>
          <Heading size="md">Active Agents ({Object.values(agents).filter(a => a.isActive !== false).length})</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={3} align="stretch">
            {Object.values(agents)
              .filter(agent => agent.isActive !== false)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((agent) => (
                <HStack key={agent.agentId} spacing={4} p={3} bg={statBg} borderRadius="md">
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontWeight="bold">{agent.name}</Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      {agent.agentId}
                    </Text>
                  </VStack>
                  
                  <Badge colorScheme={getModelColorScheme(agent.model)}>
                    {agent.model}
                  </Badge>
                  
                  <Badge colorScheme={agent.agentClass === 'LlmAgent' ? 'blue' : agent.agentClass === 'WorkflowAgent' ? 'purple' : 'orange'}>
                    {agent.agentClass}
                  </Badge>
                  
                  <VStack spacing={0} align="end">
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      v{agent.version || 1}
                    </Text>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      {new Date(agent.lastUpdated).toLocaleTimeString()}
                    </Text>
                  </VStack>
                </HStack>
              ))}
          </VStack>
        </CardBody>
      </Card>

      {/* Metadata */}
      <Box>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
          Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
        </Text>
      </Box>
    </VStack>
  );
};

function getModelColorScheme(model: string): string {
  const colorMap: Record<string, string> = {
    'gemini-2.0-flash-thinking-exp': 'purple',
    'gemini-2.0-flash-exp': 'blue',
    'gemini-1.5-pro': 'green',
    'gemini-1.5-flash': 'teal',
    'mistral:latest': 'orange',
    'llama3.2:3b': 'red',
    'llama3.2-vision:11b': 'pink',
    'gemma3:4b': 'cyan'
  };
  return colorMap[model] || 'gray';
}
