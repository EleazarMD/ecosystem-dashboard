/**
 * Agent Performance Monitor
 * 
 * Real-time performance monitoring and optimization dashboard for agents
 * with metrics visualization, alerts, and recommendations
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Badge,
  Progress,
  SimpleGrid,
  IconButton,
  Tooltip,
  useToast,
  Alert,
  AlertIcon,
  Select,
  Switch,
  FormControl,
  FormLabel,
  Divider,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Button,
  ButtonGroup,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Code,
  useDisclosure,
  Collapse,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb
} from '@chakra-ui/react';
import {
  FaChartLine,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaMemory,
  FaMicrochip,
  FaNetworkWired,
  FaDatabase,
  FaSync,
  FaPlay,
  FaPause,
  FaBolt,
  FaEye,
  FaChevronDown,
  FaCogs,
  FaRocket,
  FaShieldAlt
} from 'react-icons/fa';

interface Agent {
  id: string;
  name: string;
  description: string;
  version: string;
  type: string;
  status: 'active' | 'inactive' | 'error' | 'configuring' | 'deploying' | 'stopping';
  platform: string;
  lastHeartbeat: string;
  capabilities: Record<string, boolean>;
  performance: {
    responseTime: number;
    throughput: number;
    uptime: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
    networkIO: number;
    diskIO: number;
  };
  metrics: {
    requestsPerMinute: number;
    avgResponseTime: number;
    peakResponseTime: number;
    successRate: number;
    queueLength: number;
    activeConnections: number;
  };
  alerts: PerformanceAlert[];
  recommendations: OptimizationRecommendation[];
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface OptimizationRecommendation {
  id: string;
  category: 'resource' | 'configuration' | 'scaling' | 'caching';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedImprovement: string;
  implementationCost: 'low' | 'medium' | 'high';
  autoApplicable: boolean;
}

interface MetricTrend {
  timestamp: string;
  value: number;
}

interface AgentPerformanceMonitorProps {
  agents: Agent[];
  onOptimizationApply: (agentId: string, recommendationId: string) => Promise<void>;
  onAlertAcknowledge: (agentId: string, alertId: string) => Promise<void>;
}

export const AgentPerformanceMonitor: React.FC<AgentPerformanceMonitorProps> = ({
  agents,
  onOptimizationApply,
  onAlertAcknowledge
}) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [metricHistory, setMetricHistory] = useState<Record<string, MetricTrend[]>>({});
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [alertThresholds, setAlertThresholds] = useState({
    cpuThreshold: 80,
    memoryThreshold: 85,
    errorRateThreshold: 5,
    responseTimeThreshold: 1000
  });

  const { isOpen: isAlertsOpen, onToggle: onAlertsToggle } = useDisclosure();
  const { isOpen: isThresholdsOpen, onToggle: onThresholdsToggle } = useDisclosure();
  const toast = useToast();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Auto-refresh metrics
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate real-time metric updates
      const now = new Date().toISOString();
      setMetricHistory(prev => {
        const updated = { ...prev };
        agents.forEach(agent => {
          if (!updated[agent.id]) updated[agent.id] = [];
          updated[agent.id] = [
            ...updated[agent.id].slice(-29),
            {
              timestamp: now,
              value: agent.performance.responseTime + (Math.random() - 0.5) * 100
            }
          ];
        });
        return updated;
      });
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, agents]);

  const getMetricColor = (value: number, threshold: number, inverted = false) => {
    const isHigh = inverted ? value < threshold * 0.5 : value > threshold;
    const isMedium = inverted ? 
      value < threshold * 0.8 && value >= threshold * 0.5 : 
      value > threshold * 0.7 && value <= threshold;
    
    if (isHigh) return 'red';
    if (isMedium) return 'yellow';
    return 'green';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <FaExclamationTriangle color="red" />;
      case 'warning': return <FaExclamationTriangle color="orange" />;
      case 'info': return <FaCheckCircle color="blue" />;
      default: return <FaExclamationTriangle />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const handleOptimizationApply = async (recommendationId: string) => {
    if (!selectedAgent) return;
    
    try {
      await onOptimizationApply(selectedAgent.id, recommendationId);
      toast({
        title: 'Optimization Applied',
        description: 'The optimization has been successfully applied to the agent.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Optimization Failed',
        description: error instanceof Error ? error.message : 'Failed to apply optimization',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading as="h2" size="md">Performance Monitoring</Heading>
        <HStack spacing={4}>
          <FormControl display="flex" alignItems="center">
            <FormLabel fontSize="sm" mb="0" mr="2">Auto Refresh</FormLabel>
            <Switch 
              isChecked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
              size="sm"
            />
          </FormControl>
          {autoRefresh && (
            <Select size="sm" value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} maxW="100px">
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
            </Select>
          )}
          <IconButton
            size="sm"
            icon={<FaSync />}
            onClick={() => {/* Force refresh */}}
            aria-label="Refresh metrics"
          />
        </HStack>
      </Flex>

      {/* Agent Selection */}
      <Card variant="outline">
        <CardHeader>
          <HStack justify="space-between">
            <Text fontWeight="semibold">Select Agent for Detailed Monitoring</Text>
            <Badge colorScheme="blue">{agents.length} agents monitored</Badge>
          </HStack>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {agents.map(agent => (
              <Card
                key={agent.id}
                variant={selectedAgent?.id === agent.id ? 'filled' : 'outline'}
                cursor="pointer"
                onClick={() => setSelectedAgent(agent)}
                _hover={{ shadow: 'md' }}
              >
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                      <Text fontWeight="semibold" fontSize="sm">{agent.name}</Text>
                      <Badge colorScheme={agent.status === 'active' ? 'green' : 'gray'}>
                        {agent.status}
                      </Badge>
                    </HStack>
                    
                    <SimpleGrid columns={2} spacing={2}>
                      <Box>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Response Time</Text>
                        <Text fontSize="sm" fontWeight="semibold">
                          {agent.performance.responseTime}ms
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>CPU Usage</Text>
                        <Text fontSize="sm" fontWeight="semibold">
                          {agent.performance.cpuUsage}%
                        </Text>
                      </Box>
                    </SimpleGrid>

                    <HStack spacing={2}>
                      {agent.alerts.filter(a => !a.acknowledged).length > 0 && (
                        <Badge colorScheme="red" size="sm">
                          {agent.alerts.filter(a => !a.acknowledged).length} alerts
                        </Badge>
                      )}
                      {agent.recommendations.filter(r => r.priority === 'high').length > 0 && (
                        <Badge colorScheme="orange" size="sm">
                          {agent.recommendations.filter(r => r.priority === 'high').length} recs
                        </Badge>
                      )}
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Performance Metrics Dashboard */}
      {selectedAgent && (
        <>
          {/* Key Metrics Overview */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Stat>
              <StatLabel>Response Time</StatLabel>
              <StatNumber color={getMetricColor(selectedAgent.performance.responseTime, alertThresholds.responseTimeThreshold)}>
                {selectedAgent.performance.responseTime}ms
              </StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                +12ms from avg
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel>CPU Usage</StatLabel>
              <StatNumber color={getMetricColor(selectedAgent.performance.cpuUsage, alertThresholds.cpuThreshold)}>
                {selectedAgent.performance.cpuUsage}%
              </StatNumber>
              <StatHelpText>
                <StatArrow type="decrease" />
                -5% from peak
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel>Memory Usage</StatLabel>
              <StatNumber color={getMetricColor(selectedAgent.performance.memoryUsage, alertThresholds.memoryThreshold)}>
                {selectedAgent.performance.memoryUsage}%
              </StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                +8% from baseline
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel>Success Rate</StatLabel>
              <StatNumber color={getMetricColor(selectedAgent.metrics.successRate, 95, true)}>
                {selectedAgent.metrics.successRate}%
              </StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                +0.2% improvement
              </StatHelpText>
            </Stat>
          </SimpleGrid>

          {/* Detailed Performance Cards */}
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            {/* Resource Utilization */}
            <Card variant="outline">
              <CardHeader>
                <HStack>
                  <FaMicrochip />
                  <Text fontWeight="semibold">Resource Utilization</Text>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm">CPU Usage</Text>
                      <Text fontSize="sm">{selectedAgent.performance.cpuUsage}%</Text>
                    </HStack>
                    <Progress 
                      value={selectedAgent.performance.cpuUsage} 
                      colorScheme={getMetricColor(selectedAgent.performance.cpuUsage, alertThresholds.cpuThreshold)}
                    />
                  </Box>
                  
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm">Memory Usage</Text>
                      <Text fontSize="sm">{selectedAgent.performance.memoryUsage}%</Text>
                    </HStack>
                    <Progress 
                      value={selectedAgent.performance.memoryUsage} 
                      colorScheme={getMetricColor(selectedAgent.performance.memoryUsage, alertThresholds.memoryThreshold)}
                    />
                  </Box>
                  
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm">Network I/O</Text>
                      <Text fontSize="sm">{selectedAgent.performance.networkIO} MB/s</Text>
                    </HStack>
                    <Progress value={selectedAgent.performance.networkIO} colorScheme="blue" />
                  </Box>
                  
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm">Disk I/O</Text>
                      <Text fontSize="sm">{selectedAgent.performance.diskIO} MB/s</Text>
                    </HStack>
                    <Progress value={selectedAgent.performance.diskIO} colorScheme="purple" />
                  </Box>
                </VStack>
              </CardBody>
            </Card>

            {/* Request Metrics */}
            <Card variant="outline">
              <CardHeader>
                <HStack>
                  <FaChartLine />
                  <Text fontWeight="semibold">Request Metrics</Text>
                </HStack>
              </CardHeader>
              <CardBody>
                <SimpleGrid columns={2} spacing={4}>
                  <Box textAlign="center">
                    <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                      {selectedAgent.metrics.requestsPerMinute}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Requests/min</Text>
                  </Box>
                  
                  <Box textAlign="center">
                    <Text fontSize="2xl" fontWeight="bold" color="green.500">
                      {selectedAgent.metrics.avgResponseTime}ms
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Avg Response</Text>
                  </Box>
                  
                  <Box textAlign="center">
                    <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                      {selectedAgent.metrics.queueLength}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Queue Length</Text>
                  </Box>
                  
                  <Box textAlign="center">
                    <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                      {selectedAgent.metrics.activeConnections}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Active Connections</Text>
                  </Box>
                </SimpleGrid>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Alerts */}
          <Card variant="outline">
            <CardHeader>
              <HStack justify="space-between">
                <HStack>
                  <FaExclamationTriangle />
                  <Text fontWeight="semibold">Active Alerts</Text>
                  <Badge colorScheme="red">{selectedAgent.alerts.filter(a => !a.acknowledged).length}</Badge>
                </HStack>
                <Button size="sm" variant="ghost" onClick={onAlertsToggle}>
                  <FaEye />
                </Button>
              </HStack>
            </CardHeader>
            <Collapse in={isAlertsOpen}>
              <CardBody pt={0}>
                {selectedAgent.alerts.filter(a => !a.acknowledged).length === 0 ? (
                  <Alert status="success">
                    <AlertIcon />
                    No active alerts for this agent
                  </Alert>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {selectedAgent.alerts.filter(a => !a.acknowledged).map(alert => (
                      <Alert key={alert.id} status={alert.type === 'critical' ? 'error' : 'warning'}>
                        <AlertIcon />
                        <Box flex="1">
                          <Text fontWeight="semibold" fontSize="sm">{alert.message}</Text>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                            {alert.metric}: {alert.currentValue} (threshold: {alert.threshold})
                          </Text>
                        </Box>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => onAlertAcknowledge(selectedAgent.id, alert.id)}
                        >
                          Acknowledge
                        </Button>
                      </Alert>
                    ))}
                  </VStack>
                )}
              </CardBody>
            </Collapse>
          </Card>

          {/* Optimization Recommendations */}
          {showRecommendations && selectedAgent.recommendations.length > 0 && (
            <Card variant="outline">
              <CardHeader>
                <HStack justify="space-between">
                  <HStack>
                    <FaRocket />
                    <Text fontWeight="semibold">Optimization Recommendations</Text>
                    <Badge colorScheme="blue">{selectedAgent.recommendations.length}</Badge>
                  </HStack>
                  <Switch 
                    isChecked={showRecommendations} 
                    onChange={(e) => setShowRecommendations(e.target.checked)}
                    size="sm"
                  />
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  {selectedAgent.recommendations.map(recommendation => (
                    <Card key={recommendation.id} variant="outline" size="sm">
                      <CardBody>
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={2} flex={1}>
                            <HStack>
                              <Badge colorScheme={getPriorityColor(recommendation.priority)}>
                                {recommendation.priority}
                              </Badge>
                              <Badge variant="outline">{recommendation.category}</Badge>
                            </HStack>
                            <Text fontWeight="semibold" fontSize="sm">{recommendation.title}</Text>
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{recommendation.description}</Text>
                            <Text fontSize="xs" color="green.500">
                              Expected improvement: {recommendation.expectedImprovement}
                            </Text>
                          </VStack>
                          <VStack spacing={2}>
                            {recommendation.autoApplicable && (
                              <Button
                                size="xs"
                                colorScheme="blue"
                                onClick={() => handleOptimizationApply(recommendation.id)}
                              >
                                Auto Apply
                              </Button>
                            )}
                            <Badge variant="outline">
                              {recommendation.implementationCost} cost
                            </Badge>
                          </VStack>
                        </HStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Alert Thresholds Configuration */}
          <Card variant="outline">
            <CardHeader>
              <HStack justify="space-between">
                <HStack>
                  <FaCogs />
                  <Text fontWeight="semibold">Alert Thresholds</Text>
                </HStack>
                <Button size="sm" variant="ghost" onClick={onThresholdsToggle}>
                  <FaChevronDown />
                </Button>
              </HStack>
            </CardHeader>
            <Collapse in={isThresholdsOpen}>
              <CardBody pt={0}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <FormControl>
                    <FormLabel fontSize="sm">CPU Threshold (%)</FormLabel>
                    <Slider
                      value={alertThresholds.cpuThreshold}
                      onChange={(val) => setAlertThresholds(prev => ({ ...prev, cpuThreshold: val }))}
                      min={50}
                      max={100}
                      step={5}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Current: {alertThresholds.cpuThreshold}%</Text>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel fontSize="sm">Memory Threshold (%)</FormLabel>
                    <Slider
                      value={alertThresholds.memoryThreshold}
                      onChange={(val) => setAlertThresholds(prev => ({ ...prev, memoryThreshold: val }))}
                      min={50}
                      max={100}
                      step={5}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Current: {alertThresholds.memoryThreshold}%</Text>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel fontSize="sm">Error Rate Threshold (%)</FormLabel>
                    <Slider
                      value={alertThresholds.errorRateThreshold}
                      onChange={(val) => setAlertThresholds(prev => ({ ...prev, errorRateThreshold: val }))}
                      min={1}
                      max={20}
                      step={1}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Current: {alertThresholds.errorRateThreshold}%</Text>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel fontSize="sm">Response Time Threshold (ms)</FormLabel>
                    <Slider
                      value={alertThresholds.responseTimeThreshold}
                      onChange={(val) => setAlertThresholds(prev => ({ ...prev, responseTimeThreshold: val }))}
                      min={100}
                      max={5000}
                      step={100}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Current: {alertThresholds.responseTimeThreshold}ms</Text>
                  </FormControl>
                </SimpleGrid>
              </CardBody>
            </Collapse>
          </Card>
        </>
      )}

      {/* No Agent Selected */}
      {!selectedAgent && (
        <Alert status="info">
          <AlertIcon />
          Select an agent above to view detailed performance metrics and optimization recommendations
        </Alert>
      )}
    </VStack>
  );
};
