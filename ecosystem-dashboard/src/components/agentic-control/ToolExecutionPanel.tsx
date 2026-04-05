import React, { useState, useEffect, useRef } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Badge,
  Button,
  IconButton,
  Divider,
  Code,
  Collapse,
  useDisclosure,
  Tooltip,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Progress,
  Alert,
  AlertIcon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Switch,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import {
  FiTool,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiPlay,
  FiPause,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiFilter,
  FiActivity,
  FiZap,
  FiSettings,
} from 'react-icons/fi';

interface ToolExecutionEvent {
  id: string;
  timestamp: string;
  tool_name: string;
  mcp_server?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  arguments?: any;
  result?: any;
  error?: string;
  duration_ms?: number;
  agent_id?: string;
  session_id?: string;
}

interface ToolStatistics {
  total_executions: number;
  successful: number;
  failed: number;
  average_duration_ms: number;
  total_duration_ms: number;
  by_tool: Record<string, {
    count: number;
    success_rate: number;
    avg_duration_ms: number;
  }>;
  by_server: Record<string, {
    count: number;
    success_rate: number;
  }>;
}

interface ToolExecutionPanelProps {
  agentId?: string;
  autoRefresh?: boolean;
}

export const ToolExecutionPanel: React.FC<ToolExecutionPanelProps> = ({
  agentId,
  autoRefresh = true
}) => {
  const [events, setEvents] = useState<ToolExecutionEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ToolExecutionEvent[]>([]);
  const [statistics, setStatistics] = useState<ToolStatistics | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showStats, setShowStats] = useState(true);
  const [maxEvents, setMaxEvents] = useState(100);

  const wsRef = useRef<WebSocket | null>(null);
  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Real WebSocket connection to Goose API
  useEffect(() => {
    if (!autoRefresh || isPaused) return;

    const wsUrl = `ws://localhost:9001/ws/tools/${agentId || 'goose-main-agent'}`;
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;
    let isConnecting = false;

    const connect = () => {
      if (isConnecting) return;
      isConnecting = true;

      console.log('[ToolPanel] Connecting to:', wsUrl);

      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[ToolPanel] ✅ WebSocket connected');
          isConnecting = false;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'tool_execution' || data.type === 'tool_call') {
              const toolEvent: ToolExecutionEvent = {
                id: data.id || `evt-${Date.now()}`,
                timestamp: data.timestamp || new Date().toISOString(),
                tool_name: data.tool_name || data.name,
                mcp_server: data.mcp_server || data.server,
                status: data.status || 'success',
                arguments: data.arguments || data.args,
                result: data.result,
                error: data.error,
                duration_ms: data.duration_ms || data.duration,
                agent_id: data.agent_id || agentId,
                session_id: data.session_id
              };

              setEvents(prev => [toolEvent, ...prev].slice(0, maxEvents));
            }
          } catch (error) {
            console.error('[ToolPanel] Error parsing message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[ToolPanel] WebSocket error:', error);
          isConnecting = false;
        };

        ws.onclose = () => {
          console.log('[ToolPanel] WebSocket closed, reconnecting in 5s...');
          isConnecting = false;
          wsRef.current = null;

          // Reconnect after 5 seconds
          reconnectTimer = setTimeout(() => {
            if (autoRefresh && !isPaused) {
              connect();
            }
          }, 5000);
        };
      } catch (error) {
        console.error('[ToolPanel] Failed to create WebSocket:', error);
        isConnecting = false;

        // Retry connection
        reconnectTimer = setTimeout(() => {
          if (autoRefresh && !isPaused) {
            connect();
          }
        }, 5000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('[ToolPanel] Closing WebSocket');
        ws.close();
      }
      wsRef.current = null;
    };
  }, [autoRefresh, isPaused, agentId, maxEvents]);

  // Calculate statistics
  useEffect(() => {
    const stats: ToolStatistics = {
      total_executions: events.length,
      successful: events.filter(e => e.status === 'success').length,
      failed: events.filter(e => e.status === 'error').length,
      average_duration_ms: 0,
      total_duration_ms: 0,
      by_tool: {},
      by_server: {}
    };

    // Calculate durations
    const durations = events.map(e => e.duration_ms || 0).filter(d => d > 0);
    if (durations.length > 0) {
      stats.total_duration_ms = durations.reduce((sum, d) => sum + d, 0);
      stats.average_duration_ms = stats.total_duration_ms / durations.length;
    }

    // Group by tool
    events.forEach(event => {
      if (!stats.by_tool[event.tool_name]) {
        stats.by_tool[event.tool_name] = { count: 0, success_rate: 0, avg_duration_ms: 0 };
      }
      stats.by_tool[event.tool_name].count++;
    });

    // Calculate success rates and avg durations per tool
    Object.keys(stats.by_tool).forEach(toolName => {
      const toolEvents = events.filter(e => e.tool_name === toolName);
      const successful = toolEvents.filter(e => e.status === 'success').length;
      stats.by_tool[toolName].success_rate = (successful / toolEvents.length) * 100;

      const toolDurations = toolEvents.map(e => e.duration_ms || 0).filter(d => d > 0);
      if (toolDurations.length > 0) {
        stats.by_tool[toolName].avg_duration_ms =
          toolDurations.reduce((sum, d) => sum + d, 0) / toolDurations.length;
      }
    });

    // Group by server
    events.forEach(event => {
      if (event.mcp_server) {
        if (!stats.by_server[event.mcp_server]) {
          stats.by_server[event.mcp_server] = { count: 0, success_rate: 0 };
        }
        stats.by_server[event.mcp_server].count++;
      }
    });

    // Calculate success rates per server
    Object.keys(stats.by_server).forEach(serverName => {
      const serverEvents = events.filter(e => e.mcp_server === serverName);
      const successful = serverEvents.filter(e => e.status === 'success').length;
      stats.by_server[serverName].success_rate = (successful / serverEvents.length) * 100;
    });

    setStatistics(stats);
  }, [events]);

  // Filter events
  useEffect(() => {
    let filtered = events;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(e => e.status === filterStatus);
    }

    setFilteredEvents(filtered);
  }, [events, filterStatus]);

  const handleClearEvents = () => {
    setEvents([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'green';
      case 'error': return 'red';
      case 'running': return 'blue';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <FiCheckCircle />;
      case 'error': return <FiXCircle />;
      case 'running': return <FiActivity />;
      case 'pending': return <FiAlertCircle />;
      default: return <FiTool />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <VStack spacing={4} align="stretch" h="full" p={4}>
      {/* Header */}
      <HStack justify="space-between">
        <HStack spacing={2}>
          <FiZap />
          <Text fontSize="lg" fontWeight="bold">Tool Execution</Text>
          <Badge colorScheme="blue">{events.length}</Badge>
        </HStack>

        <HStack spacing={2}>
          <Tooltip label={isPaused ? 'Resume' : 'Pause'}>
            <IconButton
              aria-label={isPaused ? 'Resume' : 'Pause'}
              icon={isPaused ? <FiPlay /> : <FiPause />}
              size="sm"
              variant="ghost"
              onClick={() => setIsPaused(!isPaused)}
              colorScheme={isPaused ? 'green' : 'gray'}
            />
          </Tooltip>

          <Menu>
            <MenuButton as={IconButton} icon={<FiFilter />} size="sm" variant="ghost">
              Filter
            </MenuButton>
            <MenuList>
              <MenuItem onClick={() => setFilterStatus('all')}>
                All Events
              </MenuItem>
              <MenuItem onClick={() => setFilterStatus('success')}>
                <HStack><FiCheckCircle color="green" /><Text>Success Only</Text></HStack>
              </MenuItem>
              <MenuItem onClick={() => setFilterStatus('error')}>
                <HStack><FiXCircle color="red" /><Text>Errors Only</Text></HStack>
              </MenuItem>
            </MenuList>
          </Menu>

          <Tooltip label="Clear all events">
            <IconButton
              aria-label="Clear"
              icon={<FiTrash2 />}
              size="sm"
              variant="ghost"
              onClick={handleClearEvents}
            />
          </Tooltip>

          <FormControl display="flex" alignItems="center" w="auto">
            <FormLabel htmlFor="stats-toggle" mb="0" fontSize="xs">
              Stats
            </FormLabel>
            <Switch
              id="stats-toggle"
              size="sm"
              isChecked={showStats}
              onChange={(e) => setShowStats(e.target.checked)}
            />
          </FormControl>
        </HStack>
      </HStack>

      <Divider />

      {/* Statistics */}
      {showStats && statistics && statistics.total_executions > 0 && (
        <Card size="sm">
          <CardBody>
            <SimpleGrid columns={4} spacing={4}>
              <Stat size="sm">
                <StatLabel fontSize="xs">Total</StatLabel>
                <StatNumber fontSize="xl">{statistics.total_executions}</StatNumber>
                <StatHelpText fontSize="xs" mb={0}>executions</StatHelpText>
              </Stat>

              <Stat size="sm">
                <StatLabel fontSize="xs">Success Rate</StatLabel>
                <StatNumber fontSize="xl" color={useSemanticToken('status.success')}>
                  {((statistics.successful / statistics.total_executions) * 100).toFixed(0)}%
                </StatNumber>
                <StatHelpText fontSize="xs" mb={0}>
                  {statistics.successful} / {statistics.total_executions}
                </StatHelpText>
              </Stat>

              <Stat size="sm">
                <StatLabel fontSize="xs">Avg Duration</StatLabel>
                <StatNumber fontSize="xl">
                  {statistics.average_duration_ms.toFixed(0)}ms
                </StatNumber>
                <StatHelpText fontSize="xs" mb={0}>per execution</StatHelpText>
              </Stat>

              <Stat size="sm">
                <StatLabel fontSize="xs">Failed</StatLabel>
                <StatNumber fontSize="xl" color={useSemanticToken('status.error')}>
                  {statistics.failed}
                </StatNumber>
                <StatHelpText fontSize="xs" mb={0}>errors</StatHelpText>
              </Stat>
            </SimpleGrid>

            {/* Top Tools */}
            {Object.keys(statistics.by_tool).length > 0 && (
              <Box mt={4}>
                <Text fontSize="xs" fontWeight="bold" mb={2}>Top Tools</Text>
                <VStack spacing={1} align="stretch">
                  {Object.entries(statistics.by_tool)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 5)
                    .map(([tool, stats]) => (
                      <HStack key={tool} justify="space-between" fontSize="xs">
                        <HStack flex={1}>
                          <Code fontSize="xs">{tool}</Code>
                          <Badge size="xs" colorScheme="blue">{stats.count}</Badge>
                        </HStack>
                        <HStack spacing={2}>
                          <Text color={useSemanticToken('status.success')}>{stats.success_rate.toFixed(0)}%</Text>
                          <Text color={useSemanticToken('text.secondary')}>{stats.avg_duration_ms.toFixed(0)}ms</Text>
                        </HStack>
                      </HStack>
                    ))}
                </VStack>
              </Box>
            )}
          </CardBody>
        </Card>
      )}

      {/* Event Stream */}
      <VStack spacing={2} align="stretch" flex={1} overflowY="auto">
        {filteredEvents.length === 0 ? (
          <Box textAlign="center" py={12}>
            <FiTool size={48} color="gray" style={{ margin: '0 auto' }} />
            <Text mt={4} color={useSemanticToken('text.secondary')}>
              {isPaused ? 'Paused - no new events' : 'No tool executions yet'}
            </Text>
            <Text fontSize="sm" color={useSemanticToken('text.tertiary')} mt={2}>
              {isPaused ? 'Click play to resume' : 'Tool calls will appear here in real-time'}
            </Text>
          </Box>
        ) : (
          filteredEvents.map((event) => (
            <ToolEventCard key={event.id} event={event} />
          ))
        )}
      </VStack>
    </VStack>
  );
};

// Tool Event Card Component
interface ToolEventCardProps {
  event: ToolExecutionEvent;
}

const ToolEventCard: React.FC<ToolEventCardProps> = ({ event }) => {
  const { isOpen, onToggle } = useDisclosure();
  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'green';
      case 'error': return 'red';
      case 'running': return 'blue';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <FiCheckCircle />;
      case 'error': return <FiXCircle />;
      case 'running': return <FiActivity />;
      case 'pending': return <FiAlertCircle />;
      default: return <FiTool />;
    }
  };

  return (
    <Card
      size="sm"
      bg={bg}
      borderLeft="4px"
      borderLeftColor={`${getStatusColor(event.status)}.500`}
      borderColor={borderColor}
    >
      <CardBody p={3}>
        <VStack align="start" spacing={2}>
          <HStack justify="space-between" w="full">
            <HStack spacing={2}>
              <Box color={`${getStatusColor(event.status)}.500`}>
                {getStatusIcon(event.status)}
              </Box>
              <Code fontSize="sm" fontWeight="bold">{event.tool_name}</Code>
              {event.mcp_server && (
                <Badge size="xs" colorScheme="purple">{event.mcp_server}</Badge>
              )}
              <Badge size="xs" colorScheme={getStatusColor(event.status)}>
                {event.status}
              </Badge>
            </HStack>

            <HStack spacing={2} fontSize="xs" color={useSemanticToken('text.secondary')}>
              {event.duration_ms && (
                <HStack spacing={1}>
                  <FiClock size={12} />
                  <Text>{event.duration_ms}ms</Text>
                </HStack>
              )}
              <Text>{new Date(event.timestamp).toLocaleTimeString()}</Text>
            </HStack>
          </HStack>

          {event.error && (
            <Alert status="error" size="sm" borderRadius="md">
              <AlertIcon boxSize={3} />
              <Text fontSize="xs">{event.error}</Text>
            </Alert>
          )}

          {(event.arguments || event.result) && (
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
                <VStack spacing={2} align="stretch" mt={2}>
                  {event.arguments && (
                    <Box>
                      <Text fontSize="xs" fontWeight="bold" mb={1}>Arguments:</Text>
                      <Code
                        fontSize="xs"
                        p={2}
                        borderRadius="md"
                        display="block"
                        whiteSpace="pre-wrap"
                        wordBreak="break-all"
                      >
                        {JSON.stringify(event.arguments, null, 2).substring(0, 300)}
                        {JSON.stringify(event.arguments).length > 300 && '...'}
                      </Code>
                    </Box>
                  )}

                  {event.result && (
                    <Box>
                      <Text fontSize="xs" fontWeight="bold" mb={1}>Result:</Text>
                      <Code
                        fontSize="xs"
                        p={2}
                        borderRadius="md"
                        display="block"
                        whiteSpace="pre-wrap"
                        wordBreak="break-all"
                      >
                        {typeof event.result === 'string'
                          ? event.result.substring(0, 300)
                          : JSON.stringify(event.result, null, 2).substring(0, 300)
                        }
                        {(typeof event.result === 'string' ? event.result.length : JSON.stringify(event.result).length) > 300 && '...'}
                      </Code>
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

export default ToolExecutionPanel;
