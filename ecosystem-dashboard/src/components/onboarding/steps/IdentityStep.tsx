/**
 * Step 1: Identity & Account Creation
 * 
 * Collects user identity, account type, and tenant configuration.
 * Auto-generates tenant slug, assigns roles, and handles child/adult branching.
 */

import React from 'react';
import {
  VStack,
  HStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  InputGroup,
  InputRightElement,
  Select,
  RadioGroup,
  Radio,
  Stack,
  Box,
  Text,
  Badge,
  Alert,
  AlertIcon,
  AlertDescription,
  Divider,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, InfoIcon } from '@chakra-ui/icons';

import { IdentityFormData, AccountType } from '@/lib/platform/onboarding-types';
import { TenantTier } from '@/lib/platform/tenant-types';

interface IdentityStepProps {
  data: IdentityFormData;
  errors: Record<string, string>;
  onChange: (updates: Partial<IdentityFormData>) => void;
}

export function IdentityStep({ data, errors, onChange }: IdentityStepProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const tierDescriptions: Record<TenantTier, string> = {
    free: '1 user — Workspace, AI chat, local models only',
    basic: 'Up to 6 users — Email, calendar, voice, ExoMind iOS, family admin & parental controls',
    premium: 'Unlimited — All Basic + knowledge graph, research lab, podcast studio, OpenClaw, cloud providers',
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Account Type Selection */}
      <Box bg="gray.800" p={5} borderRadius="lg" borderWidth="1px" borderColor="gray.700">
        <Text fontWeight="semibold" color="white" mb={3}>Account Type</Text>
        <RadioGroup
          value={data.accountType}
          onChange={(val) => onChange({ accountType: val as AccountType })}
        >
          <Stack direction="row" spacing={6}>
            <Radio value="adult" colorScheme="blue">
              <HStack>
                <Text color="gray.200">👤 Adult Account</Text>
                <Badge colorScheme="blue" fontSize="xs">Full Access</Badge>
              </HStack>
            </Radio>
            <Radio value="child" colorScheme="purple">
              <HStack>
                <Text color="gray.200">👶 Child Account</Text>
                <Badge colorScheme="purple" fontSize="xs">Parental Controls</Badge>
              </HStack>
            </Radio>
          </Stack>
        </RadioGroup>
        {data.accountType === 'child' && (
          <Alert status="info" mt={3} borderRadius="md" bg="purple.900" borderColor="purple.700" borderWidth="1px">
            <AlertIcon color="purple.300" />
            <AlertDescription fontSize="sm" color="purple.200">
              Child accounts have content filtering, usage limits, and parental oversight. 
              Email and cloud providers are blocked by default.
            </AlertDescription>
          </Alert>
        )}
      </Box>

      {/* Personal Information */}
      <Box bg="gray.800" p={5} borderRadius="lg" borderWidth="1px" borderColor="gray.700">
        <Text fontWeight="semibold" color="white" mb={4}>Personal Information</Text>
        <VStack spacing={4}>
          <FormControl isInvalid={!!errors.fullName} isRequired>
            <FormLabel color="gray.300" fontSize="sm">Full Name</FormLabel>
            <Input
              value={data.fullName}
              onChange={(e) => onChange({ fullName: e.target.value })}
              placeholder="Enter full name"
              bg="gray.900"
              borderColor="gray.600"
              color="white"
              _placeholder={{ color: 'gray.500' }}
            />
            <FormErrorMessage>{errors.fullName}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.email} isRequired>
            <FormLabel color="gray.300" fontSize="sm">Email Address</FormLabel>
            <Input
              type="email"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="user@example.com"
              bg="gray.900"
              borderColor="gray.600"
              color="white"
              _placeholder={{ color: 'gray.500' }}
            />
            <FormErrorMessage>{errors.email}</FormErrorMessage>
            <FormHelperText color="gray.500" fontSize="xs">
              Used for login and account recovery. Unique across the platform.
            </FormHelperText>
          </FormControl>

          {data.accountType === 'child' && (
            <FormControl isInvalid={!!errors.dateOfBirth} isRequired>
              <FormLabel color="gray.300" fontSize="sm">Date of Birth</FormLabel>
              <Input
                type="date"
                value={data.dateOfBirth || ''}
                onChange={(e) => onChange({ dateOfBirth: e.target.value })}
                bg="gray.900"
                borderColor="gray.600"
                color="white"
                max={new Date().toISOString().split('T')[0]}
              />
              <FormErrorMessage>{errors.dateOfBirth}</FormErrorMessage>
              <FormHelperText color="gray.500" fontSize="xs">
                Determines content filter level: strict (&lt;10), moderate (10-13), standard (14-17)
              </FormHelperText>
            </FormControl>
          )}

          <HStack spacing={4} w="full">
            <FormControl isInvalid={!!errors.password} isRequired>
              <FormLabel color="gray.300" fontSize="sm">Password</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={data.password}
                  onChange={(e) => onChange({ password: e.target.value })}
                  placeholder="Min 12 characters"
                  bg="gray.900"
                  borderColor="gray.600"
                  color="white"
                  _placeholder={{ color: 'gray.500' }}
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    size="sm"
                    variant="ghost"
                    color="gray.400"
                    onClick={() => setShowPassword(!showPassword)}
                  />
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.confirmPassword} isRequired>
              <FormLabel color="gray.300" fontSize="sm">Confirm Password</FormLabel>
              <InputGroup>
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={data.confirmPassword}
                  onChange={(e) => onChange({ confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  bg="gray.900"
                  borderColor="gray.600"
                  color="white"
                  _placeholder={{ color: 'gray.500' }}
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showConfirm ? 'Hide' : 'Show'}
                    icon={showConfirm ? <ViewOffIcon /> : <ViewIcon />}
                    size="sm"
                    variant="ghost"
                    color="gray.400"
                    onClick={() => setShowConfirm(!showConfirm)}
                  />
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
            </FormControl>
          </HStack>
        </VStack>
      </Box>

      {/* Workspace / Tenant Configuration */}
      <Box bg="gray.800" p={5} borderRadius="lg" borderWidth="1px" borderColor="gray.700">
        <Text fontWeight="semibold" color="white" mb={4}>Workspace Configuration</Text>
        <VStack spacing={4}>
          <FormControl>
            <FormLabel color="gray.300" fontSize="sm">Workspace Mode</FormLabel>
            <RadioGroup
              value={data.tenantMode}
              onChange={(val) => onChange({ tenantMode: val as 'create' | 'join' })}
            >
              <Stack direction="row" spacing={6}>
                <Radio value="create" colorScheme="blue">
                  <Text color="gray.200">Create New Workspace</Text>
                </Radio>
                <Radio value="join" colorScheme="green">
                  <Text color="gray.200">Join Existing Workspace</Text>
                </Radio>
              </Stack>
            </RadioGroup>
          </FormControl>

          {data.tenantMode === 'create' ? (
            <>
              <HStack spacing={4} w="full">
                <FormControl isInvalid={!!errors.tenantName} isRequired>
                  <FormLabel color="gray.300" fontSize="sm">Workspace Name</FormLabel>
                  <Input
                    value={data.tenantName || ''}
                    onChange={(e) => onChange({ tenantName: e.target.value })}
                    placeholder="e.g., Garcia Family Homelab"
                    bg="gray.900"
                    borderColor="gray.600"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                  />
                  <FormErrorMessage>{errors.tenantName}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.tenantSlug} isRequired>
                  <FormLabel color="gray.300" fontSize="sm">Workspace Slug</FormLabel>
                  <Input
                    value={data.tenantSlug || ''}
                    onChange={(e) => onChange({ tenantSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    placeholder="garcia-family"
                    bg="gray.900"
                    borderColor="gray.600"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                  />
                  <FormErrorMessage>{errors.tenantSlug}</FormErrorMessage>
                  <FormHelperText color="gray.500" fontSize="xs">
                    URL-friendly identifier. Lowercase letters, numbers, and hyphens only.
                  </FormHelperText>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel color="gray.300" fontSize="sm">Tier</FormLabel>
                <Select
                  value={data.tier}
                  onChange={(e) => onChange({ tier: e.target.value as TenantTier })}
                  bg="gray.900"
                  borderColor="gray.600"
                  color="white"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic (Family)</option>
                  <option value="premium">Premium (Full Homelab)</option>
                </Select>
                <FormHelperText color="gray.500" fontSize="xs">
                  {tierDescriptions[data.tier]}
                </FormHelperText>
              </FormControl>
            </>
          ) : (
            <FormControl isInvalid={!!errors.existingTenantId}>
              <FormLabel color="gray.300" fontSize="sm">Invitation Code or Tenant ID</FormLabel>
              <Input
                value={data.existingTenantId || ''}
                onChange={(e) => onChange({ existingTenantId: e.target.value })}
                placeholder="Enter invitation code"
                bg="gray.900"
                borderColor="gray.600"
                color="white"
                _placeholder={{ color: 'gray.500' }}
              />
              <FormHelperText color="gray.500" fontSize="xs">
                Ask your workspace administrator for an invitation code.
              </FormHelperText>
            </FormControl>
          )}
        </VStack>
      </Box>

      {/* Auto-generated IDs Info */}
      <Alert status="info" borderRadius="md" bg="blue.900" borderColor="blue.700" borderWidth="1px">
        <AlertIcon color="blue.300" />
        <AlertDescription fontSize="sm" color="blue.200">
          <strong>Unique IDs</strong> will be auto-generated: a UUID for your user account and 
          {data.tenantMode === 'create' ? ' a UUID for your new workspace tenant' : ' your membership will be linked to the existing tenant'}.
          These IDs ensure complete data isolation per the multi-tenant security framework.
        </AlertDescription>
      </Alert>
    </VStack>
  );
}
