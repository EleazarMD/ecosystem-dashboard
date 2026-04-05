/**
 * Quota Widget Component
 * 
 * Displays user's current quota usage with progress bars
 * Can be embedded in dashboard or settings pages
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Badge,
  Button,
  Skeleton,
  Tooltip,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiHardDrive, FiImage, FiZap, FiCalendar, FiArrowUpRight } from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface QuotaData {
  plan: {
    name: string;
    displayName: string;
    description: string;
  };
  storage: {
    quotaBytes: number | null;
    usedBytes: number;
    remainingBytes: number | null;
    usedPercent: number;
    quotaFormatted: string;
    usedFormatted: string;
    remainingFormatted: string;
  };
  images: {
    limit: number | null;
    count: number;
    remaining: number | null;
  };
  dailyGenerations: {
    limit: number | null;
    used: number;
    remaining: number | null;
  };
  monthlyGenerations: {
    limit: number | null;
    used: number;
    remaining: number | null;
  };
  isQuotaExceeded: boolean;
  isUnlimited: boolean;
}

interface QuotaWidgetProps {
  showUpgrade?: boolean;
  compact?: boolean;
  onUpgradeClick?: () => void;
}

export function QuotaWidget({ showUpgrade = true, compact = false, onUpgradeClick }: QuotaWidgetProps) {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bgWarning = useColorModeValue('orange.50', 'orange.900');
  const bgDanger = useColorModeValue('red.50', 'red.900');

  useEffect(() => {
    fetchQuota();
  }, []);

  const fetchQuota = async () => {
    try {
      const res = await fetch('/api/user/quota');
      const data = await res.json();
      if (res.ok) {
        setQuota(data);
      } else {
        setError(data.error || 'Failed to load quota');
      }
    } catch (err) {
      setError('Failed to load quota');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'red';
    if (percent >= 70) return 'orange';
    return 'green';
  };

  const getUsagePercent = (used: number, limit: number | null) => {
    if (!limit) return 0;
    return Math.min(100, (used / limit) * 100);
  };

  if (loading) {
    return (
      <GlassPanel p={4}>
        <VStack spacing={3} align="stretch">
          <Skeleton height="20px" />
          <Skeleton height="10px" />
          <Skeleton height="20px" />
          <Skeleton height="10px" />
        </VStack>
      </GlassPanel>
    );
  }

  if (error || !quota) {
    return (
      <GlassPanel p={4}>
        <Text color="red.500">{error || 'Unable to load quota'}</Text>
      </GlassPanel>
    );
  }

  if (quota.isUnlimited) {
    return (
      <GlassPanel p={4}>
        <HStack justify="space-between">
          <HStack>
            <Badge colorScheme="purple" fontSize="sm">
              {quota.plan.displayName}
            </Badge>
            <Text fontSize="sm" color="gray.500">Unlimited access</Text>
          </HStack>
        </HStack>
      </GlassPanel>
    );
  }

  if (compact) {
    return (
      <GlassPanel 
        p={3} 
        bg={quota.isQuotaExceeded ? bgDanger : quota.storage.usedPercent > 80 ? bgWarning : undefined}
      >
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between">
            <Badge colorScheme={getPlanColor(quota.plan.name)}>
              {quota.plan.displayName}
            </Badge>
            {quota.dailyGenerations.remaining !== null && (
              <Text fontSize="xs" color="gray.500">
                {quota.dailyGenerations.remaining} generations left today
              </Text>
            )}
          </HStack>
          <Progress
            value={quota.storage.usedPercent}
            size="xs"
            colorScheme={getProgressColor(quota.storage.usedPercent)}
          />
          <Text fontSize="xs" color="gray.500">
            {quota.storage.usedFormatted} / {quota.storage.quotaFormatted}
          </Text>
        </VStack>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel 
      p={4}
      bg={quota.isQuotaExceeded ? bgDanger : undefined}
    >
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Badge colorScheme={getPlanColor(quota.plan.name)} fontSize="sm">
              {quota.plan.displayName}
            </Badge>
            {quota.isQuotaExceeded && (
              <Badge colorScheme="red">Quota Exceeded</Badge>
            )}
          </HStack>
          {showUpgrade && quota.plan.name !== 'pro' && quota.plan.name !== 'administrator' && (
            <Button
              size="sm"
              colorScheme="blue"
              variant="outline"
              rightIcon={<FiArrowUpRight />}
              onClick={onUpgradeClick}
            >
              Upgrade
            </Button>
          )}
        </HStack>

        {/* Storage */}
        <Box>
          <HStack justify="space-between" mb={1}>
            <HStack spacing={2}>
              <Icon as={FiHardDrive} color="gray.500" />
              <Text fontSize="sm" fontWeight="medium">Storage</Text>
            </HStack>
            <Text fontSize="sm" color="gray.500">
              {quota.storage.usedFormatted} / {quota.storage.quotaFormatted}
            </Text>
          </HStack>
          <Progress
            value={quota.storage.usedPercent}
            size="sm"
            colorScheme={getProgressColor(quota.storage.usedPercent)}
            borderRadius="full"
          />
          {quota.storage.usedPercent > 80 && (
            <Text fontSize="xs" color="orange.500" mt={1}>
              {quota.storage.remainingFormatted} remaining
            </Text>
          )}
        </Box>

        {/* Images */}
        {quota.images.limit && (
          <Box>
            <HStack justify="space-between" mb={1}>
              <HStack spacing={2}>
                <Icon as={FiImage} color="gray.500" />
                <Text fontSize="sm" fontWeight="medium">Images</Text>
              </HStack>
              <Text fontSize="sm" color="gray.500">
                {quota.images.count} / {quota.images.limit}
              </Text>
            </HStack>
            <Progress
              value={getUsagePercent(quota.images.count, quota.images.limit)}
              size="sm"
              colorScheme={getProgressColor(getUsagePercent(quota.images.count, quota.images.limit))}
              borderRadius="full"
            />
          </Box>
        )}

        {/* Daily Generations */}
        {quota.dailyGenerations.limit && (
          <Box>
            <HStack justify="space-between" mb={1}>
              <HStack spacing={2}>
                <Icon as={FiZap} color="gray.500" />
                <Text fontSize="sm" fontWeight="medium">Today's Generations</Text>
              </HStack>
              <Text fontSize="sm" color="gray.500">
                {quota.dailyGenerations.used} / {quota.dailyGenerations.limit}
              </Text>
            </HStack>
            <Progress
              value={getUsagePercent(quota.dailyGenerations.used, quota.dailyGenerations.limit)}
              size="sm"
              colorScheme={getProgressColor(getUsagePercent(quota.dailyGenerations.used, quota.dailyGenerations.limit))}
              borderRadius="full"
            />
            {quota.dailyGenerations.remaining !== null && quota.dailyGenerations.remaining <= 2 && (
              <Text fontSize="xs" color="orange.500" mt={1}>
                {quota.dailyGenerations.remaining} left today
              </Text>
            )}
          </Box>
        )}

        {/* Monthly Generations */}
        {quota.monthlyGenerations.limit && (
          <Box>
            <HStack justify="space-between" mb={1}>
              <HStack spacing={2}>
                <Icon as={FiCalendar} color="gray.500" />
                <Text fontSize="sm" fontWeight="medium">Monthly Generations</Text>
              </HStack>
              <Text fontSize="sm" color="gray.500">
                {quota.monthlyGenerations.used} / {quota.monthlyGenerations.limit}
              </Text>
            </HStack>
            <Progress
              value={getUsagePercent(quota.monthlyGenerations.used, quota.monthlyGenerations.limit)}
              size="sm"
              colorScheme={getProgressColor(getUsagePercent(quota.monthlyGenerations.used, quota.monthlyGenerations.limit))}
              borderRadius="full"
            />
          </Box>
        )}
      </VStack>
    </GlassPanel>
  );
}

function getPlanColor(plan: string): string {
  switch (plan) {
    case 'administrator': return 'purple';
    case 'pro': return 'yellow';
    case 'standard': return 'blue';
    case 'child': return 'green';
    case 'starter': return 'gray';
    default: return 'gray';
  }
}

export default QuotaWidget;
