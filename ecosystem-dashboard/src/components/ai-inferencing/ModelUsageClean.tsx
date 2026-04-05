/**
 * Clean Model Usage Section
 * Minimal table design with clear spacing
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Card,
  Heading,
  Text,
  SimpleGrid,
  VStack,
  HStack,
  
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@chakra-ui/react';

interface ModelUsage {
  model: string;
  provider: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  successRate: number;
}

interface Props {
  models: ModelUsage[];
  timeRange: string;
}

export const ModelUsageClean: React.FC<Props> = ({ models, timeRange }) => {
  const cardBg = useSemanticToken('surface.elevated');
  const subtleText = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const tableHeaderBg = useSemanticToken('surface.hover');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 5,
    }).format(amount);
  };

  const totalRequests = models.reduce((sum, m) => sum + m.requestCount, 0);
  const totalCost = models.reduce((sum, m) => sum + m.totalCost, 0);
  const totalTokens = models.reduce((sum, m) => sum + m.totalTokens, 0);

  return (
    <VStack spacing={12} align="stretch">
      {/* Simple Header */}
      <Box>
        <Heading size="lg" fontWeight="600" mb={2}>
          Model Usage
        </Heading>
        <Text color={subtleText} fontSize="sm">
          Breakdown by model for the last {timeRange}
        </Text>
      </Box>

      {/* Summary */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6}>
        <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
          <VStack align="start" spacing={3}>
            <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
              Models
            </Text>
            <Text fontSize="3xl" fontWeight="500">
              {models.length}
            </Text>
          </VStack>
        </Card>

        <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
          <VStack align="start" spacing={3}>
            <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
              Requests
            </Text>
            <Text fontSize="3xl" fontWeight="500">
              {totalRequests.toLocaleString()}
            </Text>
          </VStack>
        </Card>

        <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
          <VStack align="start" spacing={3}>
            <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
              Tokens
            </Text>
            <Text fontSize="3xl" fontWeight="500">
              {((totalTokens || 0) / 1000).toFixed(1)}K
            </Text>
          </VStack>
        </Card>

        <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
          <VStack align="start" spacing={3}>
            <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
              Cost
            </Text>
            <Text fontSize="3xl" fontWeight="500">
              {formatCurrency(totalCost)}
            </Text>
          </VStack>
        </Card>
      </SimpleGrid>

      {/* Model Table */}
      <Box>
        <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor}>
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead bg={tableHeaderBg}>
                <Tr>
                  <Th py={4} fontSize="xs" fontWeight="600" color={subtleText} textTransform="uppercase">
                    Model
                  </Th>
                  <Th py={4} fontSize="xs" fontWeight="600" color={subtleText} textTransform="uppercase">
                    Provider
                  </Th>
                  <Th py={4} fontSize="xs" fontWeight="600" color={subtleText} textTransform="uppercase" isNumeric>
                    Requests
                  </Th>
                  <Th py={4} fontSize="xs" fontWeight="600" color={subtleText} textTransform="uppercase" isNumeric>
                    Success Rate
                  </Th>
                  <Th py={4} fontSize="xs" fontWeight="600" color={subtleText} textTransform="uppercase" isNumeric>
                    Latency
                  </Th>
                  <Th py={4} fontSize="xs" fontWeight="600" color={subtleText} textTransform="uppercase" isNumeric>
                    Tokens
                  </Th>
                  <Th py={4} fontSize="xs" fontWeight="600" color={subtleText} textTransform="uppercase" isNumeric>
                    Cost
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {models.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={12}>
                      <VStack spacing={2}>
                        <Text color={subtleText}>No model usage data</Text>
                        <Text fontSize="sm" color={subtleText}>
                          Generate API requests to see analytics
                        </Text>
                      </VStack>
                    </Td>
                  </Tr>
                ) : (
                  models.map((model, idx) => (
                    <Tr key={`${model.provider}-${model.model}-${idx}`} borderBottomWidth="1px" borderColor={borderColor}>
                      <Td py={5} fontWeight="500">
                        {model.model}
                      </Td>
                      <Td py={5} textTransform="capitalize" color={subtleText}>
                        {model.provider}
                      </Td>
                      <Td py={5} isNumeric fontWeight="500">
                        {model.requestCount.toLocaleString()}
                      </Td>
                      <Td py={5} isNumeric>
                        {model.successRate.toFixed(1)}%
                      </Td>
                      <Td py={5} isNumeric>
                        {model.avgLatency}ms
                      </Td>
                      <Td py={5} isNumeric>
                        {((model.totalTokens || 0) / 1000).toFixed(1)}K
                      </Td>
                      <Td py={5} isNumeric fontWeight="500">
                        {formatCurrency(model.totalCost)}
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
        </Card>
      </Box>
    </VStack>
  );
};
