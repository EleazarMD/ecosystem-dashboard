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
  Textarea,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Progress,
  Code,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import {
  FiDatabase, 
  FiSearch, 
  FiTrash2, 
  FiEdit3, 
  FiPlus,
  FiRefreshCw,
  FiDownload,
  FiUpload,
  FiEye,
  FiSettings,
  FiClock,
  FiTag
} from 'react-icons/fi';

interface MemoryEntry {
  id: string;
  key: string;
  value: any;
  type: 'session' | 'user' | 'app' | 'long_term';
  created_at: string;
  updated_at: string;
  access_count: number;
  importance: number;
  tags?: string[];
  session_id?: string;
  user_id?: string;
  context?: string;
}

interface SessionState {
  session_id: string;
  user_id: string;
  agent_id: string;
  state: Record<string, any>;
  created_at: string;
  updated_at: string;
  status: 'active' | 'expired' | 'archived';
}

interface AgentMemoryInspectorProps {
  agentId: string;
  agentName: string;
}

export const AgentMemoryInspector: React.FC<AgentMemoryInspectorProps> = ({
  agentId,
  agentName
}) => {
  const toast = useToast();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [sessionStates, setSessionStates] = useState<SessionState[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<MemoryEntry | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState({
    type: 'all',
    searchTerm: '',
    timeRange: '24h',
    minImportance: 0
  });
  const [newMemory, setNewMemory] = useState({
    key: '',
    value: '',
    type: 'session' as const,
    importance: 0.5,
    tags: ''
  });

  useEffect(() => {
    loadMemories();
    loadSessionStates();
  }, [agentId, filters]);

  const loadMemories = async () => {
    setLoading(true);
    try {
      // Mock API call - simulate loading agent memories
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockMemories: MemoryEntry[] = [
        {
          id: 'mem_001',
          key: 'user_preferences',
          value: { theme: 'dark', language: 'en', notifications: true },
          type: 'user',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          access_count: 15,
          importance: 0.8,
          tags: ['preferences', 'user_settings'],
          user_id: 'user_123',
          context: 'User configuration preferences stored across sessions'
        },
        {
          id: 'mem_002',
          key: 'last_analysis_results',
          value: {
            cpu_usage: 78,
            memory_usage: 64,
            analysis_time: '2024-01-15T10:30:00Z',
            recommendations: ['optimize memory usage', 'schedule cleanup tasks']
          },
          type: 'session',
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          access_count: 3,
          importance: 0.6,
          tags: ['analysis', 'performance'],
          session_id: 'sess_001',
          context: 'Latest system performance analysis results'
        },
        {
          id: 'mem_003',
          key: 'learned_patterns',
          value: {
            common_queries: ['system status', 'performance metrics', 'error logs'],
            user_behavior: { peak_hours: [9, 14, 16], preferred_format: 'detailed' },
            optimization_history: ['memory_cleanup_2024-01-10', 'cpu_optimization_2024-01-12']
          },
          type: 'long_term',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          access_count: 42,
          importance: 0.9,
          tags: ['learning', 'patterns', 'optimization'],
          context: 'Long-term learned patterns and behaviors for improved assistance'
        },
        {
          id: 'mem_004',
          key: 'app_configuration',
          value: {
            default_timeout: 30000,
            max_retries: 3,
            log_level: 'info',
            feature_flags: { experimental_features: true, debug_mode: false }
          },
          type: 'app',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          access_count: 8,
          importance: 0.7,
          tags: ['configuration', 'global_settings'],
          context: 'Application-wide configuration settings'
        }
      ];
      
      const filtered = mockMemories.filter(mem => {
        if (filters.type !== 'all' && mem.type !== filters.type) return false;
        if (filters.searchTerm && !mem.key.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
            !JSON.stringify(mem.value).toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
        if (mem.importance < filters.minImportance) return false;
        return true;
      });
      
      setMemories(filtered);
    } catch (error) {
      toast({
        title: 'Error loading memories',
        description: 'Failed to load agent memories',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSessionStates = async () => {
    try {
      // Mock API call - simulate loading session states
      const mockStates: SessionState[] = [
        {
          session_id: 'sess_001',
          user_id: 'user_123',
          agent_id: agentId,
          state: {
            current_task: 'performance_analysis',
            progress: 0.75,
            last_query: 'system metrics',
            context_window: 4096,
            conversation_turns: 8
          },
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          status: 'active'
        },
        {
          session_id: 'sess_002',
          user_id: 'user_456',
          agent_id: agentId,
          state: {
            current_task: 'configuration_review',
            progress: 1.0,
            last_query: 'agent settings',
            context_window: 2048,
            conversation_turns: 12
          },
          created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          status: 'expired'
        }
      ];
      
      setSessionStates(mockStates);
    } catch (error) {
      console.error('Error loading session states:', error);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setMemories(prev => prev.filter(mem => mem.id !== memoryId));
      toast({
        title: 'Memory deleted',
        description: 'Memory entry has been removed',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error deleting memory',
        description: 'Failed to delete memory entry',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const addMemory = async () => {
    try {
      const memory: MemoryEntry = {
        id: `mem_${Date.now()}`,
        key: newMemory.key,
        value: JSON.parse(newMemory.value || '{}'),
        type: newMemory.type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        access_count: 0,
        importance: newMemory.importance,
        tags: newMemory.tags.split(',').map(t => t.trim()).filter(Boolean),
        context: `Added via memory inspector`
      };

      setMemories(prev => [memory, ...prev]);
      setNewMemory({ key: '', value: '', type: 'session', importance: 0.5, tags: '' });
      onAddClose();
      
      toast({
        title: 'Memory added',
        description: 'New memory entry has been created',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error adding memory',
        description: 'Failed to create memory entry',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const exportMemories = () => {
    const data = {
      agent: { id: agentId, name: agentName },
      memories: memories,
      session_states: sessionStates,
      exported_at: new Date().toISOString(),
      filters: filters
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agentName}_memories_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Memories exported',
      description: 'Memory data has been downloaded',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'session': return 'blue';
      case 'user': return 'green';
      case 'app': return 'purple';
      case 'long_term': return 'orange';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'expired': return 'yellow';
      case 'archived': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <Box h="700px" w="100%">
      <VStack spacing={4} align="stretch" h="100%">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <FiDatabase />
            <Text fontSize="lg" fontWeight="bold">
              Memory Inspector - {agentName}
            </Text>
          </HStack>
          <HStack>
            <Button size="sm" leftIcon={<FiPlus />} onClick={onAddOpen} colorScheme="blue">
              Add Memory
            </Button>
            <Button size="sm" leftIcon={<FiDownload />} onClick={exportMemories} variant="outline">
              Export
            </Button>
            <Button size="sm" leftIcon={<FiRefreshCw />} onClick={loadMemories} isLoading={loading}>
              Refresh
            </Button>
          </HStack>
        </HStack>

        {/* Filters */}
        <Card>
          <CardBody>
            <HStack spacing={4} wrap="wrap">
              <Select
                size="sm"
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                w="140px"
              >
                <option value="all">All Types</option>
                <option value="session">Session</option>
                <option value="user">User</option>
                <option value="app">Application</option>
                <option value="long_term">Long Term</option>
              </Select>
              
              <Input
                size="sm"
                placeholder="Search memories..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                w="200px"
              />
              
              <HStack>
                <Text fontSize="sm">Min Importance:</Text>
                <Input
                  size="sm"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.minImportance}
                  onChange={(e) => setFilters(prev => ({ ...prev, minImportance: parseFloat(e.target.value) }))}
                  w="80px"
                />
              </HStack>
            </HStack>
          </CardBody>
        </Card>

        {/* Tabs */}
        <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed" flex={1}>
          <TabList>
            <Tab>Memories ({memories.length})</Tab>
            <Tab>Session States ({sessionStates.length})</Tab>
          </TabList>

          <TabPanels flex={1}>
            {/* Memories Tab */}
            <TabPanel h="100%" p={0} pt={4}>
              <Box overflowY="auto" h="100%">
                {loading ? (
                  <VStack spacing={4} justify="center" h="200px">
                    <Spinner />
                    <Text>Loading memories...</Text>
                  </VStack>
                ) : memories.length === 0 ? (
                  <Alert status="info">
                    <AlertIcon />
                    <AlertTitle>No memories found</AlertTitle>
                    <AlertDescription>
                      No memories match the current filters or this agent has no stored memories.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {memories.map((memory) => (
                      <Card key={memory.id} variant="outline">
                        <CardBody>
                          <VStack spacing={3} align="stretch">
                            <HStack justify="space-between">
                              <HStack>
                                <Badge colorScheme={getTypeColor(memory.type)} size="sm">
                                  {memory.type}
                                </Badge>
                                <Text fontWeight="semibold">{memory.key}</Text>
                                {memory.tags && memory.tags.map(tag => (
                                  <Badge key={tag} variant="subtle" size="sm">
                                    {tag}
                                  </Badge>
                                ))}
                              </HStack>
                              <HStack>
                                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                  Importance: {Math.round(memory.importance * 100)}%
                                </Text>
                                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                  Access: {memory.access_count}
                                </Text>
                                <Menu>
                                  <MenuButton as={IconButton} size="sm" variant="ghost">
                                    <FiSettings />
                                  </MenuButton>
                                  <MenuList>
                                    <MenuItem 
                                      icon={<FiEye />}
                                      onClick={() => setSelectedMemory(memory)}
                                    >
                                      View Details
                                    </MenuItem>
                                    <MenuItem 
                                      icon={<FiEdit3 />}
                                      onClick={() => {
                                        setSelectedMemory(memory);
                                        onEditOpen();
                                      }}
                                    >
                                      Edit
                                    </MenuItem>
                                    <MenuItem 
                                      icon={<FiTrash2 />}
                                      onClick={() => deleteMemory(memory.id)}
                                      color="red.500"
                                    >
                                      Delete
                                    </MenuItem>
                                  </MenuList>
                                </Menu>
                              </HStack>
                            </HStack>
                            
                            <Progress
                              value={memory.importance * 100}
                              colorScheme={getTypeColor(memory.type)}
                              size="sm"
                            />
                            
                            <Box>
                              <Text fontSize="sm" color={useSemanticToken('text.secondary')} mb={2}>
                                {memory.context}
                              </Text>
                              <Code p={2} borderRadius="md" fontSize="sm" display="block" whiteSpace="pre-wrap">
                                {JSON.stringify(memory.value, null, 2)}
                              </Code>
                            </Box>
                            
                            <HStack justify="space-between" fontSize="xs" color={useSemanticToken('text.secondary')}>
                              <HStack>
                                <FiClock />
                                <Text>Created: {new Date(memory.created_at).toLocaleString()}</Text>
                              </HStack>
                              <Text>Updated: {new Date(memory.updated_at).toLocaleString()}</Text>
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                )}
              </Box>
            </TabPanel>

            {/* Session States Tab */}
            <TabPanel h="100%" p={0} pt={4}>
              <Box overflowY="auto" h="100%">
                {sessionStates.length === 0 ? (
                  <Alert status="info">
                    <AlertIcon />
                    <AlertTitle>No session states</AlertTitle>
                    <AlertDescription>
                      No active or recent session states found for this agent.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {sessionStates.map((state) => (
                      <Card key={state.session_id} variant="outline">
                        <CardBody>
                          <VStack spacing={3} align="stretch">
                            <HStack justify="space-between">
                              <HStack>
                                <FiDatabase />
                                <Text fontWeight="semibold">{state.session_id}</Text>
                                <Badge colorScheme={getStatusColor(state.status)} size="sm">
                                  {state.status}
                                </Badge>
                              </HStack>
                              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                User: {state.user_id}
                              </Text>
                            </HStack>
                            
                            <Code p={2} borderRadius="md" fontSize="sm" display="block" whiteSpace="pre-wrap">
                              {JSON.stringify(state.state, null, 2)}
                            </Code>
                            
                            <HStack justify="space-between" fontSize="xs" color={useSemanticToken('text.secondary')}>
                              <Text>Created: {new Date(state.created_at).toLocaleString()}</Text>
                              <Text>Updated: {new Date(state.updated_at).toLocaleString()}</Text>
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                )}
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Add Memory Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Memory</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <HStack>
                <Text w="100px">Key:</Text>
                <Input
                  value={newMemory.key}
                  onChange={(e) => setNewMemory(prev => ({ ...prev, key: e.target.value }))}
                  placeholder="memory_key"
                />
              </HStack>
              
              <HStack align="start">
                <Text w="100px" mt={2}>Value:</Text>
                <Textarea
                  value={newMemory.value}
                  onChange={(e) => setNewMemory(prev => ({ ...prev, value: e.target.value }))}
                  placeholder='{"key": "value"}'
                  rows={6}
                />
              </HStack>
              
              <HStack>
                <Text w="100px">Type:</Text>
                <Select
                  value={newMemory.type}
                  onChange={(e) => setNewMemory(prev => ({ ...prev, type: e.target.value as any }))}
                >
                  <option value="session">Session</option>
                  <option value="user">User</option>
                  <option value="app">Application</option>
                  <option value="long_term">Long Term</option>
                </Select>
              </HStack>
              
              <HStack>
                <Text w="100px">Importance:</Text>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={newMemory.importance}
                  onChange={(e) => setNewMemory(prev => ({ ...prev, importance: parseFloat(e.target.value) }))}
                />
              </HStack>
              
              <HStack>
                <Text w="100px">Tags:</Text>
                <Input
                  value={newMemory.tags}
                  onChange={(e) => setNewMemory(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="tag1, tag2, tag3"
                />
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={addMemory}>
              Add Memory
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AgentMemoryInspector;
