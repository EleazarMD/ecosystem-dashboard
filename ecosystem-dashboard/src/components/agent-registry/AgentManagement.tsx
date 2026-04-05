import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  Heading,
  SimpleGrid,
  Spinner,
  Divider,
  Input,
  InputGroup,
  InputLeftElement,
  Tag,
  List,
  ListItem,
  Collapse,
  Badge,
  Tooltip,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
  Select,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  HStack,
  VStack,
  Text,
  Flex
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon, InfoIcon, RepeatIcon, SettingsIcon, SearchIcon } from '@chakra-ui/icons';
import useSWR from 'swr';
import { fetcher } from '../../lib/fetcher';
import { useAgentRegistry } from '../../context/AgentRegistryContext';
import { AgentRegistryEventType } from '../../lib/agent-registry-client';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Define the Agent interface
interface Agent {
  id: string;
  name: string;
  description: string;
  version: string;
  type: string;
  status: string;
  platform: string;
  lastHeartbeat: string;
  registrationTime: string;
  capabilities: number;
  endpoints: number;
}

// Define status and type options for filtering
const statusOptions: string[] = ['online', 'offline', 'error', 'maintenance'];
const typeOptions: string[] = ['core', 'utility', 'integration', 'custom'];

// Define column headings
interface HeadCell {
  id: keyof Agent;
  label: string;
  numeric: boolean;
  sortable: boolean;
}

const headCells: HeadCell[] = [
  { id: 'name', label: 'Name', numeric: false, sortable: true },
  { id: 'type', label: 'Type', numeric: false, sortable: true },
  { id: 'status', label: 'Status', numeric: false, sortable: true },
  { id: 'platform', label: 'Platform', numeric: false, sortable: true },
  { id: 'version', label: 'Version', numeric: false, sortable: true },
  { id: 'capabilities', label: 'Capabilities', numeric: true, sortable: true },
  { id: 'endpoints', label: 'Endpoints', numeric: true, sortable: true },
  { id: 'lastHeartbeat', label: 'Last Heartbeat', numeric: false, sortable: true },
];

// Define sort order type
type Order = 'asc' | 'desc';

/**
 * Agent Management Component
 * 
 * Displays a table of all registered agents with:
 * - Sorting by column
 * - Filtering by name, type, status
 * - Pagination
 * - Real-time updates using the AHIS client
 */
const AgentManagement: React.FC = () => {
  // Get the Agent Registry client from context
  const { client, isConnected, lastEvent } = useAgentRegistry();
  
  // State for sorting
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof Agent>('lastHeartbeat');
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // State for filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // State for search and expanded items
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [localAgentsData, setLocalAgentsData] = useState<any>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  // Fetch agents data from the dashboard API
  const { data, error, isLoading, mutate } = useSWR('/api/proxy/agent-registry/dashboard/agents', fetcher, {
    refreshInterval: 60000, // Refresh every minute as a fallback
  });
  
  // Update local data when API data changes
  useEffect(() => {
    if (data?.success && data?.data) {
      setLocalAgentsData(data.data);
      setLastUpdateTime(new Date());
    }
  }, [data]);
  
  // Subscribe to real-time updates
  useEffect(() => {
    if (!client || !isConnected) return;
    
    // Define event types that should trigger a refresh
    const refreshEvents = [
      AgentRegistryEventType.AGENT_REGISTERED,
      AgentRegistryEventType.AGENT_UPDATED,
      AgentRegistryEventType.AGENT_REMOVED,
      AgentRegistryEventType.PLATFORM_UPDATED,
      AgentRegistryEventType.PLATFORM_REMOVED
    ];
    
    // Subscribe to events
    const unsubscribers = refreshEvents.map(eventType =>
      client.subscribe(eventType, () => {
        // Refresh data when an event occurs
        mutate();
        setLastUpdateTime(new Date());
      })
    );
    
    // Cleanup subscriptions
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [client, isConnected, mutate]);
  
  // Try to get data from AHIS client if API fails
  useEffect(() => {
    if (error && client && isConnected) {
      client.getAgents()
        .then(agentsData => {
          if (agentsData) {
            setLocalAgentsData({ agents: agentsData });
            setLastUpdateTime(new Date());
          }
        })
        .catch(err => console.error('Failed to get agents data from AHIS client:', err));
    }
  }, [error, client, isConnected]);
  
  // Handle sort request
  const handleRequestSort = (property: keyof Agent) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Handle search query change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value as string);
    setPage(0);
  };
  
  // Handle type filter change
  const handleTypeFilterChange = (event: any) => {
    setTypeFilter(event.target.value as string);
    setPage(0);
  };
  
  // Handle agent expansion toggle
  const handleToggleExpand = (agentId: string) => {
    setExpandedAgent(expandedAgent === agentId ? null : agentId);
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    mutate();
  };
  
  // Function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
    }
  };
  
  // Function to get status color scheme for Chakra UI
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'online':
      case 'running':
        return 'green';
      case 'inactive':
      case 'offline':
      case 'stopped':
        return 'red';
      case 'standby':
      case 'idle':
        return 'yellow';
      case 'maintenance':
        return 'purple';
      case 'error':
        return 'orange';
      default:
        return 'gray';
    }
  };
  
  // Filter and sort agents
  const getFilteredAgents = () => {
    const agents = localAgentsData?.agents || [];
    
    // Apply search query filter
    let filteredResults = agents.filter((agent: any) => 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filteredResults = filteredResults.filter((agent: Agent) => 
        agent.status === statusFilter
      );
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filteredResults = filteredResults.filter((agent: Agent) => 
        agent.type === typeFilter
      );
    }
    
    // Apply sorting
    filteredResults.sort((a: Agent, b: Agent) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return order === 'asc'
        ? (aValue < bValue ? -1 : 1)
        : (bValue < aValue ? -1 : 1);
    });
    
    return filteredResults;
  };
  
  // Get paginated agents
  const getPaginatedAgents = () => {
    const filteredAgents = getFilteredAgents();
    return filteredAgents.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  };
  
  if (isLoading && !localAgentsData) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Spinner size="xl" />
      </Box>
    );
  }
  
  if ((error || !data?.success) && !localAgentsData) {
    return (
      <Box p={2}>
        <Alert status="error">
          <AlertIcon />
          Error loading agents: {error?.message || data?.error?.message || 'Unknown error'}
        </Alert>
      </Box>
    );
  }
  
  const filteredAgents = getFilteredAgents();
  const paginatedAgents = getPaginatedAgents();
  
  return (
    <Box mb={3}>
      <Card variant="outline">
        <CardBody>
          <Flex justifyContent="space-between" alignItems="center" mb={2}>
            <Heading as="h2" size="md">
              Agent Management
            </Heading>
            <HStack spacing={2}>
              {isConnected && (
                <Tag 
                  size="sm" 
                  colorScheme="green" 
                  variant="outline" 
                >
                  Real-time updates active
                </Tag>
              )}
              {lastEvent && lastEvent.type.includes('AGENT') && (
                <Tag 
                  size="sm" 
                  colorScheme="blue" 
                  variant="outline" 
                >
                  Agent update: {new Date(lastEvent.timestamp).toLocaleTimeString()}
                </Tag>
              )}
            </HStack>
            <Tooltip label="Refresh">
              <IconButton
                aria-label="Refresh data"
                icon={<RepeatIcon />}
                onClick={handleRefresh}
                size="sm"
              />
            </Tooltip>
          </Flex>
          
          <Divider mb={2} />
          
          {/* Filters */}
          <Flex flexWrap="wrap" gap={2} mb={2}>
            <InputGroup size="md" flexGrow={1} minW="200px">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color={useSemanticToken('text.tertiary')} />
              </InputLeftElement>
              <Input
                placeholder="Search Agents"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </InputGroup>
            
            <FormControl minW="150px">
              <FormLabel htmlFor="status-filter" fontSize="sm" mb={1}>Status</FormLabel>
              <Select
                id="status-filter"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                size="md"
              >
                <option value="all">All Statuses</option>
                {statusOptions.map((status: string) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>
            </FormControl>
            
            <FormControl minW="150px">
              <FormLabel htmlFor="type-filter" fontSize="sm" mb={1}>Type</FormLabel>
              <Select
                id="type-filter"
                value={typeFilter}
                onChange={handleTypeFilterChange}
                size="md"
              >
                <option value="all">All Types</option>
                {typeOptions.map((type: string) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </FormControl>
          </Flex>
          
          {/* Agents Table */}
          <TableContainer borderWidth="1px" borderRadius="md">
            <Table size="md" variant="simple">
              <Thead>
                <Tr>
                  {headCells.map((headCell) => (
                    <Th
                      key={headCell.id}
                      textAlign={headCell.numeric ? 'right' : 'left'}
                      cursor={headCell.sortable ? 'pointer' : 'default'}
                      onClick={headCell.sortable ? () => handleRequestSort(headCell.id) : undefined}
                    >
                      <HStack spacing={1}>
                        <Text>{headCell.label}</Text>
                        {headCell.sortable && orderBy === headCell.id && (
                          <Box>
                            {order === 'asc' ? '↑' : '↓'}
                          </Box>
                        )}
                      </HStack>
                    </Th>
                  ))}
                  <Th textAlign="center">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {paginatedAgents.map((agent: Agent) => (
                  <Tr key={agent.id}>
                    <Td>{agent.name}</Td>
                    <Td>{agent.type}</Td>
                    <Td>
                      <Tag 
                        size="sm" 
                        colorScheme={getStatusColor(agent.status)}
                      >
                        {agent.status}
                      </Tag>
                    </Td>
                    <Td>{agent.platform}</Td>
                    <Td>{agent.version}</Td>
                    <Td isNumeric>
                      {agent.capabilities && typeof agent.capabilities === 'object'
                        ? Array.isArray(agent.capabilities)
                          ? agent.capabilities.length
                          : Object.keys(agent.capabilities).length
                        : 0}
                    </Td>
                    <Td isNumeric>
                      {agent.endpoints && typeof agent.endpoints === 'object'
                        ? Array.isArray(agent.endpoints)
                          ? agent.endpoints.length
                          : Object.keys(agent.endpoints).length
                        : 0}
                    </Td>
                    <Td>{formatDate(agent.lastHeartbeat)}</Td>
                    <Td textAlign="center">
                      <Tooltip label="More options">
                        <IconButton
                          aria-label="More options"
                          icon={<SettingsIcon />}
                          size="sm"
                          variant="ghost"
                        />
                      </Tooltip>
                    </Td>
                  </Tr>
                ))}
                {paginatedAgents.length === 0 && (
                  <Tr>
                    <Td colSpan={9} textAlign="center">
                      No agents found matching the current filters
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          <Flex justifyContent="flex-end" mt={4}>
            <HStack spacing={2} alignItems="center">
              <Text fontSize="sm">Rows per page:</Text>
              <Select
                value={rowsPerPage.toString()}
                onChange={(e) => handleChangeRowsPerPage({
                  target: { value: e.target.value }
                } as React.ChangeEvent<HTMLInputElement>)}
                size="sm"
                width="70px"
              >
                {[5, 10, 25, 50].map((option) => (
                  <option key={option} value={option.toString()}>
                    {option}
                  </option>
                ))}
              </Select>
              
              <Text fontSize="sm">
                {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, filteredAgents.length)} of {filteredAgents.length}
              </Text>
              
              <HStack spacing={1}>
                <IconButton
                  aria-label="Previous page"
                  icon={<ChevronUpIcon transform="rotate(-90deg)" />}
                  size="sm"
                  isDisabled={page === 0}
                  onClick={(e) => handleChangePage(e, page - 1)}
                />
                <IconButton
                  aria-label="Next page"
                  icon={<ChevronDownIcon transform="rotate(-90deg)" />}
                  size="sm"
                  isDisabled={page >= Math.ceil(filteredAgents.length / rowsPerPage) - 1}
                  onClick={(e) => handleChangePage(e, page + 1)}
                />
              </HStack>
            </HStack>
          </Flex>
        </CardBody>
      </Card>
    </Box>
  );
};

export default AgentManagement;
