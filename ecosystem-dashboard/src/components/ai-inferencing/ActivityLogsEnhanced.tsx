/**
 * Activity Logs - Enhanced with better filtering and search
 * Real-time request monitoring with drill-down capabilities
 */

import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
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
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Button,
  ButtonGroup,
  Icon,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Code,
  Divider,
} from '@chakra-ui/react';
import {
  FiSearch,
  FiFilter,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiZap,
  FiDollarSign,
} from 'react-icons/fi';

interface ActivityLog {
  id: string;
  timestamp: string;
  model: string;
  provider: string;
  service: string;
  status: 'success' | 'error' | 'pending';
  inputTokens: number;
  outputTokens: number;
  latency: number;
  cost: number;
  requestDetails?: {
    prompt: string;
    response: string;
    error?: string;
  };
}

interface Props {
  logs: ActivityLog[];
}

export function ActivityLogsEnhanced({ logs }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Colors
  const borderColor = useSemanticToken('border.default');
  const mutedText = useSemanticToken('text.secondary');
  const bgHover = useSemanticToken('surface.hover');

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    // Search filter
    if (searchQuery && !log.model.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !log.service.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all' && log.status !== statusFilter) {
      return false;
    }

    // Model filter
    if (modelFilter !== 'all' && log.model !== modelFilter) {
      return false;
    }

    // Service filter
    if (serviceFilter !== 'all' && log.service !== serviceFilter) {
      return false;
    }

    return true;
  });

  // Get unique values for filters
  const uniqueModels = Array.from(new Set(logs.map(l => l.model)));
  const uniqueServices = Array.from(new Set(logs.map(l => l.service)));

  // Calculate metrics
  const totalCost = filteredLogs.reduce((sum, l) => sum + l.cost, 0);
  const avgLatency = filteredLogs.length > 0
    ? filteredLogs.reduce((sum, l) => sum + l.latency, 0) / filteredLogs.length
    : 0;
  const successRate = filteredLogs.length > 0
    ? (filteredLogs.filter(l => l.status === 'success').length / filteredLogs.length) * 100
    : 0;

  const handleRowClick = (log: ActivityLog) => {
    setSelectedLog(log);
    setIsDrawerOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return FiCheckCircle;
      case 'error':
        return FiXCircle;
      case 'pending':
        return FiClock;
      default:
        return FiClock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'green';
      case 'error':
        return 'red';
      case 'pending':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleString();
  };

  return (
    <VStack spacing={4} align="stretch" width="full">
      {/* Filters Bar */}
      <HStack spacing={3} wrap="wrap">
        {/* Search */}
        <InputGroup maxW="300px">
          <InputLeftElement>
            <Icon as={FiSearch} color={mutedText} />
          </InputLeftElement>
          <Input
            placeholder="Search model or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
          />
        </InputGroup>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          size="sm"
          maxW="150px"
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
          <option value="pending">Pending</option>
        </Select>

        {/* Model Filter */}
        <Select
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          size="sm"
          maxW="200px"
        >
          <option value="all">All Models</option>
          {uniqueModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </Select>

        {/* Service Filter */}
        <Select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          size="sm"
          maxW="150px"
        >
          <option value="all">All Services</option>
          {uniqueServices.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </Select>

        <Box flex={1} />

        {/* Export Button */}
        <Button
          leftIcon={<FiDownload />}
          size="sm"
          variant="outline"
        >
          Export CSV
        </Button>
      </HStack>

      {/* Quick Stats */}
      <HStack spacing={4} fontSize="sm" color={mutedText}>
        <HStack>
          <Icon as={FiFilter} />
          <Text fontWeight="500">{filteredLogs.length} logs</Text>
        </HStack>
        <Text>·</Text>
        <HStack>
          <Icon as={FiCheckCircle} color="green.500" />
          <Text fontWeight="500">{successRate.toFixed(1)}% success</Text>
        </HStack>
        <Text>·</Text>
        <HStack>
          <Icon as={FiZap} />
          <Text fontWeight="500">{avgLatency.toFixed(0)}ms avg</Text>
        </HStack>
        <Text>·</Text>
        <HStack>
          <Icon as={FiDollarSign} />
          <Text fontWeight="500">${totalCost.toFixed(4)} total</Text>
        </HStack>
      </HStack>

      {/* Activity Table */}
      <Card borderWidth="1px" borderColor={borderColor}>
        <CardBody p={0}>
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>TIME</Th>
                  <Th>MODEL</Th>
                  <Th>SERVICE</Th>
                  <Th>STATUS</Th>
                  <Th isNumeric>TOKENS</Th>
                  <Th isNumeric>LATENCY</Th>
                  <Th isNumeric>COST</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredLogs.map((log) => (
                  <Tr
                    key={log.id}
                    _hover={{ bg: bgHover, cursor: 'pointer' }}
                    onClick={() => handleRowClick(log)}
                  >
                    <Td>
                      <Text fontSize="xs" color={mutedText}>
                        {formatTimestamp(log.timestamp)}
                      </Text>
                    </Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="xs" fontWeight="500">
                          {log.model}
                        </Text>
                        <Text fontSize="xs" color={mutedText}>
                          {log.provider}
                        </Text>
                      </VStack>
                    </Td>
                    <Td>
                      <Badge size="sm" variant="subtle">
                        {log.service}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={getStatusColor(log.status)}
                        size="sm"
                      >
                        <HStack spacing={1}>
                          <Icon as={getStatusIcon(log.status)} boxSize={3} />
                          <Text>{log.status}</Text>
                        </HStack>
                      </Badge>
                    </Td>
                    <Td isNumeric>
                      <Text fontSize="xs">
                        {log.inputTokens + log.outputTokens}
                      </Text>
                      <Text fontSize="xs" color={mutedText}>
                        {log.inputTokens}→{log.outputTokens}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Badge
                        colorScheme={
                          log.latency < 1000
                            ? 'green'
                            : log.latency < 5000
                            ? 'yellow'
                            : 'red'
                        }
                        size="sm"
                      >
                        {log.latency < 1000
                          ? `${log.latency}ms`
                          : `${(log.latency / 1000).toFixed(1)}s`}
                      </Badge>
                    </Td>
                    <Td isNumeric>
                      <Text fontSize="xs" fontWeight="500">
                        ${log.cost.toFixed(4)}
                      </Text>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>

      {/* Details Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        size="lg"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Request Details</DrawerHeader>

          <DrawerBody>
            {selectedLog && (
              <VStack align="stretch" spacing={4}>
                {/* Metadata */}
                <Card borderWidth="1px" borderColor={borderColor}>
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between">
                        <Text fontSize="sm" fontWeight="600">Model</Text>
                        <Text fontSize="sm">{selectedLog.model}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="sm" fontWeight="600">Provider</Text>
                        <Text fontSize="sm">{selectedLog.provider}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="sm" fontWeight="600">Service</Text>
                        <Badge>{selectedLog.service}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="sm" fontWeight="600">Status</Text>
                        <Badge colorScheme={getStatusColor(selectedLog.status)}>
                          {selectedLog.status}
                        </Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="sm" fontWeight="600">Timestamp</Text>
                        <Text fontSize="sm">{selectedLog.timestamp}</Text>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Performance */}
                <Card borderWidth="1px" borderColor={borderColor}>
                  <CardBody>
                    <Text fontSize="sm" fontWeight="600" mb={3}>
                      Performance
                    </Text>
                    <VStack align="stretch" spacing={2}>
                      <HStack justify="space-between">
                        <Text fontSize="sm">Latency</Text>
                        <Text fontSize="sm" fontWeight="500">
                          {selectedLog.latency < 1000
                            ? `${selectedLog.latency}ms`
                            : `${(selectedLog.latency / 1000).toFixed(2)}s`}
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="sm">Input Tokens</Text>
                        <Text fontSize="sm" fontWeight="500">
                          {selectedLog.inputTokens}
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="sm">Output Tokens</Text>
                        <Text fontSize="sm" fontWeight="500">
                          {selectedLog.outputTokens}
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="sm">Cost</Text>
                        <Text fontSize="sm" fontWeight="500">
                          ${selectedLog.cost.toFixed(6)}
                        </Text>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Request/Response */}
                {selectedLog.requestDetails && (
                  <>
                    <Box>
                      <Text fontSize="sm" fontWeight="600" mb={2}>
                        Prompt
                      </Text>
                      <Code
                        p={3}
                        borderRadius="md"
                        fontSize="xs"
                        width="full"
                        display="block"
                        whiteSpace="pre-wrap"
                      >
                        {selectedLog.requestDetails.prompt}
                      </Code>
                    </Box>

                    {selectedLog.status === 'success' && selectedLog.requestDetails.response && (
                      <Box>
                        <Text fontSize="sm" fontWeight="600" mb={2}>
                          Response
                        </Text>
                        <Code
                          p={3}
                          borderRadius="md"
                          fontSize="xs"
                          width="full"
                          display="block"
                          whiteSpace="pre-wrap"
                        >
                          {selectedLog.requestDetails.response}
                        </Code>
                      </Box>
                    )}

                    {selectedLog.status === 'error' && selectedLog.requestDetails.error && (
                      <Box>
                        <Text fontSize="sm" fontWeight="600" mb={2} color="red.500">
                          Error
                        </Text>
                        <Code
                          p={3}
                          borderRadius="md"
                          fontSize="xs"
                          width="full"
                          display="block"
                          whiteSpace="pre-wrap"
                          colorScheme="red"
                        >
                          {selectedLog.requestDetails.error}
                        </Code>
                      </Box>
                    )}
                  </>
                )}
              </VStack>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </VStack>
  );
}
