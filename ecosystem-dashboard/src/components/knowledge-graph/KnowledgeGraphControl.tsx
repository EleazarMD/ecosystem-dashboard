import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Switch,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Collapse,
  useDisclosure,
  Spinner,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  IconButton,
  Tooltip,
  useToast
} from '@chakra-ui/react';
import {
  ChevronDownIcon, 
  ChevronUpIcon, 
  RepeatIcon, 
  ViewIcon,
  CheckCircleIcon,
  WarningIcon,
  InfoIcon
} from '@chakra-ui/icons';

interface Service {
  key: string;
  name: string;
  port: number;
  status: 'healthy' | 'stopped';
  healthy: boolean;
}

interface SystemStatus {
  services: Service[];
  summary: {
    healthy: number;
    total: number;
    status: 'fully_operational' | 'partially_operational' | 'stopped';
  };
}

interface KnowledgeGraphControlProps {
  refreshInterval?: number;
}

const KnowledgeGraphControl: React.FC<KnowledgeGraphControlProps> = ({ 
  refreshInterval = 30000 
}) => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { isOpen: showDetails, onToggle: toggleDetails } = useDisclosure();
  const { isOpen: showLogs, onToggle: toggleLogs } = useDisclosure();
  const [logs, setLogs] = useState<{ [key: string]: string }>({});
  
  const toast = useToast();

  // Fetch system status
  const fetchSystemStatus = async () => {
    try {
      setError(null);
      const response = await fetch('/api/knowledge-graph/control?action=status');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setSystemStatus(data);
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error('Failed to fetch system status:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch system logs
  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/knowledge-graph/control?action=logs&lines=20');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLogs(data.logs);
        }
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  // Toggle system on/off
  const toggleSystem = async (enable: boolean) => {
    setIsToggling(true);
    try {
      const action = enable ? 'start' : 'stop';
      const response = await fetch('/api/knowledge-graph/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: `Knowledge Graph ${enable ? 'Started' : 'Stopped'}`,
          description: result.message,
          status: 'success',
          duration: 5000,
          isClosable: true
        });
        
        // Refresh status after a delay
        setTimeout(fetchSystemStatus, 2000);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: `Failed to ${enable ? 'start' : 'stop'} Knowledge Graph`,
        description: error.message,
        status: 'error',
        duration: 8000,
        isClosable: true
      });
    } finally {
      setIsToggling(false);
    }
  };

  // Restart system
  const restartSystem = async () => {
    setIsToggling(true);
    try {
      const response = await fetch('/api/knowledge-graph/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Knowledge Graph Restarted',
          description: result.message,
          status: 'success',
          duration: 5000,
          isClosable: true
        });
        
        // Refresh status after a delay
        setTimeout(fetchSystemStatus, 3000);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: 'Failed to restart Knowledge Graph',
        description: error.message,
        status: 'error',
        duration: 8000,
        isClosable: true
      });
    } finally {
      setIsToggling(false);
    }
  };

  // Initial load and refresh interval
  useEffect(() => {
    fetchSystemStatus();
    
    const interval = setInterval(fetchSystemStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Load logs when details are shown
  useEffect(() => {
    if (showDetails) {
      fetchLogs();
    }
  }, [showDetails]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fully_operational': return 'green';
      case 'partially_operational': return 'yellow';
      case 'stopped': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fully_operational': return <CheckCircleIcon color="green.500" />;
      case 'partially_operational': return <WarningIcon color="yellow.500" />;
      case 'stopped': return <InfoIcon color="red.500" />;
      default: return <InfoIcon color={useSemanticToken('text.secondary')} />;
    }
  };

  const isSystemRunning = systemStatus?.summary.status !== 'stopped';
  const healthPercentage = systemStatus ? 
    Math.round((systemStatus.summary.healthy / systemStatus.summary.total) * 100) : 0;

  return (
    <Card maxW="800px" w="full">
      <CardHeader>
        <HStack justify="space-between" align="center">
          <HStack>
            <Heading size="md">Knowledge Graph System</Heading>
            {systemStatus && getStatusIcon(systemStatus.summary.status)}
          </HStack>
          <HStack>
            <Tooltip label="Refresh Status">
              <IconButton
                icon={<RepeatIcon />}
                size="sm"
                variant="ghost"
                onClick={fetchSystemStatus}
                isLoading={isLoading}
                aria-label="Refresh status"
              />
            </Tooltip>
            <Tooltip label="Toggle Details">
              <IconButton
                icon={showDetails ? <ChevronUpIcon /> : <ChevronDownIcon />}
                size="sm"
                variant="ghost"
                onClick={toggleDetails}
                aria-label="Toggle details"
              />
            </Tooltip>
          </HStack>
        </HStack>
      </CardHeader>

      <CardBody>
        <VStack spacing={4} align="stretch">
          {error && (
            <Alert status="error">
              <AlertIcon />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Main Control Section */}
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Text fontSize="lg" fontWeight="semibold">
                System Control
              </Text>
              {systemStatus && (
                <HStack>
                  <Badge colorScheme={getStatusColor(systemStatus.summary.status)}>
                    {systemStatus.summary.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    {systemStatus.summary.healthy}/{systemStatus.summary.total} services healthy
                  </Text>
                </HStack>
              )}
            </VStack>

            <HStack spacing={3}>
              <Button
                size="sm"
                variant="outline"
                onClick={restartSystem}
                isLoading={isToggling}
                isDisabled={!isSystemRunning}
              >
                Restart
              </Button>
              
              <HStack>
                <Text fontSize="sm">
                  {isSystemRunning ? 'ON' : 'OFF'}
                </Text>
                <Switch
                  size="lg"
                  isChecked={isSystemRunning}
                  onChange={(e) => toggleSystem(e.target.checked)}
                  isDisabled={isToggling || isLoading}
                  colorScheme="green"
                />
                {isToggling && <Spinner size="sm" />}
              </HStack>
            </HStack>
          </HStack>

          {/* Health Progress Bar */}
          {systemStatus && (
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium">System Health</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{healthPercentage}%</Text>
              </HStack>
              <Progress 
                value={healthPercentage} 
                colorScheme={getStatusColor(systemStatus.summary.status)}
                size="sm"
                hasStripe
                isAnimated={isSystemRunning}
              />
            </Box>
          )}

          {/* Last Update */}
          {lastUpdate && (
            <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="right">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Text>
          )}

          {/* Detailed Service Status */}
          <Collapse in={showDetails} animateOpacity>
            <VStack spacing={4} align="stretch">
              <Divider />
              
              <HStack justify="space-between">
                <Heading size="sm">Service Details</Heading>
                <Button
                  size="xs"
                  variant="ghost"
                  leftIcon={<ViewIcon />}
                  onClick={toggleLogs}
                >
                  {showLogs ? 'Hide' : 'Show'} Logs
                </Button>
              </HStack>

              {systemStatus && (
                <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={3}>
                  {systemStatus.services.map((service) => (
                    <GridItem key={service.key}>
                      <Box p={3} borderWidth={1} borderRadius="md" bg={useSemanticToken('surface.base')}>
                        <Stat size="sm">
                          <StatLabel>{service.name}</StatLabel>
                          <StatNumber fontSize="md">
                            <HStack>
                              <Badge 
                                colorScheme={service.healthy ? 'green' : 'red'}
                                size="sm"
                              >
                                {service.status}
                              </Badge>
                            </HStack>
                          </StatNumber>
                          <StatHelpText>Port {service.port}</StatHelpText>
                        </Stat>
                      </Box>
                    </GridItem>
                  ))}
                </Grid>
              )}

              {/* System Logs */}
              <Collapse in={showLogs} animateOpacity>
                <Box>
                  <Heading size="xs" mb={2}>Recent Logs</Heading>
                  <Box 
                    maxH="300px" 
                    overflowY="auto" 
                    bg="black" 
                    color="green.300" 
                    p={3} 
                    borderRadius="md"
                    fontSize="xs"
                    fontFamily="mono"
                  >
                    {Object.entries(logs).length > 0 ? (
                      Object.entries(logs).map(([service, log]) => (
                        <Box key={service} mb={2}>
                          <Text color="yellow.300" fontWeight="bold">
                            === {service.toUpperCase()} ===
                          </Text>
                          <Text whiteSpace="pre-wrap">{log}</Text>
                        </Box>
                      ))
                    ) : (
                      <Text color={useSemanticToken('text.tertiary')}>No logs available</Text>
                    )}
                  </Box>
                </Box>
              </Collapse>
            </VStack>
          </Collapse>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default KnowledgeGraphControl;
