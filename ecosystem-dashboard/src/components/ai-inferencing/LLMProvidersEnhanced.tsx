/**
 * LLM Providers Enhanced - Provider-level infrastructure management
 * Focus: Provider health, model catalog, topology, and comparison
 */

import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Badge,
  SimpleGrid,
  
  Icon,
  Button,
  Divider,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@chakra-ui/react';
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiServer,
  FiZap,
  FiDollarSign,
  FiClock,
  FiActivity,
  FiGrid,
} from 'react-icons/fi';

interface Provider {
  id: string;
  name: string;
  status: 'active' | 'degraded' | 'inactive';
  requestsToday: number;
  avgLatency: number;
  modelCount: number;
  costToday: number;
  uptime: number;
  apiKeys: number;
}

interface Model {
  id: string;
  name: string;
  provider: string;
  pricing: {
    input: number;
    output: number;
  };
  contextWindow: number;
  capabilities: string[];
  requestsToday: number;
}

interface Props {
  providers: Provider[];
  models: Model[];
  onProviderSelect?: (providerId: string) => void;
  onAddProvider?: () => void;
}

export function LLMProvidersEnhanced({ 
  providers, 
  models,
  onProviderSelect,
  onAddProvider 
}: Props) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // Colors
  const borderColor = useSemanticToken('border.default');
  const mutedText = useSemanticToken('text.secondary');
  const bgHover = useSemanticToken('surface.hover');
  const cardBg = useSemanticToken('surface.elevated');

  // Calculate totals
  const totalModels = providers.reduce((sum, p) => sum + p.modelCount, 0);
  const totalKeys = providers.reduce((sum, p) => sum + p.apiKeys, 0);
  const totalRequests = providers.reduce((sum, p) => sum + p.requestsToday, 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return FiCheckCircle;
      case 'degraded':
        return FiAlertTriangle;
      case 'inactive':
        return FiXCircle;
      default:
        return FiServer;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'degraded':
        return 'yellow';
      case 'inactive':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const handleProviderClick = (providerId: string) => {
    setSelectedProvider(providerId);
    onProviderSelect?.(providerId);
  };

  return (
    <VStack spacing={6} align="stretch" width="full">
      {/* Compact Header */}
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={1}>
          <HStack spacing={3} color={mutedText} fontSize="sm">
            <Text fontWeight="500">{providers.length} providers</Text>
            <Text>·</Text>
            <Text>{totalModels} models</Text>
            <Text>·</Text>
            <Text>{totalKeys} API keys</Text>
            <Text>·</Text>
            <Text fontWeight="600">{totalRequests} requests today</Text>
          </HStack>
          <HStack spacing={2} fontSize="xs">
            <Badge colorScheme="green">
              {providers.filter(p => p.status === 'active').length} active
            </Badge>
            {providers.some(p => p.status === 'degraded') && (
              <Badge colorScheme="yellow">
                {providers.filter(p => p.status === 'degraded').length} degraded
              </Badge>
            )}
          </HStack>
        </VStack>

        <Button
          leftIcon={<FiServer />}
          colorScheme="blue"
          size="sm"
          onClick={onAddProvider}
        >
          Add Provider
        </Button>
      </HStack>

      {/* Provider Grid - Horizontal Cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        {providers.map((provider) => (
          <Card
            key={provider.id}
            borderWidth="2px"
            borderColor={
              selectedProvider === provider.id
                ? 'blue.500'
                : borderColor
            }
            cursor="pointer"
            onClick={() => handleProviderClick(provider.id)}
            _hover={{ borderColor: 'blue.400', shadow: 'md' }}
            transition="all 0.2s"
          >
            <CardBody>
              <VStack align="stretch" spacing={3}>
                {/* Header */}
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Icon as={FiServer} boxSize={5} color="blue.500" />
                    <Text fontSize="lg" fontWeight="700">
                      {provider.name}
                    </Text>
                  </HStack>
                  <Badge
                    colorScheme={getStatusColor(provider.status)}
                    fontSize="xs"
                  >
                    <HStack spacing={1}>
                      <Icon as={getStatusIcon(provider.status)} boxSize={3} />
                      <Text textTransform="uppercase">{provider.status}</Text>
                    </HStack>
                  </Badge>
                </HStack>

                {/* Metrics */}
                <SimpleGrid columns={2} spacing={2} fontSize="sm">
                  <VStack align="start" spacing={0}>
                    <Text color={mutedText} fontSize="xs">Models</Text>
                    <Text fontWeight="600">{provider.modelCount}</Text>
                  </VStack>
                  <VStack align="start" spacing={0}>
                    <Text color={mutedText} fontSize="xs">Latency</Text>
                    <Text fontWeight="600">{provider.avgLatency}ms</Text>
                  </VStack>
                  <VStack align="start" spacing={0}>
                    <Text color={mutedText} fontSize="xs">Requests</Text>
                    <Text fontWeight="600">{provider.requestsToday}</Text>
                  </VStack>
                  <VStack align="start" spacing={0}>
                    <Text color={mutedText} fontSize="xs">Cost</Text>
                    <Text fontWeight="600">${provider.costToday.toFixed(2)}</Text>
                  </VStack>
                </SimpleGrid>

                {/* Uptime */}
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" color={mutedText}>Uptime</Text>
                    <Text fontSize="xs" fontWeight="600">
                      {provider.uptime.toFixed(1)}%
                    </Text>
                  </HStack>
                  <Progress
                    value={provider.uptime}
                    size="xs"
                    colorScheme={provider.uptime >= 99 ? 'green' : 'yellow'}
                    borderRadius="full"
                  />
                </Box>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Model Catalog */}
      <Box>
        <HStack justify="space-between" mb={4}>
          <Text fontSize="md" fontWeight="600">
            Model Catalog
          </Text>
          <HStack spacing={2} fontSize="xs" color={mutedText}>
            <Icon as={FiGrid} />
            <Text>{models.length} models available</Text>
          </HStack>
        </HStack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
          {models.map((model) => (
            <Card
              key={model.id}
              borderWidth="1px"
              borderColor={borderColor}
              size="sm"
              _hover={{ borderColor: 'blue.400', bg: bgHover }}
              transition="all 0.2s"
            >
              <CardBody p={3}>
                <VStack align="stretch" spacing={2}>
                  {/* Model Header */}
                  <HStack justify="space-between">
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="600" noOfLines={1}>
                        {model.name}
                      </Text>
                      <Text fontSize="xs" color={mutedText}>
                        {model.provider}
                      </Text>
                    </VStack>
                    {model.requestsToday > 0 && (
                      <Badge size="sm" colorScheme="blue">
                        {model.requestsToday}
                      </Badge>
                    )}
                  </HStack>

                  {/* Pricing */}
                  <HStack spacing={3} fontSize="xs">
                    <VStack align="start" spacing={0}>
                      <Text color={mutedText}>Input</Text>
                      <Text fontWeight="600">
                        ${model.pricing.input.toFixed(3)}
                      </Text>
                    </VStack>
                    <VStack align="start" spacing={0}>
                      <Text color={mutedText}>Output</Text>
                      <Text fontWeight="600">
                        ${model.pricing.output.toFixed(3)}
                      </Text>
                    </VStack>
                    <VStack align="start" spacing={0}>
                      <Text color={mutedText}>Context</Text>
                      <Text fontWeight="600">
                        {model.contextWindow >= 1000000
                          ? `${(model.contextWindow / 1000000).toFixed(0)}M`
                          : `${(model.contextWindow / 1000).toFixed(0)}K`}
                      </Text>
                    </VStack>
                  </HStack>

                  {/* Capabilities */}
                  <HStack spacing={1} flexWrap="wrap">
                    {(() => {
                      const caps = Array.isArray(model.capabilities) 
                        ? model.capabilities 
                        : (model.capabilities && typeof model.capabilities === 'object' 
                            ? Object.keys(model.capabilities) 
                            : []);
                      return (
                        <>
                          {caps.slice(0, 3).map((cap) => (
                            <Badge
                              key={String(cap)}
                              size="xs"
                              variant="subtle"
                              colorScheme="purple"
                            >
                              {String(cap)}
                            </Badge>
                          ))}
                          {caps.length > 3 && (
                            <Text fontSize="xs" color={mutedText}>
                              +{caps.length - 3}
                            </Text>
                          )}
                        </>
                      );
                    })()}
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      </Box>

      <Divider />

      {/* Request Topology */}
      <Box>
        <Text fontSize="md" fontWeight="600" mb={4}>
          Request Flow Topology
        </Text>
        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4}>
              {/* Flow Diagram */}
              <HStack spacing={4} width="full" justify="center">
                <VStack>
                  <Icon as={FiActivity} boxSize={8} color="blue.500" />
                  <Text fontSize="sm" fontWeight="600">Dashboard</Text>
                  <Text fontSize="xs" color={mutedText}>Request Source</Text>
                </VStack>

                <Icon as={FiZap} color={mutedText} />

                <VStack>
                  <Icon as={FiServer} boxSize={8} color="purple.500" />
                  <Text fontSize="sm" fontWeight="600">AI Gateway</Text>
                  <Text fontSize="xs" color={mutedText}>Port 8777</Text>
                </VStack>

                <Icon as={FiZap} color={mutedText} />

                <VStack>
                  <Icon as={FiServer} boxSize={8} color="green.500" />
                  <Text fontSize="sm" fontWeight="600">AI Inferencing</Text>
                  <Text fontSize="xs" color={mutedText}>Port 9000</Text>
                </VStack>

                <Icon as={FiZap} color={mutedText} />

                <VStack>
                  <Icon as={FiGrid} boxSize={8} color="orange.500" />
                  <Text fontSize="sm" fontWeight="600">Providers</Text>
                  <Text fontSize="xs" color={mutedText}>
                    {providers.filter(p => p.status === 'active').length} active
                  </Text>
                </VStack>
              </HStack>

              <Divider />

              {/* Metrics */}
              <SimpleGrid columns={4} spacing={4} width="full">
                <VStack>
                  <Text fontSize="xs" color={mutedText}>Total Requests</Text>
                  <Text fontSize="xl" fontWeight="700">{totalRequests}</Text>
                </VStack>
                <VStack>
                  <Text fontSize="xs" color={mutedText}>Avg Latency</Text>
                  <Text fontSize="xl" fontWeight="700">
                    {providers.length > 0
                      ? Math.round(
                          providers.reduce((sum, p) => sum + p.avgLatency, 0) / providers.length
                        )
                      : 0}ms
                  </Text>
                </VStack>
                <VStack>
                  <Text fontSize="xs" color={mutedText}>Total Cost</Text>
                  <Text fontSize="xl" fontWeight="700">
                    ${providers.reduce((sum, p) => sum + p.costToday, 0).toFixed(2)}
                  </Text>
                </VStack>
                <VStack>
                  <Text fontSize="xs" color={mutedText}>Uptime</Text>
                  <Text fontSize="xl" fontWeight="700">
                    {providers.length > 0
                      ? (
                          providers.reduce((sum, p) => sum + p.uptime, 0) / providers.length
                        ).toFixed(1)
                      : 0}%
                  </Text>
                </VStack>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>
      </Box>

      {/* Provider Comparison Table */}
      <Box>
        <Text fontSize="md" fontWeight="600" mb={4}>
          Provider Comparison
        </Text>
        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody p={0}>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>PROVIDER</Th>
                  <Th isNumeric>MODELS</Th>
                  <Th isNumeric>REQUESTS</Th>
                  <Th isNumeric>AVG LATENCY</Th>
                  <Th isNumeric>COST TODAY</Th>
                  <Th isNumeric>UPTIME</Th>
                </Tr>
              </Thead>
              <Tbody>
                {providers.map((provider) => (
                  <Tr
                    key={provider.id}
                    _hover={{ bg: bgHover }}
                    cursor="pointer"
                    onClick={() => handleProviderClick(provider.id)}
                  >
                    <Td>
                      <HStack>
                        <Icon
                          as={getStatusIcon(provider.status)}
                          color={getStatusColor(provider.status) + '.500'}
                        />
                        <Text fontWeight="600">{provider.name}</Text>
                      </HStack>
                    </Td>
                    <Td isNumeric>{provider.modelCount}</Td>
                    <Td isNumeric>{provider.requestsToday}</Td>
                    <Td isNumeric>
                      <Badge
                        colorScheme={
                          provider.avgLatency < 1000
                            ? 'green'
                            : provider.avgLatency < 5000
                            ? 'yellow'
                            : 'red'
                        }
                      >
                        {provider.avgLatency}ms
                      </Badge>
                    </Td>
                    <Td isNumeric>${provider.costToday.toFixed(2)}</Td>
                    <Td isNumeric>
                      <HStack justify="flex-end">
                        <Progress
                          value={provider.uptime}
                          width="50px"
                          size="xs"
                          colorScheme={provider.uptime >= 99 ? 'green' : 'yellow'}
                          borderRadius="full"
                        />
                        <Text fontSize="sm" minW="45px">
                          {provider.uptime.toFixed(1)}%
                        </Text>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </Box>
    </VStack>
  );
}
