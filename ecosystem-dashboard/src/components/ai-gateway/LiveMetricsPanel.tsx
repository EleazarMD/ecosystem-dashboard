import React from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  SimpleGrid,
  Flex,
} from '@chakra-ui/react';
import { FiTrendingUp } from 'react-icons/fi';
import { RequestFlowChart } from '../charts/RequestFlowChart';
import { LatencyHeatmap } from '../charts/LatencyHeatmap';
import { ProviderLoadChart } from '../charts/ProviderLoadChart';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface LiveMetricsPanelProps {
  requestFlowData: Array<{
    timestamp: string;
    requests: number;
    errors: number;
  }>;
  latencyData: Array<{
    provider: string;
    avgLatency: number;
    p50: number;
    p95: number;
    p99: number;
  }>;
  providerLoadData: Array<{
    provider: string;
    requests: number;
    percentage: number;
  }>;
}

export const LiveMetricsPanel: React.FC<LiveMetricsPanelProps> = ({
  requestFlowData,
  latencyData,
  providerLoadData,
}) => {
  return (
    <Box>
      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
        <Box as={FiTrendingUp} /> Live Performance Metrics
      </Heading>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
        <Card>
          <CardHeader>
            <Heading size="sm">Request Flow</Heading>
          </CardHeader>
          <CardBody>
            <Box h="250px">
              {requestFlowData.length > 0 ? (
                <RequestFlowChart data={requestFlowData} />
              ) : (
                <Flex h="100%" align="center" justify="center">
                  <Text color={useSemanticToken('text.secondary')}>Loading data...</Text>
                </Flex>
              )}
            </Box>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader>
            <Heading size="sm">Provider Load Distribution</Heading>
          </CardHeader>
          <CardBody>
            <Box h="250px">
              {providerLoadData.length > 0 ? (
                <ProviderLoadChart data={providerLoadData} />
              ) : (
                <Flex h="100%" align="center" justify="center">
                  <Text color={useSemanticToken('text.secondary')}>Loading data...</Text>
                </Flex>
              )}
            </Box>
          </CardBody>
        </Card>
      </SimpleGrid>
      
      <Card>
        <CardHeader>
          <Heading size="sm">Latency Breakdown by Provider</Heading>
        </CardHeader>
        <CardBody>
          <Box h="300px">
            {latencyData.length > 0 ? (
              <LatencyHeatmap data={latencyData} />
            ) : (
              <Flex h="100%" align="center" justify="center">
                <Text color={useSemanticToken('text.secondary')}>Loading data...</Text>
              </Flex>
            )}
          </Box>
        </CardBody>
      </Card>
    </Box>
  );
};
