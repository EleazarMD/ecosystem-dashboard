/**
 * Step 8: Review & Activate
 * 
 * Displays a summary of all configured settings for final review.
 * Allows navigation back to any step for edits before activation.
 */

import React from 'react';
import {
  VStack,
  HStack,
  Box,
  Text,
  Badge,
  SimpleGrid,
  Button,
  Code,
  Divider,
  Tag,
  TagLabel,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react';
import { CheckCircleIcon, EditIcon, WarningIcon, LockIcon } from '@chakra-ui/icons';

import { OnboardingState, ONBOARDING_STEPS } from '@/lib/platform/onboarding-types';

interface ReviewStepProps {
  state: OnboardingState;
  onGoToStep: (index: number) => void;
}

export function ReviewStep({ state, onGoToStep }: ReviewStepProps) {
  const { identity, email, infrastructure, localLLMs, cloudProviders, exomind, security } = state;

  const enabledCloudProviders = cloudProviders.providers.filter(p => p.enabled);
  const availableModels = localLLMs.models.filter(m => m.status === 'available');

  return (
    <VStack spacing={5} align="stretch">
      <Alert status="info" borderRadius="md" bg="blue.900" borderColor="blue.700" borderWidth="1px">
        <AlertIcon color="blue.300" />
        <AlertDescription fontSize="sm" color="blue.200">
          Review your configuration below. Click <strong>Edit</strong> on any section to make changes.
          When ready, click <strong>Activate Account</strong> to begin provisioning.
        </AlertDescription>
      </Alert>

      {/* 1. Identity */}
      <ReviewSection
        title="Account & Identity"
        icon="👤"
        stepIndex={0}
        onEdit={onGoToStep}
      >
        <SimpleGrid columns={2} spacing={3}>
          <ReviewField label="Name" value={identity.fullName} />
          <ReviewField label="Email" value={identity.email} />
          <ReviewField label="Account Type" value={identity.accountType === 'child' ? '👶 Child' : '👤 Adult'} />
          <ReviewField label="Tenant Mode" value={identity.tenantMode === 'create' ? 'Create New' : 'Join Existing'} />
          {identity.tenantMode === 'create' && (
            <>
              <ReviewField label="Workspace" value={identity.tenantName || '—'} />
              <ReviewField label="Slug" value={identity.tenantSlug || '—'} />
              <ReviewField label="Tier" value={identity.tier} badge badgeColor="blue" />
            </>
          )}
          {identity.dateOfBirth && (
            <ReviewField label="Date of Birth" value={identity.dateOfBirth} />
          )}
        </SimpleGrid>
      </ReviewSection>

      {/* 2. Email */}
      <ReviewSection
        title="Email Configuration"
        icon="📧"
        stepIndex={1}
        onEdit={onGoToStep}
        skipped={email.skipEmail || identity.accountType === 'child'}
      >
        {email.skipEmail || identity.accountType === 'child' ? (
          <Text fontSize="sm" color="gray.500">
            {identity.accountType === 'child' ? 'Blocked for child accounts' : 'Skipped — can be configured later'}
          </Text>
        ) : (
          <SimpleGrid columns={2} spacing={3}>
            <ReviewField label="Provider" value={email.provider || '—'} />
            <ReviewField label="Email" value={email.emailAddress || '—'} />
            <ReviewField label="Auth Method" value={email.authMethod} />
            <ReviewField
              label="Connection"
              value={email.connectionStatus === 'success' ? '✅ Verified' : '⚠️ Not tested'}
            />
          </SimpleGrid>
        )}
      </ReviewSection>

      {/* 3. Infrastructure */}
      <ReviewSection
        title="Docker Infrastructure"
        icon="🐳"
        stepIndex={2}
        onEdit={onGoToStep}
      >
        <SimpleGrid columns={2} spacing={3}>
          <ReviewField label="Disk Allocation" value={`${infrastructure.diskAllocationGB} GB`} />
          <ReviewField label="Resource Profile" value={infrastructure.openClawResourceProfile} badge badgeColor="green" />
          <ReviewField label="AI Gateway" value={infrastructure.containerNames.aiGateway} code />
          <ReviewField label="OpenClaw" value={infrastructure.provisionOpenClaw ? infrastructure.containerNames.openClaw : 'Disabled'} code />
          <ReviewField label="Network Isolation" value="Enabled" badge badgeColor="green" />
        </SimpleGrid>
        <HStack mt={2} spacing={2}>
          <Tag size="sm" colorScheme="blue"><TagLabel>{infrastructure.volumeNames.data}</TagLabel></Tag>
          <Tag size="sm" colorScheme="blue"><TagLabel>{infrastructure.volumeNames.models}</TagLabel></Tag>
          <Tag size="sm" colorScheme="blue"><TagLabel>{infrastructure.volumeNames.logs}</TagLabel></Tag>
        </HStack>
      </ReviewSection>

      {/* 4. Local LLMs */}
      <ReviewSection
        title="Local AI Models"
        icon="🧠"
        stepIndex={3}
        onEdit={onGoToStep}
      >
        <VStack spacing={2} align="stretch">
          {localLLMs.models.map((model) => (
            <HStack key={model.id} justify="space-between">
              <HStack>
                <Text fontSize="sm" color="gray.300">{model.name}</Text>
                {model.isDefault && <Badge colorScheme="blue" fontSize="xs">Default</Badge>}
              </HStack>
              <HStack>
                <Tag size="sm" colorScheme={model.modelType === 'chat' ? 'blue' : model.modelType === 'vision' ? 'purple' : 'orange'}>
                  <TagLabel>{model.modelType}</TagLabel>
                </Tag>
                <Badge
                  colorScheme={model.status === 'available' ? 'green' : model.status === 'checking' ? 'blue' : 'red'}
                  fontSize="xs"
                >
                  {model.status}
                </Badge>
              </HStack>
            </HStack>
          ))}
        </VStack>
      </ReviewSection>

      {/* 5. Cloud Providers */}
      <ReviewSection
        title="Cloud AI Providers"
        icon="☁️"
        stepIndex={4}
        onEdit={onGoToStep}
      >
        {enabledCloudProviders.length === 0 ? (
          <HStack>
            <LockIcon color="gray.500" boxSize={3} />
            <Text fontSize="sm" color="gray.500">
              All cloud providers blocked (Local-First mode)
            </Text>
          </HStack>
        ) : (
          <VStack spacing={2} align="stretch">
            {enabledCloudProviders.map((provider) => (
              <HStack key={provider.id} justify="space-between">
                <HStack>
                  <Text>{provider.icon}</Text>
                  <Text fontSize="sm" color="gray.300">{provider.name}</Text>
                </HStack>
                <Badge
                  colorScheme={provider.validationStatus === 'valid' ? 'green' : provider.validationStatus === 'invalid' ? 'red' : 'yellow'}
                  fontSize="xs"
                >
                  {provider.validationStatus === 'valid' ? '✅ Key Valid' : provider.validationStatus === 'invalid' ? '❌ Key Invalid' : '⚠️ Unchecked'}
                </Badge>
              </HStack>
            ))}
          </VStack>
        )}
      </ReviewSection>

      {/* 6. ExoMind */}
      <ReviewSection
        title="ExoMind iOS App"
        icon="📱"
        stepIndex={5}
        onEdit={onGoToStep}
        skipped={exomind.skipPairing}
      >
        {exomind.skipPairing ? (
          <Text fontSize="sm" color="gray.500">Skipped — can be configured later from Settings</Text>
        ) : (
          <SimpleGrid columns={2} spacing={3}>
            <ReviewField label="Endpoint" value={exomind.tenantEndpointUrl || 'Not generated'} code />
            <ReviewField label="API Key" value={exomind.tenantApiKey ? '••••••••' : 'Not generated'} />
            <ReviewField label="WebSocket" value={exomind.websocketEndpoint || 'Not generated'} code />
            <ReviewField
              label="Push Notifications"
              value={exomind.pushNotificationsEnabled ? 'Enabled' : 'Disabled'}
              badge
              badgeColor={exomind.pushNotificationsEnabled ? 'green' : 'gray'}
            />
          </SimpleGrid>
        )}
      </ReviewSection>

      {/* 7. Security */}
      <ReviewSection
        title="Security & Compliance"
        icon="🔒"
        stepIndex={6}
        onEdit={onGoToStep}
      >
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.400">Zero-Tolerance Policy</Text>
            <StatusBadge accepted={security.zeroToleranceAccepted} />
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.400">JIT Access Controls</Text>
            <StatusBadge accepted={security.jitAccessAcknowledged} />
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.400">Audit Logging</Text>
            <StatusBadge accepted={security.auditLoggingAcknowledged} />
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.400">Data Isolation</Text>
            <StatusBadge accepted={security.dataIsolationAcknowledged} />
          </HStack>
          <Divider borderColor="gray.700" />
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.400">Content Filter</Text>
            <Badge colorScheme={security.contentFilterLevel === 'strict' ? 'red' : security.contentFilterLevel === 'none' ? 'gray' : 'yellow'} fontSize="xs">
              {security.contentFilterLevel}
            </Badge>
          </HStack>
          {security.parentalControlsEnabled && (
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.400">Parental Controls</Text>
              <Badge colorScheme="purple" fontSize="xs">
                {security.parentalControls.dailyUsageLimitMinutes} min/day, {security.parentalControls.allowedHoursStart}-{security.parentalControls.allowedHoursEnd}
              </Badge>
            </HStack>
          )}
        </VStack>
      </ReviewSection>

      {/* Final Confirmation */}
      <Alert status="success" borderRadius="lg" bg="green.900" borderColor="green.700" borderWidth="1px">
        <AlertIcon color="green.300" />
        <AlertDescription color="green.200" fontSize="sm">
          <Text fontWeight="bold" mb={1}>Ready to Activate</Text>
          <Text>
            Click <strong>Activate Account</strong> below to begin provisioning your isolated workspace.
            This will create Docker containers, register model endpoints, generate security credentials,
            and set up your complete AI Homelab environment.
          </Text>
        </AlertDescription>
      </Alert>
    </VStack>
  );
}

// ============================================================
// Sub-Components
// ============================================================

function ReviewSection({
  title,
  icon,
  stepIndex,
  onEdit,
  skipped,
  children,
}: {
  title: string;
  icon: string;
  stepIndex: number;
  onEdit: (index: number) => void;
  skipped?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box
      bg="gray.800"
      p={4}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={skipped ? 'gray.700' : 'gray.600'}
      opacity={skipped ? 0.7 : 1}
    >
      <HStack justify="space-between" mb={3}>
        <HStack>
          <Text>{icon}</Text>
          <Text fontWeight="semibold" color="white" fontSize="sm">{title}</Text>
          {skipped && <Badge colorScheme="gray" fontSize="xs">Skipped</Badge>}
        </HStack>
        <Button
          size="xs"
          variant="ghost"
          colorScheme="blue"
          leftIcon={<EditIcon />}
          onClick={() => onEdit(stepIndex)}
        >
          Edit
        </Button>
      </HStack>
      {children}
    </Box>
  );
}

function ReviewField({
  label,
  value,
  code,
  badge,
  badgeColor,
}: {
  label: string;
  value: string;
  code?: boolean;
  badge?: boolean;
  badgeColor?: string;
}) {
  return (
    <Box>
      <Text fontSize="xs" color="gray.500">{label}</Text>
      {badge ? (
        <Badge colorScheme={badgeColor || 'gray'} fontSize="xs" textTransform="capitalize">
          {value}
        </Badge>
      ) : code ? (
        <Code fontSize="xs" bg="transparent" color="blue.300" isTruncated maxW="100%">
          {value}
        </Code>
      ) : (
        <Text fontSize="sm" color="gray.200" isTruncated>
          {value}
        </Text>
      )}
    </Box>
  );
}

function StatusBadge({ accepted }: { accepted: boolean }) {
  return (
    <Badge colorScheme={accepted ? 'green' : 'red'} fontSize="xs">
      {accepted ? '✅ Accepted' : '❌ Pending'}
    </Badge>
  );
}
