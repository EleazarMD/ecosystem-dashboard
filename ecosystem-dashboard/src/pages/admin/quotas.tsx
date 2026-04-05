/**
 * Admin Quota Management Page
 * 
 * Platform admin page to manage user storage quotas and subscription plans
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Avatar,
  Badge,
  Button,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  useToast,
  Spinner,
  Progress,
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
  NumberInput,
  NumberInputField,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Tooltip,
} from '@chakra-ui/react';
import { 
  FiSearch, 
  FiEdit2, 
  FiHardDrive, 
  FiImage, 
  FiUsers,
  FiTrendingUp,
  FiAlertTriangle,
  FiRefreshCw,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { withPlatformAdmin } from '@/lib/auth';

interface UserQuota {
  id: string;
  name: string;
  email: string;
  account_type: string;
  platform_role: string;
  plan_name: string;
  plan_display_name: string;
  storage_used_bytes: number;
  storage_quota_bytes: number;
  image_count: number;
  image_count_limit: number;
  daily_image_generations: number;
  daily_limit: number;
  monthly_image_generations: number;
  monthly_limit: number;
  is_quota_exceeded: boolean;
}

interface Plan {
  id: string;
  name: string;
  display_name: string;
  storage_quota_bytes: number;
  image_count_limit: number;
  daily_image_generations_limit: number;
  monthly_image_generations_limit: number;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return 'Unlimited';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function QuotaManagementPage() {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  
  const [users, setUsers] = useState<UserQuota[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedUser, setSelectedUser] = useState<UserQuota | null>(null);
  const [editPlanId, setEditPlanId] = useState('');
  const [editStorageOverride, setEditStorageOverride] = useState<string>('');
  const [editImageLimitOverride, setEditImageLimitOverride] = useState<string>('');
  const [editDailyLimitOverride, setEditDailyLimitOverride] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchQuotas();
  }, []);

  const fetchQuotas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/quotas');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setPlans(data.plans || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading quotas',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: UserQuota) => {
    setSelectedUser(user);
    const plan = plans.find(p => p.name === user.plan_name);
    setEditPlanId(plan?.id || '');
    setEditStorageOverride('');
    setEditImageLimitOverride('');
    setEditDailyLimitOverride('');
    onOpen();
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    try {
      const body: any = { user_id: selectedUser.id };
      
      if (editPlanId) {
        body.subscription_plan_id = editPlanId;
      }
      if (editStorageOverride) {
        body.storage_quota_bytes_override = parseInt(editStorageOverride) * 1024 * 1024 * 1024; // GB to bytes
      }
      if (editImageLimitOverride) {
        body.image_count_limit_override = parseInt(editImageLimitOverride);
      }
      if (editDailyLimitOverride) {
        body.daily_image_generations_limit_override = parseInt(editDailyLimitOverride);
      }

      const res = await fetch('/api/admin/quotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        toast({
          title: 'Quota updated',
          description: `Updated quota for ${selectedUser.name}`,
          status: 'success',
          duration: 3000,
        });
        onClose();
        fetchQuotas();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Error updating quota',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.plan_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate summary stats
  const totalStorage = users.reduce((sum, u) => sum + (u.storage_used_bytes || 0), 0);
  const totalImages = users.reduce((sum, u) => sum + (u.image_count || 0), 0);
  const exceededCount = users.filter(u => u.is_quota_exceeded).length;

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

  const getUsageColor = (used: number, limit: number | null) => {
    if (!limit) return 'green';
    const percent = (used / limit) * 100;
    if (percent >= 90) return 'red';
    if (percent >= 70) return 'orange';
    return 'green';
  };

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <Box>
              <Heading size="lg">Quota Management</Heading>
              <Text color={textSecondary}>
                Manage user storage quotas and subscription plans
              </Text>
            </Box>
            <Button
              leftIcon={<FiRefreshCw />}
              onClick={fetchQuotas}
              isLoading={loading}
            >
              Refresh
            </Button>
          </HStack>

          {/* Summary Stats */}
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
            <GlassPanel p={4}>
              <Stat>
                <StatLabel>
                  <HStack>
                    <FiUsers />
                    <Text>Total Users</Text>
                  </HStack>
                </StatLabel>
                <StatNumber>{users.length}</StatNumber>
                <StatHelpText>With quota configured</StatHelpText>
              </Stat>
            </GlassPanel>
            
            <GlassPanel p={4}>
              <Stat>
                <StatLabel>
                  <HStack>
                    <FiHardDrive />
                    <Text>Total Storage Used</Text>
                  </HStack>
                </StatLabel>
                <StatNumber>{formatBytes(totalStorage)}</StatNumber>
                <StatHelpText>Across all users</StatHelpText>
              </Stat>
            </GlassPanel>
            
            <GlassPanel p={4}>
              <Stat>
                <StatLabel>
                  <HStack>
                    <FiImage />
                    <Text>Total Images</Text>
                  </HStack>
                </StatLabel>
                <StatNumber>{totalImages}</StatNumber>
                <StatHelpText>Generated images</StatHelpText>
              </Stat>
            </GlassPanel>
            
            <GlassPanel p={4}>
              <Stat>
                <StatLabel>
                  <HStack>
                    <FiAlertTriangle />
                    <Text>Quota Exceeded</Text>
                  </HStack>
                </StatLabel>
                <StatNumber color={exceededCount > 0 ? 'red.500' : 'green.500'}>
                  {exceededCount}
                </StatNumber>
                <StatHelpText>Users over limit</StatHelpText>
              </Stat>
            </GlassPanel>
          </SimpleGrid>

          {/* Tabs */}
          <Tabs>
            <TabList>
              <Tab>Users</Tab>
              <Tab>Plans</Tab>
            </TabList>

            <TabPanels>
              {/* Users Tab */}
              <TabPanel px={0}>
                <GlassPanel>
                  <Box p={4} borderBottomWidth="1px">
                    <InputGroup maxW="400px">
                      <InputLeftElement>
                        <FiSearch />
                      </InputLeftElement>
                      <Input
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </InputGroup>
                  </Box>

                  {loading ? (
                    <Box p={8} textAlign="center">
                      <Spinner size="lg" />
                    </Box>
                  ) : (
                    <Box overflowX="auto">
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>User</Th>
                            <Th>Plan</Th>
                            <Th>Storage</Th>
                            <Th>Images</Th>
                            <Th>Daily</Th>
                            <Th>Monthly</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {filteredUsers.map((user) => (
                            <Tr key={user.id} bg={user.is_quota_exceeded ? 'red.50' : undefined}>
                              <Td>
                                <HStack>
                                  <Avatar size="sm" name={user.name} />
                                  <Box>
                                    <Text fontWeight="medium">{user.name}</Text>
                                    <Text fontSize="sm" color={textSecondary}>
                                      {user.email}
                                    </Text>
                                  </Box>
                                </HStack>
                              </Td>
                              <Td>
                                <Badge colorScheme={getPlanBadgeColor(user.plan_name)}>
                                  {user.plan_display_name || user.plan_name}
                                </Badge>
                              </Td>
                              <Td>
                                <VStack align="start" spacing={1}>
                                  <Text fontSize="sm">
                                    {formatBytes(user.storage_used_bytes)} / {formatBytes(user.storage_quota_bytes)}
                                  </Text>
                                  {user.storage_quota_bytes && (
                                    <Progress
                                      value={(user.storage_used_bytes / user.storage_quota_bytes) * 100}
                                      size="xs"
                                      w="100px"
                                      colorScheme={getUsageColor(user.storage_used_bytes, user.storage_quota_bytes)}
                                    />
                                  )}
                                </VStack>
                              </Td>
                              <Td>
                                <Text fontSize="sm">
                                  {user.image_count} / {user.image_count_limit || '∞'}
                                </Text>
                              </Td>
                              <Td>
                                <Text fontSize="sm">
                                  {user.daily_image_generations} / {user.daily_limit || '∞'}
                                </Text>
                              </Td>
                              <Td>
                                <Text fontSize="sm">
                                  {user.monthly_image_generations} / {user.monthly_limit || '∞'}
                                </Text>
                              </Td>
                              <Td>
                                <Tooltip label="Edit quota">
                                  <IconButton
                                    aria-label="Edit"
                                    icon={<FiEdit2 />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openEditModal(user)}
                                  />
                                </Tooltip>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  )}
                </GlassPanel>
              </TabPanel>

              {/* Plans Tab */}
              <TabPanel px={0}>
                <GlassPanel>
                  <Box overflowX="auto">
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Plan</Th>
                          <Th>Storage Quota</Th>
                          <Th>Image Limit</Th>
                          <Th>Daily Limit</Th>
                          <Th>Monthly Limit</Th>
                          <Th>Users</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {plans.map((plan) => {
                          const userCount = users.filter(u => u.plan_name === plan.name).length;
                          return (
                            <Tr key={plan.id}>
                              <Td>
                                <Badge colorScheme={getPlanBadgeColor(plan.name)} size="lg">
                                  {plan.display_name}
                                </Badge>
                              </Td>
                              <Td>{formatBytes(plan.storage_quota_bytes)}</Td>
                              <Td>{plan.image_count_limit || '∞'}</Td>
                              <Td>{plan.daily_image_generations_limit || '∞'}</Td>
                              <Td>{plan.monthly_image_generations_limit || '∞'}</Td>
                              <Td>
                                <Badge>{userCount}</Badge>
                              </Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </Box>
                </GlassPanel>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>

        {/* Edit Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Edit Quota: {selectedUser?.name}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Subscription Plan</FormLabel>
                  <Select
                    value={editPlanId}
                    onChange={(e) => setEditPlanId(e.target.value)}
                  >
                    <option value="">-- Select Plan --</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.display_name} ({formatBytes(plan.storage_quota_bytes)})
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Storage Override (GB)</FormLabel>
                  <NumberInput min={0}>
                    <NumberInputField
                      placeholder="Leave empty to use plan default"
                      value={editStorageOverride}
                      onChange={(e) => setEditStorageOverride(e.target.value)}
                    />
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel>Image Count Limit Override</FormLabel>
                  <NumberInput min={0}>
                    <NumberInputField
                      placeholder="Leave empty to use plan default"
                      value={editImageLimitOverride}
                      onChange={(e) => setEditImageLimitOverride(e.target.value)}
                    />
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel>Daily Generation Limit Override</FormLabel>
                  <NumberInput min={0}>
                    <NumberInputField
                      placeholder="Leave empty to use plan default"
                      value={editDailyLimitOverride}
                      onChange={(e) => setEditDailyLimitOverride(e.target.value)}
                    />
                  </NumberInput>
                </FormControl>

                {selectedUser && (
                  <Box w="100%" p={4} bg="gray.50" borderRadius="md">
                    <Text fontWeight="bold" mb={2}>Current Usage</Text>
                    <SimpleGrid columns={2} spacing={2} fontSize="sm">
                      <Text>Storage:</Text>
                      <Text>{formatBytes(selectedUser.storage_used_bytes)}</Text>
                      <Text>Images:</Text>
                      <Text>{selectedUser.image_count}</Text>
                      <Text>Daily generations:</Text>
                      <Text>{selectedUser.daily_image_generations}</Text>
                      <Text>Monthly generations:</Text>
                      <Text>{selectedUser.monthly_image_generations}</Text>
                    </SimpleGrid>
                  </Box>
                )}
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSave}
                isLoading={saving}
              >
                Save Changes
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Container>
    </DashboardLayout>
  );
}

export default withPlatformAdmin(QuotaManagementPage);
