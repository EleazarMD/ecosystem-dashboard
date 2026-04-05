/**
 * AI Gateway Management Modal Component
 * Provides management operations for the AI Gateway like restart, logs, and settings
 */
import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Icon,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Switch,
  Select,
  Input,
  Textarea,
  Box,
  Divider,
  Badge,
  Code,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { 
  FiRefreshCw, 
  FiDownload, 
  FiPlay, 
  FiPause, 
  FiRotateCcw, 
  FiSettings, 
  FiAlertTriangle 
} from 'react-icons/fi';

interface AIGatewayManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestart: () => void;
  onStop: () => void;
  onStart: () => void;
  isGatewayOnline: boolean;
}

export const AIGatewayManagementModal: React.FC<AIGatewayManagementModalProps> = ({ 
  isOpen, 
  onClose,
  onRestart,
  onStop,
  onStart,
  isGatewayOnline = true
}) => {
  const [isRestarting, setIsRestarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  
  // Demo logs - would be fetched from backend in production
  const demoLogs = `[2023-06-01T12:00:05.123Z] INFO: Gateway starting with configuration: { host: "0.0.0.0", port: 8123 }
[2023-06-01T12:00:05.234Z] INFO: Loading AI models...
[2023-06-01T12:00:05.345Z] INFO: Loaded model: gpt-3.5-turbo from OpenAI
[2023-06-01T12:00:05.456Z] INFO: Loaded model: gpt-4 from OpenAI
[2023-06-01T12:00:05.567Z] INFO: Loaded model: claude-instant from Anthropic
[2023-06-01T12:00:05.678Z] INFO: Loaded model: llama2 from Ollama
[2023-06-01T12:00:05.789Z] INFO: Initializing rate limiter...
[2023-06-01T12:00:05.890Z] INFO: Starting metrics collector...
[2023-06-01T12:00:06.001Z] INFO: Starting HTTP server on port 8123...
[2023-06-01T12:00:06.112Z] INFO: Gateway ready! Accepting connections...
[2023-06-01T12:05:12.345Z] INFO: Request received: /v1/models
[2023-06-01T12:05:12.456Z] INFO: Response sent: 200 OK
[2023-06-01T12:08:23.567Z] INFO: Request received: /v1/chat/completions
[2023-06-01T12:08:24.789Z] INFO: Response sent: 200 OK
[2023-06-01T12:10:45.890Z] WARN: Rate limit reached for client 192.168.1.105
[2023-06-01T12:15:56.001Z] INFO: Request received: /v1/chat/completions
[2023-06-01T12:15:57.112Z] INFO: Response sent: 200 OK`;
  
  // Handle gateway restart
  const handleRestart = async () => {
    setIsRestarting(true);
    await onRestart();
    setTimeout(() => {
      setIsRestarting(false);
    }, 2000);
  };
  
  // Handle gateway stop
  const handleStop = async () => {
    setIsStopping(true);
    await onStop();
    setTimeout(() => {
      setIsStopping(false);
    }, 2000);
  };
  
  // Handle gateway start
  const handleStart = async () => {
    setIsStarting(true);
    await onStart();
    setTimeout(() => {
      setIsStarting(false);
    }, 2000);
  };
  
  // Color mode values
  const isDark = false;
  const logsBg = 'gray.50';
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent borderRadius="lg" boxShadow="xl">
        <ModalHeader>AI Gateway Management</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Status Indicator */}
            <HStack spacing={4} justify="space-between">
              <HStack>
                <Text fontWeight="medium">Gateway Status:</Text>
                <Badge colorScheme={isGatewayOnline ? 'green' : 'red'} variant="solid">
                  {isGatewayOnline ? 'Online' : 'Offline'}
                </Badge>
              </HStack>
              
              <HStack spacing={3}>
                {isGatewayOnline ? (
                  <Button 
                    size="sm" 
                    leftIcon={<Icon as={FiPause} />}
                    colorScheme="red"
                    variant="outline"
                    onClick={handleStop}
                    isLoading={isStopping}
                    loadingText="Stopping"
                  >
                    Stop Gateway
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    leftIcon={<Icon as={FiPlay} />}
                    colorScheme="green"
                    onClick={handleStart}
                    isLoading={isStarting}
                    loadingText="Starting"
                  >
                    Start Gateway
                  </Button>
                )}
                
                <Button 
                  size="sm" 
                  leftIcon={<Icon as={FiRotateCcw} />}
                  colorScheme="blue"
                  onClick={handleRestart}
                  isLoading={isRestarting}
                  loadingText="Restarting"
                  isDisabled={!isGatewayOnline}
                >
                  Restart Gateway
                </Button>
              </HStack>
            </HStack>
            
            {!isGatewayOnline && (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <AlertTitle>Gateway is offline</AlertTitle>
                <AlertDescription>
                  Some functionality may not be available while the gateway is offline.
                </AlertDescription>
              </Alert>
            )}
            
            <Divider />
            
            <Tabs isLazy colorScheme="blue">
              <TabList>
                <Tab>Logs</Tab>
                <Tab>Operations</Tab>
                <Tab>Advanced</Tab>
              </TabList>
              
              <TabPanels>
                {/* Logs Tab */}
                <TabPanel p={4}>
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <Select size="sm" width="auto" defaultValue="info">
                        <option value="debug">Debug</option>
                        <option value="info">Info</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                      </Select>
                      
                      <Button 
                        size="sm" 
                        leftIcon={<Icon as={FiDownload} />}
                        variant="outline"
                      >
                        Download Logs
                      </Button>
                    </HStack>
                    
                    <Box 
                      bg={logsBg}
                      p={3}
                      borderRadius="md"
                      overflowY="auto"
                      maxHeight="300px"
                      fontFamily="mono"
                      fontSize="xs"
                      whiteSpace="pre"
                    >
                      {demoLogs}
                    </Box>
                  </VStack>
                </TabPanel>
                
                {/* Operations Tab */}
                <TabPanel p={4}>
                  <VStack spacing={4} align="stretch">
                    <FormControl display="flex" alignItems="center">
                      <FormLabel htmlFor="maintenance-mode" mb="0">
                        Maintenance Mode
                      </FormLabel>
                      <Switch 
                        id="maintenance-mode" 
                        colorScheme="orange"
                        isDisabled={!isGatewayOnline}
                      />
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <FormLabel htmlFor="debug-mode" mb="0">
                        Debug Mode
                      </FormLabel>
                      <Switch 
                        id="debug-mode" 
                        colorScheme="purple"
                        isDisabled={!isGatewayOnline}
                      />
                    </FormControl>
                    
                    <Divider />
                    
                    <Box>
                      <Button 
                        colorScheme="blue" 
                        size="sm" 
                        leftIcon={<Icon as={FiRefreshCw} />}
                        width="full"
                        mb={3}
                        isDisabled={!isGatewayOnline}
                      >
                        Reload Models
                      </Button>
                      
                      <Button 
                        colorScheme="blue" 
                        size="sm" 
                        leftIcon={<Icon as={FiRefreshCw} />}
                        width="full"
                        mb={3}
                        isDisabled={!isGatewayOnline}
                      >
                        Reload Configuration
                      </Button>
                      
                      <Button 
                        colorScheme="red" 
                        size="sm" 
                        leftIcon={<Icon as={FiAlertTriangle} />}
                        variant="outline"
                        width="full"
                        isDisabled={!isGatewayOnline}
                      >
                        Clear Cache
                      </Button>
                    </Box>
                  </VStack>
                </TabPanel>
                
                {/* Advanced Tab */}
                <TabPanel p={4}>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel>JVM Arguments</FormLabel>
                      <Input placeholder="-Xmx1G -Xms512M" />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Environment Variables</FormLabel>
                      <Textarea 
                        placeholder="KEY=value
ANOTHER_KEY=another_value"
                        rows={3}
                      />
                    </FormControl>
                    
                    <Divider />
                    
                    <Box>
                      <Text fontWeight="medium" mb={2}>Gateway Information</Text>
                      <VStack align="start" spacing={2}>
                        <HStack>
                          <Text fontWeight="bold" fontSize="sm">Version:</Text>
                          <Code>v1.0.5</Code>
                        </HStack>
                        <HStack>
                          <Text fontWeight="bold" fontSize="sm">Build:</Text>
                          <Code>2023-06-01.123</Code>
                        </HStack>
                        <HStack>
                          <Text fontWeight="bold" fontSize="sm">Java Version:</Text>
                          <Code>OpenJDK 17.0.2</Code>
                        </HStack>
                      </VStack>
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <Button 
            leftIcon={<Icon as={FiSettings} />}
            colorScheme="blue" 
            mr={3}
          >
            Advanced Settings
          </Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
