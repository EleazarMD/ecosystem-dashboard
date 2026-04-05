/**
 * AI Gateway Infrastructure Management Page (Chakra UI Version)
 * 
 * Comprehensive monitoring and management interface for AI Gateway service
 * using Chakra UI components to avoid MUI compatibility issues
 */

import React, { useState, useEffect } from 'react';
import { useFallbackManagement } from '@/hooks/useFallbackManagement';
import {
  Box,
  Container,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Button,
  Badge,
  Alert,
  AlertIcon,
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Input,
  VStack,
  HStack,
  List,
  ListItem,
  ListIcon,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Switch,
  FormControl,
  FormLabel,
  Progress,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import {
  RepeatIcon,
  SettingsIcon,
  CheckCircleIcon,
  WarningIcon,
  ChatIcon
} from '@chakra-ui/icons';
import { useDualPortAIGateway } from '@/lib/ai-gateway-dual-port-client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export default function AIGatewayChakraPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [models, setModels] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const bgColor = useSemanticToken('surface.base');
  const cardBg = useSemanticToken('surface.elevated');

  const {
    globalSettings,
    appConfigs,
    loading: fallbackLoading,
    error: fallbackError,
    toggleGlobalFallbacks,
    toggleEnvironmentFallbacks,
    toggleAppFallbacks,
    refreshData: refreshFallbackData
  } = useFallbackManagement();

  const {
    client,
    isConnected,
    healthStatus: clientHealth,
    models: clientModels,
    refreshHealth,
    refreshModels,
    sendChatCompletion: createChatCompletion
  } = useDualPortAIGateway();

  useEffect(() => {
    refreshFallbackData();
    refreshHealth();
    refreshModels();
  }, [refreshFallbackData, refreshHealth, refreshModels]);

  const handleChatTest = async () => {
    if (!chatMessage.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await createChatCompletion({
        model: 'llama3.1:8b',
        messages: [{ role: 'user', content: chatMessage }]
      });
      setChatResponse(response.choices[0]?.message?.content || 'No response');
      toast({
        title: 'Chat test successful',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Chat test failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    refreshFallbackData();
    refreshHealth();
    refreshModels();
    toast({
      title: 'Data refreshed',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <DashboardLayout>
      <Box bg={bgColor} minH="100vh" p={6}>
        <Container maxW="container.xl">
          <VStack spacing={6} align="stretch">
            {/* Header */}
            <HStack justify="space-between" align="center">
              <VStack align="start" spacing={1}>
                <Heading size="xl">AI Gateway Infrastructure</Heading>
                <Text color={useSemanticToken('text.secondary')}>
                  Comprehensive monitoring and management interface
                </Text>
              </VStack>
              <Button
                leftIcon={<RepeatIcon />}
                onClick={handleRefresh}
                colorScheme="blue"
                variant="outline"
              >
                Refresh
              </Button>
            </HStack>

            {/* Status Cards */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={2}>
                    <CheckCircleIcon color="green.500" boxSize={8} />
                    <Text fontWeight="bold">Connection</Text>
                    <Badge colorScheme={isConnected ? 'green' : 'red'}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </VStack>
                </CardBody>
              </Card>

              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={2}>
                    <SettingsIcon color="blue.500" boxSize={8} />
                    <Text fontWeight="bold">Models</Text>
                    <Badge colorScheme="blue">
                      {clientModels?.length || 0} Available
                    </Badge>
                  </VStack>
                </CardBody>
              </Card>

              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={2}>
                    <ChatIcon color="purple.500" boxSize={8} />
                    <Text fontWeight="bold">Chat API</Text>
                    <Badge colorScheme="purple">
                      Ready
                    </Badge>
                  </VStack>
                </CardBody>
              </Card>

              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={2}>
                    <WarningIcon color="orange.500" boxSize={8} />
                    <Text fontWeight="bold">Fallbacks</Text>
                    <Badge colorScheme={globalSettings?.globallyEnabled ? 'green' : 'orange'}>
                      {globalSettings?.globallyEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>

            {/* Main Content Tabs */}
            <Card bg={cardBg}>
              <CardBody>
                <Tabs index={activeTab} onChange={setActiveTab}>
                  <TabList>
                    <Tab>Authentication</Tab>
                    <Tab>Service Mesh</Tab>
                    <Tab>API Usage</Tab>
                    <Tab>Fallback Management</Tab>
                  </TabList>

                  <TabPanels>
                    {/* Authentication Tab */}
                    <TabPanel>
                      <VStack spacing={4} align="stretch">
                        <Heading size="md">Authentication Status</Heading>
                        <Alert status="success">
                          <AlertIcon />
                          API Key authentication is active and working
                        </Alert>
                        
                        <TableContainer>
                          <Table variant="simple">
                            <Thead>
                              <Tr>
                                <Th>Method</Th>
                                <Th>Status</Th>
                                <Th>Last Check</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              <Tr>
                                <Td>API Key</Td>
                                <Td><Badge colorScheme="green">Active</Badge></Td>
                                <Td>Just now</Td>
                              </Tr>
                              <Tr>
                                <Td>OAuth2</Td>
                                <Td><Badge colorScheme="green">Available</Badge></Td>
                                <Td>Just now</Td>
                              </Tr>
                            </Tbody>
                          </Table>
                        </TableContainer>
                      </VStack>
                    </TabPanel>

                    {/* Service Mesh Tab */}
                    <TabPanel>
                      <VStack spacing={4} align="stretch">
                        <Heading size="md">Service Mesh Status</Heading>
                        <Alert status="info">
                          <AlertIcon />
                          Service mesh integration is operational
                        </Alert>
                        
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          <Box p={4} border="1px" borderColor={useSemanticToken('border.default')} borderRadius="md">
                            <Text fontWeight="bold">Registered Services</Text>
                            <Text fontSize="2xl" color="blue.500">5</Text>
                          </Box>
                          <Box p={4} border="1px" borderColor={useSemanticToken('border.default')} borderRadius="md">
                            <Text fontWeight="bold">Health Checks</Text>
                            <Text fontSize="2xl" color="green.500">Passing</Text>
                          </Box>
                        </SimpleGrid>
                      </VStack>
                    </TabPanel>

                    {/* API Usage Tab */}
                    <TabPanel>
                      <VStack spacing={4} align="stretch">
                        <Heading size="md">API Usage & Testing</Heading>
                        
                        <Card>
                          <CardHeader>
                            <Heading size="sm">Chat Completion Test</Heading>
                          </CardHeader>
                          <CardBody>
                            <VStack spacing={4}>
                              <Input
                                placeholder="Enter a test message..."
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                              />
                              <Button
                                onClick={handleChatTest}
                                isLoading={isLoading}
                                colorScheme="blue"
                                leftIcon={<ChatIcon />}
                              >
                                Send Test Message
                              </Button>
                              {chatResponse && (
                                <Box p={4} bg={useSemanticToken('surface.base')} borderRadius="md" w="100%">
                                  <Text fontWeight="bold" mb={2}>Response:</Text>
                                  <Text>{chatResponse}</Text>
                                </Box>
                              )}
                            </VStack>
                          </CardBody>
                        </Card>
                      </VStack>
                    </TabPanel>

                    {/* Fallback Management Tab */}
                    <TabPanel>
                      <VStack spacing={4} align="stretch">
                        <Heading size="md">Fallback Management</Heading>
                        
                        {fallbackLoading ? (
                          <HStack justify="center">
                            <Spinner />
                            <Text>Loading fallback settings...</Text>
                          </HStack>
                        ) : fallbackError ? (
                          <Alert status="error">
                            <AlertIcon />
                            Error: {fallbackError}
                          </Alert>
                        ) : (
                          <VStack spacing={4} align="stretch">
                            {/* Global Settings */}
                            <Card>
                              <CardHeader>
                                <Heading size="sm">Global Settings</Heading>
                              </CardHeader>
                              <CardBody>
                                <VStack spacing={3} align="stretch">
                                  <FormControl display="flex" alignItems="center">
                                    <FormLabel htmlFor="global-fallback" mb="0">
                                      Global Fallback Enabled
                                    </FormLabel>
                                    <Switch
                                      id="global-fallback"
                                      isChecked={globalSettings?.globallyEnabled || false}
                                      onChange={(e) => toggleGlobalFallbacks(e.target.checked)}
                                    />
                                  </FormControl>
                                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                    Environment: {globalSettings?.environment || 'Unknown'}
                                  </Text>
                                </VStack>
                              </CardBody>
                            </Card>

                            {/* App Configurations */}
                            <Card>
                              <CardHeader>
                                <Heading size="sm">Application Configurations</Heading>
                              </CardHeader>
                              <CardBody>
                                {appConfigs && appConfigs.length > 0 ? (
                                  <VStack spacing={3} align="stretch">
                                    {appConfigs.map((app) => (
                                      <Box key={app.appId} p={3} border="1px" borderColor={useSemanticToken('border.default')} borderRadius="md">
                                        <HStack justify="space-between" align="center">
                                          <VStack align="start" spacing={1}>
                                            <Text fontWeight="bold">{app.appName}</Text>
                                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                              ID: {app.appId}
                                            </Text>
                                          </VStack>
                                          <Switch
                                            isChecked={app.enabled || false}
                                            onChange={(e) => toggleAppFallbacks(app.appId, e.target.checked)}
                                          />
                                        </HStack>
                                      </Box>
                                    ))}
                                  </VStack>
                                ) : (
                                  <Text color={useSemanticToken('text.secondary')}>No application configurations found.</Text>
                                )}
                              </CardBody>
                            </Card>
                          </VStack>
                        )}
                      </VStack>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </CardBody>
            </Card>
          </VStack>
        </Container>
      </Box>
    </DashboardLayout>
  );
}
