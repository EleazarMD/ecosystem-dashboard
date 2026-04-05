/**
 * Health Data Widget
 * Shows workout and health metrics from Apple Health or other integrations
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Button,
  Spinner,
} from '@chakra-ui/react';
import {
  FiActivity,
  FiHeart,
  FiTrendingUp,
  FiZap,
  FiSettings,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface HealthData {
  steps: number;
  stepsGoal: number;
  activeMinutes: number;
  activeGoal: number;
  calories: number;
  heartRate?: number;
  workouts: number;
}

export default function HealthDataWidget() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const textSecondary = useSemanticToken('text.secondary');

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/health/summary');
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
        setConnected(result.connected);
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassPanel variant="light" p={6}>
        <VStack spacing={4}>
          <Spinner size="lg" />
          <Text color={textSecondary}>Loading health data...</Text>
        </VStack>
      </GlassPanel>
    );
  }

  if (!connected) {
    return (
      <GlassPanel variant="light" p={6}>
        <VStack spacing={4} align="center">
          <Icon as={FiActivity} boxSize={12} color="gray.400" />
          <Text fontWeight="medium">Health Integration</Text>
          <Text fontSize="sm" color={textSecondary} textAlign="center">
            Connect Apple Health or other fitness apps to track your activity
          </Text>
          <Button
            leftIcon={<FiSettings />}
            colorScheme="blue"
            size="sm"
            onClick={() => window.location.href = '/settings/integrations'}
          >
            Connect Health App
          </Button>
        </VStack>
      </GlassPanel>
    );
  }

  const stepsPercent = Math.min(100, ((data?.steps || 0) / (data?.stepsGoal || 10000)) * 100);
  const activePercent = Math.min(100, ((data?.activeMinutes || 0) / (data?.activeGoal || 30)) * 100);

  return (
    <GlassPanel variant="light" p={6}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiActivity} boxSize={5} color="green.500" />
            <Text fontSize="lg" fontWeight="bold">Health & Fitness</Text>
          </HStack>
          <Badge colorScheme="green">Today</Badge>
        </HStack>

        <SimpleGrid columns={2} spacing={4}>
          <Box>
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between">
                <Text fontSize="sm" color={textSecondary}>Steps</Text>
                <Text fontSize="sm" fontWeight="medium">
                  {data?.steps?.toLocaleString() || 0}
                </Text>
              </HStack>
              <Progress
                value={stepsPercent}
                size="sm"
                colorScheme="green"
                borderRadius="full"
              />
              <Text fontSize="xs" color={textSecondary}>
                Goal: {data?.stepsGoal?.toLocaleString() || 10000}
              </Text>
            </VStack>
          </Box>

          <Box>
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between">
                <Text fontSize="sm" color={textSecondary}>Active Minutes</Text>
                <Text fontSize="sm" fontWeight="medium">
                  {data?.activeMinutes || 0}m
                </Text>
              </HStack>
              <Progress
                value={activePercent}
                size="sm"
                colorScheme="orange"
                borderRadius="full"
              />
              <Text fontSize="xs" color={textSecondary}>
                Goal: {data?.activeGoal || 30}m
              </Text>
            </VStack>
          </Box>
        </SimpleGrid>

        <SimpleGrid columns={3} spacing={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs" color={textSecondary}>
              <HStack spacing={1}>
                <Icon as={FiZap} boxSize={3} />
                <Text>Calories</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="lg">{data?.calories || 0}</StatNumber>
          </Stat>

          <Stat size="sm">
            <StatLabel fontSize="xs" color={textSecondary}>
              <HStack spacing={1}>
                <Icon as={FiHeart} boxSize={3} />
                <Text>Heart Rate</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="lg">{data?.heartRate || '--'}</StatNumber>
            <StatHelpText fontSize="xs">bpm</StatHelpText>
          </Stat>

          <Stat size="sm">
            <StatLabel fontSize="xs" color={textSecondary}>
              <HStack spacing={1}>
                <Icon as={FiTrendingUp} boxSize={3} />
                <Text>Workouts</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="lg">{data?.workouts || 0}</StatNumber>
          </Stat>
        </SimpleGrid>
      </VStack>
    </GlassPanel>
  );
}
