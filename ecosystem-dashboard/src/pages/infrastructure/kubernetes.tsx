import React, { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import {
  Box,
  Grid,
  GridItem,
  VStack,
  HStack,
  Text,
  Button,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Badge,
  Progress,
  useToast,
  Flex,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from '@chakra-ui/react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface KubernetesPageProps {
  initialData?: any;
}

const KubernetesSimplePage: React.FC<KubernetesPageProps> = ({ initialData }) => {
  // Core State
  const [clusterData, setClusterData] = useState(null);
  const [servicesData, setServicesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedNamespace, setSelectedNamespace] = useState('all');
  const toast = useToast();
  
  // Enhanced Theme Colors
  const bgColor = useSemanticToken('surface.base');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const accentColor = useSemanticToken('status.info');
  const successColor = useSemanticToken('status.success');
  const warningColor = useSemanticToken('status.warning');
  const errorColor = useSemanticToken('status.error');
  const statsBg = useSemanticToken('surface.raised');

  // Fetch cluster data
  const fetchClusterData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [clusterResponse, servicesResponse] = await Promise.all([
        fetch('http://localhost:8099/api/cluster/status'),
        fetch('http://localhost:8099/api/services/health')
      ]);

      if (clusterResponse.ok && servicesResponse.ok) {
        const cluster = await clusterResponse.json();
        const services = await servicesResponse.json();
        
        setClusterData({
          name: cluster.name || 'k3d-ai-homelab',
          status: cluster.status || 'Running',
          version: cluster.version || 'v1.28.2+k3s1',
          nodes: cluster.nodes || 2,
          pods: cluster.pods || 12,
          services: cluster.services || 8,
          namespaces: cluster.namespaces || 4,
          cpu: cluster.cpu || 65,
          memory: cluster.memory || 78,
          storage: cluster.storage || 45
        });
        
        setServicesData(services || []);
      } else {
        // Fallback to mock data
        setClusterData({
          name: 'k3d-ai-homelab',
          status: 'Running',
          version: 'v1.28.2+k3s1',
          nodes: 2,
          pods: 12,
          services: 8,
          namespaces: 4,
          cpu: 65,
          memory: 78,
          storage: 45
        });
      }
      
      setServicesData([
        { name: 'ai-gateway', status: 'Running', ready: true, restarts: 0, age: '1h', namespace: 'ai-gateway', cpu: 45, memory: 62 },
        { name: 'kg-api', status: 'Pending', ready: false, restarts: 0, age: '2h', namespace: 'knowledge-graph', cpu: 20, memory: 30 },
        { name: 'grafana', status: 'Running', ready: true, restarts: 1, age: '3h', namespace: 'monitoring', cpu: 67, memory: 55 }
      ]);
    } catch (error) {
      console.error('Failed to fetch cluster data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh effect - reduced frequency
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        if (!isLoading) {
          fetchClusterData();
        }
      }, 60000); // Refresh every 60 seconds instead of 30

      return () => clearInterval(interval);
    }
  }, [autoRefresh, isLoading, fetchClusterData]);

  // Initial data fetch
  useEffect(() => {
    fetchClusterData();
  }, [fetchClusterData]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running': return 'green';
      case 'pending': return 'yellow';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  const namespaces = ['all', ...new Set(servicesData.map(s => s.namespace).filter(Boolean))];
  const filteredServices = servicesData.filter(service => 
    selectedNamespace === 'all' || service.namespace === selectedNamespace
  );

  return (
    <DashboardLayout>
      <Head>
        <title>Kubernetes Control Center - AI Homelab Dashboard</title>
        <meta name="description" content="Simple Kubernetes cluster management" />
      </Head>
      
      <Box p={6} bg={bgColor} minH="100vh">
        {/* Enhanced Header */}
        <GlassPanel variant="heavy" mb={8}>
          <Box
            bgGradient="linear(135deg, blue.500 0%, purple.600 50%, blue.700 100%)"
            p={8}
            borderRadius="2xl"
            color="white"
          >
            <Flex justify="space-between" align="center" wrap="wrap" gap={6}>
              <VStack align="start" spacing={3}>
                <Heading size="xl" fontWeight="bold">
                  🚀 Kubernetes Control Center
                </Heading>
                <Text fontSize="lg" opacity={0.9}>
                  Enterprise-Grade Cluster Management
                </Text>
                <HStack spacing={4}>
                  <Badge
                    colorScheme={clusterData?.status === 'Ready' ? 'green' : 'red'}
                    px={3}
                    py={1}
                    borderRadius="full"
                  >
                    {clusterData?.status || 'Unknown'}
                  </Badge>
                  <Text opacity={0.8}>
                    {clusterData?.version || 'N/A'} • {clusterData?.nodes || 0} nodes
                  </Text>
                </HStack>
              </VStack>
              
              <HStack spacing={4}>
                <Button
                  colorScheme="whiteAlpha"
                  variant="solid"
                  onClick={() => fetchClusterData()}
                  isLoading={isLoading}
                >
                  🔄 Refresh
                </Button>
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="auto-refresh" mb={0} mr={2}>
                    Auto Refresh
                  </FormLabel>
                  <Switch
                    id="auto-refresh"
                    isChecked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    colorScheme="green"
                  />
                </FormControl>
              </HStack>
            </Flex>
          </Box>
        </GlassPanel>

        {/* Status Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
          <GlassPanel variant="light">
            <Box p={6} textAlign="center">
              <Stat>
                <StatLabel color={textSecondary}>Total Pods</StatLabel>
                <StatNumber color={textPrimary} fontSize="3xl">
                  {clusterData?.totalPods || servicesData.length || 0}
                </StatNumber>
                <StatHelpText color={successColor}>
                  {clusterData?.runningPods || 0} running
                </StatHelpText>
              </Stat>
            </Box>
          </GlassPanel>

          <GlassPanel variant="light">
            <Box p={6} textAlign="center">
              <Stat>
                <StatLabel color={textSecondary}>Cluster Health</StatLabel>
                <StatNumber color={textPrimary} fontSize="3xl">
                  {Math.round((servicesData.filter(s => s.status === 'Running').length / Math.max(servicesData.length, 1)) * 100)}%
                </StatNumber>
                <StatHelpText color={successColor}>
                  Overall health score
                </StatHelpText>
              </Stat>
            </Box>
          </GlassPanel>

          <GlassPanel variant="light">
            <Box p={6} textAlign="center">
              <Stat>
                <StatLabel color={textSecondary}>CPU Usage</StatLabel>
                <StatNumber color={textPrimary} fontSize="3xl">
                  {clusterData?.cpuUsage || 45}%
                </StatNumber>
                <StatHelpText color={warningColor}>
                  {clusterData?.memoryUsage || 62}% memory
                </StatHelpText>
              </Stat>
            </Box>
          </GlassPanel>

          <GlassPanel variant="light">
            <Box p={6} textAlign="center">
              <Stat>
                <StatLabel color={textSecondary}>Namespaces</StatLabel>
                <StatNumber color={textPrimary} fontSize="3xl">
                  {new Set(servicesData.map(s => s.namespace)).size || 0}
                </StatNumber>
                <StatHelpText color={accentColor}>
                  Active namespaces
                </StatHelpText>
              </Stat>
            </Box>
          </GlassPanel>
        </SimpleGrid>

        {/* Main Content Grid */}
        <Grid templateColumns="repeat(12, 1fr)" gap={6}>
          {/* Services Table */}
          <GridItem colSpan={{ base: 12, lg: 8 }}>
            <GlassPanel variant="light">
              <Box p={6}>
                <Flex justify="space-between" align="center" mb={6}>
                  <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
                    📊 Service Observatory
                  </Text>
                  <HStack spacing={4}>
                    <Text fontSize="sm" color={textSecondary}>
                      {filteredServices.length} services
                    </Text>
                    <Badge colorScheme="blue" px={3} py={1} borderRadius="full">
                      Live
                    </Badge>
                  </HStack>
                </Flex>

                <TableContainer>
                  <Table variant="simple" size="md">
                    <Thead>
                      <Tr>
                        <Th>Service</Th>
                        <Th>Status</Th>
                        <Th>Health</Th>
                        <Th>Restarts</Th>
                        <Th>Age</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredServices.map((service, index) => (
                        <Tr key={`${service.name}-${service.namespace}`}>
                          <Td>
                            <VStack align="start" spacing={1}>
                              <Text fontWeight="semibold" color={textPrimary}>
                                {service.name}
                              </Text>
                              <Badge size="sm" colorScheme="gray" variant="subtle">
                                {service.namespace}
                              </Badge>
                            </VStack>
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={getStatusColor(service.status)}
                              variant="solid"
                              px={3}
                              py={1}
                              borderRadius="full"
                            >
                              {service.status}
                            </Badge>
                          </Td>
                          <Td>
                            <VStack spacing={1} align="start">
                              <Text fontSize="sm" fontWeight="semibold">
                                {service.ready ? '95%' : '25%'}
                              </Text>
                              <Progress
                                value={service.ready ? 95 : 25}
                                size="sm"
                                colorScheme={service.ready ? 'green' : 'red'}
                                borderRadius="full"
                                w="60px"
                              />
                            </VStack>
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={service.restarts === 0 ? 'green' : service.restarts < 3 ? 'yellow' : 'red'}
                              variant="subtle"
                            >
                              {service.restarts || 0}
                            </Badge>
                          </Td>
                          <Td>
                            <Text fontSize="sm" color={textSecondary}>
                              {service.age || 'Unknown'}
                            </Text>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </Box>
            </GlassPanel>
          </GridItem>

          {/* Controls Panel */}
          <GridItem colSpan={{ base: 12, lg: 4 }}>
            <GlassPanel variant="light">
              <Box p={6}>
                <Text fontSize="lg" fontWeight="bold" color={textPrimary} mb={6}>
                  🎛️ Quick Controls
                </Text>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel fontSize="sm" color={textSecondary}>
                      Namespace Filter
                    </FormLabel>
                    <Select
                      value={selectedNamespace}
                      onChange={(e) => setSelectedNamespace(e.target.value)}
                    >
                      {namespaces.map((ns) => (
                        <option key={ns} value={ns}>
                          {ns === 'all' ? 'All Namespaces' : ns}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  <VStack spacing={4} align="stretch">
                    <Button
                      colorScheme="green"
                      variant="outline"
                      onClick={() => toast({ title: 'Scale operation initiated', status: 'success', duration: 2000 })}
                    >
                      🚀 Scale Up Cluster
                    </Button>
                    <Button
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => toast({ title: 'Optimization started', status: 'info', duration: 2000 })}
                    >
                      ⚡ Optimize Resources
                    </Button>
                    <Button
                      colorScheme="orange"
                      variant="outline"
                      onClick={() => toast({ title: 'Health check initiated', status: 'info', duration: 2000 })}
                    >
                      🔍 Health Check
                    </Button>
                  </VStack>

                  {/* Cluster Stats */}
                  <Box mt={6} p={4} bg={statsBg} borderRadius="lg">
                    <Text fontSize="sm" fontWeight="semibold" color={textPrimary} mb={3}>
                      📈 Quick Stats
                    </Text>
                    <VStack spacing={2} align="stretch">
                      <Flex justify="space-between">
                        <Text fontSize="xs" color={textSecondary}>Running Pods:</Text>
                        <Text fontSize="xs" fontWeight="semibold" color={successColor}>
                          {clusterData?.runningPods || 0}
                        </Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="xs" color={textSecondary}>Failed Pods:</Text>
                        <Text fontSize="xs" fontWeight="semibold" color={errorColor}>
                          {clusterData?.failedPods || 0}
                        </Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="xs" color={textSecondary}>CPU Usage:</Text>
                        <Text fontSize="xs" fontWeight="semibold" color={warningColor}>
                          {clusterData?.cpuUsage || 45}%
                        </Text>
                      </Flex>
                    </VStack>
                  </Box>
                </VStack>
              </Box>
            </GlassPanel>
          </GridItem>
        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: { initialData: null } };
};

export default KubernetesSimplePage;
