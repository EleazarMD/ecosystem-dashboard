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
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Spinner,
  useToast
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, InfoIcon } from '@chakra-ui/icons';
import { ecosystemApi } from '@/lib/api';
import { ComplianceScanStatusResponse } from '@/types/onboarding';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ComplianceScanStepProps {
  projectId: string;
  scanId: string | null;
  onSubmit: () => void;
  isLoading: boolean;
}

const ComplianceScanStep: React.FC<ComplianceScanStepProps> = ({
  projectId,
  scanId,
  onSubmit,
  isLoading: isSubmitting
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ComplianceScanStatusResponse | null>(null);
  const [activeScanId, setActiveScanId] = useState<string | null>(scanId);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  const toast = useToast();

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Poll for scan status when scanId is available
  useEffect(() => {
    if (activeScanId) {
      pollScanStatus(activeScanId);
    }
  }, [activeScanId]);

  const pollScanStatus = (scanId: string) => {
    setIsLoading(true);
    
    // Clear any existing polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    // Function to check scan status
    const checkStatus = async () => {
      try {
        const response = await ecosystemApi.getComplianceScanStatus(scanId);
        
        if (response.success) {
          setScanResult(response);
          
          // If scan is completed or failed, stop polling
          if (response.status === 'completed' || response.status === 'failed') {
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }
            setIsLoading(false);
            
            if (response.status === 'completed') {
              toast({
                title: 'Compliance scan completed',
                description: `Scan completed with ${response.summary?.critical || 0} critical issues.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
              });
            } else {
              setError(response.error || 'Scan failed with unknown error');
              toast({
                title: 'Compliance scan failed',
                description: response.error || 'Scan failed with unknown error',
                status: 'error',
                duration: 5000,
                isClosable: true,
              });
            }
          }
        } else {
          throw new Error(response.message || 'Failed to get scan status');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while checking scan status');
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

  const handleStartScan = async () => {
    setIsLoading(true);
    setError(null);
    setScanResult(null);
    
    try {
      const response = await ecosystemApi.initiateComplianceScan(projectId);
      
      if (response.success) {
        setActiveScanId(response.scan_id);
        toast({
          title: 'Compliance scan initiated',
          description: 'Scan has been initiated. This may take a few minutes.',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(response.message || 'Failed to initiate compliance scan');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while initiating compliance scan');
      setIsLoading(false);
      toast({
        title: 'Failed to start scan',
        description: err.message || 'An error occurred while initiating compliance scan',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleContinue = () => {
    if (!scanResult || scanResult.status !== 'completed') {
      toast({
        title: 'Scan not completed',
        description: 'Please wait for the compliance scan to complete before proceeding.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    onSubmit();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'red';
      case 'warning':
        return 'orange';
      case 'info':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ListIcon as={WarningIcon} color="red.500" />;
      case 'warning':
        return <ListIcon as={WarningIcon} color="orange.500" />;
      case 'info':
        return <ListIcon as={InfoIcon} color="blue.500" />;
      default:
        return <ListIcon as={InfoIcon} color={useSemanticToken('text.secondary')} />;
    }
  };

  const renderScanStatus = () => {
    if (!scanResult) {
      return (
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>No scan initiated</AlertTitle>
          <AlertDescription>
            Click the "Start Compliance Scan" button to begin scanning your project for compliance issues.
          </AlertDescription>
        </Alert>
      );
    }
    
    switch (scanResult.status) {
      case 'pending':
        return (
          <Box>
            <Alert status="info">
              <AlertIcon />
              <AlertTitle>Scan pending</AlertTitle>
              <AlertDescription>
                Your scan is in the queue and will start shortly.
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
              <AlertTitle>Scan in progress</AlertTitle>
              <AlertDescription>
                Your project is being scanned for compliance issues. This may take a few minutes.
              </AlertDescription>
            </Alert>
            <Progress
              value={scanResult.progress}
              size="sm"
              colorScheme="blue"
              mt={4}
            />
            <Text mt={2} fontSize="sm" textAlign="right">
              {scanResult.progress}% complete
            </Text>
          </Box>
        );
      
      case 'completed':
        return (
          <Box>
            <Alert status={scanResult.summary?.critical ? 'warning' : 'success'}>
              <AlertIcon />
              <AlertTitle>Scan completed</AlertTitle>
              <AlertDescription>
                Found {scanResult.summary?.total_issues || 0} issues 
                ({scanResult.summary?.critical || 0} critical)
              </AlertDescription>
            </Alert>
            
            <Box mt={6}>
              <Heading size="sm" mb={2}>Summary</Heading>
              <List spacing={2}>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Total issues: {scanResult.summary?.total_issues || 0}
                </ListItem>
                <ListItem>
                  <ListIcon as={WarningIcon} color="red.500" />
                  Critical issues: {scanResult.summary?.critical || 0}
                </ListItem>
                <ListItem>
                  <ListIcon as={WarningIcon} color="orange.500" />
                  Warning issues: {scanResult.summary?.high || 0}
                </ListItem>
                <ListItem>
                  <ListIcon as={InfoIcon} color="blue.500" />
                  Info issues: {scanResult.summary?.info || 0}
                </ListItem>
              </List>
            </Box>
            
            {scanResult.issues.length > 0 && (
              <Box mt={6}>
                <Heading size="sm" mb={2}>Issues</Heading>
                <Accordion allowMultiple>
                  {scanResult.issues.map((issue, index) => (
                    <AccordionItem key={index}>
                      <h2>
                        <AccordionButton>
                          <Box flex="1" textAlign="left">
                            <Badge colorScheme={getSeverityColor(issue.severity)} mr={2}>
                              {issue.severity}
                            </Badge>
                            {issue.category}: {issue.description.substring(0, 60)}
                            {issue.description.length > 60 ? '...' : ''}
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                      </h2>
                      <AccordionPanel pb={4}>
                        <VStack align="stretch" spacing={2}>
                          <Text>{issue.description}</Text>
                          
                          {issue.file_path && (
                            <Text fontSize="sm">
                              File: <Code>{issue.file_path}</Code>
                              {issue.line_number && ` (line ${issue.line_number})`}
                            </Text>
                          )}
                          
                          {issue.recommendation && (
                            <Box mt={2}>
                              <Text fontWeight="bold">Recommendation:</Text>
                              <Text>{issue.recommendation}</Text>
                            </Box>
                          )}
                        </VStack>
                      </AccordionPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Box>
            )}
          </Box>
        );
      
      case 'failed':
        return (
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Scan failed</AlertTitle>
            <AlertDescription>
              {scanResult.error || 'An unknown error occurred during the compliance scan.'}
            </AlertDescription>
          </Alert>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box>
      <Heading size="md" mb={4}>Compliance Scan</Heading>
      <Text mb={6}>
        Scan your project for compliance with AI Homelab Ecosystem standards.
        This will check for port conflicts, security issues, and other compliance requirements.
      </Text>
      
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <VStack spacing={6} align="stretch">
        <Box p={4} borderWidth="1px" borderRadius="md">
          {isLoading ? (
            <VStack spacing={4}>
              <Spinner size="xl" />
              <Text>Processing compliance scan...</Text>
            </VStack>
          ) : (
            renderScanStatus()
          )}
        </Box>
        
        <Box>
          {!activeScanId || scanResult?.status === 'failed' ? (
            <Button
              colorScheme="blue"
              onClick={handleStartScan}
              isLoading={isSubmitting}
              loadingText="Starting Scan..."
              width="full"
            >
              Start Compliance Scan
            </Button>
          ) : (
            <Button
              colorScheme="blue"
              onClick={handleContinue}
              isLoading={isSubmitting}
              loadingText="Proceeding..."
              width="full"
              isDisabled={!scanResult || scanResult.status !== 'completed'}
            >
              {scanResult?.status === 'completed' ? 'Continue' : 'Waiting for Scan to Complete...'}
            </Button>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default ComplianceScanStep;
