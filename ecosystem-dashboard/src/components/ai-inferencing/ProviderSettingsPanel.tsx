/**
 * Provider Settings Panel
 * Right panel component for LLM provider configuration and testing
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Icon,
  Divider,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  FiZap,
  FiSettings,
  FiBarChart2,
  FiCheckCircle,
  FiAlertCircle,
} from 'react-icons/fi';

interface Provider {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  models: any[];
  projects: any[];
  endpoints: any[];
  dailyCost: number;
  dailyLimit: number;
  requestsPerMinute: number;
  requestLimit: number;
  apiKeyConfigured: boolean;
}

interface ConnectionStatus {
  success: boolean;
  message: string;
}

interface ProviderSettingsPanelProps {
  provider: Provider | null;
  connectionStatus: ConnectionStatus | null;
  isTestingConnection: boolean;
  onTestConnection: () => void;
  onEditConfiguration: () => void;
  onViewMetrics: () => void;
}

export default function ProviderSettingsPanel({
  provider,
  connectionStatus,
  isTestingConnection,
  onTestConnection,
  onEditConfiguration,
  onViewMetrics,
}: ProviderSettingsPanelProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const statBg = useSemanticToken('surface.base');
  const subtleText = useSemanticToken('text.secondary');

  if (!provider) {
    return (
      <VStack spacing={6} align="stretch" p={6} h="full" justify="center">
        <Icon as={FiSettings} boxSize={12} color={subtleText} mx="auto" />
        <Text color={subtleText} fontSize="sm" textAlign="center">
          Select a provider to view settings
        </Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={4} align="stretch" p={4} h="full">
      {/* Provider Header */}
      <Box>
        <HStack justify="space-between" mb={2}>
          <Text fontSize="sm" fontWeight="600" color={subtleText}>
            PROVIDER SETTINGS
          </Text>
          <Badge 
            colorScheme={provider.status === 'active' ? 'green' : 'gray'}
            fontSize="2xs"
          >
            {provider.status}
          </Badge>
        </HStack>
        <Text fontSize="lg" fontWeight="700">
          {provider.name}
        </Text>
        <Text fontSize="xs" color={subtleText} mt={1}>
          {provider.models.length} models • {provider.endpoints.length} endpoints
        </Text>
      </Box>

      <Divider />

      {/* Quick Stats */}
      <SimpleGrid columns={2} spacing={3}>
        <Box 
          p={3} 
          bg={statBg}
          borderRadius="md"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <Stat size="sm">
            <StatLabel fontSize="xs" color={subtleText}>Models</StatLabel>
            <StatNumber fontSize="lg">{provider.models.length}</StatNumber>
            <StatHelpText fontSize="2xs" mb={0}>Available</StatHelpText>
          </Stat>
        </Box>

        <Box 
          p={3} 
          bg={statBg}
          borderRadius="md"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <Stat size="sm">
            <StatLabel fontSize="xs" color={subtleText}>Projects</StatLabel>
            <StatNumber fontSize="lg">{provider.projects.length}</StatNumber>
            <StatHelpText fontSize="2xs" mb={0}>Using this</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      <Divider />

      {/* Connection Status */}
      {connectionStatus && (
        <Alert 
          status={connectionStatus.success ? 'success' : 'error'} 
          borderRadius="md"
          fontSize="sm"
        >
          <AlertIcon />
          <Text fontSize="xs">{connectionStatus.message}</Text>
        </Alert>
      )}

      {/* Action Buttons */}
      <VStack spacing={2} align="stretch">
        <Button
          size="sm"
          leftIcon={<Icon as={FiCheckCircle} />}
          onClick={onTestConnection}
          isLoading={isTestingConnection}
          loadingText="Testing..."
          variant="outline"
          w="full"
        >
          Test Connection
        </Button>

        <Button
          size="sm"
          leftIcon={<Icon as={FiSettings} />}
          onClick={onEditConfiguration}
          variant="outline"
          w="full"
        >
          Edit Configuration
        </Button>

        <Button
          size="sm"
          leftIcon={<Icon as={FiBarChart2} />}
          onClick={onViewMetrics}
          variant="outline"
          w="full"
        >
          View Metrics
        </Button>
      </VStack>

      <Divider />

      {/* Provider Details */}
      <VStack spacing={3} align="stretch" fontSize="sm">
        <Box>
          <Text fontSize="xs" fontWeight="600" color={subtleText} mb={1}>
            API KEY STATUS
          </Text>
          <HStack>
            <Icon 
              as={provider.apiKeyConfigured ? FiCheckCircle : FiAlertCircle}
              color={provider.apiKeyConfigured ? 'green.500' : 'orange.500'}
            />
            <Text fontSize="sm">
              {provider.apiKeyConfigured ? 'Configured' : 'Not configured'}
            </Text>
          </HStack>
        </Box>

        <Box>
          <Text fontSize="xs" fontWeight="600" color={subtleText} mb={1}>
            RATE LIMIT
          </Text>
          <Text fontSize="sm">
            {provider.requestLimit} requests/min
          </Text>
        </Box>

        <Box>
          <Text fontSize="xs" fontWeight="600" color={subtleText} mb={1}>
            DAILY BUDGET
          </Text>
          <Text fontSize="sm">
            ${provider.dailyLimit.toFixed(2)} per day
          </Text>
        </Box>
      </VStack>
    </VStack>
  );
}
