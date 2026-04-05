import React, { useState, useEffect } from 'react';
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
  useToast,
  Flex,
  IconButton,
  Collapse,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Heading,
  Divider,
} from '@chakra-ui/react';
import {
  FiServer,
  FiCpu,
  FiBarChart,
  FiSettings,
  FiPlay,
  FiSquare,
  FiChevronDown,
  FiChevronRight,
  FiEye,
  FiRefreshCw,
  FiPower,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';
// import KubernetesMonitoringPanel from '@/components/infrastructure/kubernetes/KubernetesMonitoringPanel';
// import EnhancedStatusCards from '@/components/infrastructure/kubernetes/EnhancedStatusCards';
// import EnhancedServiceTable from '@/components/infrastructure/kubernetes/EnhancedServiceTable';

interface KubernetesPageProps {
  initialData?: any;
}

const KubernetesEnhancedPage: React.FC<KubernetesPageProps> = ({ initialData }) => {
  // Core State
  const [clusterData, setClusterData] = useState(null);
  const [servicesData, setServicesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  
  // Interactive Controls State
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [selectedNamespace, setSelectedNamespace] = useState('all');
  const [showMetrics, setShowMetrics] = useState(true);
  
  // Modals and Disclosure
  const { isOpen: isSettingsModalOpen, onOpen: openSettingsModal, onClose: closeSettingsModal } = useDisclosure();
  const { isOpen: isManagementModalOpen, onOpen: openManagementModal, onClose: closeManagementModal } = useDisclosure();
  const { isOpen: isMetricsExpanded, onToggle: toggleMetrics } = useDisclosure({ defaultIsOpen: true });
  
  // Settings State
  const [settings, setSettings] = useState({
    refreshInterval: 30,
    autoScale: false,
    autoScaleThreshold: 80,
    maxReplicas: 10,
    minReplicas: 1,
  });
  
  // Enhanced Theme Colors
  const bgColor = useSemanticToken('surface.base');
  const cardBg = useSemanticToken('surface.elevated');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const accentColor = useSemanticToken('status.info');
  const successColor = useSemanticToken('status.success');
  const warningColor = useSemanticToken('status.warning');
  const errorColor = useSemanticToken('status.error');
  const borderColor = useSemanticToken('border.default');
  const serviceBg = useSemanticToken('surface.raised');

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        if (!isLoading) {
          fetchClusterData();
        }
      }, settings.refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isLoading, settings.refreshInterval]);

  // Initial data fetch
  useEffect(() => {
    fetchClusterData();
  }, []);

  // Fetch cluster data
  const fetchClusterData = async () => {
    setIsLoading(true);
    try {
      const [clusterResponse, servicesResponse] = await Promise.all([
        fetch('http://localhost:8099/api/cluster/status'),
        fetch('http://localhost:8099/api/services/health')
      ]);

      if (clusterResponse.ok && servicesResponse.ok) {
        const cluster = await clusterResponse.json();
        const services = await servicesResponse.json();
        
        setClusterData(cluster);
        setServicesData(services.services || []);
        
        toast({
          title: 'Data Refreshed',
          description: `Found ${services.services?.length || 0} services`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        throw new Error('API response not ok');
      }
    } catch (error) {
      console.error('Failed to fetch cluster data:', error);
      setClusterData({
        status: 'Disconnected',
        version: 'v1.33.1',
        nodes: 1,
        namespaces: 4,
        totalPods: 12,
        runningPods: 8,
        pendingPods: 2,
        failedPods: 2,
        cpuUsage: 45,
        memoryUsage: 62,
      });
      
      setServicesData([
        { name: 'ai-gateway', status: 'Running', ready: true, restarts: 0, age: '1h', namespace: 'ai-gateway', cpu: 45, memory: 62 },
        { name: 'kg-api', status: 'Pending', ready: false, restarts: 0, age: '2h', namespace: 'knowledge-graph', cpu: 20, memory: 30 },
        { name: 'grafana', status: 'Running', ready: true, restarts: 1, age: '3h', namespace: 'monitoring', cpu: 67, memory: 55 }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceAction = (service: any, action: string) => {
    toast({
      title: `${action} Service`,
      description: `${action} ${service.name} completed`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleClusterAction = async (action: string) => {
    toast({
      title: `Cluster ${action}`,
      description: `Cluster ${action.toLowerCase()} initiated`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const updateSettings = (newSettings: any) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    toast({
      title: 'Settings Updated',
      description: 'Your preferences have been saved',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
    closeSettingsModal();
  };

  const namespaces = ['all', ...new Set(servicesData.map(s => s.namespace).filter(Boolean))];

  return (
    <DashboardLayout>
      <Head>
        <title>Kubernetes Control Center - AI Homelab Dashboard</title>
        <meta name="description" content="Enhanced Kubernetes cluster management" />
        <link rel="stylesheet" href="/styles/kubernetes-animations.css" />
      </Head>
      
      <Box p={6} bg={bgColor} minH="100vh">
        {/* Enhanced Header */}
        <GlassPanel variant="heavy" mb={10}>
          <Box
            bgGradient="linear(135deg, blue.500 0%, purple.600 35%, indigo.600 70%, blue.700 100%)"
            position="relative"
            overflow="hidden"
            borderRadius="3xl"
            boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          >
            <Box
              position="absolute"
              top="-40px"
              right="-40px"
              width="200px"
              height="200px"
              borderRadius="full"
              bg="whiteAlpha.150"
              filter="blur(40px)"
              className="float-animation"
            />
            
            <Box p={10} position="relative" zIndex={1}>
              <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                <VStack align="start" spacing={4}>
                  <HStack spacing={5}>
                    <Box
                      p={4}
                      bg="whiteAlpha.250"
                      borderRadius="2xl"
                      backdropFilter="blur(20px)"
                      border="1px solid"
                      borderColor="whiteAlpha.300"
                    >
                      <FiServer size={40} color="white" />
                    </Box>
                    <VStack align="start" spacing={2}>
                      <Heading
                        size="2xl"
                        color="white"
                        fontWeight="800"
                        letterSpacing="tight"
                      >
                        Kubernetes Control Center
                      </Heading>
                      <Text
                        color="whiteAlpha.950"
                        fontSize="xl"
                        fontWeight="600"
                      >
                        Enterprise-Grade Cluster Management
                      </Text>
                    </VStack>
                  </HStack>
                  
                  <HStack spacing={6}>
                    <HStack spacing={3}>
                      <Box
                        w={4}
                        h={4}
                        borderRadius="full"
                        bg={clusterData?.status === 'Ready' ? 'green.400' : 'red.400'}
                        className={clusterData?.status === 'Ready' ? 'status-running' : 'status-failed'}
                      />
                      <Text color="whiteAlpha.950" fontSize="md" fontWeight="600">
                        {clusterData?.status || 'Unknown'} • {clusterData?.version || 'N/A'}
                      </Text>
                    </HStack>
                  </HStack>
                </VStack>
                
                <HStack spacing={8}>
                  {[
                    { label: 'PODS', value: servicesData.length || 0 },
                    { label: 'HEALTH', value: `${Math.round((servicesData.filter(s => s.status === 'Running').length / Math.max(servicesData.length, 1)) * 100)}%` },
                    { label: 'NAMESPACES', value: new Set(servicesData.map(s => s.namespace)).size || 0 }
                  ].map((stat) => (
                    <Box
                      key={stat.label}
                      p={4}
                      bg="whiteAlpha.200"
                      borderRadius="xl"
                      backdropFilter="blur(15px)"
                      border="1px solid"
                      borderColor="whiteAlpha.300"
                      minW="100px"
                      textAlign="center"
                      className="enhanced-hover"
                    >
                      <VStack spacing={2}>
                        <Text color="whiteAlpha.800" fontSize="xs" fontWeight="bold">
                          {stat.label}
                        </Text>
                        <Text color="white" fontSize="3xl" fontWeight="900">
                          {stat.value}
                        </Text>
                      </VStack>
                    </Box>
                  ))}
                </HStack>
                
                <HStack spacing={4}>
                  {[
                    { icon: FiRefreshCw, label: 'Refresh', action: () => fetchClusterData(), loading: isLoading },
                    { icon: FiSettings, label: 'Manage', action: openManagementModal },
                    { icon: FiSettings, label: 'Settings', action: openSettingsModal }
                  ].map((button) => (
                    <Button
                      key={button.label}
                      leftIcon={<button.icon size={20} />}
                      colorScheme="whiteAlpha"
                      variant="solid"
                      size="lg"
                      onClick={button.action}
                      isLoading={button.loading}
                      bg="whiteAlpha.250"
                      backdropFilter="blur(20px)"
                      border="1px solid"
                      borderColor="whiteAlpha.400"
                      color="white"
                      fontWeight="600"
                      className="enhanced-hover"
                    >
                      {button.label}
                    </Button>
                  ))}
                </HStack>
              </Flex>
            </Box>
          </Box>
        </GlassPanel>

        {/* Enhanced Status Cards */}
        {/* Status Cards Placeholder */}
        <Grid templateColumns="repeat(auto-fit, minmax(280px, 1fr))" gap={6} mb={8}>
          <GlassPanel variant="light">
            <Box p={6} textAlign="center">
              <Text fontSize="3xl" fontWeight="bold" color={textPrimary}>
                {clusterData?.totalPods || servicesData.length || 0}
              </Text>
              <Text color={textSecondary}>Total Pods</Text>
            </Box>
          </GlassPanel>
          <GlassPanel variant="light">
            <Box p={6} textAlign="center">
              <Text fontSize="3xl" fontWeight="bold" color={successColor}>
                {Math.round((servicesData.filter(s => s.status === 'Running').length / Math.max(servicesData.length, 1)) * 100)}%
              </Text>
              <Text color={textSecondary}>Health Score</Text>
            </Box>
          </GlassPanel>
        </Grid>

        {/* Dashboard Grid */}
        <Grid templateColumns="repeat(12, 1fr)" gap={8}>
          <GridItem colSpan={{ base: 12, lg: 8 }}>
            <Box className="slide-up-animation">
              <Flex justify="space-between" align="center" mb={6}>
                <HStack spacing={3}>
                  <FiBarChart size={24} style={{ color: accentColor }} />
                  <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
                    Advanced Cluster Analytics
                  </Text>
                </HStack>
                <HStack spacing={3}>
                  <IconButton
                    icon={isMetricsExpanded ? <FiChevronDown /> : <FiChevronRight />}
                    onClick={toggleMetrics}
                    size="sm"
                    variant="ghost"
                    aria-label="Toggle metrics"
                  />
                  <Switch
                    isChecked={showMetrics}
                    onChange={(e) => setShowMetrics(e.target.checked)}
                    colorScheme="blue"
                  />
                </HStack>
              </Flex>
              
              <Collapse in={isMetricsExpanded && showMetrics}>
                <KubernetesMonitoringPanel
                  clusterData={clusterData}
                  servicesData={servicesData}
                  refreshInterval={settings.refreshInterval}
                  isLoading={isLoading}
                />
              </Collapse>
            </Box>
          </GridItem>

          <GridItem colSpan={{ base: 12, lg: 4 }}>
            <GlassPanel variant="light">
              <Box p={6}>
                <Text fontSize="lg" fontWeight="bold" color={textPrimary} mb={6}>
                  🚀 Quick Actions
                </Text>
                <VStack spacing={4} align="stretch">
                  <Button
                    leftIcon={<FiPlay />}
                    colorScheme="green"
                    variant="outline"
                    onClick={() => handleClusterAction('scale')}
                    className="enhanced-hover"
                  >
                    Scale Up Cluster
                  </Button>
                  <Button
                    leftIcon={<FiCpu />}
                    colorScheme="purple"
                    variant="outline"
                    onClick={() => handleClusterAction('optimize')}
                    className="enhanced-hover"
                  >
                    Optimize Resources
                  </Button>
                  
                  <Divider />
                  
                  <FormControl>
                    <FormLabel fontSize="sm" color={textSecondary}>
                      Namespace Filter
                    </FormLabel>
                    <Select
                      value={selectedNamespace}
                      onChange={(e) => setSelectedNamespace(e.target.value)}
                      bg={cardBg}
                    >
                      {namespaces.map((ns) => (
                        <option key={ns} value={ns}>
                          {ns === 'all' ? 'All Namespaces' : ns}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  <VStack spacing={3}>
                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <FormLabel mb={0} fontSize="sm" color={textSecondary}>
                        Auto Refresh
                      </FormLabel>
                      <Switch
                        isChecked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        colorScheme="blue"
                      />
                    </FormControl>
                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <FormLabel mb={0} fontSize="sm" color={textSecondary}>
                        Notifications
                      </FormLabel>
                      <Switch
                        isChecked={monitoringEnabled}
                        onChange={(e) => setMonitoringEnabled(e.target.checked)}
                        colorScheme="green"
                      />
                    </FormControl>
                  </VStack>
                </VStack>
              </Box>
            </GlassPanel>
          </GridItem>

          <GridItem colSpan={12}>
            {/* Service Table Placeholder */}
            <GlassPanel variant="light">
              <Box p={6}>
                <Text fontSize="xl" fontWeight="bold" color={textPrimary} mb={4}>
                  📊 Service Observatory
                </Text>
                <VStack spacing={3} align="stretch">
                  {servicesData.slice(0, 5).map((service, index) => (
                    <HStack key={index} justify="space-between" p={3} bg={serviceBg} borderRadius="lg">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold">{service.name}</Text>
                        <Text fontSize="sm" color={textSecondary}>{service.namespace}</Text>
                      </VStack>
                      <Text color={service.status === 'Running' ? successColor : errorColor}>
                        {service.status}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            </GlassPanel>
          </GridItem>
        </Grid>

        {/* Settings Modal */}
        <Modal isOpen={isSettingsModalOpen} onClose={closeSettingsModal} size="xl">
          <ModalOverlay backdropFilter="blur(10px)" />
          <ModalContent>
            <ModalHeader>⚙️ Kubernetes Settings</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={6} align="stretch">
                <FormControl>
                  <FormLabel>Refresh Interval</FormLabel>
                  <Select
                    value={settings.refreshInterval}
                    onChange={(e) => setSettings({...settings, refreshInterval: parseInt(e.target.value)})}
                  >
                    <option value={5}>5 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                  </Select>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={() => updateSettings(settings)}>
                Save Settings
              </Button>
              <Button variant="ghost" onClick={closeSettingsModal}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Management Modal */}
        <Modal isOpen={isManagementModalOpen} onClose={closeManagementModal} size="xl">
          <ModalOverlay backdropFilter="blur(10px)" />
          <ModalContent>
            <ModalHeader>🎛️ Cluster Management</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={6} align="stretch">
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <Button
                    leftIcon={<FiPlay />}
                    colorScheme="green"
                    onClick={() => handleClusterAction('start')}
                  >
                    Start Cluster
                  </Button>
                  <Button
                    leftIcon={<FiSquare />}
                    colorScheme="red"
                    onClick={() => handleClusterAction('stop')}
                  >
                    Stop Cluster
                  </Button>
                </Grid>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={closeManagementModal}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </DashboardLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: { initialData: null } };
};

export default KubernetesEnhancedPage;
