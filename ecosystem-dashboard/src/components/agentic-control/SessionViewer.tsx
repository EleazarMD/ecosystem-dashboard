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
  Button,
  IconButton,
  Divider,
  Spinner,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatGroup,
  Code,
  Collapse,
  useDisclosure,
  Alert,
  AlertIcon,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  FiClock,
  FiActivity,
  FiDownload,
  FiSearch,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
  FiTool,
  FiCheckCircle,
  FiXCircle,
  FiMessageSquare,
  FiUser,
  FiCpu,
} from 'react-icons/fi';

interface SessionSummary {
  session_id: string;
  file_path: string;
  started_at: string;
  last_updated: string;
  message_count: number;
  tool_calls_count: number;
  is_active: boolean;
  size_bytes: number;
  preview: string;
}

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string | object;
  };
  result?: any;
  status?: 'success' | 'error' | 'pending';
  duration_ms?: number;
  error?: string;
}

interface SessionMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string | null;
  timestamp: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  metadata?: {
    model?: string;
    tokens?: {
      input: number;
      output: number;
      total: number;
    };
    latency_ms?: number;
    cost?: number;
  };
}

interface SessionData {
  session_id: string;
  file_path: string;
  started_at: string;
  ended_at?: string;
  last_updated: string;
  messages: SessionMessage[];
  statistics: {
    total_messages: number;
    user_messages: number;
    assistant_messages: number;
    tool_calls: number;
    successful_tools: number;
    failed_tools: number;
    total_tokens: number;
    total_cost: number;
    average_latency_ms: number;
    duration_seconds: number;
  };
  metadata: {
    models_used: string[];
    tools_used: string[];
    mcp_servers_used: string[];
    status: 'active' | 'completed' | 'error';
  };
}

interface SessionViewerProps {
  agentId?: string;
}

export const SessionViewer: React.FC<SessionViewerProps> = ({ agentId }) => {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const toast = useToast();
  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');

  // Load sessions
  useEffect(() => {
    loadSessions();
  }, [showActiveOnly]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (showActiveOnly) params.append('active', 'true');
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/agentic-control/sessions?${params}`);
      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading sessions',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetail = async (sessionId: string) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/agentic-control/sessions/${sessionId}`);
      const data = await response.json();

      if (data.success) {
        setSelectedSession(data.session);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading session details',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'yaml' | 'markdown') => {
    if (!selectedSession) return;

    try {
      const response = await fetch(
        `/api/agentic-control/sessions/${selectedSession.session_id}/export?format=${format}`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedSession.session_id}.${format === 'markdown' ? 'md' : format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Session exported',
          description: `Downloaded as ${format}`,
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <HStack spacing={0} align="stretch" h="full">
      {/* Session List */}
      <VStack
        w="350px"
        bg={bg}
        borderRight="1px"
        borderColor={borderColor}
        spacing={3}
        p={4}
        align="stretch"
        overflowY="auto"
      >
        <HStack justify="space-between">
          <Text fontSize="lg" fontWeight="bold">Sessions</Text>
          <HStack>
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw />}
              size="sm"
              variant="ghost"
              onClick={loadSessions}
              isLoading={loading}
            />
          </HStack>
        </HStack>

        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none">
            <FiSearch />
          </InputLeftElement>
          <Input
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && loadSessions()}
          />
        </InputGroup>

        <HStack>
          <Button
            size="xs"
            variant={showActiveOnly ? 'solid' : 'outline'}
            colorScheme="green"
            onClick={() => setShowActiveOnly(!showActiveOnly)}
          >
            Active Only
          </Button>
          <Badge colorScheme="blue">{sessions.length}</Badge>
        </HStack>

        <Divider />

        {loading ? (
          <Box textAlign="center" py={8}>
            <Spinner />
          </Box>
        ) : sessions.length === 0 ? (
          <Box textAlign="center" py={8}>
            <FiActivity size={32} color="gray" style={{ margin: '0 auto' }} />
            <Text mt={2} fontSize="sm" color={useSemanticToken('text.secondary')}>
              No sessions found
            </Text>
          </Box>
        ) : (
          <VStack spacing={2} align="stretch">
            {sessions.map((session) => (
              <Card
                key={session.session_id}
                size="sm"
                cursor="pointer"
                bg={selectedSession?.session_id === session.session_id ? 'blue.50' : bg}
                borderColor={selectedSession?.session_id === session.session_id ? 'blue.300' : borderColor}
                onClick={() => loadSessionDetail(session.session_id)}
                _hover={{ bg: hoverBg, transform: 'translateY(-1px)' }}
                transition="all 0.2s"
              >
                <CardBody p={3}>
                  <VStack align="start" spacing={2}>
                    <HStack justify="space-between" w="full">
                      <Badge colorScheme={session.is_active ? 'green' : 'gray'} size="xs">
                        {session.is_active ? 'Active' : 'Completed'}
                      </Badge>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                        {new Date(session.started_at).toLocaleDateString()}
                      </Text>
                    </HStack>

                    <Text fontSize="xs" fontWeight="bold" noOfLines={1}>
                      {session.session_id}
                    </Text>

                    <Text fontSize="xs" color={useSemanticToken('text.secondary')} noOfLines={2}>
                      {session.preview}
                    </Text>

                    <HStack spacing={3} fontSize="xs" color={useSemanticToken('text.secondary')}>
                      <HStack spacing={1}>
                        <FiMessageSquare size={12} />
                        <Text>{session.message_count}</Text>
                      </HStack>
                      <HStack spacing={1}>
                        <FiTool size={12} />
                        <Text>{session.tool_calls_count}</Text>
                      </HStack>
                      <Text>{formatBytes(session.size_bytes)}</Text>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        )}
      </VStack>

      {/* Session Detail */}
      <Box flex={1} overflowY="auto" p={6}>
        {!selectedSession && !detailLoading && (
          <Box textAlign="center" py={20}>
            <FiActivity size={48} color="gray" style={{ margin: '0 auto' }} />
            <Text mt={4} fontSize="lg" color={useSemanticToken('text.secondary')}>
              Select a session to view details
            </Text>
          </Box>
        )}

        {detailLoading && (
          <Box textAlign="center" py={20}>
            <Spinner size="xl" />
            <Text mt={4}>Loading session...</Text>
          </Box>
        )}

        {selectedSession && !detailLoading && (
          <VStack spacing={6} align="stretch">
            {/* Header */}
            <HStack justify="space-between">
              <VStack align="start" spacing={1}>
                <Text fontSize="2xl" fontWeight="bold">
                  {selectedSession.session_id}
                </Text>
                <HStack spacing={2}>
                  <Badge colorScheme={
                    selectedSession.metadata.status === 'active' ? 'green' :
                      selectedSession.metadata.status === 'error' ? 'red' : 'gray'
                  }>
                    {selectedSession.metadata.status}
                  </Badge>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    {new Date(selectedSession.started_at).toLocaleString()}
                  </Text>
                </HStack>
              </VStack>

              <Menu>
                <MenuButton as={Button} rightIcon={<FiDownload />} size="sm">
                  Export
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => handleExport('json')}>JSON</MenuItem>
                  <MenuItem onClick={() => handleExport('yaml')}>YAML</MenuItem>
                  <MenuItem onClick={() => handleExport('markdown')}>Markdown</MenuItem>
                </MenuList>
              </Menu>
            </HStack>

            {/* Statistics */}
            <Card>
              <CardBody>
                <StatGroup>
                  <Stat>
                    <StatLabel>Messages</StatLabel>
                    <StatNumber>{selectedSession.statistics.total_messages}</StatNumber>
                    <StatHelpText>
                      {selectedSession.statistics.user_messages} user, {selectedSession.statistics.assistant_messages} assistant
                    </StatHelpText>
                  </Stat>

                  <Stat>
                    <StatLabel>Tool Calls</StatLabel>
                    <StatNumber>{selectedSession.statistics.tool_calls}</StatNumber>
                    <StatHelpText>
                      {selectedSession.statistics.successful_tools} ✓ {selectedSession.statistics.failed_tools} ✗
                    </StatHelpText>
                  </Stat>

                  <Stat>
                    <StatLabel>Tokens</StatLabel>
                    <StatNumber>{selectedSession.statistics.total_tokens.toLocaleString()}</StatNumber>
                    <StatHelpText>
                      ${selectedSession.statistics.total_cost.toFixed(4)}
                    </StatHelpText>
                  </Stat>

                  <Stat>
                    <StatLabel>Duration</StatLabel>
                    <StatNumber>{formatDuration(selectedSession.statistics.duration_seconds)}</StatNumber>
                    <StatHelpText>
                      Avg: {selectedSession.statistics.average_latency_ms.toFixed(0)}ms
                    </StatHelpText>
                  </Stat>
                </StatGroup>
              </CardBody>
            </Card>

            {/* Metadata */}
            {(selectedSession.metadata.models_used.length > 0 || selectedSession.metadata.tools_used.length > 0) && (
              <Card>
                <CardBody>
                  <VStack align="start" spacing={3}>
                    {selectedSession.metadata.models_used.length > 0 && (
                      <Box>
                        <Text fontSize="sm" fontWeight="bold" mb={2}>Models Used</Text>
                        <HStack spacing={2} flexWrap="wrap">
                          {selectedSession.metadata.models_used.map((model, idx) => (
                            <Badge key={idx} colorScheme="purple">{model}</Badge>
                          ))}
                        </HStack>
                      </Box>
                    )}

                    {selectedSession.metadata.tools_used.length > 0 && (
                      <Box>
                        <Text fontSize="sm" fontWeight="bold" mb={2}>Tools Used</Text>
                        <HStack spacing={2} flexWrap="wrap">
                          {selectedSession.metadata.tools_used.map((tool, idx) => (
                            <Badge key={idx} colorScheme="cyan">{tool}</Badge>
                          ))}
                        </HStack>
                      </Box>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            )}

            {/* Messages Timeline */}
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={4}>Conversation Timeline</Text>
              <VStack spacing={4} align="stretch">
                {selectedSession.messages.map((message, idx) => (
                  <MessageCard key={idx} message={message} />
                ))}
              </VStack>
            </Box>
          </VStack>
        )}
      </Box>
    </HStack>
  );
};

// Message Card Component
const MessageCard: React.FC<{ message: SessionMessage }> = ({ message }) => {
  const { isOpen, onToggle } = useDisclosure();
  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const getRoleColor = () => {
    switch (message.role) {
      case 'user': return 'blue';
      case 'assistant': return 'purple';
      case 'tool': return 'green';
      default: return 'gray';
    }
  };

  const getRoleIcon = () => {
    switch (message.role) {
      case 'user': return <FiUser />;
      case 'assistant': return <FiCpu />;
      case 'tool': return <FiTool />;
      default: return <FiActivity />;
    }
  };

  return (
    <Card size="sm" bg={bg} borderColor={borderColor}>
      <CardBody>
        <VStack align="start" spacing={3}>
          <HStack justify="space-between" w="full">
            <HStack spacing={2}>
              <Box color={`${getRoleColor()}.500`}>
                {getRoleIcon()}
              </Box>
              <Badge colorScheme={getRoleColor()}>{message.role}</Badge>
              {message.metadata?.model && (
                <Badge variant="outline" size="sm">{message.metadata.model}</Badge>
              )}
            </HStack>
            <HStack spacing={2} fontSize="xs" color={useSemanticToken('text.secondary')}>
              <FiClock size={12} />
              <Text>{new Date(message.timestamp).toLocaleTimeString()}</Text>
              {message.metadata?.latency_ms && (
                <Text>({message.metadata.latency_ms}ms)</Text>
              )}
            </HStack>
          </HStack>

          {message.content && (
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {message.content}
            </Text>
          )}

          {message.tool_calls && message.tool_calls.length > 0 && (
            <Box w="full">
              <Button
                size="xs"
                variant="ghost"
                rightIcon={isOpen ? <FiChevronUp /> : <FiChevronDown />}
                onClick={onToggle}
              >
                {message.tool_calls.length} tool call{message.tool_calls.length > 1 ? 's' : ''}
              </Button>

              <Collapse in={isOpen}>
                <VStack spacing={2} align="stretch" mt={2} pl={4}>
                  {message.tool_calls.map((tool, idx) => (
                    <Box key={idx} p={2} bg={useSemanticToken('surface.base')} borderRadius="md" borderLeft="2px" borderColor={tool.status === 'success' ? 'green.500' : 'red.500'}>
                      <HStack justify="space-between">
                        <HStack>
                          {tool.status === 'success' ? <FiCheckCircle color="green" /> : <FiXCircle color="red" />}
                          <Code fontSize="xs">{tool.function.name}</Code>
                        </HStack>
                        {tool.duration_ms && (
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{tool.duration_ms}ms</Text>
                        )}
                      </HStack>
                      {tool.error && (
                        <Text fontSize="xs" color="red.500" mt={1}>{tool.error}</Text>
                      )}
                    </Box>
                  ))}
                </VStack>
              </Collapse>
            </Box>
          )}

          {message.metadata?.tokens && (
            <HStack spacing={4} fontSize="xs" color={useSemanticToken('text.secondary')}>
              <Text>Tokens: {message.metadata.tokens.total.toLocaleString()}</Text>
              {message.metadata.cost && (
                <Text>Cost: ${message.metadata.cost.toFixed(6)}</Text>
              )}
            </HStack>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default SessionViewer;
