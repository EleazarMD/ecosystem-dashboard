/**
 * Step 7: Security & Compliance Validation
 * 
 * Enforces zero-tolerance security acknowledgements, JIT access,
 * audit logging, content filter levels, and parental controls.
 */

import React from 'react';
import {
  VStack,
  HStack,
  Box,
  Text,
  Badge,
  Alert,
  AlertIcon,
  AlertDescription,
  Checkbox,
  FormControl,
  FormLabel,
  FormHelperText,
  FormErrorMessage,
  Select,
  Input,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Divider,
  Switch,
  Code,
} from '@chakra-ui/react';
import { LockIcon, CheckCircleIcon } from '@chakra-ui/icons';

import {
  SecurityFormData,
  ContentFilterLevel,
  AccountType,
} from '@/lib/platform/onboarding-types';

interface SecurityStepProps {
  data: SecurityFormData;
  errors: Record<string, string>;
  accountType: AccountType;
  onChange: (updates: Partial<SecurityFormData>) => void;
}

const FILTER_DESCRIPTIONS: Record<ContentFilterLevel, string> = {
  strict: 'Maximum filtering. Blocks most sensitive topics. Recommended for children under 10.',
  moderate: 'Balanced filtering. Allows educational content. Recommended for ages 10-13.',
  standard: 'Light filtering. Blocks only critical content. Recommended for ages 14-17.',
  none: 'No content filtering. Full access to all AI capabilities. Adults only.',
};

export function SecurityStep({ data, errors, accountType, onChange }: SecurityStepProps) {

  const updateParentalControls = (updates: Partial<SecurityFormData['parentalControls']>) => {
    onChange({
      parentalControls: { ...data.parentalControls, ...updates },
    });
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Zero-Tolerance Security Banner */}
      <Alert status="error" borderRadius="lg" bg="red.900" borderColor="red.700" borderWidth="1px">
        <AlertIcon color="red.300" />
        <Box>
          <AlertDescription color="red.200">
            <Text fontWeight="bold" mb={1}>🔒 Zero-Tolerance Security Framework</Text>
            <Text fontSize="sm">
              The AI Homelab enforces a zero-tolerance, just-in-time security architecture.
              Every action requires explicit authorization, all operations are audited, and 
              credentials are time-boxed. You must acknowledge these policies to activate your account.
            </Text>
          </AlertDescription>
        </Box>
      </Alert>

      {/* Required Acknowledgements */}
      <Box bg="gray.800" p={5} borderRadius="lg" borderWidth="1px" borderColor="gray.700">
        <Text fontWeight="semibold" color="white" mb={4}>Required Security Acknowledgements</Text>
        <VStack spacing={4} align="stretch">
          {/* Zero Tolerance */}
          <FormControl isInvalid={!!errors.zeroToleranceAccepted}>
            <Checkbox
              isChecked={data.zeroToleranceAccepted}
              onChange={(e) => onChange({ zeroToleranceAccepted: e.target.checked })}
              colorScheme="red"
              spacing={3}
            >
              <VStack align="start" spacing={0}>
                <Text color="gray.200" fontSize="sm" fontWeight="medium">
                  I accept the Zero-Tolerance Security Policy
                </Text>
                <Text color="gray.500" fontSize="xs">
                  All actions require explicit authorization. Unknown or unhealthy states block execution. 
                  Every operation is auditable (Chapter 23).
                </Text>
              </VStack>
            </Checkbox>
            <FormErrorMessage ml={7}>{errors.zeroToleranceAccepted}</FormErrorMessage>
          </FormControl>

          <Divider borderColor="gray.700" />

          {/* JIT Access */}
          <FormControl isInvalid={!!errors.jitAccessAcknowledged}>
            <Checkbox
              isChecked={data.jitAccessAcknowledged}
              onChange={(e) => onChange({ jitAccessAcknowledged: e.target.checked })}
              colorScheme="orange"
              spacing={3}
            >
              <VStack align="start" spacing={0}>
                <Text color="gray.200" fontSize="sm" fontWeight="medium">
                  I understand Just-In-Time Access Controls
                </Text>
                <Text color="gray.500" fontSize="xs">
                  Credentials are time-boxed and expire after task completion. Permissions are 
                  context-bound to specific workflows and users. Minimum necessary access only.
                </Text>
              </VStack>
            </Checkbox>
            <FormErrorMessage ml={7}>{errors.jitAccessAcknowledged}</FormErrorMessage>
          </FormControl>

          <Divider borderColor="gray.700" />

          {/* Audit Logging */}
          <FormControl isInvalid={!!errors.auditLoggingAcknowledged}>
            <Checkbox
              isChecked={data.auditLoggingAcknowledged}
              onChange={(e) => onChange({ auditLoggingAcknowledged: e.target.checked })}
              colorScheme="yellow"
              spacing={3}
            >
              <VStack align="start" spacing={0}>
                <Text color="gray.200" fontSize="sm" fontWeight="medium">
                  I acknowledge Immutable Audit Logging
                </Text>
                <Text color="gray.500" fontSize="xs">
                  All operations produce immutable audit records including tool calls, access grants, 
                  time windows, and outcomes. Audit trails cannot be modified or deleted.
                </Text>
              </VStack>
            </Checkbox>
            <FormErrorMessage ml={7}>{errors.auditLoggingAcknowledged}</FormErrorMessage>
          </FormControl>

          <Divider borderColor="gray.700" />

          {/* Data Isolation */}
          <FormControl isInvalid={!!errors.dataIsolationAcknowledged}>
            <Checkbox
              isChecked={data.dataIsolationAcknowledged}
              onChange={(e) => onChange({ dataIsolationAcknowledged: e.target.checked })}
              colorScheme="blue"
              spacing={3}
            >
              <VStack align="start" spacing={0}>
                <Text color="gray.200" fontSize="sm" fontWeight="medium">
                  I understand Multi-Tenant Data Isolation
                </Text>
                <Text color="gray.500" fontSize="xs">
                  All data is isolated by <Code fontSize="xs" bg="transparent" color="gray.500">tenant_id</Code>. 
                  Cross-tenant access is explicitly forbidden. PostgreSQL, ChromaDB, and Neo4j all enforce 
                  tenant-level isolation (Chapter 19d).
                </Text>
              </VStack>
            </Checkbox>
            <FormErrorMessage ml={7}>{errors.dataIsolationAcknowledged}</FormErrorMessage>
          </FormControl>
        </VStack>
      </Box>

      {/* Content Filter Level */}
      <Box bg="gray.800" p={5} borderRadius="lg" borderWidth="1px" borderColor="gray.700">
        <Text fontWeight="semibold" color="white" mb={4}>Content Filter Level</Text>
        <FormControl>
          <Select
            value={data.contentFilterLevel}
            onChange={(e) => onChange({ contentFilterLevel: e.target.value as ContentFilterLevel })}
            bg="gray.900"
            borderColor="gray.600"
            color="white"
          >
            {accountType === 'adult' && <option value="none">None (Adults Only)</option>}
            <option value="standard">Standard (Ages 14-17)</option>
            <option value="moderate">Moderate (Ages 10-13)</option>
            <option value="strict">Strict (Under 10)</option>
          </Select>
          <FormHelperText color="gray.500" fontSize="xs">
            {FILTER_DESCRIPTIONS[data.contentFilterLevel]}
          </FormHelperText>
        </FormControl>

        {accountType === 'child' && data.contentFilterLevel === 'none' && (
          <Alert status="error" mt={3} borderRadius="md" bg="red.900" borderColor="red.700" borderWidth="1px" py={2}>
            <AlertIcon color="red.300" boxSize={4} />
            <AlertDescription fontSize="xs" color="red.200">
              "None" is not available for child accounts. A minimum filter level will be enforced.
            </AlertDescription>
          </Alert>
        )}
      </Box>

      {/* Parental Controls (for child accounts) */}
      {(accountType === 'child' || data.parentalControlsEnabled) && (
        <Box bg="gray.800" p={5} borderRadius="lg" borderWidth="1px" borderColor="purple.700">
          <HStack justify="space-between" mb={4}>
            <HStack>
              <Text fontSize="lg">👨‍👩‍👧</Text>
              <Text fontWeight="semibold" color="white">Parental Controls</Text>
            </HStack>
            {accountType !== 'child' && (
              <Switch
                isChecked={data.parentalControlsEnabled}
                onChange={(e) => onChange({ parentalControlsEnabled: e.target.checked })}
                colorScheme="purple"
              />
            )}
          </HStack>

          <VStack spacing={4} align="stretch">
            {/* Daily Usage Limit */}
            <FormControl>
              <FormLabel color="gray.300" fontSize="sm">
                Daily Usage Limit: <strong>{data.parentalControls.dailyUsageLimitMinutes} minutes</strong>
              </FormLabel>
              <Slider
                value={data.parentalControls.dailyUsageLimitMinutes}
                min={15}
                max={480}
                step={15}
                onChange={(val) => updateParentalControls({ dailyUsageLimitMinutes: val })}
                colorScheme="purple"
              >
                <SliderTrack bg="gray.700">
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={5} bg="purple.400" />
              </Slider>
              <HStack justify="space-between">
                <Text fontSize="xs" color="gray.500">15 min</Text>
                <Text fontSize="xs" color="gray.500">8 hours</Text>
              </HStack>
            </FormControl>

            {/* Allowed Hours */}
            <HStack spacing={4}>
              <FormControl>
                <FormLabel color="gray.300" fontSize="sm">Start Time</FormLabel>
                <Input
                  type="time"
                  value={data.parentalControls.allowedHoursStart}
                  onChange={(e) => updateParentalControls({ allowedHoursStart: e.target.value })}
                  bg="gray.900"
                  borderColor="gray.600"
                  color="white"
                />
              </FormControl>
              <FormControl>
                <FormLabel color="gray.300" fontSize="sm">End Time</FormLabel>
                <Input
                  type="time"
                  value={data.parentalControls.allowedHoursEnd}
                  onChange={(e) => updateParentalControls({ allowedHoursEnd: e.target.value })}
                  bg="gray.900"
                  borderColor="gray.600"
                  color="white"
                />
              </FormControl>
            </HStack>

            {/* Monitoring Options */}
            <VStack align="start" spacing={2}>
              <Checkbox
                isChecked={data.parentalControls.logAllConversations}
                onChange={(e) => updateParentalControls({ logAllConversations: e.target.checked })}
                colorScheme="purple"
                color="gray.300"
                size="sm"
              >
                Log all conversations for parental review
              </Checkbox>
              <Checkbox
                isChecked={data.parentalControls.alertOnBlockedContent}
                onChange={(e) => updateParentalControls({ alertOnBlockedContent: e.target.checked })}
                colorScheme="purple"
                color="gray.300"
                size="sm"
              >
                Send alerts when content is blocked
              </Checkbox>
            </VStack>
          </VStack>
        </Box>
      )}

      {/* Network Security */}
      <Box bg="gray.800" p={5} borderRadius="lg" borderWidth="1px" borderColor="gray.700">
        <HStack mb={2}>
          <LockIcon color="green.400" />
          <Text fontWeight="semibold" color="white" fontSize="sm">Network Security</Text>
        </HStack>
        <Text fontSize="sm" color="gray.400" mb={3}>
          All tenant traffic is encrypted via Tailscale WireGuard mesh. No services are exposed to the public internet.
          Remote access requires Tailscale node authentication.
        </Text>
        <Checkbox
          isChecked={data.networkSecurityAcknowledged}
          onChange={(e) => onChange({ networkSecurityAcknowledged: e.target.checked })}
          colorScheme="green"
          color="gray.300"
          size="sm"
        >
          I understand the network security architecture
        </Checkbox>
      </Box>
    </VStack>
  );
}
