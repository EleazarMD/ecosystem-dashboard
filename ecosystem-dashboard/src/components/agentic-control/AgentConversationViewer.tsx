import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Select,
  Divider,
  Badge,
  Card,
  CardBody,
  useToast,
  Spinner,
  IconButton,
  Collapse,
  useDisclosure,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Code,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import {
  FiMessageSquare, 
  FiDatabase, 
  FiSearch, 
  FiRefreshCw,
  FiDownload,
  FiEye,
  FiSettings,
  FiClock,
  FiUser,
  FiTool,
  FiFilter
} from 'react-icons/fi';

interface Message {
  id: string;
  timestamp: string;
  type: 'user' | 'agent' | 'system' | 'tool';
  content: string;
  metadata?: {
    confidence?: number;
    model?: string;
    tools_used?: string[];
    response_time?: number;
    token_count?: number;
  };
}

interface Session {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'completed' | 'abandoned';
  total_messages: number;
  duration: number;
  context?: string;
}

interface AgentConversationViewerProps {
  agentId: string;
  agentName: string;
}

export const AgentConversationViewer: React.FC<AgentConversationViewerProps> = ({
  agentId,
  agentName
}) => {
  const toast = useToast();
  const { isOpen: isFilterOpen, onToggle: onFilterToggle } = useDisclosure();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    sessionStatus: 'all',
    messageType: 'all',
    searchTerm: '',
    timeRange: '24h'
  });

  useEffect(() => {
    loadSessions();
  }, [agentId, filters]);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession.id);
    }
  }, [selectedSession]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      // Mock API call - simulate loading agent sessions
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockSessions: Session[] = [
        {
          id: 'sess_001',
          user_id: 'user_123',
          started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          total_messages: 8,
          duration: 3600,
          context: 'System performance analysis'
        },
        {
          id: 'sess_002',
          user_id: 'user_456',
          started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          status: 'active',
          total_messages: 12,
          duration: 1800,
          context: 'Configuration troubleshooting'
        },
        {
          id: 'sess_003',
          user_id: 'user_789',
          started_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          total_messages: 15,
          duration: 2700,
          context: 'Memory optimization discussion'
        }
      ];
      
      const filtered = mockSessions.filter(session => {
        if (filters.sessionStatus !== 'all' && session.status !== filters.sessionStatus) return false;
        if (filters.searchTerm && !session.context?.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
        return true;
      });
      
      setSessions(filtered);
      if (filtered.length > 0 && !selectedSession) {
        setSelectedSession(filtered[0]);
      }
    } catch (error) {
      toast({
        title: 'Error loading sessions',
        description: 'Failed to load conversation sessions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      // Mock API call - simulate loading session messages
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockMessages: Message[] = [
        {
          id: 'msg_001',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          type: 'user',
          content: 'Can you analyze the current system performance?',
          metadata: {
            token_count: 12
          }
        },
        {
          id: 'msg_002',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000).toISOString(),
          type: 'agent',
          content: 'I\'ll analyze the system performance for you. Let me gather the current metrics.',
          metadata: {
            confidence: 0.95,
            model: 'mistral:latest',
            response_time: 850,
            token_count: 18,
            tools_used: ['system_metrics', 'performance_analyzer']
          }
        },
        {
          id: 'msg_003',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 45000).toISOString(),
          type: 'tool',
          content: 'System metrics retrieved: CPU 45%, Memory 62%, Network I/O 8.2MB/s',
          metadata: {
            tools_used: ['system_metrics']
          }
        },
        {
          id: 'msg_004',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 60000).toISOString(),
          type: 'agent',
          content: 'Based on the analysis, your system is performing well. CPU usage at 45% is within normal range, memory usage at 62% is acceptable, and network I/O looks healthy. I recommend monitoring the memory usage trends over the next few hours.',
          metadata: {
            confidence: 0.92,
            model: 'mistral:latest',
            response_time: 1200,
            token_count: 45
          }
        },
        {
          id: 'msg_005',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 120000).toISOString(),
          type: 'user',
          content: 'What about disk usage? Should I be concerned?',
          metadata: {
            token_count: 11
          }
        },
        {
          id: 'msg_006',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 150000).toISOString(),
          type: 'agent',
          content: 'Let me check the disk usage statistics for you.',
          metadata: {
            confidence: 0.98,
            model: 'mistral:latest',
            response_time: 750,
            token_count: 12,
            tools_used: ['disk_analyzer']
          }
        }
      ];
      
      const filtered = mockMessages.filter(msg => {
        if (filters.messageType !== 'all' && msg.type !== filters.messageType) return false;
        if (filters.searchTerm && !msg.content.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
        return true;
      });
      
      setMessages(filtered);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const exportConversation = () => {
    if (!selectedSession) return;
    
    const data = {
      session: selectedSession,
      messages: messages,
      agent: { id: agentId, name: agentName },
      exported_at: new Date().toISOString(),
      filters: filters
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agentName}_conversation_${selectedSession.id}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Conversation exported',
      description: 'Conversation data has been downloaded',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'user': return <FiUser />;
      case 'agent': return <FiMessageSquare />;
      case 'system': return <FiSettings />;
      case 'tool': return <FiTool />;
      default: return <FiMessageSquare />;
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'user': return 'blue';
      case 'agent': return 'green';
      case 'system': return 'gray';
      case 'tool': return 'purple';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'completed': return 'blue';
      case 'abandoned': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box h="700px" w="100%">
      <VStack spacing={4} align="stretch" h="100%">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <FiMessageSquare />
            <Text fontSize="lg" fontWeight="bold">
              Conversation History - {agentName}
            </Text>
          </HStack>
          <HStack>
            <Button
              size="sm"
              leftIcon={<FiFilter />}
              onClick={onFilterToggle}
              variant="outline"
            >
              Filters
            </Button>
            <Button
              size="sm"
              leftIcon={<FiRefreshCw />}
              onClick={loadSessions}
              isLoading={loading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              leftIcon={<FiDownload />}
              onClick={exportConversation}
              isDisabled={!selectedSession}
              variant="outline"
            >
              Export
            </Button>
          </HStack>
        </HStack>

        {/* Filters */}
        <Collapse in={isFilterOpen}>
          <Card>
            <CardBody>
              <HStack spacing={4} wrap="wrap">
                <Select
                  size="sm"
                  value={filters.sessionStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, sessionStatus: e.target.value }))}
                  w="140px"
                >
                  <option value="all">All Sessions</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="abandoned">Abandoned</option>
                </Select>
                
                <Select
                  size="sm"
                  value={filters.messageType}
                  onChange={(e) => setFilters(prev => ({ ...prev, messageType: e.target.value }))}
                  w="140px"
                >
                  <option value="all">All Messages</option>
                  <option value="user">User</option>
                  <option value="agent">Agent</option>
                  <option value="system">System</option>
                  <option value="tool">Tool</option>
                </Select>
                
                <Input
                  size="sm"
                  placeholder="Search conversations..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  w="200px"
                />
                
                <Select
                  size="sm"
                  value={filters.timeRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                  w="120px"
                >
                  <option value="1h">Last Hour</option>
                  <option value="24h">Last 24h</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </Select>
              </HStack>
            </CardBody>
          </Card>
        </Collapse>

        {/* Main Content */}
        <HStack spacing={4} align="stretch" flex={1}>
          {/* Session List */}
          <Box w="300px" minW="300px">
            <Text fontSize="sm" fontWeight="semibold" mb={2}>
              Sessions ({sessions.length})
            </Text>
            <VStack spacing={2} align="stretch" overflowY="auto" h="100%">
              {loading ? (
                <VStack justify="center" h="200px">
                  <Spinner />
                  <Text fontSize="sm">Loading sessions...</Text>
                </VStack>
              ) : sessions.length === 0 ? (
                <Alert status="info" size="sm">
                  <AlertIcon />
                  <AlertTitle fontSize="sm">No sessions</AlertTitle>
                </Alert>
              ) : (
                sessions.map((session) => (
                  <Card
                    key={session.id}
                    variant="outline"
                    cursor="pointer"
                    bg={selectedSession?.id === session.id ? 'blue.50' : 'white'}
                    borderColor={selectedSession?.id === session.id ? 'blue.200' : 'gray.200'}
                    onClick={() => setSelectedSession(session)}
                    size="sm"
                  >
                    <CardBody p={3}>
                      <VStack spacing={2} align="stretch">
                        <HStack justify="space-between">
                          <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                            {session.id}
                          </Text>
                          <Badge colorScheme={getStatusColor(session.status)} size="sm">
                            {session.status}
                          </Badge>
                        </HStack>
                        
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} noOfLines={2}>
                          {session.context || 'No context'}
                        </Text>
                        
                        <HStack justify="space-between" fontSize="xs" color={useSemanticToken('text.secondary')}>
                          <Text>{session.total_messages} msgs</Text>
                          <Text>{Math.round(session.duration / 60)}m</Text>
                        </HStack>
                        
                        <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
                          {new Date(session.started_at).toLocaleString()}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                ))
              )}
            </VStack>
          </Box>

          {/* Messages */}
          <Box flex={1}>
            {selectedSession ? (
              <VStack spacing={3} align="stretch" h="100%">
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="semibold">
                    Messages ({messages.length})
                  </Text>
                  <HStack fontSize="xs" color={useSemanticToken('text.secondary')}>
                    <FiClock />
                    <Text>{new Date(selectedSession.started_at).toLocaleString()}</Text>
                  </HStack>
                </HStack>
                
                <Box overflowY="auto" flex={1}>
                  {messages.length === 0 ? (
                    <Alert status="info">
                      <AlertIcon />
                      <AlertTitle>No messages</AlertTitle>
                      <AlertDescription>
                        This session has no messages or they don't match the current filters.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <VStack spacing={3} align="stretch">
                      {messages.map((message) => (
                        <Card key={message.id} variant="outline" size="sm">
                          <CardBody p={3}>
                            <VStack spacing={2} align="stretch">
                              <HStack justify="space-between">
                                <HStack spacing={2}>
                                  {getMessageIcon(message.type)}
                                  <Badge colorScheme={getMessageColor(message.type)} size="sm">
                                    {message.type}
                                  </Badge>
                                  {message.metadata?.model && (
                                    <Badge variant="subtle" size="sm">
                                      {message.metadata.model}
                                    </Badge>
                                  )}
                                </HStack>
                                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                  {new Date(message.timestamp).toLocaleTimeString()}
                                </Text>
                              </HStack>
                              
                              <Text fontSize="sm" whiteSpace="pre-wrap">
                                {message.content}
                              </Text>
                              
                              {message.metadata && (
                                <Box>
                                  <Divider />
                                  <HStack justify="space-between" fontSize="xs" color={useSemanticToken('text.secondary')} mt={2}>
                                    {message.metadata.confidence && (
                                      <Text>Confidence: {Math.round(message.metadata.confidence * 100)}%</Text>
                                    )}
                                    {message.metadata.response_time && (
                                      <Text>Response: {message.metadata.response_time}ms</Text>
                                    )}
                                    {message.metadata.token_count && (
                                      <Text>Tokens: {message.metadata.token_count}</Text>
                                    )}
                                  </HStack>
                                  {message.metadata.tools_used && message.metadata.tools_used.length > 0 && (
                                    <HStack spacing={1} mt={1}>
                                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Tools:</Text>
                                      {message.metadata.tools_used.map(tool => (
                                        <Badge key={tool} variant="subtle" size="sm">
                                          {tool}
                                        </Badge>
                                      ))}
                                    </HStack>
                                  )}
                                </Box>
                              )}
                            </VStack>
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  )}
                </Box>
              </VStack>
            ) : (
              <Alert status="info">
                <AlertIcon />
                <AlertTitle>Select a session</AlertTitle>
                <AlertDescription>
                  Choose a conversation session from the list to view its messages.
                </AlertDescription>
              </Alert>
            )}
          </Box>
        </HStack>
      </VStack>
    </Box>
  );
};

export default AgentConversationViewer;
