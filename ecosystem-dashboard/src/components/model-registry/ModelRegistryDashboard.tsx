/**
 * Model Registry Dashboard
 * 
 * Central management interface for all available LLMs in the AI Homelab ecosystem
 * Shows real-time model availability, provider status, and cost information
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Button,
  Alert,
  AlertIcon,
  AlertDescription,
  Spinner,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tooltip,
  Icon,
  Progress
} from '@chakra-ui/react';
import { FiRefreshCw, FiServer, FiDollarSign, FiCpu, FiEye } from 'react-icons/fi';
import { useModelRegistry } from '../../hooks/useModelRegistry';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export const ModelRegistryDashboard: React.FC = () => {
  const {
    models,
    availableModels,
    modelsByProvider,
    providers,
    isLoading,
    error,
    lastUpdated,
    refreshModels,
    getModelsByType
  } = useModelRegistry();

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  if (isLoading && models.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading model registry...</Text>
        </VStack>
      </Box>
    );
  }

  const chatModels = getModelsByType('chat');
  const visionModels = getModelsByType('vision');
  const embeddingModels = getModelsByType('embedding');

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <VStack align="start" spacing={1}>
          <Heading size="lg">Model Registry</Heading>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            Single source of truth for AI Homelab LLMs
          </Text>
        </VStack>
        
        <VStack align="end" spacing={1}>
          <Button 
            size="sm" 
            leftIcon={<Icon as={FiRefreshCw} />}
            onClick={refreshModels}
            isLoading={isLoading}
          >
            Refresh Registry
          </Button>
          {lastUpdated && (
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </Text>
          )}
        </VStack>
      </HStack>

      {/* Error Alert */}
      {error && (
        <Alert status="warning">
          <AlertIcon />
          <AlertDescription>
            Registry error: {error}. Showing cached/fallback data.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
        <GridItem>
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Total Models</StatLabel>
                <StatNumber>{models.length}</StatNumber>
                <StatHelpText>{availableModels.length} available</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Active Providers</StatLabel>
                <StatNumber>{Object.values(providers).filter(p => p.available).length}</StatNumber>
                <StatHelpText>
                  {providers.ollama.available && 'Ollama '}
                  {providers.openai.available && 'OpenAI '}
                  {providers.anthropic.available && 'Anthropic'}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Model Types</StatLabel>
                <StatNumber>{chatModels.length}</StatNumber>
                <StatHelpText>
                  {chatModels.length} Chat, {visionModels.length} Vision, {embeddingModels.length} Embedding
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Cost Range</StatLabel>
                <StatNumber>$0.001-$0.075</StatNumber>
                <StatHelpText>Per 1k tokens</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Provider Status */}
      <Card bg={cardBg} borderColor={borderColor}>
        <CardHeader>
          <Heading size="md">Provider Status</Heading>
        </CardHeader>
        <CardBody>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
            {/* Ollama */}
            <Box p={4} borderRadius="lg" bg={providers.ollama.available ? 'green.50' : 'gray.50'}>
              <VStack align="start" spacing={2}>
                <HStack>
                  <Icon as={FiServer} color={providers.ollama.available ? 'green.500' : 'gray.400'} />
                  <Text fontWeight="bold">Ollama</Text>
                  <Badge colorScheme={providers.ollama.available ? 'green' : 'gray'}>
                    {providers.ollama.available ? 'Online' : 'Offline'}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  Local models via {providers.ollama.url}
                </Text>
                <Text fontSize="sm">
                  {providers.ollama.models.length} models available
                </Text>
                {providers.ollama.models.length > 0 && (
                  <Progress 
                    value={100} 
                    colorScheme="green" 
                    size="sm" 
                    w="full"
                  />
                )}
              </VStack>
            </Box>

            {/* OpenAI */}
            <Box p={4} borderRadius="lg" bg={providers.openai.available ? 'blue.50' : 'gray.50'}>
              <VStack align="start" spacing={2}>
                <HStack>
                  <Icon as={FiCpu} color={providers.openai.available ? 'blue.500' : 'gray.400'} />
                  <Text fontWeight="bold">OpenAI</Text>
                  <Badge colorScheme={providers.openai.available ? 'blue' : 'gray'}>
                    {providers.openai.available ? 'Available' : 'No API Key'}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  GPT models via OpenAI API
                </Text>
                <Text fontSize="sm">
                  {providers.openai.models.length} models configured
                </Text>
              </VStack>
            </Box>

            {/* Anthropic */}
            <Box p={4} borderRadius="lg" bg={providers.anthropic.available ? 'purple.50' : 'gray.50'}>
              <VStack align="start" spacing={2}>
                <HStack>
                  <Icon as={FiEye} color={providers.anthropic.available ? 'purple.500' : 'gray.400'} />
                  <Text fontWeight="bold">Anthropic</Text>
                  <Badge colorScheme={providers.anthropic.available ? 'purple' : 'gray'}>
                    {providers.anthropic.available ? 'Available' : 'No API Key'}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  Claude models via Anthropic API
                </Text>
                <Text fontSize="sm">
                  {providers.anthropic.models.length} models configured
                </Text>
              </VStack>
            </Box>
          </Grid>
        </CardBody>
      </Card>

      {/* Models Table */}
      <Card bg={cardBg} borderColor={borderColor}>
        <CardHeader>
          <Heading size="md">Available Models ({availableModels.length})</Heading>
        </CardHeader>
        <CardBody>
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Model</Th>
                  <Th>Provider</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>Context</Th>
                  <Th>Size/Params</Th>
                  <Th>Cost/1k</Th>
                  <Th>Capabilities</Th>
                </Tr>
              </Thead>
              <Tbody>
                {models.map((model) => (
                  <Tr key={model.id}>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="medium" fontSize="sm">
                          {model.name}
                        </Text>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontFamily="mono">
                          {model.id}
                        </Text>
                      </VStack>
                    </Td>
                    <Td>
                      <Badge colorScheme={
                        model.provider === 'ollama' ? 'green' :
                        model.provider === 'openai' ? 'blue' :
                        model.provider === 'anthropic' ? 'purple' : 'gray'
                      }>
                        {model.provider.toUpperCase()}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge variant="outline">
                        {model.type}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={
                        model.status === 'available' ? 'green' :
                        model.status === 'downloading' ? 'yellow' : 'red'
                      }>
                        {model.status}
                      </Badge>
                    </Td>
                    <Td>
                      {model.contextWindow ? (
                        <Text fontSize="sm">
                          {model.contextWindow.toLocaleString()}
                        </Text>
                      ) : '-'}
                    </Td>
                    <Td>
                      {model.size || (model.parameters && `${model.parameters}B`) || '-'}
                    </Td>
                    <Td>
                      {model.costPer1kTokens ? (
                        <VStack align="start" spacing={0}>
                          <Text fontSize="xs">In: ${model.costPer1kTokens.input}</Text>
                          <Text fontSize="xs">Out: ${model.costPer1kTokens.output}</Text>
                        </VStack>
                      ) : (
                        <Text fontSize="sm" color="green.500">Free</Text>
                      )}
                    </Td>
                    <Td>
                      <HStack spacing={1} flexWrap="wrap">
                        {(() => {
                          const caps = Array.isArray(model.capabilities) 
                            ? model.capabilities 
                            : (model.capabilities && typeof model.capabilities === 'object' 
                                ? Object.keys(model.capabilities) 
                                : []);
                          return (
                            <>
                              {caps.slice(0, 2).map(cap => (
                                <Badge key={String(cap)} size="sm" variant="subtle">
                                  {String(cap)}
                                </Badge>
                              ))}
                              {caps.length > 2 && (
                                <Tooltip label={caps.slice(2).join(', ')}>
                                  <Badge size="sm" variant="subtle">
                                    +{caps.length - 2}
                                  </Badge>
                                </Tooltip>
                              )}
                            </>
                          );
                        })()}
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>
    </VStack>
  );
};
