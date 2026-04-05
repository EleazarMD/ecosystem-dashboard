/**
 * Family Controls Panel
 * Context-aware panel for the Parental Controls page
 * Provides quick actions, presets, and monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Switch,
  FormControl,
  FormLabel,
  Divider,
  Icon,
  Alert,
  AlertIcon,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
} from '@chakra-ui/react';
import {
  FiShield,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiZap,
  FiMoreVertical,
  FiCopy,
  FiRefreshCw,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ControlsData {
  isActive: boolean;
  contentFilterLevel: string;
  dailyUsageLimitMinutes: number;
  todayUsageMinutes: number;
  todayBlockedAttempts: number;
  recentBlocks: Array<{
    topic: string;
    timestamp: string;
  }>;
}

const PRESET_TEMPLATES = [
  {
    name: 'Young Child (5-8)',
    description: 'Maximum protection',
    settings: {
      contentFilterLevel: 'strict',
      dailyUsageLimitMinutes: 30,
      requireApprovalForImageGeneration: true,
      requireApprovalForExternalLinks: true,
    },
  },
  {
    name: 'Pre-Teen (9-12)',
    description: 'Balanced protection',
    settings: {
      contentFilterLevel: 'moderate',
      dailyUsageLimitMinutes: 60,
      requireApprovalForImageGeneration: true,
      requireApprovalForExternalLinks: false,
    },
  },
  {
    name: 'Teen (13+)',
    description: 'Light supervision',
    settings: {
      contentFilterLevel: 'standard',
      dailyUsageLimitMinutes: 120,
      requireApprovalForImageGeneration: false,
      requireApprovalForExternalLinks: false,
    },
  },
];

export default function FamilyControlsPanel() {
  const { customData } = useRightPanel();
  const toast = useToast();
  const bgSubtle = useSemanticToken('surface.subtle');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  const [data, setData] = useState<ControlsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const childId = customData?.selectedChildId;

  useEffect(() => {
    if (!childId) {
      setLoading(false);
      return;
    }

    fetchControlsData();
  }, [childId]);

  const fetchControlsData = async () => {
    if (!childId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/children/${childId}/controls`);
      if (res.ok) {
        const response = await res.json();
        setData({
          isActive: response.controls?.isActive ?? true,
          contentFilterLevel: response.controls?.contentFilterLevel || 'moderate',
          dailyUsageLimitMinutes: response.controls?.dailyUsageLimitMinutes || 60,
          todayUsageMinutes: response.todayUsage?.totalMinutes || 0,
          todayBlockedAttempts: response.todayUsage?.blockedAttempts || 0,
          recentBlocks: response.recentBlocks || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch controls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleControls = async () => {
    if (!childId || !data) return;

    setToggling(true);
    try {
      const res = await fetch(`/api/admin/children/${childId}/controls`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !data.isActive }),
      });

      if (res.ok) {
        setData({ ...data, isActive: !data.isActive });
        toast({
          title: data.isActive ? 'Controls disabled' : 'Controls enabled',
          status: 'success',
          duration: 2000,
        });
        // Trigger page refresh
        window.dispatchEvent(new CustomEvent('controls-updated'));
      }
    } catch (error) {
      toast({ title: 'Failed to update', status: 'error' });
    } finally {
      setToggling(false);
    }
  };

  const applyPreset = async (preset: typeof PRESET_TEMPLATES[0]) => {
    if (!childId) return;

    try {
      const res = await fetch(`/api/admin/children/${childId}/controls`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset.settings),
      });

      if (res.ok) {
        toast({
          title: `Applied "${preset.name}" preset`,
          status: 'success',
          duration: 2000,
        });
        fetchControlsData();
        window.dispatchEvent(new CustomEvent('controls-updated'));
      }
    } catch (error) {
      toast({ title: 'Failed to apply preset', status: 'error' });
    }
  };

  if (!childId) {
    return (
      <Box p={6} textAlign="center">
        <Icon as={FiShield} boxSize={12} color="gray.400" mb={4} />
        <Text fontWeight="medium" mb={2}>No Child Selected</Text>
        <Text fontSize="sm" color={textSecondary}>
          Navigate to a child's controls page
        </Text>
      </Box>
    );
  }

  if (loading || !data) {
    return (
      <Box p={6} textAlign="center">
        <Text color={textSecondary}>Loading...</Text>
      </Box>
    );
  }

  const usagePercent = Math.min(100, (data.todayUsageMinutes / data.dailyUsageLimitMinutes) * 100);

  return (
    <VStack spacing={4} p={4} align="stretch">
      {/* Header with Quick Toggle */}
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="md">Quick Controls</Text>
          <IconButton
            icon={<FiRefreshCw />}
            aria-label="Refresh"
            size="xs"
            variant="ghost"
            onClick={fetchControlsData}
          />
        </HStack>

        <FormControl
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          p={3}
          bg={data.isActive ? 'green.50' : 'red.50'}
          borderRadius="md"
          border="1px solid"
          borderColor={data.isActive ? 'green.200' : 'red.200'}
        >
          <HStack>
            <Icon as={FiShield} color={data.isActive ? 'green.600' : 'red.600'} />
            <FormLabel mb={0} fontWeight="medium">
              Controls {data.isActive ? 'Active' : 'Disabled'}
            </FormLabel>
          </HStack>
          <Switch
            isChecked={data.isActive}
            onChange={handleToggleControls}
            isDisabled={toggling}
            colorScheme="green"
            size="lg"
          />
        </FormControl>
      </VStack>

      <Divider />

      {/* Today's Stats */}
      <VStack spacing={2} align="stretch">
        <Text fontWeight="medium" fontSize="sm">Today's Activity</Text>
        
        <Box p={3} bg={bgSubtle} borderRadius="md">
          <HStack justify="space-between" mb={2}>
            <HStack>
              <Icon as={FiClock} color="blue.500" boxSize={4} />
              <Text fontSize="sm">Usage</Text>
            </HStack>
            <Text fontSize="sm" fontWeight="medium">
              {data.todayUsageMinutes}m / {data.dailyUsageLimitMinutes}m
            </Text>
          </HStack>
          <Progress
            value={usagePercent}
            size="sm"
            colorScheme={usagePercent > 80 ? 'red' : usagePercent > 50 ? 'yellow' : 'green'}
            borderRadius="full"
          />
        </Box>

        {data.todayBlockedAttempts > 0 && (
          <Alert status="warning" borderRadius="md" py={2}>
            <AlertIcon />
            <Box flex={1}>
              <Text fontSize="sm" fontWeight="medium">
                {data.todayBlockedAttempts} blocked attempts today
              </Text>
            </Box>
          </Alert>
        )}
      </VStack>

      <Divider />

      {/* Current Settings Summary */}
      <VStack spacing={2} align="stretch">
        <Text fontWeight="medium" fontSize="sm">Current Settings</Text>
        
        <HStack justify="space-between" p={2} bg={bgSubtle} borderRadius="md">
          <Text fontSize="sm">Filter Level</Text>
          <Badge colorScheme="blue" textTransform="capitalize">
            {data.contentFilterLevel}
          </Badge>
        </HStack>

        <HStack justify="space-between" p={2} bg={bgSubtle} borderRadius="md">
          <Text fontSize="sm">Daily Limit</Text>
          <Badge colorScheme="purple">
            {data.dailyUsageLimitMinutes} min
          </Badge>
        </HStack>
      </VStack>

      <Divider />

      {/* Quick Presets */}
      <VStack spacing={2} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="medium" fontSize="sm">Quick Presets</Text>
          <Icon as={FiZap} color="orange.500" boxSize={4} />
        </HStack>
        
        <Text fontSize="xs" color={textSecondary}>
          Apply age-appropriate settings instantly
        </Text>

        {PRESET_TEMPLATES.map((preset) => (
          <Button
            key={preset.name}
            size="sm"
            variant="outline"
            justifyContent="space-between"
            onClick={() => applyPreset(preset)}
            rightIcon={<FiCopy />}
          >
            <VStack align="start" spacing={0}>
              <Text fontSize="xs" fontWeight="medium">{preset.name}</Text>
              <Text fontSize="xs" color={textSecondary}>{preset.description}</Text>
            </VStack>
          </Button>
        ))}
      </VStack>

      {/* Recent Blocks */}
      {data.recentBlocks.length > 0 && (
        <>
          <Divider />
          <VStack spacing={2} align="stretch">
            <HStack justify="space-between">
              <Text fontWeight="medium" fontSize="sm">Recent Blocks</Text>
              <Badge colorScheme="red">{data.recentBlocks.length}</Badge>
            </HStack>
            
            {data.recentBlocks.slice(0, 3).map((block, idx) => (
              <HStack
                key={idx}
                p={2}
                bg="red.50"
                borderRadius="md"
                fontSize="xs"
                justify="space-between"
              >
                <HStack>
                  <Icon as={FiAlertTriangle} color="red.500" />
                  <Text fontWeight="medium">{block.topic}</Text>
                </HStack>
                <Text color={textSecondary}>
                  {new Date(block.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </HStack>
            ))}
          </VStack>
        </>
      )}

      {!data.isActive && (
        <>
          <Divider />
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">
              Controls are disabled. The child has unrestricted access.
            </Text>
          </Alert>
        </>
      )}
    </VStack>
  );
}
