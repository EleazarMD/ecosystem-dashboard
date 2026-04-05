/**
 * Key Details Panel Component
 * Right panel showing controls and settings for selected API key
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  FormControl,
  FormLabel,
  Input,
  Switch,
  Badge,
  Icon,
  Divider,
  useToast,
  IconButton,
  Tooltip,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiShield,
  FiDollarSign,
  FiActivity,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
  FiEyeOff,
  FiCopy,
  FiKey,
} from 'react-icons/fi';
import { ValidationDashboard, ValidationScheduleModal, ValidationHistoryModal } from './validation';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface KeyDetailsPanelProps {
  apiKey: any;
  onUpdate?: (keyId: string, updates: any) => void;
  onDelete?: (keyId: string) => void;
  onValidate?: (keyId: string) => void;
  onClose?: () => void;
}

export const KeyDetailsPanel: React.FC<KeyDetailsPanelProps> = ({
  apiKey,
  onUpdate,
  onDelete,
  onValidate,
  onClose,
}) => {
  console.log(' [KeyDetailsPanel] COMPONENT MOUNTED - VERSION 2024-11-21-00:05');
  console.log(' [KeyDetailsPanel] apiKey:', apiKey?.key_id || apiKey?.id);
  console.log(' [KeyDetailsPanel] onDelete callback:', typeof onDelete);

  const [isEditing, setIsEditing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState(apiKey?.provider_display_name || apiKey?.metadata?.displayName || '');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(apiKey?.rate_limit_per_minute || 100);
  const [costLimitDaily, setCostLimitDaily] = useState(apiKey?.cost_limit_daily || 50);
  const [isPrimary, setIsPrimary] = useState(apiKey?.is_primary || false);
  const [editAccessKey, setEditAccessKey] = useState('');
  const [editSecretKey, setEditSecretKey] = useState('');
  const toast = useToast();

  // Prevent panel from closing when interacting with inputs
  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Sync state with apiKey prop changes
  React.useEffect(() => {
    if (apiKey) {
      setDisplayName(apiKey.provider_display_name || apiKey.metadata?.displayName || '');
      setRateLimitPerMinute(apiKey.rate_limit_per_minute || 100);
      setCostLimitDaily(apiKey.cost_limit_daily || 50);
      setIsPrimary(apiKey.is_primary || false);
    }
  }, [apiKey]);

  const handleSave = () => {
    if (onUpdate) {
      // Support both key_id and id formats
      const keyId = apiKey.key_id || apiKey.id;
      
      if (!keyId) {
        console.error('[KeyDetailsPanel] No key ID found for update:', apiKey);
        toast({
          title: 'Error',
          description: 'Could not identify API key to update',
          status: 'error',
          duration: 3000,
        });
        return;
      }
      
      // Convert to snake_case for backend API
      const updates: any = {
        rate_limit_per_minute: rateLimitPerMinute,
        cost_limit_daily: costLimitDaily,
        is_primary: isPrimary,
      };
      
      // Include display name in metadata
      if (displayName.trim()) {
        updates.metadata = {
          ...(apiKey?.metadata || {}),
          displayName: displayName.trim(),
        };
      }
      
      // Include new keys if provided (backend expects snake_case)
      if (editAccessKey.trim()) {
        updates.api_key = editAccessKey.trim();
      }
      if (editSecretKey.trim()) {
        updates.secret_key = editSecretKey.trim();
      }
      
      console.log('[KeyDetailsPanel] Updating key:', keyId);
      console.log('[KeyDetailsPanel] Sending updates to backend:', updates);
      onUpdate(keyId, updates);
    }
    setIsEditing(false);
    setEditAccessKey('');
    setEditSecretKey('');
    toast({
      title: 'Settings updated',
      status: 'success',
      duration: 2000,
    });
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      // Support both key_id and id formats
      const keyId = apiKey.key_id || apiKey.id || apiKey.keyId;
      
      console.log('[KeyDetailsPanel] Validating key:', keyId);
      console.log('[KeyDetailsPanel] API Key object:', apiKey);
      
      if (onValidate && keyId) {
        await onValidate(keyId);
      } else if (!keyId) {
        console.error('[KeyDetailsPanel] No key ID found in API key object:', apiKey);
        throw new Error('No key ID found in API key object');
      }
      toast({
        title: 'Validation started',
        description: 'Testing API key with provider...',
        status: 'info',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Validation failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this API key?')) {
      if (onDelete) {
        // Support both key_id and id formats
        const keyId = apiKey.key_id || apiKey.id;
        console.log('[KeyDetailsPanel] Deleting key with ID:', keyId);
        if (!keyId) {
          console.error('[KeyDetailsPanel] No key ID found:', apiKey);
          return;
        }
        onDelete(keyId);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'green';
      case 'invalid': return 'red';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  return (
    <Box 
      p={6} 
      h="full" 
      overflowY="auto"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseOver={(e) => e.stopPropagation()}
      onFocus={(e) => e.stopPropagation()}
    >
      <VStack spacing={6} align="stretch">
        {/* Header with Title and Action Buttons */}
        <Box>
          <HStack justify="space-between" mb={3}>
            <Text fontSize="lg" fontWeight="bold">API Key Settings</Text>
            <HStack>
              {!isEditing && (
                <Button
                  leftIcon={<FiEdit2 />}
                  size="sm"
                  colorScheme="blue"
                  onClick={() => {
                    console.log('[KeyDetailsPanel] Edit button clicked - enabling inline editing');
                    setIsEditing(true);
                  }}
                >
                  Edit
                </Button>
              )}
              <Button
                size="sm"
                colorScheme="red"
                variant="outline"
                leftIcon={<FiTrash2 />}
                onClick={() => {
                  console.log('🗑️ [KeyDetailsPanel] DELETE BUTTON CLICKED!');
                  handleDelete();
                }}
              >
                Delete
              </Button>
            </HStack>
          </HStack>
          
          <HStack spacing={2} mb={4}>
            <Badge colorScheme={getStatusColor(apiKey?.validation_status)} fontSize="xs">
              {apiKey?.validation_status?.toUpperCase() || 'PENDING'}
            </Badge>
            {apiKey?.is_primary && (
              <Badge colorScheme="blue" fontSize="xs">PRIMARY</Badge>
            )}
            {apiKey?.is_active ? (
              <Badge colorScheme="green" fontSize="xs">ACTIVE</Badge>
            ) : (
              <Badge colorScheme="gray" fontSize="xs">INACTIVE</Badge>
            )}
          </HStack>

        </Box>

        <Divider />

        {/* Validation Dashboard */}
        {apiKey?.key_id && (
          <>
            <ValidationDashboard
              keyId={apiKey.key_id}
              onSchedule={() => setIsScheduleModalOpen(true)}
              onViewFullHistory={() => setIsHistoryModalOpen(true)}
            />
            
            {/* Modals */}
            <ValidationScheduleModal
              isOpen={isScheduleModalOpen}
              onClose={() => setIsScheduleModalOpen(false)}
              keyId={apiKey.key_id}
              keyName={apiKey.provider_display_name || apiKey.provider}
            />
            
            <ValidationHistoryModal
              isOpen={isHistoryModalOpen}
              onClose={() => setIsHistoryModalOpen(false)}
              keyId={apiKey.key_id}
              keyName={apiKey.provider_display_name || apiKey.provider}
              provider={apiKey.provider}
            />
          </>
        )}

        <Divider />

        {/* Provider Info */}
        <Box>
          <Text fontSize="sm" fontWeight="bold" mb={3}>Provider Details</Text>
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Provider</Text>
              <Badge colorScheme="purple" textTransform="capitalize">
                {apiKey?.provider}
              </Badge>
            </HStack>
            
            {/* Display Name - Editable */}
            {isEditing ? (
              <FormControl>
                <FormLabel fontSize="sm">Display Name</FormLabel>
                <Input
                  size="sm"
                  placeholder="e.g., Production OpenAI Key"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                  A friendly name to identify this key
                </Text>
              </FormControl>
            ) : (
              <HStack justify="space-between">
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Display Name</Text>
                <Text fontSize="sm" fontWeight="medium">
                  {apiKey?.provider_display_name || apiKey?.metadata?.displayName || <Text as="span" color={useSemanticToken('text.tertiary')} fontStyle="italic">Not set</Text>}
                </Text>
              </HStack>
            )}
            
            <HStack justify="space-between">
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Service</Text>
              <Text fontSize="sm" fontWeight="medium">{apiKey?.service_id}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Project</Text>
              <Text fontSize="sm" fontWeight="medium">{apiKey?.project_id}</Text>
            </HStack>
          </VStack>
        </Box>

        <Divider />

        {/* API Credentials Section */}
        <Box>
          <HStack mb={3} justify="space-between">
            <HStack>
              <Icon as={FiKey} color={useSemanticToken('icon.primary')} />
              <Text fontSize="sm" fontWeight="bold">API Credentials</Text>
            </HStack>
          </HStack>

          <VStack align="stretch" spacing={3}>
            {/* Access Key / API Key */}
            <FormControl>
              <FormLabel fontSize="sm">
                {apiKey?.provider === 'unsplash' ? 'Access Key' : 'API Key'}
              </FormLabel>
              {isEditing ? (
                <Box>
                  <Input
                    type="text"
                    size="sm"
                    placeholder={`Enter new ${apiKey?.provider === 'unsplash' ? 'Access Key' : 'API Key'} (leave empty to keep current)`}
                    value={editAccessKey}
                    onChange={(e) => setEditAccessKey(e.target.value)}
                    fontFamily="mono"
                    fontSize="xs"
                  />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    Leave empty to keep the existing key
                  </Text>
                </Box>
              ) : (
                <Box>
                  <HStack>
                    <Input
                      type={showAccessKey ? 'text' : 'password'}
                      size="sm"
                      value={apiKey?.masked_key || '••••••••••••••••'}
                      isReadOnly
                      fontFamily="mono"
                      fontSize="xs"
                      bg={useSemanticToken('surface.base')}
                    />
                    <Tooltip label={showAccessKey ? 'Hide' : 'Show'}>
                      <IconButton
                        aria-label="Toggle visibility"
                        icon={showAccessKey ? <FiEyeOff /> : <FiEye />}
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowAccessKey(!showAccessKey)}
                      />
                    </Tooltip>
                    <Tooltip label="Copy to clipboard">
                      <IconButton
                        aria-label="Copy key"
                        icon={<FiCopy />}
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(apiKey?.masked_key || '');
                          toast({
                            title: 'Copied to clipboard',
                            status: 'success',
                            duration: 2000,
                          });
                        }}
                      />
                    </Tooltip>
                  </HStack>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    Masked for security - full key cannot be retrieved
                  </Text>
                </Box>
              )}
            </FormControl>

            {/* Secret Key (Unsplash only) */}
            {apiKey?.provider === 'unsplash' && (
              <FormControl>
                <FormLabel fontSize="sm">Secret Key (Optional)</FormLabel>
                {isEditing ? (
                  <Box>
                    <Input
                      type="text"
                      size="sm"
                      placeholder="Enter new Secret Key (leave empty to keep current)"
                      value={editSecretKey}
                      onChange={(e) => setEditSecretKey(e.target.value)}
                      fontFamily="mono"
                      fontSize="xs"
                    />
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                      Used for OAuth and write operations. Leave empty to keep existing.
                    </Text>
                  </Box>
                ) : (
                  <Box>
                    <HStack>
                      <Input
                        type={showSecretKey ? 'text' : 'password'}
                        size="sm"
                        value={apiKey?.secret_key || (apiKey?.metadata?.secret_key ? '••••••••••••••••' : 'Not configured')}
                        isReadOnly
                        fontFamily="mono"
                        fontSize="xs"
                        bg={useSemanticToken('surface.elevated')}
                      />
                      <Tooltip label={showSecretKey ? 'Hide' : 'Show'}>
                        <IconButton
                          aria-label="Toggle visibility"
                          icon={showSecretKey ? <FiEyeOff /> : <FiEye />}
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                          isDisabled={!apiKey?.secret_key && !apiKey?.metadata?.secret_key}
                        />
                      </Tooltip>
                      <Tooltip label="Copy to clipboard">
                        <IconButton
                          aria-label="Copy secret key"
                          icon={<FiCopy />}
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(apiKey?.secret_key || '');
                            toast({
                              title: 'Secret key copied to clipboard',
                              status: 'success',
                              duration: 2000,
                            });
                          }}
                          isDisabled={!apiKey?.secret_key && !apiKey?.metadata?.secret_key}
                        />
                      </Tooltip>
                    </HStack>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                      {apiKey?.secret_key || apiKey?.metadata?.secret_key 
                        ? 'Used for OAuth and write operations - masked for security'
                        : 'Click Edit to add a Secret Key for OAuth support'}
                    </Text>
                  </Box>
                )}
              </FormControl>
            )}

            {!isEditing && (
              <Box p={2} bg={useSemanticToken('status.warningSubtle')} borderRadius="md" borderLeft="3px" borderLeftColor={useSemanticToken('status.warning')}>
                <HStack spacing={2}>
                  <Icon as={FiAlertCircle} color={useSemanticToken('status.warning')} boxSize={3} />
                  <Text fontSize="xs" color={useSemanticToken('text.primary')}>
                    Full key values are stored encrypted and cannot be retrieved after creation
                  </Text>
                </HStack>
              </Box>
            )}
          </VStack>
        </Box>

        {/* Settings Section */}
        <Box>
          <HStack mb={4}>
            <Icon as={FiActivity} color={useSemanticToken('icon.primary')} />
            <Text fontSize="sm" fontWeight="bold">Configuration</Text>
          </HStack>

          {isEditing ? (
            // Edit Mode
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">Requests per Minute</FormLabel>
                <Input
                  type="number"
                  size="sm"
                  value={rateLimitPerMinute}
                  onChange={(e) => setRateLimitPerMinute(parseInt(e.target.value))}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Daily Cost Limit (USD)</FormLabel>
                <Input
                  type="number"
                  size="sm"
                  value={costLimitDaily}
                  onChange={(e) => setCostLimitDaily(parseFloat(e.target.value))}
                  step="0.01"
                />
              </FormControl>

              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel htmlFor="primary-key" mb="0" fontSize="sm">
                  Set as Primary Key
                </FormLabel>
                <Switch
                  id="primary-key"
                  isChecked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                />
              </FormControl>

              {/* Save/Cancel Buttons */}
              <HStack spacing={2} pt={2}>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={handleSave}
                  flex="1"
                  leftIcon={<FiCheckCircle />}
                >
                  Save Changes
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(apiKey?.provider_display_name || apiKey?.metadata?.displayName || '');
                    setRateLimitPerMinute(apiKey?.rate_limit_per_minute || 100);
                    setCostLimitDaily(apiKey?.cost_limit_daily || 50);
                    setIsPrimary(apiKey?.is_primary || false);
                    setEditAccessKey('');
                    setEditSecretKey('');
                  }}
                  flex="1"
                >
                  Cancel
                </Button>
              </HStack>
            </VStack>
          ) : (
            // View Mode
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between">
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Requests per Minute</Text>
                <Text fontSize="sm" fontWeight="medium">{apiKey?.rate_limit_per_minute || 100}/min</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Daily Cost Limit</Text>
                <Text fontSize="sm" fontWeight="medium">${apiKey?.cost_limit_daily || 50}/day</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Primary Key</Text>
                <Badge colorScheme={apiKey?.is_primary ? 'blue' : 'gray'} fontSize="xs">
                  {apiKey?.is_primary ? 'YES' : 'NO'}
                </Badge>
              </HStack>
            </VStack>
          )}
        </Box>

        <Divider />

        {/* Metadata */}
        {apiKey?.metadata && (
          <Box>
            <Text fontSize="sm" fontWeight="bold" mb={2}>Metadata</Text>
            <Box p={3} bg={useSemanticToken('surface.base')} borderRadius="md" fontSize="xs">
              <pre>{JSON.stringify(apiKey.metadata, null, 2)}</pre>
            </Box>
          </Box>
        )}

        {/* Last Validated */}
        {apiKey?.last_validated && (
          <Box>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              Last validated: {new Date(apiKey.last_validated).toLocaleString()}
            </Text>
          </Box>
        )}

        {/* Legacy validation alert - kept for backward compatibility */}
        {!apiKey?.key_id && apiKey?.validation_status === 'invalid' && apiKey?.validation_error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box fontSize="sm">
              <Text fontWeight="bold">Validation Failed</Text>
              <Text>{apiKey.validation_error}</Text>
            </Box>
          </Alert>
        )}
      </VStack>
    </Box>
  );
};

export default KeyDetailsPanel;
