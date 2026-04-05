/**
 * Admin User Feature Management Page
 * 
 * Allows platform admins to:
 * - View all users and their subscription tiers
 * - Grant/revoke individual features
 * - Change subscription tiers
 * - Add extra child slots
 * - Set custom limits
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  IconButton,
  Input,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Checkbox,
  CheckboxGroup,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Spinner,
  InputGroup,
  InputLeftElement,
  Divider,
} from '@chakra-ui/react';
import { 
  SearchIcon, 
  EditIcon,
  AddIcon,
  MinusIcon,
} from '@chakra-ui/icons';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import {
  SUBSCRIPTION_TIERS,
  FEATURE_ADDONS,
  SubscriptionTier,
  FeatureFlag,
  UserFeatureAccess,
  getUserFeatures,
} from '@/lib/subscription-tiers';

interface UserWithAccess {
  id: string;
  email: string;
  name: string;
  platformRole: string;
  access: UserFeatureAccess;
  features: FeatureFlag[];
}

const TIER_COLORS: Record<SubscriptionTier, string> = {
  free: 'gray',
  basic: 'blue',
  pro: 'purple',
  family: 'pink',
  enterprise: 'orange',
  admin: 'red',
};

export default function AdminUserFeaturesPage() {
  const { isPlatformAdmin } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [users, setUsers] = useState<UserWithAccess[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithAccess[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithAccess | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editTier, setEditTier] = useState<SubscriptionTier>('free');
  const [grantedFeatures, setGrantedFeatures] = useState<FeatureFlag[]>([]);
  const [revokedFeatures, setRevokedFeatures] = useState<FeatureFlag[]>([]);
  const [extraChildSlots, setExtraChildSlots] = useState(0);

  // Redirect non-admins
  useEffect(() => {
    if (!isPlatformAdmin) {
      router.push('/dashboard');
    }
  }, [isPlatformAdmin, router]);

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users
  useEffect(() => {
    let filtered = users;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(query) ||
        u.name.toLowerCase().includes(query)
      );
    }
    
    if (tierFilter !== 'all') {
      filtered = filtered.filter(u => u.access.subscriptionTier === tierFilter);
    }
    
    setFilteredUsers(filtered);
  }, [users, searchQuery, tierFilter]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/users-with-features');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (user: UserWithAccess) => {
    setSelectedUser(user);
    setEditTier(user.access.subscriptionTier);
    setGrantedFeatures(user.access.adminGrantedFeatures || []);
    setRevokedFeatures(user.access.adminRevokedFeatures || []);
    setExtraChildSlots(user.access.extraChildSlots || 0);
    onOpen();
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    try {
      setIsSaving(true);
      
      const response = await fetch('/api/user/feature-access', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          subscriptionTier: editTier,
          grantFeatures: grantedFeatures.filter(f => 
            !selectedUser.access.adminGrantedFeatures?.includes(f)
          ),
          revokeFeatures: revokedFeatures.filter(f =>
            !selectedUser.access.adminRevokedFeatures?.includes(f)
          ),
          extraChildSlots,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      toast({
        title: 'Success',
        description: `Updated features for ${selectedUser.name}`,
        status: 'success',
        duration: 3000,
      });

      onClose();
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user features',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGrantedFeature = (feature: FeatureFlag) => {
    if (grantedFeatures.includes(feature)) {
      setGrantedFeatures(grantedFeatures.filter(f => f !== feature));
    } else {
      setGrantedFeatures([...grantedFeatures, feature]);
      // Remove from revoked if present
      setRevokedFeatures(revokedFeatures.filter(f => f !== feature));
    }
  };

  const toggleRevokedFeature = (feature: FeatureFlag) => {
    if (revokedFeatures.includes(feature)) {
      setRevokedFeatures(revokedFeatures.filter(f => f !== feature));
    } else {
      setRevokedFeatures([...revokedFeatures, feature]);
      // Remove from granted if present
      setGrantedFeatures(grantedFeatures.filter(f => f !== feature));
    }
  };

  // All available features
  const allFeatures: FeatureFlag[] = [
    'workspace', 'email', 'calendar', 'chat',
    'image-studio', 'podcast-studio',
    'ai-research', 'clinical-evidence', 'ml-training', 'agentic-workflows',
    'knowledge-base', 'ide-memory',
    'ai-gateway', 'ai-inferencing', 'infrastructure', 'monitoring', 'agent-registry',
    'admin-panel', 'user-management', 'platform-config',
    'family-management', 'child-accounts',
    'settings', 'system-backup', 'approvals',
  ];

  if (!isPlatformAdmin) {
    return null;
  }

  return (
    <DashboardLayout>
      <Box p={6} maxW="1400px" mx="auto">
        <VStack align="stretch" spacing={6}>
          {/* Header */}
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Heading size="lg">User Feature Management</Heading>
              <Text color="gray.500">
                Manage subscription tiers and feature access for all users
              </Text>
            </VStack>
            <Button
              leftIcon={<AddIcon />}
              colorScheme="blue"
              onClick={fetchUsers}
            >
              Refresh
            </Button>
          </HStack>

          {/* Filters */}
          <HStack spacing={4}>
            <InputGroup maxW="300px">
              <InputLeftElement>
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <Select
              maxW="200px"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
            >
              <option value="all">All Tiers</option>
              {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
                <option key={key} value={key}>{tier.name}</option>
              ))}
            </Select>
          </HStack>

          {/* Users Table */}
          {isLoading ? (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" />
              <Text mt={4}>Loading users...</Text>
            </Box>
          ) : (
            <Box overflowX="auto" borderRadius="lg" border="1px" borderColor="gray.200">
              <Table variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>User</Th>
                    <Th>Tier</Th>
                    <Th>Add-ons</Th>
                    <Th>Granted</Th>
                    <Th>Revoked</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredUsers.map((user) => (
                    <Tr key={user.id}>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium">{user.name}</Text>
                          <Text fontSize="sm" color="gray.500">{user.email}</Text>
                        </VStack>
                      </Td>
                      <Td>
                        <Badge colorScheme={TIER_COLORS[user.access.subscriptionTier]}>
                          {SUBSCRIPTION_TIERS[user.access.subscriptionTier]?.name || user.access.subscriptionTier}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing={1} flexWrap="wrap">
                          {user.access.purchasedAddOns?.length > 0 ? (
                            user.access.purchasedAddOns.map(addOnId => {
                              const addOn = FEATURE_ADDONS.find(a => a.id === addOnId);
                              return (
                                <Badge key={addOnId} colorScheme="green" size="sm">
                                  {addOn?.name || addOnId}
                                </Badge>
                              );
                            })
                          ) : (
                            <Text fontSize="sm" color="gray.400">None</Text>
                          )}
                        </HStack>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color="green.600">
                          {user.access.adminGrantedFeatures?.length || 0}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color="red.600">
                          {user.access.adminRevokedFeatures?.length || 0}
                        </Text>
                      </Td>
                      <Td>
                        <IconButton
                          aria-label="Edit user"
                          icon={<EditIcon />}
                          size="sm"
                          onClick={() => openEditModal(user)}
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}

          {/* Tier Overview */}
          <Box mt={8}>
            <Heading size="md" mb={4}>Subscription Tiers Overview</Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
                <Box
                  key={key}
                  p={4}
                  borderRadius="lg"
                  border="1px"
                  borderColor="gray.200"
                  bg="white"
                >
                  <HStack justify="space-between" mb={2}>
                    <Badge colorScheme={TIER_COLORS[key as SubscriptionTier]} fontSize="md">
                      {tier.name}
                    </Badge>
                    <Text fontWeight="bold">
                      {tier.price === 0 ? 'Free' : `$${tier.price}/mo`}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    {tier.description}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {tier.features.length} features • {tier.maxChildAccounts === -1 ? '∞' : tier.maxChildAccounts} child slots
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        </VStack>

        {/* Edit Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent maxW="800px">
            <ModalHeader>
              Edit Features: {selectedUser?.name}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Tabs>
                <TabList>
                  <Tab>Subscription</Tab>
                  <Tab>Grant Features</Tab>
                  <Tab>Revoke Features</Tab>
                  <Tab>Limits</Tab>
                </TabList>

                <TabPanels>
                  {/* Subscription Tab */}
                  <TabPanel>
                    <VStack align="stretch" spacing={4}>
                      <Box>
                        <Text fontWeight="medium" mb={2}>Subscription Tier</Text>
                        <Select
                          value={editTier}
                          onChange={(e) => setEditTier(e.target.value as SubscriptionTier)}
                        >
                          {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
                            <option key={key} value={key}>
                              {tier.name} - ${tier.price}/mo ({tier.features.length} features)
                            </option>
                          ))}
                        </Select>
                      </Box>
                      <Box>
                        <Text fontWeight="medium" mb={2}>Tier Features</Text>
                        <SimpleGrid columns={3} spacing={2}>
                          {SUBSCRIPTION_TIERS[editTier].features.map(feature => (
                            <Badge key={feature} colorScheme="blue" variant="subtle">
                              {feature}
                            </Badge>
                          ))}
                        </SimpleGrid>
                      </Box>
                    </VStack>
                  </TabPanel>

                  {/* Grant Features Tab */}
                  <TabPanel>
                    <Text fontSize="sm" color="gray.600" mb={4}>
                      Grant additional features beyond the subscription tier
                    </Text>
                    <SimpleGrid columns={3} spacing={2}>
                      {allFeatures.map(feature => {
                        const isInTier = SUBSCRIPTION_TIERS[editTier].features.includes(feature);
                        const isGranted = grantedFeatures.includes(feature);
                        
                        return (
                          <Checkbox
                            key={feature}
                            isChecked={isGranted}
                            isDisabled={isInTier}
                            onChange={() => toggleGrantedFeature(feature)}
                            colorScheme="green"
                          >
                            <Text fontSize="sm" color={isInTier ? 'gray.400' : undefined}>
                              {feature}
                              {isInTier && ' (in tier)'}
                            </Text>
                          </Checkbox>
                        );
                      })}
                    </SimpleGrid>
                  </TabPanel>

                  {/* Revoke Features Tab */}
                  <TabPanel>
                    <Text fontSize="sm" color="gray.600" mb={4}>
                      Revoke features (overrides tier and add-ons)
                    </Text>
                    <SimpleGrid columns={3} spacing={2}>
                      {allFeatures.map(feature => {
                        const isRevoked = revokedFeatures.includes(feature);
                        
                        return (
                          <Checkbox
                            key={feature}
                            isChecked={isRevoked}
                            onChange={() => toggleRevokedFeature(feature)}
                            colorScheme="red"
                          >
                            <Text fontSize="sm">
                              {feature}
                            </Text>
                          </Checkbox>
                        );
                      })}
                    </SimpleGrid>
                  </TabPanel>

                  {/* Limits Tab */}
                  <TabPanel>
                    <VStack align="stretch" spacing={4}>
                      <Box>
                        <Text fontWeight="medium" mb={2}>Extra Child Slots</Text>
                        <HStack>
                          <IconButton
                            aria-label="Decrease"
                            icon={<MinusIcon />}
                            size="sm"
                            onClick={() => setExtraChildSlots(Math.max(0, extraChildSlots - 1))}
                          />
                          <Input
                            type="number"
                            value={extraChildSlots}
                            onChange={(e) => setExtraChildSlots(parseInt(e.target.value) || 0)}
                            maxW="100px"
                            textAlign="center"
                          />
                          <IconButton
                            aria-label="Increase"
                            icon={<AddIcon />}
                            size="sm"
                            onClick={() => setExtraChildSlots(extraChildSlots + 1)}
                          />
                        </HStack>
                      </Box>
                      <Divider />
                      <Text fontSize="sm" color="gray.500">
                        Custom limits (storage, AI requests) can be set via the API
                      </Text>
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSave}
                isLoading={isSaving}
              >
                Save Changes
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </DashboardLayout>
  );
}
