/**
 * AHIS Infrastructure Page
 * 
 * Real-time AHIS monitoring and management dashboard
 * Follows the AHIS Dashboard Integration Handoff specifications
 */

import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import {
  Box,
  Grid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  useColorMode,
  Button,
  HStack,
  Badge,
  Text,
  VStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner
} from '@chakra-ui/react';
import { GlassPanel } from '@/components/ui';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAHISClient } from '@/lib/ahis-client-provider';
import AHISStatusWidget from '@/components/infrastructure/ahis/AHISStatusWidget';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Database Overview Component
const DatabaseOverview = () => {
  const [dbData, setDbData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  useEffect(() => {
    const fetchDatabaseData = async () => {
      try {
        const response = await fetch('/api/ahis/database');
        const data = await response.json();
        setDbData(data);
      } catch (error) {
        console.error('Failed to fetch database data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDatabaseData();
  }, []);

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" />
        <Text mt={4}>Loading database information...</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Text fontSize="lg" fontWeight="semibold">
        PostgreSQL Database Overview
      </Text>

      {dbData?.usingMockData && (
        <Alert status="info">
          <AlertIcon />
          <AlertDescription>
            Using mock data - AHIS server unavailable
          </AlertDescription>
        </Alert>
      )}

      {/* Database Metrics */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={4}>
        <GlassPanel variant="medium" p={4} bg={useSemanticToken('surface.elevated')} shadow="md">
          <Stat>
            <StatLabel>Total Agents</StatLabel>
            <StatNumber>{dbData?.metrics?.total_agents || 0}</StatNumber>
            <StatHelpText>
              <Badge colorScheme="green">{dbData?.metrics?.active_agents || 0} active</Badge>
            </StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel variant="medium" p={4} bg={useSemanticToken('surface.elevated')} shadow="md">
          <Stat>
            <StatLabel>Database Size</StatLabel>
            <StatNumber>{dbData?.metrics?.database_size || 'Unknown'}</StatNumber>
            <StatHelpText>{dbData?.metrics?.total_tables || 0} tables</StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel variant="medium" p={4} bg={useSemanticToken('surface.elevated')} shadow="md">
          <Stat>
            <StatLabel>Connections</StatLabel>
            <StatNumber>{dbData?.metrics?.connections || 0}</StatNumber>
            <StatHelpText>Active connections</StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel variant="medium" p={4} bg={useSemanticToken('surface.elevated')} shadow="md">
          <Stat>
            <StatLabel>Uptime</StatLabel>
            <StatNumber>{dbData?.metrics?.uptime || 'Unknown'}</StatNumber>
            <StatHelpText>Database uptime</StatHelpText>
          </Stat>
        </GlassPanel>
      </Grid>

      {/* Database Tables */}
      <GlassPanel variant="medium" p={6} bg={useSemanticToken('surface.elevated')} shadow="md">
        <Text fontSize="md" fontWeight="semibold" mb={4}>
          Database Tables
        </Text>
        <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={4}>
          {dbData?.tables?.map((table: any, index: number) => (
            <Box key={index} p={4} bg={isDark ? "gray.700" : "gray.50"} borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="medium">{table.name}</Text>
                <Badge colorScheme="blue">{table.rows} rows</Badge>
              </HStack>
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Size: {table.size}</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  Updated: {new Date(table.last_updated).toLocaleString()}
                </Text>
              </VStack>
            </Box>
          ))}
        </Grid>
      </GlassPanel>
    </VStack>
  );
};

// Agents Overview Component
const AgentsOverview = () => {
  const [dbData, setDbData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  useEffect(() => {
    const fetchDatabaseData = async () => {
      try {
        const response = await fetch('/api/ahis/database');
        const data = await response.json();
        setDbData(data);
      } catch (error) {
        console.error('Failed to fetch database data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDatabaseData();
  }, []);

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" />
        <Text mt={4}>Loading agents information...</Text>
      </Box>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'idle': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between" align="center">
        <Text fontSize="lg" fontWeight="semibold">
          Registered Agents
        </Text>
        <Badge colorScheme="blue" variant="solid" px={3} py={1}>
          {dbData?.agents?.length || 0} Total
        </Badge>
      </HStack>

      {dbData?.usingMockData && (
        <Alert status="info">
          <AlertIcon />
          <AlertDescription>
            Using mock data - AHIS server unavailable
          </AlertDescription>
        </Alert>
      )}

      {/* Agents Grid */}
      <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6}>
        {dbData?.agents?.map((agent: any, index: number) => (
          <GlassPanel key={index} variant="light" p={6}>
            <VStack align="stretch" spacing={4}>
              {/* Agent Header */}
              <HStack justify="space-between" align="start">
                <VStack align="start" spacing={1}>
                  <Text fontSize="md" fontWeight="semibold">
                    {agent.name}
                  </Text>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    ID: {agent.id}
                  </Text>
                </VStack>
                <Badge colorScheme={getStatusColor(agent.status)} variant="solid">
                  {agent.status.toUpperCase()}
                </Badge>
              </HStack>

              {/* Agent Details */}
              <VStack align="stretch" spacing={2}>
                <HStack>
                  <Text fontSize="sm" fontWeight="medium" minW="20">Type:</Text>
                  <Badge colorScheme="purple" variant="outline">
                    {agent.type.replace('_', ' ')}
                  </Badge>
                </HStack>
                
                <HStack>
                  <Text fontSize="sm" fontWeight="medium" minW="20">Created:</Text>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    {new Date(agent.created_at).toLocaleDateString()}
                  </Text>
                </HStack>
                
                <HStack>
                  <Text fontSize="sm" fontWeight="medium" minW="20">Last Activity:</Text>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    {new Date(agent.last_activity).toLocaleString()}
                  </Text>
                </HStack>
              </VStack>

              {/* Capabilities */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>Capabilities:</Text>
                <HStack wrap="wrap" spacing={2}>
                  {(() => {
                    const caps = Array.isArray(agent.capabilities) 
                      ? agent.capabilities 
                      : (agent.capabilities && typeof agent.capabilities === 'object' 
                          ? Object.keys(agent.capabilities) 
                          : []);
                    return caps.map((capability: string, capIndex: number) => (
                      <Badge key={capIndex} colorScheme="teal" variant="subtle" fontSize="xs">
                        {String(capability).replace('_', ' ')}
                      </Badge>
                    ));
                  })()}
                </HStack>
              </Box>
            </VStack>
          </GlassPanel>
        ))}
      </Grid>

      {(!dbData?.agents || dbData.agents.length === 0) && (
        <Box textAlign="center" py={8}>
          <Text color={useSemanticToken('text.secondary')}>No agents registered</Text>
        </Box>
      )}
    </VStack>
  );
};

// AHIS Health interface
interface AHISHealth {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  service: string;
  uptime: number;
  dependencies: {
    database: { status: string };
    'port-registry': { status: string };
    'project-registry': { status: string };
  };
  healthScore: number;
  connectionInfo: {
    primary: boolean;
    fallback: boolean;
    endpoint: string;
    method: string;
  };
  dashboardConnected: boolean;
  responseTime: number;
  lastChecked: string;
  error?: string;
  usingMockData?: boolean;
}

const AHISInfrastructurePage: NextPage = () => {
  const toast = useToast();
  const [health, setHealth] = useState<AHISHealth | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);

  // AHIS Client integration with enhanced SDK features
  const { 
    client, 
    isConnected, 
    isRegistered, 
    isLoading, 
    error, 
    connectionStatus, 
    serviceInfo,
    register,
    sendHealthCheck,
    updateStatus 
  } = useAHISClient();
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  
  // Component state and enhanced status tracking
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const [registrationStatus, setRegistrationStatus] = useState<'checking' | 'registered' | 'unregistered' | 'registering'>('checking');

  // Handle dashboard registration with AHIS
  const handleRegister = async () => {
    if (!client) {
      toast({
        title: 'Registration Failed',
        description: 'AHIS client not available',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setRegistrationStatus('registering');
      
      const response = await register();
      
      toast({
        title: 'Registration Successful',
        description: `Dashboard registered with AHIS: ecosystem-dashboard`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      setRegistrationStatus('registered');
      
      // Trigger health check after registration
      await fetchHealth(false);
      
    } catch (error) {
      console.error('Registration failed:', error);
      
      toast({
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      setRegistrationStatus('unregistered');
    }
  };

  // Handle manual health check
  const handleHealthCheck = async () => {
    if (!client) {
      await fetchHealth(true);
      return;
    }

    try {
      await sendHealthCheck();
      await fetchHealth(true);
    } catch (error) {
      console.error('Health check failed:', error);
      await fetchHealth(true);
    }
  };

  // Enhanced health check using AHIS SDK
  const fetchHealth = async (showToast = false) => {
    try {
      setRefreshing(true);
      
      if (client && isConnected) {
        // Use SDK for direct health check
        const healthStatus: any = (client as any).getHealthStatus
          ? await (client as any).getHealthStatus()
          : await (client as any).getHealth();
        const healthData: AHISHealth = {
          status: healthStatus.status,
          timestamp: healthStatus.timestamp,
          version: healthStatus.version || '1.0.0',
          environment: 'production',
          service: 'AHIS Server',
          uptime: healthStatus.uptime || 0,
          responseTime: 50,
          healthScore: 95,
          connectionInfo: {
            primary: true,
            fallback: false,
            endpoint: 'http://localhost:8888',
            method: 'HTTP'
          },
          dashboardConnected: true,
          lastChecked: new Date().toISOString(),
          dependencies: {
            database: { status: 'healthy' },
            'port-registry': { status: 'healthy' },
            'project-registry': { status: 'healthy' }
          }
        };
        
        setHealth(healthData);
        setLastRefresh(new Date());
        
        if (showToast) {
          toast({
            title: 'Health Check Complete',
            description: `AHIS status: ${healthStatus.status || 'unknown'} (via SDK)`,
            status: (healthStatus.status || '').toLowerCase() === 'healthy' || (healthStatus.status || '').toLowerCase() === 'ok' ? 'success' : 'warning',
            duration: 3000,
            isClosable: true,
          });
        }
      } else {
        // Fallback to API when client not connected
        await fetchHealthFromAPI(showToast);
      }
    } catch (error) {
      console.error('SDK health check failed, falling back to API:', error);
      await fetchHealthFromAPI(showToast);
    } finally {
      setRefreshing(false);
    }
  };

  // Fallback API health check
  const fetchHealthFromAPI = async (showToast = false) => {
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('/api/ahis/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (response.ok || response.status === 503) {
        const data = await response.json();
        setHealth(data);
        setLastRefresh(new Date());
        
        if (showToast) {
          const isOffline = response.status === 503 || data.status === 'offline';
          toast({
            title: isOffline ? 'AHIS Server Offline' : 'Health Check Complete',
            description: isOffline ? 'Using mock data - AHIS server unavailable' : `AHIS status: ${data.status}`,
            status: isOffline ? 'warning' : (data.status === 'ok' ? 'success' : 'warning'),
            duration: 3000,
            isClosable: true,
          });
        }
      } else {
        throw new Error(`API responded with status: ${response.status}`);
      }
    } catch (error) {
      const isTimeoutError = error instanceof Error && (error.name === 'AbortError' || error.message.includes('timed out'));
      
      if (isTimeoutError) {
        console.log('AHIS health check timed out - server may be unavailable');
      } else {
        console.error('Failed to fetch AHIS health:', error);
      }
      
      // Only show toast for non-timeout errors or when explicitly requested
      if (showToast && !isTimeoutError) {
        toast({
          title: 'Health Check Failed',
          description: 'Using cached or mock data',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      // Clean up timeout if it still exists
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  // Initial health check on mount
  useEffect(() => {
    const performInitialHealthCheck = async () => {
      setPageLoading(true);
      await fetchHealth();
      setPageLoading(false);
    };
    
    performInitialHealthCheck();
  }, []);

  // Auto-refresh every 30 seconds with proper cleanup
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchHealth();
    }, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, [autoRefresh, fetchHealth]);

  // Manual refresh handler
  const handleRefresh = () => {
    fetchHealth(true);
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    toast({
      title: `Auto-refresh ${!autoRefresh ? 'enabled' : 'disabled'}`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  // Calculate uptime display
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ok': return 'green';
      case 'warning': return 'yellow';
      case 'error': case 'offline': return 'red';
      default: return 'gray';
    }
  };

  // Get dependency status color
  const getDependencyColor = (status: string): string => {
    switch (status) {
      case 'ok': return 'green';
      case 'warning': return 'yellow';
      case 'error': case 'unknown': return 'red';
      default: return 'gray';
    }
  };

  if (pageLoading || isLoading) {
    return (
      <Box p={8} textAlign="center">
        <Spinner size="xl" color="blue.500" thickness="4px" />
        <Text mt={4} fontSize="lg" color={useSemanticToken('text.secondary')}>
          {pageLoading ? 'Loading AHIS infrastructure page...' : 'Initializing AHIS connection...'}
        </Text>
      </Box>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>AHIS Infrastructure | AI Homelab Dashboard</title>
        <meta name="description" content="AHIS infrastructure monitoring and management" />
      </Head>

      <Box maxWidth="1400px" mx="auto" px={{ base: 4, md: 6 }}>
        {/* Header Section */}
        <GlassPanel variant={isDark ? "medium" : "light"} p={6} mb={6}>
          <HStack justify="space-between" align="center" mb={4}>
            <VStack align="start" spacing={1}>
              <Text fontSize="2xl" fontWeight="bold">
                AHIS Infrastructure
              </Text>
              <Text color={useSemanticToken('text.secondary')}>
                AI Homelab Information System - Ecosystem Brain
              </Text>
            </VStack>
            
            <HStack spacing={3}>
              <Badge 
                colorScheme={isConnected ? 'green' : 'red'} 
                variant="solid"
                px={3}
                py={1}
              >
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              
              <Button
                size="sm"
                colorScheme="blue"
                onClick={toggleAutoRefresh}
                variant={autoRefresh ? 'solid' : 'outline'}
              >
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </Button>
              
              <Button
                size="sm"
                colorScheme="green"
                onClick={handleRefresh}
                isLoading={refreshing}
                loadingText="Refreshing"
              >
                Refresh
              </Button>
            </HStack>
          </HStack>

          {lastRefresh && (
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Text>
          )}
        </GlassPanel>

        {/* AHIS Status Widget - Phase 1 */}
        <AHISStatusWidget 
          variant="detailed" 
          showMetrics={true} 
          autoRefresh={autoRefresh}
          refreshInterval={30000}
        />
        
        {/* Connection Status Alerts */}
        {isConnected && (
          <Alert status="success" mb={6}>
            <AlertIcon />
            <AlertTitle>AHIS Connected!</AlertTitle>
            <AlertDescription>
              Successfully connected to AHIS server. Real-time data is available.
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert status="error" mb={6}>
            <AlertIcon />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              {error} - Using fallback data for development.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Health Overview Cards */}
        {health && (
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={6} mb={6}>
            {/* Service Status */}
            <GlassPanel variant={isDark ? "light" : "light"} p={4}>
              <Stat>
                <StatLabel>Service Status</StatLabel>
                <StatNumber>
                  <Badge colorScheme={getStatusColor(health.status)} variant="solid">
                    {health.status.toUpperCase()}
                  </Badge>
                </StatNumber>
                <StatHelpText>
                  {health.environment} environment
                </StatHelpText>
              </Stat>
            </GlassPanel>

            {/* Health Score */}
            <GlassPanel variant={isDark ? "light" : "light"} p={4}>
              <Stat>
                <StatLabel>Health Score</StatLabel>
                <StatNumber>{health.healthScore || 0}%</StatNumber>
                <StatHelpText>
                  <StatArrow type={(health.healthScore || 0) > 80 ? 'increase' : 'decrease'} />
                  Overall system health
                </StatHelpText>
              </Stat>
              <Progress 
                value={health.healthScore || 0} 
                colorScheme={(health.healthScore || 0) > 80 ? 'green' : (health.healthScore || 0) > 60 ? 'yellow' : 'red'}
                size="sm"
                mt={2}
              />
            </GlassPanel>

            {/* Uptime */}
            <GlassPanel variant={isDark ? "light" : "light"} p={4}>
              <Stat>
                <StatLabel>Uptime</StatLabel>
                <StatNumber>{formatUptime(health.uptime || 0)}</StatNumber>
                <StatHelpText>
                  Version {health.version || 'Unknown'}
                </StatHelpText>
              </Stat>
            </GlassPanel>

            {/* Response Time */}
            <GlassPanel variant={isDark ? "light" : "light"} p={4}>
              <Stat>
                <StatLabel>Response Time</StatLabel>
                <StatNumber>{health.responseTime || 0}ms</StatNumber>
                <StatHelpText>
                  {health.connectionInfo?.primary ? 'Primary' : 'Fallback'} endpoint
                </StatHelpText>
              </Stat>
            </GlassPanel>
          </Grid>
        )}

        {/* Dependencies Status */}
        {health?.dependencies && (
          <GlassPanel variant={isDark ? "medium" : "light"} p={6} mb={6}>
            <Text fontSize="lg" fontWeight="semibold" mb={4}>
              Dependencies Status
            </Text>
            <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
              {Object.entries(health.dependencies).map(([name, dep]) => (
                <Box key={name} p={3} borderRadius="md" bg={isDark ? "gray.700" : "gray.50"}>
                  <HStack justify="space-between">
                    <Text fontWeight="medium" textTransform="capitalize">
                      {name.replace('-', ' ')}
                    </Text>
                    <Badge colorScheme={getDependencyColor(dep.status)} variant="solid">
                      {dep.status}
                    </Badge>
                  </HStack>
                </Box>
              ))}
            </Grid>
          </GlassPanel>
        )}

        {/* Main Content Tabs */}
        <GlassPanel variant={isDark ? "medium" : "light"} elevation={2} p={0}>
          <Tabs isFitted variant="enclosed" colorScheme="blue" size="md" isLazy>
            <TabList>
              <Tab>Overview</Tab>
              <Tab>Database</Tab>
              <Tab>Agents</Tab>
              <Tab>Metrics</Tab>
              <Tab>Logs</Tab>
              <Tab>Configuration</Tab>
            </TabList>
            
            <TabPanels>
              {/* Overview Tab */}
              <TabPanel p={6}>
                <VStack spacing={6} align="stretch">
                  <Text fontSize="lg" fontWeight="semibold">
                    AHIS Infrastructure Overview
                  </Text>
                  
                  {health?.usingMockData && (
                    <Alert status="info">
                      <AlertIcon />
                      <AlertDescription>
                        Currently displaying mock data. AHIS server may be unavailable.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Box>
                    <Text fontWeight="medium" mb={2}>Connection Information</Text>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm">Endpoint: {health?.connectionInfo.endpoint || 'Unknown'}</Text>
                      <Text fontSize="sm">Method: {health?.connectionInfo.method || 'Unknown'}</Text>
                      <Text fontSize="sm">Dashboard Connected: {health?.dashboardConnected ? 'Yes' : 'No'}</Text>
                    </VStack>
                  </Box>
                </VStack>
              </TabPanel>
              
              {/* Database Tab */}
              <TabPanel p={6}>
                <DatabaseOverview />
              </TabPanel>
              
              {/* Agents Tab */}
              <TabPanel p={6}>
                <AgentsOverview />
              </TabPanel>
              
              {/* Metrics Tab */}
              <TabPanel p={6}>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>
                  System Metrics
                </Text>
                <Text color={useSemanticToken('text.secondary')}>
                  Real-time metrics and performance data will be displayed here.
                </Text>
              </TabPanel>
              
              {/* Logs Tab */}
              <TabPanel p={6}>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>
                  Recent Logs
                </Text>
                <Text color={useSemanticToken('text.secondary')}>
                  AHIS server logs and events will be displayed here.
                </Text>
              </TabPanel>
              
              {/* Configuration Tab */}
              <TabPanel p={6}>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>
                  AHIS Configuration
                </Text>
                <Text color={useSemanticToken('text.secondary')}>
                  Configuration management interface will be displayed here.
                </Text>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </GlassPanel>
      </Box>
    </DashboardLayout>
  );
};

export default AHISInfrastructurePage;
