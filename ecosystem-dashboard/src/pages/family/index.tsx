/**
 * Family Management Page
 * 
 * Parent dashboard for managing child accounts and parental controls
 * Accessible to any user who is a parent (has child accounts) or platform admin
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Avatar,
  Badge,
  Button,
  IconButton,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Icon,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiRefreshCw,
  FiUser,
  FiShield,
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiSettings,
  FiEye,
  FiMoreVertical,
  FiPause,
  FiPlay,
} from 'react-icons/fi';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { withParent } from '@/lib/auth/withParent';

interface ChildAccount {
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
}

interface CreateChildForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
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

function ChildCard({ child, onRefresh }: { child: ChildAccount; onRefresh: () => void }) {
  const textSecondary = useSemanticToken('text.secondary');
  const toast = useToast();
  const age = calculateAge(child.dateOfBirth);
  const usagePercent = Math.min(100, (child.todayUsageMinutes / child.dailyUsageLimitMinutes) * 100);
  const remainingMinutes = Math.max(0, child.dailyUsageLimitMinutes - child.todayUsageMinutes);

  const handleSuspend = async () => {
    try {
      const res = await fetch(`/api/family/children/${child.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: child.status === 'active' ? 'suspended' : 'active' }),
      });
      if (res.ok) {
        toast({ title: `Account ${child.status === 'active' ? 'suspended' : 'activated'}`, status: 'success' });
        onRefresh();
      }
    } catch (error) {
      toast({ title: 'Failed to update status', status: 'error' });
    }
  };

  return (
    <GlassPanel variant="light" p={5}>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack spacing={3}>
            <Avatar size="md" name={child.name} src={child.avatarUrl} />
            <VStack align="start" spacing={0}>
              <HStack>
                <Text fontWeight="bold" fontSize="lg">{child.name}</Text>
                <Badge colorScheme={child.status === 'active' ? 'green' : 'red'}>
                  {child.status}
                </Badge>
              </HStack>
              <Text fontSize="sm" color={textSecondary}>
                {age} years old • {child.email}
              </Text>
            </VStack>
          </HStack>
          <Menu>
            <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" size="sm" />
            <MenuList>
              <MenuItem as={NextLink} href={`/family/${child.id}`} icon={<FiEye />}>
                View Details
              </MenuItem>
              <MenuItem as={NextLink} href={`/family/${child.id}/controls`} icon={<FiSettings />}>
                Parental Controls
              </MenuItem>
              <MenuItem as={NextLink} href={`/family/${child.id}/activity`} icon={<FiActivity />}>
                Activity Log
              </MenuItem>
              <Divider />
              <MenuItem icon={child.status === 'active' ? <FiPause /> : <FiPlay />} onClick={handleSuspend}>
                {child.status === 'active' ? 'Suspend Account' : 'Activate Account'}
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>

        {/* Usage Progress */}
        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="sm" fontWeight="medium">Today's Usage</Text>
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
          <Text fontSize="xs" color={textSecondary} mt={1}>
            {remainingMinutes} minutes remaining
          </Text>
        </Box>

        {/* Stats */}
        <SimpleGrid columns={3} spacing={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs">Messages</StatLabel>
            <StatNumber fontSize="lg">{child.todayMessageCount}</StatNumber>
          </Stat>
          <Stat size="sm">
            <StatLabel fontSize="xs">Blocked</StatLabel>
            <StatNumber fontSize="lg" color={child.todayBlockedAttempts > 0 ? 'red.500' : undefined}>
              {child.todayBlockedAttempts}
            </StatNumber>
          </Stat>
          <Stat size="sm">
            <StatLabel fontSize="xs">Approvals</StatLabel>
            <StatNumber fontSize="lg" color={child.pendingApprovals > 0 ? 'orange.500' : undefined}>
              {child.pendingApprovals}
            </StatNumber>
          </Stat>
        </SimpleGrid>

        {/* Filter Level & Alerts */}
        <HStack justify="space-between" pt={2} borderTop="1px" borderColor="gray.200">
          <HStack spacing={2}>
            <Icon as={FiShield} color="blue.500" />
            <Text fontSize="sm" fontWeight="medium">
              {child.contentFilterLevel.charAt(0).toUpperCase() + child.contentFilterLevel.slice(1)} Filter
            </Text>
          </HStack>
          {child.pendingApprovals > 0 && (
            <Button
              as={NextLink}
              href={`/family/${child.id}/approvals`}
              size="xs"
              colorScheme="orange"
              leftIcon={<FiAlertTriangle />}
            >
              {child.pendingApprovals} Pending
            </Button>
          )}
          {child.todayBlockedAttempts > 0 && child.pendingApprovals === 0 && (
            <Tooltip label="Blocked content attempts today">
              <Badge colorScheme="red" variant="subtle">
                <HStack spacing={1}>
                  <FiAlertTriangle size={12} />
                  <Text>{child.todayBlockedAttempts} blocked</Text>
                </HStack>
              </Badge>
            </Tooltip>
          )}
          {child.todayBlockedAttempts === 0 && child.pendingApprovals === 0 && (
            <Badge colorScheme="green" variant="subtle">
              <HStack spacing={1}>
                <FiCheckCircle size={12} />
                <Text>All good</Text>
              </HStack>
            </Badge>
          )}
        </HStack>

        {/* Quick Actions */}
        <HStack spacing={2}>
          <Button
            as={NextLink}
            href={`/family/${child.id}`}
            size="sm"
            flex={1}
            leftIcon={<FiEye />}
          >
            View
          </Button>
          <Button
            as={NextLink}
            href={`/family/${child.id}/controls`}
            size="sm"
            flex={1}
            leftIcon={<FiSettings />}
            variant="outline"
          >
            Controls
          </Button>
        </HStack>
      </VStack>
    </GlassPanel>
  );
}

interface ParentInfo {
  isParent: boolean;
  isPlatformAdmin: boolean;
  childCount: number;
}

function FamilyManagementPage({ parentInfo }: { parentInfo: ParentInfo }) {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');

  const [children, setChildren] = useState<ChildAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateChildForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
  });

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/family/children');
      const data = await res.json();
      if (res.ok) {
        setChildren(data.children);
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to fetch children', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  const handleCreateChild = async () => {
    if (form.password !== form.confirmPassword) {
      toast({ title: 'Passwords do not match', status: 'error' });
      return;
    }

    const age = calculateAge(form.dateOfBirth);
    if (age >= 18) {
      toast({ title: 'Child must be under 18 years old', status: 'error' });
      return;
    }
    if (age < 0) {
      toast({ title: 'Invalid date of birth', status: 'error' });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/family/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          dateOfBirth: form.dateOfBirth,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: `Account created for ${form.name}`, status: 'success' });
        setForm({ name: '', email: '', password: '', confirmPassword: '', dateOfBirth: '' });
        onClose();
        fetchChildren();
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to create account', status: 'error' });
    } finally {
      setCreating(false);
    }
  };

  // Summary stats
  const totalUsageToday = children.reduce((sum, c) => sum + c.todayUsageMinutes, 0);
  const totalBlockedToday = children.reduce((sum, c) => sum + c.todayBlockedAttempts, 0);
  const totalPendingApprovals = children.reduce((sum, c) => sum + c.pendingApprovals, 0);

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <Box>
              <Heading size="lg">Family Management</Heading>
              <Text color={textSecondary}>
                Manage child accounts and parental controls
              </Text>
            </Box>
            <HStack spacing={3}>
              <Button leftIcon={<FiRefreshCw />} onClick={fetchChildren} isLoading={loading} variant="outline">
                Refresh
              </Button>
              <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={onOpen}>
                Add Child
              </Button>
            </HStack>
          </HStack>

          {/* Summary Stats */}
          {children.length > 0 && (
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Children</StatLabel>
                  <StatNumber>{children.length}</StatNumber>
                  <StatHelpText>accounts</StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Total Usage Today</StatLabel>
                  <StatNumber>{totalUsageToday}m</StatNumber>
                  <StatHelpText>combined</StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Blocked Attempts</StatLabel>
                  <StatNumber color={totalBlockedToday > 0 ? 'red.500' : undefined}>
                    {totalBlockedToday}
                  </StatNumber>
                  <StatHelpText>today</StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Pending Approvals</StatLabel>
                  <StatNumber color={totalPendingApprovals > 0 ? 'orange.500' : undefined}>
                    {totalPendingApprovals}
                  </StatNumber>
                  <StatHelpText>
                    {totalPendingApprovals > 0 ? 'needs attention' : 'all clear'}
                  </StatHelpText>
                </Stat>
              </GlassPanel>
            </SimpleGrid>
          )}

          {/* Children Grid */}
          {loading ? (
            <Box p={8} textAlign="center">
              <Spinner size="lg" />
              <Text mt={4} color={textSecondary}>Loading children...</Text>
            </Box>
          ) : children.length === 0 ? (
            <GlassPanel variant="light" p={8}>
              <VStack spacing={4}>
                <Icon as={FiUser} boxSize={12} color="gray.400" />
                <Heading size="md">No Child Accounts</Heading>
                <Text color={textSecondary} textAlign="center">
                  Add your first child account to get started with parental controls
                </Text>
                <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={onOpen}>
                  Add Child Account
                </Button>
              </VStack>
            </GlassPanel>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {children.map((child) => (
                <ChildCard key={child.id} child={child} onRefresh={fetchChildren} />
              ))}
            </SimpleGrid>
          )}
        </VStack>
      </Container>

      {/* Create Child Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Child Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  placeholder="Child's name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="child@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <FormHelperText>Used for login</FormHelperText>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Date of Birth</FormLabel>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
                {form.dateOfBirth && (
                  <FormHelperText>
                    Age: {calculateAge(form.dateOfBirth)} years old
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  placeholder="Create a password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Confirm Password</FormLabel>
                <Input
                  type="password"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
              </FormControl>

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  Default parental controls will be applied. You can customize them after creation.
                </Text>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleCreateChild}
              isLoading={creating}
              isDisabled={!form.name || !form.email || !form.password || !form.dateOfBirth}
            >
              Create Account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default withParent(FamilyManagementPage);
