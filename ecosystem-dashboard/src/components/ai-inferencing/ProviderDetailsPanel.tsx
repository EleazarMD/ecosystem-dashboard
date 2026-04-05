/**
 * Provider Details Panel - Comprehensive provider intelligence drill-down
 * Shows models, activity, performance, cost, and configuration for a specific provider
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  IconButton,
  Divider,
  SimpleGrid,
  Progress,
  
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Card,
  CardBody,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Code,
  Alert,
  AlertIcon,
  Tooltip,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  FiX,
  FiActivity,
  FiDollarSign,
  FiZap,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiTrendingUp,
  FiTrendingDown,
  FiServer,
  FiUsers,
  FiBarChart2,
  FiSettings,
  FiKey,
  FiShield,
} from 'react-icons/fi';

interface ProviderDetailsPanelProps {
  providerId: string;
  onClose: () => void;
}

interface ProviderData {
  id: string;
  name: string;
  status: 'active' | 'degraded' | 'inactive';
  models: any[];
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  totalCost: number;
  apiKeysCount: number;
  projectsCount: number;
}

const COLORS = ['#3182CE', '#38A169', '#805AD5', '#ED8936', '#E53E3E'];

export const ProviderDetailsPanel: React.FC<ProviderDetailsPanelProps> = ({
  providerId,
  onClose,
}) => {
  const [providerData, setProviderData] = useState<ProviderData | null>(null);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [costData, setCostData] = useState<any[]>([]);
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.elevated');
  const subtleText = useSemanticToken('text.secondary');
  const successColor = useSemanticToken('status.success');
  const errorColor = useSemanticToken('status.error');
  const chartBg = useSemanticToken('surface.hover');
  const hoverBg = useSemanticToken('surface.hover');

  useEffect(() => {
    loadProviderData();
  }, [providerId, timeRange]);

  const loadProviderData = async () => {
    setLoading(true);
    try {
      console.log('[Provider Details] Loading data for:', providerId, 'Time range:', timeRange);
      
      const response = await fetch(`/api/analytics/provider-stats?provider=${providerId}&timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[Provider Details] Received data:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load provider data');
      }

      // Transform API response to component data structure
      const transformedData: ProviderData = {
        id: providerId,
        name: getProviderDisplayName(providerId),
        status: data.summary.totalRequests > 0 ? 'active' : 'inactive',
        models: data.models || [],
        totalRequests: data.summary.totalRequests,
        successRate: data.summary.successRate,
        avgLatency: 850, // TODO: Add latency tracking to usage table
        totalCost: data.summary.totalCost,
        apiKeysCount: data.summary.apiKeysCount,
        projectsCount: data.summary.projectsCount,
      };

      setProviderData(transformedData);
      
      // Set activity data from API
      if (data.activity && data.activity.length > 0) {
        setActivityData(data.activity.map((a: any) => ({
          time: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          requests: a.requests,
          successes: a.successes,
          errors: a.errors,
        })));
        
        setCostData(data.activity.map((a: any) => ({
          day: new Date(a.date).toLocaleDateString('en-US', { weekday: 'short' }),
          cost: a.cost,
        })));
      } else {
        setActivityData([]);
        setCostData([]);
      }
      
      // Set projects data from API
      setProjectsData(data.projects || []);
      
    } catch (error: any) {
      console.error('[Provider Details] Error loading provider data:', error);
      // Set empty data on error
      setProviderData({
        id: providerId,
        name: getProviderDisplayName(providerId),
        status: 'inactive',
        models: [],
        totalRequests: 0,
        successRate: 0,
        avgLatency: 0,
        totalCost: 0,
        apiKeysCount: 0,
        projectsCount: 0,
      });
      setActivityData([]);
      setCostData([]);
      setProjectsData([]);
    } finally {
      setLoading(false);
    }
  };

  const getProviderDisplayName = (id: string): string => {
    const names: Record<string, string> = {
      'anthropic': 'Anthropic',
      'openai': 'OpenAI',
      'google': 'Google',
      'groq': 'Groq',
      'perplexity': 'Perplexity',
      'ollama': 'Ollama',
    };
    return names[id] || id;
  };

  if (!providerData) {
    return (
      <Box p={6}>
        <Text>Loading provider data...</Text>
      </Box>
    );
  }

  return (
    <Box width="full" height="full" overflow="auto">
      {/* Header */}
      <HStack justify="space-between" p={6} borderBottomWidth="1px" borderColor={borderColor}>
        <VStack align="start" spacing={1}>
          <Text fontSize="lg" fontWeight="600">{providerData.name}</Text>
          <HStack spacing={2}>
            <Badge 
              colorScheme={providerData.status === 'active' ? 'green' : 'red'} 
              fontSize="xs"
            >
              <Icon as={FiCheckCircle} boxSize={3} mr={1} />
              {providerData.status}
            </Badge>
            <Badge colorScheme="blue" fontSize="xs">
              {providerData.models.length} models
            </Badge>
            <Badge colorScheme="purple" fontSize="xs">
              {providerData.projectsCount} projects
            </Badge>
          </HStack>
        </VStack>
        <IconButton
          aria-label="Close"
          icon={<FiX />}
          variant="ghost"
          onClick={onClose}
        />
      </HStack>

      <VStack spacing={6} p={6} align="stretch">
        {/* Time Range Selector */}
        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="600" color={subtleText}>OVERVIEW</Text>
          <HStack spacing={2}>
            {(['1h', '24h', '7d', '30d'] as const).map((range) => (
              <Badge
                key={range}
                fontSize="xs"
                colorScheme={timeRange === range ? 'blue' : 'gray'}
                variant={timeRange === range ? 'solid' : 'subtle'}
                cursor="pointer"
                onClick={() => setTimeRange(range)}
                px={3}
                py={1}
              >
                {range}
              </Badge>
            ))}
          </HStack>
        </HStack>

        {/* Key Metrics Grid */}
        <SimpleGrid columns={2} spacing={4}>
          <Card bg={cardBg} shadow="sm">
            <CardBody>
              <Stat>
                <StatLabel fontSize="xs" color={subtleText}>Total Requests</StatLabel>
                <StatNumber fontSize="2xl">{providerData.totalRequests.toLocaleString()}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  15.3% vs last period
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} shadow="sm">
            <CardBody>
              <Stat>
                <StatLabel fontSize="xs" color={subtleText}>Success Rate</StatLabel>
                <StatNumber fontSize="2xl" color={successColor}>
                  {providerData.successRate.toFixed(1)}%
                </StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  0.5% improvement
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} shadow="sm">
            <CardBody>
              <Stat>
                <StatLabel fontSize="xs" color={subtleText}>Avg Latency</StatLabel>
                <StatNumber fontSize="2xl">{providerData.avgLatency}ms</StatNumber>
                <StatHelpText>
                  <StatArrow type="decrease" />
                  25ms faster
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} shadow="sm">
            <CardBody>
              <Stat>
                <StatLabel fontSize="xs" color={subtleText}>Total Cost</StatLabel>
                <StatNumber fontSize="2xl">${providerData.totalCost.toFixed(2)}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  12.1% vs last period
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Tabs for detailed views */}
        <Tabs colorScheme="blue" isLazy>
          <TabList>
            <Tab fontSize="sm">
              <Icon as={FiZap} mr={2} />
              Models
            </Tab>
            <Tab fontSize="sm">
              <Icon as={FiActivity} mr={2} />
              Activity
            </Tab>
            <Tab fontSize="sm">
              <Icon as={FiDollarSign} mr={2} />
              Cost Analysis
            </Tab>
            <Tab fontSize="sm">
              <Icon as={FiSettings} mr={2} />
              Configuration
            </Tab>
          </TabList>

          <TabPanels>
            {/* Models Tab */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={4}>
                <Text fontSize="sm" fontWeight="600" color={subtleText}>MODEL PERFORMANCE</Text>
                
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Model</Th>
                        <Th isNumeric>Requests</Th>
                        <Th isNumeric>Success Rate</Th>
                        <Th>Action</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {providerData.models.map((model) => (
                        <Tr 
                          key={model.id}
                          _hover={{ bg: hoverBg }}
                          cursor="pointer"
                        >
                          <Td>
                            <Text fontSize="sm" fontWeight="500">{model.name}</Text>
                          </Td>
                          <Td isNumeric>
                            <Text fontSize="sm">{model.requests.toLocaleString()}</Text>
                          </Td>
                          <Td isNumeric>
                            <Badge 
                              colorScheme={model.successRate > 98 ? 'green' : 'yellow'}
                              fontSize="xs"
                            >
                              {model.successRate}%
                            </Badge>
                          </Td>
                          <Td>
                            <Button size="xs" variant="ghost" colorScheme="blue">
                              View Details
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>

                <Divider />

                <Box bg={chartBg} p={4} borderRadius="md" height="200px">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={providerData.models}
                        dataKey="requests"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label
                      >
                        {providerData.models.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </VStack>
            </TabPanel>

            {/* Activity Tab */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={4}>
                <Text fontSize="sm" fontWeight="600" color={subtleText}>REQUEST VOLUME</Text>
                <Box bg={chartBg} p={4} borderRadius="md" height="250px">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="time" fontSize={10} />
                      <YAxis fontSize={10} />
                      <RechartsTooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="requests"
                        stackId="1"
                        stroke="#3182CE"
                        fill="#3182CE"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="successes"
                        stackId="2"
                        stroke="#38A169"
                        fill="#38A169"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="errors"
                        stackId="3"
                        stroke="#E53E3E"
                        fill="#E53E3E"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>

                <SimpleGrid columns={3} spacing={4}>
                  <Box p={3} bg={chartBg} borderRadius="md">
                    <Text fontSize="xs" color={subtleText} mb={1}>Peak Hour</Text>
                    <Text fontSize="lg" fontWeight="600">14:00</Text>
                  </Box>
                  <Box p={3} bg={chartBg} borderRadius="md">
                    <Text fontSize="xs" color={subtleText} mb={1}>Total Errors</Text>
                    <Text fontSize="lg" fontWeight="600" color={errorColor}>38</Text>
                  </Box>
                  <Box p={3} bg={chartBg} borderRadius="md">
                    <Text fontSize="xs" color={subtleText} mb={1}>Uptime</Text>
                    <Text fontSize="lg" fontWeight="600" color={successColor}>99.9%</Text>
                  </Box>
                </SimpleGrid>
              </VStack>
            </TabPanel>

            {/* Cost Analysis Tab */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={4}>
                <Text fontSize="sm" fontWeight="600" color={subtleText}>COST TRENDS</Text>
                <Box bg={chartBg} p={4} borderRadius="md" height="200px">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="day" fontSize={10} />
                      <YAxis fontSize={10} />
                      <RechartsTooltip />
                      <Bar dataKey="cost" fill="#ED8936" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>

                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <Text fontSize="xs" color={subtleText} mb={1}>Daily Average</Text>
                    <Text fontSize="lg" fontWeight="600">$6.46</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={subtleText} mb={1}>Monthly Projection</Text>
                    <Text fontSize="lg" fontWeight="600">$194.00</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={subtleText} mb={1}>Cost per 1K Tokens</Text>
                    <Text fontSize="lg" fontWeight="600">$0.0185</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={subtleText} mb={1}>Budget Usage</Text>
                    <VStack align="stretch" spacing={1}>
                      <Progress value={45} colorScheme="blue" size="sm" />
                      <Text fontSize="xs" color={subtleText}>45% of $100</Text>
                    </VStack>
                  </Box>
                </SimpleGrid>

                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box fontSize="sm">
                    <Text fontWeight="600">Optimization Opportunity</Text>
                    <Text fontSize="xs" color={subtleText}>
                      Consider rate limiting during off-peak hours to reduce costs by up to 20%.
                    </Text>
                  </Box>
                </Alert>
              </VStack>
            </TabPanel>

            {/* Configuration Tab */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color={subtleText} mb={3}>API KEYS</Text>
                  <SimpleGrid columns={2} spacing={4}>
                    <Box p={4} bg={chartBg} borderRadius="md">
                      <HStack spacing={3}>
                        <Icon as={FiKey} color={subtleText} boxSize={5} />
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight="600">{providerData.apiKeysCount}</Text>
                          <Text fontSize="xs" color={subtleText}>Active Keys</Text>
                        </VStack>
                      </HStack>
                    </Box>
                    <Box p={4} bg={chartBg} borderRadius="md">
                      <HStack spacing={3}>
                        <Icon as={FiShield} color={successColor} boxSize={5} />
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight="600">All Valid</Text>
                          <Text fontSize="xs" color={subtleText}>Last checked 2m ago</Text>
                        </VStack>
                      </HStack>
                    </Box>
                  </SimpleGrid>
                </Box>

                <Divider />

                <Box>
                  <Text fontSize="sm" fontWeight="600" color={subtleText} mb={3}>RATE LIMITS</Text>
                  <VStack align="stretch" spacing={3}>
                    <Box p={3} bg={chartBg} borderRadius="md">
                      <HStack justify="space-between">
                        <Text fontSize="sm">Requests per Minute</Text>
                        <Badge colorScheme="blue">60</Badge>
                      </HStack>
                    </Box>
                    <Box p={3} bg={chartBg} borderRadius="md">
                      <HStack justify="space-between">
                        <Text fontSize="sm">Tokens per Minute</Text>
                        <Badge colorScheme="blue">100K</Badge>
                      </HStack>
                    </Box>
                    <Box p={3} bg={chartBg} borderRadius="md">
                      <HStack justify="space-between">
                        <Text fontSize="sm">Daily Cost Limit</Text>
                        <Badge colorScheme="orange">$50</Badge>
                      </HStack>
                    </Box>
                  </VStack>
                </Box>

                <Divider />

                <Box>
                  <Text fontSize="sm" fontWeight="600" color={subtleText} mb={3}>ACTIVE PROJECTS</Text>
                  {projectsData.length > 0 ? (
                    <VStack align="stretch" spacing={2}>
                      {projectsData.map((project: any) => (
                        <HStack key={project.id} p={3} bg={chartBg} borderRadius="md" justify="space-between">
                          <HStack spacing={3}>
                            <Icon as={FiServer} color={subtleText} />
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm" fontWeight="500">{project.name}</Text>
                              <Text fontSize="xs" color={subtleText}>
                                {project.servicesCount} {project.servicesCount === 1 ? 'service' : 'services'}
                              </Text>
                            </VStack>
                          </HStack>
                          <Badge colorScheme="green" fontSize="xs">Active</Badge>
                        </HStack>
                      ))}
                    </VStack>
                  ) : (
                    <Text fontSize="sm" color={subtleText}>No active projects</Text>
                  )}
                </Box>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
};
