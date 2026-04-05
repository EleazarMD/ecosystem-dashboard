/**
 * User Management Page
 * 
 * Platform admin page to manage all users
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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
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
} from '@chakra-ui/react';
import { FiSearch, FiMoreVertical, FiShield, FiUser, FiUserX, FiRefreshCw, FiEye } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAuth } from '@/context/AuthContext';
import { withPlatformAdmin } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  platform_role: string;
  status: string;
  created_at: string;
  tenant_count: number;
}

function UserManagementPage() {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const { user: currentUser } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');
  
  // Right panel integration
  const { setIsOpen: setRightPanelOpen, setCustomData, setContext } = useRightPanel();
  
  // Set context on mount
  useEffect(() => {
    setContext('admin-users');
  }, [setContext]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setUsers(data.users);
        setTotal(data.total);
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to fetch users', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditRole(user.platform_role);
    setEditStatus(user.status);
    onOpen();
  };

  const handleViewProfile = (userId: string) => {
    setCustomData({ 
      selectedUserId: userId,
      onUpdate: fetchUsers 
    });
    setRightPanelOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          platformRole: editRole,
          status: editStatus,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: 'User updated', status: 'success' });
        fetchUsers();
        onClose();
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to update user', status: 'error' });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'platform-admin':
        return <Badge colorScheme="orange"><HStack spacing={1}><FiShield size={12} /><Text>Admin</Text></HStack></Badge>;
      default:
        return <Badge colorScheme="gray"><HStack spacing={1}><FiUser size={12} /><Text>User</Text></HStack></Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge colorScheme="green">Active</Badge>;
      case 'suspended':
        return <Badge colorScheme="red">Suspended</Badge>;
      case 'pending':
        return <Badge colorScheme="yellow">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <Box>
              <Heading size="lg">User Management</Heading>
              <Text color={textSecondary}>
                Manage platform users and their roles ({total} users)
              </Text>
            </Box>
            <Button leftIcon={<FiRefreshCw />} onClick={fetchUsers} isLoading={loading}>
              Refresh
            </Button>
          </HStack>

          {/* Search */}
          <GlassPanel variant="light" p={4}>
            <InputGroup maxW="400px">
              <InputLeftElement>
                <FiSearch color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
          </GlassPanel>

          {/* Users Table */}
          <GlassPanel variant="light" p={0} overflow="hidden">
            {loading ? (
              <Box p={8} textAlign="center">
                <Spinner size="lg" />
              </Box>
            ) : users.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                No users found
              </Alert>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>User</Th>
                    <Th>Role</Th>
                    <Th>Status</Th>
                    <Th>Workspaces</Th>
                    <Th>Joined</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {users.map((user) => (
                    <Tr 
                      key={user.id}
                      onClick={() => handleViewProfile(user.id)}
                      cursor="pointer"
                      _hover={{ bg: 'whiteAlpha.100' }}
                      transition="background 0.2s"
                    >
                      <Td>
                        <HStack spacing={3}>
                          <Avatar size="sm" name={user.name} src={user.avatar_url} />
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="medium">{user.name || 'Unnamed'}</Text>
                            <Text fontSize="sm" color={textSecondary}>{user.email}</Text>
                          </VStack>
                        </HStack>
                      </Td>
                      <Td>{getRoleBadge(user.platform_role)}</Td>
                      <Td>{getStatusBadge(user.status)}</Td>
                      <Td>{user.tenant_count}</Td>
                      <Td>{new Date(user.created_at).toLocaleDateString()}</Td>
                      <Td onClick={(e) => e.stopPropagation()}>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<FiMoreVertical />}
                            variant="ghost"
                            size="sm"
                            isDisabled={user.id === currentUser?.id}
                          />
                          <MenuList>
                            <MenuItem icon={<FiEye />} onClick={() => handleViewProfile(user.id)}>
                              View Profile
                            </MenuItem>
                            <MenuItem icon={<FiUser />} onClick={() => handleEditUser(user)}>
                              Edit User
                            </MenuItem>
                            {user.status === 'active' ? (
                              <MenuItem 
                                icon={<FiUserX />} 
                                color="red.500"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditRole(user.platform_role);
                                  setEditStatus('suspended');
                                  handleSaveUser();
                                }}
                              >
                                Suspend User
                              </MenuItem>
                            ) : (
                              <MenuItem 
                                icon={<FiUser />}
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditRole(user.platform_role);
                                  setEditStatus('active');
                                  handleSaveUser();
                                }}
                              >
                                Activate User
                              </MenuItem>
                            )}
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </GlassPanel>
        </VStack>
      </Container>

      {/* Edit User Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedUser && (
              <VStack spacing={4} align="stretch">
                <HStack spacing={3}>
                  <Avatar size="md" name={selectedUser.name} src={selectedUser.avatar_url} />
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="medium">{selectedUser.name}</Text>
                    <Text fontSize="sm" color={textSecondary}>{selectedUser.email}</Text>
                  </VStack>
                </HStack>

                <FormControl>
                  <FormLabel>Platform Role</FormLabel>
                  <Select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                    <option value="user">User</option>
                    <option value="platform-admin">Platform Admin</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Status</FormLabel>
                  <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </Select>
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSaveUser}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default withPlatformAdmin(UserManagementPage);
