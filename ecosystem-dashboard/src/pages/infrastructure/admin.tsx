/**
 * Platform Admin Page
 * 
 * Central control panel for platform administrators.
 * Manages tenants, users, global settings, and platform health.
 */

import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import {
  Box,
  Container,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  SimpleGrid,
  Badge,
  Button,
  IconButton,
  Spinner,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
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
  Input,
  Select,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
} from '@chakra-ui/react';
import {
  FiUsers,
  FiHome,
  FiActivity,
  FiShield,
  FiPlus,
  FiMoreVertical,
  FiEdit,
  FiTrash2,
  FiRefreshCw,
  FiDatabase,
  FiServer,
  FiCpu,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PlatformOverview {
  tenants: {
    total: number;
    active: number;
    suspended: number;
    pending: number;
    byTier: Record<string, number>;
  };
  users: {
    total: number;
    active: number;
    platformAdmins: number;
  };
  usage: {
    apiCallsLast30Days: number;
    tokensLast30Days: number;
  };
  recentActivity: Array<{
    action: string;
    resourceType: string;
    timestamp: string;
    userName: string;
    tenantName: string;
  }>;
  recentTenants: Array<{
    id: string;
    slug: string;
    name: string;
    tier: string;
    status: string;
    createdAt: string;
  }>;
}

interface Tenant {
  id: string;
  slug: string;
  name: string;
  description?: string;
  status: string;
  tier: string;
  ownerEmail: string;
  memberCount: number;
  createdAt: string;
}

const PlatformAdminPage: NextPage = () => {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    ownerEmail: '',
    tier: 'starter',
    description: '',
  });
  
  // Load overview data
  useEffect(() => {
    loadOverview();
  }, []);
  
  const loadOverview = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/platform/admin/overview');
      const data = await response.json();
      if (data.success) {
        setOverview(data.overview);
      }
    } catch (error) {
      console.error('Failed to load overview:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadTenants = async () => {
    setTenantsLoading(true);
    try {
      const response = await fetch('/api/platform/tenants');
      const data = await response.json();
      if (data.success) {
        setTenants(data.tenants);
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
    } finally {
      setTenantsLoading(false);
    }
  };
  
  const handleCreateTenant = async () => {
    if (!newTenant.name || !newTenant.slug || !newTenant.ownerEmail) {
      toast({
        title: 'Missing required fields',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    try {
      const response = await fetch('/api/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTenant),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Tenant created',
          description: `${data.tenant.name} has been created`,
          status: 'success',
          duration: 3000,
        });
        onCreateClose();
        setNewTenant({ name: '', slug: '', ownerEmail: '', tier: 'starter', description: '' });
        loadTenants();
        loadOverview();
      } else {
        toast({
          title: 'Failed to create tenant',
          description: data.error,
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error creating tenant',
        status: 'error',
        duration: 3000,
      });
    }
  };
  
  const handleTenantAction = async (tenantId: string, action: 'suspend' | 'activate' | 'archive') => {
    const statusMap = {
      suspend: 'suspended',
      activate: 'active',
      archive: 'archived',
    };
    
    try {
      const response = await fetch(`/api/platform/tenants/${tenantId}`, {
        method: action === 'archive' ? 'DELETE' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: action !== 'archive' ? JSON.stringify({ status: statusMap[action] }) : undefined,
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: `Tenant ${action}d`,
          status: 'success',
          duration: 2000,
        });
        loadTenants();
        loadOverview();
      }
    } catch (error) {
      toast({
        title: `Failed to ${action} tenant`,
        status: 'error',
        duration: 3000,
      });
    }
  };
  
  if (loading) {
    return (
      <DashboardLayout>
        <Box display="flex" justifyContent="center" alignItems="center" h="50vh">
          <VStack spacing={4}>
            <Spinner size="xl" />
            <Text>Loading platform data...</Text>
          </VStack>
        </Box>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <Head>
        <title>Platform Admin | AI Homelab</title>
      </Head>
      
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <Box>
              <HStack>
                <FiShield size={24} />
                <Heading size="lg">Platform Administration</Heading>
              </HStack>
              <Text color={textSecondary}>
                Manage tenants, users, and platform-wide settings
              </Text>
            </Box>
            <HStack spacing={2}>
              <Button
                leftIcon={<FiRefreshCw />}
                variant="outline"
                size="sm"
                onClick={() => { loadOverview(); loadTenants(); }}
              >
                Refresh
              </Button>
              <Button
                leftIcon={<FiPlus />}
                colorScheme="blue"
                size="sm"
                onClick={onCreateOpen}
              >
                New Tenant
              </Button>
            </HStack>
          </HStack>
          
          {/* Overview Stats */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <StatCard
              label="Total Tenants"
              value={overview?.tenants.total || 0}
              subtext={`${overview?.tenants.active || 0} active`}
              icon={FiHome}
              color="blue"
            />
            <StatCard
              label="Total Users"
              value={overview?.users.total || 0}
              subtext={`${overview?.users.platformAdmins || 0} admins`}
              icon={FiUsers}
              color="purple"
            />
            <StatCard
              label="API Calls (30d)"
              value={formatNumber(overview?.usage.apiCallsLast30Days || 0)}
              icon={FiServer}
              color="green"
            />
            <StatCard
              label="Tokens (30d)"
              value={formatNumber(overview?.usage.tokensLast30Days || 0)}
              icon={FiCpu}
              color="orange"
            />
          </SimpleGrid>
          
          {/* Tier Distribution */}
          <GlassPanel variant="light" p={4}>
            <Text fontWeight="semibold" mb={3}>Tenant Tiers</Text>
            <HStack spacing={4} flexWrap="wrap">
              <TierBadge tier="Free" count={overview?.tenants.byTier.free || 0} color="gray" />
              <TierBadge tier="Starter" count={overview?.tenants.byTier.starter || 0} color="blue" />
              <TierBadge tier="Pro" count={overview?.tenants.byTier.pro || 0} color="purple" />
              <TierBadge tier="Enterprise" count={overview?.tenants.byTier.enterprise || 0} color="gold" />
            </HStack>
          </GlassPanel>
          
          {/* Main Tabs */}
          <GlassPanel variant="light">
            <Tabs variant="enclosed" colorScheme="blue" onChange={(i) => i === 1 && loadTenants()}>
              <TabList>
                <Tab><HStack><FiActivity /><Text>Overview</Text></HStack></Tab>
                <Tab><HStack><FiHome /><Text>Tenants</Text></HStack></Tab>
                <Tab><HStack><FiUsers /><Text>Users</Text></HStack></Tab>
                <Tab><HStack><FiDatabase /><Text>Audit Log</Text></HStack></Tab>
              </TabList>
              
              <TabPanels>
                {/* Overview Tab */}
                <TabPanel>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Text fontWeight="semibold" mb={3}>Recent Activity</Text>
                      {overview?.recentActivity.length === 0 ? (
                        <Text color={textSecondary}>No recent activity</Text>
                      ) : (
                        <VStack align="stretch" spacing={2}>
                          {overview?.recentActivity.map((activity, idx) => (
                            <HStack key={idx} p={2} borderRadius="md" bg="gray.50" _dark={{ bg: 'gray.700' }}>
                              <Badge colorScheme={getActionColor(activity.action)}>{activity.action}</Badge>
                              <Text fontSize="sm" flex={1}>
                                {activity.userName || 'System'} 
                                {activity.tenantName && ` on ${activity.tenantName}`}
                              </Text>
                              <Text fontSize="xs" color={textSecondary}>
                                {new Date(activity.timestamp).toLocaleString()}
                              </Text>
                            </HStack>
                          ))}
                        </VStack>
                      )}
                    </Box>
                    
                    <Box>
                      <Text fontWeight="semibold" mb={3}>Recent Tenants</Text>
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                        {overview?.recentTenants.map((tenant) => (
                          <TenantCard key={tenant.id} tenant={tenant} />
                        ))}
                      </SimpleGrid>
                    </Box>
                  </VStack>
                </TabPanel>
                
                {/* Tenants Tab */}
                <TabPanel>
                  {tenantsLoading ? (
                    <Box textAlign="center" py={8}><Spinner /></Box>
                  ) : (
                    <TenantsTable 
                      tenants={tenants} 
                      onAction={handleTenantAction}
                    />
                  )}
                </TabPanel>
                
                {/* Users Tab */}
                <TabPanel>
                  <Text color={textSecondary}>User management coming soon...</Text>
                </TabPanel>
                
                {/* Audit Log Tab */}
                <TabPanel>
                  <Text color={textSecondary}>Audit log viewer coming soon...</Text>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </GlassPanel>
        </VStack>
      </Container>
      
      {/* Create Tenant Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Tenant</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Tenant Name</FormLabel>
                <Input
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  placeholder="Acme Corporation"
                />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Slug (URL identifier)</FormLabel>
                <Input
                  value={newTenant.slug}
                  onChange={(e) => setNewTenant({ 
                    ...newTenant, 
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                  })}
                  placeholder="acme-corp"
                />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Owner Email</FormLabel>
                <Input
                  type="email"
                  value={newTenant.ownerEmail}
                  onChange={(e) => setNewTenant({ ...newTenant, ownerEmail: e.target.value })}
                  placeholder="admin@acme.com"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Tier</FormLabel>
                <Select
                  value={newTenant.tier}
                  onChange={(e) => setNewTenant({ ...newTenant, tier: e.target.value })}
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={newTenant.description}
                  onChange={(e) => setNewTenant({ ...newTenant, description: e.target.value })}
                  placeholder="Optional description"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateTenant}>
              Create Tenant
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
};

// Helper Components

function StatCard({ label, value, subtext, icon: Icon, color }: {
  label: string;
  value: number | string;
  subtext?: string;
  icon: any;
  color: string;
}) {
  return (
    <GlassPanel variant="light" p={4}>
      <HStack justify="space-between">
        <Stat size="sm">
          <StatLabel color="gray.500">{label}</StatLabel>
          <StatNumber fontSize="2xl">{value}</StatNumber>
          {subtext && <StatHelpText>{subtext}</StatHelpText>}
        </Stat>
        <Box p={2} borderRadius="md" bg={`${color}.100`} color={`${color}.600`}>
          <Icon size={24} />
        </Box>
      </HStack>
    </GlassPanel>
  );
}

function TierBadge({ tier, count, color }: { tier: string; count: number; color: string }) {
  return (
    <HStack>
      <Badge colorScheme={color}>{tier}</Badge>
      <Text fontWeight="bold">{count}</Text>
    </HStack>
  );
}

function TenantCard({ tenant }: { tenant: any }) {
  const statusColors: Record<string, string> = {
    active: 'green',
    suspended: 'red',
    pending: 'yellow',
    archived: 'gray',
  };
  
  const tierColors: Record<string, string> = {
    free: 'gray',
    starter: 'blue',
    pro: 'purple',
    enterprise: 'yellow',
  };
  
  return (
    <Box p={4} borderRadius="md" border="1px" borderColor="gray.200" _dark={{ borderColor: 'gray.600' }}>
      <HStack justify="space-between" mb={2}>
        <Text fontWeight="medium">{tenant.name}</Text>
        <Badge colorScheme={statusColors[tenant.status]}>{tenant.status}</Badge>
      </HStack>
      <HStack spacing={2}>
        <Badge size="sm" variant="outline">{tenant.slug}</Badge>
        <Badge size="sm" colorScheme={tierColors[tenant.tier]}>{tenant.tier}</Badge>
      </HStack>
    </Box>
  );
}

function TenantsTable({ tenants, onAction }: { tenants: Tenant[]; onAction: (id: string, action: any) => void }) {
  const statusColors: Record<string, string> = {
    active: 'green',
    suspended: 'red',
    pending: 'yellow',
    archived: 'gray',
  };
  
  return (
    <Box overflowX="auto">
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th>Tenant</Th>
            <Th>Slug</Th>
            <Th>Tier</Th>
            <Th>Status</Th>
            <Th>Members</Th>
            <Th>Created</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {tenants.map((tenant) => (
            <Tr key={tenant.id}>
              <Td>
                <VStack align="start" spacing={0}>
                  <Text fontWeight="medium">{tenant.name}</Text>
                  <Text fontSize="xs" color="gray.500">{tenant.ownerEmail}</Text>
                </VStack>
              </Td>
              <Td><Badge variant="outline">{tenant.slug}</Badge></Td>
              <Td><Badge>{tenant.tier}</Badge></Td>
              <Td><Badge colorScheme={statusColors[tenant.status]}>{tenant.status}</Badge></Td>
              <Td>{tenant.memberCount}</Td>
              <Td>{new Date(tenant.createdAt).toLocaleDateString()}</Td>
              <Td>
                <Menu>
                  <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" size="sm" />
                  <MenuList>
                    <MenuItem icon={<FiEdit />}>Edit</MenuItem>
                    {tenant.status === 'active' ? (
                      <MenuItem icon={<FiShield />} onClick={() => onAction(tenant.id, 'suspend')}>
                        Suspend
                      </MenuItem>
                    ) : (
                      <MenuItem icon={<FiShield />} onClick={() => onAction(tenant.id, 'activate')}>
                        Activate
                      </MenuItem>
                    )}
                    <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => onAction(tenant.id, 'archive')}>
                      Archive
                    </MenuItem>
                  </MenuList>
                </Menu>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getActionColor(action: string): string {
  if (action.includes('create')) return 'green';
  if (action.includes('delete') || action.includes('archive')) return 'red';
  if (action.includes('update')) return 'blue';
  return 'gray';
}

export default PlatformAdminPage;
