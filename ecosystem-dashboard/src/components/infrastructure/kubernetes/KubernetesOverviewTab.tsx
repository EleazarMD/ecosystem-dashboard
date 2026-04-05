import React from 'react';
import {
  Box,
  Grid,
  GridItem,
  VStack,
  HStack,
  Heading,
  Text,
  Spinner,
} from '@chakra-ui/react';
import { KubernetesStatusCards } from './KubernetesStatusCards';
import { KubernetesAdvancedMetrics } from './KubernetesAdvancedMetrics';
import { KubernetesEnhancedTable } from './KubernetesEnhancedTable';
// import KubernetesServiceDemo from '../KubernetesServiceDemo'; // Commented out - missing file
import KubernetesMetricsWidget from '../KubernetesMetricsWidget';
import ServiceArchitectureVisualizer from '../ServiceArchitectureVisualizer';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface KubernetesOverviewTabProps {
  clusterData?: any;
  servicesData?: any[];
  isLoading?: boolean;
}

export const KubernetesOverviewTab: React.FC<KubernetesOverviewTabProps> = ({
  clusterData,
  servicesData = [],
  isLoading = false,
}) => {
  // Calculate metrics from cluster data
  const metrics = clusterData ? {
    totalPods: clusterData.totalPods || 0,
    runningPods: clusterData.runningPods || 0,
    pendingPods: clusterData.pendingPods || 0,
    failedPods: clusterData.failedPods || 0,
    totalServices: clusterData.totalServices || 0,
    nodes: clusterData.nodes || 1,
    namespaces: clusterData.namespaces || 1,
    cpuUsage: clusterData.cpuUsage,
    memoryUsage: clusterData.memoryUsage,
  } : undefined;

  return (
    <Box>
      {/* Enhanced Status Cards */}
      <KubernetesStatusCards metrics={metrics} isLoading={isLoading} />
      
      {/* Enhanced Main Layout */}
      <VStack align="stretch" spacing={12}>
        {/* Services Management Section */}
        <Box>
          <HStack justify="space-between" align="center" mb={8}>
            <Box>
              <Heading size="xl" color={useSemanticToken('text.primary')} mb={3}>
                📊 Service Observatory
              </Heading>
              <Text color={useSemanticToken('text.secondary')} fontSize="lg">
                Comprehensive service health monitoring with advanced analytics and real-time insights
              </Text>
            </Box>
          </HStack>
          <KubernetesEnhancedTable 
            services={servicesData} 
            isLoading={isLoading} 
          />
        </Box>

        {/* Metrics and Performance Section */}
        <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={12} alignItems="start">
          {/* Left: Resource Analytics */}
          <GridItem>
            <KubernetesAdvancedMetrics 
              clusterData={clusterData}
              servicesData={servicesData}
              isLoading={isLoading} 
            />
          </GridItem>
          
          {/* Right: Architecture Visualization */}
          <GridItem>
            <VStack align="stretch" spacing={6}>
              <Box>
                <Heading size="md" color={useSemanticToken('text.primary')} mb={2}>
                  🌐 Cluster Topology
                </Heading>
                <Text color={useSemanticToken('text.secondary')} fontSize="sm">
                  Interactive service mesh visualization and dependency mapping
                </Text>
              </Box>
              <ServiceArchitectureVisualizer />
            </VStack>
          </GridItem>
        </Grid>
        
        {/* Legacy Components for Backward Compatibility */}
        <Box display="none">
          {/* <KubernetesServiceDemo /> - Component missing */}
          <KubernetesMetricsWidget />
        </Box>
      </VStack>
    </Box>
  );
};
