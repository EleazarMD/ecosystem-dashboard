/**
 * Step 2: Email Configuration
 * 
 * Configure email via IMAP or OAuth2. Auto-populates settings for known providers.
 * Blocked for child accounts per Chapter 19 service access matrix.
 */

import React from 'react';
import {
  VStack,
  HStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  Select,
  Box,
  Text,
  Badge,
  Alert,
  AlertIcon,
  AlertDescription,
  SimpleGrid,
  Button,
  Spinner,
  Checkbox,
  Divider,
  Code,
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, LockIcon } from '@chakra-ui/icons';

import {
  EmailFormData,
  EmailProvider,
  EmailAuthMethod,
  EMAIL_PROVIDERS,
  AccountType,
} from '@/lib/platform/onboarding-types';

interface EmailStepProps {
  data: EmailFormData;
  errors: Record<string, string>;
  accountType: AccountType;
  onChange: (updates: Partial<EmailFormData>) => void;
}

export function EmailStep({ data, errors, accountType, onChange }: EmailStepProps) {

  // Children cannot access email
  if (accountType === 'child') {
    return (
      <VStack spacing={6} align="stretch">
        <Alert status="info" borderRadius="lg" bg="purple.900" borderColor="purple.700" borderWidth="1px">
          <AlertIcon color="purple.300" />
          <Box>
            <AlertDescription color="purple.200">
              <Text fontWeight="bold" mb={1}>Email is not available for child accounts</Text>
              <Text fontSize="sm">
                Per the AI Homelab security policy (Chapter 19), email access is blocked for child accounts.
                This step will be automatically skipped.
              </Text>
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    );
  }

  const selectedProvider = EMAIL_PROVIDERS.find(p => p.id === data.provider);

  const handleProviderSelect = (providerId: EmailProvider) => {
    const provider = EMAIL_PROVIDERS.find(p => p.id === providerId);
    if (!provider) return;
    onChange({
      provider: providerId,
      imapServer: provider.imapServer,
      imapPort: provider.imapPort,
      smtpServer: provider.smtpServer,
      smtpPort: provider.smtpPort,
      authMethod: provider.preferredAuth,
      connectionStatus: 'untested',
      connectionTested: false,
    });
  };

  const handleTestConnection = async () => {
    onChange({ connectionStatus: 'testing' });
    try {
      const res = await fetch('/api/platform/email/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: data.provider,
          imapServer: data.imapServer,
          imapPort: data.imapPort,
          smtpServer: data.smtpServer,
          smtpPort: data.smtpPort,
          username: data.username || data.emailAddress,
          password: data.password,
          authMethod: data.authMethod,
        }),
      });
      const result = await res.json();
      onChange({
        connectionStatus: result.success ? 'success' : 'failed',
        connectionTested: true,
        connectionError: result.error,
      });
    } catch {
      onChange({
        connectionStatus: 'failed',
        connectionTested: true,
        connectionError: 'Could not reach the server',
      });
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Skip Option */}
      <Checkbox
        isChecked={data.skipEmail}
        onChange={(e) => onChange({ skipEmail: e.target.checked })}
        colorScheme="gray"
        color="gray.300"
      >
        Skip email setup for now (can configure later)
      </Checkbox>

      {!data.skipEmail && (
        <>
          {/* SaaS Best Practices */}
          <Alert status="info" borderRadius="md" bg="blue.900" borderColor="blue.700" borderWidth="1px">
            <AlertIcon color="blue.300" />
            <AlertDescription fontSize="sm" color="blue.200">
              <Text fontWeight="bold" mb={1}>Email Security Best Practices</Text>
              <Text>
                <strong>OAuth2</strong> is the recommended authentication method (Gmail, Outlook).
                If OAuth2 is unavailable, use <strong>app-specific passwords</strong> instead of your main account password.
                Never store your primary email password directly.
              </Text>
            </AlertDescription>
          </Alert>

          {/* Provider Selection */}
          <Box>
            <Text fontWeight="semibold" color="white" mb={3}>Select Email Provider</Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              {EMAIL_PROVIDERS.map((provider) => (
                <Box
                  key={provider.id}
                  p={4}
                  borderRadius="lg"
                  borderWidth="2px"
                  borderColor={data.provider === provider.id ? 'blue.500' : 'gray.700'}
                  bg={data.provider === provider.id ? 'blue.900' : 'gray.800'}
                  cursor="pointer"
                  onClick={() => handleProviderSelect(provider.id)}
                  _hover={{ borderColor: 'blue.400' }}
                  transition="all 0.2s"
                >
                  <HStack justify="space-between">
                    <HStack>
                      <Text fontSize="xl">{provider.icon}</Text>
                      <VStack align="start" spacing={0}>
                        <Text color="white" fontWeight="medium" fontSize="sm">{provider.name}</Text>
                        <HStack spacing={1}>
                          {provider.oauthSupported && (
                            <Badge colorScheme="green" fontSize="xs">OAuth2</Badge>
                          )}
                          <Badge colorScheme="gray" fontSize="xs">{provider.preferredAuth}</Badge>
                        </HStack>
                      </VStack>
                    </HStack>
                    {data.provider === provider.id && <CheckCircleIcon color="blue.300" />}
                  </HStack>
                </Box>
              ))}
            </SimpleGrid>
          </Box>

          {/* Provider-Specific Configuration */}
          {selectedProvider && (
            <>
              {/* SaaS Recommendation */}
              <Alert status="warning" borderRadius="md" bg="yellow.900" borderColor="yellow.700" borderWidth="1px">
                <AlertIcon color="yellow.300" />
                <AlertDescription fontSize="sm" color="yellow.200">
                  {selectedProvider.saasRecommendation}
                  {selectedProvider.appPasswordUrl && (
                    <Text mt={1}>
                      <Code fontSize="xs" bg="gray.800" color="yellow.300">{selectedProvider.appPasswordUrl}</Code>
                    </Text>
                  )}
                </AlertDescription>
              </Alert>

              <VStack spacing={4}>
                <FormControl isInvalid={!!errors.emailAddress} isRequired>
                  <FormLabel color="gray.300" fontSize="sm">Email Address</FormLabel>
                  <Input
                    type="email"
                    value={data.emailAddress}
                    onChange={(e) => onChange({ emailAddress: e.target.value })}
                    placeholder="your.email@provider.com"
                    bg="gray.900"
                    borderColor="gray.600"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                  />
                  <FormErrorMessage>{errors.emailAddress}</FormErrorMessage>
                </FormControl>

                {/* Auth Method */}
                <FormControl>
                  <FormLabel color="gray.300" fontSize="sm">Authentication Method</FormLabel>
                  <Select
                    value={data.authMethod}
                    onChange={(e) => onChange({ authMethod: e.target.value as EmailAuthMethod })}
                    bg="gray.900"
                    borderColor="gray.600"
                    color="white"
                  >
                    {selectedProvider.oauthSupported && (
                      <option value="oauth2">OAuth2 (Recommended)</option>
                    )}
                    <option value="app-password">App-Specific Password</option>
                    <option value="imap-credentials">IMAP Credentials</option>
                  </Select>
                </FormControl>

                {data.authMethod !== 'oauth2' && (
                  <FormControl isInvalid={!!errors.password} isRequired>
                    <FormLabel color="gray.300" fontSize="sm">
                      {data.authMethod === 'app-password' ? 'App-Specific Password' : 'Password'}
                    </FormLabel>
                    <Input
                      type="password"
                      value={data.password}
                      onChange={(e) => onChange({ password: e.target.value })}
                      placeholder={data.authMethod === 'app-password' ? 'xxxx-xxxx-xxxx-xxxx' : 'Enter password'}
                      bg="gray.900"
                      borderColor="gray.600"
                      color="white"
                      _placeholder={{ color: 'gray.500' }}
                    />
                    <FormErrorMessage>{errors.password}</FormErrorMessage>
                  </FormControl>
                )}

                {data.authMethod === 'oauth2' && (
                  <Button colorScheme="blue" w="full">
                    Connect with {selectedProvider.name} (OAuth2)
                  </Button>
                )}

                {/* Server Settings (expandable for custom IMAP) */}
                {data.provider === 'custom-imap' && (
                  <>
                    <Divider borderColor="gray.700" />
                    <Text fontWeight="semibold" color="white" fontSize="sm">Server Settings</Text>
                    <HStack spacing={4} w="full">
                      <FormControl isInvalid={!!errors.imapServer} isRequired>
                        <FormLabel color="gray.300" fontSize="sm">IMAP Server</FormLabel>
                        <Input
                          value={data.imapServer}
                          onChange={(e) => onChange({ imapServer: e.target.value })}
                          placeholder="imap.example.com"
                          bg="gray.900"
                          borderColor="gray.600"
                          color="white"
                          _placeholder={{ color: 'gray.500' }}
                        />
                        <FormErrorMessage>{errors.imapServer}</FormErrorMessage>
                      </FormControl>
                      <FormControl w="120px">
                        <FormLabel color="gray.300" fontSize="sm">Port</FormLabel>
                        <Input
                          type="number"
                          value={data.imapPort}
                          onChange={(e) => onChange({ imapPort: parseInt(e.target.value) })}
                          bg="gray.900"
                          borderColor="gray.600"
                          color="white"
                        />
                      </FormControl>
                    </HStack>
                    <HStack spacing={4} w="full">
                      <FormControl isInvalid={!!errors.smtpServer} isRequired>
                        <FormLabel color="gray.300" fontSize="sm">SMTP Server</FormLabel>
                        <Input
                          value={data.smtpServer}
                          onChange={(e) => onChange({ smtpServer: e.target.value })}
                          placeholder="smtp.example.com"
                          bg="gray.900"
                          borderColor="gray.600"
                          color="white"
                          _placeholder={{ color: 'gray.500' }}
                        />
                        <FormErrorMessage>{errors.smtpServer}</FormErrorMessage>
                      </FormControl>
                      <FormControl w="120px">
                        <FormLabel color="gray.300" fontSize="sm">Port</FormLabel>
                        <Input
                          type="number"
                          value={data.smtpPort}
                          onChange={(e) => onChange({ smtpPort: parseInt(e.target.value) })}
                          bg="gray.900"
                          borderColor="gray.600"
                          color="white"
                        />
                      </FormControl>
                    </HStack>
                  </>
                )}

                {/* Connection Test */}
                <HStack w="full" spacing={4}>
                  <Button
                    colorScheme={data.connectionStatus === 'success' ? 'green' : 'blue'}
                    variant="outline"
                    onClick={handleTestConnection}
                    isLoading={data.connectionStatus === 'testing'}
                    loadingText="Testing..."
                    leftIcon={
                      data.connectionStatus === 'success' ? <CheckCircleIcon /> :
                      data.connectionStatus === 'failed' ? <WarningIcon /> : undefined
                    }
                    flex={1}
                  >
                    {data.connectionStatus === 'success' ? 'Connection Verified' :
                     data.connectionStatus === 'failed' ? 'Retry Connection' :
                     'Test Connection'}
                  </Button>
                </HStack>

                {data.connectionStatus === 'failed' && data.connectionError && (
                  <Alert status="error" borderRadius="md" bg="red.900" borderColor="red.700" borderWidth="1px">
                    <AlertIcon color="red.300" />
                    <AlertDescription fontSize="sm" color="red.200">
                      {data.connectionError}
                    </AlertDescription>
                  </Alert>
                )}

                <Text fontSize="xs" color="gray.500">
                  Credentials are encrypted at rest using a tenant-specific encryption key. 
                  Your email password is never stored in plain text.
                </Text>
              </VStack>
            </>
          )}
        </>
      )}
    </VStack>
  );
}
