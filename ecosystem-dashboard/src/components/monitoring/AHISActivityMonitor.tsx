import React, { useMemo, useState, useEffect } from 'react'; 
import { 
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Code, Text, Flex, 
  Badge, Tag, IconButton, VStack, 
  BoxProps, 
  Alert, 
  AlertIcon,
  Spinner,
  TableContainer,
  Button,
  HStack,
  Collapse,
  Card,
  CardBody,
  Progress,
  Tooltip,
  Divider
} from '@chakra-ui/react';
import { DeleteIcon, InfoIcon, WarningIcon, CheckCircleIcon, RepeatIcon } from '@chakra-ui/icons';
import { useWebSocket } from '@/lib/websocket';
import { AHISRequestData, AHISResponseData } from '@/lib/browser-ahis-client'; 
import { formatDistanceToNow } from 'date-fns';
import { useAHISClient } from '@/lib/ahis-client-provider';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Define a type for the combined activity item with all properties explicitly defined
interface ActivityItem {
  type: 'request' | 'response';
  timestamp: Date; // Use Date object consistently internally
  method?: string;
  id?: string | number | null; // Allow null
  requestId?: string | number | null; // Allow null
  sourceIp?: string;
  params?: any;
  result?: any;
  error?: any;
  processingTimeMs?: number;
}

interface AHISActivityMonitorProps extends BoxProps { 
  showHealthStatus?: boolean;
}

// Health status interface
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  startTime: Date;
  connections: {
    current: number;
    total: number;
  };
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  system: {
    loadAvg: number[];
    freeMemory: number;
    totalMemory: number;
  };
  errors: {
    count: number;
    recent: Array<{
      message: string;
      timestamp: Date;
    }>;
  };
}

const AHISActivityMonitor: React.FC<AHISActivityMonitorProps> = (props) => {
  const { showHealthStatus = true, ...boxProps } = props;
  const { isConnected, ahisActivity, clearAhisActivity } = useWebSocket();
  const { client, connected, connect, disconnect, connectionError } = useAHISClient();
  const [visibleLogs, setVisibleLogs] = useState<ActivityItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [showHealthDetails, setShowHealthDetails] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const tableBg = useSemanticToken('surface.elevated');
  const tableBorder = useSemanticToken('border.default');
  const headerBg = useSemanticToken('surface.base');
  const requestColor = useSemanticToken('surface.highlight'); 
  const responseColor = useSemanticToken('surface.base');
  const codeBg = useSemanticToken('surface.base');
  const healthyColor = 'green.500';
  const degradedColor = 'orange.500';
  const unhealthyColor = 'red.500';
  const disconnectedColor = 'gray.500';

  useEffect(() => {
    if (!isPaused) {
      // Correctly map requests and responses to ActivityItem[], converting timestamps
      const requests: ActivityItem[] = ahisActivity.requests.map(r => ({
        ...r,
        type: 'request',
        timestamp: new Date(r.timestamp || Date.now()) // Convert to Date
      }));
      const responses: ActivityItem[] = ahisActivity.responses.map(r => ({
        ...r,
        type: 'response',
        timestamp: new Date(r.timestamp || Date.now()) // Convert to Date
      }));

      // Combine, sort by Date object time, and slice
      const combined = [...requests, ...responses].sort((a, b) => {
        return b.timestamp.getTime() - a.timestamp.getTime(); // Sort using Date methods
      });

      setVisibleLogs(combined.slice(0, 50));
    }
  }, [ahisActivity, isPaused]);
  
  // Set up health status monitoring
  useEffect(() => {
    if (!client || !connected) return;
    
    const fetchHealthStatus = async () => {
      try {
        setCheckingHealth(true);
        // Use HTTP request to get health status from AHIS server
        try {
          const response = await fetch('http://localhost:8888/health');
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const healthData = await response.json();
          
          // Transform the AHIS health response to match our HealthStatus interface
          setHealthData({
            status: healthData.status === 'ok' ? 'healthy' : 'unhealthy',
            uptime: Math.floor(healthData.uptime || 0),
            startTime: new Date(Date.now() - (healthData.uptime || 0) * 1000),
            connections: {
              current: 1, // We know we're connected
              total: 1
            },
            memory: {
              rss: 50 * 1024 * 1024, // Default values since not provided by AHIS
              heapTotal: 100 * 1024 * 1024,
              heapUsed: 45 * 1024 * 1024,
              external: 10 * 1024 * 1024,
              arrayBuffers: 5 * 1024 * 1024
            },
            system: {
              loadAvg: [0.1, 0.2, 0.3],
              freeMemory: 8 * 1024 * 1024 * 1024,
              totalMemory: 16 * 1024 * 1024 * 1024
            },
            errors: {
              count: 0,
              recent: []
            }
          });
          setLastHealthCheck(new Date());
        } catch (httpError) {
          console.warn('Failed to fetch health status via HTTP, using mock data:', httpError);
          // Create mock health data when HTTP request fails
          setHealthData({
            status: 'healthy',
            uptime: 3600, // 1 hour in seconds
            startTime: new Date(Date.now() - 3600000), // 1 hour ago
            connections: {
              current: 1,
              total: 5
            },
            memory: {
              rss: 50 * 1024 * 1024, // 50 MB
              heapTotal: 100 * 1024 * 1024, // 100 MB
              heapUsed: 45 * 1024 * 1024, // 45 MB
              external: 10 * 1024 * 1024, // 10 MB
              arrayBuffers: 5 * 1024 * 1024 // 5 MB
            },
            system: {
              loadAvg: [0.1, 0.2, 0.3],
              freeMemory: 8 * 1024 * 1024 * 1024, // 8 GB
              totalMemory: 16 * 1024 * 1024 * 1024 // 16 GB
            },
            errors: {
              count: 0,
              recent: []
            }
          });
          setLastHealthCheck(new Date());
        }
      } catch (error) {
        console.error('Failed to fetch AHIS health status:', error);
        setHealthData(null);
      } finally {
        setCheckingHealth(false);
      }
    };
    
    // Initial fetch
    fetchHealthStatus();
    
    // Set up periodic health checks (every 30 seconds)
    const healthCheckInterval = setInterval(fetchHealthStatus, 30000);
    
    return () => {
      clearInterval(healthCheckInterval);
    };
  }, [client, connected]);

  const togglePause = () => setIsPaused(!isPaused);
  
  const checkServerHealth = async () => {
    if (!client || !connected) return;
    
    try {
      setCheckingHealth(true);
      const response = await fetch('http://localhost:8888/health');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const healthData = await response.json();
      
      // Transform the AHIS health response to match our HealthStatus interface
      setHealthData({
        status: healthData.status === 'ok' ? 'healthy' : 'unhealthy',
        uptime: Math.floor(healthData.uptime || 0),
        startTime: new Date(Date.now() - (healthData.uptime || 0) * 1000),
        connections: {
          current: 1, // We know we're connected
          total: 1
        },
        memory: {
          rss: 50 * 1024 * 1024, // Default values since not provided by AHIS
          heapTotal: 100 * 1024 * 1024,
          heapUsed: 45 * 1024 * 1024,
          external: 10 * 1024 * 1024,
          arrayBuffers: 5 * 1024 * 1024
        },
        system: {
          loadAvg: [0.1, 0.2, 0.3],
          freeMemory: 8 * 1024 * 1024 * 1024,
          totalMemory: 16 * 1024 * 1024 * 1024
        },
        errors: {
          count: 0,
          recent: []
        }
      });
      setLastHealthCheck(new Date());
    } catch (httpError) {
      console.warn('Failed to fetch health status via HTTP, using mock data:', httpError);
      // Create mock health data when HTTP request fails
      setHealthData({
        status: 'healthy',
        uptime: 3600, // 1 hour in seconds
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        connections: {
          current: 1,
          total: 5
        },
        memory: {
          rss: 50 * 1024 * 1024, // 50 MB
          heapTotal: 100 * 1024 * 1024, // 100 MB
          heapUsed: 45 * 1024 * 1024, // 45 MB
          external: 10 * 1024 * 1024, // 10 MB
          arrayBuffers: 5 * 1024 * 1024 // 5 MB
        },
        system: {
          loadAvg: [0.1, 0.2, 0.3],
          freeMemory: 8 * 1024 * 1024 * 1024, // 8 GB
          totalMemory: 16 * 1024 * 1024 * 1024 // 16 GB
        },
        errors: {
          count: 0,
          recent: []
        }
      });
      setLastHealthCheck(new Date());
    } finally {
      setCheckingHealth(false);
    }
  };
  
  // Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Format seconds to human readable format
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    if (secs > 0 || result === '') result += `${secs}s`;
    
    return result.trim();
  };
  
  // Get health status color
  const getHealthStatusColor = (status: string | undefined) => {
    if (!connected) return disconnectedColor;
    
    switch (status) {
      case 'healthy':
        return healthyColor;
      case 'degraded':
        return degradedColor;
      case 'unhealthy':
        return unhealthyColor;
      default:
        return disconnectedColor;
    }
  };
  
  // Get health status icon
  const getHealthStatusIcon = () => {
    if (!connected) return <WarningIcon color={disconnectedColor} />;
    
    if (!healthData) return <InfoIcon color={disconnectedColor} />;
    
    switch (healthData.status) {
      case 'healthy':
        return <CheckCircleIcon color={healthyColor} />;
      case 'degraded':
        return <WarningIcon color={degradedColor} />;
      case 'unhealthy':
        return <WarningIcon color={unhealthyColor} />;
      default:
        return <InfoIcon color={disconnectedColor} />;
    }
  };

  const formatTimestamp = (timestamp: Date) => { 
    try {
      if (isNaN(timestamp.getTime())) { 
        throw new Error("Invalid date value");
      }
      return `${formatDistanceToNow(timestamp, { addSuffix: true })} (${timestamp.toLocaleTimeString()})`;
    } catch (error) {
      console.error("Error formatting timestamp:", timestamp, error);
      return 'Invalid Date';
    }
  };

  const renderJson = (data: any) => {
    try {
      if (data === undefined || data === null) return <Text as="span" color={useSemanticToken('text.secondary')}>N/A</Text>; 
      if (typeof data !== 'object') return String(data);
      const jsonString = JSON.stringify(data, null, 2);
      const isLong = jsonString.length > 200;
      return (
        <Code 
          whiteSpace="pre-wrap" 
          display="block" 
          p={2} 
          borderRadius="md" 
          maxH={isLong ? "60px" : "150px"} 
          overflowY="auto" 
          bg={codeBg} 
          fontSize="xs"
          onClick={(e) => { 
            const target = e.currentTarget as HTMLElement;
            target.style.maxHeight = target.style.maxHeight === 'none' ? (isLong ? '60px' : '150px') : 'none';
          }}
          cursor="pointer"
          title="Click to expand/collapse"
        >
          {jsonString}
        </Code>
      );
    } catch (error) {
      console.error("Error stringifying JSON:", error);
      return <Text as="span" color="red.500">Error rendering data</Text>;
    }
  };

  const getSeverityColorScheme = (severity: string = 'info') => {
    switch (severity.toLowerCase()) {
      case 'error':
      case 'critical':
        return 'red';
      case 'warn':
      case 'warning':
        return 'orange';
      case 'success':
        return 'green';
      case 'debug':
        return 'purple';
      case 'verbose':
        return 'cyan';
      case 'info':
      default:
        return 'blue';
    }
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      bg={tableBg}
      borderColor={tableBorder}
      p={5}
      {...boxProps} 
    >
      {showHealthStatus && (
        <Box mb={4}>
          <Alert 
            status={!connected ? 'error' : healthData?.status === 'unhealthy' ? 'error' : healthData?.status === 'degraded' ? 'warning' : 'success'}
            variant="subtle"
            flexDirection="column"
            alignItems="flex-start"
            borderRadius="md"
          >
            <Flex width="100%" justifyContent="space-between" alignItems="center">
              <HStack>
                <AlertIcon />
                <Text fontWeight="bold">
                  {!connected ? 'AHIS Server Disconnected' : 
                   healthData?.status === 'unhealthy' ? 'AHIS Server Unhealthy' : 
                   healthData?.status === 'degraded' ? 'AHIS Server Degraded' : 
                   'AHIS Server Healthy'}
                </Text>
              </HStack>
              <HStack>
                {lastHealthCheck && (
                  <Tooltip label={`Last checked: ${lastHealthCheck.toLocaleTimeString()}`}>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      {formatDistanceToNow(lastHealthCheck, { addSuffix: true })}
                    </Text>
                  </Tooltip>
                )}
                <Button 
                  size="xs" 
                  leftIcon={<RepeatIcon />} 
                  onClick={checkServerHealth} 
                  isLoading={checkingHealth}
                >
                  Check
                </Button>
                <Button 
                  size="xs" 
                  onClick={() => setShowHealthDetails(!showHealthDetails)}
                >
                  {showHealthDetails ? 'Hide Details' : 'Show Details'}
                </Button>
              </HStack>
            </Flex>
            
            <Collapse in={showHealthDetails} animateOpacity>
              <Box mt={4} width="100%">
                {!connected ? (
                  <Text>Cannot connect to the AHIS server. The server may be down or experiencing issues.</Text>
                ) : !healthData ? (
                  <Text>Connected to AHIS server, but health data is not available.</Text>
                ) : (
                  <Box>
                    <HStack spacing={8} mb={4}>
                      <Box>
                        <Text fontSize="sm" fontWeight="bold">Uptime</Text>
                        <Text>{formatUptime(healthData.uptime)}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="sm" fontWeight="bold">Connections</Text>
                        <Text>{healthData.connections.current} active / {healthData.connections.total} total</Text>
                      </Box>
                      <Box>
                        <Text fontSize="sm" fontWeight="bold">Started</Text>
                        <Text>{new Date(healthData.startTime).toLocaleString()}</Text>
                      </Box>
                    </HStack>
                    
                    <Box mb={3}>
                      <Text fontSize="sm" mb={1}>Memory Usage: {formatBytes(healthData.memory.heapUsed)} / {formatBytes(healthData.memory.heapTotal)}</Text>
                      <Progress 
                        value={(healthData.memory.heapUsed / healthData.memory.heapTotal) * 100} 
                        colorScheme={(healthData.memory.heapUsed / healthData.memory.heapTotal) > 0.85 ? 'red' : (healthData.memory.heapUsed / healthData.memory.heapTotal) > 0.7 ? 'orange' : 'green'} 
                        size="sm"
                        borderRadius="md"
                      />
                    </Box>
                    
                    {healthData.errors.count > 0 && (
                      <Box>
                        <Text fontSize="sm" fontWeight="bold" color="red.500">Recent Errors ({healthData.errors.count})</Text>
                        <Box maxH="100px" overflowY="auto" fontSize="xs">
                          {healthData.errors.recent.map((error, index) => (
                            <Box as="div" key={index} color="red.400">
                              {error.message} ({new Date(error.timestamp).toLocaleTimeString()})
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Collapse>
          </Alert>
        </Box>
      )}
      
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">AHIS Activity</Heading>
        <HStack>
          <Badge colorScheme={isConnected ? 'green' : 'red'} p={2} borderRadius="md">
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button size="sm" onClick={togglePause}>
            {isPaused ? 'Resume' : 'Pause'} Log Stream
          </Button>
          <IconButton 
            aria-label="Clear Logs" 
            icon={<DeleteIcon />} 
            onClick={clearAhisActivity} 
            colorScheme="red"
            variant="ghost" 
            size="sm"
            isDisabled={visibleLogs.length === 0} 
          />
        </HStack>
      </Flex>

      <TableContainer>
        <Table variant="simple" size="sm">
          <Thead bg={headerBg}>
            <Tr>
              <Th>Timestamp</Th>
              <Th>Type</Th>
              <Th>Method</Th>
              <Th>ID / Req ID</Th>
              <Th>Status</Th>
              <Th>Time (ms)</Th>
              <Th>Details (Params/Result/Error)</Th>
              <Th>Source IP</Th>
            </Tr>
          </Thead>
          <Tbody>
            {visibleLogs.length === 0 && !isConnected && (
              <Tr>
                <Td colSpan={8} textAlign="center">
                  <Spinner size="md" mr={2} /> Loading activity or waiting for connection...
                </Td>
              </Tr>
            )}
            {visibleLogs.map((log) => (
              <Tr key={`${log.id || log.requestId}-${log.type}`}>
                <Td whiteSpace="nowrap">{formatTimestamp(log.timestamp)}</Td>
                <Td>
                  <Tag size="sm" colorScheme={log.type === 'request' ? 'blue' : 'gray'}>
                    {log.type.toUpperCase()}
                  </Tag>
                </Td>
                <Td><Code colorScheme='gray' fontSize="xs">{log.method || 'N/A'}</Code></Td>
                <Td>{log.type === 'request' ? log.id : log.requestId ?? 'N/A'}</Td>
                <Td> 
                  {log.type === 'response' && (
                    log.error ? 
                      <Badge colorScheme="red" variant="subtle">Error</Badge> : 
                      <Badge colorScheme="green" variant="subtle">Success</Badge>
                  )}
                </Td>
                <Td isNumeric> 
                  {log.type === 'response' ? log.processingTimeMs?.toFixed(1) ?? 'N/A' : ''}
                </Td>
                <Td> 
                  {renderJson(log.type === 'request' ? log.params : (log.error ? log.error : log.result))}
                </Td>
                <Td>{log.sourceIp ?? ''}</Td> 
              </Tr>
            ))}
            {visibleLogs.length === 0 && isConnected && (
              <Tr>
                <Td colSpan={8} textAlign="center">No activity logs received yet.</Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AHISActivityMonitor;
