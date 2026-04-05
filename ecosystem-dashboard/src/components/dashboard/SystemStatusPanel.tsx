import React from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Grid,
  HStack,
  VStack,
  Badge,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { GlassPanel } from '../ui/GlassPanel';
import { 
  MdCheckCircle,
  MdWarning,
  MdError,
  MdOutlineSpeed,
  MdOutlineMonitorHeart,
  MdOutlineStorage,
  MdOutlineMemory
} from 'react-icons/md';
import { FaServer, FaNetworkWired, FaDatabase, FaExchangeAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface SystemComponent {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'critical' | 'unknown';
  metrics?: {
    cpuUsage?: number;
    memoryUsage?: number;
    responseTime?: number;
    uptime?: number;
    connectionCount?: number;
  };
  icon?: React.ElementType;
  description?: string;
}

export interface SystemStatusData {
  overallStatus: 'operational' | 'degraded' | 'critical' | 'unknown';
  components: SystemComponent[];
  lastUpdated: Date | string;
}

interface SystemStatusPanelProps {
  data: SystemStatusData;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({ 
  data, 
  isLoading = false, 
  onRefresh 
}) => {
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  
  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'operational': return 'green.500';
      case 'degraded': return 'orange.500';
      case 'critical': return 'red.500';
      default: return 'gray.500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string): React.ElementType => {
    switch (status) {
      case 'operational': return MdCheckCircle;
      case 'degraded': return MdWarning;
      case 'critical': return MdError;
      default: return MdWarning;
    }
  };

  // Get component icon
  const getComponentIcon = (component: SystemComponent): React.ElementType => {
    if (component.icon) return component.icon;
    
    switch (component.id) {
      case 'system': return FaServer;
      case 'knowledgegraph': return FaDatabase;
      case 'mcp': return FaExchangeAlt;
      case 'gateway': return FaNetworkWired;
      default: return FaServer;
    }
  };

  // Format time display
  const formatTime = (timestamp: Date | string): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString();
  };

  // Pulse animation for real-time updates
  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const getMetricIcon = (metricName: string): React.ElementType => {
    switch(metricName) {
      case 'cpuUsage': return MdOutlineSpeed;
      case 'memoryUsage': return MdOutlineMemory;
      case 'responseTime': return MdOutlineSpeed;
      case 'connectionCount': return FaNetworkWired;
      default: return MdOutlineMonitorHeart;
    }
  };

  const renderMetric = (label: string, value: number, unit: string, icon: React.ElementType, max = 100) => {
    const percentage = Math.min(value, max);
    const isHighValue = percentage > 80;
    
    return (
      <Box mb={2}>
        <HStack mb={1}>
          <Icon as={icon} color={isHighValue ? 'orange.500' : 'gray.500'} />
          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{label}</Text>
          <Text fontSize="xs" fontWeight="bold" ml="auto">
            {value}{unit}
          </Text>
        </HStack>
        <Progress 
          size="xs" 
          value={percentage} 
          colorScheme={isHighValue ? 'orange' : 'blue'} 
          borderRadius="full" 
        />
      </Box>
    );
  };

  return (
    <GlassPanel
      variant="medium"
      elevation={2}
      animated={true}
      hoverEffect={true}
      p={4}
      position="relative"
      overflow="hidden"
    >
      {/* Header with overall status */}
      <Flex justify="space-between" align="center" mb={4}>
        <HStack>
          <Heading size="md">System Status</Heading>
          <Badge 
            colorScheme={data.overallStatus === 'operational' ? 'green' : 
                       data.overallStatus === 'degraded' ? 'orange' : 
                       data.overallStatus === 'critical' ? 'red' : 'gray'}
            variant="solid"
            fontSize="xs"
            textTransform="uppercase"
            px={2}
            py={0.5}
            borderRadius="full"
          >
            {data.overallStatus}
          </Badge>
        </HStack>
        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
          Last updated: {formatTime(data.lastUpdated)}
        </Text>
      </Flex>

      {/* Components grid */}
      <Grid 
        templateColumns={{
          base: "repeat(1, 1fr)",
          md: "repeat(2, 1fr)",
          lg: "repeat(2, 1fr)",
          xl: "repeat(4, 1fr)"
        }}
        gap={4}
      >
        {data.components.map(component => {
          const statusColor = getStatusColor(component.status);
          const StatusIcon = getStatusIcon(component.status);
          const ComponentIcon = getComponentIcon(component);
          
          return (
            <GlassPanel 
              key={component.id}
              variant="light"
              elevation={1}
              hoverEffect={true}
              p={4}
            >
              <HStack mb={2} spacing={2}>
                <Box
                  as={motion.div}
                  variants={component.status !== 'operational' ? pulseVariants : undefined}
                  animate={component.status !== 'operational' ? "pulse" : undefined}
                >
                  <Icon 
                    as={StatusIcon} 
                    boxSize={5} 
                    color={statusColor} 
                  />
                </Box>
                <Icon as={ComponentIcon} boxSize={4} color={useSemanticToken('text.secondary')} />
                <Text fontWeight="medium">{component.name}</Text>
                
                <Badge
                  colorScheme={component.status === 'operational' ? 'green' : 
                            component.status === 'degraded' ? 'orange' : 
                            component.status === 'critical' ? 'red' : 'gray'}
                  variant="subtle"
                  ml="auto"
                >
                  {component.status}
                </Badge>
              </HStack>
              
              {component.metrics && (
                <VStack align="stretch" mt={3} spacing={2}>
                  <Divider mb={1} />
                  
                  {component.metrics.cpuUsage !== undefined && (
                    renderMetric('CPU', component.metrics.cpuUsage, '%', MdOutlineSpeed)
                  )}
                  
                  {component.metrics.memoryUsage !== undefined && (
                    renderMetric('Memory', component.metrics.memoryUsage, '%', MdOutlineMemory)
                  )}
                  
                  {component.metrics.responseTime !== undefined && (
                    renderMetric('Response Time', component.metrics.responseTime, 'ms', MdOutlineSpeed, 1000)
                  )}
                  
                  {component.metrics.connectionCount !== undefined && (
                    <HStack justify="space-between" fontSize="xs">
                      <HStack>
                        <Icon as={FaNetworkWired} color={useSemanticToken('text.secondary')} />
                        <Text color={useSemanticToken('text.secondary')}>Connections</Text>
                      </HStack>
                      <Text fontWeight="bold">{component.metrics.connectionCount}</Text>
                    </HStack>
                  )}
                  
                  {component.metrics.uptime !== undefined && (
                    <HStack justify="space-between" fontSize="xs">
                      <HStack>
                        <Icon as={MdOutlineMonitorHeart} color={useSemanticToken('text.secondary')} />
                        <Text color={useSemanticToken('text.secondary')}>Uptime</Text>
                      </HStack>
                      <Text fontWeight="bold">{component.metrics.uptime.toFixed(1)}%</Text>
                    </HStack>
                  )}
                </VStack>
              )}
              
              {component.description && (
                <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={2}>
                  {component.description}
                </Text>
              )}
            </GlassPanel>
          );
        })}
      </Grid>
    </GlassPanel>
  );
};

export default SystemStatusPanel;
