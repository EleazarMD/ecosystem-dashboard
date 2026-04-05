import {
  Box,
  Flex,
  Heading,
  Text,
  Alert,
  AlertIcon,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Badge,
  Icon,
  Divider,
  Button,
  Switch,
  FormControl,
  FormLabel,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  HStack,
  StackDivider,
  SimpleGrid,
  Stat
} from '@chakra-ui/react';
import { MdSync, MdCheckCircle, MdWarning, MdErrorOutline, MdInfo, MdWifiTethering, MdNotifications, MdClearAll } from 'react-icons/md';
import { FaDatabase, FaNetworkWired, FaCodeBranch } from 'react-icons/fa';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import GlassPanel from '../ui/GlassPanel';
import { KGAlert, KGMonitoringMetrics, KGSystemHealth, KGAlertSeverity } from "../../types/monitoring";
import { useEcosystemKGMonitoring } from "../../hooks/useEcosystemKGMonitoring";
import { useSemanticToken } from '@/hooks/useSemanticToken';

/**
 * Knowledge Graph Monitoring Component
 * 
 * Displays real-time metrics and status information for the AI Homelab Knowledge Graph
 * Compliant with AI Homelab Ecosystem Communication Standards v2.5
 */
const KnowledgeGraphMonitor: React.FC = () => {
  // State management
  const [metrics, setMetrics] = useState<KGMonitoringMetrics | null>(null);
  const [health, setHealth] = useState<KGSystemHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [useWebSockets, setUseWebSockets] = useState<boolean>(true);
  
  // Connect to WebSocket using ecosystem-compliant implementation
  const {
    isConnected,
    metrics: socketMetrics,
    health: socketHealth,
    alerts: socketAlerts,
    lastUpdated: socketLastUpdated,
    subscribed,
    subscribeToMetrics,
    unsubscribeFromMetrics,
    addTestAlert,
    clearAlerts
  } = useEcosystemKGMonitoring({
    maxAlerts: 20,
    autoSubscribe: useWebSockets
  });
  
  // UI colors and styling
  const pulseColor = 'green.500';
  const bgGradient = useSemanticToken('surface.base');
  const statBgColor = useSemanticToken('surface.highlight');
  const cardBgColor = useSemanticToken('surface.elevated');
  
  // Animation variants for the connection pulse indicator
  const pulseVariants = {
    pulse: {
      scale: [1, 1.1, 1],
      opacity: [0.8, 1, 0.8],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };
  
  // Fetch KG status from API
  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/kg-status');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Transform legacy data to ecosystem standard format if needed
      if (data.metrics && !data.metrics.operations) {
        // Legacy metrics format conversion
        const transformedMetrics: KGMonitoringMetrics = {
          operations: {
            total: data.metrics.operationCount || 0,
            success: data.metrics.operationCount ? data.metrics.operationCount - Math.round((data.metrics.operationCount * data.metrics.errorRate) / 100) : 0,
            failed: data.metrics.operationCount ? Math.round((data.metrics.operationCount * data.metrics.errorRate) / 100) : 0,
            byType: {} // Required by the interface
          },
          errors: {
            count: data.metrics.operationCount ? Math.round((data.metrics.operationCount * data.metrics.errorRate) / 100) : 0,
            byType: {},
            byCode: {}
          },
          performance: {
            avgResponseTime: data.metrics.averageDuration || 0,
            p95ResponseTime: data.metrics.averageDuration ? data.metrics.averageDuration * 1.5 : 0,
            p99ResponseTime: data.metrics.averageDuration ? data.metrics.averageDuration * 2 : 0,
            maxResponseTime: data.metrics.averageDuration ? data.metrics.averageDuration * 3 : 0,
            minResponseTime: data.metrics.averageDuration ? data.metrics.averageDuration * 0.5 : 0
          },
          resources: {
            activeConnections: data.metrics.activeOperations || 0,
            dbConnections: Math.round((data.metrics.activeOperations || 0) * 0.7),
            cpuUsage: 35,
            memoryUsage: 42
          },
          throughput: {
            requestsPerSecond: data.metrics.operationCount ? data.metrics.operationCount / 60 : 0,
            queriesPerSecond: data.metrics.operationCount ? data.metrics.operationCount / 80 : 0,
            nodesProcessed: 0
          },
          security: {
            activeRequests: data.metrics.activeOperations || 0,
            deniedRequests: 0,
            authFailures: 0
          },
          lastUpdated: new Date().toISOString()
        };
        setMetrics(transformedMetrics);
      } else {
        setMetrics(data.metrics);
      }
      
      // Set health data
      if (data.health) {
        setHealth(data.health);
      }
      
      // Update last updated time
      setLastUpdated(new Date().toLocaleString());
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, []);
  
  // Use socket data if available and websockets are enabled
  useEffect(() => {
    if (useWebSockets && socketMetrics) {
      setMetrics(socketMetrics);
    }
    
    if (useWebSockets && socketHealth) {
      setHealth(socketHealth);
    }
    
    if (useWebSockets && socketLastUpdated) {
      setLastUpdated(socketLastUpdated.toLocaleString());
    }
  }, [socketMetrics, socketHealth, socketLastUpdated, useWebSockets]);
  
  // Initial fetch on mount
  useEffect(() => {
    if (!useWebSockets) {
      fetchStatus();
    }
  }, [fetchStatus, useWebSockets]);
  
  // Function to get status color based on status string
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'operational':
      case 'healthy':
        return 'green';
      case 'degraded':
        return 'yellow';
      case 'critical':
      case 'offline':
        return 'red';
      default:
        return 'gray';
    }
  };
  
  // Function to get appropriate icon based on status
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'operational':
      case 'healthy':
        return <Icon as={MdCheckCircle} color="green.500" />;
      case 'degraded':
        return <Icon as={MdWarning} color="yellow.500" />;
      case 'critical':
      case 'offline':
        return <Icon as={MdErrorOutline} color="red.500" />;
      default:
        return <Icon as={MdInfo} color={useSemanticToken('text.secondary')} />;
    }
  };
  
  // Format duration in milliseconds to readable format
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  // Format alert timestamp
  const formatAlertTime = (timestamp: number | string | Date): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (err) {
      return 'Invalid time';
    }
  };
  
  // Get alert severity color
  const getAlertSeverityColor = (severity: KGAlertSeverity): string => {
    switch (severity) {
      case 'info': return 'blue';
      case 'warning': return 'yellow';
      case 'error': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };
  
  // AlertMenu component for alert actions
  const AlertMenuComponent = () => (
    <Menu>
      <MenuButton as={Button} size="sm" variant="ghost" leftIcon={<MdNotifications />}>
        Alerts
      </MenuButton>
      <MenuList>
        <MenuItem onClick={() => addTestAlert('info')} icon={<MdInfo />}>
          Add Info Alert
        </MenuItem>
        <MenuItem onClick={() => addTestAlert('warning')} icon={<MdWarning />}>
          Add Warning Alert
        </MenuItem>
        <MenuItem onClick={() => addTestAlert('error')} icon={<MdErrorOutline />}>
          Add Error Alert
        </MenuItem>
        <MenuItem onClick={() => addTestAlert('critical')} icon={<MdErrorOutline color="red" />}>
          Add Critical Alert
        </MenuItem>
        <MenuItem onClick={() => clearAlerts()} icon={<MdClearAll />}>
          Clear All Alerts
        </MenuItem>
      </MenuList>
    </Menu>
  );

  return (
    <Box>
      <GlassPanel mb={4}>
        <Flex mb={4} justifyContent="space-between" alignItems="center">
          <Heading size="md" display="flex" alignItems="center">
            <Icon as={FaDatabase} mr={2} color="purple.500" />
            Knowledge Graph Monitoring
          </Heading>
          <Flex>
            <FormControl display="flex" alignItems="center" mr={4}>
              <FormLabel htmlFor="real-time-toggle" mb="0" fontSize="sm">
                Real-time Updates
              </FormLabel>
              <Switch
                id="real-time-toggle"
                colorScheme="green"
                isChecked={useWebSockets}
                onChange={() => setUseWebSockets(!useWebSockets)}
              />
            </FormControl>
            <Tooltip label="Refresh Metrics">
              <Button
                size="sm"
                leftIcon={<MdSync />}
                onClick={fetchStatus}
                isLoading={loading}
                variant="outline"
              >
                Refresh
              </Button>
            </Tooltip>
          </Flex>
        </Flex>

        {error && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Metrics Section */}
        {metrics && (
          <Box mb={4}>
            <Heading size="sm" mb={3}>System Metrics</Heading>
            <HStack spacing={4} align="flex-start" flexWrap={{base: "wrap", md: "nowrap"}}>
              <Stat bg={statBgColor} p={3} borderRadius="md">
                <StatLabel display="flex" alignItems="center">
                  <Icon as={FaCodeBranch} mr={1} /> Operations
                </StatLabel>
                <StatNumber>{metrics.operations.total.toLocaleString()}</StatNumber>
                <StatHelpText>
                  Success Rate: {metrics.operations.total > 0 
                    ? ((metrics.operations.success / metrics.operations.total) * 100).toFixed(1) 
                    : 0}%
                </StatHelpText>
              </Stat>

              <Stat bg={statBgColor} p={3} borderRadius="md">
                <StatLabel display="flex" alignItems="center">
                  <Icon as={MdWifiTethering} mr={1} /> Response Time
                </StatLabel>
                <StatNumber>{formatDuration(metrics.performance.avgResponseTime)}</StatNumber>
                <StatHelpText>
                  P95: {formatDuration(metrics.performance.p95ResponseTime)}
                </StatHelpText>
              </Stat>

              <Stat bg={statBgColor} p={3} borderRadius="md">
                <StatLabel display="flex" alignItems="center">
                  <Icon as={FaNetworkWired} mr={1} /> Throughput
                </StatLabel>
                <StatNumber>
                  {metrics.throughput.requestsPerSecond.toFixed(1)}/sec
                </StatNumber>
                <StatHelpText>
                  Active: {metrics.resources.activeConnections}
                </StatHelpText>
              </Stat>
            </HStack>

            <Box mt={4}>
              <Flex justifyContent="space-between" alignItems="center" mb={2}>
                <Text fontWeight="semibold">CPU Usage</Text>
                <Text>{metrics.resources.cpuUsage}%</Text>
              </Flex>
              <Progress
                value={metrics.resources.cpuUsage}
                size="sm"
                colorScheme={
                  metrics.resources.cpuUsage > 80 ? "red" :
                  metrics.resources.cpuUsage > 60 ? "yellow" : "green"
                }
                borderRadius="full"
                mb={3}
              />

              <Flex justifyContent="space-between" alignItems="center" mb={2}>
                <Text fontWeight="semibold">Memory Usage</Text>
                <Text>{metrics.resources.memoryUsage}%</Text>
              </Flex>
              <Progress
                value={metrics.resources.memoryUsage}
                size="sm"
                colorScheme={
                  metrics.resources.memoryUsage > 80 ? "red" :
                  metrics.resources.memoryUsage > 60 ? "yellow" : "green"
                }
                borderRadius="full"
              />
            </Box>
          </Box>
        )}

        {/* Health Status Section */}
        {health && (
          <Box mb={4}>
            <Flex justify="space-between" align="center" mb={3}>
              <Heading size="sm">System Health</Heading>
              <Badge colorScheme={getStatusColor(health.status)} px={2} py={1}>
                {health.status}
              </Badge>
            </Flex>

            <Box mb={4} p={3} bg={cardBgColor} borderRadius="md" boxShadow="sm">
              <HStack spacing={4} divider={<StackDivider />} align="flex-start" flexWrap={{base: "wrap", md: "nowrap"}}>
                <Box p={4}>
                  <Flex justify="space-between" mb={2}>
                    <Text fontWeight="semibold">Database</Text>
                    <Badge colorScheme={getStatusColor(health.components.database.status)}>
                      {health.components.database.status}
                    </Badge>
                  </Flex>
                  <Box>
                    <Text fontSize="sm" display="flex" justifyContent="space-between">
                      <span>Connections:</span>
                      <span>{health.components.database.connections}</span>
                    </Text>
                    {health.components.database.message && (
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                        {health.components.database.message}
                      </Text>
                    )}
                  </Box>
                </Box>

                <Box p={4}>
                  <Flex justify="space-between" mb={2}>
                    <Text fontWeight="semibold">API</Text>
                    <Badge colorScheme={getStatusColor(health.components.api.status)}>
                      {health.components.api.status}
                    </Badge>
                  </Flex>
                  <Box>
                    <Text fontSize="sm" display="flex" justifyContent="space-between">
                      <span>Latency:</span>
                      <span>{health.components.api.latency}ms</span>
                    </Text>
                    {health.components.api.message && (
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                        {health.components.api.message}
                      </Text>
                    )}
                  </Box>
                </Box>

                <Box p={4}>
                  <Flex justify="space-between" mb={2}>
                    <Text fontWeight="semibold">Indexer</Text>
                    <Badge colorScheme={getStatusColor(health.components.indexer.status)}>
                      {health.components.indexer.status}
                    </Badge>
                  </Flex>
                  <Box>
                    <Text fontSize="sm" display="flex" justifyContent="space-between">
                      <span>Backlog:</span>
                      <span>{health.components.indexer.backlogSize}</span>
                    </Text>
                    {health.components.indexer.message && (
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                        {health.components.indexer.message}
                      </Text>
                    )}
                  </Box>
                </Box>
                
                <Box p={4}>
                  <Flex justify="space-between" mb={2}>
                    <Text fontWeight="semibold">Query Engine</Text>
                    <Badge colorScheme={getStatusColor(health.components.queryEngine.status)}>
                      {health.components.queryEngine.status}
                    </Badge>
                  </Flex>
                  <Box>
                    <Text fontSize="sm" display="flex" justifyContent="space-between">
                      <span>Cache Hit Rate:</span>
                      <span>{(health.components.queryEngine.cacheHitRate * 100).toFixed(1)}%</span>
                    </Text>
                    {health.components.queryEngine.message && (
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                        {health.components.queryEngine.message}
                      </Text>
                    )}
                  </Box>
                </Box>
              </HStack>
            </Box>
          </Box>
        )}

        {/* System Alerts Section */}
        {socketAlerts && socketAlerts.length > 0 && (
          <Box mt={4}>
            <Flex justify="space-between" align="center" mb={2}>
              <Heading size="sm">Recent Alerts</Heading>
              <Badge variant="subtle" colorScheme="purple">
                {socketAlerts.length} {socketAlerts.length === 1 ? 'alert' : 'alerts'}
              </Badge>
            </Flex>
            <Box maxH="200px" overflowY="auto" p={2} borderRadius="md" borderWidth="1px" borderColor={useSemanticToken('border.default')}>
              {socketAlerts.map(alert => (
                <Flex 
                  key={alert.id} 
                  p={2} 
                  mb={2} 
                  borderRadius="md" 
                  bg={useSemanticToken('surface.highlight')} 
                  alignItems="center"
                >
                  <Badge colorScheme={getAlertSeverityColor(alert.severity)} mr={2}>{alert.severity}</Badge>
                  <Text fontSize="sm" flex="1">{alert.message}</Text>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{formatAlertTime(alert.timestamp)}</Text>
                </Flex>
              ))}
              {socketAlerts.length === 0 && (
                <Text fontSize="sm" color={useSemanticToken('text.secondary')} textAlign="center">No recent alerts</Text>
              )}
            </Box>
          </Box>
        )}

        {/* Connection Status */}
        <Flex justify="space-between" align="center" mt={4}>
          <HStack>
            {useWebSockets && (
              <Badge colorScheme={isConnected ? 'green' : 'orange'} variant="subtle" px={2} py={1}>
                {isConnected ? 'Ecosystem WebSocket Connected' : 'Ecosystem WebSocket Disconnected'}
              </Badge>
            )}
            <AlertMenuComponent />
          </HStack>

          {lastUpdated && (
            <Text fontSize="xs" textAlign="right" color={useSemanticToken('text.secondary')}>
              Last updated: {lastUpdated} {useWebSockets && isConnected && '(real-time)'}
            </Text>
          )}
        </Flex>
      </GlassPanel>
    </Box>
  );
};

export default KnowledgeGraphMonitor;
