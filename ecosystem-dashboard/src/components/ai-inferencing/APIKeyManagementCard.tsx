/**
 * API Key Management Card Component
 * Secure API key configuration for commercial LLM providers
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  Badge,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  FormHelperText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  IconButton,
  Tooltip,
  Progress,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText
} from '@chakra-ui/react';
import {
  CheckIcon, 
  WarningIcon, 
  ViewIcon, 
  ViewOffIcon,
  DeleteIcon,
  RepeatIcon 
} from '@chakra-ui/icons';

interface APIKeyManagementCardProps {
  providerId: string;
  providerName: string;
  providerColor: string;
  keyPattern: string;
  placeholder: string;
  models: string[];
  capabilities: string[];
  costPerToken: number;
  rateLimit: number;
}

interface APIKeyStatus {
  configured: boolean;
  valid: boolean;
  masked?: string;
  lastUsed?: string;
  usageCount?: number;
  rateLimit?: {
    remaining: number;
    resetAt: string;
  };
}

export const APIKeyManagementCard: React.FC<APIKeyManagementCardProps> = ({
  providerId,
  providerName,
  providerColor,
  keyPattern,
  placeholder,
  models,
  capabilities,
  costPerToken,
  rateLimit
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [keyStatus, setKeyStatus] = useState<APIKeyStatus>({
    configured: false,
    valid: false
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const toast = useToast();

  // Load existing key status on component mount
  useEffect(() => {
    loadKeyStatus();
  }, [providerId]);

  const loadKeyStatus = async () => {
    try {
      const response = await fetch(`/api/ai-inferencing/providers/${providerId}/api-key/status`, {
        headers: {
          'X-API-Key': 'ai-gateway-api-key-2024'
        }
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const status = await response.json();
          setKeyStatus(status);
        }
      } else if (response.status === 404) {
        // API endpoint not implemented yet - silently ignore
        console.debug(`API key status endpoint not available for ${providerId}`);
      }
    } catch (error) {
      // Silently fail for optional feature
      console.debug(`Failed to load key status for ${providerId}:`, error);
    }
  };

  const validateAPIKey = (key: string): boolean => {
    const regex = new RegExp(keyPattern);
    return regex.test(key);
  };

  const handleKeyValidation = async () => {
    if (!apiKey) return;

    // Client-side pattern validation
    if (!validateAPIKey(apiKey)) {
      setValidationError(`Invalid ${providerName} API key format`);
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await fetch(`/api/ai-inferencing/providers/${providerId}/api-key/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'ai-gateway-api-key-2024'
        },
        body: JSON.stringify({ key: apiKey })
      });

      const result = await response.json();

      if (response.ok && result.valid) {
        setKeyStatus(prev => ({ ...prev, valid: true }));
        toast({
          title: 'API Key Valid',
          description: `${providerName} API key validated successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      } else {
        setValidationError(result.message || 'API key validation failed');
        setKeyStatus(prev => ({ ...prev, valid: false }));
      }
    } catch (error) {
      setValidationError('Failed to validate API key');
      console.error(`API key validation error for ${providerId}:`, error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyConfiguration = async () => {
    if (!apiKey || !keyStatus.valid) return;

    setIsConfiguring(true);

    try {
      const response = await fetch(`/api/ai-inferencing/providers/${providerId}/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'ai-gateway-api-key-2024'
        },
        body: JSON.stringify({
          key: apiKey,
          name: `${providerName} Production Key`,
          permissions: capabilities,
          rateLimit: rateLimit
        })
      });

      if (response.ok) {
        setKeyStatus(prev => ({ 
          ...prev, 
          configured: true,
          masked: apiKey.substring(0, 8) + '...' + apiKey.slice(-6)
        }));
        setApiKey(''); // Clear the input for security
        
        toast({
          title: 'API Key Configured',
          description: `${providerName} API key configured and encrypted successfully`,
          status: 'success',
          duration: 5000,
          isClosable: true
        });

        // Reload status to get updated information
        await loadKeyStatus();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Configuration failed');
      }
    } catch (error) {
      toast({
        title: 'Configuration Failed',
        description: error instanceof Error ? error.message : 'Failed to configure API key',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleKeyRotation = async () => {
    // TODO: Implement key rotation functionality
    toast({
      title: 'Key Rotation',
      description: 'Key rotation feature coming soon',
      status: 'info',
      duration: 3000,
      isClosable: true
    });
  };

  const handleKeyDeletion = async () => {
    if (!confirm(`Are you sure you want to delete the ${providerName} API key?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/ai-inferencing/providers/${providerId}/api-key`, {
        method: 'DELETE',
        headers: {
          'X-API-Key': 'ai-gateway-api-key-2024'
        }
      });

      if (response.ok) {
        setKeyStatus({
          configured: false,
          valid: false
        });
        
        toast({
          title: 'API Key Deleted',
          description: `${providerName} API key removed successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      toast({
        title: 'Deletion Failed',
        description: 'Failed to delete API key',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <HStack justify="space-between">
          <HStack>
            <Badge colorScheme={providerColor} p={2}>
              {providerName}
            </Badge>
            {keyStatus.configured && (
              <Badge colorScheme="green" size="sm">
                CONFIGURED
              </Badge>
            )}
          </HStack>
          {keyStatus.configured && (
            <HStack>
              <Tooltip label="Rotate API Key">
                <IconButton
                  aria-label="Rotate key"
                  icon={<RepeatIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={handleKeyRotation}
                />
              </Tooltip>
              <Tooltip label="Delete API Key">
                <IconButton
                  aria-label="Delete key"
                  icon={<DeleteIcon />}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={handleKeyDeletion}
                />
              </Tooltip>
            </HStack>
          )}
        </HStack>
      </CardHeader>
      
      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* API Key Configuration */}
          {!keyStatus.configured ? (
            <FormControl>
              <FormLabel>API Key</FormLabel>
              <InputGroup>
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setValidationError(null);
                    setKeyStatus(prev => ({ ...prev, valid: false }));
                  }}
                  placeholder={placeholder}
                  bg={useSemanticToken('surface.elevated')}
                />
                <InputRightElement>
                  <HStack>
                    {keyStatus.valid && <CheckIcon color="green.500" />}
                    {validationError && <WarningIcon color="red.500" />}
                    <IconButton
                      aria-label={showKey ? 'Hide key' : 'Show key'}
                      icon={showKey ? <ViewOffIcon /> : <ViewIcon />}
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowKey(!showKey)}
                    />
                  </HStack>
                </InputRightElement>
              </InputGroup>
              <FormHelperText>
                Pattern: {keyPattern}
              </FormHelperText>
              {validationError && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {validationError}
                </Text>
              )}
            </FormControl>
          ) : (
            <Alert status="success" size="sm">
              <AlertIcon />
              <Box>
                <AlertTitle>API Key Configured</AlertTitle>
                <AlertDescription>
                  Key: {keyStatus.masked}
                  {keyStatus.lastUsed && (
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      Last used: {new Date(keyStatus.lastUsed).toLocaleString()}
                    </Text>
                  )}
                </AlertDescription>
              </Box>
            </Alert>
          )}

          {/* Action Buttons */}
          {!keyStatus.configured && (
            <HStack>
              <Button
                onClick={handleKeyValidation}
                isLoading={isValidating}
                loadingText="Validating..."
                size="sm"
                variant="outline"
                isDisabled={!apiKey}
              >
                Validate
              </Button>
              <Button
                onClick={handleKeyConfiguration}
                isLoading={isConfiguring}
                loadingText="Configuring..."
                colorScheme="blue"
                size="sm"
                isDisabled={!keyStatus.valid}
              >
                Configure
              </Button>
            </HStack>
          )}

          {/* Provider Information */}
          <Box>
            <Text fontWeight="bold" mb={2} fontSize="sm">Provider Details</Text>
            <SimpleGrid columns={2} spacing={4} fontSize="xs">
              <Stat size="sm">
                <StatLabel>Cost per Token</StatLabel>
                <StatNumber>${costPerToken.toFixed(6)}</StatNumber>
              </Stat>
              <Stat size="sm">
                <StatLabel>Rate Limit</StatLabel>
                <StatNumber>{rateLimit}/min</StatNumber>
              </Stat>
            </SimpleGrid>
          </Box>

          {/* Models */}
          <Box>
            <Text fontWeight="bold" mb={2} fontSize="sm">Available Models</Text>
            <HStack wrap="wrap" spacing={2}>
              {models.map((model) => (
                <Badge key={model} size="sm" colorScheme="gray">
                  {model}
                </Badge>
              ))}
            </HStack>
          </Box>

          {/* Capabilities */}
          <Box>
            <Text fontWeight="bold" mb={2} fontSize="sm">Capabilities</Text>
            <HStack wrap="wrap" spacing={2}>
              {capabilities.map((capability) => (
                <Badge key={capability} size="sm" colorScheme={providerColor} variant="outline">
                  {capability}
                </Badge>
              ))}
            </HStack>
          </Box>

          {/* Usage Statistics */}
          {keyStatus.configured && keyStatus.usageCount !== undefined && (
            <Box>
              <Text fontWeight="bold" mb={2} fontSize="sm">Usage Statistics</Text>
              <VStack align="start" spacing={1} fontSize="xs">
                <Text>Total Requests: {keyStatus.usageCount}</Text>
                {keyStatus.rateLimit && (
                  <>
                    <Text>Rate Limit Remaining: {keyStatus.rateLimit.remaining}</Text>
                    <Progress 
                      value={(keyStatus.rateLimit.remaining / rateLimit) * 100} 
                      size="sm" 
                      colorScheme="blue" 
                      w="full"
                    />
                  </>
                )}
              </VStack>
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default APIKeyManagementCard;
