/**
 * FamilySharingPanel - Family calendar sharing management
 * 
 * Allows users to:
 * - Create and manage family groups
 * - Invite family members
 * - Set calendar sharing permissions
 * - View shared family calendars
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Icon,
  Avatar,
  AvatarGroup,
  Badge,
  Input,
  Select,
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  Spacer,
} from '@chakra-ui/react';
import {
  FiUsers,
  FiPlus,
  FiMail,
  FiEdit2,
  FiTrash2,
  FiMoreVertical,
  FiCheck,
  FiX,
  FiEye,
  FiEdit,
  FiUserPlus,
  FiSettings,
} from 'react-icons/fi';

// ============================================
// TYPES
// ============================================

interface FamilyMember {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'inactive';
  joined_at?: string;
  avatar_url?: string;
}

interface FamilyGroup {
  id: string;
  name: string;
  created_by: string;
  members: FamilyMember[];
  shared_calendars: Array<{
    calendar_id: string;
    calendar_name: string;
    permission: 'view' | 'edit' | 'manage';
  }>;
  created_at: string;
}

interface SharingRule {
  id: string;
  calendar_id: string;
  calendar_name: string;
  shared_with_type: 'user' | 'family_group' | 'work_org';
  shared_with_id: string;
  shared_with_name: string;
  permission: 'view' | 'edit' | 'manage';
}

// ============================================
// MAIN COMPONENT
// ============================================

export function FamilySharingPanel() {
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [sharingRules, setSharingRules] = useState<SharingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<FamilyGroup | null>(null);
  
  // New group form
  const [newGroupName, setNewGroupName] = useState('');
  
  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  
  // Modals
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isInviteOpen, onOpen: onInviteOpen, onClose: onInviteClose } = useDisclosure();
  const { isOpen: isManageOpen, onOpen: onManageOpen, onClose: onManageClose } = useDisclosure();
  
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchFamilyGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/family-groups');
      if (response.ok) {
        const data = await response.json();
        setFamilyGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Failed to fetch family groups:', error);
    }
  }, []);

  const fetchSharingRules = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/sharing-rules');
      if (response.ok) {
        const data = await response.json();
        setSharingRules(data.rules || []);
      }
    } catch (error) {
      console.error('Failed to fetch sharing rules:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchFamilyGroups(), fetchSharingRules()]);
      setLoading(false);
    };
    loadData();
  }, [fetchFamilyGroups, fetchSharingRules]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: 'Please enter a group name',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      const response = await fetch('/api/calendar/family-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName }),
      });

      if (response.ok) {
        toast({
          title: 'Family group created',
          status: 'success',
          duration: 3000,
        });
        onCreateClose();
        setNewGroupName('');
        fetchFamilyGroups();
      } else {
        const error = await response.json();
        toast({
          title: 'Failed to create group',
          description: error.error,
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error creating group',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleInviteMember = async () => {
    if (!selectedGroup || !inviteEmail.trim()) {
      toast({
        title: 'Please enter an email address',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      const response = await fetch(`/api/calendar/family-groups/${selectedGroup.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Invitation sent',
          description: `Invited ${inviteEmail} to ${selectedGroup.name}`,
          status: 'success',
          duration: 3000,
        });
        onInviteClose();
        setInviteEmail('');
        setInviteRole('member');
        fetchFamilyGroups();
      } else {
        const error = await response.json();
        toast({
          title: 'Failed to send invitation',
          description: error.error,
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error sending invitation',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleRemoveMember = async (groupId: string, memberId: string) => {
    try {
      const response = await fetch(`/api/calendar/family-groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Member removed',
          status: 'success',
          duration: 3000,
        });
        fetchFamilyGroups();
      }
    } catch (error) {
      toast({
        title: 'Failed to remove member',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/calendar/family-groups/${groupId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Family group deleted',
          status: 'success',
          duration: 3000,
        });
        fetchFamilyGroups();
      }
    } catch (error) {
      toast({
        title: 'Failed to delete group',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'purple';
      case 'admin':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'pending':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'view':
        return FiEye;
      case 'edit':
        return FiEdit;
      case 'manage':
        return FiSettings;
      default:
        return FiEye;
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" h="200px">
        <Spinner size="lg" />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <HStack justify="space-between" mb={6}>
        <HStack>
          <Icon as={FiUsers} boxSize={6} color="blue.500" />
          <Text fontSize="lg" fontWeight="bold">Family Sharing</Text>
        </HStack>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="blue"
          size="sm"
          onClick={onCreateOpen}
        >
          Create Group
        </Button>
      </HStack>

      {/* Family Groups */}
      {familyGroups.length === 0 ? (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="medium">No family groups yet</Text>
            <Text fontSize="sm">Create a family group to share calendars with your loved ones.</Text>
          </Box>
        </Alert>
      ) : (
        <VStack align="stretch" spacing={4}>
          {familyGroups.map((group) => (
            <Box
              key={group.id}
              p={4}
              bg={bgColor}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="lg"
            >
              <HStack justify="space-between" mb={3}>
                <HStack>
                  <Icon as={FiUsers} color="blue.500" />
                  <Text fontWeight="medium">{group.name}</Text>
                  <Badge colorScheme="blue">{group.members.length} members</Badge>
                </HStack>
                <Menu>
                  <MenuButton
                    as={IconButton}
                    icon={<FiMoreVertical />}
                    variant="ghost"
                    size="sm"
                  />
                  <MenuList>
                    <MenuItem
                      icon={<FiUserPlus />}
                      onClick={() => {
                        setSelectedGroup(group);
                        onInviteOpen();
                      }}
                    >
                      Invite Member
                    </MenuItem>
                    <MenuItem
                      icon={<FiSettings />}
                      onClick={() => {
                        setSelectedGroup(group);
                        onManageOpen();
                      }}
                    >
                      Manage Group
                    </MenuItem>
                    <Divider />
                    <MenuItem
                      icon={<FiTrash2 />}
                      color="red.500"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      Delete Group
                    </MenuItem>
                  </MenuList>
                </Menu>
              </HStack>

              {/* Members */}
              <HStack spacing={2} mb={3}>
                <AvatarGroup size="sm" max={5}>
                  {group.members.map((member) => (
                    <Tooltip key={member.id} label={`${member.name || member.email} (${member.role})`}>
                      <Avatar
                        name={member.name || member.email}
                        src={member.avatar_url}
                        size="sm"
                      />
                    </Tooltip>
                  ))}
                </AvatarGroup>
                <Button
                  size="xs"
                  variant="ghost"
                  leftIcon={<FiUserPlus />}
                  onClick={() => {
                    setSelectedGroup(group);
                    onInviteOpen();
                  }}
                >
                  Add
                </Button>
              </HStack>

              {/* Shared Calendars */}
              {group.shared_calendars.length > 0 && (
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={1}>Shared Calendars</Text>
                  <HStack spacing={2} flexWrap="wrap">
                    {group.shared_calendars.map((cal) => (
                      <Badge
                        key={cal.calendar_id}
                        variant="subtle"
                        colorScheme="green"
                        display="flex"
                        alignItems="center"
                        gap={1}
                      >
                        <Icon as={getPermissionIcon(cal.permission)} boxSize={3} />
                        {cal.calendar_name}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              )}
            </Box>
          ))}
        </VStack>
      )}

      {/* Sharing Rules Summary */}
      {sharingRules.length > 0 && (
        <Box mt={6}>
          <Text fontSize="sm" fontWeight="medium" mb={3}>Active Sharing Rules</Text>
          <VStack align="stretch" spacing={2}>
            {sharingRules.slice(0, 5).map((rule) => (
              <HStack
                key={rule.id}
                p={2}
                bg={bgColor}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="md"
                fontSize="sm"
              >
                <Text fontWeight="medium">{rule.calendar_name}</Text>
                <Icon as={FiUsers} color="gray.400" />
                <Text color="gray.500">{rule.shared_with_name}</Text>
                <Spacer />
                <Badge variant="outline" colorScheme="blue">
                  <Icon as={getPermissionIcon(rule.permission)} mr={1} />
                  {rule.permission}
                </Badge>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}

      {/* Create Group Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Family Group</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Group Name</FormLabel>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Smith Family"
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateGroup}>
              Create Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Invite Member Modal */}
      <Modal isOpen={isInviteOpen} onClose={onInviteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Invite to {selectedGroup?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Email Address</FormLabel>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="family@example.com"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Role</FormLabel>
                <Select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                >
                  <option value="member">Member - Can view shared calendars</option>
                  <option value="admin">Admin - Can manage group and calendars</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onInviteClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" leftIcon={<FiMail />} onClick={handleInviteMember}>
              Send Invitation
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Manage Group Modal */}
      <Modal isOpen={isManageOpen} onClose={onManageClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Manage {selectedGroup?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedGroup && (
              <VStack align="stretch" spacing={4}>
                <Text fontWeight="medium">Members</Text>
                {selectedGroup.members.map((member) => (
                  <HStack
                    key={member.id}
                    p={3}
                    border="1px solid"
                    borderColor={borderColor}
                    borderRadius="md"
                    justify="space-between"
                  >
                    <HStack>
                      <Avatar name={member.name || member.email} size="sm" />
                      <Box>
                        <Text fontWeight="medium">{member.name || member.email}</Text>
                        <Text fontSize="xs" color="gray.500">{member.email}</Text>
                      </Box>
                    </HStack>
                    <HStack>
                      <Badge colorScheme={getRoleBadgeColor(member.role)}>
                        {member.role}
                      </Badge>
                      <Badge colorScheme={getStatusBadgeColor(member.status)}>
                        {member.status}
                      </Badge>
                      {member.role !== 'owner' && (
                        <IconButton
                          aria-label="Remove member"
                          icon={<FiTrash2 />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleRemoveMember(selectedGroup.id, member.id)}
                        />
                      )}
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onManageClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default FamilySharingPanel;
