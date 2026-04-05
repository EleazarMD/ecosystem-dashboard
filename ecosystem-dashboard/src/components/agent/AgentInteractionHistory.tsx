/**
 * Agent Interaction History Component
 * 
 * Tracks and displays user interactions with the Knowledge Graph Agent
 * including favorites, recent commands, and interaction analytics.
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Badge,
  Input,
  Select,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Flex,
  Icon,
  Divider
} from '@chakra-ui/react';
import {
  FaHistory,
  FaStar,
  FaRegStar,
  FaPlay,
  FaTrash,
  FaFilter,
  FaSearch,
  FaEllipsisV,
  FaClock,
  FaCheck,
  FaTimes,
  FaChartLine
} from 'react-icons/fa';

interface AgentInteraction {
  id: string;
  timestamp: string;
  command: string;
  parameters: Record<string, any>;
  context: {
    pageType: string;
    section: string;
    entityType?: string;
    entityId?: string;
  };
  status: 'completed' | 'failed' | 'in_progress';
  duration?: number;
  results?: any;
  error?: string;
  isFavorite: boolean;
  tags: string[];
}

interface AgentInteractionHistoryProps {
  onReplayInteraction?: (interaction: AgentInteraction) => void;
  onCreateFavorite?: (interaction: AgentInteraction) => void;
}

export const AgentInteractionHistory: React.FC<AgentInteractionHistoryProps> = ({
  onReplayInteraction,
  onCreateFavorite
}) => {
  const [interactions, setInteractions] = useState<AgentInteraction[]>([]);
  const [filteredInteractions, setFilteredInteractions] = useState<AgentInteraction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState(0);
  const toast = useToast();

  // Mock data - in real implementation, this would come from API
  useEffect(() => {
    const mockInteractions: AgentInteraction[] = [
      {
        id: 'int-001',
        timestamp: '2025-08-23T14:30:00Z',
        command: 'analyzeRootCause',
        parameters: { serviceName: 'kg-api', severity: 'high' },
        context: { pageType: 'services', section: 'monitoring', entityType: 'service', entityId: 'kg-api' },
        status: 'completed',
        duration: 12000,
        results: { analysisId: 'rca-123', findings: ['Port conflict', 'Memory leak'] },
        isFavorite: true,
        tags: ['rca', 'kg-api', 'critical']
      },
      {
        id: 'int-002',
        timestamp: '2025-08-23T14:25:00Z',
        command: 'checkPortCompliance',
        parameters: { scope: 'all' },
        context: { pageType: 'system', section: 'configuration' },
        status: 'completed',
        duration: 8000,
        results: { compliant: true, checkedPorts: 12 },
        isFavorite: false,
        tags: ['compliance', 'ports']
      },
      {
        id: 'int-003',
        timestamp: '2025-08-23T14:20:00Z',
        command: 'validateMemoryConsistency',
        parameters: { scope: 'architectural' },
        context: { pageType: 'memory', section: 'governance' },
        status: 'failed',
        duration: 5000,
        error: 'Backend service unavailable',
        isFavorite: false,
        tags: ['memory', 'validation']
      }
    ];
    setInteractions(mockInteractions);
    setFilteredInteractions(mockInteractions);
  }, []);

  // Filter interactions based on search and filters
  useEffect(() => {
    let filtered = interactions;

    if (searchTerm) {
      filtered = filtered.filter(interaction =>
        interaction.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interaction.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(interaction => interaction.status === statusFilter);
    }

    if (timeFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (timeFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(interaction => 
        new Date(interaction.timestamp) >= filterDate
      );
    }

    setFilteredInteractions(filtered);
  }, [interactions, searchTerm, statusFilter, timeFilter]);

  const toggleFavorite = (interactionId: string) => {
    setInteractions(prev => prev.map(interaction =>
      interaction.id === interactionId
        ? { ...interaction, isFavorite: !interaction.isFavorite }
        : interaction
    ));
    
    toast({
      title: 'Favorite updated',
      status: 'success',
      duration: 2000
    });
  };

  const deleteInteraction = (interactionId: string) => {
    setInteractions(prev => prev.filter(interaction => interaction.id !== interactionId));
    toast({
      title: 'Interaction deleted',
      status: 'info',
      duration: 2000
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return FaCheck;
      case 'failed': return FaTimes;
      case 'in_progress': return FaClock;
      default: return FaClock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'in_progress': return 'blue';
      default: return 'gray';
    }
  };

  const favoriteInteractions = filteredInteractions.filter(i => i.isFavorite);
  const recentInteractions = filteredInteractions.slice(0, 10);

  const renderInteractionTable = (interactionList: AgentInteraction[]) => (
    <Table variant="simple" size="sm">
      <Thead>
        <Tr>
          <Th>Command</Th>
          <Th>Context</Th>
          <Th>Status</Th>
          <Th>Duration</Th>
          <Th>Time</Th>
          <Th>Actions</Th>
        </Tr>
      </Thead>
      <Tbody>
        {interactionList.map(interaction => {
          const StatusIcon = getStatusIcon(interaction.status);
          const statusColor = getStatusColor(interaction.status);
          
          return (
            <Tr key={interaction.id}>
              <Td>
                <VStack align="start" spacing={1}>
                  <Text fontWeight="medium">{interaction.command}</Text>
                  <HStack wrap="wrap" spacing={1}>
                    {interaction.tags.map(tag => (
                      <Badge key={tag} size="sm" variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </HStack>
                </VStack>
              </Td>
              <Td>
                <Text fontSize="sm">
                  {interaction.context.pageType}
                  {interaction.context.section && `:${interaction.context.section}`}
                </Text>
                {interaction.context.entityId && (
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    {interaction.context.entityType}: {interaction.context.entityId}
                  </Text>
                )}
              </Td>
              <Td>
                <HStack>
                  <Icon as={StatusIcon} color={`${statusColor}.500`} />
                  <Badge colorScheme={statusColor} size="sm">
                    {interaction.status}
                  </Badge>
                </HStack>
              </Td>
              <Td>
                {interaction.duration ? formatDuration(interaction.duration) : '-'}
              </Td>
              <Td>
                <Tooltip label={new Date(interaction.timestamp).toLocaleString()}>
                  <Text fontSize="sm">{formatTimestamp(interaction.timestamp)}</Text>
                </Tooltip>
              </Td>
              <Td>
                <HStack spacing={1}>
                  <Tooltip label={interaction.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                    <IconButton
                      size="xs"
                      aria-label="Toggle favorite"
                      icon={interaction.isFavorite ? <FaStar /> : <FaRegStar />}
                      onClick={() => toggleFavorite(interaction.id)}
                      colorScheme={interaction.isFavorite ? 'yellow' : 'gray'}
                      variant="ghost"
                    />
                  </Tooltip>
                  
                  <Tooltip label="Replay interaction">
                    <IconButton
                      size="xs"
                      aria-label="Replay"
                      icon={<FaPlay />}
                      onClick={() => onReplayInteraction?.(interaction)}
                      colorScheme="blue"
                      variant="ghost"
                    />
                  </Tooltip>
                  
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      size="xs"
                      aria-label="More options"
                      icon={<FaEllipsisV />}
                      variant="ghost"
                    />
                    <MenuList>
                      <MenuItem icon={<FaTrash />} onClick={() => deleteInteraction(interaction.id)}>
                        Delete
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </HStack>
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Icon as={FaHistory} />
            <Text fontSize="lg" fontWeight="bold">Agent Interaction History</Text>
            <Badge colorScheme="blue">{interactions.length} total</Badge>
          </HStack>
        </HStack>

        {/* Filters */}
        <HStack spacing={4} wrap="wrap">
          <HStack>
            <Icon as={FaSearch} />
            <Input
              placeholder="Search interactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="sm"
              maxW="200px"
            />
          </HStack>
          
          <HStack>
            <Icon as={FaFilter} />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="sm" maxW="150px">
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="in_progress">In Progress</option>
            </Select>
          </HStack>
          
          <Select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} size="sm" maxW="150px">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </Select>
        </HStack>

        {/* Tabs */}
        <Tabs index={selectedTab} onChange={setSelectedTab}>
          <TabList>
            <Tab>
              <HStack>
                <Icon as={FaHistory} />
                <Text>Recent ({recentInteractions.length})</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack>
                <Icon as={FaStar} />
                <Text>Favorites ({favoriteInteractions.length})</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack>
                <Icon as={FaChartLine} />
                <Text>Analytics</Text>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              {recentInteractions.length > 0 ? (
                renderInteractionTable(recentInteractions)
              ) : (
                <Box textAlign="center" py={8}>
                  <Icon as={FaHistory} size="2xl" color={useSemanticToken('text.tertiary')} mb={2} />
                  <Text color={useSemanticToken('text.secondary')}>No recent interactions found</Text>
                </Box>
              )}
            </TabPanel>
            
            <TabPanel px={0}>
              {favoriteInteractions.length > 0 ? (
                renderInteractionTable(favoriteInteractions)
              ) : (
                <Box textAlign="center" py={8}>
                  <Icon as={FaStar} size="2xl" color={useSemanticToken('text.tertiary')} mb={2} />
                  <Text color={useSemanticToken('text.secondary')}>No favorite interactions yet</Text>
                  <Text fontSize="sm" color={useSemanticToken('text.tertiary')} mt={2}>
                    Star interactions to save them as favorites
                  </Text>
                </Box>
              )}
            </TabPanel>
            
            <TabPanel px={0}>
              <VStack spacing={6} align="stretch">
                <HStack spacing={8}>
                  <Box textAlign="center">
                    <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                      {interactions.length}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Total Interactions</Text>
                  </Box>
                  
                  <Box textAlign="center">
                    <Text fontSize="2xl" fontWeight="bold" color="green.500">
                      {interactions.filter(i => i.status === 'completed').length}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Completed</Text>
                  </Box>
                  
                  <Box textAlign="center">
                    <Text fontSize="2xl" fontWeight="bold" color="red.500">
                      {interactions.filter(i => i.status === 'failed').length}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Failed</Text>
                  </Box>
                  
                  <Box textAlign="center">
                    <Text fontSize="2xl" fontWeight="bold" color="yellow.500">
                      {favoriteInteractions.length}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Favorites</Text>
                  </Box>
                </HStack>
                
                <Divider />
                
                <Text fontWeight="bold">Most Used Commands:</Text>
                <VStack spacing={2} align="stretch">
                  {Object.entries(
                    interactions.reduce((acc, interaction) => {
                      acc[interaction.command] = (acc[interaction.command] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([command, count]) => (
                      <HStack key={command} justify="space-between">
                        <Text>{command}</Text>
                        <Badge colorScheme="blue">{count} times</Badge>
                      </HStack>
                    ))}
                </VStack>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
};
