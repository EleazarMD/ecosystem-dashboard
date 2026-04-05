/**
 * OpenClaw Channels Panel
 * 
 * Native channels status for OpenClaw Gateway.
 * Shows WhatsApp, Telegram, Discord, Slack, iMessage status.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  Spinner,
  Icon,
} from '@chakra-ui/react';
import { FiRefreshCw, FiMessageCircle, FiSmartphone, FiHash, FiMail } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Channel {
  name: string;
  connected: boolean;
  status: string;
  lastActivity?: string;
}

interface OpenClawChannelsPanelProps {
  connected: boolean;
  channels: Channel[];
  onRefresh: () => Promise<Channel[]>;
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  whatsapp: FiSmartphone,
  telegram: FiMessageCircle,
  discord: FiHash,
  slack: FiHash,
  imessage: FiMail,
  ios: FiSmartphone,
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: 'green',
  telegram: 'blue',
  discord: 'purple',
  slack: 'pink',
  imessage: 'cyan',
  ios: 'orange',
};

export function OpenClawChannelsPanel({
  connected,
  channels,
  onRefresh,
}: OpenClawChannelsPanelProps) {
  const [loading, setLoading] = useState(false);

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgElevated = useSemanticToken('surface.elevated');
  const borderSubtle = useSemanticToken('border.subtle');

  useEffect(() => {
    if (connected) {
      handleRefresh();
    }
  }, [connected]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh();
    } catch (err) {
      console.error('Failed to refresh channels:', err);
    } finally {
      setLoading(false);
    }
  };

  const connectedCount = channels.filter((c) => c.connected).length;

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
            Channels
          </Text>
          <Badge colorScheme={connectedCount > 0 ? 'green' : 'gray'} fontSize="xs">
            {connectedCount} connected
          </Badge>
        </HStack>
        <IconButton
          aria-label="Refresh"
          icon={loading ? <Spinner size="sm" /> : <FiRefreshCw />}
          size="xs"
          variant="ghost"
          onClick={handleRefresh}
          isDisabled={!connected || loading}
        />
      </HStack>

      <Box p={3}>
        {channels.length === 0 ? (
          <Text color={textSecondary} fontSize="sm" textAlign="center" py={4}>
            No channels configured
          </Text>
        ) : (
          <VStack align="stretch" spacing={2}>
            {channels.map((channel) => {
              const IconComponent = CHANNEL_ICONS[channel.name.toLowerCase()] || FiMessageCircle;
              const colorScheme = CHANNEL_COLORS[channel.name.toLowerCase()] || 'gray';

              return (
                <HStack
                  key={channel.name}
                  p={2}
                  borderRadius="md"
                  border="1px solid"
                  borderColor={borderSubtle}
                  justify="space-between"
                >
                  <HStack>
                    <Icon
                      as={IconComponent}
                      color={channel.connected ? `${colorScheme}.400` : 'gray.500'}
                    />
                    <Text fontSize="sm" color={textPrimary} textTransform="capitalize">
                      {channel.name}
                    </Text>
                  </HStack>
                  <HStack>
                    <Badge
                      colorScheme={channel.connected ? 'green' : 'red'}
                      fontSize="xs"
                    >
                      {channel.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                    {channel.status && channel.status !== 'connected' && (
                      <Text fontSize="xs" color={textSecondary}>
                        {channel.status}
                      </Text>
                    )}
                  </HStack>
                </HStack>
              );
            })}
          </VStack>
        )}
      </Box>
    </Box>
  );
}

export default OpenClawChannelsPanel;
