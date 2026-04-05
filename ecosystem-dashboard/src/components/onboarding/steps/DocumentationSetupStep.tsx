import React, { useState, useEffect } from 'react';
import {
  VStack,
  Button,
  Box,
  Heading,
  Text,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  List,
  ListItem,
  ListIcon,
  Badge,
  Code,
  Spinner,
  useToast,
  Checkbox,
  FormControl,
  FormLabel,
  Select,
  HStack,
  Link,
  Icon
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, InfoIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { ecosystemApi } from '@/lib/api';
import { DocumentationSetupStatusResponse } from '@/types/onboarding';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface DocumentationSetupStepProps {
  projectId: string;
  operationId: string | null;
  onSubmit: () => void;
  isLoading: boolean;
}

const DocumentationSetupStep: React.FC<DocumentationSetupStepProps> = ({
  projectId,
  operationId,
  onSubmit,
  isLoading: isSubmitting
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [setupResult, setSetupResult] = useState<DocumentationSetupStatusResponse | null>(null);
  const [activeOperationId, setActiveOperationId] = useState<string | null>(operationId);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [docOptions, setDocOptions] = useState({
    includeReadme: true,
    includeContributing: true,
    includeArchitecture: true,
    includeApiDocs: true,
    includeUsage: true,
    template: 'standard'
  });
  
  const toast = useToast();

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Poll for setup status when operationId is available
  useEffect(() => {
    if (activeOperationId) {
      pollSetupStatus(activeOperationId);
    }
  }, [activeOperationId]);

  const pollSetupStatus = (opId: string) => {
    setIsLoading(true);
    
    // Clear any existing polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    // Function to check setup status
    const checkStatus = async () => {
      try {
        const response = await ecosystemApi.getDocumentationSetupStatus(opId);
        
        if (response.success) {
          setSetupResult(response);
          
          // If setup is completed or failed, stop polling
          if (response.status === 'completed' || response.status === 'failed') {
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }
            setIsLoading(false);
            
            if (response.status === 'completed') {
              toast({
                title: 'Documentation setup completed',
                description: `Created ${response.summary?.total_files || 0} documentation files.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
              });
            } else {
              setError(response.error || 'Setup failed with unknown error');
              toast({
                title: 'Documentation setup failed',
                description: response.error || 'Setup failed with unknown error',
                status: 'error',
                duration: 5000,
                isClosable: true,
              });
            }
          }
        } else {
          throw new Error(response.message || 'Failed to get setup status');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while checking setup status');
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        setIsLoading(false);
      }
    };
    
    // Check status immediately
    checkStatus();
    
    // Then poll every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    setPollingInterval(interval);
  };

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setDocOptions(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleStartSetup = async () => {
    setIsLoading(true);
    setError(null);
    setSetupResult(null);
    
    try {
      const response = await ecosystemApi.setupDocumentation(projectId, {
        generate_readme: docOptions.includeReadme,
        generate_api_docs: docOptions.includeApiDocs,
        generate_architecture_docs: docOptions.includeArchitecture,
        generate_usage_docs: docOptions.includeUsage,
        custom_template: docOptions.template !== 'standard' ? docOptions.template : undefined
      });
      
      if (response.success) {
        setActiveOperationId(response.operation_id);
        toast({
          title: 'Documentation setup initiated',
          description: 'Setup has been initiated. This may take a few minutes.',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(response.message || 'Failed to initiate documentation setup');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while initiating documentation setup');
      setIsLoading(false);
      toast({
        title: 'Failed to start setup',
        description: err.message || 'An error occurred while initiating documentation setup',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleComplete = () => {
    if (!setupResult || setupResult.status !== 'completed') {
      toast({
        title: 'Setup not completed',
        description: 'Please wait for the documentation setup to complete before proceeding.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    onSubmit();
  };

  const renderSetupStatus = () => {
    if (!setupResult) {
      return (
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>No setup initiated</AlertTitle>
          <AlertDescription>
            Configure your documentation options and click the "Setup Documentation" button to begin.
          </AlertDescription>
        </Alert>
      );
    }
    
    switch (setupResult.status) {
      case 'pending':
        return (
          <Box>
            <Alert status="info">
              <AlertIcon />
              <AlertTitle>Setup pending</AlertTitle>
              <AlertDescription>
                Your documentation setup is in the queue and will start shortly.
              </AlertDescription>
            </Alert>
            <Progress isIndeterminate size="sm" colorScheme="blue" mt={4} />
          </Box>
        );
      
      case 'in_progress':
        return (
          <Box>
            <Alert status="info">
              <AlertIcon />
              <AlertTitle>Setup in progress</AlertTitle>
              <AlertDescription>
                Your documentation is being set up. This may take a few minutes.
              </AlertDescription>
            </Alert>
            <Progress
              value={setupResult.progress}
              size="sm"
              colorScheme="blue"
              mt={4}
            />
            <Text mt={2} fontSize="sm" textAlign="right">
              {setupResult.progress}% complete
            </Text>
          </Box>
        );
      
      case 'completed':
        return (
          <Box>
            <Alert status="success">
              <AlertIcon />
              <AlertTitle>Setup completed</AlertTitle>
              <AlertDescription>
                Documentation setup completed successfully!
              </AlertDescription>
            </Alert>
            
            <Box mt={6}>
              <Heading size="sm" mb={2}>Summary</Heading>
              <List spacing={2}>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Total files: {setupResult.summary?.total_files || 0}
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  README: {setupResult.summary?.readme ? 'Yes' : 'No'}
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  API docs: {setupResult.summary?.api_docs ? 'Yes' : 'No'}
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Architecture docs: {setupResult.summary?.architecture_docs ? 'Yes' : 'No'}
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Usage docs: {setupResult.summary?.usage_docs ? 'Yes' : 'No'}
                </ListItem>
              </List>
            </Box>
            
            {setupResult.generated_files && setupResult.generated_files.length > 0 && (
              <Box mt={6}>
                <Heading size="sm" mb={2}>Generated Files</Heading>
                <List spacing={2}>
                  {setupResult.generated_files.map((file, index) => (
                    <ListItem key={index}>
                      <HStack>
                        <Badge colorScheme="green" mr={2}>
                          {file.file_type}
                        </Badge>
                        <Code>{file.file_path}</Code>
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                          {file.description}
                        </Text>
                      </HStack>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            <Box mt={6}>
              <Alert status="info">
                <AlertIcon />
                <VStack align="start" spacing={2}>
                  <Text>
                    Your documentation has been set up successfully. You can now view and edit the documentation files in your project directory.
                  </Text>
                  <Link href="#" isExternal>
                    View Documentation Guide <Icon as={ExternalLinkIcon} mx="2px" />
                  </Link>
                </VStack>
              </Alert>
            </Box>
          </Box>
        );
      
      case 'failed':
        return (
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Setup failed</AlertTitle>
            <AlertDescription>
              {setupResult.error || 'An unknown error occurred during the documentation setup.'}
            </AlertDescription>
          </Alert>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box>
      <Heading size="md" mb={4}>Documentation Setup</Heading>
      <Text mb={6}>
        Set up standardized documentation for your project following AI Homelab Ecosystem guidelines.
        This will create necessary documentation files and templates in your project directory.
      </Text>
      
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <VStack spacing={6} align="stretch">
        {!activeOperationId && (
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Heading size="sm" mb={4}>Documentation Options</Heading>
            
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Documentation Template</FormLabel>
                <Select
                  name="template"
                  value={docOptions.template}
                  onChange={handleOptionChange}
                  disabled={isLoading || isSubmitting}
                >
                  <option value="standard">Standard (General Purpose)</option>
                  <option value="service">Service/API</option>
                  <option value="application">Application</option>
                  <option value="platform">Platform</option>
                  <option value="minimal">Minimal</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <Checkbox
                  name="includeReadme"
                  isChecked={docOptions.includeReadme}
                  onChange={handleOptionChange}
                  disabled={isLoading || isSubmitting}
                >
                  Include README.md
                </Checkbox>
              </FormControl>
              
              <FormControl>
                <Checkbox
                  name="includeContributing"
                  isChecked={docOptions.includeContributing}
                  onChange={handleOptionChange}
                  disabled={isLoading || isSubmitting}
                >
                  Include CONTRIBUTING.md
                </Checkbox>
              </FormControl>
              
              <FormControl>
                <Checkbox
                  name="includeArchitecture"
                  isChecked={docOptions.includeArchitecture}
                  onChange={handleOptionChange}
                  disabled={isLoading || isSubmitting}
                >
                  Include Architecture Documentation
                </Checkbox>
              </FormControl>
              
              <FormControl>
                <Checkbox
                  name="includeApiDocs"
                  isChecked={docOptions.includeApiDocs}
                  onChange={handleOptionChange}
                  disabled={isLoading || isSubmitting}
                >
                  Include API Documentation
                </Checkbox>
              </FormControl>
              
              <FormControl>
                <Checkbox
                  name="includeUsage"
                  isChecked={docOptions.includeUsage}
                  onChange={handleOptionChange}
                  disabled={isLoading || isSubmitting}
                >
                  Include Usage Documentation
                </Checkbox>
              </FormControl>
            </VStack>
          </Box>
        )}
        
        <Box p={4} borderWidth="1px" borderRadius="md">
          {isLoading ? (
            <VStack spacing={4}>
              <Spinner size="xl" />
              <Text>Processing documentation setup...</Text>
            </VStack>
          ) : (
            renderSetupStatus()
          )}
        </Box>
        
        <Box>
          {!activeOperationId || setupResult?.status === 'failed' ? (
            <Button
              colorScheme="blue"
              onClick={handleStartSetup}
              isLoading={isSubmitting}
              loadingText="Starting Setup..."
              width="full"
            >
              Setup Documentation
            </Button>
          ) : (
            <Button
              colorScheme="blue"
              onClick={handleComplete}
              isLoading={isSubmitting}
              loadingText="Completing Onboarding..."
              width="full"
              isDisabled={!setupResult || setupResult.status !== 'completed'}
            >
              {setupResult?.status === 'completed' ? 'Complete Onboarding' : 'Waiting for Setup to Complete...'}
            </Button>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default DocumentationSetupStep;
