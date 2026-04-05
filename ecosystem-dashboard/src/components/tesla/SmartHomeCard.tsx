/**
 * Smart Home Quick Actions Card
 * 
 * Provides one-tap controls for common smart home devices:
 * - Lights (on/off/dim)
 * - Garage door
 * - Thermostat
 * - Locks
 * - Scenes
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  useToast,
  Tooltip,
  Badge,
} from '@chakra-ui/react';
import {
  Lightbulb,
  LightbulbOff,
  DoorOpen,
  Thermometer,
  Lock,
  Unlock,
  Home,
  Moon,
  Sun,
  Zap,
  Fan,
} from 'lucide-react';

interface SmartHomeDevice {
  id: string;
  name: string;
  type: 'light' | 'garage' | 'thermostat' | 'lock' | 'scene' | 'fan';
  state: 'on' | 'off' | 'open' | 'closed' | 'locked' | 'unlocked' | number;
  room?: string;
}

interface SmartHomeCardProps {
  bgCard: string;
  bgHover: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  successColor: string;
  warningColor: string;
}

const PRESET_DEVICES: SmartHomeDevice[] = [
  { id: 'all_lights', name: 'All Lights', type: 'scene', state: 'on', room: 'Whole House' },
  { id: 'living_room', name: 'Living Room', type: 'light', state: 'on', room: 'Main Floor' },
  { id: 'kitchen', name: 'Kitchen', type: 'light', state: 'off', room: 'Main Floor' },
  { id: 'garage', name: 'Garage Door', type: 'garage', state: 'closed', room: 'Exterior' },
  { id: 'thermostat', name: 'Thermostat', type: 'thermostat', state: 72, room: 'Climate' },
  { id: 'night_mode', name: 'Night Mode', type: 'scene', state: 'off', room: 'Scenes' },
];

export function SmartHomeCard({
  bgCard,
  bgHover,
  borderColor,
  textPrimary,
  textSecondary,
  accentColor,
  successColor,
  warningColor,
}: SmartHomeCardProps) {
  const toast = useToast();
  const [devices, setDevices] = useState<SmartHomeDevice[]>(PRESET_DEVICES);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Fetch current device states on mount
  React.useEffect(() => {
    fetchDeviceStates();
  }, []);

  const fetchDeviceStates = async () => {
    try {
      const response = await fetch('/api/smarthome/status');
      if (response.ok) {
        const data = await response.json();
        if (data.devices) {
          setDevices(prev => 
            prev.map(d => {
              const updated = data.devices.find((ud: SmartHomeDevice) => ud.id === d.id);
              return updated ? { ...d, state: updated.state } : d;
            })
          );
        }
      }
    } catch (error) {
      console.error('[SmartHome] Failed to fetch device states:', error);
    }
  };

  const controlDevice = useCallback(async (device: SmartHomeDevice, action: string) => {
    setIsLoading(device.id);
    try {
      const response = await fetch('/api/smarthome/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: device.id,
          deviceType: device.type,
          action,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local state optimistically
        setDevices(prev =>
          prev.map(d => {
            if (d.id !== device.id) return d;
            
            // Toggle state based on action
            if (d.type === 'light' || d.type === 'scene') {
              return { ...d, state: action === 'on' ? 'on' : 'off' };
            }
            if (d.type === 'garage') {
              return { ...d, state: action === 'open' ? 'open' : 'closed' };
            }
            if (d.type === 'lock') {
              return { ...d, state: action === 'lock' ? 'locked' : 'unlocked' };
            }
            if (d.type === 'thermostat' && action.startsWith('temp_')) {
              const delta = action === 'temp_up' ? 1 : -1;
              return { ...d, state: (d.state as number) + delta };
            }
            return d;
          })
        );

        toast({
          title: result.message || `${device.name} ${action}`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        throw new Error('Control failed');
      }
    } catch (error) {
      toast({
        title: `Failed to control ${device.name}`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(null);
    }
  }, [toast]);

  const getDeviceIcon = (device: SmartHomeDevice) => {
    switch (device.type) {
      case 'light':
        return device.state === 'on' ? Lightbulb : LightbulbOff;
      case 'garage':
        return DoorOpen;
      case 'thermostat':
        return Thermometer;
      case 'lock':
        return device.state === 'locked' ? Lock : Unlock;
      case 'scene':
        if (device.id === 'night_mode') return Moon;
        if (device.id === 'all_lights') return Sun;
        return Home;
      case 'fan':
        return Fan;
      default:
        return Zap;
    }
  };

  const getDeviceColor = (device: SmartHomeDevice) => {
    const isActive = 
      device.state === 'on' || 
      device.state === 'open' || 
      device.state === 'unlocked' ||
      (typeof device.state === 'number' && device.state > 0);
    
    if (device.type === 'garage') {
      return device.state === 'open' ? warningColor : successColor;
    }
    if (device.type === 'lock') {
      return device.state === 'locked' ? successColor : warningColor;
    }
    return isActive ? accentColor : textSecondary;
  };

  const getActionButtons = (device: SmartHomeDevice) => {
    if (device.type === 'light' || device.type === 'scene') {
      return [
        { label: 'Off', action: 'off', active: device.state === 'off' },
        { label: 'On', action: 'on', active: device.state === 'on' },
      ];
    }
    if (device.type === 'garage') {
      return [
        { label: 'Close', action: 'close', active: device.state === 'closed' },
        { label: 'Open', action: 'open', active: device.state === 'open' },
      ];
    }
    if (device.type === 'lock') {
      return [
        { label: 'Unlock', action: 'unlock', active: device.state === 'unlocked' },
        { label: 'Lock', action: 'lock', active: device.state === 'locked' },
      ];
    }
    if (device.type === 'thermostat') {
      const temp = device.state as number;
      return [
        { label: `−`, action: 'temp_down', active: false },
        { label: `${temp}°`, action: 'none', active: true, isDisplay: true },
        { label: `+`, action: 'temp_up', active: false },
      ];
    }
    return [];
  };

  return (
    <VStack align="start" h="100%" justify="space-between" spacing={3}>
      {/* Header */}
      <HStack justify="space-between" w="100%">
        <HStack>
          <Icon as={Home} color={accentColor} boxSize={6} />
          <Text fontWeight="bold" fontSize="lg">Smart Home</Text>
        </HStack>
        <Badge colorScheme="blue" borderRadius="full" fontSize="xs">
          {devices.filter(d => 
            d.state === 'on' || d.state === 'open' || d.state === 'unlocked'
          ).length} Active
        </Badge>
      </HStack>

      {/* Device Grid */}
      <VStack align="stretch" spacing={2} flex={1} w="100%" mt={2}>
        {devices.map((device) => {
          const IconComponent = getDeviceIcon(device);
          const color = getDeviceColor(device);
          const actions = getActionButtons(device);
          const isDeviceLoading = isLoading === device.id;

          return (
            <Box
              key={device.id}
              p={3}
              bg={bgCard}
              borderRadius="12px"
              border="1px solid"
              borderColor={borderColor}
              opacity={isDeviceLoading ? 0.6 : 1}
              transition="all 0.2s"
            >
              <HStack justify="space-between" align="center">
                {/* Device Info */}
                <HStack spacing={3} flex={1}>
                  <Box
                    w="36px"
                    h="36px"
                    borderRadius="full"
                    bg={`${color}20`}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={IconComponent} boxSize={5} color={color} />
                  </Box>
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                      {device.name}
                    </Text>
                    <Text fontSize="xs" color={textSecondary}>
                      {device.room}
                    </Text>
                  </VStack>
                </HStack>

                {/* Action Buttons */}
                <HStack spacing={1}>
                  {actions.map((action) => (
                    <Tooltip
                      key={action.action}
                      label={action.label}
                      placement="top"
                    >
                      <Box
                        as={action.isDisplay ? 'div' : 'button'}
                        px={action.isDisplay ? 2 : 2.5}
                        py={1}
                        borderRadius="full"
                        fontSize="xs"
                        fontWeight="medium"
                        bg={action.active && !action.isDisplay ? color : 'transparent'}
                        color={action.active && !action.isDisplay ? 'white' : textPrimary}
                        border="1px solid"
                        borderColor={action.active && !action.isDisplay ? color : borderColor}
                        cursor={action.isDisplay ? 'default' : 'pointer'}
                        transition="all 0.2s"
                        _hover={!action.isDisplay ? {
                          bg: action.active ? color : bgHover,
                          borderColor: color,
                        } : {}}
                        onClick={() => !action.isDisplay && controlDevice(device, action.action)}
                        disabled={isDeviceLoading}
                      >
                        {action.label}
                      </Box>
                    </Tooltip>
                  ))}
                </HStack>
              </HStack>
            </Box>
          );
        })}
      </VStack>

      {/* Footer */}
      <HStack justify="space-between" w="100%" pt={1} borderTop="1px solid" borderColor={borderColor}>
        <Text fontSize="xs" color={textSecondary}>
          Tap to control devices
        </Text>
        <Text fontSize="xs" color={accentColor} cursor="pointer" _hover={{ opacity: 0.8 }}>
          View All →
        </Text>
      </HStack>
    </VStack>
  );
}

export default SmartHomeCard;
