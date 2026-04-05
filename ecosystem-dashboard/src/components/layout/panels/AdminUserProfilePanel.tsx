/**
 * Admin User Profile Panel
 * 
 * Right panel content for viewing/editing user profiles in admin
 * Displays subscription, usage, and settings tabs
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
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Select,
  useToast,
  Skeleton,
  Icon,
  Table,
  Tbody,
  Tr,
  Td,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  FiUser,
  FiMail,
  FiCalendar,
  FiHardDrive,
  FiImage,
  FiZap,
  FiUsers,
  FiCreditCard,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';

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

export function AdminUserProfilePanel() {
  const toast = useToast();
  const { activeTab, customData, setCustomData } = useRightPanel();
  const [data, setData] = useState<UserDetail | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPlanId, setEditPlanId] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editRole, setEditRole] = useState('');

  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const bgSubtle = useColorModeValue('gray.50', 'gray.700');

  const userId = customData?.selectedUserId;

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
      fetchPlans();
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    if (!userId) return;
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
    if (!userId) return;
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
        customData?.onUpdate?.();
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

  if (!userId) {
    return (
      <Box p={4} textAlign="center">
        <Icon as={FiUser} boxSize={12} color="gray.400" mb={4} />
        <Text color={textSecondary}>Select a user to view their profile</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <VStack spacing={4} p={4}>
        <Skeleton height="80px" w="100%" borderRadius="md" />
        <Skeleton height="120px" w="100%" borderRadius="md" />
        <Skeleton height="100px" w="100%" borderRadius="md" />
      </VStack>
    );
  }

  if (!data) {
    return (
      <Alert status="error" m={4}>
        <AlertIcon />
        Failed to load user details
      </Alert>
    );
  }

  // Profile Tab
  if (activeTab === 'user-profile') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        {/* User Header */}
        <HStack spacing={3}>
          <Avatar size="lg" name={data.user.name} src={data.user.avatarUrl} />
          <VStack align="start" spacing={1} flex={1}>
            <Text fontWeight="bold" fontSize="lg">{data.user.name}</Text>
            <HStack fontSize="sm" color={textSecondary}>
              <Icon as={FiMail} />
              <Text>{data.user.email}</Text>
            </HStack>
          </VStack>
        </HStack>

        {/* Badges */}
        <HStack spacing={2} flexWrap="wrap">
          <Badge colorScheme={getStatusBadgeColor(data.user.status)}>
            {data.user.status}
          </Badge>
          <Badge colorScheme={data.user.platformRole === 'platform-admin' ? 'orange' : 'gray'}>
            {data.user.platformRole === 'platform-admin' ? 'Admin' : 'User'}
          </Badge>
          <Badge variant="outline">{data.user.accountType}</Badge>
          {data.quota && (
            <Badge colorScheme={getPlanBadgeColor(data.quota.planName)}>
              {data.quota.planDisplayName}
            </Badge>
          )}
        </HStack>

        <Divider />

        {/* Quick Stats */}
        <SimpleGrid columns={2} spacing={3}>
          <Stat size="sm" bg={bgSubtle} p={3} borderRadius="md">
            <StatLabel fontSize="xs">
              <HStack spacing={1}>
                <Icon as={FiCalendar} />
                <Text>Joined</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="sm">
              {new Date(data.user.createdAt).toLocaleDateString()}
            </StatNumber>
          </Stat>
          <Stat size="sm" bg={bgSubtle} p={3} borderRadius="md">
            <StatLabel fontSize="xs">
              <HStack spacing={1}>
                <Icon as={FiImage} />
                <Text>Images</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="sm">{data.usage.totalImages}</StatNumber>
          </Stat>
        </SimpleGrid>

        {/* Children */}
        {data.children.length > 0 && (
          <Box>
            <HStack mb={2}>
              <Icon as={FiUsers} color={textSecondary} />
              <Text fontWeight="medium" fontSize="sm">Children ({data.children.length})</Text>
            </HStack>
            <VStack align="stretch" spacing={2}>
              {data.children.map((child) => (
                <HStack
                  key={child.id}
                  p={2}
                  borderWidth="1px"
                  borderRadius="md"
                  borderColor={borderColor}
                  fontSize="sm"
                >
                  <Avatar size="xs" name={child.name} src={child.avatar_url} />
                  <Text flex={1}>{child.name}</Text>
                  <Badge size="sm" colorScheme={getStatusBadgeColor(child.status)}>
                    {child.status}
                  </Badge>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}

        {data.user.parentName && (
          <Box p={3} bg={bgSubtle} borderRadius="md">
            <Text fontSize="xs" color={textSecondary}>Parent Account</Text>
            <Text fontSize="sm" fontWeight="medium">{data.user.parentName}</Text>
          </Box>
        )}
      </VStack>
    );
  }

  // Subscription Tab
  if (activeTab === 'subscription') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        {/* Current Plan */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="bold" fontSize="sm">Current Plan</Text>
            {data.quota?.pricing?.monthly && data.quota.pricing.monthly > 0 && (
              <Badge colorScheme="green">{formatPrice(data.quota.pricing.monthly)}/mo</Badge>
            )}
          </HStack>
          
          {data.quota ? (
            <Box p={3} bg={bgSubtle} borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" color={textSecondary}>Plan</Text>
                <Badge colorScheme={getPlanBadgeColor(data.quota.planName)}>
                  {data.quota.planDisplayName}
                </Badge>
              </HStack>
              
              {data.subscription && (
                <>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm" color={textSecondary}>Billing</Text>
                    <Text fontSize="sm">{data.subscription.billingCycle}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color={textSecondary}>Next billing</Text>
                    <Text fontSize="sm">
                      {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
                    </Text>
                  </HStack>
                </>
              )}
            </Box>
          ) : (
            <Text fontSize="sm" color={textSecondary}>No subscription</Text>
          )}
        </Box>

        <Divider />

        {/* Change Plan */}
        <Box>
          <Text fontWeight="bold" fontSize="sm" mb={2}>Change Plan</Text>
          <FormControl size="sm">
            <Select
              size="sm"
              value={editPlanId}
              onChange={(e) => setEditPlanId(e.target.value)}
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.display_name} ({formatPrice(plan.price_monthly_cents)}/mo)
                </option>
              ))}
            </Select>
          </FormControl>
          {editPlanId !== data?.quota?.planId && (
            <Button
              mt={2}
              size="sm"
              colorScheme="blue"
              onClick={handleSave}
              isLoading={saving}
              w="100%"
            >
              Update Plan
            </Button>
          )}
        </Box>

        {/* Payment History */}
        {data.payments.length > 0 && (
          <Box>
            <HStack mb={2}>
              <Icon as={FiCreditCard} color={textSecondary} />
              <Text fontWeight="bold" fontSize="sm">Recent Payments</Text>
            </HStack>
            <Table size="sm" variant="simple">
              <Tbody>
                {data.payments.slice(0, 3).map((payment) => (
                  <Tr key={payment.id}>
                    <Td px={0} py={2}>
                      <Text fontSize="xs">{new Date(payment.date).toLocaleDateString()}</Text>
                    </Td>
                    <Td px={0} py={2} isNumeric>
                      <Badge
                        size="sm"
                        colorScheme={payment.status === 'succeeded' ? 'green' : 'red'}
                      >
                        {formatPrice(payment.amount)}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </VStack>
    );
  }

  // Usage Tab
  if (activeTab === 'usage') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        {data.quota ? (
          <>
            {/* Storage */}
            <Box>
              <HStack justify="space-between" mb={1}>
                <HStack>
                  <Icon as={FiHardDrive} color="blue.500" />
                  <Text fontSize="sm" fontWeight="medium">Storage</Text>
                </HStack>
                <Text fontSize="xs" color={textSecondary}>
                  {formatBytes(data.quota.storage.used)} / {formatBytes(data.quota.storage.quota)}
                </Text>
              </HStack>
              <Progress
                value={data.quota.storage.usedPercent}
                size="sm"
                colorScheme={getProgressColor(data.quota.storage.usedPercent)}
                borderRadius="full"
              />
            </Box>

            {/* Images */}
            <Box>
              <HStack justify="space-between" mb={1}>
                <HStack>
                  <Icon as={FiImage} color="blue.500" />
                  <Text fontSize="sm" fontWeight="medium">Images</Text>
                </HStack>
                <Text fontSize="xs" color={textSecondary}>
                  {data.quota.images.count} / {data.quota.images.limit || '∞'}
                </Text>
              </HStack>
              {data.quota.images.limit && (
                <Progress
                  value={(data.quota.images.count / data.quota.images.limit) * 100}
                  size="sm"
                  colorScheme={getProgressColor((data.quota.images.count / data.quota.images.limit) * 100)}
                  borderRadius="full"
                />
              )}
            </Box>

            {/* Daily */}
            <Box>
              <HStack justify="space-between" mb={1}>
                <HStack>
                  <Icon as={FiZap} color="blue.500" />
                  <Text fontSize="sm" fontWeight="medium">Daily Generations</Text>
                </HStack>
                <Text fontSize="xs" color={textSecondary}>
                  {data.quota.dailyGenerations.used} / {data.quota.dailyGenerations.limit || '∞'}
                </Text>
              </HStack>
              {data.quota.dailyGenerations.limit && (
                <Progress
                  value={(data.quota.dailyGenerations.used / data.quota.dailyGenerations.limit) * 100}
                  size="sm"
                  colorScheme={getProgressColor((data.quota.dailyGenerations.used / data.quota.dailyGenerations.limit) * 100)}
                  borderRadius="full"
                />
              )}
            </Box>

            {/* Monthly */}
            <Box>
              <HStack justify="space-between" mb={1}>
                <HStack>
                  <Icon as={FiCalendar} color="blue.500" />
                  <Text fontSize="sm" fontWeight="medium">Monthly Generations</Text>
                </HStack>
                <Text fontSize="xs" color={textSecondary}>
                  {data.quota.monthlyGenerations.used} / {data.quota.monthlyGenerations.limit || '∞'}
                </Text>
              </HStack>
              {data.quota.monthlyGenerations.limit && (
                <Progress
                  value={(data.quota.monthlyGenerations.used / data.quota.monthlyGenerations.limit) * 100}
                  size="sm"
                  colorScheme={getProgressColor((data.quota.monthlyGenerations.used / data.quota.monthlyGenerations.limit) * 100)}
                  borderRadius="full"
                />
              )}
            </Box>

            {data.quota.isQuotaExceeded && (
              <Alert status="error" size="sm" borderRadius="md">
                <AlertIcon />
                <Text fontSize="xs">Quota exceeded</Text>
              </Alert>
            )}
          </>
        ) : (
          <Text color={textSecondary} fontSize="sm">No quota configured</Text>
        )}
      </VStack>
    );
  }

  // Settings Tab
  if (activeTab === 'settings') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <FormControl>
          <FormLabel fontSize="sm">Status</FormLabel>
          <Select
            size="sm"
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Platform Role</FormLabel>
          <Select
            size="sm"
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
            size="sm"
            onClick={handleSave}
            isLoading={saving}
          >
            Save Changes
          </Button>
        )}
      </VStack>
    );
  }

  return null;
}

export default AdminUserProfilePanel;
