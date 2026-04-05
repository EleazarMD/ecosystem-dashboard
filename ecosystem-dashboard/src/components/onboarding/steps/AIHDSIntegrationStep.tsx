import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Heading,
  List,
  ListItem,
  ListIcon,
  Progress,
  Spinner,
  useToast,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
  Divider,
  Icon,
  Tooltip
} from '@chakra-ui/react';
import { CheckIcon, WarningIcon, InfoIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { FaRobot, FaPython, FaNodeJs, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { ecosystemApi } from '@/lib/api';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  AgentDetectionResponse,
  AIHDSIntegrationRequest,
  AIHDSIntegrationResponse,
  AIHDSValidationResponse,
  AIHDSValidationIssue
} from '@/types/aihds-onboarding';

interface AIHDSIntegrationStepProps {
  projectId: string;
  projectPath: string;
  onSubmit: (data: {
    agentDetection: AgentDetectionResponse;
    sdkIntegration: AIHDSIntegrationResponse;
    validation: AIHDSValidationResponse;
  }) => void;
  isLoading: boolean;
}

const AIHDSIntegrationStep: React.FC<AIHDSIntegrationStepProps> = ({
  projectId,
  projectPath,
  onSubmit,
  isLoading: externalLoading
}) => {
  const [currentStep, setCurrentStep] = useState<'detection' | 'integration' | 'validation' | 'complete'>('detection');
  const [isLoading, setIsLoading] = useState(false);
  const [agentDetection, setAgentDetection] = useState<AgentDetectionResponse | null>(null);
  const [sdkIntegration, setSDKIntegration] = useState<AIHDSIntegrationResponse | null>(null);
  const [validation, setValidation] = useState<AIHDSValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const toast = useToast();

  // Auto-start agent detection when component mounts
  useEffect(() => {
    if (projectId && projectPath) {
      detectAgents();
    }
  }, [projectId, projectPath]);

  const detectAgents = async () => {
    if (!projectId || !projectPath) {
      setError('Project ID and path are required for agent detection');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ecosystemApi.detectAgents(projectId, projectPath);
      
      setAgentDetection(result);
      
      if (result.success && result.hasAgents) {
        toast({
          title: 'Agents detected!',
          description: `Found ${result.agentTypes.length} agent type(s) in your project.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setCurrentStep('integration');
      } else {
        toast({
          title: 'No agents detected',
          description: 'Your project doesn\'t appear to have agent components. AIHDS SDK integration will be skipped.',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
        setCurrentStep('complete');
        // Call onSubmit with null values to indicate no integration needed
        onSubmit({
          agentDetection: result,
          sdkIntegration: { success: true, sdkInstalled: false, configurationCreated: false, templateFiles: [], nextSteps: [] },
          validation: { success: true, isValid: true, sdkInstalled: false, configurationComplete: false, usageDetected: false, bestPracticesFollowed: true, issues: [], summary: { totalIssues: 0, errors: 0, warnings: 0, infos: 0 } }
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to detect agents');
      toast({
        title: 'Agent detection failed',
        description: err.message || 'Failed to detect agents in your project',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const integrateSDK = async () => {
    if (!projectId || !projectPath || !agentDetection) {
      setError('Project ID, path, and agent detection are required for SDK integration');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Determine language from project structure
      const language = agentDetection.agentFiles.some(f => f.endsWith('.py')) ? 'python' : 'javascript';
      
      const request: AIHDSIntegrationRequest = {
        project_id: projectId,
        language: language as 'python' | 'javascript' | 'typescript',
        sdkVersion: agentDetection.recommendedSDKVersion || '1.0.1',
        agentTypes: agentDetection.agentTypes
      };
      
      const result = await ecosystemApi.integrateAIHDSSDK(request);
      
      setSDKIntegration(result);
      
      if (result.success) {
        toast({
          title: 'AIHDS SDK integrated!',
          description: 'SDK has been successfully installed and configured.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setCurrentStep('validation');
      } else {
        throw new Error(result.error || 'SDK integration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to integrate AIHDS SDK');
      toast({
        title: 'SDK integration failed',
        description: err.message || 'Failed to integrate AIHDS SDK',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateIntegration = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ecosystemApi.validateAIHDSIntegration({
        project_id: projectId,
        project_path: projectPath
      });
      
      setValidation(result);
      
      if (result.success && result.isValid) {
        toast({
          title: 'Validation successful!',
          description: 'AIHDS SDK integration is properly configured.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setCurrentStep('complete');
        
        // Call onSubmit with all collected data
        if (agentDetection && sdkIntegration) {
          onSubmit({
            agentDetection,
            sdkIntegration,
            validation: result
          });
        }
      } else {
        toast({
          title: 'Validation issues found',
          description: `Found ${result.summary.totalIssues} issue(s) that need attention.`,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to validate AIHDS integration');
      toast({
        title: 'Validation failed',
        description: err.message || 'Failed to validate AIHDS integration',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'detection':
        return FaRobot;
      case 'integration':
        return agentDetection?.agentFiles.some(f => f.endsWith('.py')) ? FaPython : FaNodeJs;
      case 'validation':
        return FaCheckCircle;
      default:
        return CheckIcon;
    }
  };

  const renderValidationIssues = (issues: AIHDSValidationIssue[]) => {
    const groupedIssues = issues.reduce((acc, issue) => {
      if (!acc[issue.type]) acc[issue.type] = [];
      acc[issue.type].push(issue);
      return acc;
    }, {} as Record<string, AIHDSValidationIssue[]>);

    return (
      <Accordion allowMultiple>
        {Object.entries(groupedIssues).map(([type, typeIssues]) => (
          <AccordionItem key={type}>
            <AccordionButton>
              <Box flex="1" textAlign="left">
                <HStack>
                  <Icon 
                    as={type === 'error' ? FaExclamationTriangle : WarningIcon} 
                    color={type === 'error' ? 'red.500' : type === 'warning' ? 'orange.500' : 'blue.500'}
                  />
                  <Text fontWeight="medium">
                    {type.charAt(0).toUpperCase() + type.slice(1)}s ({typeIssues.length})
                  </Text>
                </HStack>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <VStack align="stretch" spacing={3}>
                {typeIssues.map((issue, index) => (
                  <Card key={index} size="sm" variant="outline">
                    <CardBody>
                      <VStack align="stretch" spacing={2}>
                        <HStack justify="space-between">
                          <Badge colorScheme={issue.category === 'installation' ? 'red' : issue.category === 'configuration' ? 'orange' : 'blue'}>
                            {issue.category}
                          </Badge>
                          {issue.autoFixable && (
                            <Badge colorScheme="green" variant="outline">Auto-fixable</Badge>
                          )}
                        </HStack>
                        <Text fontSize="sm">{issue.description}</Text>
                        {issue.file_path && (
                          <Code fontSize="xs" colorScheme="gray">{issue.file_path}</Code>
                        )}
                        <Alert status="info" size="sm">
                          <AlertIcon />
                          <Text fontSize="xs">{issue.recommendation}</Text>
                        </Alert>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };

  if (externalLoading || isLoading) {
    return (
      <VStack spacing={4} py={8}>
        <Spinner size="xl" />
        <Text>
          {currentStep === 'detection' && 'Detecting agent components...'}
          {currentStep === 'integration' && 'Integrating AIHDS SDK...'}
          {currentStep === 'validation' && 'Validating integration...'}
        </Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="md" mb={2}>AIHDS SDK Integration</Heading>
        <Text color={useSemanticToken('text.secondary')}>
          Integrate the AI Homelab Data Services SDK for proper ecosystem agent management.
        </Text>
      </Box>

      {error && (
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Progress indicator */}
      <Card variant="outline">
        <CardBody>
          <VStack spacing={4}>
            <HStack justify="space-between" w="full">
              <Text fontWeight="medium">Integration Progress</Text>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                Step {currentStep === 'detection' ? 1 : currentStep === 'integration' ? 2 : currentStep === 'validation' ? 3 : 4} of 4
              </Text>
            </HStack>
            <Progress 
              value={currentStep === 'detection' ? 25 : currentStep === 'integration' ? 50 : currentStep === 'validation' ? 75 : 100} 
              w="full" 
              colorScheme="blue"
            />
          </VStack>
        </CardBody>
      </Card>

      {/* Agent Detection Results */}
      {agentDetection && (
        <Card variant="outline">
          <CardHeader>
            <HStack>
              <Icon as={FaRobot} color="blue.500" />
              <Heading size="sm">Agent Detection Results</Heading>
              <Badge colorScheme={agentDetection.hasAgents ? 'green' : 'gray'}>
                {agentDetection.hasAgents ? 'Agents Found' : 'No Agents'}
              </Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            {agentDetection.hasAgents ? (
              <VStack align="stretch" spacing={3}>
                <Text><strong>Agent Types:</strong> {agentDetection.agentTypes.join(', ')}</Text>
                <Text><strong>Agent Files:</strong></Text>
                <List spacing={1} ml={4}>
                  {agentDetection.agentFiles.map((file, index) => (
                    <ListItem key={index} fontSize="sm">
                      <ListIcon as={CheckIcon} color="green.500" />
                      <Code>{file}</Code>
                    </ListItem>
                  ))}
                </List>
                <Text><strong>Recommended SDK Version:</strong> {agentDetection.recommendedSDKVersion}</Text>
              </VStack>
            ) : (
              <Text>No agent components detected in this project.</Text>
            )}
          </CardBody>
        </Card>
      )}

      {/* SDK Integration Results */}
      {sdkIntegration && (
        <Card variant="outline">
          <CardHeader>
            <HStack>
              <Icon as={getStepIcon('integration')} color="green.500" />
              <Heading size="sm">SDK Integration Results</Heading>
              <Badge colorScheme={sdkIntegration.success ? 'green' : 'red'}>
                {sdkIntegration.success ? 'Success' : 'Failed'}
              </Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <HStack>
                <Text><strong>SDK Installed:</strong></Text>
                <Badge colorScheme={sdkIntegration.sdkInstalled ? 'green' : 'red'}>
                  {sdkIntegration.sdkInstalled ? 'Yes' : 'No'}
                </Badge>
              </HStack>
              <HStack>
                <Text><strong>Configuration Created:</strong></Text>
                <Badge colorScheme={sdkIntegration.configurationCreated ? 'green' : 'red'}>
                  {sdkIntegration.configurationCreated ? 'Yes' : 'No'}
                </Badge>
              </HStack>
              {sdkIntegration.templateFiles.length > 0 && (
                <>
                  <Text><strong>Template Files Created:</strong></Text>
                  <List spacing={1} ml={4}>
                    {sdkIntegration.templateFiles.map((file, index) => (
                      <ListItem key={index} fontSize="sm">
                        <ListIcon as={CheckIcon} color="green.500" />
                        <Code>{file}</Code>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
              {sdkIntegration.nextSteps.length > 0 && (
                <>
                  <Text><strong>Next Steps:</strong></Text>
                  <List spacing={1} ml={4}>
                    {sdkIntegration.nextSteps.map((step, index) => (
                      <ListItem key={index} fontSize="sm">
                        <ListIcon as={InfoIcon} color="blue.500" />
                        {step}
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Validation Results */}
      {validation && (
        <Card variant="outline">
          <CardHeader>
            <HStack>
              <Icon as={FaCheckCircle} color={validation.isValid ? 'green.500' : 'orange.500'} />
              <Heading size="sm">Validation Results</Heading>
              <Badge colorScheme={validation.isValid ? 'green' : 'orange'}>
                {validation.isValid ? 'Valid' : 'Issues Found'}
              </Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <HStack wrap="wrap" spacing={4}>
                <Badge colorScheme={validation.sdkInstalled ? 'green' : 'red'}>
                  SDK: {validation.sdkInstalled ? 'Installed' : 'Missing'}
                </Badge>
                <Badge colorScheme={validation.configurationComplete ? 'green' : 'orange'}>
                  Config: {validation.configurationComplete ? 'Complete' : 'Incomplete'}
                </Badge>
                <Badge colorScheme={validation.usageDetected ? 'green' : 'orange'}>
                  Usage: {validation.usageDetected ? 'Detected' : 'Not Found'}
                </Badge>
                <Badge colorScheme={validation.bestPracticesFollowed ? 'green' : 'orange'}>
                  Best Practices: {validation.bestPracticesFollowed ? 'Followed' : 'Issues'}
                </Badge>
              </HStack>

              {validation.issues.length > 0 && (
                <>
                  <Divider />
                  <Text fontWeight="medium">Issues Found ({validation.summary.totalIssues})</Text>
                  {renderValidationIssues(validation.issues)}
                </>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Action Buttons */}
      <HStack justify="space-between">
        <Button
          variant="outline"
          onClick={() => window.open('/shared/aihds-client-sdk/docs/ecosystem/ONBOARDING_INTEGRATION.md', '_blank')}
          leftIcon={<ExternalLinkIcon />}
        >
          View Integration Guide
        </Button>
        
        <HStack>
          {currentStep === 'integration' && agentDetection?.hasAgents && (
            <Button
              colorScheme="blue"
              onClick={integrateSDK}
              isLoading={isLoading}
              loadingText="Integrating..."
            >
              Integrate AIHDS SDK
            </Button>
          )}
          
          {currentStep === 'validation' && (
            <Button
              colorScheme="blue"
              onClick={validateIntegration}
              isLoading={isLoading}
              loadingText="Validating..."
            >
              Validate Integration
            </Button>
          )}
          
          {currentStep === 'complete' && (
            <Button
              colorScheme="green"
              onClick={() => {
                if (agentDetection && sdkIntegration && validation) {
                  onSubmit({ agentDetection, sdkIntegration, validation });
                }
              }}
              rightIcon={<CheckIcon />}
            >
              Continue to Next Step
            </Button>
          )}
        </HStack>
      </HStack>
    </VStack>
  );
};

export default AIHDSIntegrationStep;
