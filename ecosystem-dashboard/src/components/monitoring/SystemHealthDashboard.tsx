import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  VStack, 
  Spinner, 
  Alert, 
  AlertIcon, 
  SimpleGrid,
  Divider,
  HStack,
  Badge,
  Grid,
  GridItem
} from '@chakra-ui/react';
import { formatDateTime } from '@/lib/utils';
import { ServerStackIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, QuestionMarkCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import KGSystemHealthCard from './KGSystemHealthCard';
import SystemMetricsChart from './SystemMetricsChart';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ServiceStatus {
  id: string;
  name: string;
  version: string;
  url: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN' | 'DEGRADED';
  lastSeen: string;
  registeredAt: string;
  metadata?: Record<string, any>;
  errorDetails?: Record<string, any> | null;
}

const getStatusColor = (status: ServiceStatus['status']) => {
  switch (status) {
    case 'UP':
      return 'text-green-500';
    case 'DOWN':
      return 'text-red-500';
    case 'DEGRADED':
      return 'text-yellow-500';
    case 'UNKNOWN':
    default:
      return 'text-gray-500';
  }
};

const getStatusIcon = (status: ServiceStatus['status']) => {
  switch (status) {
    case 'UP':
      return <CheckCircleIcon className="h-6 w-6" />;
    case 'DOWN':
      return <XCircleIcon className="h-6 w-6" />;
    case 'DEGRADED':
      return <ExclamationTriangleIcon className="h-6 w-6" />;
    case 'UNKNOWN':
    default:
      return <QuestionMarkCircleIcon className="h-6 w-6" />;
  }
};

const SystemHealthDashboard: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/monitoring/system-health');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data: ServiceStatus[] = await response.json();
      setServices(data);
      setLastRefreshed(new Date());
    } catch (e: any) {
      console.error('Failed to fetch system health:', e);
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, []);

  // Colors based on theme
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const sectionBg = useSemanticToken('surface.base');
  
  return (
    <Box>
      <HStack mb={6} justifyContent="space-between" alignItems="center">
        <Heading size="lg">System Health Overview</Heading>
        <Badge colorScheme="blue" fontSize="sm" px={2} py={1}>
          AI Gateway Enabled
        </Badge>
      </HStack>
      
      {/* Knowledge Graph Health Card - Always visible at the top */}
      <Box mb={6}>
        <KGSystemHealthCard />
      </Box>

      {/* System Metrics Chart with standardized Recharts area charts */}
      <Box mb={6}>
        <SystemMetricsChart height={350} />
      </Box>
      
      <Divider my={6} borderColor={borderColor} />
      
      <Heading size="md" mb={4}>Service Health</Heading>
      
      {loading && services.length === 0 && (
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <Spinner size="xl" />
        </Box>
      )}
      {error && (
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      )}
      {!loading && !error && services.length === 0 && (
        <Box p={4} borderRadius="md" bg={sectionBg}>
          <Text>No services registered or data available.</Text>
        </Box>
      )}
      {!error && services.length > 0 && (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
          {services.map((service) => (
            <Box 
              key={service.id} 
              p={4} 
              borderWidth="1px" 
              borderRadius="md" 
              shadow="sm"
              bg={cardBg}
              borderColor={borderColor}
            >
              <Heading size="md" mb={2}>{service.name}</Heading>
              <HStack spacing={2} mb={2}>
                <Text fontWeight="medium">Status:</Text>
                <Text as="span" color={getStatusColor(service.status)}>
                  {getStatusIcon(service.status)}
                  {service.status}
                </Text>
              </HStack>
              <Text>ID: {service.id}</Text>
              <Text>URL: {service.url}</Text>
              <Text>Version: {service.version}</Text>
              {service.errorDetails && (service.status === 'DOWN' || service.status === 'DEGRADED') && (
                <Box 
                  mt={2} 
                  p={2} 
                  borderWidth="1px" 
                  borderRadius="md" 
                  shadow="sm"
                  bg={sectionBg}
                >
                  <Text fontSize="sm" fontWeight="medium">Error Information:</Text>
                  <Text fontSize="sm">Message: {service.errorDetails.message || 'N/A'}</Text>
                  {service.errorDetails.code && <Text fontSize="sm">Code: {service.errorDetails.code}</Text>}
                  {service.errorDetails.status && <Text fontSize="sm">HTTP Status: {service.errorDetails.status}</Text>}
                </Box>
              )}
              <Text fontSize="sm" color={useSemanticToken('text.secondary')} mt={2}>Last Seen: {isClient ? formatDateTime(service.lastSeen) : 'Loading...'}</Text>
            </Box>
          ))}
        </SimpleGrid>
      )}
      {lastRefreshed && (
        <HStack spacing={2} mt={4}>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Last refreshed:</Text>
          <Text fontSize="sm">{isClient ? formatDateTime(lastRefreshed.toISOString()) : 'Loading...'}</Text>
        </HStack>
      )}
    </Box>
  );
};

export default SystemHealthDashboard;
