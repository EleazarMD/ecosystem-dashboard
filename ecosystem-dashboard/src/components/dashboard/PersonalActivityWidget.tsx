/**
 * Personal Activity Widget
 * Shows user's recent activities across different integrations
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
  Spinner,
} from '@chakra-ui/react';
import {
  FiActivity,
  FiMessageCircle,
  FiMail,
  FiFileText,
  FiTrendingUp,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ActivityData {
  chatMessages: number;
  emailsProcessed: number;
  workspacePages: number;
  totalMinutesActive: number;
}

export default function PersonalActivityWidget() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const textSecondary = useSemanticToken('text.secondary');

  useEffect(() => {
    fetchActivityData();
  }, []);

  const fetchActivityData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/activity/summary');
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassPanel variant="light" p={6}>
        <VStack spacing={4}>
          <Spinner size="lg" />
          <Text color={textSecondary}>Loading your activity...</Text>
        </VStack>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel variant="light" p={6}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiActivity} boxSize={5} color="blue.500" />
            <Text fontSize="lg" fontWeight="bold">Your Activity Today</Text>
          </HStack>
          <Badge colorScheme="blue">Live</Badge>
        </HStack>

        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Stat size="sm">
            <StatLabel fontSize="xs" color={textSecondary}>
              <HStack spacing={1}>
                <Icon as={FiMessageCircle} boxSize={3} />
                <Text>Chat</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="2xl">{data?.chatMessages || 0}</StatNumber>
            <StatHelpText fontSize="xs">messages</StatHelpText>
          </Stat>

          <Stat size="sm">
            <StatLabel fontSize="xs" color={textSecondary}>
              <HStack spacing={1}>
                <Icon as={FiMail} boxSize={3} />
                <Text>Email</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="2xl">{data?.emailsProcessed || 0}</StatNumber>
            <StatHelpText fontSize="xs">processed</StatHelpText>
          </Stat>

          <Stat size="sm">
            <StatLabel fontSize="xs" color={textSecondary}>
              <HStack spacing={1}>
                <Icon as={FiFileText} boxSize={3} />
                <Text>Workspace</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="2xl">{data?.workspacePages || 0}</StatNumber>
            <StatHelpText fontSize="xs">pages</StatHelpText>
          </Stat>

          <Stat size="sm">
            <StatLabel fontSize="xs" color={textSecondary}>
              <HStack spacing={1}>
                <Icon as={FiTrendingUp} boxSize={3} />
                <Text>Active Time</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="2xl">{data?.totalMinutesActive || 0}m</StatNumber>
            <StatHelpText fontSize="xs">today</StatHelpText>
          </Stat>
        </SimpleGrid>
      </VStack>
    </GlassPanel>
  );
}
