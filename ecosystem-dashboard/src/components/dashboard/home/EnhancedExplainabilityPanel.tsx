import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  Divider,
  Spinner,
  Alert,
  AlertIcon,
  IconButton,
  Badge,
  Progress,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Tooltip,
  Button,
  Collapse,
  useDisclosure
} from '@chakra-ui/react';
import {
  FiMessageSquare,
  FiRefreshCw,
  FiTrendingUp,
  FiEye,
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiZap,
  FiBarChart,
  FiTarget
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useExplainability } from '@/context/ExplainabilityContext';
import { useSystemStatus } from '@/context/SystemStatusContext';
import { useActivityFeed } from '@/context/ActivityFeedContext';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Insight {
  id: string;
  title: string;
  content: string;
  type: 'observation' | 'recommendation' | 'prediction' | 'analysis';
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  timestamp: Date;
  actionable: boolean;
  tags: string[];
}

interface SystemHealth {
  overall: number;
  services: number;
  performance: number;
  stability: number;
  trend: 'improving' | 'stable' | 'declining';
}

const EnhancedExplainabilityPanel: React.FC = () => {
  const { explanation, loading, error, refreshExplanation } = useExplainability();
  const { services } = useSystemStatus();
  const { activities } = useActivityFeed();

  const [insights, setInsights] = useState<Insight[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const { isOpen: showDetails, onToggle: toggleDetails } = useDisclosure();

  const bgColor = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.secondary');
  const accentColor = useSemanticToken('interactive.primary');

  const surfaceHoverColor = useSemanticToken('surface.hover');
  const surfaceBaseColor = useSemanticToken('surface.base');

  // Generate real-time insights
  useEffect(() => {
    const generateInsights = () => {
      const newInsights: Insight[] = [];
      const now = new Date();

      // Service health insights
      const unhealthyServices = services.filter(s =>
        s.status !== 'OPERATIONAL' && s.status !== 'DEGRADED'
      );
      if (unhealthyServices.length > 0) {
        newInsights.push({
          id: 'service-health',
          title: 'Service Health Alert',
          content: `${unhealthyServices.length} service(s) require attention: ${unhealthyServices.map(s => s.name).join(', ')}`,
          type: 'recommendation',
          priority: 'high',
          confidence: 0.95,
          timestamp: now,
          actionable: true,
          tags: ['services', 'health', 'critical']
        });
      }

      // Performance insights
      const highCpuServices = services.filter(s =>
        (s as any).cpuUsage && (s as any).cpuUsage > 80
      );
      if (highCpuServices.length > 0) {
        newInsights.push({
          id: 'performance-cpu',
          title: 'High CPU Usage Detected',
          content: `${highCpuServices.length} service(s) showing high CPU usage. Consider resource optimization.`,
          type: 'observation',
          priority: 'medium',
          confidence: 0.85,
          timestamp: now,
          actionable: true,
          tags: ['performance', 'cpu', 'optimization']
        });
      }

      // Activity pattern analysis
      const recentErrors = activities.filter(a => a.type === 'error').length;
      if (recentErrors > 3) {
        newInsights.push({
          id: 'error-pattern',
          title: 'Increased Error Rate',
          content: `${recentErrors} errors detected in recent activity. This may indicate a systemic issue.`,
          type: 'analysis',
          priority: 'high',
          confidence: 0.80,
          timestamp: now,
          actionable: true,
          tags: ['errors', 'stability', 'investigation']
        });
      }

      // Predictive insights
      const totalServices = services.length;
      const healthyServices = services.filter(s =>
        s.status === 'OPERATIONAL' || s.status === 'DEGRADED'
      ).length;
      const healthPercentage = totalServices > 0 ? (healthyServices / totalServices) * 100 : 100;

      if (healthPercentage >= 90) {
        newInsights.push({
          id: 'system-stable',
          title: 'System Operating Optimally',
          content: `${Math.round(healthPercentage)}% of services are healthy. Good time for proactive maintenance or feature development.`,
          type: 'prediction',
          priority: 'low',
          confidence: 0.90,
          timestamp: now,
          actionable: false,
          tags: ['health', 'stability', 'opportunity']
        });
      }

      setInsights(newInsights);

      // Calculate system health metrics
      const overallHealth = healthPercentage;
      const avgCpu = 15; // Mock CPU usage for now since ServiceStatus doesn't have cpuUsage
      const performanceScore = Math.max(0, 100 - avgCpu);
      const errorRate = Math.min(recentErrors / 10 * 100, 100);
      const stabilityScore = Math.max(0, 100 - errorRate);

      const trend = overallHealth > 95 ? 'improving' :
        overallHealth > 85 ? 'stable' : 'declining';

      setSystemHealth({
        overall: overallHealth,
        services: healthPercentage,
        performance: performanceScore,
        stability: stabilityScore,
        trend
      });
    };

    generateInsights();
    const interval = setInterval(generateInsights, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [services, activities]);

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'observation': return FiEye;
      case 'recommendation': return FiZap;
      case 'prediction': return FiTrendingUp;
      case 'analysis': return FiBarChart;
      default: return FiMessageSquare;
    }
  };

  const getInsightColor = (priority: Insight['priority']) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'blue';
    }
  };

  const getTrendIcon = (trend: SystemHealth['trend']) => {
    switch (trend) {
      case 'improving': return FiTrendingUp;
      case 'stable': return FiCheckCircle;
      case 'declining': return FiAlertCircle;
    }
  };

  const getTrendColor = (trend: SystemHealth['trend']) => {
    switch (trend) {
      case 'improving': return 'green';
      case 'stable': return 'blue';
      case 'declining': return 'red';
    }
  };

  return (
    <GlassPanel p={6} h="100%" minH="600px">
      <VStack align="stretch" spacing={6} h="100%">
        {/* Header */}
        <HStack justify="space-between">
          <HStack spacing={3}>
            <Icon as={FiMessageSquare} w={6} h={6} color={accentColor} />
            <VStack align="start" spacing={0}>
              <Heading size="md">Agent Insights</Heading>
              <Text fontSize="xs" color={textColor}>
                Real-time system analysis
              </Text>
            </VStack>
          </HStack>

          <HStack spacing={2}>
            {systemHealth && (
              <Badge
                colorScheme={getTrendColor(systemHealth.trend)}
                variant="subtle"
              >
                <Icon as={getTrendIcon(systemHealth.trend)} mr={1} />
                {systemHealth.trend}
              </Badge>
            )}
            <Tooltip label="Refresh insights">
              <IconButton
                aria-label="Refresh insights"
                icon={<FiRefreshCw />}
                onClick={refreshExplanation}
                isLoading={loading}
                size="sm"
                variant="ghost"
              />
            </Tooltip>
          </HStack>
        </HStack>

        <Divider />

        {/* System Health Overview */}
        {systemHealth && (
          <Box>
            <HStack justify="space-between" mb={3}>
              <Text fontSize="sm" fontWeight="bold">System Health Overview</Text>
              <Text fontSize="xs" color={textColor}>
                Overall: {Math.round(systemHealth.overall)}%
              </Text>
            </HStack>

            <VStack spacing={3}>
              <Box w="100%">
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs">Services</Text>
                  <Text fontSize="xs">{Math.round(systemHealth.services)}%</Text>
                </HStack>
                <Progress
                  value={systemHealth.services}
                  colorScheme="green"
                  size="sm"
                  borderRadius="full"
                />
              </Box>

              <Box w="100%">
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs">Performance</Text>
                  <Text fontSize="xs">{Math.round(systemHealth.performance)}%</Text>
                </HStack>
                <Progress
                  value={systemHealth.performance}
                  colorScheme="blue"
                  size="sm"
                  borderRadius="full"
                />
              </Box>

              <Box w="100%">
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs">Stability</Text>
                  <Text fontSize="xs">{Math.round(systemHealth.stability)}%</Text>
                </HStack>
                <Progress
                  value={systemHealth.stability}
                  colorScheme="purple"
                  size="sm"
                  borderRadius="full"
                />
              </Box>
            </VStack>
          </Box>
        )}

        <Divider />

        {/* Tabbed Interface */}
        <Box flex={1}>
          <Tabs
            index={activeTab}
            onChange={setActiveTab}
            variant="soft-rounded"
            colorScheme="blue"
            size="sm"
          >
            <TabList>
              <Tab fontSize="xs">Insights ({insights.length})</Tab>
              <Tab fontSize="xs">Explanations</Tab>
              <Tab fontSize="xs">History</Tab>
            </TabList>

            <TabPanels h="100%">
              {/* Real-time Insights */}
              <TabPanel p={0} pt={4}>
                <VStack spacing={3} align="stretch" maxH="300px" overflowY="auto">
                  <AnimatePresence>
                    {insights.map((insight) => (
                      <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Box
                          p={3}
                          bg={surfaceHoverColor}
                          borderRadius="md"
                          borderLeft="3px solid"
                          borderLeftColor={`${getInsightColor(insight.priority)}.400`}
                        >
                          <HStack justify="space-between" mb={2}>
                            <HStack spacing={2}>
                              <Icon
                                as={getInsightIcon(insight.type)}
                                w={4}
                                h={4}
                                color={`${getInsightColor(insight.priority)}.500`}
                              />
                              <Text fontSize="sm" fontWeight="bold">
                                {insight.title}
                              </Text>
                            </HStack>

                            <HStack spacing={1}>
                              <Badge
                                size="xs"
                                colorScheme={getInsightColor(insight.priority)}
                              >
                                {insight.priority}
                              </Badge>
                              <Badge size="xs" variant="outline">
                                {Math.round(insight.confidence * 100)}%
                              </Badge>
                            </HStack>
                          </HStack>

                          <Text fontSize="xs" color={textColor} mb={2}>
                            {insight.content}
                          </Text>

                          <HStack justify="space-between">
                            <HStack spacing={1}>
                              {insight.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} size="xs" variant="subtle">
                                  {tag}
                                </Badge>
                              ))}
                            </HStack>

                            <HStack spacing={2}>
                              <Text fontSize="xs" color={textColor}>
                                <Icon as={FiClock} mr={1} />
                                {insight.timestamp.toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </Text>

                              {insight.actionable && (
                                <Button size="xs" variant="ghost" colorScheme="blue">
                                  <Icon as={FiTarget} mr={1} />
                                  Act
                                </Button>
                              )}
                            </HStack>
                          </HStack>
                        </Box>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {insights.length === 0 && (
                    <Box textAlign="center" py={8}>
                      <Icon as={FiCheckCircle} w={8} h={8} color="green.400" mb={2} />
                      <Text fontSize="sm" color={textColor}>
                        System running smoothly
                      </Text>
                      <Text fontSize="xs" color={textColor}>
                        No immediate insights to display
                      </Text>
                    </Box>
                  )}
                </VStack>
              </TabPanel>

              {/* Traditional Explanations */}
              <TabPanel p={0} pt={4}>
                {loading && !explanation && (
                  <VStack justify="center" h="200px">
                    <Spinner />
                    <Text fontSize="sm">Generating explanations...</Text>
                  </VStack>
                )}

                {error && (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">{error}</Text>
                  </Alert>
                )}

                {explanation && (
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <Heading size="sm" mb={2} color={accentColor}>
                        Why this layout?
                      </Heading>
                      <Text fontSize="sm" color={textColor}>
                        {explanation.layout}
                      </Text>
                    </Box>

                    <Divider />

                    <Box>
                      <Heading size="sm" mb={2} color={accentColor}>
                        What am I seeing?
                      </Heading>
                      <Text fontSize="sm" color={textColor}>
                        {explanation.widgets}
                      </Text>
                    </Box>

                    <Divider />

                    <Box>
                      <Heading size="sm" mb={2} color={accentColor}>
                        Agent Reasoning
                      </Heading>
                      <Text fontStyle="italic" fontSize="sm" color={textColor}>
                        {explanation.reasoning}
                      </Text>
                    </Box>
                  </VStack>
                )}
              </TabPanel>

              {/* History/Analytics */}
              <TabPanel p={0} pt={4}>
                <VStack spacing={4} align="stretch">
                  <Text fontSize="sm" color={textColor}>
                    Insight history and analytics will be available here.
                  </Text>

                  <Box p={4} bg={surfaceBaseColor} borderRadius="md">
                    <Text fontSize="xs" fontWeight="bold" mb={2}>
                      Coming Soon
                    </Text>
                    <Text fontSize="xs" color={textColor}>
                      • Historical insight trends
                    </Text>
                    <Text fontSize="xs" color={textColor}>
                      • Accuracy tracking
                    </Text>
                    <Text fontSize="xs" color={textColor}>
                      • Prediction validation
                    </Text>
                  </Box>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>
    </GlassPanel>
  );
};

export default EnhancedExplainabilityPanel;
