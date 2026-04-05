import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Badge,
  IconButton,
  Tooltip,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Code,
  Progress,
  Alert,
  AlertIcon,
  Collapse,
  useDisclosure,
  Button,
} from '@chakra-ui/react';
import {
  FiServer,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
  FiActivity,
  FiClock,
  FiTool,
  FiZap,
} from 'react-icons/fi';

interface MCPServer {
  name: string;
  type: 'stdio' | 'http';
  status?: 'active' | 'inactive' | 'error';  // Made optional to match MCPServerConfig
  command?: string;
  args?: string[];
  url?: string;
  enabled?: boolean;
  health?: {
    last_check: string;
    response_time_ms: number;
    uptime_seconds: number;
    error_count: number;
  };
  tools?: string[];
  statistics?: {
    total_calls: number;
    successful_calls: number;
    failed_calls: number;
    avg_duration_ms: number;
  };
}

interface MCPServerStatusProps {
  agentId?: string;
  servers?: MCPServer[];
}

export const MCPServerStatus: React.FC<MCPServerStatusProps> = ({
  agentId,
  servers: propServers
}) => {
  const [servers, setServers] = useState<MCPServer[]>(propServers || []);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Mock data for demonstration (replace with real API call)
  useEffect(() => {
    if (!propServers) {
      loadServerStatus();
    }
  }, [propServers]);

  const loadServerStatus = async () => {
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const mockServers: MCPServer[] = [
        {
          name: 'workspace',
          type: 'stdio',
          status: 'active',
          enabled: true,
          command: 'node',
          args: ['/path/to/workspace-mcp-server/dist/index.js'],
          health: {
            last_check: new Date().toISOString(),
            response_time_ms: 45,
            uptime_seconds: 3600,
            error_count: 0
          },
          tools: ['search_workspace', 'create_page', 'update_page', 'query_database'],
          statistics: {
            total_calls: 156,
            successful_calls: 152,
            failed_calls: 4,
            avg_duration_ms: 230
          }
        },
        {
          name: 'developer',
          type: 'stdio',
          status: 'active',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-developer'],
          health: {
            last_check: new Date().toISOString(),
            response_time_ms: 38,
            uptime_seconds: 7200,
            error_count: 1
          },
          tools: ['filesystem_search', 'read_file', 'write_file', 'git_diff'],
          statistics: {
            total_calls: 89,
            successful_calls: 88,
            failed_calls: 1,
            avg_duration_ms: 180
          }
        },
        {
          name: 'github',
          type: 'stdio',
          status: 'inactive',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          health: {
            last_check: new Date().toISOString(),
            response_time_ms: 0,
            uptime_seconds: 0,
            error_count: 0
          },
          tools: ['list_repos', 'create_pr', 'get_issues'],
          statistics: {
            total_calls: 0,
            successful_calls: 0,
            failed_calls: 0,
            avg_duration_ms: 0
          }
        },
        {
          name: 'filesystem',
          type: 'http',
          status: 'error',
          url: 'http://localhost:9002',
          health: {
            last_check: new Date().toISOString(),
            response_time_ms: 0,
            uptime_seconds: 0,
            error_count: 5
          },
          tools: ['list_directory', 'read_file', 'write_file'],
          statistics: {
            total_calls: 23,
            successful_calls: 18,
            failed_calls: 5,
            avg_duration_ms: 0
          }
        }
      ];

      setServers(mockServers);
      setLastUpdate(new Date());
      setLoading(false);
    }, 500);
  };

  const handleRefresh = () => {
    loadServerStatus();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'gray';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <FiCheckCircle />;
      case 'inactive': return <FiAlertTriangle />;
      case 'error': return <FiXCircle />;
      default: return <FiServer />;
    }
  };

  const activeServers = servers.filter(s => s.status === 'active').length;
  const totalCalls = servers.reduce((sum, s) => sum + (s.statistics?.total_calls || 0), 0);
  const avgResponseTime = servers
    .filter(s => s.health && s.health.response_time_ms > 0)
    .reduce((sum, s) => sum + (s.health?.response_time_ms || 0), 0) / Math.max(activeServers, 1);

  return (
    <VStack spacing={4} align="stretch" h="full" p={4}>
      {/* Header */}
      <HStack justify="space-between">
        <HStack spacing={2}>
          <FiServer />
          <Text fontSize="lg" fontWeight="bold">MCP Servers</Text>
          <Badge colorScheme="blue">{servers.length}</Badge>
        </HStack>

        <Tooltip label="Refresh status">
          <IconButton
            aria-label="Refresh"
            icon={<FiRefreshCw />}
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            isLoading={loading}
          />
        </Tooltip>
      </HStack>

      <Divider />

      {/* Summary Statistics */}
      <Card size="sm">
        <CardBody>
          <SimpleGrid columns={3} spacing={4}>
            <Stat size="sm">
              <StatLabel fontSize="xs">Active Servers</StatLabel>
              <StatNumber fontSize="xl" color={useSemanticToken('status.success')}>
                {activeServers} / {servers.length}
              </StatNumber>
              <StatHelpText fontSize="xs" mb={0}>operational</StatHelpText>
            </Stat>

            <Stat size="sm">
              <StatLabel fontSize="xs">Total Calls</StatLabel>
              <StatNumber fontSize="xl">{totalCalls}</StatNumber>
              <StatHelpText fontSize="xs" mb={0}>across all servers</StatHelpText>
            </Stat>

            <Stat size="sm">
              <StatLabel fontSize="xs">Avg Response</StatLabel>
              <StatNumber fontSize="xl">{avgResponseTime.toFixed(0)}ms</StatNumber>
              <StatHelpText fontSize="xs" mb={0}>response time</StatHelpText>
            </Stat>
          </SimpleGrid>

          <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={3}>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Text>
        </CardBody>
      </Card>

      {/* Server List */}
      <VStack spacing={3} align="stretch" flex={1} overflowY="auto">
        {servers.length === 0 ? (
          <Box textAlign="center" py={12}>
            <FiServer size={48} color="gray" style={{ margin: '0 auto' }} />
            <Text mt={4} color={useSemanticToken('text.secondary')}>No MCP servers configured</Text>
          </Box>
        ) : (
          servers.map((server) => (
            <MCPServerCard key={server.name} server={server} />
          ))
        )}
      </VStack>
    </VStack>
  );
};

// MCP Server Card Component
interface MCPServerCardProps {
  server: MCPServer;
}

const MCPServerCard: React.FC<MCPServerCardProps> = ({ server }) => {
  const { isOpen, onToggle } = useDisclosure();
  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Derive status from enabled field if status not provided
  const effectiveStatus = server.status || (server.enabled ? 'active' : 'inactive');

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'gray';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active': return <FiCheckCircle />;
      case 'inactive': return <FiAlertTriangle />;
      case 'error': return <FiXCircle />;
      default: return <FiServer />;
    }
  };

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const successRate = server.statistics
    ? (server.statistics.successful_calls / Math.max(server.statistics.total_calls, 1)) * 100
    : 0;

  return (
    <Card
      size="sm"
      bg={bg}
      borderLeft="4px"
      borderLeftColor={`${getStatusColor(effectiveStatus)}.500`}
      borderColor={borderColor}
    >
      <CardBody p={3}>
        <VStack align="start" spacing={3}>
          {/* Header */}
          <HStack justify="space-between" w="full">
            <HStack spacing={2}>
              <Box color={`${getStatusColor(effectiveStatus)}.500`}>
                {getStatusIcon(effectiveStatus)}
              </Box>
              <Code fontSize="sm" fontWeight="bold">{server.name}</Code>
              <Badge size="xs" colorScheme={getStatusColor(effectiveStatus)}>
                {effectiveStatus}
              </Badge>
              <Badge size="xs" variant="outline">{server.type}</Badge>
            </HStack>

            {server.health && effectiveStatus === 'active' && (
              <HStack spacing={2} fontSize="xs" color={useSemanticToken('text.secondary')}>
                <HStack spacing={1}>
                  <FiClock size={12} />
                  <Text>{server.health.response_time_ms}ms</Text>
                </HStack>
                <HStack spacing={1}>
                  <FiActivity size={12} />
                  <Text>{formatUptime(server.health.uptime_seconds)}</Text>
                </HStack>
              </HStack>
            )}
          </HStack>

          {/* Statistics Bar */}
          {server.statistics && server.statistics.total_calls > 0 && (
            <Box w="full">
              <HStack justify="space-between" mb={1} fontSize="xs">
                <HStack spacing={2}>
                  <HStack spacing={1}>
                    <FiTool size={12} />
                    <Text>{server.statistics.total_calls} calls</Text>
                  </HStack>
                  <Text color={useSemanticToken('status.success')}>
                    {successRate.toFixed(0)}% success
                  </Text>
                </HStack>
                <Text color={useSemanticToken('text.secondary')}>
                  avg {server.statistics.avg_duration_ms}ms
                </Text>
              </HStack>
              <Progress
                value={successRate}
                size="xs"
                colorScheme="green"
                borderRadius="full"
              />
            </Box>
          )}

          {/* Error Alert */}
          {effectiveStatus === 'error' && server.health && server.health.error_count > 0 && (
            <Alert status="error" size="sm" borderRadius="md">
              <AlertIcon boxSize={3} />
              <Text fontSize="xs">
                {server.health.error_count} error{server.health.error_count > 1 ? 's' : ''} detected
              </Text>
            </Alert>
          )}

          {/* Expandable Details */}
          {(server.tools || server.command || server.url) && (
            <Box w="full">
              <Button
                size="xs"
                variant="ghost"
                rightIcon={isOpen ? <FiChevronUp /> : <FiChevronDown />}
                onClick={onToggle}
              >
                {isOpen ? 'Hide' : 'Show'} details
              </Button>

              <Collapse in={isOpen}>
                <VStack spacing={3} align="stretch" mt={3}>
                  {/* Connection Info */}
                  {(server.command || server.url) && (
                    <Box>
                      <Text fontSize="xs" fontWeight="bold" mb={1}>Connection:</Text>
                      {server.command && (
                        <Code fontSize="xs" p={2} borderRadius="md" display="block" whiteSpace="nowrap" overflow="auto">
                          {server.command} {server.args?.join(' ')}
                        </Code>
                      )}
                      {server.url && (
                        <Code fontSize="xs" p={2} borderRadius="md" display="block">
                          {server.url}
                        </Code>
                      )}
                    </Box>
                  )}

                  {/* Available Tools */}
                  {server.tools && server.tools.length > 0 && (
                    <Box>
                      <Text fontSize="xs" fontWeight="bold" mb={2}>
                        Available Tools ({server.tools.length}):
                      </Text>
                      <HStack spacing={1} flexWrap="wrap">
                        {server.tools.map((tool, idx) => (
                          <Badge key={idx} size="xs" colorScheme="purple" variant="subtle">
                            {tool}
                          </Badge>
                        ))}
                      </HStack>
                    </Box>
                  )}

                  {/* Detailed Statistics */}
                  {server.statistics && (
                    <Box>
                      <Text fontSize="xs" fontWeight="bold" mb={2}>Statistics:</Text>
                      <SimpleGrid columns={2} spacing={2}>
                        <Box>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Successful:</Text>
                          <Text fontSize="sm" fontWeight="bold" color={useSemanticToken('status.success')}>
                            {server.statistics.successful_calls}
                          </Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Failed:</Text>
                          <Text fontSize="sm" fontWeight="bold" color={useSemanticToken('status.error')}>
                            {server.statistics.failed_calls}
                          </Text>
                        </Box>
                      </SimpleGrid>
                    </Box>
                  )}
                </VStack>
              </Collapse>
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default MCPServerStatus;
