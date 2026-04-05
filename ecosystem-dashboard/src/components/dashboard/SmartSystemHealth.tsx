/**
 * Smart System Health - Intelligent Resource Monitoring
 * AI-powered system insights with optimization recommendations
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  SimpleGrid,
  Text,
  Badge,
  VStack,
  HStack,
  Icon,
  Progress,
  Tooltip,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  CircularProgress,
  CircularProgressLabel
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  CpuIcon,
  MemoryStickIcon,
  HardDriveIcon,
  WifiIcon,
  ZapIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ThermometerIcon,
  ActivityIcon
} from 'lucide-react';

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  recommendation?: string;
  icon: any;
  details?: {
    used: number;
    total: number;
    available: number;
  };
}

interface AIRecommendation {
  id: string;
  type: 'optimization' | 'maintenance' | 'upgrade' | 'alert';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  savings?: string;
}

const MotionBox = motion(Box);

export const SmartSystemHealth: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.hover');

  useEffect(() => {
    const fetchSystemData = async () => {
      setLoading(true);
      
      // Simulate system monitoring data
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockMetrics: SystemMetric[] = [
        {
          name: 'CPU Usage',
          value: 34,
          unit: '%',
          status: 'healthy',
          trend: 'stable',
          icon: CpuIcon,
          details: { used: 34, total: 100, available: 66 },
          recommendation: 'Optimal utilization. Consider auto-scaling for ML workloads.'
        },
        {
          name: 'Memory',
          value: 68,
          unit: '%',
          status: 'warning',
          trend: 'up',
          icon: MemoryStickIcon,
          details: { used: 54.4, total: 80, available: 25.6 },
          recommendation: 'Memory usage trending up. Consider clearing inactive processes.'
        },
        {
          name: 'GPU Utilization',
          value: 12,
          unit: '%',
          status: 'healthy',
          trend: 'down',
          icon: ZapIcon,
          details: { used: 12, total: 100, available: 88 },
          recommendation: 'GPU underutilized. Perfect time for training experiments!'
        },
        {
          name: 'Storage',
          value: 45,
          unit: '%',
          status: 'healthy',
          trend: 'up',
          icon: HardDriveIcon,
          details: { used: 2.25, total: 5, available: 2.75 },
          recommendation: 'Storage usage normal. Archive old datasets to free space.'
        },
        {
          name: 'Network I/O',
          value: 23,
          unit: 'MB/s',
          status: 'healthy',
          trend: 'stable',
          icon: WifiIcon,
          details: { used: 23, total: 1000, available: 977 }
        },
        {
          name: 'Temperature',
          value: 42,
          unit: '°C',
          status: 'healthy',
          trend: 'stable',
          icon: ThermometerIcon,
          details: { used: 42, total: 85, available: 43 }
        }
      ];

      const mockRecommendations: AIRecommendation[] = [
        {
          id: '1',
          type: 'optimization',
          title: 'GPU Utilization Opportunity',
          description: 'Your A100 has been idle for 2+ hours. Consider running pending experiments.',
          impact: 'high',
          effort: 'low',
          savings: '$120/day'
        },
        {
          id: '2',
          type: 'maintenance',
          title: 'Memory Cleanup Suggested',
          description: 'Clear inactive Docker containers and free up 12GB of memory.',
          impact: 'medium',
          effort: 'low'
        },
        {
          id: '3',
          type: 'upgrade',
          title: 'Storage Expansion Advisory',
          description: 'Consider adding SSD storage for faster dataset loading.',
          impact: 'medium',
          effort: 'high',
          savings: '40% faster training'
        }
      ];
      
      setMetrics(mockMetrics);
      setRecommendations(mockRecommendations);
      setLoading(false);
    };

    fetchSystemData();
    
    // Update every 30 seconds
    const interval = setInterval(fetchSystemData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={0}>
          <Text fontSize="xl" fontWeight="bold">
            System Intelligence
          </Text>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            AI-powered resource monitoring and optimization
          </Text>
        </VStack>
        <Badge colorScheme="green" variant="subtle">
          All Systems Operational
        </Badge>
      </HStack>

      {/* Metrics Grid */}
      <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={4}>
        {metrics.map((metric, index) => (
          <MotionBox
            key={metric.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            bg={bg}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
            p={4}
            textAlign="center"
          >
            <VStack spacing={3}>
              <Box
                p={2}
                bg={`${getStatusColor(metric.status)}.100`}
                color={`${getStatusColor(metric.status)}.500`}
                borderRadius="lg"
              >
                <Icon as={metric.icon} boxSize={5} />
              </Box>
              
              <VStack spacing={1}>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontWeight="medium">
                  {metric.name}
                </Text>
                
                <CircularProgress
                  value={metric.value}
                  color={`${getStatusColor(metric.status)}.400`}
                  size="60px"
                  thickness="8px"
                >
                  <CircularProgressLabel fontSize="xs" fontWeight="bold">
                    {metric.value}{metric.unit}
                  </CircularProgressLabel>
                </CircularProgress>
                
                <HStack spacing={1}>
                  <Icon 
                    as={metric.trend === 'up' ? TrendingUpIcon : ActivityIcon} 
                    boxSize={3} 
                    color={metric.trend === 'up' ? 'orange.400' : 'green.400'}
                  />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    {metric.trend}
                  </Text>
                </HStack>
              </VStack>
            </VStack>
          </MotionBox>
        ))}
      </SimpleGrid>

      {/* AI Recommendations */}
      <Box
        bg={bg}
        borderRadius="xl"
        border="1px solid"
        borderColor={borderColor}
        p={6}
      >
        <HStack justify="space-between" align="center" mb={4}>
          <VStack align="start" spacing={0}>
            <Text fontSize="lg" fontWeight="semibold">
              AI Optimization Recommendations
            </Text>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              Proactive suggestions to improve performance and efficiency
            </Text>
          </VStack>
          <Badge colorScheme="blue" variant="subtle">
            {recommendations.length} suggestions
          </Badge>
        </HStack>

        <VStack spacing={4} align="stretch">
          {recommendations.map((rec, index) => (
            <MotionBox
              key={rec.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              bg={cardBg}
              borderRadius="lg"
              border="1px solid"
              borderColor={`${getImpactColor(rec.impact)}.200`}
              p={4}
            >
              <HStack justify="space-between" align="start">
                <HStack spacing={3} flex={1}>
                  <Box
                    p={2}
                    bg={`${getImpactColor(rec.impact)}.100`}
                    color={`${getImpactColor(rec.impact)}.500`}
                    borderRadius="lg"
                  >
                    <Icon 
                      as={rec.type === 'optimization' ? ZapIcon : 
                          rec.type === 'maintenance' ? ActivityIcon :
                          rec.type === 'upgrade' ? TrendingUpIcon : AlertTriangleIcon} 
                      boxSize={4} 
                    />
                  </Box>
                  
                  <VStack align="start" spacing={1} flex={1}>
                    <HStack>
                      <Text fontWeight="semibold" fontSize="sm">
                        {rec.title}
                      </Text>
                      <Badge size="xs" colorScheme={getImpactColor(rec.impact)}>
                        {rec.impact} impact
                      </Badge>
                      <Badge size="xs" variant="outline">
                        {rec.effort} effort
                      </Badge>
                    </HStack>
                    
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      {rec.description}
                    </Text>
                    
                    {rec.savings && (
                      <Text fontSize="xs" color="green.600" fontWeight="semibold">
                        Potential savings: {rec.savings}
                      </Text>
                    )}
                  </VStack>
                </HStack>

                <Button size="sm" variant="ghost" colorScheme={getImpactColor(rec.impact)}>
                  Apply
                </Button>
              </HStack>
            </MotionBox>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
};

export default SmartSystemHealth;
