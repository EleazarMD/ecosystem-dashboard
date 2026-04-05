import React, { useState } from 'react';
import {
  Box,
  Button,
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
  Heading,
  Text,
  VStack,
  HStack,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import ProjectDetailsForm from './steps/ProjectDetailsForm';
import ServiceConfigurationForm from './steps/ServiceConfigurationForm';
import AIHDSIntegrationStep from './steps/AIHDSIntegrationStep';
import ConfigurationUpdatesForm from './steps/ConfigurationUpdatesForm';
import ComplianceScanStep from './steps/ComplianceScanStep';
import DocumentationSetupStep from './steps/DocumentationSetupStep';
import { ecosystemApi } from '@/lib/api';
import { ConfigUpdate } from '../../types/onboarding';
import { AIHDSOnboardingStepData } from '../../types/aihds-onboarding';

// Define the steps for the onboarding process
const steps = [
  { title: 'Project Details', description: 'Register your project' },
  { title: 'Service Configuration', description: 'Configure services and ports' },
  { title: 'AIHDS SDK Integration', description: 'Integrate agent SDK for ecosystem compliance' },
  { title: 'Configuration Updates', description: 'Update configuration files' },
  { title: 'Compliance Scan', description: 'Validate project setup' },
  { title: 'Documentation Setup', description: 'Initialize documentation' }
];

// Define the project data interface
export interface ProjectData {
  id: string;
  name: string;
  description: string;
  domain: string;
  category: 'service' | 'platform' | 'application';
  path: string;
  status: string;
}

// Define the service data interface
export interface ServiceData {
  name: string;
  port: number;
  description: string;
  type: string;
}

interface ProjectOnboardingWizardProps {
  onComplete: (projectId: string) => void;
  initialProjectData?: ProjectData;
}

const ProjectOnboardingWizard: React.FC<ProjectOnboardingWizardProps> = ({ onComplete, initialProjectData }) => {
  const { activeStep, setActiveStep, goToNext, goToPrevious } = useSteps({
    index: 0,
    count: steps.length,
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<ProjectData>(initialProjectData || {
    id: '',
    name: '',
    description: '',
    domain: '',
    category: 'application',
    path: '',
    status: 'planning'
  });
  const [services, setServices] = useState<ServiceData[]>([]);
  const [aihdsIntegration, setAIHDSIntegration] = useState<AIHDSOnboardingStepData | null>(null);
  const [configUpdates, setConfigUpdates] = useState<ConfigUpdate[]>([]);
  const [complianceScanId, setComplianceScanId] = useState<string | null>(null);
  const [documentationSetupId, setDocumentationSetupId] = useState<string | null>(null);
  
  const toast = useToast();
  const cardBg = useSemanticToken('surface.elevated');

  // Handle project details submission
  const handleProjectDetailsSubmit = async (data: ProjectData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await ecosystemApi.registerProject(data);
      if (response.success) {
        setProjectData(data);
        toast({
          title: 'Project registered',
          description: `Project ${data.name} has been registered successfully.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        goToNext();
      } else {
        throw new Error(response.message || 'Failed to register project');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while registering the project');
      toast({
        title: 'Registration failed',
        description: err.message || 'An error occurred while registering the project',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle service configuration submission
  const handleServiceConfigSubmit = async (serviceData: ServiceData[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await ecosystemApi.registerPorts({
        project_id: projectData.id,
        services: serviceData.map(service => ({
          name: service.name,
          port: service.port,
          description: service.description,
          service_type: service.type
        }))
      });
      
      if (response.success) {
        setServices(serviceData);
        toast({
          title: 'Services configured',
          description: `Services for ${projectData.name} have been configured successfully.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        goToNext();
      } else {
        throw new Error(response.message || 'Failed to configure services');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while configuring services');
      toast({
        title: 'Service configuration failed',
        description: err.message || 'An error occurred while configuring services',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle configuration updates submission
  const handleConfigUpdatesSubmit = async (updates: ConfigUpdate[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await ecosystemApi.updateProjectConfig({
        project_id: projectData.id,
        dryRun: false,
        updates: updates
      });
      
      if (response.success) {
        setConfigUpdates(updates);
        toast({
          title: 'Configuration updated',
          description: `Configuration files for ${projectData.name} have been updated successfully.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        goToNext();
      } else {
        throw new Error(response.message || 'Failed to update configuration');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating configuration');
      toast({
        title: 'Configuration update failed',
        description: err.message || 'An error occurred while updating configuration',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle compliance scan submission
  const handleComplianceScanSubmit = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await ecosystemApi.initiateComplianceScan(projectData.id);
      
      if (response.success) {
        setComplianceScanId(response.scan_id);
        toast({
          title: 'Compliance scan initiated',
          description: `Compliance scan for ${projectData.name} has been initiated successfully.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        goToNext();
      } else {
        throw new Error(response.message || 'Failed to initiate compliance scan');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while initiating compliance scan');
      toast({
        title: 'Compliance scan failed',
        description: err.message || 'An error occurred while initiating compliance scan',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle documentation setup submission
  const handleDocumentationSetupSubmit = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await ecosystemApi.setupDocumentation(projectData.id);
      
      if (response.success) {
        setDocumentationSetupId(response.operation_id);
        toast({
          title: 'Documentation setup initiated',
          description: `Documentation setup for ${projectData.name} has been initiated successfully.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // Complete the onboarding process
        onComplete(projectData.id);
      } else {
        throw new Error(response.message || 'Failed to setup documentation');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while setting up documentation');
      toast({
        title: 'Documentation setup failed',
        description: err.message || 'An error occurred while setting up documentation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle AIHDS SDK integration submission
  const handleAIHDSIntegrationSubmit = async (data: AIHDSOnboardingStepData) => {
    setAIHDSIntegration(data);
    toast({
      title: 'AIHDS SDK integration completed',
      description: data.agentDetection?.hasAgents 
        ? 'Agent components detected and SDK integrated successfully.'
        : 'No agent components detected - SDK integration skipped.',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    goToNext();
  };

  // Render the current step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return <ProjectDetailsForm initialData={projectData} onSubmit={handleProjectDetailsSubmit} isLoading={isLoading} />;
      case 1:
        return <ServiceConfigurationForm projectId={projectData.id} initialServices={services} onSubmit={handleServiceConfigSubmit} isLoading={isLoading} />;
      case 2:
        return <AIHDSIntegrationStep projectId={projectData.id} projectPath={projectData.path} onSubmit={handleAIHDSIntegrationSubmit} isLoading={isLoading} />;
      case 3:
        return <ConfigurationUpdatesForm projectId={projectData.id} initialUpdates={configUpdates} onSubmit={handleConfigUpdatesSubmit} isLoading={isLoading} />;
      case 4:
        return <ComplianceScanStep projectId={projectData.id} scanId={complianceScanId} onSubmit={handleComplianceScanSubmit} isLoading={isLoading} />;
      case 5:
        return <DocumentationSetupStep projectId={projectData.id} operationId={documentationSetupId} onSubmit={handleDocumentationSetupSubmit} isLoading={isLoading} />;
      default:
        return <Box>Unknown step</Box>;
    }
  };

  return (
    <Box p={4}>
      <VStack spacing={8} align="stretch">
        <Heading size="lg">Project Onboarding Wizard</Heading>
        <Text>Follow the steps below to onboard your project to the AI Homelab Ecosystem.</Text>
        
        {error && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            <AlertTitle>Error!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Stepper index={activeStep} colorScheme="blue">
          {steps.map((step, index) => (
            <Step key={index}>
              <StepIndicator>
                <StepStatus
                  complete={<StepIcon />}
                  incomplete={<StepNumber />}
                  active={<StepNumber />}
                />
              </StepIndicator>
              <Box flexShrink={0}>
                <StepTitle>{step.title}</StepTitle>
                <StepDescription>{step.description}</StepDescription>
              </Box>
              <StepSeparator />
            </Step>
          ))}
        </Stepper>
        
        <Card bg={cardBg} shadow="md" borderWidth="1px">
          <CardBody>
            {isLoading ? (
              <VStack spacing={4}>
                <Spinner size="xl" />
                <Text>Processing...</Text>
              </VStack>
            ) : (
              renderStepContent()
            )}
          </CardBody>
        </Card>
        
        <HStack justify="space-between">
          <Button
            onClick={goToPrevious}
            isDisabled={activeStep === 0 || isLoading}
            variant="outline"
          >
            Previous
          </Button>
          {/* Next button is handled by the individual step components */}
        </HStack>
      </VStack>
    </Box>
  );
};

export default ProjectOnboardingWizard;
