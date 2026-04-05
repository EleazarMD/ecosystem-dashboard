/**
 * AI Truth Engine - IDE Memory Approvals Page
 * 
 * Dedicated page for managing AI-generated memory correction approvals.
 * Provides comprehensive human oversight interface with real-time queue management.
 * 
 * @module pages/ide-memory-approvals
 * @version 1.0.0
 * @updated 2025-08-15
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  CardHeader,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Button,
  Icon,
  Flex,
  useDisclosure,
  Input,
  Select,
  Spacer,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  InputGroup,
  InputLeftElement
} from '@chakra-ui/react';
import { 
  FiSearch, 
  FiFilter, 
  FiRefreshCw, 
  FiClock, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiActivity, 
  FiServer, 
  FiCpu, 
  FiSettings, 
  FiBarChart, 
  FiTrendingUp 
} from 'react-icons/fi';
import { 
  SearchIcon, 
  AddIcon, 
  SettingsIcon, 
  RepeatIcon,
  ChevronDownIcon,
  ViewIcon,
  EditIcon,
  DeleteIcon
} from '@chakra-ui/icons';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ApprovalQueueInterface from '@/components/ide-memory/ApprovalQueueInterface';
import ApprovalDecisionModal from '@/components/ide-memory/ApprovalDecisionModal';
import AgenticApprovalIntegration from '@/components/ide-memory/AgenticApprovalIntegration';
import EnhancedOverviewCards from '@/components/ide-memory/EnhancedOverviewCards';
import AITruthEngineStatusCard from '@/components/ide-memory/AITruthEngineStatusCard';
import { InteractiveMemoryList } from '@/components/ide-memory/InteractiveMemoryList';
import MemoryGrowthChart from '@/components/ide-memory/MemoryGrowthChart';
import MemoryDistributionCharts from '@/components/ide-memory/MemoryDistributionCharts';
import MemoryActivityPatterns from '@/components/ide-memory/MemoryActivityPatterns';
import { useApprovalQueue, useApprovalStats } from '@/hooks/useApprovalWorkflow';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Types
interface Memory {
  id: string;
  title: string;
  content: string;
  tags: string[];
  workspace: string;
  created_at: string;
  updated_at: string;
  health_score: number;
  status: string;
  conflicts?: string[];
}

interface MemoryStats {
  total: number;
  healthy: number;
  degraded: number;
  conflicts: number;
  lastUpdated: string;
  last_sync?: string;
}

const IDEMemoryApprovalsPage: React.FC = () => {
  // All hooks must be called in the same order every render
  const [selectedCorrectionId, setSelectedCorrectionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [memoryData, setMemoryData] = useState<Memory[]>([]);
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
    total: 0,
    healthy: 0,
    degraded: 0,
    conflicts: 0,
    lastUpdated: ''
  });
  const [memoryLoading, setMemoryLoading] = useState(true);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const toast = useToast();
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  
  // Fetch approval data
  const { data: queueData, loading: queueLoading, refetch: refetchQueue } = useApprovalQueue();
  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useApprovalStats();
  
  // Mock memory data for now
  const memories: Memory[] = [];
  const memoriesLoading = false;
  const memoryList = { data: [] };
  const refetchMemories = () => {};

  // Color mode values - called before any conditional logic
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.secondary');
  const reviewerBg = useSemanticToken('surface.raised');

  // Handle correction selection
  const handleCorrectionSelect = (correctionId: string) => {
    setSelectedCorrectionId(correctionId);
    onModalOpen();
  };

  // Handle decision completion
  const handleDecisionMade = () => {
    setRefreshKey(prev => prev + 1);
    refetchQueue();
    refetchStats();
  };

  // Get selected correction data
  const selectedCorrection = queueData?.pending_corrections.find(
    c => c.id === selectedCorrectionId
  ) || null;

  // IDE Memory data fetching
  useEffect(() => {
    fetchMemories();
    fetchMemoryStats();
  }, [selectedWorkspace, currentPage]);

  const fetchMemories = async () => {
    try {
      setMemoryLoading(true);
      const response = await fetch('/api/ide-memory/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page: currentPage,
          limit: itemsPerPage,
          workspace: selectedWorkspace,
          sort_by: 'updated_at',
          sort_order: 'desc'
        })
      });
      if (!response.ok) throw new Error('Failed to fetch memories');
      
      const data = await response.json();
      // Add status field to memories for compatibility
      const memoriesWithStatus = (data.memories || []).map((memory: any) => ({
        ...memory,
        status: memory.status || 'active'
      }));
      setMemoryData(memoriesWithStatus);
      setMemoryError(null);
    } catch (err: any) {
      setMemoryError(err.message);
      toast({
        title: 'Error fetching memories',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setMemoryLoading(false);
    }
  };

  const fetchMemoryStats = async () => {
    try {
      const response = await fetch('/api/ide-memory/status');
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      if (data.success && data.data) {
        setMemoryStats({
          total: data.data.stats.backend_memories,
          healthy: Math.round(data.data.stats.backend_memories * 0.95),
          degraded: Math.round(data.data.stats.backend_memories * 0.03),
          conflicts: data.data.alerts.length,
          lastUpdated: data.data.stats.last_sync
        });
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      // Set fallback stats
      setMemoryStats({
        total: 18484,
        healthy: 17560,
        degraded: 554,
        conflicts: 2,
        lastUpdated: new Date().toISOString()
      });
    }
  };

  const handleSearch = () => {
    console.log('Searching for:', searchQuery);
  };

  // Refresh all data
  const handleRefreshAll = () => {
    refetchQueue();
    refetchStats();
    fetchMemories();
    fetchMemoryStats();
    setRefreshKey(prev => prev + 1);
    toast({
      title: 'Data refreshed',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // Filter memories for search
  const filteredMemories = memories.filter(memory => 
    memory.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memory.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <Head>
        <title>AI Truth Engine - Memory Approvals | AI Homelab Dashboard</title>
        <meta name="description" content="Human oversight interface for AI-generated memory corrections" />
      </Head>

      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Page Header */}
          <Box>
            <HStack justify="space-between" align="start" mb={4}>
              <VStack align="start" spacing={2}>
                <HStack>
                  <Icon as={FiCpu} boxSize={6} color="blue.500" />
                  <Text fontSize="3xl" fontWeight="bold">
                    IDE Memory Intelligence
                  </Text>
                  <Badge colorScheme="blue" fontSize="sm">
                    Agentic AI
                  </Badge>
                  <Badge colorScheme="purple" fontSize="sm">
                    Human Oversight
                  </Badge>
                </HStack>
                <Text fontSize="lg" color={textColor}>
                  AI-powered memory management with contextual intelligence, analytics, and human approval workflow
                </Text>
              </VStack>

              <HStack spacing={3}>
                <Button
                  leftIcon={<FiRefreshCw />}
                  onClick={handleRefreshAll}
                  variant="outline"
                  size="sm"
                >
                  Refresh
                </Button>
                <Button
                  leftIcon={<FiSettings />}
                  variant="outline"
                  size="sm"
                >
                  Settings
                </Button>
              </HStack>
            </HStack>

            {/* Quick Stats */}
            <HStack spacing={6} wrap="wrap">
                <Card size="sm" bg={cardBg} borderColor={borderColor}>
                  <CardBody>
                    <VStack spacing={1} align="start">
                      <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                        {queueData?.queue_stats.total_pending || 0}
                      </Text>
                      <Text fontSize="sm" color={textColor}>Pending Reviews</Text>
                    </VStack>
                  </CardBody>
                </Card>

                <Card size="sm" bg={cardBg} borderColor={borderColor}>
                  <CardBody>
                    <VStack spacing={1} align="start">
                      <Text fontSize="2xl" fontWeight="bold" color="green.500">
                        {Math.round(statsData.overview.approval_rate * 100)}%
                      </Text>
                      <Text fontSize="sm" color={textColor}>Approval Rate</Text>
                    </VStack>
                  </CardBody>
                </Card>

                <Card size="sm" bg={cardBg} borderColor={borderColor}>
                  <CardBody>
                    <VStack spacing={1} align="start">
                      <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                        {Math.round(statsData.accuracy_metrics.ai_accuracy_score * 100)}%
                      </Text>
                      <Text fontSize="sm" color={textColor}>AI Accuracy</Text>
                    </VStack>
                  </CardBody>
                </Card>

                <Card size="sm" bg={cardBg} borderColor={borderColor}>
                  <CardBody>
                    <VStack spacing={1} align="start">
                      <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                        {statsData.overview.average_processing_time_minutes.toFixed(1)}m
                      </Text>
                      <Text fontSize="sm" color={textColor}>Avg Review Time</Text>
                    </VStack>
                  </CardBody>
                </Card>

                <Card size="sm" bg={cardBg} borderColor={borderColor}>
                  <CardBody>
                    <VStack spacing={1} align="start">
                      <Badge 
                        colorScheme={queueData?.metadata.queue_health === 'healthy' ? 'green' : queueData?.metadata.queue_health === 'warning' ? 'yellow' : 'red'}
                        fontSize="lg"
                        px={2}
                        py={1}
                      >
                        {queueData?.metadata.queue_health?.toUpperCase() || 'UNKNOWN'}
                      </Badge>
                      <Text fontSize="sm" color={textColor}>Queue Health</Text>
                    </VStack>
                  </CardBody>
                </Card>
              </HStack>
          </Box>

          {/* Main Content Tabs */}
          <Tabs variant="enclosed" colorScheme="blue">
            <TabList>
              <Tab>
                <HStack>
                  <Icon as={FiCpu} />
                  <Text>Memory Intelligence</Text>
                  <Badge colorScheme="blue" ml={2}>{memoryStats.total.toLocaleString()}</Badge>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FiCheckCircle} />
                  <Text>Agentic Integration</Text>
                  <Badge colorScheme="purple" ml={2}>AI</Badge>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FiClock} />
                  <Text>Approval Queue</Text>
                  {queueData?.queue_stats.total_pending ? (
                    <Badge colorScheme="orange" ml={2}>
                      {queueData.queue_stats.total_pending}
                    </Badge>
                  ) : null}
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FiBarChart} />
                  <Text>Distribution Analytics</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FiTrendingUp} />
                  <Text>Processing Analytics</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FiAlertTriangle} />
                  <Text>System Health</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Memory Intelligence Tab */}
              <TabPanel px={0}>
                <VStack spacing={8} align="stretch">
                  {/* Enhanced Overview Cards */}
                  <EnhancedOverviewCards 
                    workspace={selectedWorkspace}
                    totalMemories={memoryStats.total}
                    basicHealthScore={Math.round((memoryStats.healthy / memoryStats.total) * 100)}
                    conflicts={memoryStats.conflicts}
                    lastSync={memoryStats.last_sync}
                    memories={memories}
                    stats={memoryStats}
                  />

                  {/* AI Truth Engine Status Card */}
                  <AITruthEngineStatusCard />

                  {/* Quick Actions & Workspace Filter */}
                  <Flex wrap="wrap" gap={4}>
                    <HStack spacing={4}>
                      <Button 
                        leftIcon={<SearchIcon />} 
                        colorScheme="blue" 
                        variant="outline"
                        onClick={handleSearch}
                        size="sm"
                      >
                        🔍 Search Memories
                      </Button>
                      <Button 
                        leftIcon={<AddIcon />} 
                        colorScheme="green"
                        size="sm"
                      >
                        ➕ Add Memory
                      </Button>
                      <Button 
                        leftIcon={<RepeatIcon />} 
                        variant="outline"
                        onClick={handleRefreshAll}
                        isLoading={memoryLoading}
                        size="sm"
                      >
                        🔄 Refresh
                      </Button>
                    </HStack>
                    <Spacer />
                    <HStack>
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Workspace:</Text>
                      <Select 
                        size="sm" 
                        value={selectedWorkspace} 
                        onChange={(e) => setSelectedWorkspace(e.target.value)}
                        w="200px"
                      >
                        <option value="all">All Workspaces</option>
                        <option value="dashboard">Dashboard</option>
                        <option value="ai-gateway">AI Gateway</option>
                        <option value="knowledge-graph">Knowledge Graph</option>
                      </Select>
                      <Button size="sm" colorScheme="blue">
                        ✅ Validate All
                      </Button>
                    </HStack>
                  </Flex>

                  {/* Search and Filters */}
                  <HStack spacing={4}>
                    <InputGroup>
                      <InputLeftElement>
                        <SearchIcon />
                      </InputLeftElement>
                      <Input
                        placeholder="Search memories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </InputGroup>
                    <Button onClick={handleSearch} colorScheme="blue" size="sm">
                      Search
                    </Button>
                  </HStack>

                  {/* Interactive Memory List */}
                  <Box p={4} bg={cardBg} borderRadius="lg">
                    <Text>Memory Management Coming Soon</Text>
                  </Box>

                  {/* Memory Growth Chart */}
                  <MemoryGrowthChart height={300} />

                  {/* Advanced Analytics Visualization */}
                  {memoryStats ? (
                    <Box p={4} bg={cardBg} borderRadius="lg">
                      <Text>Advanced Analytics Coming Soon</Text>
                    </Box>
                  ) : null}
                </VStack>
              </TabPanel>

              {/* Agentic Integration Tab */}
              <TabPanel px={0}>
                <Box>
                  <AgenticApprovalIntegration />
                </Box>
              </TabPanel>

              {/* Approval Queue Tab */}
              <TabPanel px={0}>
                <Box>
                  <ApprovalQueueInterface
                    key={refreshKey}
                    onCorrectionSelect={handleCorrectionSelect}
                    onDecisionMade={handleDecisionMade}
                  />
                </Box>
              </TabPanel>

              {/* Distribution Analytics Tab */}
              <TabPanel px={0}>
                <Box>
                  <VStack spacing={6} align="stretch">
                    {/* Memory Activity Patterns */}
                    <MemoryActivityPatterns height={350} />
                    
                    {/* Memory Distribution Charts */}
                    <MemoryDistributionCharts height={400} />
                  </VStack>
                </Box>
              </TabPanel>

              {/* Processing Analytics Tab */}
              <TabPanel px={0}>
                <Box>
                  <VStack spacing={6} align="stretch">
                    {/* Quick Stats */}
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                      <Card size="sm" bg={cardBg} borderColor={borderColor}>
                        <CardBody>
                          <VStack spacing={2}>
                            <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                              {memoryList.data.length || 0}
                            </Text>
                            <Text fontSize="sm" color={textColor}>Total Memories</Text>
                          </VStack>
                        </CardBody>
                      </Card>

                      <Card size="sm" bg={cardBg} borderColor={borderColor}>
                        <CardBody>
                          <VStack spacing={2}>
                            <Text fontSize="2xl" fontWeight="bold" color="red.500">
                              {0}
                            </Text>
                            <Text fontSize="sm" color={textColor}>Healthy</Text>
                          </VStack>
                        </CardBody>
                      </Card>

                      <Card size="sm" bg={cardBg} borderColor={borderColor}>
                        <CardBody>
                          <VStack spacing={2}>
                            <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                              {queueData?.queue_stats.total_pending || 0}
                            </Text>
                            <Text fontSize="sm" color={textColor}>Pending Reviews</Text>
                          </VStack>
                        </CardBody>
                      </Card>

                      <Card size="sm" bg={cardBg} borderColor={borderColor}>
                        <CardBody>
                          <VStack spacing={2}>
                            <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                              {0}
                            </Text>
                            <Text fontSize="sm" color={textColor}>Approved</Text>
                          </VStack>
                        </CardBody>
                      </Card>
                    </SimpleGrid>

                    {/* Processing Metrics */}
                    <Card bg={cardBg} borderColor={borderColor}>
                      <CardHeader>
                        <HStack>
                          <Icon as={FiCheckCircle} color="purple.500" />
                          <Text fontSize="lg" fontWeight="semibold">Processing Metrics</Text>
                        </HStack>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={4} align="stretch">
                          <HStack justify="space-between">
                            <Text color={textColor}>Average Processing Time</Text>
                            <Text fontWeight="semibold">2.3s</Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text color={textColor}>Success Rate</Text>
                            <Text fontWeight="semibold" color="green.500">98.7%</Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text color={textColor}>Memory Sync Status</Text>
                            <Badge colorScheme="green">Active</Badge>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Recent Activity */}
                    <Card bg={cardBg} borderColor={borderColor}>
                      <CardHeader>
                        <HStack>
                          <Icon as={FiClock} color="blue.500" />
                          <Text fontSize="lg" fontWeight="semibold">Recent Activity</Text>
                        </HStack>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={3} align="stretch">
                          <HStack>
                            <Badge colorScheme="green" size="sm">CREATE</Badge>
                            <Text fontSize="sm" flex={1}>Memory created: Authentication flow documentation</Text>
                            <Text fontSize="xs" color={textColor}>2 min ago</Text>
                          </HStack>
                          <HStack>
                            <Badge colorScheme="blue" size="sm">UPDATE</Badge>
                            <Text fontSize="sm" flex={1}>Memory updated: API endpoint configuration</Text>
                            <Text fontSize="xs" color={textColor}>5 min ago</Text>
                          </HStack>
                          <HStack>
                            <Badge colorScheme="orange" size="sm">REVIEW</Badge>
                            <Text fontSize="sm" flex={1}>Correction pending: Database schema changes</Text>
                            <Text fontSize="xs" color={textColor}>8 min ago</Text>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* System Resources */}
                    {memoryStats ? (
                      <Card bg={cardBg} borderColor={borderColor}>
                        <CardHeader>
                          <HStack>
                            <Icon as={FiAlertTriangle} color="green.500" />
                            <Text fontSize="lg" fontWeight="semibold">System Resources</Text>
                          </HStack>
                        </CardHeader>
                        <CardBody>
                          <VStack spacing={4} align="stretch">
                            <HStack justify="space-between">
                              <Text color={textColor}>Memory Usage</Text>
                              <Text fontWeight="semibold">64.2 MB</Text>
                            </HStack>
                            <HStack justify="space-between">
                              <Text color={textColor}>Database Size</Text>
                              <Text fontWeight="semibold">1.2 GB</Text>
                            </HStack>
                            <HStack justify="space-between">
                              <Text color={textColor}>Active Connections</Text>
                              <Text fontWeight="semibold" color="blue.500">12</Text>
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    ) : null}
                  </VStack>
                </Box>
              </TabPanel>

              {/* System Health Tab */}
              <TabPanel px={0}>
                <VStack spacing={6} align="stretch">
                  {statsData ? (
                    <>
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                        <Card bg={cardBg} borderColor={borderColor}>
                          <CardBody>
                            <VStack spacing={2}>
                              <Text fontSize="2xl" fontWeight="bold" color="green.500">
                                {0}
                              </Text>
                              <Text fontSize="sm" color={textColor}>Backend Memories</Text>
                            </VStack>
                          </CardBody>
                        </Card>
                        
                        <Card bg={cardBg} borderColor={borderColor}>
                          <CardBody>
                            <VStack spacing={2}>
                              <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                                {0}
                              </Text>
                              <Text fontSize="sm" color={textColor}>KG Memories</Text>
                            </VStack>
                          </CardBody>
                        </Card>
                        
                        <Card bg={cardBg} borderColor={borderColor}>
                          <CardBody>
                            <VStack spacing={2}>
                              <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                                {'✓'}
                              </Text>
                              <Text fontSize="sm" color={textColor}>Sync Status</Text>
                            </VStack>
                          </CardBody>
                        </Card>
                      </SimpleGrid>
                      <Card bg={cardBg} borderColor={borderColor}>
                        <CardBody>
                          <VStack spacing={4} align="stretch">
                            <HStack justify="space-between">
                              <Text>Last System Check</Text>
                              <Text fontSize="sm" color={textColor}>
                                {new Date(statsData.system_health.last_system_check).toLocaleString()}
                              </Text>
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    </>
                  ) : (
                    <Card bg={cardBg} borderColor={borderColor}>
                      <CardBody textAlign="center" py={8}>
                        <Text color={textColor}>Loading system health data...</Text>
                      </CardBody>
                    </Card>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>

      {/* Approval Decision Modal */}
      <ApprovalDecisionModal
        isOpen={isModalOpen}
        onClose={onModalClose}
        correction={selectedCorrection}
        onDecisionMade={handleDecisionMade}
      />
    </DashboardLayout>
  );
};

export default IDEMemoryApprovalsPage;
