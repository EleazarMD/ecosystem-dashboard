import React from 'react';
import {
  Box,
  Card,
  Heading,
  Text,
  Badge,
  Button,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Tooltip,
  IconButton,
  HStack,
  Flex,
  Select,
} from '@chakra-ui/react';
import { FiEye, FiFilter, FiCheckCircle, FiAlertCircle, FiActivity } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Trace {
  traceId: string;
  spanId: string;
  timestamp: string;
  duration: number;
  status: 'completed' | 'error' | 'in_progress';
  statusCode: number;
  request: {
    method: string;
    model: string;
    provider: string;
    stream: boolean;
  };
  client: {
    id: string;
    ip: string;
  };
  routing: {
    strategy: string;
    selectedProvider: string;
    retries: number;
  };
  response?: {
    model: string;
    provider: string;
    content: string;
  };
  error?: {
    message: string;
    code: string;
  };
  metrics: {
    tokenCount: {
      prompt: number;
      completion: number;
      total: number;
    };
    latency: {
      routing: number;
      provider: number;
      total: number;
    };
    cost: {
      total: number;
    };
  };
}

interface TraceListPanelProps {
  traces: Trace[];
  filterStatus: string;
  filterProvider: string;
  filterModel: string;
  onFilterStatusChange: (value: string) => void;
  onFilterProviderChange: (value: string) => void;
  onFilterModelChange: (value: string) => void;
  onApplyFilters: () => void;
  onTraceClick: (trace: Trace) => void;
}

export const TraceListPanel: React.FC<TraceListPanelProps> = ({
  traces,
  filterStatus,
  filterProvider,
  filterModel,
  onFilterStatusChange,
  onFilterProviderChange,
  onFilterModelChange,
  onApplyFilters,
  onTraceClick,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'error': return 'red';
      case 'in_progress': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <FiCheckCircle />;
      case 'error': return <FiAlertCircle />;
      case 'in_progress': return <FiActivity />;
      default: return <FiCheckCircle />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md" display="flex" alignItems="center" gap={2}>
          <Box as={FiEye} /> Request Traces
        </Heading>
        <HStack spacing={2}>
          <Select
            size="sm"
            value={filterStatus}
            onChange={(e) => onFilterStatusChange(e.target.value)}
            placeholder="All Status"
            width="150px"
          >
            <option value="completed">Completed</option>
            <option value="error">Error</option>
            <option value="in_progress">In Progress</option>
          </Select>
          <Select
            size="sm"
            value={filterProvider}
            onChange={(e) => onFilterProviderChange(e.target.value)}
            placeholder="All Providers"
            width="150px"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
            <option value="openai-oss">Ollama</option>
          </Select>
          <Button size="sm" leftIcon={<FiFilter />} onClick={onApplyFilters}>
            Apply
          </Button>
        </HStack>
      </Flex>
      
      <Card>
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Timestamp</Th>
                <Th>Trace ID</Th>
                <Th>Status</Th>
                <Th>Model</Th>
                <Th>Provider</Th>
                <Th isNumeric>Duration</Th>
                <Th isNumeric>Tokens</Th>
                <Th isNumeric>Cost</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {traces.map((trace) => (
                <Tr key={trace.traceId} _hover={{ bg: 'gray.50' }}>
                  <Td>
                    <Text fontSize="xs" fontFamily="mono">
                      {new Date(trace.timestamp).toLocaleTimeString()}
                    </Text>
                  </Td>
                  <Td>
                    <Tooltip label={trace.traceId}>
                      <Text fontSize="xs" fontFamily="mono" isTruncated maxW="100px">
                        {trace.traceId.substring(0, 8)}...
                      </Text>
                    </Tooltip>
                  </Td>
                  <Td>
                    <HStack spacing={1}>
                      <Box boxSize={3}>
                        {getStatusIcon(trace.status)}
                      </Box>
                      <Badge colorScheme={getStatusColor(trace.status)} fontSize="xs">
                        {trace.status}
                      </Badge>
                    </HStack>
                  </Td>
                  <Td>
                    <Text fontSize="xs">{trace.request.model}</Text>
                  </Td>
                  <Td>
                    <Badge colorScheme="blue" fontSize="xs">
                      {trace.routing.selectedProvider}
                    </Badge>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="xs" color={trace.duration > 5000 ? 'red.500' : 'inherit'}>
                      {formatDuration(trace.duration)}
                    </Text>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="xs">{trace.metrics.tokenCount.total}</Text>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="xs">{formatCurrency(trace.metrics.cost.total)}</Text>
                  </Td>
                  <Td>
                    <IconButton
                      icon={<FiEye />}
                      aria-label="View details"
                      size="xs"
                      onClick={() => onTraceClick(trace)}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
        {traces.length === 0 && (
          <Flex h="200px" align="center" justify="center">
            <Text color={useSemanticToken('text.secondary')}>No traces found</Text>
          </Flex>
        )}
      </Card>
    </Box>
  );
};
