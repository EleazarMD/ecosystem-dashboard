import React, { useEffect, useState } from 'react';
import { Box, Heading, Text, VStack, SimpleGrid, Stat, StatLabel, StatNumber, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

// Define a type for individual metrics from the API
interface GatewayMetric {
  label: string;
  value: string | number;
  unit?: string;
}

// Define the expected structure of the API response
interface GatewayMetricsResponse {
  auth_attempts_total?: number;
  http_rate_limited_requests_total?: number;
  process_cpu_seconds_total?: number;
  process_resident_memory_bytes?: number;
  // Add other expected metrics here
}

const AIGatewayMetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<GatewayMetric[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/monitoring/ai-gateway-metrics');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch metrics: ${response.status}`);
        }
        const data: GatewayMetricsResponse = await response.json();

        // Transform the data into the format expected by the Stat components
        const formattedMetrics: GatewayMetric[] = [];
        if (data.auth_attempts_total !== undefined) {
          formattedMetrics.push({ label: 'Authentication Attempts', value: data.auth_attempts_total });
        }
        if (data.http_rate_limited_requests_total !== undefined) {
          formattedMetrics.push({ label: 'Rate Limited Requests', value: data.http_rate_limited_requests_total });
        }
        if (data.process_cpu_seconds_total !== undefined) {
          formattedMetrics.push({ label: 'CPU Time (seconds)', value: data.process_cpu_seconds_total.toFixed(2) });
        }
        if (data.process_resident_memory_bytes !== undefined) {
          formattedMetrics.push({ label: 'Memory Usage (MB)', value: (data.process_resident_memory_bytes / (1024 * 1024)).toFixed(2), unit: 'MB' });
        }
        // Add more transformations as needed

        setMetrics(formattedMetrics);
      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred while fetching metrics.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    // Optional: Set up polling for live updates
    const intervalId = setInterval(fetchMetrics, 30000); // Poll every 30 seconds
    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  if (metrics.length === 0) {
    return (
      <Text>No metrics data available at the moment.</Text>
    );
  }

  return (
    <Box>
      <Heading size="lg" mb={6}>AI Gateway Performance Metrics</Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {metrics.map(metric => (
          <Stat key={metric.label} p={4} borderWidth="1px" borderRadius="md" shadow="sm">
            <StatLabel>{metric.label}</StatLabel>
            <StatNumber>{metric.value} {metric.unit || ''}</StatNumber>
          </Stat>
        ))}
      </SimpleGrid>
      {/* Add charts or more detailed views here */}
    </Box>
  );
};

export default AIGatewayMetricsDashboard;
