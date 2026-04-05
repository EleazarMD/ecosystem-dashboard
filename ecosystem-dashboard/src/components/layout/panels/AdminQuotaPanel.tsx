/**
 * Admin Quota Panel
 * Right panel content for viewing and managing user/plan quotas
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Spinner,
  Icon,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  FiPieChart,
  FiTrendingUp,
  FiDatabase,
  FiImage,
  FiUsers,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface QuotaData {
  plan: string;
  storageUsed: number;
  storageLimit: number;
  imagesGenerated: number;
  imageLimit: number;
  dailyUsage: number;
  dailyLimit: number;
  monthlyUsage: number;
  monthlyLimit: number;
}

export default function AdminQuotaPanel() {
  const { customData, activeTab } = useRightPanel();
  
  const bgSubtle = useSemanticToken('surface.subtle');
  const textSecondary = useSemanticToken('text.secondary');
  
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const selectedUserId = customData?.selectedUserId;
  const selectedPlan = customData?.selectedPlan;

  useEffect(() => {
    // Simulate loading quota data
    setLoading(true);
    const timer = setTimeout(() => {
      setQuota({
        plan: selectedPlan || 'standard',
        storageUsed: 2.5,
        storageLimit: 5,
        imagesGenerated: 45,
        imageLimit: 100,
        dailyUsage: 12,
        dailyLimit: 20,
        monthlyUsage: 156,
        monthlyLimit: 200,
      });
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedUserId, selectedPlan]);

  const getUsageColor = (used: number, limit: number) => {
    const percent = (used / limit) * 100;
    if (percent >= 90) return 'red';
    if (percent >= 70) return 'orange';
    return 'green';
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={4} color={textSecondary}>Loading quota data...</Text>
      </Box>
    );
  }

  if (!quota) {
    return (
      <Box p={6} textAlign="center">
        <Icon as={FiPieChart} boxSize={12} color="gray.400" mb={4} />
        <Text fontWeight="medium" mb={2}>No Quota Selected</Text>
        <Text fontSize="sm" color={textSecondary}>
          Select a user or plan to view quota details
        </Text>
      </Box>
    );
  }

  // Overview Tab
  if (activeTab === 'quota-overview') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="lg">Quota Overview</Text>
          <Badge colorScheme="purple" fontSize="sm">{quota.plan.toUpperCase()}</Badge>
        </HStack>

        <Divider />

        <SimpleGrid columns={2} spacing={3}>
          <Stat size="sm" p={3} bg={bgSubtle} borderRadius="md">
            <StatLabel fontSize="xs">Storage</StatLabel>
            <StatNumber fontSize="lg">{quota.storageUsed} GB</StatNumber>
            <StatHelpText fontSize="xs">of {quota.storageLimit} GB</StatHelpText>
          </Stat>
          <Stat size="sm" p={3} bg={bgSubtle} borderRadius="md">
            <StatLabel fontSize="xs">Images</StatLabel>
            <StatNumber fontSize="lg">{quota.imagesGenerated}</StatNumber>
            <StatHelpText fontSize="xs">of {quota.imageLimit}/mo</StatHelpText>
          </Stat>
        </SimpleGrid>

        <Box p={3} bg={bgSubtle} borderRadius="md">
          <HStack justify="space-between" mb={2}>
            <HStack>
              <Icon as={FiDatabase} />
              <Text fontSize="sm" fontWeight="medium">Storage Usage</Text>
            </HStack>
            <Text fontSize="xs" color={textSecondary}>
              {Math.round((quota.storageUsed / quota.storageLimit) * 100)}%
            </Text>
          </HStack>
          <Progress 
            value={(quota.storageUsed / quota.storageLimit) * 100} 
            colorScheme={getUsageColor(quota.storageUsed, quota.storageLimit)}
            size="sm"
            borderRadius="full"
          />
        </Box>

        <Box p={3} bg={bgSubtle} borderRadius="md">
          <HStack justify="space-between" mb={2}>
            <HStack>
              <Icon as={FiImage} />
              <Text fontSize="sm" fontWeight="medium">Image Generation</Text>
            </HStack>
            <Text fontSize="xs" color={textSecondary}>
              {Math.round((quota.imagesGenerated / quota.imageLimit) * 100)}%
            </Text>
          </HStack>
          <Progress 
            value={(quota.imagesGenerated / quota.imageLimit) * 100} 
            colorScheme={getUsageColor(quota.imagesGenerated, quota.imageLimit)}
            size="sm"
            borderRadius="full"
          />
        </Box>
      </VStack>
    );
  }

  // Limits Tab
  if (activeTab === 'quota-limits') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <Text fontWeight="bold" fontSize="md">Plan Limits</Text>
        
        <VStack spacing={3} align="stretch">
          <HStack justify="space-between" p={3} bg={bgSubtle} borderRadius="md">
            <HStack>
              <Icon as={FiDatabase} color="blue.500" />
              <Text fontSize="sm">Storage Quota</Text>
            </HStack>
            <Text fontWeight="bold">{quota.storageLimit} GB</Text>
          </HStack>
          
          <HStack justify="space-between" p={3} bg={bgSubtle} borderRadius="md">
            <HStack>
              <Icon as={FiImage} color="purple.500" />
              <Text fontSize="sm">Image Limit</Text>
            </HStack>
            <Text fontWeight="bold">{quota.imageLimit}/mo</Text>
          </HStack>
          
          <HStack justify="space-between" p={3} bg={bgSubtle} borderRadius="md">
            <HStack>
              <Icon as={FiTrendingUp} color="green.500" />
              <Text fontSize="sm">Daily Limit</Text>
            </HStack>
            <Text fontWeight="bold">{quota.dailyLimit}</Text>
          </HStack>
          
          <HStack justify="space-between" p={3} bg={bgSubtle} borderRadius="md">
            <HStack>
              <Icon as={FiUsers} color="orange.500" />
              <Text fontSize="sm">Monthly Limit</Text>
            </HStack>
            <Text fontWeight="bold">{quota.monthlyLimit}</Text>
          </HStack>
        </VStack>
      </VStack>
    );
  }

  // Usage Tab
  if (activeTab === 'quota-usage') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <Text fontWeight="bold" fontSize="md">Current Usage</Text>
        
        <Box p={4} bg={bgSubtle} borderRadius="md">
          <VStack spacing={4} align="stretch">
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="sm">Daily Usage</Text>
                <Text fontSize="sm" fontWeight="bold">
                  {quota.dailyUsage} / {quota.dailyLimit}
                </Text>
              </HStack>
              <Progress 
                value={(quota.dailyUsage / quota.dailyLimit) * 100} 
                colorScheme={getUsageColor(quota.dailyUsage, quota.dailyLimit)}
                size="sm"
                borderRadius="full"
              />
            </Box>
            
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="sm">Monthly Usage</Text>
                <Text fontSize="sm" fontWeight="bold">
                  {quota.monthlyUsage} / {quota.monthlyLimit}
                </Text>
              </HStack>
              <Progress 
                value={(quota.monthlyUsage / quota.monthlyLimit) * 100} 
                colorScheme={getUsageColor(quota.monthlyUsage, quota.monthlyLimit)}
                size="sm"
                borderRadius="full"
              />
            </Box>
          </VStack>
        </Box>

        <Text fontSize="xs" color={textSecondary} textAlign="center">
          Usage resets at the start of each billing period
        </Text>
      </VStack>
    );
  }

  return null;
}
