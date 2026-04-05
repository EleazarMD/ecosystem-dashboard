/**
 * MIDI Controller Panel
 * Shows connection status and device selection for Podcast Mixer
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Select,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { CheckIcon, CloseIcon, RepeatIcon } from '@chakra-ui/icons';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface MIDIDevice {
  id: string;
  name: string;
  manufacturer: string;
}

interface MIDIControllerPanelProps {
  isConnected: boolean;
  isReady: boolean;
  currentDevice: { id: string; name: string } | null;
  availableDevices: MIDIDevice[];
  onConnect: (deviceId: string) => Promise<boolean>;
  onDisconnect: () => void;
  onRefresh: () => Promise<boolean>;
}

export default function MIDIControllerPanel({
  isConnected,
  isReady,
  currentDevice,
  availableDevices,
  onConnect,
  onDisconnect,
  onRefresh
}: MIDIControllerPanelProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const infoBg = useSemanticToken('surface.base');
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string>('');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleConnect = async () => {
    if (selectedDeviceId) {
      await onConnect(selectedDeviceId);
    }
  };

  return (
    <Box
      bg={bgColor}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="lg"
      p={4}
    >
      <VStack align="stretch" spacing={3}>
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Text fontSize="sm" fontWeight="bold">
              🎛️ MIDI Controller
            </Text>
            {isConnected && isReady && (
              <Badge colorScheme="green" fontSize="xs">
                <HStack spacing={1}>
                  <CheckIcon boxSize={2} />
                  <Text>Connected</Text>
                </HStack>
              </Badge>
            )}
            {!isConnected && availableDevices.length > 0 && (
              <Badge colorScheme="yellow" fontSize="xs">
                Available
              </Badge>
            )}
            {!isConnected && availableDevices.length === 0 && (
              <Badge colorScheme="gray" fontSize="xs">
                No Devices
              </Badge>
            )}
          </HStack>
          
          <Tooltip label="Refresh devices">
            <IconButton
              aria-label="Refresh MIDI devices"
              icon={<RepeatIcon />}
              size="xs"
              variant="ghost"
              onClick={handleRefresh}
              isLoading={isRefreshing}
            />
          </Tooltip>
        </HStack>

        {/* Connection Status */}
        {isConnected && currentDevice && (
          <Alert status="success" borderRadius="md" fontSize="xs">
            <AlertIcon boxSize={3} />
            <VStack align="start" spacing={0} flex={1}>
              <AlertTitle fontSize="xs">Connected to {currentDevice.name}</AlertTitle>
              <AlertDescription fontSize="xs">
                Faders and knobs are controlling the mixer
              </AlertDescription>
            </VStack>
            <Button
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={onDisconnect}
            >
              Disconnect
            </Button>
          </Alert>
        )}

        {/* Device Selection */}
        {!isConnected && availableDevices.length > 0 && (
          <VStack align="stretch" spacing={2}>
            <Select
              size="sm"
              placeholder="Select MIDI device..."
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              {availableDevices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.manufacturer})
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              colorScheme="blue"
              onClick={handleConnect}
              isDisabled={!selectedDeviceId}
            >
              Connect
            </Button>
          </VStack>
        )}

        {/* No Devices Found */}
        {!isConnected && availableDevices.length === 0 && (
          <Alert status="info" borderRadius="md" fontSize="xs">
            <AlertIcon boxSize={3} />
            <VStack align="start" spacing={0} flex={1}>
              <AlertTitle fontSize="xs">No MIDI devices found</AlertTitle>
              <AlertDescription fontSize="xs">
                Connect your Bluetooth MIDI controller and click refresh
              </AlertDescription>
            </VStack>
          </Alert>
        )}

        {/* Connection Guide */}
        {!isConnected && (
          <Box
            p={2}
            bg={infoBg}
            borderRadius="md"
            fontSize="xs"
          >
            <Text fontWeight="bold" mb={1}>Quick Guide:</Text>
            <VStack align="start" spacing={0.5}>
              <Text>1. Turn on your Bluetooth MIDI controller</Text>
              <Text>2. Pair it with your computer</Text>
              <Text>3. Click refresh and select your device</Text>
              <Text>4. Control mixer faders with hardware!</Text>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
