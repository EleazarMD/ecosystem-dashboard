/**
 * OpenClaw Config Panel
 * 
 * Native config editor for OpenClaw Gateway.
 * Implements config.get, config.set, config.apply via WebSocket RPC.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  Button,
  Textarea,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { FiRefreshCw, FiSave, FiPlay } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface OpenClawConfigPanelProps {
  connected: boolean;
  config: Record<string, unknown> | null;
  onGet: () => Promise<Record<string, unknown>>;
  onSet: (path: string, value: unknown) => Promise<void>;
  onApply: () => Promise<void>;
}

export function OpenClawConfigPanel({
  connected,
  config,
  onGet,
  onSet,
  onApply,
}: OpenClawConfigPanelProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [editedConfig, setEditedConfig] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const toast = useToast();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgElevated = useSemanticToken('surface.elevated');
  const borderSubtle = useSemanticToken('border.subtle');

  useEffect(() => {
    if (connected) {
      handleRefresh();
    }
  }, [connected]);

  useEffect(() => {
    if (config) {
      const formatted = JSON.stringify(config, null, 2);
      setEditedConfig(formatted);
      setHasChanges(false);
    }
  }, [config]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onGet();
    } catch (err) {
      console.error('Failed to get config:', err);
      toast({
        title: 'Failed to load config',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsed = JSON.parse(editedConfig);
      // Set the entire config at root
      await onSet('', parsed);
      setHasChanges(false);
      toast({
        title: 'Config saved',
        status: 'success',
        duration: 2000,
      });
    } catch (err) {
      console.error('Failed to save config:', err);
      toast({
        title: 'Failed to save config',
        description: err instanceof Error ? err.message : 'Invalid JSON',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await onApply();
      toast({
        title: 'Config applied',
        description: 'Gateway will restart with new config',
        status: 'success',
        duration: 3000,
      });
    } catch (err) {
      console.error('Failed to apply config:', err);
      toast({
        title: 'Failed to apply config',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setApplying(false);
    }
  };

  const handleChange = (value: string) => {
    setEditedConfig(value);
    setHasChanges(true);
  };

  return (
    <Box
      bg={bgElevated}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderSubtle}
      overflow="hidden"
    >
      <HStack p={3} borderBottom="1px solid" borderColor={borderSubtle} justify="space-between">
        <HStack>
          <Text fontWeight="600" color={textPrimary} fontSize="sm">
            Configuration
          </Text>
          {hasChanges && (
            <Badge colorScheme="yellow" fontSize="xs">
              Unsaved
            </Badge>
          )}
        </HStack>
        <HStack spacing={1}>
          <IconButton
            aria-label="Refresh"
            icon={loading ? <Spinner size="sm" /> : <FiRefreshCw />}
            size="xs"
            variant="ghost"
            onClick={handleRefresh}
            isDisabled={!connected || loading}
          />
        </HStack>
      </HStack>

      <Box p={3}>
        <Textarea
          value={editedConfig}
          onChange={(e) => handleChange(e.target.value)}
          fontFamily="mono"
          fontSize="xs"
          h="250px"
          bg="gray.900"
          color="gray.100"
          border="1px solid"
          borderColor="gray.700"
          isDisabled={!connected}
          placeholder="Loading configuration..."
        />

        <HStack mt={3} justify="flex-end" spacing={2}>
          <Button
            leftIcon={saving ? <Spinner size="sm" /> : <FiSave />}
            size="sm"
            colorScheme="blue"
            onClick={handleSave}
            isDisabled={!connected || !hasChanges || saving}
          >
            Save
          </Button>
          <Button
            leftIcon={applying ? <Spinner size="sm" /> : <FiPlay />}
            size="sm"
            colorScheme="green"
            onClick={handleApply}
            isDisabled={!connected || applying}
          >
            Apply & Restart
          </Button>
        </HStack>
      </Box>
    </Box>
  );
}

export default OpenClawConfigPanel;
