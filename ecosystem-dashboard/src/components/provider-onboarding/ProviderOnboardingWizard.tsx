/**
 * Provider Onboarding Wizard
 * 5-step wizard for adding new LLM providers
 */

import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Progress,
  Text,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { Step1SelectProvider } from './Step1SelectProvider';
import { Step2ConfigureModels } from './Step2ConfigureModels';
import { Step2ConfigureMCPServer } from './Step2ConfigureMCPServer';
import { Step3APIConfiguration } from './Step3APIConfiguration';
import { Step4TestConnection } from './Step4TestConnection';
import { Step5ReviewDeploy } from './Step5ReviewDeploy';

interface ProviderOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: ProviderConfig) => void;
}

export interface ProviderConfig {
  provider: {
    id: string;
    name: string;
    baseUrl: string;
    authType: string;
  };
  models?: {
    modelId: string;
    enabled: boolean;
    useCases: string[];
    priority: number;
  }[];
  mcpServer?: {
    tools: any[];
    costPerCall: number;
    creditsPerMonth: number;
  };
  apiConfig?: {
    apiKey: string;
    apiKeyName?: string;
    projectId?: string;
    newProject?: {
      name: string;
      description?: string;
    };
    rateLimits: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    };
    costLimits: {
      dailyMax: number;
      perRequestMax: number;
    };
  };
  projects?: string[];
  testResults?: any;
}

export const ProviderOnboardingWizard: React.FC<ProviderOnboardingWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<Partial<ProviderConfig>>({});

  const borderColor = useSemanticToken('border.default');
  const subtleText = useSemanticToken('text.secondary');
  const activeStepColor = 'blue.500';

  const steps = [
    { number: 1, title: 'Select Provider' },
    { number: 2, title: 'Configure Models' },
    { number: 3, title: 'API Configuration' },
    { number: 4, title: 'Test Connection' },
    { number: 5, title: 'Review & Deploy' },
  ];

  const handleNext = (stepData: any) => {
    setConfig({ ...config, ...stepData });
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleDeploy = async () => {
    try {
      await onComplete(config as ProviderConfig);
      // onClose() is now handled in the parent after successful deployment
    } catch (error) {
      console.error('[Wizard] Deployment failed:', error);
      // Keep wizard open on error so user can retry
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" closeOnOverlayClick={false}>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent maxW="900px">
        <ModalHeader borderBottomWidth="1px" borderColor={borderColor} pb={4}>
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between">
              <Text fontSize="lg" fontWeight="600">
                Add New LLM Provider
              </Text>
              <Text fontSize="sm" color={subtleText}>
                Step {currentStep} of {steps.length}
              </Text>
            </HStack>

            {/* Progress Bar */}
            <VStack align="stretch" spacing={2}>
              <HStack spacing={2}>
                {steps.map((step, index) => (
                  <VStack key={step.number} flex="1" spacing={1}>
                    <Text
                      fontSize="xs"
                      fontWeight={currentStep === step.number ? '600' : '400'}
                      color={
                        currentStep >= step.number
                          ? activeStepColor
                          : subtleText
                      }
                    >
                      {step.title}
                    </Text>
                  </VStack>
                ))}
              </HStack>
              <Progress
                value={(currentStep / steps.length) * 100}
                size="sm"
                colorScheme="blue"
                borderRadius="full"
              />
            </VStack>
          </VStack>
        </ModalHeader>

        <ModalCloseButton />

        <ModalBody py={8} px={8}>
          {currentStep === 1 && (
            <Step1SelectProvider
              onNext={handleNext}
              initialData={config.provider}
            />
          )}
          {currentStep === 2 && (
            <>
              {/* Show MCP server config for MCP providers, models for LLM providers */}
              {config.provider?.id === 'tavily' ? (
                <Step2ConfigureMCPServer
                  provider={config.provider!}
                  onNext={handleNext}
                  onBack={handleBack}
                  initialData={config.models}
                />
              ) : (
                <Step2ConfigureModels
                  provider={config.provider!}
                  onNext={handleNext}
                  onBack={handleBack}
                  initialData={config.models}
                />
              )}
            </>
          )}
          {currentStep === 3 && (
            <Step3APIConfiguration
              provider={config.provider!}
              onNext={handleNext}
              onBack={handleBack}
              initialData={config.apiConfig}
            />
          )}
          {currentStep === 4 && (
            <Step4TestConnection
              provider={config.provider!}
              apiConfig={config.apiConfig}
              models={config.models || config.mcpServer?.tools || []}
              onNext={handleNext}
              onBack={handleBack}
              onSkip={() => setCurrentStep(5)}
            />
          )}
          {currentStep === 5 && (
            <Step5ReviewDeploy
              config={config as ProviderConfig}
              onDeploy={handleDeploy}
              onBack={handleBack}
            />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
