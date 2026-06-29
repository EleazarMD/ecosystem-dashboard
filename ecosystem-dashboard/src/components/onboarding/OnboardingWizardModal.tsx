/**
 * OnboardingWizardModal
 * 
 * Multi-step onboarding wizard for provisioning new users/tenants.
 * Creates isolated Docker containers, configures local LLMs,
 * sets up email, ExoMind endpoints, and enforces zero-tolerance security.
 * 
 * Steps:
 * 1. Identity & Account
 * 2. Email Configuration
 * 3. Docker Infrastructure
 * 4. Local LLM Configuration
 * 5. Cloud Providers (Optional)
 * 6. ExoMind iOS Pairing
 * 7. Security & Compliance
 * 8. Review & Activate
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  HStack,
  VStack,
  Box,
  Text,
  Progress,
  useToast,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepIcon,
  StepNumber,
  StepTitle,
  StepDescription,
  StepSeparator,
  useSteps,
  Badge,
  Icon,
  Flex,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, LockIcon, SpinnerIcon } from '@chakra-ui/icons';

import {
  OnboardingState,
  OnboardingStepId,
  ONBOARDING_STEPS,
  IDENTITY_DEFAULTS,
  EMAIL_DEFAULTS,
  LOCAL_LLM_DEFAULTS,
  CLOUD_PROVIDER_DEFAULTS,
  EXOMIND_DEFAULTS,
  SECURITY_DEFAULTS,
  OnboardingSubmitResponse,
  IdentityFormData,
  EmailFormData,
  InfrastructureFormData,
  LocalLLMFormData,
  CloudProviderFormData,
  ExoMindFormData,
  SecurityFormData,
  getDefaultInfrastructure,
} from '@/lib/platform/onboarding-types';

// ============================================================
// Provisioning Progress Types
// ============================================================

interface ProvisioningStepState {
  stepName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  error?: string;
}

interface ProvisioningState {
  active: boolean;
  jobId: string | null;
  steps: ProvisioningStepState[];
  overallStatus: 'running' | 'completed' | 'failed';
  error: string | null;
}

import { IdentityStep } from './steps/IdentityStep';
import { EmailStep } from './steps/EmailStep';
import { InfrastructureStep } from './steps/InfrastructureStep';
import { LocalLLMStep } from './steps/LocalLLMStep';
import { CloudProviderStep } from './steps/CloudProviderStep';
import { ExoMindStep } from './steps/ExoMindStep';
import { SecurityStep } from './steps/SecurityStep';
import { ReviewStep } from './steps/ReviewStep';

// ============================================================
// Props
// ============================================================

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentUserId?: string;
  existingTenantId?: string;
  onComplete?: (response: OnboardingSubmitResponse) => void;
}

// ============================================================
// Validation
// ============================================================

function validateIdentity(data: IdentityFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.fullName || data.fullName.length < 2) errors.fullName = 'Name must be at least 2 characters';
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Valid email required';
  if (!data.password || data.password.length < 12) errors.password = 'Password must be at least 12 characters';
  if (data.password !== data.confirmPassword) errors.confirmPassword = 'Passwords do not match';
  if (data.accountType === 'child' && !data.dateOfBirth) errors.dateOfBirth = 'Date of birth required for child accounts';
  if (data.tenantMode === 'create') {
    if (!data.tenantName) errors.tenantName = 'Workspace name required';
    if (!data.tenantSlug || !/^[a-z0-9-]+$/.test(data.tenantSlug)) errors.tenantSlug = 'Slug must be lowercase with hyphens only';
  }
  return errors;
}

function validateEmail(data: EmailFormData): Record<string, string> {
  if (data.skipEmail) return {};
  const errors: Record<string, string> = {};
  if (!data.provider) errors.provider = 'Select an email provider';
  if (!data.emailAddress) errors.emailAddress = 'Email address required';
  if (data.provider === 'custom-imap') {
    if (!data.imapServer) errors.imapServer = 'IMAP server required';
    if (!data.smtpServer) errors.smtpServer = 'SMTP server required';
  }
  if (data.authMethod !== 'oauth2' && !data.password) errors.password = 'Password or app password required';
  return errors;
}

function validateSecurity(data: SecurityFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.zeroToleranceAccepted) errors.zeroToleranceAccepted = 'You must accept the zero-tolerance security policy';
  if (!data.jitAccessAcknowledged) errors.jitAccessAcknowledged = 'You must acknowledge JIT access controls';
  if (!data.auditLoggingAcknowledged) errors.auditLoggingAcknowledged = 'You must acknowledge audit logging';
  if (!data.dataIsolationAcknowledged) errors.dataIsolationAcknowledged = 'You must acknowledge data isolation';
  return errors;
}

function validateStep(stepId: OnboardingStepId, state: OnboardingState): Record<string, string> {
  switch (stepId) {
    case 'identity': return validateIdentity(state.identity);
    case 'email': return validateEmail(state.email);
    case 'security': return validateSecurity(state.security);
    default: return {};
  }
}

// ============================================================
// Component
// ============================================================

export function OnboardingWizardModal({
  isOpen,
  onClose,
  parentUserId,
  existingTenantId,
  onComplete,
}: OnboardingWizardModalProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [provisioning, setProvisioning] = useState<ProvisioningState | null>(null);

  // Initialize state
  const [state, setState] = useState<OnboardingState>(() => ({
    currentStep: 0,
    completedSteps: new Set(),
    identity: {
      ...IDENTITY_DEFAULTS,
      ...(parentUserId ? { parentUserId, accountType: 'child' as const } : {}),
      ...(existingTenantId ? { tenantMode: 'join' as const, existingTenantId } : {}),
    },
    email: { ...EMAIL_DEFAULTS },
    infrastructure: getDefaultInfrastructure('new-tenant', 'starter'),
    localLLMs: { ...LOCAL_LLM_DEFAULTS },
    cloudProviders: { ...CLOUD_PROVIDER_DEFAULTS },
    exomind: { ...EXOMIND_DEFAULTS },
    security: {
      ...SECURITY_DEFAULTS,
      ...(parentUserId ? {
        contentFilterLevel: 'strict' as const,
        parentalControlsEnabled: true,
      } : {}),
    },
  }));

  const steps = ONBOARDING_STEPS;
  const currentStepMeta = steps[state.currentStep];
  const isLastStep = state.currentStep === steps.length - 1;
  const isFirstStep = state.currentStep === 0;

  // Check if current step can be skipped (e.g., email for children)
  const canSkipCurrentStep = useMemo(() => {
    const meta = steps[state.currentStep];
    if (!meta) return false;
    if (!meta.required) return true;
    if (meta.skippableFor?.includes(state.identity.accountType)) return true;
    return false;
  }, [state.currentStep, state.identity.accountType, steps]);

  // Update a specific section of state
  const updateIdentity = useCallback((updates: Partial<IdentityFormData>) => {
    setState(prev => {
      const newIdentity = { ...prev.identity, ...updates };
      // Auto-generate slug from name
      if (updates.tenantName && !prev.identity.tenantSlug) {
        newIdentity.tenantSlug = updates.tenantName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
      // Auto-update infrastructure defaults when slug/tier changes
      const slug = newIdentity.tenantSlug || 'new-tenant';
      const infra = getDefaultInfrastructure(slug, newIdentity.tier);
      return { ...prev, identity: newIdentity, infrastructure: infra };
    });
  }, []);

  const updateEmail = useCallback((updates: Partial<EmailFormData>) => {
    setState(prev => ({ ...prev, email: { ...prev.email, ...updates } }));
  }, []);

  const updateInfrastructure = useCallback((updates: Partial<InfrastructureFormData>) => {
    setState(prev => ({ ...prev, infrastructure: { ...prev.infrastructure, ...updates } }));
  }, []);

  const updateLocalLLMs = useCallback((updates: Partial<LocalLLMFormData>) => {
    setState(prev => ({ ...prev, localLLMs: { ...prev.localLLMs, ...updates } }));
  }, []);

  const updateCloudProviders = useCallback((updates: Partial<CloudProviderFormData>) => {
    setState(prev => ({ ...prev, cloudProviders: { ...prev.cloudProviders, ...updates } }));
  }, []);

  const updateExoMind = useCallback((updates: Partial<ExoMindFormData>) => {
    setState(prev => ({ ...prev, exomind: { ...prev.exomind, ...updates } }));
  }, []);

  const updateSecurity = useCallback((updates: Partial<SecurityFormData>) => {
    setState(prev => ({ ...prev, security: { ...prev.security, ...updates } }));
  }, []);

  // Navigation
  const goNext = useCallback(() => {
    const errors = validateStep(currentStepMeta.id, state);
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      toast({
        title: 'Please fix the errors before continuing',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    setStepErrors({});
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, steps.length - 1),
      completedSteps: new Set([...prev.completedSteps, currentStepMeta.id]),
    }));
  }, [state, currentStepMeta, steps.length, toast]);

  const goBack = useCallback(() => {
    setStepErrors({});
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, []);

  const goToStep = useCallback((index: number) => {
    // Only allow going to completed steps or the next step
    if (index <= state.currentStep || state.completedSteps.has(steps[index]?.id)) {
      setStepErrors({});
      setState(prev => ({ ...prev, currentStep: index }));
    }
  }, [state.currentStep, state.completedSteps, steps]);

  // Submit — calls the unified onboarding provision API
  const handleSubmit = useCallback(async () => {
    // Final validation
    const securityErrors = validateSecurity(state.security);
    if (Object.keys(securityErrors).length > 0) {
      setStepErrors(securityErrors);
      toast({ title: 'Please complete security acknowledgements', status: 'warning', duration: 3000 });
      return;
    }

    setSubmitting(true);
    setProvisioning({
      active: true,
      jobId: null,
      steps: [],
      overallStatus: 'running',
      error: null,
    });

    try {
      // Map wizard state to the unified OnboardingFormData schema
      const formData = {
        name: state.identity.fullName,
        email: state.identity.email,
        password: state.identity.password,
        accountType: state.identity.accountType,
        dateOfBirth: state.identity.dateOfBirth,
        parentUserId: state.identity.parentUserId,
        tenantMode: state.identity.tenantMode,
        tenantName: state.identity.tenantName,
        tenantSlug: state.identity.tenantSlug,
        existingTenantId: state.identity.existingTenantId,
        targetTier: state.identity.tier,
        emailConfig: state.email.skipEmail ? undefined : {
          provider: state.email.provider || '',
          imapHost: state.email.imapServer,
          imapPort: state.email.imapPort,
          imapUsername: state.email.username,
          imapAppPassword: state.email.password,
        },
        infrastructure: {
          dockerEnabled: state.infrastructure.provisionAIGateway,
          neo4jEnabled: true,
        },
        llmConfig: {
          provider: 'local',
          model: state.localLLMs.defaultChatModel,
        },
        cloudProviders: state.cloudProviders.providers
          .filter(p => p.enabled && p.apiKey)
          .map(p => ({ provider: p.id, apiKey: p.apiKey })),
        exomindPairing: state.exomind.skipPairing ? undefined : {
          deviceName: state.exomind.tenantEndpointUrl,
          platform: 'ios',
        },
        security: {
          zeroToleranceAck: state.security.zeroToleranceAccepted,
          contentFilterLevel: state.security.contentFilterLevel,
          parentalControlsEnabled: state.security.parentalControlsEnabled,
          parentalControls: state.security.parentalControls,
        },
      };

      const res = await fetch('/api/onboarding/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData,
          targetTier: state.identity.tier,
          tenantId: state.identity.existingTenantId,
        }),
      });

      const data = await res.json();

      if (data.status === 'completed' || res.ok) {
        // Map provisioning steps for display
        const provSteps: ProvisioningStepState[] = (data.steps || []).map((s: any) => ({
          stepName: s.stepName,
          status: s.status,
          error: s.error,
        }));

        setProvisioning({
          active: false,
          jobId: data.jobId,
          steps: provSteps,
          overallStatus: data.status === 'completed' ? 'completed' : 'failed',
          error: data.error || null,
        });

        if (data.status === 'completed') {
          toast({
            title: 'Account provisioned successfully!',
            description: `Tenant is now active. ${data.steps?.length || 0} services enrolled.`,
            status: 'success',
            duration: 5000,
          });

          // Map to OnboardingSubmitResponse for callback compatibility
          const response: OnboardingSubmitResponse = {
            success: true,
            tenantId: data.tenantId,
            tenantSlug: state.identity.tenantSlug,
            provisioningSteps: provSteps.map(s => ({
              id: s.stepName,
              name: s.stepName,
              status: s.status === 'completed' ? 'completed' : s.status === 'failed' ? 'failed' : 'skipped',
            })),
          };
          onComplete?.(response);
          onClose();
        } else {
          toast({
            title: 'Provisioning failed',
            description: data.error || 'Some steps failed during provisioning.',
            status: 'error',
            duration: 7000,
          });
        }
      } else {
        setProvisioning({
          active: false,
          jobId: null,
          steps: [],
          overallStatus: 'failed',
          error: data.error || 'Provisioning failed',
        });
        toast({
          title: 'Onboarding failed',
          description: data.error || 'Please try again.',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      setProvisioning({
        active: false,
        jobId: null,
        steps: [],
        overallStatus: 'failed',
        error: 'Network error',
      });
      toast({
        title: 'Network error',
        description: 'Could not reach the server. Please try again.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  }, [state, toast, onComplete, onClose]);

  // Progress percentage
  const progressPercent = ((state.currentStep + 1) / steps.length) * 100;

  // Render current step content
  const renderStepContent = () => {
    switch (currentStepMeta.id) {
      case 'identity':
        return <IdentityStep data={state.identity} errors={stepErrors} onChange={updateIdentity} />;
      case 'email':
        return <EmailStep data={state.email} errors={stepErrors} accountType={state.identity.accountType} onChange={updateEmail} />;
      case 'infrastructure':
        return <InfrastructureStep data={state.infrastructure} tier={state.identity.tier} slug={state.identity.tenantSlug || 'new-tenant'} onChange={updateInfrastructure} />;
      case 'local-llms':
        return <LocalLLMStep data={state.localLLMs} onChange={updateLocalLLMs} />;
      case 'cloud-providers':
        return <CloudProviderStep data={state.cloudProviders} accountType={state.identity.accountType} onChange={updateCloudProviders} />;
      case 'exomind':
        return <ExoMindStep data={state.exomind} tenantSlug={state.identity.tenantSlug || ''} onChange={updateExoMind} />;
      case 'security':
        return <SecurityStep data={state.security} errors={stepErrors} accountType={state.identity.accountType} onChange={updateSecurity} />;
      case 'review':
        return <ReviewStep state={state} onGoToStep={goToStep} />;
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="6xl"
      scrollBehavior="inside"
      closeOnOverlayClick={false}
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(8px)" />
      <ModalContent
        bg="gray.900"
        borderColor="gray.700"
        borderWidth="1px"
        borderRadius="xl"
        maxH="90vh"
      >
        {/* Header */}
        <ModalHeader borderBottomWidth="1px" borderColor="gray.700" pb={4}>
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <VStack align="start" spacing={0}>
                <Text fontSize="xl" fontWeight="bold" color="white">
                  {currentStepMeta.icon} {currentStepMeta.label}
                </Text>
                <Text fontSize="sm" color="gray.400">
                  {currentStepMeta.description}
                </Text>
              </VStack>
              <Badge
                colorScheme={state.identity.accountType === 'child' ? 'purple' : 'blue'}
                fontSize="sm"
                px={3}
                py={1}
                borderRadius="full"
              >
                {state.identity.accountType === 'child' ? '👶 Child Account' : '👤 Adult Account'}
              </Badge>
            </HStack>

            {/* Step Progress */}
            <Progress
              value={progressPercent}
              size="sm"
              colorScheme="blue"
              borderRadius="full"
              bg="gray.800"
            />
            <HStack spacing={1} justify="center" flexWrap="wrap">
              {steps.map((step, idx) => {
                const isCompleted = state.completedSteps.has(step.id);
                const isCurrent = idx === state.currentStep;
                const isSkippable = step.skippableFor?.includes(state.identity.accountType);
                return (
                  <Box
                    key={step.id}
                    px={2}
                    py={1}
                    borderRadius="md"
                    bg={isCurrent ? 'blue.900' : isCompleted ? 'green.900' : 'gray.800'}
                    borderWidth="1px"
                    borderColor={isCurrent ? 'blue.500' : isCompleted ? 'green.500' : 'gray.700'}
                    cursor={isCompleted || idx <= state.currentStep ? 'pointer' : 'default'}
                    opacity={idx > state.currentStep && !isCompleted ? 0.5 : 1}
                    onClick={() => goToStep(idx)}
                    _hover={isCompleted || idx <= state.currentStep ? { borderColor: 'blue.400' } : {}}
                  >
                    <HStack spacing={1}>
                      <Text fontSize="xs">
                        {isCompleted ? '✅' : isSkippable ? '⏭️' : step.icon}
                      </Text>
                      <Text fontSize="xs" color={isCurrent ? 'blue.200' : isCompleted ? 'green.200' : 'gray.500'} display={{ base: 'none', md: 'block' }}>
                        {step.label}
                      </Text>
                    </HStack>
                  </Box>
                );
              })}
            </HStack>
          </VStack>
        </ModalHeader>

        <ModalCloseButton color="gray.400" />

        {/* Body */}
        <ModalBody py={6} overflowY="auto">
          {provisioning && provisioning.overallStatus !== 'running' ? (
            <VStack spacing={4} align="stretch">
              <Alert
                status={provisioning.overallStatus === 'completed' ? 'success' : 'error'}
                borderRadius="md"
              >
                <AlertIcon />
                <AlertTitle>
                  {provisioning.overallStatus === 'completed' ? 'Provisioning Complete!' : 'Provisioning Failed'}
                </AlertTitle>
                <AlertDescription>
                  {provisioning.error || `${provisioning.steps.filter(s => s.status === 'completed').length} of ${provisioning.steps.length} steps completed.`}
                </AlertDescription>
              </Alert>
              <VStack spacing={2} align="stretch">
                {provisioning.steps.map((step, idx) => (
                  <HStack key={idx} spacing={3} px={4} py={2} borderRadius="md" bg="gray.800">
                    {step.status === 'completed' && <CheckCircleIcon color="green.400" />}
                    {step.status === 'failed' && <WarningIcon color="red.400" />}
                    {step.status === 'skipped' && <Text color="gray.500">⏭️</Text>}
                    {step.status === 'in_progress' && <Spinner size="sm" color="blue.400" />}
                    {step.status === 'pending' && <Text color="gray.600">○</Text>}
                    <Box flex={1}>
                      <Text fontSize="sm" color="gray.300">{step.stepName}</Text>
                      {step.error && (
                        <Text fontSize="xs" color="red.400">{step.error}</Text>
                      )}
                    </Box>
                  </HStack>
                ))}
              </VStack>
              {provisioning.overallStatus === 'completed' && (
                <Button colorScheme="green" onClick={onClose} leftIcon={<CheckCircleIcon />}>
                  Done
                </Button>
              )}
              {provisioning.overallStatus === 'failed' && (
                <Button colorScheme="blue" onClick={() => setProvisioning(null)}>
                  Back to Wizard
                </Button>
              )}
            </VStack>
          ) : provisioning && provisioning.active ? (
            <VStack spacing={4} py={8}>
              <Spinner size="xl" color="blue.400" />
              <Text fontSize="lg" color="gray.300">Provisioning your account...</Text>
              <Text fontSize="sm" color="gray.500">This may take 30-60 seconds while we set up your services.</Text>
            </VStack>
          ) : (
            renderStepContent()
          )}
        </ModalBody>

        {/* Footer */}
        <ModalFooter borderTopWidth="1px" borderColor="gray.700" pt={4}>
          <HStack w="full" justify="space-between">
            <HStack>
              <Text fontSize="sm" color="gray.500">
                Step {state.currentStep + 1} of {steps.length}
              </Text>
              {!currentStepMeta.required && (
                <Badge colorScheme="yellow" variant="subtle" fontSize="xs">
                  Optional
                </Badge>
              )}
            </HStack>
            <HStack spacing={3}>
              {!isFirstStep && (
                <Button
                  variant="ghost"
                  color="gray.300"
                  onClick={goBack}
                  isDisabled={submitting}
                >
                  Back
                </Button>
              )}
              {canSkipCurrentStep && !isLastStep && (
                <Button
                  variant="outline"
                  colorScheme="gray"
                  onClick={goNext}
                  isDisabled={submitting}
                >
                  Skip
                </Button>
              )}
              {isLastStep ? (
                <Button
                  colorScheme="green"
                  onClick={handleSubmit}
                  isLoading={submitting}
                  loadingText="Provisioning..."
                  leftIcon={<CheckCircleIcon />}
                >
                  Activate Account
                </Button>
              ) : (
                <Button
                  colorScheme="blue"
                  onClick={goNext}
                  isDisabled={submitting}
                >
                  Continue
                </Button>
              )}
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default OnboardingWizardModal;
