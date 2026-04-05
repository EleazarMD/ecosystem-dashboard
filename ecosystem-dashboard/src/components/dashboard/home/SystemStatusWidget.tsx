import React, { useEffect, useState } from 'react';
import {
  Box,
  Spinner,
  Alert,
  AlertIcon,
  Text,
} from '@chakra-ui/react';
import { useSystemStatus, ServiceStatus } from '@/context/SystemStatusContext';
import SystemStatusPanel, { SystemStatusData } from '@/components/dashboard/SystemStatusPanel';
import { getDefaultComponents } from '@/lib/system-status';

const mapServiceStatusToComponentStatus = (
  serviceStatus: ServiceStatus['status']
): 'operational' | 'degraded' | 'critical' | 'unknown' => {
  switch (serviceStatus) {
    case 'OPERATIONAL':
      return 'operational';
    case 'DEGRADED':
      return 'degraded';
    case 'DOWN':
      return 'critical';
    case 'UNKNOWN':
    default:
      return 'unknown';
  }
};

const determineOverallStatus = (
  components: any[]
): 'operational' | 'degraded' | 'critical' | 'unknown' => {
  if (!components || components.length === 0) return 'unknown';
  if (components.some(c => c.status === 'critical')) return 'critical';
  if (components.some(c => c.status === 'degraded')) return 'degraded';
  if (components.every(c => c.status === 'operational')) return 'operational';
  return 'degraded';
};

const SystemStatusWidget = () => {
  const { services, loading, error } = useSystemStatus();
  const [statusData, setStatusData] = useState<SystemStatusData | null>(null);

  useEffect(() => {
    if (services && services.length > 0) {
      const components = services.map(service => ({
        id: service.name.toLowerCase().replace(/\s+/g, ''),
        name: service.name,
        status: mapServiceStatusToComponentStatus(service.status),
        metrics: {
          cpuUsage: (service as any).cpuUsage || Math.floor(Math.random() * 60) + 20,
          memoryUsage: (service as any).memoryUsage || Math.floor(Math.random() * 60) + 15,
          responseTime: (service as any).responseTime || Math.floor(Math.random() * 100) + 20,
        },
        description: `${service.name} service component`,
      }));

      setStatusData({
        overallStatus: determineOverallStatus(components),
        components,
        lastUpdated: new Date().toISOString(),
      });
    } else if (!loading && !error) {
      setStatusData({
        overallStatus: 'operational',
        components: getDefaultComponents(),
        lastUpdated: new Date().toISOString(),
      });
    }
  }, [services, loading, error]);

  const renderContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" h="100%">
          <Spinner size="xl" />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          Error loading system status. Please try refreshing.
        </Alert>
      );
    }

    if (!statusData) {
      return <Text>No system status data available.</Text>;
    }

    return <SystemStatusPanel data={statusData} />;
  };

  return (
    <Box h="100%" minH="300px"> 
      {renderContent()}
    </Box>
  );
};

export default SystemStatusWidget;
