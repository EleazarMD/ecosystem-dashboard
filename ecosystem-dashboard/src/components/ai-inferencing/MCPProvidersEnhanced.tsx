/**
 * MCP Providers - Enhanced with tool usage analytics
 * Monitor MCP server health, tool usage, and performance
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Progress,
  
  Button,
  ButtonGroup,
  Icon,
  SimpleGrid,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  FiServer,
  FiTool,
  FiActivity,
  FiCheckCircle,
  FiXCircle,
  FiChevronDown,
  FiChevronRight,
  FiPlus,
} from 'react-icons/fi';
import { AddMCPServerModal } from './AddMCPServerModal';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface MCPServer {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  toolCount: number;
  callsToday: number;
  avgLatency: number;
  errorRate: number;
  tools: Array<{
    name: string;
    calls: number;
    avgLatency: number;
    successRate: number;
  }>;
}

interface Props {
  servers: MCPServer[];
  onRefresh?: () => void;
}

export function MCPProvidersEnhanced({ servers, onRefresh }: Props) {
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const { isOpen: isAddModalOpen, onOpen: onAddModalOpen, onClose: onAddModalClose } = useDisclosure();

  const handleServerAdded = () => {
    onAddModalClose();
    // Trigger refresh if callback provided
    if (onRefresh) {
      onRefresh();
    }
  };

  // Colors
  const borderColor = useSemanticToken('border.default');
  const mutedText = useSemanticToken('text.secondary');
  const bgHover = useSemanticToken('surface.hover');

  // Calculate totals
  const totalServers = servers.length;
  const connectedServers = servers.filter(s => s.status === 'connected').length;
  const totalTools = servers.reduce((sum, s) => sum + s.toolCount, 0);
  const totalCalls = servers.reduce((sum, s) => sum + s.callsToday, 0);

  // Prepare chart data
  const serverUsageData = servers
    .map(s => ({
      name: s.name,
      calls: s.callsToday,
    }))
    .sort((a, b) => b.calls - a.calls);

  // Most used tools across all servers
  const allTools = servers.flatMap(s =>
    s.tools.map(t => ({
      server: s.name,
      ...t,
    }))
  );
  const topTools = allTools
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 10);

  // Tool distribution pie chart
  const toolDistribution = servers.map(s => ({
    name: s.name,
    value: s.callsToday,
  }));

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a78bfa'];

  const toggleServer = (serverName: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverName)) {
      newExpanded.delete(serverName);
    } else {
      newExpanded.add(serverName);
    }
    setExpandedServers(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return FiCheckCircle;
      case 'disconnected':
      case 'error':
        return FiXCircle;
      default:
        return FiServer;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'green';
      case 'disconnected':
        return 'gray';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <VStack spacing={6} align="stretch" width="full">
      {/* Compact Header */}
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={1}>
          <HStack spacing={3} color={mutedText} fontSize="sm">
            <Text fontWeight="500">{totalServers} servers</Text>
            <Text>·</Text>
            <Text>{totalTools} tools</Text>
            <Text>·</Text>
            <Text fontWeight="600">{totalCalls.toLocaleString()} calls today</Text>
          </HStack>
          <HStack spacing={2} fontSize="xs">
            <Badge colorScheme="green">{connectedServers} connected</Badge>
            {totalServers - connectedServers > 0 && (
              <Badge colorScheme="red">{totalServers - connectedServers} disconnected</Badge>
            )}
          </HStack>
        </VStack>

        <Button 
          leftIcon={<FiPlus />} 
          colorScheme="blue" 
          size="sm"
          onClick={onAddModalOpen}
        >
          Add Server
        </Button>
      </HStack>

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FiServer} color="blue.500" />
                <Text fontSize="xs" color={mutedText} textTransform="uppercase">
                  Connected Servers
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="700">
                {connectedServers} / {totalServers}
              </Text>
              <Progress
                value={(connectedServers / totalServers) * 100}
                colorScheme="green"
                size="xs"
                width="full"
                borderRadius="full"
              />
            </VStack>
          </CardBody>
        </Card>

        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FiTool} color="purple.500" />
                <Text fontSize="xs" color={mutedText} textTransform="uppercase">
                  Available Tools
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="700">
                {totalTools}
              </Text>
              <Text fontSize="xs" color={mutedText}>
                Across {totalServers} servers
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FiActivity} color="green.500" />
                <Text fontSize="xs" color={mutedText} textTransform="uppercase">
                  Total Calls Today
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="700">
                {totalCalls.toLocaleString()}
              </Text>
              <Text fontSize="xs" color="green.500">
                ↑ +15% vs yesterday
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Two Charts Side-by-Side */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {/* Server Usage Bar Chart */}
        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Text fontSize="md" fontWeight="600" mb={4}>
              Server Usage (Today)
            </Text>
            <Box height="200px">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serverUsageData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={150} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: useSemanticToken('surface.elevated'),
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="calls" fill="#8884d8">
                    {serverUsageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>

        {/* Call Distribution Pie Chart */}
        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Text fontSize="md" fontWeight="600" mb={4}>
              Call Distribution
            </Text>
            <Box height="200px">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={toolDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    labelLine={false}
                  >
                    {toolDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Top Tools */}
      <Card borderWidth="1px" borderColor={borderColor}>
        <CardBody>
          <Text fontSize="md" fontWeight="600" mb={3}>
            Most Used Tools
          </Text>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>TOOL</Th>
                <Th>SERVER</Th>
                <Th isNumeric>CALLS</Th>
                <Th isNumeric>AVG LATENCY</Th>
                <Th isNumeric>SUCCESS RATE</Th>
              </Tr>
            </Thead>
            <Tbody>
              {topTools.map((tool, i) => (
                <Tr key={`${tool.server}-${tool.name}`}>
                  <Td>
                    <HStack>
                      <Text fontSize="xs" color={mutedText}>
                        #{i + 1}
                      </Text>
                      <Text fontSize="sm" fontWeight="500">
                        {tool.name}
                      </Text>
                    </HStack>
                  </Td>
                  <Td>
                    <Badge size="sm" variant="subtle">
                      {tool.server}
                    </Badge>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="sm">{tool.calls}</Text>
                  </Td>
                  <Td isNumeric>
                    <Badge
                      size="sm"
                      colorScheme={tool.avgLatency < 100 ? 'green' : tool.avgLatency < 500 ? 'yellow' : 'red'}
                    >
                      {tool.avgLatency}ms
                    </Badge>
                  </Td>
                  <Td isNumeric>
                    <HStack justify="flex-end">
                      <Progress
                        value={tool.successRate}
                        width="50px"
                        size="xs"
                        colorScheme={tool.successRate >= 95 ? 'green' : 'yellow'}
                        borderRadius="full"
                      />
                      <Text fontSize="sm" minW="40px">
                        {tool.successRate.toFixed(0)}%
                      </Text>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      {/* Server List with Expandable Tools */}
      <VStack spacing={3} align="stretch">
        <Text fontSize="md" fontWeight="600">
          Server Details
        </Text>
        {servers.map((server) => {
          const isExpanded = expandedServers.has(server.name);

          return (
            <Card key={server.name} borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  {/* Server Header */}
                  <HStack
                    justify="space-between"
                    cursor="pointer"
                    onClick={() => toggleServer(server.name)}
                    _hover={{ opacity: 0.8 }}
                  >
                    <HStack spacing={3}>
                      <Icon
                        as={getStatusIcon(server.status)}
                        color={getStatusColor(server.status) + '.500'}
                        boxSize={5}
                      />
                      <VStack align="start" spacing={0}>
                        <Text fontSize="md" fontWeight="600">
                          {server.name}
                        </Text>
                        <HStack spacing={2} fontSize="xs" color={mutedText}>
                          <Text>{server.toolCount} tools</Text>
                          <Text>·</Text>
                          <Text>{server.callsToday} calls</Text>
                          <Text>·</Text>
                          <Text>{server.avgLatency}ms avg</Text>
                        </HStack>
                      </VStack>
                    </HStack>

                    <HStack spacing={3}>
                      <Badge colorScheme={getStatusColor(server.status)}>
                        {server.status}
                      </Badge>
                      <Icon as={isExpanded ? FiChevronDown : FiChevronRight} />
                    </HStack>
                  </HStack>

                  {/* Expandable Tools List */}
                  <Collapse in={isExpanded} animateOpacity>
                    <Box
                      p={3}
                      bg={useSemanticToken('surface.elevated')}
                      borderRadius="md"
                    >
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th fontSize="xs">TOOL NAME</Th>
                            <Th fontSize="xs" isNumeric>CALLS</Th>
                            <Th fontSize="xs" isNumeric>LATENCY</Th>
                            <Th fontSize="xs" isNumeric>SUCCESS</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {server.tools.map((tool) => (
                            <Tr key={tool.name}>
                              <Td fontSize="xs">{tool.name}</Td>
                              <Td fontSize="xs" isNumeric>{tool.calls}</Td>
                              <Td fontSize="xs" isNumeric>
                                <Badge size="xs" colorScheme={tool.avgLatency < 100 ? 'green' : 'yellow'}>
                                  {tool.avgLatency}ms
                                </Badge>
                              </Td>
                              <Td fontSize="xs" isNumeric>{tool.successRate.toFixed(0)}%</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </Collapse>
                </VStack>
              </CardBody>
            </Card>
          );
        })}
      </VStack>

      {/* Add MCP Server Modal */}
      <AddMCPServerModal
        isOpen={isAddModalOpen}
        onClose={onAddModalClose}
        onSuccess={handleServerAdded}
      />
    </VStack>
  );
}
