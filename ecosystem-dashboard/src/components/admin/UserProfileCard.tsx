/**
 * User Profile Card Component
 * 
 * Displays detailed user profile with subscription management
 * Used in admin user management for viewing/editing user details
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
  Divider,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Select,
  useToast,
  Skeleton,
  Icon,
  Tooltip,
  Table,
  Tbody,
  Tr,
  Td,
  useColorModeValue,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  FiUser,
  FiMail,
  FiCalendar,
  FiShield,
  FiHardDrive,
  FiImage,
  FiZap,
  FiCreditCard,
  FiUsers,
  FiClock,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiArrowUpRight,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface UserProfileCardProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

interface UserDetail {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    accountType: string;
    platformRole: string;
    status: string;
    createdAt: string;
    lastActiveAt?: string;
    parentUserId?: string;
    parentName?: string;
  };
  quota: {
    planId: string;
    planName: string;
    planDisplayName: string;
    storage: { quota: number; used: number; usedPercent: number };
    images: { limit: number; count: number };
    dailyGenerations: { limit: number; used: number };
    monthlyGenerations: { limit: number; used: number };
    isQuotaExceeded: boolean;
    pricing: { monthly: number; yearly: number };
  } | null;
  subscription: {
    id: string;
    status: string;
    billingCycle: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    planName: string;
    planDisplayName: string;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    description: string;
    isSimulated: boolean;
    date: string;
  }>;
  children: Array<{
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    status: string;
  }>;
  usage: {
    totalImages: number;
    totalStorage: number;
  };
}

interface Plan {
  id: string;
  name: string;
  display_name: string;
  storage_quota_bytes: number;
  price_monthly_cents: number;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return 'Unlimited';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatPrice(cents: number): string {
  if (cents === 0) return 'Free';
  return '$' + (cents / 100).toFixed(2);
}

export function UserProfileCard({ userId, isOpen, onClose, onUpdate }: UserProfileCardProps) {
  const toast = useToast();
  const [data, setData] = useState<UserDetail | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editPlanId, setEditPlanId] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editRole, setEditRole] = useState('');

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textSecondary = useColorModeValue('gray.600', 'gray.400');

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
      fetchPlans();
    }
  }, [isOpen, userId]);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const result = await res.json();
      if (res.ok) {
        setData(result);
        setEditPlanId(result.quota?.planId || '');
        setEditStatus(result.user.status);
        setEditRole(result.user.platformRole);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading user',
        description: error.message,
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/quotas');
      const result = await res.json();
      if (res.ok) {
        setPlans(result.plans || []);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: editPlanId !== data?.quota?.planId ? editPlanId : undefined,
          status: editStatus !== data?.user.status ? editStatus : undefined,
          platformRole: editRole !== data?.user.platformRole ? editRole : undefined,
        }),
      });

      if (res.ok) {
        toast({ title: 'User updated', status: 'success' });
        fetchUserDetails();
        onUpdate?.();
      } else {
        const result = await res.json();
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: 'Error updating user',
        description: error.message,
        status: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'administrator': return 'purple';
      case 'pro': return 'yellow';
      case 'standard': return 'blue';
      case 'child': return 'green';
      case 'starter': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'suspended': return 'red';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'red';
    if (percent >= 70) return 'orange';
    return 'green';
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} size="lg" placement="right">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          User Profile
        </DrawerHeader>

        <DrawerBody py={4}>
          {loading ? (
            <VStack spacing={4}>
              <Skeleton height="100px" w="100%" borderRadius="md" />
              <Skeleton height="200px" w="100%" borderRadius="md" />
              <Skeleton height="150px" w="100%" borderRadius="md" />
            </VStack>
          ) : data ? (
            <VStack spacing={6} align="stretch">
              {/* User Header */}
              <GlassPanel p={4}>
                <HStack spacing={4}>
                  <Avatar
                    size="xl"
                    name={data.user.name}
                    src={data.user.avatarUrl}
                  />
                  <VStack align="start" spacing={1} flex={1}>
                    <HStack>
                      <Text fontSize="xl" fontWeight="bold">
                        {data.user.name}
                      </Text>
                      <Badge colorScheme={getStatusBadgeColor(data.user.status)}>
                        {data.user.status}
                      </Badge>
                    </HStack>
                    <HStack color={textSecondary} fontSize="sm">
                      <Icon as={FiMail} />
                      <Text>{data.user.email}</Text>
                    </HStack>
                    <HStack spacing={2}>
                      <Badge colorScheme={data.user.platformRole === 'platform-admin' ? 'orange' : 'gray'}>
                        {data.user.platformRole === 'platform-admin' ? 'Admin' : 'User'}
                      </Badge>
                      <Badge variant="outline">
                        {data.user.accountType}
                      </Badge>
                      {data.quota && (
                        <Badge colorScheme={getPlanBadgeColor(data.quota.planName)}>
                          {data.quota.planDisplayName}
                        </Badge>
                      )}
                    </HStack>
                  </VStack>
                </HStack>

                {/* Quick Stats */}
                <SimpleGrid columns={3} spacing={4} mt={4}>
                  <Stat size="sm">
                    <StatLabel>
                      <HStack spacing={1}>
                        <Icon as={FiCalendar} />
                        <Text>Joined</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber fontSize="md">
                      {new Date(data.user.createdAt).toLocaleDateString()}
                    </StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>
                      <HStack spacing={1}>
                        <Icon as={FiImage} />
                        <Text>Images</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber fontSize="md">{data.usage.totalImages}</StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>
                      <HStack spacing={1}>
                        <Icon as={FiHardDrive} />
                        <Text>Storage</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber fontSize="md">
                      {formatBytes(data.usage.totalStorage)}
                    </StatNumber>
                  </Stat>
                </SimpleGrid>
              </GlassPanel>

              {/* Tabs */}
              <Tabs variant="enclosed" colorScheme="blue">
                <TabList>
                  <Tab>Subscription</Tab>
                  <Tab>Usage</Tab>
                  <Tab>Payments</Tab>
                  {data.children.length > 0 && <Tab>Children</Tab>}
                  <Tab>Settings</Tab>
                </TabList>

                <TabPanels>
                  {/* Subscription Tab */}
                  <TabPanel px={0}>
                    <VStack spacing={4} align="stretch">
                      {/* Current Plan */}
                      <GlassPanel p={4}>
                        <HStack justify="space-between" mb={3}>
                          <Text fontWeight="bold">Current Plan</Text>
                          {data.quota?.pricing.monthly > 0 && (
                            <Badge colorScheme="green">
                              {formatPrice(data.quota.pricing.monthly)}/mo
                            </Badge>
                          )}
                        </HStack>

                        {data.quota ? (
                          <VStack align="stretch" spacing={3}>
                            <HStack justify="space-between">
                              <Text color={textSecondary}>Plan</Text>
                              <Badge colorScheme={getPlanBadgeColor(data.quota.planName)} size="lg">
                                {data.quota.planDisplayName}
                              </Badge>
                            </HStack>

                            {data.subscription && (
                              <>
                                <HStack justify="space-between">
                                  <Text color={textSecondary}>Billing Cycle</Text>
                                  <Text>{data.subscription.billingCycle}</Text>
                                </HStack>
                                <HStack justify="space-between">
                                  <Text color={textSecondary}>Next Billing</Text>
                                  <Text>
                                    {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
                                  </Text>
                                </HStack>
                                {data.subscription.cancelAtPeriodEnd && (
                                  <Alert status="warning" size="sm" borderRadius="md">
                                    <AlertIcon />
                                    Cancels at period end
                                  </Alert>
                                )}
                              </>
                            )}
                          </VStack>
                        ) : (
                          <Text color={textSecondary}>No subscription configured</Text>
                        )}
                      </GlassPanel>

                      {/* Change Plan */}
                      <GlassPanel p={4}>
                        <Text fontWeight="bold" mb={3}>Change Plan</Text>
                        <FormControl>
                          <Select
                            value={editPlanId}
                            onChange={(e) => setEditPlanId(e.target.value)}
                          >
                            {plans.map((plan) => (
                              <option key={plan.id} value={plan.id}>
                                {plan.display_name} - {formatBytes(plan.storage_quota_bytes)} ({formatPrice(plan.price_monthly_cents)}/mo)
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                        {editPlanId !== data?.quota?.planId && (
                          <Button
                            mt={3}
                            colorScheme="blue"
                            size="sm"
                            onClick={handleSave}
                            isLoading={saving}
                          >
                            Update Plan
                          </Button>
                        )}
                      </GlassPanel>
                    </VStack>
                  </TabPanel>

                  {/* Usage Tab */}
                  <TabPanel px={0}>
                    {data.quota ? (
                      <VStack spacing={4} align="stretch">
                        {/* Storage */}
                        <GlassPanel p={4}>
                          <HStack justify="space-between" mb={2}>
                            <HStack>
                              <Icon as={FiHardDrive} color="blue.500" />
                              <Text fontWeight="medium">Storage</Text>
                            </HStack>
                            <Text fontSize="sm" color={textSecondary}>
                              {formatBytes(data.quota.storage.used)} / {formatBytes(data.quota.storage.quota)}
                            </Text>
                          </HStack>
                          <Progress
                            value={data.quota.storage.usedPercent}
                            colorScheme={getProgressColor(data.quota.storage.usedPercent)}
                            borderRadius="full"
                          />
                        </GlassPanel>

                        {/* Images */}
                        <GlassPanel p={4}>
                          <HStack justify="space-between" mb={2}>
                            <HStack>
                              <Icon as={FiImage} color="blue.500" />
                              <Text fontWeight="medium">Images</Text>
                            </HStack>
                            <Text fontSize="sm" color={textSecondary}>
                              {data.quota.images.count} / {data.quota.images.limit || '∞'}
                            </Text>
                          </HStack>
                          {data.quota.images.limit && (
                            <Progress
                              value={(data.quota.images.count / data.quota.images.limit) * 100}
                              colorScheme={getProgressColor((data.quota.images.count / data.quota.images.limit) * 100)}
                              borderRadius="full"
                            />
                          )}
                        </GlassPanel>

                        {/* Daily Generations */}
                        <GlassPanel p={4}>
                          <HStack justify="space-between" mb={2}>
                            <HStack>
                              <Icon as={FiZap} color="blue.500" />
                              <Text fontWeight="medium">Daily Generations</Text>
                            </HStack>
                            <Text fontSize="sm" color={textSecondary}>
                              {data.quota.dailyGenerations.used} / {data.quota.dailyGenerations.limit || '∞'}
                            </Text>
                          </HStack>
                          {data.quota.dailyGenerations.limit && (
                            <Progress
                              value={(data.quota.dailyGenerations.used / data.quota.dailyGenerations.limit) * 100}
                              colorScheme={getProgressColor((data.quota.dailyGenerations.used / data.quota.dailyGenerations.limit) * 100)}
                              borderRadius="full"
                            />
                          )}
                        </GlassPanel>

                        {/* Monthly Generations */}
                        <GlassPanel p={4}>
                          <HStack justify="space-between" mb={2}>
                            <HStack>
                              <Icon as={FiCalendar} color="blue.500" />
                              <Text fontWeight="medium">Monthly Generations</Text>
                            </HStack>
                            <Text fontSize="sm" color={textSecondary}>
                              {data.quota.monthlyGenerations.used} / {data.quota.monthlyGenerations.limit || '∞'}
                            </Text>
                          </HStack>
                          {data.quota.monthlyGenerations.limit && (
                            <Progress
                              value={(data.quota.monthlyGenerations.used / data.quota.monthlyGenerations.limit) * 100}
                              colorScheme={getProgressColor((data.quota.monthlyGenerations.used / data.quota.monthlyGenerations.limit) * 100)}
                              borderRadius="full"
                            />
                          )}
                        </GlassPanel>

                        {data.quota.isQuotaExceeded && (
                          <Alert status="error" borderRadius="md">
                            <AlertIcon />
                            User has exceeded their quota
                          </Alert>
                        )}
                      </VStack>
                    ) : (
                      <Text color={textSecondary}>No quota configured</Text>
                    )}
                  </TabPanel>

                  {/* Payments Tab */}
                  <TabPanel px={0}>
                    <GlassPanel p={4}>
                      <Text fontWeight="bold" mb={3}>Payment History</Text>
                      {data.payments.length > 0 ? (
                        <Table size="sm" variant="simple">
                          <Tbody>
                            {data.payments.map((payment) => (
                              <Tr key={payment.id}>
                                <Td>
                                  <VStack align="start" spacing={0}>
                                    <Text fontSize="sm">{payment.description}</Text>
                                    <Text fontSize="xs" color={textSecondary}>
                                      {new Date(payment.date).toLocaleDateString()}
                                    </Text>
                                  </VStack>
                                </Td>
                                <Td isNumeric>
                                  <VStack align="end" spacing={0}>
                                    <Text fontWeight="medium">
                                      {formatPrice(payment.amount)}
                                    </Text>
                                    <Badge
                                      size="sm"
                                      colorScheme={payment.status === 'succeeded' ? 'green' : 'red'}
                                    >
                                      {payment.status}
                                    </Badge>
                                  </VStack>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      ) : (
                        <Text color={textSecondary} fontSize="sm">
                          No payment history
                        </Text>
                      )}
                    </GlassPanel>
                  </TabPanel>

                  {/* Children Tab */}
                  {data.children.length > 0 && (
                    <TabPanel px={0}>
                      <GlassPanel p={4}>
                        <Text fontWeight="bold" mb={3}>
                          <HStack>
                            <Icon as={FiUsers} />
                            <Text>Children ({data.children.length})</Text>
                          </HStack>
                        </Text>
                        <VStack align="stretch" spacing={2}>
                          {data.children.map((child) => (
                            <HStack
                              key={child.id}
                              p={2}
                              borderWidth="1px"
                              borderRadius="md"
                              borderColor={borderColor}
                            >
                              <Avatar size="sm" name={child.name} src={child.avatar_url} />
                              <VStack align="start" spacing={0} flex={1}>
                                <Text fontWeight="medium" fontSize="sm">{child.name}</Text>
                                <Text fontSize="xs" color={textSecondary}>{child.email}</Text>
                              </VStack>
                              <Badge colorScheme={getStatusBadgeColor(child.status)}>
                                {child.status}
                              </Badge>
                            </HStack>
                          ))}
                        </VStack>
                      </GlassPanel>
                    </TabPanel>
                  )}

                  {/* Settings Tab */}
                  <TabPanel px={0}>
                    <VStack spacing={4} align="stretch">
                      <GlassPanel p={4}>
                        <Text fontWeight="bold" mb={3}>Account Settings</Text>
                        <VStack spacing={4} align="stretch">
                          <FormControl>
                            <FormLabel>Status</FormLabel>
                            <Select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                            >
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="pending">Pending</option>
                            </Select>
                          </FormControl>

                          <FormControl>
                            <FormLabel>Platform Role</FormLabel>
                            <Select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                            >
                              <option value="user">User</option>
                              <option value="platform-admin">Platform Admin</option>
                            </Select>
                          </FormControl>

                          {(editStatus !== data.user.status || editRole !== data.user.platformRole) && (
                            <Button
                              colorScheme="blue"
                              onClick={handleSave}
                              isLoading={saving}
                            >
                              Save Changes
                            </Button>
                          )}
                        </VStack>
                      </GlassPanel>

                      {data.user.parentName && (
                        <GlassPanel p={4}>
                          <Text fontWeight="bold" mb={2}>Parent Account</Text>
                          <Text color={textSecondary}>{data.user.parentName}</Text>
                        </GlassPanel>
                      )}
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </VStack>
          ) : (
            <Alert status="error">
              <AlertIcon />
              Failed to load user details
            </Alert>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

export default UserProfileCard;
