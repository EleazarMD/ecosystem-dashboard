/**
 * Family Management Page
 * 
 * Parent dashboard for managing child accounts and parental controls
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
  Input,
  InputGroup,
  InputLeftElement,
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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiRefreshCw,
  FiUser,
  FiClock,
  FiShield,
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiSettings,
  FiEye,
  FiMoreVertical,
  FiTrash2,
  FiPause,
  FiPlay,
  FiStar,
  FiImage,
  FiBook,
  FiUserPlus,
  FiMail,
  FiCalendar,
  FiUsers,
  FiHome,
} from 'react-icons/fi';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAuth } from '@/context/AuthContext';
import { useRightPanel } from '@/contexts/RightPanelContext';
import FamilyFeatureUpgradePrompt from '@/components/subscription/FamilyFeatureUpgradePrompt';
import FamilyBooksSection from '@/components/family/FamilyBooksSection';

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

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  accountType: string;
  roleId: string;
  status: string;
  lastLoginAt?: string;
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

function ChildCard({ child, onRefresh, onSelect }: { child: ChildAccount; onRefresh: () => void; onSelect: (childId: string) => void }) {
  const textSecondary = useSemanticToken('text.secondary');
  const toast = useToast();
  const age = calculateAge(child.dateOfBirth);
  const usagePercent = Math.min(100, (child.todayUsageMinutes / child.dailyUsageLimitMinutes) * 100);
  const remainingMinutes = Math.max(0, child.dailyUsageLimitMinutes - child.todayUsageMinutes);

  const handleSuspend = async () => {
    try {
      const res = await fetch(`/api/admin/children/${child.id}`, {
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
    <Box
      cursor="pointer"
      onClick={() => onSelect(child.id)}
      _hover={{ transform: 'translateY(-2px)' }}
      transition="all 0.2s"
    >
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
            <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" size="sm" onClick={(e: React.MouseEvent) => e.stopPropagation()} />
            <MenuList>
              <MenuItem as={NextLink} href={`/admin/family/${child.id}`} icon={<FiEye />}>
                View Details
              </MenuItem>
              <MenuItem as={NextLink} href={`/admin/family/${child.id}/controls`} icon={<FiSettings />}>
                Parental Controls
              </MenuItem>
              <MenuItem as={NextLink} href={`/admin/family/${child.id}/activity`} icon={<FiActivity />}>
                Activity Log
              </MenuItem>
              <MenuItem as={NextLink} href={`/admin/family/${child.id}?tab=goosemind`} icon={<FiStar />}>
                GooseMind Characters
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
              href={`/admin/family/${child.id}/approvals`}
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
            href={`/admin/family/${child.id}`}
            size="sm"
            flex={1}
            leftIcon={<FiEye />}
          >
            View
          </Button>
          <Button
            as={NextLink}
            href={`/admin/family/${child.id}/controls`}
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
    </Box>
  );
}

function FamilyManagementPage() {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const { user } = useAuth();
  
  // Right panel integration - context is set automatically by route detection
  const { setIsOpen: setRightPanelOpen, setCustomData } = useRightPanel();
  
  const handleSelectChild = (childId: string) => {
    setCustomData({ selectedChildId: childId });
    setRightPanelOpen(true);
  };

  const [children, setChildren] = useState<ChildAccount[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isInviteOpen, onOpen: onInviteOpen, onClose: onInviteClose } = useDisclosure();
  const [creating, setCreating] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    hasAccess: boolean;
    currentTier: string;
    maxChildAccounts: number;
  } | null>(null);
  const [form, setForm] = useState<CreateChildForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
  });
  const [inviteForm, setInviteForm] = useState({
    email: '',
    dateOfBirth: '',
    roleId: 'family-adult',
  });
  const [inviting, setInviting] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const { isOpen: isCreateFamilyOpen, onOpen: onCreateFamilyOpen, onClose: onCreateFamilyClose } = useDisclosure();
  const [familyNameForm, setFamilyNameForm] = useState('');
  const [creatingFamily, setCreatingFamily] = useState(false);

  const fetchChildren = async () => {
    setLoading(true);
    try {
      console.log('[Family Page] Fetching children...');
      const res = await fetch('/api/admin/children');
      const data = await res.json();
      console.log('[Family Page] API response:', { ok: res.ok, data });
      if (res.ok) {
        setChildren(data.children);
        
        // Fetch family members (adults)
        const membersRes = await fetch('/api/family/members');
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setFamilyMembers(membersData.familyMembers || []);
          setTenantName(membersData.tenantName || null);
          setTenantId(membersData.tenantId || null);
        }
        
        // Also fetch subscription info
        const subRes = await fetch('/api/user/subscription');
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscriptionInfo({
            hasAccess: subData.hasFamilyManagement ?? false,
            currentTier: subData.tier || 'free',
            maxChildAccounts: subData.limits?.maxChildAccounts ?? 0,
          });
        }
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
      const res = await fetch('/api/admin/children', {
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
        // Check if upgrade is required
        if (data.upgradeRequired) {
          toast({ 
            title: 'Upgrade Required', 
            description: data.error,
            status: 'warning',
            duration: 5000,
          });
        } else {
          toast({ title: data.error, status: 'error' });
        }
      }
    } catch (error) {
      toast({ title: 'Failed to create account', status: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleInviteAdult = async () => {
    const age = calculateAge(inviteForm.dateOfBirth);
    if (age < 18) {
      toast({ 
        title: 'Must be 18 or older', 
        description: 'Use "Add Child" for minors under 18.',
        status: 'error' 
      });
      return;
    }

    setInviting(true);
    try {
      const res = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ 
          title: data.addedDirectly ? 'Member Added' : 'Invitation Sent',
          description: data.message,
          status: 'success' 
        });
        setInviteForm({ email: '', dateOfBirth: '', roleId: 'family-adult' });
        onInviteClose();
        fetchChildren(); // Refresh to show new member
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to send invitation', status: 'error' });
    } finally {
      setInviting(false);
    }
  };

  const handleCreateFamily = async () => {
    if (!familyNameForm.trim()) {
      toast({ title: 'Family name is required', status: 'error' });
      return;
    }

    setCreatingFamily(true);
    try {
      const res = await fetch('/api/family/create-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: familyNameForm }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ 
          title: 'Family Created!',
          description: data.message,
          status: 'success' 
        });
        setFamilyNameForm('');
        onCreateFamilyClose();
        fetchChildren(); // Refresh to show new family
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to create family', status: 'error' });
    } finally {
      setCreatingFamily(false);
    }
  };

  // Summary stats
  const totalUsageToday = children.reduce((sum, c) => sum + c.todayUsageMinutes, 0);
  const totalBlockedToday = children.reduce((sum, c) => sum + c.todayBlockedAttempts, 0);
  const totalPendingApprovals = children.reduce((sum, c) => sum + c.pendingApprovals, 0);

  // Show upgrade prompt if no access to family features
  if (subscriptionInfo && !subscriptionInfo.hasAccess) {
    return (
      <DashboardLayout>
        <Container maxW="container.lg" py={6}>
          <FamilyFeatureUpgradePrompt
            currentTier={subscriptionInfo.currentTier}
            currentChildCount={children.length}
            maxChildCount={subscriptionInfo.maxChildAccounts}
          />
        </Container>
      </DashboardLayout>
    );
  }

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
            <HStack spacing={3} flexWrap="wrap">
              <Button as={NextLink} href="/family/activity" leftIcon={<FiActivity />} variant="outline" size="sm">
                Activity
              </Button>
              <Button as={NextLink} href="/family/library" leftIcon={<FiBook />} variant="outline" size="sm">
                Library
              </Button>
              <Button as={NextLink} href="/family/settings" leftIcon={<FiSettings />} variant="outline" size="sm">
                Settings
              </Button>
              <Button leftIcon={<FiRefreshCw />} onClick={fetchChildren} isLoading={loading} variant="outline" size="sm">
                Refresh
              </Button>
              <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={onOpen} size="sm">
                Add Child
              </Button>
            </HStack>
          </HStack>

          {/* Tabs for Children and Books */}
          <Tabs colorScheme="blue" variant="enclosed">
            <TabList>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiUser} />
                  <Text>Children</Text>
                  <Badge colorScheme="blue">{children.length}</Badge>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiBook} />
                  <Text>Books</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Children Tab */}
              <TabPanel px={0}>
                <VStack spacing={6} align="stretch">
                  {/* Create Family Prompt (if no family tenant) */}
                  {!tenantId && !loading && (
                    <GlassPanel variant="light" p={6}>
                      <VStack spacing={4}>
                        <Icon as={FiUsers} boxSize={12} color="purple.400" />
                        <Heading size="md">Create Your Family</Heading>
                        <Text color={textSecondary} textAlign="center">
                          Set up your family to add children and invite other adults to help manage them.
                        </Text>
                        <Button
                          colorScheme="purple"
                          leftIcon={<FiUserPlus />}
                          onClick={onCreateFamilyOpen}
                        >
                          Create Family
                        </Button>
                      </VStack>
                    </GlassPanel>
                  )}

                  {/* Family Members Section */}
                  {familyMembers.length > 0 && (
                    <GlassPanel variant="light" p={5}>
                      <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between">
                          <HStack spacing={2}>
                            <Icon as={FiUser} color="purple.500" />
                            <Heading size="sm">Family Members</Heading>
                            {tenantName && (
                              <Badge colorScheme="purple" variant="subtle">{tenantName}</Badge>
                            )}
                          </HStack>
                          <HStack spacing={2}>
                            <Badge>{familyMembers.length} {familyMembers.length === 1 ? 'adult' : 'adults'}</Badge>
                            <Button size="xs" leftIcon={<FiUserPlus />} colorScheme="purple" variant="outline" onClick={onInviteOpen}>
                              Invite Adult
                            </Button>
                          </HStack>
                        </HStack>
                        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                          {familyMembers.map((member) => (
                            <Box
                              key={member.id}
                              p={3}
                              borderRadius="md"
                              border="1px"
                              borderColor="gray.200"
                              bg="white"
                              _dark={{ bg: 'gray.800', borderColor: 'gray.600' }}
                            >
                              <HStack spacing={3}>
                                <Avatar size="sm" name={member.name} src={member.avatarUrl} />
                                <VStack align="start" spacing={0} flex={1}>
                                  <HStack spacing={2}>
                                    <Text fontWeight="medium" fontSize="sm">{member.name}</Text>
                                    {(member.roleId === 'tenant-admin' || member.roleId === 'family-organizer') && (
                                      <Badge colorScheme="purple" size="sm" fontSize="xs">Organizer</Badge>
                                    )}
                                    {member.roleId === 'family-adult' && (
                                      <Badge colorScheme="blue" size="sm" fontSize="xs">Adult</Badge>
                                    )}
                                  </HStack>
                                  <Text fontSize="xs" color={textSecondary}>{member.email}</Text>
                                </VStack>
                              </HStack>
                            </Box>
                          ))}
                        </SimpleGrid>
                      </VStack>
                    </GlassPanel>
                  )}

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
                        <ChildCard key={child.id} child={child} onRefresh={fetchChildren} onSelect={handleSelectChild} />
                      ))}
                    </SimpleGrid>
                  )}
                </VStack>
              </TabPanel>

              {/* Books Tab */}
              <TabPanel px={0}>
                <FamilyBooksSection children={children} />
              </TabPanel>
            </TabPanels>
          </Tabs>
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

      {/* Invite Adult Modal */}
      <Modal isOpen={isInviteOpen} onClose={onInviteClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={2}>
              <Icon as={FiUserPlus} color="purple.500" />
              <Text>Invite Adult to Family</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  Adults must be 18 years or older. They will receive an invitation to join your family.
                </Text>
              </Alert>

              <FormControl isRequired>
                <FormLabel>Email Address</FormLabel>
                <InputGroup>
                  <InputLeftElement>
                    <Icon as={FiMail} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    type="email"
                    placeholder="adult@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </InputGroup>
                <FormHelperText>
                  If they already have an account, they'll be added immediately.
                </FormHelperText>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Date of Birth (Age Verification)</FormLabel>
                <InputGroup>
                  <InputLeftElement>
                    <Icon as={FiCalendar} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    type="date"
                    value={inviteForm.dateOfBirth}
                    onChange={(e) => setInviteForm({ ...inviteForm, dateOfBirth: e.target.value })}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  />
                </InputGroup>
                {inviteForm.dateOfBirth && (
                  <FormHelperText color={calculateAge(inviteForm.dateOfBirth) >= 18 ? 'green.500' : 'red.500'}>
                    Age: {calculateAge(inviteForm.dateOfBirth)} years old
                    {calculateAge(inviteForm.dateOfBirth) < 18 && ' (Must be 18+)'}
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl>
                <FormLabel>Role</FormLabel>
                <Menu>
                  <MenuButton as={Button} rightIcon={<FiMoreVertical />} variant="outline" w="full" textAlign="left">
                    {inviteForm.roleId === 'family-organizer' ? 'Family Organizer' : 'Family Adult'}
                  </MenuButton>
                  <MenuList>
                    <MenuItem onClick={() => setInviteForm({ ...inviteForm, roleId: 'family-adult' })}>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="medium">Family Adult</Text>
                        <Text fontSize="xs" color="gray.500">Can manage children and use all features</Text>
                      </VStack>
                    </MenuItem>
                    <MenuItem onClick={() => setInviteForm({ ...inviteForm, roleId: 'family-organizer' })}>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="medium">Family Organizer</Text>
                        <Text fontSize="xs" color="gray.500">Full control including billing and invitations</Text>
                      </VStack>
                    </MenuItem>
                  </MenuList>
                </Menu>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onInviteClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleInviteAdult}
              isLoading={inviting}
              isDisabled={!inviteForm.email || !inviteForm.dateOfBirth || calculateAge(inviteForm.dateOfBirth) < 18}
              leftIcon={<FiUserPlus />}
            >
              Send Invitation
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create Family Modal */}
      <Modal isOpen={isCreateFamilyOpen} onClose={onCreateFamilyClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={2}>
              <Icon as={FiHome} color="purple.500" />
              <Text>Create Your Family</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  Create a family to add children and invite other adults to help manage them.
                </Text>
              </Alert>

              <FormControl isRequired>
                <FormLabel>Family Name</FormLabel>
                <Input
                  placeholder="e.g., The Smith Family"
                  value={familyNameForm}
                  onChange={(e) => setFamilyNameForm(e.target.value)}
                />
                <FormHelperText>
                  This will be visible to all family members.
                </FormHelperText>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateFamilyClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleCreateFamily}
              isLoading={creatingFamily}
              isDisabled={!familyNameForm.trim()}
              leftIcon={<FiUsers />}
            >
              Create Family
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default FamilyManagementPage;

// Route guard: Allow standard users who are parents (have isParent flag)
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const user = session.user as any;

  // Allow access if user is a parent, admin, or has a family subscription
  // This allows new subscribers to create their family
  const isParent = user.isParent === true;
  const isAdmin = user.platformRole === 'platform-admin';
  const hasFamilyAccess = user.hasFamilyManagement === true;

  // Allow access for parents, admins, or users with family subscription
  if (!isParent && !isAdmin && !hasFamilyAccess) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
