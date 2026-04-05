/**
 * General Settings Panel for AI Inferencing
 * Shows when no specific item is selected - provides overview controls and settings
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  Select,
  Badge,
  Icon,
  Divider,
  
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Button,
} from '@chakra-ui/react';
import { FiSettings, FiZap, FiDollarSign, FiActivity, FiRefreshCw } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export const GeneralSettingsPanel: React.FC = () => {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const bgHover = useSemanticToken('surface.hover');
  const borderColor = useSemanticToken('border.default');

  return (
    <Box p={4} h="full" overflowY="auto">
      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <HStack>
          <Icon as={FiSettings} color="blue.500" boxSize={5} />
          <Text fontSize="lg" fontWeight="600" color={textColor}>
            AI Inferencing Settings
          </Text>
        </HStack>

        <Text fontSize="sm" color={mutedColor}>
          Configure global settings for AI model providers and API management
        </Text>

        <Divider />

        {/* Auto-Refresh */}
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" fontWeight="500" color={textColor}>
                Auto-Refresh Data
              </Text>
              <Text fontSize="xs" color={mutedColor}>
                Automatically update metrics and status
              </Text>
            </VStack>
            <Switch colorScheme="blue" defaultChecked />
          </HStack>

          <HStack>
            <Text fontSize="sm" color={mutedColor}>Refresh Interval:</Text>
            <Select size="sm" defaultValue="30" maxW="120px">
              <option value="10">10 sec</option>
              <option value="30">30 sec</option>
              <option value="60">1 min</option>
              <option value="300">5 min</option>
            </Select>
          </HStack>
        </VStack>

        <Divider />

        {/* Performance Monitoring */}
        <VStack align="stretch" spacing={3}>
          <HStack>
            <Icon as={FiActivity} color="green.500" boxSize={4} />
            <Text fontSize="sm" fontWeight="500" color={textColor}>
              Performance Monitoring
            </Text>
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="sm" color={mutedColor}>Track Latency</Text>
            <Switch colorScheme="green" defaultChecked />
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="sm" color={mutedColor}>Log All Requests</Text>
            <Switch colorScheme="green" defaultChecked />
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="sm" color={mutedColor}>Alert on Failures</Text>
            <Switch colorScheme="orange" defaultChecked />
          </HStack>
        </VStack>

        <Divider />

        {/* Cost Controls */}
        <VStack align="stretch" spacing={3}>
          <HStack>
            <Icon as={FiDollarSign} color="orange.500" boxSize={4} />
            <Text fontSize="sm" fontWeight="500" color={textColor}>
              Cost Controls
            </Text>
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="sm" color={mutedColor}>Enable Cost Tracking</Text>
            <Switch colorScheme="orange" defaultChecked />
          </HStack>

          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm" color={mutedColor}>Daily Budget Alert</Text>
              <Badge colorScheme="orange">$50/day</Badge>
            </HStack>
            <Slider defaultValue={50} min={10} max={500} step={10}>
              <SliderTrack>
                <SliderFilledTrack bg="orange.400" />
              </SliderTrack>
              <SliderThumb />
            </Slider>
          </Box>

          <HStack justify="space-between">
            <Text fontSize="sm" color={mutedColor}>Show Cost Estimates</Text>
            <Switch colorScheme="orange" defaultChecked />
          </HStack>
        </VStack>

        <Divider />

        {/* Rate Limiting */}
        <VStack align="stretch" spacing={3}>
          <HStack>
            <Icon as={FiZap} color="purple.500" boxSize={4} />
            <Text fontSize="sm" fontWeight="500" color={textColor}>
              Rate Limiting
            </Text>
          </HStack>

          <HStack>
            <Text fontSize="sm" color={mutedColor}>Max Requests/Min:</Text>
            <Select size="sm" defaultValue="100" maxW="120px">
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
              <option value="unlimited">Unlimited</option>
            </Select>
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="sm" color={mutedColor}>Queue Requests</Text>
            <Switch colorScheme="purple" defaultChecked />
          </HStack>
        </VStack>

        <Divider />

        {/* Actions */}
        <VStack align="stretch" spacing={2}>
          <Button size="sm" colorScheme="blue" leftIcon={<FiRefreshCw />} variant="outline">
            Refresh All Data
          </Button>
          <Button size="sm" colorScheme="gray" variant="outline">
            Export Settings
          </Button>
          <Button size="sm" colorScheme="red" variant="ghost">
            Reset to Defaults
          </Button>
        </VStack>

        {/* Status */}
        <Box p={3} bg={bgHover} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
          <VStack align="stretch" spacing={2}>
            <HStack justify="space-between">
              <Text fontSize="xs" color={mutedColor}>Active Providers</Text>
              <Badge colorScheme="green">5</Badge>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color={mutedColor}>API Keys</Text>
              <Badge colorScheme="blue">12</Badge>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color={mutedColor}>Total Requests (24h)</Text>
              <Badge colorScheme="purple">1,234</Badge>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};
