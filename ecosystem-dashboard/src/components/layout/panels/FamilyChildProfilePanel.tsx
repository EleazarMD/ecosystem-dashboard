/**
 * Family Child Profile Panel
 * Right panel content for viewing and managing a child's profile in the Family Admin portal
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  Badge,
  Button,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Spinner,
  Icon,
  Divider,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  useToast,
} from '@chakra-ui/react';
import {
  FiUser,
  FiShield,
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiMessageCircle,
  FiImage,
  FiEdit3,
  FiExternalLink,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import NextLink from 'next/link';

interface ChildData {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  dateOfBirth: string;
  status: string;
  lastLoginAt?: string;
  contentFilterLevel: string;
  dailyUsageLimitMinutes: number;
  controlsActive: boolean;
  allowedServices: string[];
  blockedServices: string[];
  todayUsageMinutes: number;
  todayMessageCount: number;
  todayBlockedAttempts: number;
  pendingApprovals: number;
  allowedHoursStart: string;
  allowedHoursEnd: string;
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function FamilyChildProfilePanel() {
  const { customData, activeTab } = useRightPanel();
  const toast = useToast();
  
  const bgSubtle = useSemanticToken('surface.subtle');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  
  const [child, setChild] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const childId = customData?.selectedChildId;

  useEffect(() => {
    if (!childId) {
      setLoading(false);
      return;
    }
    
    const fetchChild = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/children/${childId}`);
        if (res.ok) {
          const data = await res.json();
          // Transform API response to ChildData format
          const childData: ChildData = {
            id: data.child.id,
            name: data.child.name,
            email: data.child.email,
            avatarUrl: data.child.avatarUrl,
            dateOfBirth: data.child.dateOfBirth,
            status: data.child.status,
            lastLoginAt: data.child.lastLoginAt,
            // Controls
            contentFilterLevel: data.controls?.contentFilterLevel || 'moderate',
            dailyUsageLimitMinutes: data.controls?.dailyUsageLimitMinutes || 60,
            controlsActive: data.controls?.isActive ?? true,
            allowedServices: data.controls?.allowedServices || [],
            blockedServices: data.controls?.blockedServices || [],
            allowedHoursStart: data.controls?.allowedHoursStart || '08:00',
            allowedHoursEnd: data.controls?.allowedHoursEnd || '21:00',
            // Usage
            todayUsageMinutes: data.todayUsage?.totalMinutes || 0,
            todayMessageCount: data.todayUsage?.messageCount || 0,
            todayBlockedAttempts: data.todayUsage?.blockedAttempts || 0,
            // Approvals
            pendingApprovals: data.pendingApprovals || 0,
          };
          setChild(childData);
        }
      } catch (error) {
        console.error('Failed to fetch child:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChild();
  }, [childId]);

  const handleUpdateControl = async (field: string, value: any) => {
    if (!child) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/children/${child.id}/controls`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      
      if (res.ok) {
        setChild({ ...child, [field]: value });
        toast({ title: 'Settings updated', status: 'success', duration: 2000 });
      }
    } catch (error) {
      toast({ title: 'Failed to update', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={4} color={textSecondary}>Loading child profile...</Text>
      </Box>
    );
  }

  if (!childId || !child) {
    return (
      <Box p={6} textAlign="center">
        <Icon as={FiUser} boxSize={12} color="gray.400" mb={4} />
        <Text fontWeight="medium" mb={2}>No Child Selected</Text>
        <Text fontSize="sm" color={textSecondary}>
          Click on a child card to view their profile
        </Text>
      </Box>
    );
  }

  const age = calculateAge(child.dateOfBirth);
  const usagePercent = Math.min(100, (child.todayUsageMinutes / child.dailyUsageLimitMinutes) * 100);

  // Profile Tab
  if (activeTab === 'child-profile') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        {/* Header */}
        <HStack spacing={4}>
          <Avatar size="lg" name={child.name} src={child.avatarUrl} />
          <VStack align="start" spacing={1}>
            <HStack>
              <Text fontWeight="bold" fontSize="lg">{child.name}</Text>
              <Badge colorScheme={child.status === 'active' ? 'green' : 'red'}>
                {child.status}
              </Badge>
            </HStack>
            <Text fontSize="sm" color={textSecondary}>{age} years old</Text>
            <Text fontSize="xs" color={textSecondary}>{child.email}</Text>
          </VStack>
        </HStack>

        <Divider />

        {/* Today's Usage */}
        <Box p={3} bg={bgSubtle} borderRadius="md">
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="medium" fontSize="sm">Today's Usage</Text>
            <Text fontSize="sm" color={textSecondary}>
              {child.todayUsageMinutes}m / {child.dailyUsageLimitMinutes}m
            </Text>
          </HStack>
          <Progress
            value={usagePercent}
            size="sm"
            colorScheme={usagePercent > 80 ? 'red' : usagePercent > 50 ? 'yellow' : 'green'}
            borderRadius="full"
          />
        </Box>

        {/* Stats */}
        <SimpleGrid columns={2} spacing={3}>
          <Stat size="sm" p={3} bg={bgSubtle} borderRadius="md">
            <StatLabel fontSize="xs">Messages</StatLabel>
            <StatNumber fontSize="xl">{child.todayMessageCount}</StatNumber>
            <StatHelpText fontSize="xs">today</StatHelpText>
          </Stat>
          <Stat size="sm" p={3} bg={bgSubtle} borderRadius="md">
            <StatLabel fontSize="xs">Blocked</StatLabel>
            <StatNumber fontSize="xl" color={child.todayBlockedAttempts > 0 ? 'red.500' : undefined}>
              {child.todayBlockedAttempts}
            </StatNumber>
            <StatHelpText fontSize="xs">attempts</StatHelpText>
          </Stat>
        </SimpleGrid>

        {/* Quick Info */}
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between" p={2} bg={bgSubtle} borderRadius="md">
            <HStack>
              <Icon as={FiShield} color="blue.500" />
              <Text fontSize="sm">Content Filter</Text>
            </HStack>
            <Badge colorScheme="blue">{child.contentFilterLevel}</Badge>
          </HStack>
          
          <HStack justify="space-between" p={2} bg={bgSubtle} borderRadius="md">
            <HStack>
              <Icon as={FiClock} color="purple.500" />
              <Text fontSize="sm">Allowed Hours</Text>
            </HStack>
            <Text fontSize="sm">{child.allowedHoursStart || '08:00'} - {child.allowedHoursEnd || '21:00'}</Text>
          </HStack>

          {child.pendingApprovals > 0 && (
            <HStack justify="space-between" p={2} bg="orange.50" borderRadius="md">
              <HStack>
                <Icon as={FiAlertTriangle} color="orange.500" />
                <Text fontSize="sm" color="orange.700">Pending Approvals</Text>
              </HStack>
              <Badge colorScheme="orange">{child.pendingApprovals}</Badge>
            </HStack>
          )}
        </VStack>

        {/* Actions */}
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
  if (activeTab === 'controls') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <Text fontWeight="bold" fontSize="md">Parental Controls</Text>
        
        {/* Controls Active Toggle */}
        <FormControl display="flex" alignItems="center" justifyContent="space-between">
          <FormLabel mb={0} fontSize="sm">Controls Active</FormLabel>
          <Switch
            isChecked={child.controlsActive}
            onChange={(e) => handleUpdateControl('controlsActive', e.target.checked)}
            isDisabled={saving}
            colorScheme="green"
          />
        </FormControl>

        <Divider />

        {/* Content Filter */}
        <FormControl>
          <FormLabel fontSize="sm">Content Filter Level</FormLabel>
          <Select
            size="sm"
            value={child.contentFilterLevel}
            onChange={(e) => handleUpdateControl('contentFilterLevel', e.target.value)}
            isDisabled={saving}
          >
            <option value="strict">Strict (Ages 5-8)</option>
            <option value="moderate">Moderate (Ages 9-12)</option>
            <option value="relaxed">Relaxed (Ages 13+)</option>
          </Select>
        </FormControl>

        {/* Daily Usage Limit */}
        <FormControl>
          <FormLabel fontSize="sm">Daily Usage Limit: {child.dailyUsageLimitMinutes} min</FormLabel>
          <Slider
            value={child.dailyUsageLimitMinutes}
            min={15}
            max={180}
            step={15}
            onChange={(val) => handleUpdateControl('dailyUsageLimitMinutes', val)}
            isDisabled={saving}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          <HStack justify="space-between" mt={1}>
            <Text fontSize="xs" color={textSecondary}>15 min</Text>
            <Text fontSize="xs" color={textSecondary}>3 hours</Text>
          </HStack>
        </FormControl>

        <Divider />

        {/* Services */}
        <Text fontWeight="medium" fontSize="sm">Allowed Services</Text>
        <VStack spacing={2} align="stretch">
          {['chat', 'image-studio', 'workspace', 'planner'].map((service) => (
            <FormControl key={service} display="flex" alignItems="center" justifyContent="space-between">
              <HStack>
                <Icon 
                  as={service === 'chat' ? FiMessageCircle : service === 'image-studio' ? FiImage : FiEdit3} 
                  color="gray.500" 
                />
                <FormLabel mb={0} fontSize="sm" textTransform="capitalize">
                  {service.replace('-', ' ')}
                </FormLabel>
              </HStack>
              <Switch
                size="sm"
                isChecked={!child.blockedServices.includes(service)}
                onChange={(e) => {
                  const newBlocked = e.target.checked
                    ? child.blockedServices.filter(s => s !== service)
                    : [...child.blockedServices, service];
                  handleUpdateControl('blockedServices', newBlocked);
                }}
                isDisabled={saving}
              />
            </FormControl>
          ))}
        </VStack>

        <Button
          as={NextLink}
          href={`/admin/family/${child.id}/controls`}
          size="sm"
          rightIcon={<FiExternalLink />}
          variant="outline"
          mt={2}
        >
          Advanced Controls
        </Button>
      </VStack>
    );
  }

  // Activity Tab
  if (activeTab === 'activity') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <Text fontWeight="bold" fontSize="md">Recent Activity</Text>
        
        <Box p={4} bg={bgSubtle} borderRadius="md" textAlign="center">
          <Icon as={FiActivity} boxSize={8} color="gray.400" mb={2} />
          <Text fontSize="sm" color={textSecondary}>
            Activity log coming soon
          </Text>
          <Button
            as={NextLink}
            href={`/admin/family/${child.id}/activity`}
            size="sm"
            mt={3}
            rightIcon={<FiExternalLink />}
          >
            View Full Activity
          </Button>
        </Box>

        {/* Quick Stats */}
        <SimpleGrid columns={2} spacing={3}>
          <Box p={3} bg={bgSubtle} borderRadius="md">
            <Text fontSize="xs" color={textSecondary}>Today's Messages</Text>
            <Text fontSize="xl" fontWeight="bold">{child.todayMessageCount}</Text>
          </Box>
          <Box p={3} bg={bgSubtle} borderRadius="md">
            <Text fontSize="xs" color={textSecondary}>Blocked Attempts</Text>
            <Text fontSize="xl" fontWeight="bold" color={child.todayBlockedAttempts > 0 ? 'red.500' : undefined}>
              {child.todayBlockedAttempts}
            </Text>
          </Box>
        </SimpleGrid>
      </VStack>
    );
  }

  // Approvals Tab
  if (activeTab === 'approvals') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="md">Pending Approvals</Text>
          {child.pendingApprovals > 0 && (
            <Badge colorScheme="orange">{child.pendingApprovals}</Badge>
          )}
        </HStack>
        
        {child.pendingApprovals === 0 ? (
          <Box p={4} bg={bgSubtle} borderRadius="md" textAlign="center">
            <Icon as={FiCheckCircle} boxSize={8} color="green.400" mb={2} />
            <Text fontSize="sm" color={textSecondary}>
              No pending approvals
            </Text>
            <Text fontSize="xs" color={textSecondary} mt={1}>
              All requests have been reviewed
            </Text>
          </Box>
        ) : (
          <Box p={4} bg="orange.50" borderRadius="md" textAlign="center">
            <Icon as={FiAlertTriangle} boxSize={8} color="orange.400" mb={2} />
            <Text fontSize="sm" fontWeight="medium" color="orange.700">
              {child.pendingApprovals} items need your approval
            </Text>
            <Button
              as={NextLink}
              href={`/admin/family/${child.id}/approvals`}
              size="sm"
              colorScheme="orange"
              mt={3}
            >
              Review Now
            </Button>
          </Box>
        )}
      </VStack>
    );
  }

  return null;
}
