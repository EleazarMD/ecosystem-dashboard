/**
 * User Profile Settings Page
 * 
 * Allows users to view and update their profile information:
 * - Name, Email, Avatar
 * - Password change
 * - Workspace memberships
 * 
 * Design: Uses Lucide icons and subtle gradient accents to match
 * the landing/signup/signin visual language while respecting the
 * active dashboard theme (semantic tokens, GlassPanel).
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Button,
  Avatar,
  Badge,
  FormControl,
  FormLabel,
  FormErrorMessage,
  IconButton,
  Divider,
  Icon,
  Flex,
  useToast,
} from '@chakra-ui/react';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  Shield,
  Building2,
  KeyRound,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export default function ProfilePage() {
  const { user, isLoading } = useRequireAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceElevated = useSemanticToken('surface.elevated');
  const surfaceHover = useSemanticToken('surface.hover');

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (response.ok) {
        toast({ title: 'Profile updated', status: 'success', duration: 3000 });
      } else {
        const data = await response.json();
        toast({ title: 'Failed to update profile', description: data.error, status: 'error', duration: 5000 });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update profile', status: 'error', duration: 5000 });
    }
    setIsSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', status: 'error', duration: 3000 });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: 'Password too short', description: 'Must be at least 8 characters', status: 'error', duration: 3000 });
      return;
    }
    setIsChangingPassword(true);
    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (response.ok) {
        toast({ title: 'Password changed', status: 'success', duration: 3000 });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await response.json();
        toast({ title: 'Failed to change password', description: data.error, status: 'error', duration: 5000 });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to change password', status: 'error', duration: 5000 });
    }
    setIsChangingPassword(false);
  };

  if (isLoading || !user) {
    return null;
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Profile Settings | Hyperspace AI</title>
      </Head>

      <Container maxW="2xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Page Header */}
          <HStack spacing={3}>
            <Flex
              w="40px"
              h="40px"
              borderRadius="xl"
              bgGradient="linear(135deg, blue.400, purple.500)"
              align="center"
              justify="center"
              flexShrink={0}
            >
              <Icon as={User} boxSize={5} color="white" />
            </Flex>
            <VStack align="start" spacing={0}>
              <Heading size="lg" color={textPrimary}>Profile</Heading>
              <Text fontSize="sm" color={textSecondary}>Manage your account and security</Text>
            </VStack>
          </HStack>

          {/* Profile Card */}
          <GlassPanel variant="light" p={0} overflow="hidden">
            <Box h="3px" bgGradient="linear(to-r, blue.400, purple.500)" />
            <Box p={6}>
              <VStack spacing={6} align="stretch">
                <HStack spacing={5}>
                  <Avatar
                    size="xl"
                    name={user.name}
                    src={user.image}
                    borderWidth="2px"
                    borderColor={borderSubtle}
                  />
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold" fontSize="xl" color={textPrimary}>{user.name}</Text>
                    <HStack spacing={1}>
                      <Icon as={Mail} boxSize={3.5} color={textSecondary} />
                      <Text fontSize="sm" color={textSecondary}>{user.email}</Text>
                    </HStack>
                    {user.platformRole === 'platform-admin' && (
                      <Badge
                        bgGradient="linear(to-r, orange.400, red.400)"
                        color="white"
                        fontSize="xs"
                        px={2}
                        py={0.5}
                        borderRadius="full"
                      >
                        <HStack spacing={1}>
                          <Icon as={Shield} boxSize={3} />
                          <Text>Platform Admin</Text>
                        </HStack>
                      </Badge>
                    )}
                  </VStack>
                </HStack>

                <Divider borderColor={borderSubtle} />

                <FormControl>
                  <FormLabel fontSize="sm" color={textSecondary} fontWeight="500">Display Name</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={User} boxSize={4} color={textSecondary} />
                    </InputLeftElement>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      borderRadius="xl"
                      borderColor={borderSubtle}
                    />
                  </InputGroup>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" color={textSecondary} fontWeight="500">Email</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={Mail} boxSize={4} color={textSecondary} />
                    </InputLeftElement>
                    <Input
                      value={user.email}
                      isReadOnly
                      borderRadius="xl"
                      borderColor={borderSubtle}
                      bg={surfaceElevated}
                      opacity={0.7}
                    />
                  </InputGroup>
                  <Text fontSize="xs" color={textSecondary} mt={1}>
                    Email cannot be changed
                  </Text>
                </FormControl>

                <Button
                  colorScheme="blue"
                  leftIcon={<Icon as={Save} boxSize={4} />}
                  onClick={handleSaveProfile}
                  isLoading={isSaving}
                  alignSelf="flex-start"
                  borderRadius="xl"
                  px={6}
                >
                  Save Changes
                </Button>
              </VStack>
            </Box>
          </GlassPanel>

          {/* Change Password Card */}
          <GlassPanel variant="light" p={0} overflow="hidden">
            <Box h="3px" bgGradient="linear(to-r, orange.400, red.400)" />
            <Box p={6}>
              <VStack spacing={6} align="stretch">
                <HStack spacing={3}>
                  <Flex
                    w="32px"
                    h="32px"
                    borderRadius="lg"
                    bgGradient="linear(135deg, orange.400, red.400)"
                    align="center"
                    justify="center"
                  >
                    <Icon as={KeyRound} boxSize={4} color="white" />
                  </Flex>
                  <Heading size="md" color={textPrimary}>Change Password</Heading>
                </HStack>

                <FormControl>
                  <FormLabel fontSize="sm" color={textSecondary} fontWeight="500">Current Password</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={Lock} boxSize={4} color={textSecondary} />
                    </InputLeftElement>
                    <Input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      borderRadius="xl"
                      borderColor={borderSubtle}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label="Toggle visibility"
                        icon={<Icon as={showCurrentPw ? EyeOff : Eye} boxSize={4} />}
                        variant="ghost"
                        size="sm"
                        color={textSecondary}
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <FormControl isInvalid={newPassword.length > 0 && newPassword.length < 8}>
                  <FormLabel fontSize="sm" color={textSecondary} fontWeight="500">New Password</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={Lock} boxSize={4} color={textSecondary} />
                    </InputLeftElement>
                    <Input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      borderRadius="xl"
                      borderColor={borderSubtle}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label="Toggle visibility"
                        icon={<Icon as={showNewPw ? EyeOff : Eye} boxSize={4} />}
                        variant="ghost"
                        size="sm"
                        color={textSecondary}
                        onClick={() => setShowNewPw(!showNewPw)}
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>Password must be at least 8 characters</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={confirmPassword.length > 0 && newPassword !== confirmPassword}>
                  <FormLabel fontSize="sm" color={textSecondary} fontWeight="500">Confirm New Password</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={Lock} boxSize={4} color={textSecondary} />
                    </InputLeftElement>
                    <Input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      borderRadius="xl"
                      borderColor={borderSubtle}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label="Toggle visibility"
                        icon={<Icon as={showConfirmPw ? EyeOff : Eye} boxSize={4} />}
                        variant="ghost"
                        size="sm"
                        color={textSecondary}
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>Passwords do not match</FormErrorMessage>
                </FormControl>

                <Button
                  colorScheme="orange"
                  leftIcon={<Icon as={KeyRound} boxSize={4} />}
                  onClick={handleChangePassword}
                  isLoading={isChangingPassword}
                  isDisabled={!currentPassword || !newPassword || !confirmPassword}
                  alignSelf="flex-start"
                  borderRadius="xl"
                  px={6}
                >
                  Change Password
                </Button>
              </VStack>
            </Box>
          </GlassPanel>

          {/* Workspace Memberships Card */}
          <GlassPanel variant="light" p={0} overflow="hidden">
            <Box h="3px" bgGradient="linear(to-r, purple.400, cyan.400)" />
            <Box p={6}>
              <VStack spacing={4} align="stretch">
                <HStack spacing={3}>
                  <Flex
                    w="32px"
                    h="32px"
                    borderRadius="lg"
                    bgGradient="linear(135deg, purple.400, cyan.400)"
                    align="center"
                    justify="center"
                  >
                    <Icon as={Building2} boxSize={4} color="white" />
                  </Flex>
                  <Heading size="md" color={textPrimary}>Workspaces</Heading>
                </HStack>

                {user.tenants.length === 0 ? (
                  <Text color={textSecondary} fontSize="sm">You are not a member of any workspaces</Text>
                ) : (
                  user.tenants.map((tenant: any) => (
                    <HStack
                      key={tenant.tenantId}
                      justify="space-between"
                      p={3}
                      borderRadius="xl"
                      bg={surfaceElevated}
                      borderWidth="1px"
                      borderColor={borderSubtle}
                      _hover={{ bg: surfaceHover }}
                      transition="background 0.2s"
                    >
                      <HStack spacing={3}>
                        <Flex
                          w="28px"
                          h="28px"
                          borderRadius="md"
                          bg={
                            tenant.roleId === 'tenant-admin' ? 'purple.500' :
                            tenant.roleId === 'family-organizer' ? 'blue.500' : 'gray.500'
                          }
                          align="center"
                          justify="center"
                          flexShrink={0}
                        >
                          <Icon
                            as={tenant.roleId === 'tenant-admin' ? Shield : Building2}
                            boxSize={3.5}
                            color="white"
                          />
                        </Flex>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium" fontSize="sm" color={textPrimary}>{tenant.tenantName}</Text>
                          <Text fontSize="xs" color={textSecondary}>/{tenant.tenantSlug}</Text>
                        </VStack>
                      </HStack>
                      <Badge
                        colorScheme={
                          tenant.roleId === 'tenant-admin' ? 'purple' :
                          tenant.roleId === 'family-organizer' ? 'blue' :
                          tenant.roleId === 'tenant-member' ? 'gray' : 'gray'
                        }
                        fontSize="xs"
                        borderRadius="full"
                        px={2}
                      >
                        {tenant.roleId === 'tenant-admin' ? 'Admin' :
                         tenant.roleId === 'family-organizer' ? 'Organizer' :
                         tenant.roleId === 'tenant-member' ? 'Member' : 'Viewer'}
                      </Badge>
                    </HStack>
                  ))
                )}
              </VStack>
            </Box>
          </GlassPanel>

          {/* Security footer */}
          <HStack spacing={2} justify="center" pt={2}>
            <Icon as={Shield} boxSize={3.5} color={textSecondary} />
            <Text fontSize="xs" color={textSecondary}>
              Secured by zero-tolerance encryption. Your data stays on your hardware.
            </Text>
          </HStack>
        </VStack>
      </Container>
    </DashboardLayout>
  );
}
