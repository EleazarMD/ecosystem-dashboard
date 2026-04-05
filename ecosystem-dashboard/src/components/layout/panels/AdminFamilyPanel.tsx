/**
 * Admin Family Panel
 * Right panel content for managing child accounts and parental controls
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  Icon,
  Divider,
  Avatar,
  Button,
  Switch,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import {
  FiUser,
  FiShield,
  FiClock,
  FiActivity,
  FiExternalLink,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import NextLink from 'next/link';

interface ChildAccount {
  id: string;
  name: string;
  avatarUrl?: string;
  age: number;
  status: 'active' | 'restricted' | 'offline';
  lastActive: string;
  screenTimeToday: number;
  screenTimeLimit: number;
}

export default function AdminFamilyPanel() {
  const { customData, activeTab } = useRightPanel();
  
  const bgSubtle = useSemanticToken('surface.subtle');
  const textSecondary = useSemanticToken('text.secondary');
  
  const [child, setChild] = useState<ChildAccount | null>(null);
  const [loading, setLoading] = useState(true);
  
  const selectedChildId = customData?.selectedChildId;

  useEffect(() => {
    if (!selectedChildId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const timer = setTimeout(() => {
      setChild({
        id: selectedChildId,
        name: 'Luca',
        age: 10,
        status: 'active',
        lastActive: '5 min ago',
        screenTimeToday: 45,
        screenTimeLimit: 120,
      });
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedChildId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge colorScheme="green">Active</Badge>;
      case 'restricted':
        return <Badge colorScheme="orange">Restricted</Badge>;
      case 'offline':
        return <Badge colorScheme="gray">Offline</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={4} color={textSecondary}>Loading...</Text>
      </Box>
    );
  }

  if (!selectedChildId || !child) {
    return (
      <Box p={6} textAlign="center">
        <Icon as={FiUser} boxSize={12} color="gray.400" mb={4} />
        <Text fontWeight="medium" mb={2}>No Child Selected</Text>
        <Text fontSize="sm" color={textSecondary}>
          Select a child account to view details
        </Text>
      </Box>
    );
  }

  // Overview Tab
  if (activeTab === 'child-overview') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <HStack spacing={3}>
          <Avatar size="lg" name={child.name} src={child.avatarUrl} />
          <VStack align="start" spacing={0}>
            <HStack>
              <Text fontWeight="bold" fontSize="lg">{child.name}</Text>
              {getStatusBadge(child.status)}
            </HStack>
            <Text fontSize="sm" color={textSecondary}>Age {child.age}</Text>
            <HStack spacing={1}>
              <Icon as={FiClock} boxSize={3} color={textSecondary} />
              <Text fontSize="xs" color={textSecondary}>Last active: {child.lastActive}</Text>
            </HStack>
          </VStack>
        </HStack>

        <Divider />

        <Box p={3} bg={bgSubtle} borderRadius="md">
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" fontWeight="medium">Screen Time Today</Text>
            <Text fontSize="sm" fontWeight="bold">
              {child.screenTimeToday} / {child.screenTimeLimit} min
            </Text>
          </HStack>
          <Box
            h="8px"
            bg="gray.200"
            _dark={{ bg: 'gray.600' }}
            borderRadius="full"
            overflow="hidden"
          >
            <Box
              h="100%"
              w={`${Math.min((child.screenTimeToday / child.screenTimeLimit) * 100, 100)}%`}
              bg={child.screenTimeToday >= child.screenTimeLimit ? 'red.400' : 'green.400'}
              borderRadius="full"
            />
          </Box>
        </Box>

        <Button
          as={NextLink}
          href={`/admin/family/${child.id}`}
          size="sm"
          rightIcon={<FiExternalLink />}
          variant="outline"
        >
          View Full Profile
        </Button>
      </VStack>
    );
  }

  // Controls Tab
  if (activeTab === 'child-controls') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <Text fontWeight="bold" fontSize="md">Parental Controls</Text>
        
        <VStack spacing={3} align="stretch">
          <FormControl display="flex" alignItems="center" justifyContent="space-between" p={3} bg={bgSubtle} borderRadius="md">
            <FormLabel htmlFor="safe-search" mb={0} fontSize="sm">
              Safe Search
            </FormLabel>
            <Switch id="safe-search" defaultChecked colorScheme="green" />
          </FormControl>
          
          <FormControl display="flex" alignItems="center" justifyContent="space-between" p={3} bg={bgSubtle} borderRadius="md">
            <FormLabel htmlFor="content-filter" mb={0} fontSize="sm">
              Content Filter
            </FormLabel>
            <Switch id="content-filter" defaultChecked colorScheme="green" />
          </FormControl>
          
          <FormControl display="flex" alignItems="center" justifyContent="space-between" p={3} bg={bgSubtle} borderRadius="md">
            <FormLabel htmlFor="require-approval" mb={0} fontSize="sm">
              Require Approval
            </FormLabel>
            <Switch id="require-approval" defaultChecked colorScheme="green" />
          </FormControl>
          
          <FormControl display="flex" alignItems="center" justifyContent="space-between" p={3} bg={bgSubtle} borderRadius="md">
            <FormLabel htmlFor="screen-time" mb={0} fontSize="sm">
              Screen Time Limits
            </FormLabel>
            <Switch id="screen-time" defaultChecked colorScheme="green" />
          </FormControl>
        </VStack>
      </VStack>
    );
  }

  // Activity Tab
  if (activeTab === 'child-activity') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="md">Recent Activity</Text>
          <Badge colorScheme="blue">Today</Badge>
        </HStack>
        
        <VStack spacing={2} align="stretch">
          <HStack p={3} bg={bgSubtle} borderRadius="md" spacing={3}>
            <Icon as={FiActivity} color="green.500" />
            <VStack align="start" spacing={0} flex={1}>
              <Text fontSize="sm">Used Art Studio</Text>
              <Text fontSize="xs" color={textSecondary}>Created 2 images</Text>
            </VStack>
            <Text fontSize="xs" color={textSecondary}>10 min ago</Text>
          </HStack>
          
          <HStack p={3} bg={bgSubtle} borderRadius="md" spacing={3}>
            <Icon as={FiActivity} color="blue.500" />
            <VStack align="start" spacing={0} flex={1}>
              <Text fontSize="sm">Chat with Goose</Text>
              <Text fontSize="xs" color={textSecondary}>Asked about dinosaurs</Text>
            </VStack>
            <Text fontSize="xs" color={textSecondary}>25 min ago</Text>
          </HStack>
          
          <HStack p={3} bg={bgSubtle} borderRadius="md" spacing={3}>
            <Icon as={FiActivity} color="purple.500" />
            <VStack align="start" spacing={0} flex={1}>
              <Text fontSize="sm">Reading Time</Text>
              <Text fontSize="xs" color={textSecondary}>15 minutes</Text>
            </VStack>
            <Text fontSize="xs" color={textSecondary}>1 hour ago</Text>
          </HStack>
        </VStack>

        <Button
          as={NextLink}
          href={`/admin/family/${child.id}/activity`}
          size="sm"
          rightIcon={<FiExternalLink />}
          variant="outline"
        >
          View All Activity
        </Button>
      </VStack>
    );
  }

  return null;
}
