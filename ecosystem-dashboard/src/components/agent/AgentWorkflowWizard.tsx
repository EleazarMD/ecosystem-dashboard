/**
 * Agent Workflow Wizard Component
 * 
 * Provides guided step-by-step wizards for common agent tasks
 * with intelligent recommendations and context-aware assistance.
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Icon,
  Progress,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepIcon,
  StepNumber,
  StepTitle,
  StepDescription,
  StepSeparator,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Switch,
  Radio,
  RadioGroup,
  Stack,
  Alert,
  AlertIcon,
  Divider,
  Card,
  CardBody,
  useToast
} from '@chakra-ui/react';
import {
  FaMagic,
  FaRocket,
  FaShieldAlt,
  FaDatabase,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaArrowRight,
  FaArrowLeft
} from 'react-icons/fa';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  validation?: (data: any) => string | null;
  recommendations?: string[];
}

interface WizardConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType;
  category: string;
  estimatedTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  steps: WizardStep[];
}

// Step Components
const ServiceSelectionStep: React.FC<{ data: any; onChange: (data: any) => void }> = ({ data, onChange }) => (
  <VStack spacing={4} align="stretch">
    <Text fontSize="lg" fontWeight="bold">Select Services to Analyze</Text>
    <Text color={useSemanticToken('text.secondary')}>Choose which services you want to include in the root cause analysis.</Text>
    
    <FormControl>
      <FormLabel>Primary Service (experiencing issues)</FormLabel>
      <Select value={data.primaryService || ''} onChange={(e) => onChange({ ...data, primaryService: e.target.value })}>
        <option value="">Select service...</option>
        <option value="kg-api">Knowledge Graph API</option>
        <option value="ide-memory-mcp">IDE Memory MCP</option>
        <option value="ai-truth-engine">AI Truth Engine</option>
        <option value="dashboard-api">Dashboard API</option>
      </Select>
    </FormControl>

    <FormControl>
      <FormLabel>Related Services (optional)</FormLabel>
      <Stack spacing={2}>
        {['kg-api', 'ide-memory-mcp', 'ai-truth-engine', 'dashboard-api'].map(service => (
          <HStack key={service}>
            <Switch
              isChecked={data.relatedServices?.includes(service) || false}
              onChange={(e) => {
                const current = data.relatedServices || [];
                const updated = e.target.checked
                  ? [...current, service]
                  : current.filter(s => s !== service);
                onChange({ ...data, relatedServices: updated });
              }}
            />
            <Text>{service}</Text>
          </HStack>
        ))}
      </Stack>
    </FormControl>

    <Alert status="info">
      <AlertIcon />
      <Text fontSize="sm">
        Including related services helps identify cascading failures and dependency issues.
      </Text>
    </Alert>
  </VStack>
);

const TimeRangeStep: React.FC<{ data: any; onChange: (data: any) => void }> = ({ data, onChange }) => (
  <VStack spacing={4} align="stretch">
    <Text fontSize="lg" fontWeight="bold">Define Analysis Time Range</Text>
    <Text color={useSemanticToken('text.secondary')}>Specify when the issue started and how far back to analyze.</Text>
    
    <FormControl>
      <FormLabel>Issue Start Time</FormLabel>
      <Input
        type="datetime-local"
        value={data.startTime || ''}
        onChange={(e) => onChange({ ...data, startTime: e.target.value })}
      />
    </FormControl>

    <FormControl>
      <FormLabel>Analysis Window</FormLabel>
      <RadioGroup value={data.timeWindow || '1h'} onChange={(value) => onChange({ ...data, timeWindow: value })}>
        <Stack spacing={2}>
          <Radio value="30m">Last 30 minutes</Radio>
          <Radio value="1h">Last 1 hour</Radio>
          <Radio value="6h">Last 6 hours</Radio>
          <Radio value="24h">Last 24 hours</Radio>
          <Radio value="custom">Custom range</Radio>
        </Stack>
      </RadioGroup>
    </FormControl>

    {data.timeWindow === 'custom' && (
      <FormControl>
        <FormLabel>Custom End Time</FormLabel>
        <Input
          type="datetime-local"
          value={data.endTime || ''}
          onChange={(e) => onChange({ ...data, endTime: e.target.value })}
        />
      </FormControl>
    )}

    <Alert status="warning">
      <AlertIcon />
      <Text fontSize="sm">
        Longer time ranges provide more context but take longer to analyze.
      </Text>
    </Alert>
  </VStack>
);

const AnalysisConfigStep: React.FC<{ data: any; onChange: (data: any) => void }> = ({ data, onChange }) => (
  <VStack spacing={4} align="stretch">
    <Text fontSize="lg" fontWeight="bold">Configure Analysis Parameters</Text>
    <Text color={useSemanticToken('text.secondary')}>Fine-tune the analysis to focus on specific areas.</Text>
    
    <FormControl>
      <FormLabel>Analysis Depth</FormLabel>
      <RadioGroup value={data.depth || 'standard'} onChange={(value) => onChange({ ...data, depth: value })}>
        <Stack spacing={2}>
          <Radio value="quick">Quick (5-10 minutes) - Basic checks</Radio>
          <Radio value="standard">Standard (15-20 minutes) - Comprehensive analysis</Radio>
          <Radio value="deep">Deep (30+ minutes) - Full dependency analysis</Radio>
        </Stack>
      </RadioGroup>
    </FormControl>

    <FormControl>
      <FormLabel>Focus Areas</FormLabel>
      <Stack spacing={2}>
        {[
          { id: 'performance', label: 'Performance Metrics' },
          { id: 'logs', label: 'Error Logs' },
          { id: 'dependencies', label: 'Service Dependencies' },
          { id: 'resources', label: 'Resource Utilization' },
          { id: 'network', label: 'Network Connectivity' },
          { id: 'configuration', label: 'Configuration Changes' }
        ].map(area => (
          <HStack key={area.id}>
            <Switch
              isChecked={data.focusAreas?.includes(area.id) || false}
              onChange={(e) => {
                const current = data.focusAreas || [];
                const updated = e.target.checked
                  ? [...current, area.id]
                  : current.filter(a => a !== area.id);
                onChange({ ...data, focusAreas: updated });
              }}
            />
            <Text>{area.label}</Text>
          </HStack>
        ))}
      </Stack>
    </FormControl>

    <FormControl>
      <FormLabel>Additional Context (optional)</FormLabel>
      <Textarea
        value={data.context || ''}
        onChange={(e) => onChange({ ...data, context: e.target.value })}
        placeholder="Describe any recent changes, user reports, or other relevant information..."
        rows={3}
      />
    </FormControl>
  </VStack>
);

const ReviewStep: React.FC<{ data: any; onChange: (data: any) => void }> = ({ data }) => (
  <VStack spacing={4} align="stretch">
    <Text fontSize="lg" fontWeight="bold">Review Configuration</Text>
    <Text color={useSemanticToken('text.secondary')}>Verify your settings before starting the analysis.</Text>
    
    <Card>
      <CardBody>
        <VStack spacing={3} align="stretch">
          <HStack justify="space-between">
            <Text fontWeight="medium">Primary Service:</Text>
            <Badge colorScheme="blue">{data.primaryService || 'Not selected'}</Badge>
          </HStack>
          
          <HStack justify="space-between">
            <Text fontWeight="medium">Related Services:</Text>
            <Text fontSize="sm">{data.relatedServices?.length || 0} selected</Text>
          </HStack>
          
          <HStack justify="space-between">
            <Text fontWeight="medium">Time Window:</Text>
            <Badge variant="outline">{data.timeWindow || '1h'}</Badge>
          </HStack>
          
          <HStack justify="space-between">
            <Text fontWeight="medium">Analysis Depth:</Text>
            <Badge colorScheme="green">{data.depth || 'standard'}</Badge>
          </HStack>
          
          <HStack justify="space-between">
            <Text fontWeight="medium">Focus Areas:</Text>
            <Text fontSize="sm">{data.focusAreas?.length || 0} selected</Text>
          </HStack>
        </VStack>
      </CardBody>
    </Card>

    <Alert status="info">
      <AlertIcon />
      <VStack align="start" spacing={1}>
        <Text fontWeight="bold">Estimated Analysis Time:</Text>
        <Text fontSize="sm">
          {data.depth === 'quick' ? '5-10 minutes' : 
           data.depth === 'deep' ? '30+ minutes' : '15-20 minutes'}
        </Text>
      </VStack>
    </Alert>
  </VStack>
);

const wizardConfigs: WizardConfig[] = [
  {
    id: 'rca-wizard',
    title: 'Root Cause Analysis Wizard',
    description: 'Guided setup for comprehensive root cause analysis of service issues',
    icon: FaMagic,
    category: 'troubleshooting',
    estimatedTime: '5-10 minutes setup',
    difficulty: 'beginner',
    steps: [
      {
        id: 'service-selection',
        title: 'Service Selection',
        description: 'Choose services to analyze',
        component: ServiceSelectionStep,
        validation: (data) => data.primaryService ? null : 'Please select a primary service'
      },
      {
        id: 'time-range',
        title: 'Time Range',
        description: 'Define analysis period',
        component: TimeRangeStep
      },
      {
        id: 'analysis-config',
        title: 'Analysis Configuration',
        description: 'Configure analysis parameters',
        component: AnalysisConfigStep
      },
      {
        id: 'review',
        title: 'Review & Execute',
        description: 'Review settings and start analysis',
        component: ReviewStep
      }
    ]
  }
];

interface AgentWorkflowWizardProps {
  onExecuteWorkflow?: (wizardId: string, configuration: any) => void;
}

export const AgentWorkflowWizard: React.FC<AgentWorkflowWizardProps> = ({
  onExecuteWorkflow
}) => {
  const [selectedWizard, setSelectedWizard] = useState<WizardConfig | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<any>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const toast = useToast();

  const handleWizardSelect = (wizard: WizardConfig) => {
    setSelectedWizard(wizard);
    setCurrentStep(0);
    setWizardData({});
  };

  const handleNext = () => {
    if (!selectedWizard) return;

    const currentStepConfig = selectedWizard.steps[currentStep];
    if (currentStepConfig.validation) {
      const error = currentStepConfig.validation(wizardData);
      if (error) {
        toast({
          title: 'Validation Error',
          description: error,
          status: 'error',
          duration: 3000
        });
        return;
      }
    }

    if (currentStep < selectedWizard.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleExecute = async () => {
    if (!selectedWizard) return;

    setIsExecuting(true);
    try {
      await onExecuteWorkflow?.(selectedWizard.id, wizardData);
      toast({
        title: 'Workflow Started',
        description: 'Your workflow has been started successfully',
        status: 'success',
        duration: 3000
      });
      setSelectedWizard(null);
    } catch (error) {
      toast({
        title: 'Execution Failed',
        description: 'Failed to start workflow',
        status: 'error',
        duration: 3000
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'green';
      case 'intermediate': return 'yellow';
      case 'advanced': return 'red';
      default: return 'gray';
    }
  };

  if (!selectedWizard) {
    return (
      <Box>
        <VStack spacing={6} align="stretch">
          <HStack>
            <Icon as={FaMagic} />
            <Text fontSize="lg" fontWeight="bold">Workflow Wizards</Text>
            <Badge colorScheme="purple">Guided Setup</Badge>
          </HStack>

          <Text color={useSemanticToken('text.secondary')}>
            Step-by-step wizards to help you configure and execute complex workflows with ease.
          </Text>

          <VStack spacing={4} align="stretch">
            {wizardConfigs.map(wizard => {
              const IconComponent = wizard.icon;
              
              return (
                <Card key={wizard.id} cursor="pointer" onClick={() => handleWizardSelect(wizard)}>
                  <CardBody>
                    <HStack spacing={4}>
                      <Icon as={IconComponent} size="lg" color="blue.500" />
                      <VStack align="start" spacing={2} flex={1}>
                        <HStack justify="space-between" w="full">
                          <Text fontWeight="bold">{wizard.title}</Text>
                          <HStack>
                            <Badge colorScheme={getDifficultyColor(wizard.difficulty)}>
                              {wizard.difficulty}
                            </Badge>
                            <Badge variant="outline">{wizard.estimatedTime}</Badge>
                          </HStack>
                        </HStack>
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{wizard.description}</Text>
                        <HStack>
                          <Badge size="sm" variant="outline">{wizard.category}</Badge>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                            {wizard.steps.length} steps
                          </Text>
                        </HStack>
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>
              );
            })}
          </VStack>
        </VStack>
      </Box>
    );
  }

  const currentStepConfig = selectedWizard.steps[currentStep];
  const StepComponent = currentStepConfig.component;
  const progress = ((currentStep + 1) / selectedWizard.steps.length) * 100;

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Icon as={selectedWizard.icon} />
            <Text fontSize="lg" fontWeight="bold">{selectedWizard.title}</Text>
          </HStack>
          <Button variant="ghost" onClick={() => setSelectedWizard(null)}>
            Exit Wizard
          </Button>
        </HStack>

        {/* Progress */}
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              Step {currentStep + 1} of {selectedWizard.steps.length}
            </Text>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              {Math.round(progress)}% complete
            </Text>
          </HStack>
          <Progress value={progress} colorScheme="blue" />
        </VStack>

        {/* Stepper */}
        <Stepper index={currentStep} size="sm">
          {selectedWizard.steps.map((step, index) => (
            <Step key={step.id}>
              <StepIndicator>
                <StepStatus
                  complete={<StepIcon />}
                  incomplete={<StepNumber />}
                  active={<StepNumber />}
                />
              </StepIndicator>
              <Box flexShrink="0">
                <StepTitle>{step.title}</StepTitle>
                <StepDescription>{step.description}</StepDescription>
              </Box>
              <StepSeparator />
            </Step>
          ))}
        </Stepper>

        {/* Step Content */}
        <Card>
          <CardBody>
            <StepComponent data={wizardData} onChange={setWizardData} />
          </CardBody>
        </Card>

        {/* Navigation */}
        <HStack justify="space-between">
          <Button
            leftIcon={<FaArrowLeft />}
            onClick={handlePrevious}
            isDisabled={currentStep === 0}
            variant="outline"
          >
            Previous
          </Button>

          <HStack>
            {currentStep === selectedWizard.steps.length - 1 ? (
              <Button
                colorScheme="green"
                leftIcon={<FaRocket />}
                onClick={handleExecute}
                isLoading={isExecuting}
                loadingText="Starting..."
              >
                Execute Workflow
              </Button>
            ) : (
              <Button
                rightIcon={<FaArrowRight />}
                onClick={handleNext}
                colorScheme="blue"
              >
                Next
              </Button>
            )}
          </HStack>
        </HStack>
      </VStack>
    </Box>
  );
};
