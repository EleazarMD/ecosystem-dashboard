/**
 * Tenant Management Page
 * 
 * Platform admin page to manage workspaces/tenants
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
  Badge,
  Button,
  IconButton,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Textarea,
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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Avatar,
  Select,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiUsers, 
  FiSettings, 
  FiMoreVertical, 
  FiUserPlus, 
  FiTrash2,
  FiRefreshCw,
  FiMail,
  FiCopy,
  FiSend,
  FiKey,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { withPlatformAdmin } from '@/lib/auth';
import { TenantAIGatewayTab } from '@/components/admin/TenantAIGatewayTab';
import { OnboardingWizardModal } from '@/components/onboarding';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  member_count: number;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role_id: string;
  status: string;
}

interface Invitation {
  id: string;
  email: string;
  role_id: string;
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
  invited_by_name?: string;
  invited_by_email?: string;
}

function TenantManagementPage() {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  
  // Create tenant modal
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  
  // Full onboarding wizard modal
  const { isOpen: isOnboardOpen, onOpen: onOnboardOpen, onClose: onOnboardClose } = useDisclosure();
  const [newTenant, setNewTenant] = useState({ name: '', slug: '', description: '' });
  const [creating, setCreating] = useState(false);
  
  // Add member modal
  const { isOpen: isAddMemberOpen, onOpen: onAddMemberOpen, onClose: onAddMemberClose } = useDisclosure();
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('tenant-member');
  const [addingMember, setAddingMember] = useState(false);

  // Invitations state
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  
  // Invite modal
  const { isOpen: isInviteOpen, onOpen: onInviteOpen, onClose: onInviteClose } = useDisclosure();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('tenant-member');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState('');

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tenants');
      const data = await res.json();
      
      if (res.ok) {
        setTenants(data.tenants);
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to fetch tenants', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (tenantId: string) => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/members`);
      const data = await res.json();
      
      if (res.ok) {
        setMembers(data.members);
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to fetch members', status: 'error' });
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchInvitations = async (tenantId: string) => {
    setInvitationsLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/invitations`);
      const data = await res.json();
      
      if (res.ok) {
        setInvitations(data.invitations);
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to fetch invitations', status: 'error' });
    } finally {
      setInvitationsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      fetchMembers(selectedTenant.id);
      fetchInvitations(selectedTenant.id);
    }
  }, [selectedTenant]);

  const handleCreateTenant = async () => {
    if (!newTenant.name || !newTenant.slug) {
      toast({ title: 'Name and slug are required', status: 'warning' });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTenant),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: 'Workspace created', status: 'success' });
        fetchTenants();
        onCreateClose();
        setNewTenant({ name: '', slug: '', description: '' });
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to create workspace', status: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedTenant || !newMemberEmail) {
      toast({ title: 'Email is required', status: 'warning' });
      return;
    }

    setAddingMember(true);
    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenant.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newMemberEmail, roleId: newMemberRole }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: 'Member added', status: 'success' });
        fetchMembers(selectedTenant.id);
        fetchTenants();
        onAddMemberClose();
        setNewMemberEmail('');
        setNewMemberRole('tenant-member');
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to add member', status: 'error' });
    } finally {
      setAddingMember(false);
    }
  };

  const handleUpdateMemberRole = async (userId: string, roleId: string) => {
    if (!selectedTenant) return;

    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenant.id}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roleId }),
      });

      if (res.ok) {
        toast({ title: 'Role updated', status: 'success' });
        fetchMembers(selectedTenant.id);
      } else {
        const data = await res.json();
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to update role', status: 'error' });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTenant) return;

    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenant.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        toast({ title: 'Member removed', status: 'success' });
        fetchMembers(selectedTenant.id);
        fetchTenants();
      } else {
        const data = await res.json();
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to remove member', status: 'error' });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'tenant-admin':
        return <Badge colorScheme="purple">Admin</Badge>;
      case 'tenant-member':
        return <Badge colorScheme="blue">Member</Badge>;
      case 'tenant-viewer':
        return <Badge colorScheme="gray">Viewer</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  const handleSendInvite = async () => {
    if (!selectedTenant || !inviteEmail) {
      toast({ title: 'Email is required', status: 'warning' });
      return;
    }

    setSendingInvite(true);
    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenant.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, roleId: inviteRole }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: 'Invitation sent', status: 'success' });
        setLastInviteUrl(data.inviteUrl);
        fetchInvitations(selectedTenant.id);
        setInviteEmail('');
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to send invitation', status: 'error' });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!selectedTenant) return;

    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenant.id}/invitations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      });

      if (res.ok) {
        toast({ title: 'Invitation revoked', status: 'success' });
        fetchInvitations(selectedTenant.id);
      } else {
        const data = await res.json();
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to revoke invitation', status: 'error' });
    }
  };

  const copyInviteUrl = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Invite link copied!', status: 'success', duration: 2000 });
  };

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <Box>
              <Heading size="lg">Workspace Management</Heading>
              <Text color={textSecondary}>
                Manage workspaces and their members
              </Text>
            </Box>
            <HStack>
              <Button leftIcon={<FiRefreshCw />} onClick={fetchTenants} isLoading={loading}>
                Refresh
              </Button>
              <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={onCreateOpen}>
                New Workspace
              </Button>
              <Button leftIcon={<FiUserPlus />} colorScheme="green" onClick={onOnboardOpen}>
                Onboard New User
              </Button>
            </HStack>
          </HStack>

          {/* Main Content */}
          <HStack align="start" spacing={6}>
            {/* Tenants List */}
            <GlassPanel variant="light" p={4} minW="300px" maxW="350px">
              <VStack spacing={3} align="stretch">
                <Text fontWeight="semibold" fontSize="sm" color={textSecondary}>
                  WORKSPACES ({tenants.length})
                </Text>
                
                {loading ? (
                  <Box textAlign="center" py={4}>
                    <Spinner />
                  </Box>
                ) : tenants.length === 0 ? (
                  <Text color={textSecondary} fontSize="sm">No workspaces yet</Text>
                ) : (
                  tenants.map((tenant) => (
                    <Box
                      key={tenant.id}
                      p={3}
                      borderRadius="md"
                      cursor="pointer"
                      bg={selectedTenant?.id === tenant.id ? 'blue.50' : 'transparent'}
                      _dark={{ bg: selectedTenant?.id === tenant.id ? 'blue.900' : 'transparent' }}
                      _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}
                      onClick={() => setSelectedTenant(tenant)}
                      border="1px solid"
                      borderColor={selectedTenant?.id === tenant.id ? 'blue.200' : 'transparent'}
                    >
                      <HStack justify="space-between">
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium">{tenant.name}</Text>
                          <Text fontSize="xs" color={textSecondary}>/{tenant.slug}</Text>
                        </VStack>
                        <Badge colorScheme="gray">{tenant.member_count}</Badge>
                      </HStack>
                    </Box>
                  ))
                )}
              </VStack>
            </GlassPanel>

            {/* Tenant Details */}
            <GlassPanel variant="light" p={0} flex={1} overflow="hidden">
              {selectedTenant ? (
                <Tabs>
                  <TabList px={4}>
                    <Tab><HStack><FiUsers /><Text>Members</Text></HStack></Tab>
                    <Tab><HStack><FiMail /><Text>Invitations</Text>{invitations.length > 0 && <Badge colorScheme="orange" ml={1}>{invitations.length}</Badge>}</HStack></Tab>
                    <Tab><HStack><FiKey /><Text>AI Gateway</Text></HStack></Tab>
                    <Tab><HStack><FiSettings /><Text>Settings</Text></HStack></Tab>
                  </TabList>

                  <TabPanels>
                    {/* Members Tab */}
                    <TabPanel>
                      <VStack spacing={4} align="stretch">
                        <HStack justify="space-between">
                          <Text fontWeight="semibold">
                            Members ({members.length})
                          </Text>
                          <Button 
                            size="sm" 
                            leftIcon={<FiUserPlus />} 
                            colorScheme="blue"
                            onClick={onAddMemberOpen}
                          >
                            Add Member
                          </Button>
                        </HStack>

                        {membersLoading ? (
                          <Box textAlign="center" py={4}>
                            <Spinner />
                          </Box>
                        ) : members.length === 0 ? (
                          <Alert status="info">
                            <AlertIcon />
                            No members yet. Add someone to get started.
                          </Alert>
                        ) : (
                          <Table variant="simple" size="sm">
                            <Thead>
                              <Tr>
                                <Th>User</Th>
                                <Th>Role</Th>
                                <Th>Status</Th>
                                <Th></Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {members.map((member) => (
                                <Tr key={member.id}>
                                  <Td>
                                    <HStack spacing={2}>
                                      <Avatar size="xs" name={member.name} src={member.avatar_url} />
                                      <VStack align="start" spacing={0}>
                                        <Text fontSize="sm">{member.name || 'Unnamed'}</Text>
                                        <Text fontSize="xs" color={textSecondary}>{member.email}</Text>
                                      </VStack>
                                    </HStack>
                                  </Td>
                                  <Td>{getRoleBadge(member.role_id)}</Td>
                                  <Td>
                                    <Badge colorScheme={member.status === 'active' ? 'green' : 'yellow'}>
                                      {member.status}
                                    </Badge>
                                  </Td>
                                  <Td>
                                    <Menu>
                                      <MenuButton
                                        as={IconButton}
                                        icon={<FiMoreVertical />}
                                        variant="ghost"
                                        size="xs"
                                      />
                                      <MenuList>
                                        <MenuItem onClick={() => handleUpdateMemberRole(member.user_id, 'tenant-admin')}>
                                          Make Admin
                                        </MenuItem>
                                        <MenuItem onClick={() => handleUpdateMemberRole(member.user_id, 'tenant-member')}>
                                          Make Member
                                        </MenuItem>
                                        <MenuItem onClick={() => handleUpdateMemberRole(member.user_id, 'tenant-viewer')}>
                                          Make Viewer
                                        </MenuItem>
                                        <MenuItem 
                                          icon={<FiTrash2 />} 
                                          color="red.500"
                                          onClick={() => handleRemoveMember(member.user_id)}
                                        >
                                          Remove
                                        </MenuItem>
                                      </MenuList>
                                    </Menu>
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        )}
                      </VStack>
                    </TabPanel>

                    {/* Invitations Tab */}
                    <TabPanel>
                      <VStack spacing={4} align="stretch">
                        <HStack justify="space-between">
                          <Text fontWeight="semibold">
                            Pending Invitations ({invitations.length})
                          </Text>
                          <Button 
                            size="sm" 
                            leftIcon={<FiSend />} 
                            colorScheme="orange"
                            onClick={onInviteOpen}
                          >
                            Send Invite
                          </Button>
                        </HStack>

                        {invitationsLoading ? (
                          <Box textAlign="center" py={4}>
                            <Spinner />
                          </Box>
                        ) : invitations.length === 0 ? (
                          <Alert status="info">
                            <AlertIcon />
                            No pending invitations. Send an invite to add new members.
                          </Alert>
                        ) : (
                          <Table variant="simple" size="sm">
                            <Thead>
                              <Tr>
                                <Th>Email</Th>
                                <Th>Role</Th>
                                <Th>Expires</Th>
                                <Th></Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {invitations.map((invitation) => (
                                <Tr key={invitation.id}>
                                  <Td>
                                    <Text fontSize="sm">{invitation.email}</Text>
                                  </Td>
                                  <Td>{getRoleBadge(invitation.role_id)}</Td>
                                  <Td>
                                    <Text fontSize="xs" color={textSecondary}>
                                      {new Date(invitation.expires_at).toLocaleDateString()}
                                    </Text>
                                  </Td>
                                  <Td>
                                    <HStack spacing={1}>
                                      <IconButton
                                        aria-label="Copy invite link"
                                        icon={<FiCopy />}
                                        size="xs"
                                        variant="ghost"
                                        onClick={() => copyInviteUrl(invitation.token)}
                                      />
                                      <IconButton
                                        aria-label="Revoke invitation"
                                        icon={<FiTrash2 />}
                                        size="xs"
                                        variant="ghost"
                                        colorScheme="red"
                                        onClick={() => handleRevokeInvitation(invitation.id)}
                                      />
                                    </HStack>
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        )}
                      </VStack>
                    </TabPanel>

                    {/* AI Gateway Tab */}
                    <TabPanel>
                      <TenantAIGatewayTab
                        tenantId={selectedTenant.id}
                        tenantSlug={selectedTenant.slug}
                        tenantName={selectedTenant.name}
                      />
                    </TabPanel>

                    {/* Settings Tab */}
                    <TabPanel>
                      <VStack spacing={4} align="stretch">
                        <FormControl>
                          <FormLabel>Workspace Name</FormLabel>
                          <Input value={selectedTenant.name} isReadOnly />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Slug</FormLabel>
                          <Input value={selectedTenant.slug} isReadOnly />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Description</FormLabel>
                          <Textarea value={selectedTenant.description || ''} isReadOnly />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Created</FormLabel>
                          <Input value={new Date(selectedTenant.created_at).toLocaleString()} isReadOnly />
                        </FormControl>
                      </VStack>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              ) : (
                <Box p={8} textAlign="center">
                  <Text color={textSecondary}>Select a workspace to view details</Text>
                </Box>
              )}
            </GlassPanel>
          </HStack>
        </VStack>
      </Container>

      {/* Create Tenant Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Workspace</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  placeholder="My Workspace"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Slug</FormLabel>
                <Input
                  value={newTenant.slug}
                  onChange={(e) => setNewTenant({ 
                    ...newTenant, 
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                  })}
                  placeholder="my-workspace"
                />
                <FormHelperText>URL-friendly identifier (lowercase, hyphens only)</FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={newTenant.description}
                  onChange={(e) => setNewTenant({ ...newTenant, description: e.target.value })}
                  placeholder="Optional description..."
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateTenant} isLoading={creating}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={isAddMemberOpen} onClose={onAddMemberClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Member to {selectedTenant?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="user@example.com"
                />
                <FormHelperText>User must have an existing account</FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel>Role</FormLabel>
                <Select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)}>
                  <option value="tenant-admin">Admin</option>
                  <option value="tenant-member">Member</option>
                  <option value="tenant-viewer">Viewer</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddMemberClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleAddMember} isLoading={addingMember}>
              Add Member
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Full Onboarding Wizard Modal */}
      <OnboardingWizardModal
        isOpen={isOnboardOpen}
        onClose={onOnboardClose}
        existingTenantId={selectedTenant?.id}
        onComplete={(response) => {
          fetchTenants();
          toast({
            title: `User onboarded to ${response.tenantSlug}`,
            description: `Tenant ID: ${response.tenantId}`,
            status: 'success',
            duration: 5000,
          });
        }}
      />

      {/* Send Invite Modal */}
      <Modal isOpen={isInviteOpen} onClose={() => { onInviteClose(); setLastInviteUrl(''); }}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Invite to {selectedTenant?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {lastInviteUrl ? (
                <>
                  <Alert status="success">
                    <AlertIcon />
                    Invitation created! Share this link:
                  </Alert>
                  <Box w="100%" p={3} bg="gray.100" _dark={{ bg: 'gray.700' }} borderRadius="md">
                    <Text fontSize="sm" wordBreak="break-all">{lastInviteUrl}</Text>
                  </Box>
                  <Button 
                    leftIcon={<FiCopy />} 
                    onClick={() => {
                      navigator.clipboard.writeText(lastInviteUrl);
                      toast({ title: 'Link copied!', status: 'success', duration: 2000 });
                    }}
                  >
                    Copy Link
                  </Button>
                </>
              ) : (
                <>
                  <FormControl isRequired>
                    <FormLabel>Email Address</FormLabel>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                    <FormHelperText>They'll receive a link to join this workspace</FormHelperText>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Role</FormLabel>
                    <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                      <option value="tenant-admin">Admin</option>
                      <option value="tenant-member">Member</option>
                      <option value="tenant-viewer">Viewer</option>
                    </Select>
                  </FormControl>
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => { onInviteClose(); setLastInviteUrl(''); }}>
              {lastInviteUrl ? 'Done' : 'Cancel'}
            </Button>
            {!lastInviteUrl && (
              <Button colorScheme="orange" onClick={handleSendInvite} isLoading={sendingInvite}>
                Send Invitation
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default withPlatformAdmin(TenantManagementPage);
