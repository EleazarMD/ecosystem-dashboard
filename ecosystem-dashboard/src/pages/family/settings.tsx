/**
 * Family Settings Page
 * 
 * Manage family name, members, invitations, and transfer organizer role
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Icon,
  Badge,
  Avatar,
  Spinner,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Alert,
  AlertIcon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Divider,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import {
  FiSettings,
  FiUsers,
  FiUserPlus,
  FiUserMinus,
  FiEdit2,
  FiMoreVertical,
  FiShield,
  FiMail,
  FiClock,
  FiX,
  FiCheck,
  FiArrowLeft,
  FiRefreshCw,
} from 'react-icons/fi';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface FamilyMember {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  accountType: string;
  roleId: string;
  joinedAt: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  roleId: string;
  status: string;
  invitedAt: string;
  expiresAt: string;
  invitedByName: string;
}

interface FamilySettings {
  family: {
    id: string;
    name: string;
  };
  members: FamilyMember[];
  pendingInvitations: PendingInvitation[];
  isOrganizer: boolean;
}

export default function FamilySettingsPage() {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  
  const [settings, setSettings] = useState<FamilySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [familyName, setFamilyName] = useState('');
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  
  const { isOpen: isRenameOpen, onOpen: onRenameOpen, onClose: onRenameClose } = useDisclosure();
  const { isOpen: isTransferOpen, onOpen: onTransferOpen, onClose: onTransferClose } = useDisclosure();
  const { isOpen: isRemoveOpen, onOpen: onRemoveOpen, onClose: onRemoveClose } = useDisclosure();

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/family/settings');
      const data = await res.json();
      
      if (res.ok) {
        setSettings(data);
        setFamilyName(data.family.name);
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to load settings', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleRename = async () => {
    if (!familyName.trim()) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/family/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: familyName }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: 'Family name updated', status: 'success' });
        onRenameClose();
        fetchSettings();
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to update name', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTransferOrganizer = async () => {
    if (!selectedMember) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/family/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'transfer-organizer',
          targetUserId: selectedMember.id 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: data.message, status: 'success' });
        onTransferClose();
        setSelectedMember(null);
        fetchSettings();
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to transfer role', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/family/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'remove-member',
          targetUserId: selectedMember.id 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: data.message, status: 'success' });
        onRemoveClose();
        setSelectedMember(null);
        fetchSettings();
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to remove member', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const res = await fetch('/api/family/invite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: 'Invitation cancelled', status: 'success' });
        fetchSettings();
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to cancel invitation', status: 'error' });
    }
  };

  const getRoleBadge = (roleId: string) => {
    switch (roleId) {
      case 'family-organizer':
      case 'tenant-admin':
        return <Badge colorScheme="purple">Organizer</Badge>;
      case 'family-adult':
        return <Badge colorScheme="blue">Adult</Badge>;
      case 'child-user':
        return <Badge colorScheme="green">Child</Badge>;
      default:
        return <Badge>{roleId}</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container maxW="container.lg" py={6}>
          <VStack spacing={4} py={20}>
            <Spinner size="xl" />
            <Text color={textSecondary}>Loading family settings...</Text>
          </VStack>
        </Container>
      </DashboardLayout>
    );
  }

  if (!settings) {
    return (
      <DashboardLayout>
        <Container maxW="container.lg" py={6}>
          <GlassPanel variant="light" p={8}>
            <VStack spacing={4}>
              <Icon as={FiUsers} boxSize={12} color="gray.400" />
              <Heading size="md">No Family Found</Heading>
              <Text color={textSecondary}>You don't have a family set up yet.</Text>
              <Button as={NextLink} href="/family" colorScheme="purple">
                Go to Family Page
              </Button>
            </VStack>
          </GlassPanel>
        </Container>
      </DashboardLayout>
    );
  }

  const adults = settings.members.filter(m => m.accountType !== 'child');
  const children = settings.members.filter(m => m.accountType === 'child');

  return (
    <DashboardLayout>
      <Container maxW="container.lg" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <HStack spacing={4}>
              <Button
                as={NextLink}
                href="/family"
                variant="ghost"
                leftIcon={<FiArrowLeft />}
                size="sm"
              >
                Back
              </Button>
              <VStack align="start" spacing={0}>
                <Heading size="lg">Family Settings</Heading>
                <Text color={textSecondary}>{settings.family.name}</Text>
              </VStack>
            </HStack>
            <Button
              leftIcon={<FiRefreshCw />}
              variant="outline"
              size="sm"
              onClick={fetchSettings}
            >
              Refresh
            </Button>
          </HStack>

          <Tabs colorScheme="purple">
            <TabList>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiUsers} />
                  <Text>Members</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiMail} />
                  <Text>Invitations</Text>
                  {settings.pendingInvitations.length > 0 && (
                    <Badge colorScheme="orange">{settings.pendingInvitations.length}</Badge>
                  )}
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiSettings} />
                  <Text>Settings</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Members Tab */}
              <TabPanel px={0}>
                <VStack spacing={6} align="stretch">
                  {/* Adults Section */}
                  <GlassPanel variant="light" p={5}>
                    <VStack align="stretch" spacing={4}>
                      <HStack justify="space-between">
                        <HStack spacing={2}>
                          <Icon as={FiUsers} color="purple.500" />
                          <Heading size="sm">Adults</Heading>
                        </HStack>
                        <Badge>{adults.length}</Badge>
                      </HStack>
                      
                      <VStack align="stretch" spacing={2}>
                        {adults.map((member) => (
                          <HStack
                            key={member.id}
                            p={3}
                            borderRadius="md"
                            border="1px"
                            borderColor="gray.200"
                            bg="white"
                            _dark={{ bg: 'gray.800', borderColor: 'gray.600' }}
                            justify="space-between"
                          >
                            <HStack spacing={3}>
                              <Avatar size="sm" name={member.name} src={member.avatarUrl} />
                              <VStack align="start" spacing={0}>
                                <HStack spacing={2}>
                                  <Text fontWeight="medium">{member.name}</Text>
                                  {getRoleBadge(member.roleId)}
                                </HStack>
                                <Text fontSize="sm" color={textSecondary}>{member.email}</Text>
                              </VStack>
                            </HStack>
                            
                            {settings.isOrganizer && member.roleId !== 'family-organizer' && member.roleId !== 'tenant-admin' && (
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  icon={<FiMoreVertical />}
                                  variant="ghost"
                                  size="sm"
                                />
                                <MenuList>
                                  <MenuItem
                                    icon={<FiShield />}
                                    onClick={() => {
                                      setSelectedMember(member);
                                      onTransferOpen();
                                    }}
                                  >
                                    Make Organizer
                                  </MenuItem>
                                  <MenuItem
                                    icon={<FiUserMinus />}
                                    color="red.500"
                                    onClick={() => {
                                      setSelectedMember(member);
                                      onRemoveOpen();
                                    }}
                                  >
                                    Remove from Family
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            )}
                          </HStack>
                        ))}
                      </VStack>
                    </VStack>
                  </GlassPanel>

                  {/* Children Section */}
                  {children.length > 0 && (
                    <GlassPanel variant="light" p={5}>
                      <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between">
                          <HStack spacing={2}>
                            <Icon as={FiUsers} color="green.500" />
                            <Heading size="sm">Children</Heading>
                          </HStack>
                          <Badge>{children.length}</Badge>
                        </HStack>
                        
                        <VStack align="stretch" spacing={2}>
                          {children.map((member) => (
                            <HStack
                              key={member.id}
                              p={3}
                              borderRadius="md"
                              border="1px"
                              borderColor="gray.200"
                              bg="white"
                              _dark={{ bg: 'gray.800', borderColor: 'gray.600' }}
                              justify="space-between"
                            >
                              <HStack spacing={3}>
                                <Avatar size="sm" name={member.name} src={member.avatarUrl} />
                                <VStack align="start" spacing={0}>
                                  <HStack spacing={2}>
                                    <Text fontWeight="medium">{member.name}</Text>
                                    {getRoleBadge(member.roleId)}
                                  </HStack>
                                  <Text fontSize="sm" color={textSecondary}>{member.email}</Text>
                                </VStack>
                              </HStack>
                              
                              {settings.isOrganizer && (
                                <Menu>
                                  <MenuButton
                                    as={IconButton}
                                    icon={<FiMoreVertical />}
                                    variant="ghost"
                                    size="sm"
                                  />
                                  <MenuList>
                                    <MenuItem
                                      icon={<FiUserMinus />}
                                      color="red.500"
                                      onClick={() => {
                                        setSelectedMember(member);
                                        onRemoveOpen();
                                      }}
                                    >
                                      Remove from Family
                                    </MenuItem>
                                  </MenuList>
                                </Menu>
                              )}
                            </HStack>
                          ))}
                        </VStack>
                      </VStack>
                    </GlassPanel>
                  )}
                </VStack>
              </TabPanel>

              {/* Invitations Tab */}
              <TabPanel px={0}>
                <GlassPanel variant="light" p={5}>
                  <VStack align="stretch" spacing={4}>
                    <HStack justify="space-between">
                      <HStack spacing={2}>
                        <Icon as={FiMail} color="orange.500" />
                        <Heading size="sm">Pending Invitations</Heading>
                      </HStack>
                      <Button
                        as={NextLink}
                        href="/family"
                        size="sm"
                        leftIcon={<FiUserPlus />}
                        colorScheme="purple"
                      >
                        Invite Adult
                      </Button>
                    </HStack>

                    {settings.pendingInvitations.length === 0 ? (
                      <Box p={8} textAlign="center">
                        <Icon as={FiMail} boxSize={8} color="gray.300" mb={2} />
                        <Text color={textSecondary}>No pending invitations</Text>
                      </Box>
                    ) : (
                      <VStack align="stretch" spacing={2}>
                        {settings.pendingInvitations.map((invite) => (
                          <HStack
                            key={invite.id}
                            p={3}
                            borderRadius="md"
                            border="1px"
                            borderColor="orange.200"
                            bg="orange.50"
                            _dark={{ bg: 'orange.900', borderColor: 'orange.700' }}
                            justify="space-between"
                          >
                            <VStack align="start" spacing={1}>
                              <HStack spacing={2}>
                                <Text fontWeight="medium">{invite.email}</Text>
                                <Badge colorScheme="orange">Pending</Badge>
                              </HStack>
                              <HStack spacing={4} fontSize="sm" color={textSecondary}>
                                <HStack spacing={1}>
                                  <Icon as={FiClock} />
                                  <Text>Expires {new Date(invite.expiresAt).toLocaleDateString()}</Text>
                                </HStack>
                                <Text>Invited by {invite.invitedByName}</Text>
                              </HStack>
                            </VStack>
                            
                            {settings.isOrganizer && (
                              <IconButton
                                aria-label="Cancel invitation"
                                icon={<FiX />}
                                variant="ghost"
                                colorScheme="red"
                                size="sm"
                                onClick={() => handleCancelInvitation(invite.id)}
                              />
                            )}
                          </HStack>
                        ))}
                      </VStack>
                    )}
                  </VStack>
                </GlassPanel>
              </TabPanel>

              {/* Settings Tab */}
              <TabPanel px={0}>
                <VStack spacing={4} align="stretch">
                  <GlassPanel variant="light" p={5}>
                    <VStack align="stretch" spacing={4}>
                      <Heading size="sm">Family Name</Heading>
                      <HStack>
                        <Text flex={1}>{settings.family.name}</Text>
                        {settings.isOrganizer && (
                          <Button
                            size="sm"
                            leftIcon={<FiEdit2 />}
                            variant="outline"
                            onClick={onRenameOpen}
                          >
                            Rename
                          </Button>
                        )}
                      </HStack>
                    </VStack>
                  </GlassPanel>

                  {settings.isOrganizer && (
                    <GlassPanel variant="light" p={5}>
                      <VStack align="stretch" spacing={4}>
                        <Heading size="sm">Danger Zone</Heading>
                        <Alert status="warning" borderRadius="md">
                          <AlertIcon />
                          <Text fontSize="sm">
                            These actions are irreversible. Please be careful.
                          </Text>
                        </Alert>
                        <Button
                          colorScheme="orange"
                          variant="outline"
                          leftIcon={<FiShield />}
                          onClick={onTransferOpen}
                        >
                          Transfer Organizer Role
                        </Button>
                      </VStack>
                    </GlassPanel>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>

      {/* Rename Modal */}
      <Modal isOpen={isRenameOpen} onClose={onRenameClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Rename Family</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Family Name</FormLabel>
              <Input
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Enter family name"
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRenameClose}>Cancel</Button>
            <Button
              colorScheme="purple"
              onClick={handleRename}
              isLoading={saving}
              isDisabled={!familyName.trim()}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Transfer Organizer Modal */}
      <Modal isOpen={isTransferOpen} onClose={onTransferClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Transfer Organizer Role</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  This will make the selected person the family organizer. You will become a regular family adult.
                </Text>
              </Alert>

              {selectedMember ? (
                <Box p={4} borderRadius="md" border="1px" borderColor="purple.200" bg="purple.50">
                  <HStack spacing={3}>
                    <Avatar size="sm" name={selectedMember.name} />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium">{selectedMember.name}</Text>
                      <Text fontSize="sm" color={textSecondary}>{selectedMember.email}</Text>
                    </VStack>
                  </HStack>
                </Box>
              ) : (
                <Text color={textSecondary}>Select a family member from the Members tab</Text>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onTransferClose}>Cancel</Button>
            <Button
              colorScheme="purple"
              onClick={handleTransferOrganizer}
              isLoading={saving}
              isDisabled={!selectedMember}
            >
              Transfer Role
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Remove Member Modal */}
      <Modal isOpen={isRemoveOpen} onClose={onRemoveClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Remove Family Member</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  This will remove the member from your family. They will lose access to shared content.
                </Text>
              </Alert>

              {selectedMember && (
                <Box p={4} borderRadius="md" border="1px" borderColor="red.200" bg="red.50">
                  <HStack spacing={3}>
                    <Avatar size="sm" name={selectedMember.name} />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium">{selectedMember.name}</Text>
                      <Text fontSize="sm" color={textSecondary}>{selectedMember.email}</Text>
                    </VStack>
                  </HStack>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRemoveClose}>Cancel</Button>
            <Button
              colorScheme="red"
              onClick={handleRemoveMember}
              isLoading={saving}
              isDisabled={!selectedMember}
            >
              Remove Member
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}
