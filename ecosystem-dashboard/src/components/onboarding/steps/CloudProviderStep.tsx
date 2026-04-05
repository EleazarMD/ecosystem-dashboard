/**
 * Step 5: Cloud Provider Configuration (Optional, Blocked by Default)
 * 
 * Allows users to optionally add API keys for Anthropic, Google, OpenAI.
 * Cloud providers are blocked by default — local-first philosophy.
 * Child accounts cannot enable cloud providers without parental approval.
 */

import React from 'react';
import {
  VStack,
  HStack,
  Box,
  Text,
  Badge,
  Alert,
  AlertIcon,
  AlertDescription,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  Switch,
  FormControl,
  FormLabel,
  FormHelperText,
  Checkbox,
  SimpleGrid,
  Spinner,
  Divider,
  Tag,
  TagLabel,
  Code,
  IconButton,
} from '@chakra-ui/react';
import { LockIcon, CheckCircleIcon, WarningIcon, ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

import {
  CloudProviderFormData,
  CloudProviderConfig,
  AccountType,
} from '@/lib/platform/onboarding-types';

interface CloudProviderStepProps {
  data: CloudProviderFormData;
  accountType: AccountType;
  onChange: (updates: Partial<CloudProviderFormData>) => void;
}

export function CloudProviderStep({ data, accountType, onChange }: CloudProviderStepProps) {
  const [showKeys, setShowKeys] = React.useState<Record<string, boolean>>({});

  const updateProvider = (id: string, updates: Partial<CloudProviderConfig>) => {
    const providers = data.providers.map(p =>
      p.id === id ? { ...p, ...updates } : p
    );
    onChange({ providers });
  };

  const toggleProviderEnabled = (id: string) => {
    const provider = data.providers.find(p => p.id === id);
    if (!provider) return;
    updateProvider(id, {
      enabled: !provider.enabled,
      blocked: provider.enabled ? true : false,
    });
  };

  const validateApiKey = async (id: string) => {
    const provider = data.providers.find(p => p.id === id);
    if (!provider || !provider.apiKey) return;

    updateProvider(id, { validationStatus: 'checking' });

    try {
      const res = await fetch('/api/platform/cloud-provider/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: id, apiKey: provider.apiKey }),
      });
      const result = await res.json();
      updateProvider(id, {
        validationStatus: result.valid ? 'valid' : 'invalid',
        apiKeyValid: result.valid,
      });
    } catch {
      updateProvider(id, { validationStatus: 'invalid', apiKeyValid: false });
    }
  };

  // Child accounts cannot enable cloud providers
  if (accountType === 'child') {
    return (
      <VStack spacing={6} align="stretch">
        <Alert status="warning" borderRadius="lg" bg="orange.900" borderColor="orange.700" borderWidth="1px">
          <AlertIcon color="orange.300" />
          <Box>
            <AlertDescription color="orange.200">
              <Text fontWeight="bold" mb={1}>Cloud Providers Locked for Child Accounts</Text>
              <Text fontSize="sm">
                Cloud AI providers (Anthropic, Google, OpenAI) cannot be enabled on child accounts
                without explicit parental approval. This ensures local-first, privacy-preserving AI usage.
              </Text>
            </AlertDescription>
          </Box>
        </Alert>

        <SimpleGrid columns={3} spacing={3}>
          {data.providers.map((provider) => (
            <Box
              key={provider.id}
              p={4}
              borderRadius="lg"
              borderWidth="1px"
              borderColor="gray.700"
              bg="gray.800"
              opacity={0.5}
            >
              <HStack mb={2}>
                <Text fontSize="xl">{provider.icon}</Text>
                <Text color="gray.400" fontWeight="medium" fontSize="sm">{provider.name}</Text>
              </HStack>
              <Badge colorScheme="red" fontSize="xs">
                <LockIcon mr={1} /> Blocked
              </Badge>
            </Box>
          ))}
        </SimpleGrid>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Local-First Banner */}
      <Alert status="info" borderRadius="lg" bg="green.900" borderColor="green.700" borderWidth="1px">
        <AlertIcon color="green.300" />
        <Box>
          <AlertDescription color="green.200">
            <Text fontWeight="bold" mb={1}>🏠 Local Models First — Cloud is Optional</Text>
            <Text fontSize="sm">
              Your homelab runs MiniMax, Qwen Vision, and Qwen TTS locally at zero cost. 
              Cloud providers are <strong>blocked by default</strong> and only needed for specific use cases 
              (e.g., Claude for deep analysis, GPT-4o for specialized tasks). You can always add them later.
            </Text>
          </AlertDescription>
        </Box>
      </Alert>

      {/* Provider Cards */}
      <VStack spacing={4} align="stretch">
        {data.providers.map((provider) => (
          <Box
            key={provider.id}
            bg="gray.800"
            p={5}
            borderRadius="lg"
            borderWidth="1px"
            borderColor={provider.enabled ? 'blue.600' : 'gray.700'}
            opacity={provider.blocked && !provider.enabled ? 0.7 : 1}
          >
            <HStack justify="space-between" mb={3}>
              <HStack spacing={3}>
                <Text fontSize="2xl">{provider.icon}</Text>
                <VStack align="start" spacing={0}>
                  <Text color="white" fontWeight="bold" fontSize="md">{provider.name}</Text>
                  <Text fontSize="xs" color="gray.400">{provider.description}</Text>
                </VStack>
              </HStack>
              <HStack>
                {provider.blocked && !provider.enabled ? (
                  <Badge colorScheme="red" variant="subtle" fontSize="xs">
                    <LockIcon mr={1} /> Blocked
                  </Badge>
                ) : provider.enabled ? (
                  <Badge colorScheme="green" variant="subtle" fontSize="xs">
                    <CheckCircleIcon mr={1} /> Enabled
                  </Badge>
                ) : null}
                <Switch
                  isChecked={provider.enabled}
                  onChange={() => toggleProviderEnabled(provider.id)}
                  colorScheme="blue"
                />
              </HStack>
            </HStack>

            {provider.enabled && (
              <VStack spacing={3} align="stretch" mt={3}>
                <Divider borderColor="gray.700" />

                {/* Models Available */}
                <HStack flexWrap="wrap" spacing={1}>
                  <Text fontSize="xs" color="gray.500" mr={1}>Models:</Text>
                  {provider.models.map((model) => (
                    <Tag key={model} size="sm" colorScheme="gray" variant="outline">
                      <TagLabel fontSize="xs">{model}</TagLabel>
                    </Tag>
                  ))}
                </HStack>

                {/* Cost Warning */}
                <Alert status="warning" borderRadius="md" bg="yellow.900" borderColor="yellow.700" borderWidth="1px" py={2}>
                  <AlertIcon color="yellow.300" boxSize={4} />
                  <AlertDescription fontSize="xs" color="yellow.200">
                    Estimated cost: <strong>{provider.estimatedCost}</strong>. 
                    Per-tenant rate limits will be enforced.
                  </AlertDescription>
                </Alert>

                {/* API Key Input */}
                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">API Key</FormLabel>
                  <InputGroup>
                    <Input
                      type={showKeys[provider.id] ? 'text' : 'password'}
                      value={provider.apiKey}
                      onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value, validationStatus: 'unchecked', apiKeyValid: null })}
                      placeholder={`sk-... or paste your ${provider.name} API key`}
                      bg="gray.900"
                      borderColor="gray.600"
                      color="white"
                      _placeholder={{ color: 'gray.500' }}
                      fontSize="sm"
                    />
                    <InputRightElement width="80px">
                      <HStack spacing={1}>
                        <IconButton
                          aria-label="Toggle visibility"
                          icon={showKeys[provider.id] ? <ViewOffIcon /> : <ViewIcon />}
                          size="xs"
                          variant="ghost"
                          color="gray.400"
                          onClick={() => setShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                        />
                        <Button
                          size="xs"
                          colorScheme={
                            provider.validationStatus === 'valid' ? 'green' :
                            provider.validationStatus === 'invalid' ? 'red' : 'blue'
                          }
                          variant="ghost"
                          onClick={() => validateApiKey(provider.id)}
                          isLoading={provider.validationStatus === 'checking'}
                          isDisabled={!provider.apiKey}
                        >
                          {provider.validationStatus === 'valid' ? '✓' :
                           provider.validationStatus === 'invalid' ? '✗' : 'Test'}
                        </Button>
                      </HStack>
                    </InputRightElement>
                  </InputGroup>
                  <FormHelperText color="gray.500" fontSize="xs">
                    Keys are encrypted at rest with tenant-specific encryption. Never stored in plain text.
                  </FormHelperText>
                </FormControl>
              </VStack>
            )}
          </Box>
        ))}
      </VStack>

      {/* Cost Acknowledgment */}
      {data.providers.some(p => p.enabled) && (
        <Checkbox
          isChecked={data.acknowledgedCosts}
          onChange={(e) => onChange({ acknowledgedCosts: e.target.checked })}
          colorScheme="yellow"
          color="gray.300"
        >
          <Text fontSize="sm">
            I understand that enabling cloud providers incurs per-request costs and accept responsibility for usage charges.
          </Text>
        </Checkbox>
      )}
    </VStack>
  );
}
