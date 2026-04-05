import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  Badge,
  Progress,
  Button,
  Tooltip,
  Alert,
  AlertIcon,
  Divider,
  Grid,
  GridItem,
  CircularProgress,
  CircularProgressLabel,
  IconButton
} from '@chakra-ui/react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiCpu,
  FiHardDrive,
  FiWifi,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiRefreshCw,
  FiEye,
  FiZap
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '@/context/SystemStatusContext';
import { useActivityFeed } from '@/context/ActivityFeedContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: number;
  trend: 'up' | 'down' | 'stable';
  status: 'healthy' | 'warning' | 'critical';
  icon: React.ElementType;
  color: string;
}

interface ProactiveAlert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
  actionable: boolean;
  autoResolvable: boolean;
}

const ProactiveMonitoringWidget: React.FC = () => {
  const { services } = useSystemStatus();
  const { activities } = useActivityFeed();

  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [systemHealth, setSystemHealth] = useState(95);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const textColor = useSemanticToken('text.secondary');

  const surfaceHoverColor = useSemanticToken('surface.hover');

  // Calculate system metrics
  useEffect(() => {
    const calculateMetrics = () => {
      const now = new Date();

      // Service availability
      const totalServices = services.length;
      const healthyServices = services.filter(s =>
        s.status === 'OPERATIONAL' || s.status === 'DEGRADED'
      ).length;
      const availability = totalServices > 0 ? (healthyServices / totalServices) * 100 : 100;

      // CPU utilization (average)
      const avgCpuUsage = services.reduce((acc, service) => {
        return acc + ((service as any).cpuUsage || 0);
      }, 0) / (services.length || 1);

      // Memory utilization (simulated)
      const memoryUsage = 60 + Math.sin(Date.now() / 300000) * 15; // Oscillate between 45-75%

      // Network health (based on connectivity issues)
      const networkIssues = activities.filter(a =>
        a.message.toLowerCase().includes('network') ||
        a.message.toLowerCase().includes('connection')
      ).length;
      const networkHealth = Math.max(0, 100 - (networkIssues * 10));

      // Storage usage (simulated)
      const storageUsage = 45 + Math.random() * 20; // Random between 45-65%

      const newMetrics: SystemMetric[] = [
        {
          id: 'availability',
          name: 'Service Availability',
          value: availability,
          unit: '%',
          threshold: 95,
          trend: availability >= 95 ? 'stable' : 'down',
          status: availability >= 95 ? 'healthy' : availability >= 85 ? 'warning' : 'critical',
          icon: FiActivity,
          color: availability >= 95 ? 'green' : availability >= 85 ? 'yellow' : 'red'
        },
        {
          id: 'cpu',
          name: 'CPU Usage',
          value: avgCpuUsage,
          unit: '%',
          threshold: 80,
          trend: avgCpuUsage < 60 ? 'stable' : avgCpuUsage < 80 ? 'up' : 'up',
          status: avgCpuUsage < 70 ? 'healthy' : avgCpuUsage < 85 ? 'warning' : 'critical',
          icon: FiCpu,
          color: avgCpuUsage < 70 ? 'green' : avgCpuUsage < 85 ? 'yellow' : 'red'
        },
        {
          id: 'memory',
          name: 'Memory Usage',
          value: memoryUsage,
          unit: '%',
          threshold: 85,
          trend: 'stable',
          status: memoryUsage < 75 ? 'healthy' : memoryUsage < 90 ? 'warning' : 'critical',
          icon: FiHardDrive,
          color: memoryUsage < 75 ? 'green' : memoryUsage < 90 ? 'yellow' : 'red'
        },
        {
          id: 'network',
          name: 'Network Health',
          value: networkHealth,
          unit: '%',
          threshold: 95,
          trend: networkHealth >= 95 ? 'stable' : 'down',
          status: networkHealth >= 90 ? 'healthy' : networkHealth >= 75 ? 'warning' : 'critical',
          icon: FiWifi,
          color: networkHealth >= 90 ? 'green' : networkHealth >= 75 ? 'yellow' : 'red'
        }
      ];

      setMetrics(newMetrics);

      // Calculate overall system health
      const overallHealth = newMetrics.reduce((acc, metric) => {
        const weight = metric.id === 'availability' ? 0.4 : 0.2; // Availability weighted more
        return acc + (metric.value * weight);
      }, 0);

      setSystemHealth(Math.round(overallHealth));
      setLastUpdate(now);

      // Generate proactive alerts
      const newAlerts: ProactiveAlert[] = [];

      // Service availability alerts
      if (availability < 95) {
        const unhealthyCount = totalServices - healthyServices;
        newAlerts.push({
          id: 'service-availability',
          title: 'Service Availability Alert',
          message: `${unhealthyCount} service(s) are not running properly. System availability is ${Math.round(availability)}%.`,
          severity: availability < 80 ? 'error' : 'warning',
          timestamp: now,
          actionable: true,
          autoResolvable: true
        });
      }

      // CPU usage alerts
      if (avgCpuUsage > 80) {
        newAlerts.push({
          id: 'high-cpu',
          title: 'High CPU Usage',
          message: `Average CPU usage is ${Math.round(avgCpuUsage)}%. Consider optimizing resource allocation.`,
          severity: avgCpuUsage > 90 ? 'error' : 'warning',
          timestamp: now,
          actionable: true,
          autoResolvable: false
        });
      }

      // Memory usage alerts
      if (memoryUsage > 85) {
        newAlerts.push({
          id: 'high-memory',
          title: 'High Memory Usage',
          message: `Memory usage is ${Math.round(memoryUsage)}%. Consider scaling or optimizing memory allocation.`,
          severity: memoryUsage > 95 ? 'error' : 'warning',
          timestamp: now,
          actionable: true,
          autoResolvable: false
        });
      }

      // Network issues
      if (networkIssues > 2) {
        newAlerts.push({
          id: 'network-issues',
          title: 'Network Connectivity Issues',
          message: `Detected ${networkIssues} network-related issues. Check connectivity and firewall settings.`,
          severity: networkIssues > 5 ? 'error' : 'warning',
          timestamp: now,
          actionable: true,
          autoResolvable: false
        });
      }

      setAlerts(newAlerts);
    };

    calculateMetrics();
    const interval = setInterval(calculateMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [services, activities]);

  const getTrendIcon = (trend: SystemMetric['trend']) => {
    switch (trend) {
      case 'up': return FiTrendingUp;
      case 'down': return FiTrendingDown;
      case 'stable': return FiMinus;
    }
  };

  const getTrendColor = (trend: SystemMetric['trend']) => {
    switch (trend) {
      case 'up': return 'red.500';
      case 'down': return 'red.500';
      case 'stable': return 'green.500';
    }
  };

  const handleAutoResolve = async (alertId: string) => {
    // Simulate auto-resolution
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));

    // In a real implementation, this would trigger actual remediation actions
    console.log(`Auto-resolving alert: ${alertId}`);
  };

  const refreshMetrics = () => {
    // Force refresh metrics
    // This is a simplified simulation. In a real app, you'd re-fetch data.
    const now = new Date();
    setLastUpdate(now);
  };

  return (
    <VStack spacing={4} align="stretch" h="100%">

      {/* Metrics Grid */}
      <Grid templateColumns="repeat(2, 1fr)" gap={4}>
        {metrics.map((metric) => (
          <GridItem key={metric.id}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                p={4}
                bg={surfaceHoverColor}
                borderRadius="md"
                borderLeft="3px solid"
                borderLeftColor={`${metric.color}.400`}
              >
                <HStack justify="space-between" mb={2}>
                  <Icon as={metric.icon} w={5} h={5} color={`${metric.color}.500`} />
                  <Icon
                    as={getTrendIcon(metric.trend)}
                    w={4}
                    h={4}
                    color={getTrendColor(metric.trend)}
                  />
                </HStack>

                <Text fontSize="xs" color={textColor} mb={1}>
                  {metric.name}
                </Text>

                <HStack justify="space-between" align="baseline">
                  <Text fontSize="lg" fontWeight="bold">
                    {Math.round(metric.value)}
                    <Text as="span" fontSize="sm" color={textColor}>
                      {metric.unit}
                    </Text>
                  </Text>

                  <Badge size="xs" colorScheme={metric.color}>
                    {metric.status}
                  </Badge>
                </HStack>

                <Progress
                  value={metric.value}
                  colorScheme={metric.color}
                  size="sm"
                  mt={2}
                  borderRadius="full"
                />
              </Box>
            </motion.div>
          </GridItem>
        ))}
      </Grid>

      {/* Proactive Alerts */}
      {alerts.length > 0 && (
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" fontWeight="bold">
              Proactive Alerts
            </Text>
            <Badge colorScheme="yellow" size="sm">{alerts.length} active</Badge>
          </HStack>

          <VStack spacing={2} align="stretch" maxH="200px" overflowY="auto">
            <AnimatePresence>
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert
                    status={alert.severity}
                    borderRadius="md"
                    fontSize="sm"
                    pr={alert.autoResolvable ? 2 : 4}
                  >
                    <AlertIcon />
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="bold">
                        {alert.title}
                      </Text>
                      <Text fontSize="xs">
                        {alert.message}
                      </Text>
                    </Box>

                    {alert.autoResolvable && (
                      <HStack spacing={1}>
                        <Button
                          size="xs"
                          colorScheme="blue"
                          variant="outline"
                          onClick={() => handleAutoResolve(alert.id)}
                        >
                          <Icon as={FiZap} mr={1} />
                          Auto-Fix
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                        >
                          <Icon as={FiEye} />
                        </Button>
                      </HStack>
                    )}
                  </Alert>
                </motion.div>
              ))}
            </AnimatePresence>
          </VStack>
        </Box>
      )}

      {alerts.length === 0 && (
        <Box textAlign="center" py={4}>
          <Icon as={FiCheckCircle} w={8} h={8} color="green.400" mb={2} />
          <Text fontSize="sm" color={textColor}>
            All systems operating normally
          </Text>
          <Text fontSize="xs" color={textColor}>
            Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Loading...'}
          </Text>
        </Box>
      )}
    </VStack>
  );
};

export default ProactiveMonitoringWidget;
