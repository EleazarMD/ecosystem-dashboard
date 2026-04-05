import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  Progress,
  Card,
  CardBody,
  Radio,
  RadioGroup,
  Stack,
  Checkbox,
  useToast,
  Divider
} from '@chakra-ui/react';

interface ProjectOnboardingWizardProps {
  onComplete: () => void;
}

interface ProjectFormData {
  name: string;
  description: string;
  type: 'platform' | 'service' | 'ai-system' | 'infrastructure';
  repository: string;
  framework: string;
  aiComponents: string[];
  monitoring: boolean;
  documentation: boolean;
  testing: boolean;
}

const ProjectOnboardingWizard: React.FC<ProjectOnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    type: 'service',
    repository: '',
    framework: '',
    aiComponents: [],
    monitoring: true,
    documentation: true,
    testing: true
  });
  const toast = useToast();

  const totalSteps = 4;
  const progressPercentage = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleInputChange = (field: keyof ProjectFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAIComponentToggle = (component: string) => {
    const updated = formData.aiComponents.includes(component)
      ? formData.aiComponents.filter(c => c !== component)
      : [...formData.aiComponents, component];
    handleInputChange('aiComponents', updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Project Created Successfully!',
        description: `${formData.name} has been onboarded to the AI Homelab Ecosystem.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      onComplete();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create project. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.name.trim() && formData.description.trim();
      case 2:
        return formData.type && formData.framework;
      case 3:
        return formData.repository.trim();
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <VStack spacing={4}>
            <Text fontSize="lg" fontWeight="semibold" alignSelf="start">
              Project Information
            </Text>
            <FormControl isRequired>
              <FormLabel>Project Name</FormLabel>
              <Input
                placeholder="Enter project name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Description</FormLabel>
              <Textarea
                placeholder="Describe your project's purpose and goals"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
              />
            </FormControl>
          </VStack>
        );

      case 2:
        return (
          <VStack spacing={4}>
            <Text fontSize="lg" fontWeight="semibold" alignSelf="start">
              Project Type & Framework
            </Text>
            <FormControl isRequired>
              <FormLabel>Project Type</FormLabel>
              <RadioGroup
                value={formData.type}
                onChange={(value) => handleInputChange('type', value)}
              >
                <Stack spacing={3}>
                  <Radio value="platform">Platform - User-facing applications</Radio>
                  <Radio value="service">Service - Backend microservice</Radio>
                  <Radio value="ai-system">AI System - ML/AI specific system</Radio>
                  <Radio value="infrastructure">Infrastructure - DevOps/Infrastructure</Radio>
                </Stack>
              </RadioGroup>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Framework/Technology</FormLabel>
              <Select
                placeholder="Select primary framework"
                value={formData.framework}
                onChange={(e) => handleInputChange('framework', e.target.value)}
              >
                <option value="nextjs">Next.js</option>
                <option value="fastapi">FastAPI</option>
                <option value="flask">Flask</option>
                <option value="react">React</option>
                <option value="node">Node.js</option>
                <option value="python">Python</option>
                <option value="docker">Docker/Containerized</option>
                <option value="kubernetes">Kubernetes</option>
                <option value="other">Other</option>
              </Select>
            </FormControl>
          </VStack>
        );

      case 3:
        return (
          <VStack spacing={4}>
            <Text fontSize="lg" fontWeight="semibold" alignSelf="start">
              Repository & AI Components
            </Text>
            <FormControl isRequired>
              <FormLabel>Repository URL</FormLabel>
              <Input
                placeholder="https://github.com/user/project or local path"
                value={formData.repository}
                onChange={(e) => handleInputChange('repository', e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>AI Components (Select all that apply)</FormLabel>
              <Stack spacing={2}>
                {[
                  'Large Language Models (LLMs)',
                  'Vector Embeddings',
                  'Knowledge Graphs',
                  'Computer Vision',
                  'Natural Language Processing',
                  'Recommendation Systems',
                  'Reinforcement Learning',
                  'MLOps Pipeline'
                ].map(component => (
                  <Checkbox
                    key={component}
                    isChecked={formData.aiComponents.includes(component)}
                    onChange={() => handleAIComponentToggle(component)}
                  >
                    {component}
                  </Checkbox>
                ))}
              </Stack>
            </FormControl>
          </VStack>
        );

      case 4:
        return (
          <VStack spacing={4}>
            <Text fontSize="lg" fontWeight="semibold" alignSelf="start">
              Setup Options
            </Text>
            <Card w="full">
              <CardBody>
                <VStack spacing={4}>
                  <Checkbox
                    isChecked={formData.monitoring}
                    onChange={(e) => handleInputChange('monitoring', e.target.checked)}
                  >
                    <Box>
                      <Text fontWeight="medium">Enable Monitoring</Text>
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                        Set up health checks and performance monitoring
                      </Text>
                    </Box>
                  </Checkbox>
                  <Divider />
                  <Checkbox
                    isChecked={formData.documentation}
                    onChange={(e) => handleInputChange('documentation', e.target.checked)}
                  >
                    <Box>
                      <Text fontWeight="medium">Generate Documentation</Text>
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                        Auto-generate API docs and project documentation
                      </Text>
                    </Box>
                  </Checkbox>
                  <Divider />
                  <Checkbox
                    isChecked={formData.testing}
                    onChange={(e) => handleInputChange('testing', e.target.checked)}
                  >
                    <Box>
                      <Text fontWeight="medium">Setup Testing Framework</Text>
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                        Configure automated testing and CI/CD integration
                      </Text>
                    </Box>
                  </Checkbox>
                </VStack>
              </CardBody>
            </Card>
            
            <Alert status="info">
              <AlertIcon />
              <Box>
                <Text fontWeight="medium">Ready to onboard!</Text>
                <Text fontSize="sm">
                  Your project will be registered in the AI Homelab Ecosystem with MCP integration.
                </Text>
              </Box>
            </Alert>
          </VStack>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Progress Bar */}
      <Box mb={6}>
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="medium">Step {step} of {totalSteps}</Text>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{Math.round(progressPercentage)}% Complete</Text>
        </HStack>
        <Progress value={progressPercentage} colorScheme="blue" borderRadius="full" />
      </Box>

      {/* Step Content */}
      <Box minHeight="400px">
        {renderStep()}
      </Box>

      {/* Navigation Buttons */}
      <HStack justify="space-between" mt={6}>
        <Button
          variant="outline"
          onClick={handlePrevious}
          isDisabled={step === 1 || loading}
        >
          Previous
        </Button>
        
        {step === totalSteps ? (
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="Creating Project..."
            isDisabled={!isStepValid()}
          >
            Create Project
          </Button>
        ) : (
          <Button
            colorScheme="blue"
            onClick={handleNext}
            isDisabled={!isStepValid() || loading}
          >
            Next
          </Button>
        )}
      </HStack>
    </Box>
  );
};

export default ProjectOnboardingWizard;
