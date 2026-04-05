/**
 * AI Gateway Configuration Tab Component
 * Provides comprehensive controls for configuring the AI Gateway
 */
import React from 'react';
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  Heading,
  Text,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightAddon,
  InputRightElement,
  Select,
  Switch,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  Textarea,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  IconButton,
  Icon,
} from '@chakra-ui/react';
import { 
  FiSave, 
  FiRefreshCw, 
  FiPlus, 
  FiEye, 
  FiTrash2, 
  FiEdit 
} from 'react-icons/fi';
import { GlassPanel } from '../ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface AIGatewayConfigTabProps {
  onSaveConfig?: (section: string, data: any) => void;
}

export const AIGatewayConfigTab: React.FC<AIGatewayConfigTabProps> = ({
  onSaveConfig = () => {}
}) => {
  return (
    <Box w="full" py={2}>
      <Tabs isLazy variant="enclosed" colorScheme="blue">
        <TabList mb={4}>
          <Tab>General</Tab>
          <Tab>Security</Tab>
          <Tab>Rate Limiting</Tab>
          <Tab>Model Providers</Tab>
          <Tab>Advanced</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel p={0}>
            <GeneralConfigPanel onSave={(data) => onSaveConfig('general', data)} />
          </TabPanel>
          
          <TabPanel p={0}>
            <SecurityConfigPanel onSave={(data) => onSaveConfig('security', data)} />
          </TabPanel>
          
          <TabPanel p={0}>
            <RateLimitingPanel onSave={(data) => onSaveConfig('rateLimiting', data)} />
          </TabPanel>
          
          <TabPanel p={0}>
            <ProvidersPanel onSave={(data) => onSaveConfig('providers', data)} />
          </TabPanel>
          
          <TabPanel p={0}>
            <AdvancedPanel onSave={(data) => onSaveConfig('advanced', data)} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

// General Settings Panel
interface GeneralConfigPanelProps {
  onSave: (data: any) => void;
}

const GeneralConfigPanel: React.FC<GeneralConfigPanelProps> = ({ onSave }) => {
  return (
    <GlassPanel variant="light" elevation={1} p={6}>
      <VStack spacing={6} align="start" width="full">
        <Box width="full">
          <Heading size="sm" mb={4}>Gateway Settings</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} width="full">
            <FormControl>
              <FormLabel fontSize="sm">Gateway Name</FormLabel>
              <Input defaultValue="AIHomelab Gateway" placeholder="Gateway Name" />
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Host</FormLabel>
              <InputGroup>
                <Input defaultValue="0.0.0.0" placeholder="0.0.0.0" />
                <InputRightAddon children="localhost" />
              </InputGroup>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Port</FormLabel>
              <Input defaultValue="8123" placeholder="8123" />
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Environment</FormLabel>
              <Select defaultValue="production">
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </Select>
            </FormControl>
          </SimpleGrid>
        </Box>

        <Divider />
        
        <Box width="full">
          <Heading size="sm" mb={4}>Gateway Behavior</Heading>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} width="full">
            <FormControl>
              <FormLabel fontSize="sm">Request Timeout (ms)</FormLabel>
              <NumberInput defaultValue={30000} min={1000} max={300000} step={1000}>
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Default Model</FormLabel>
              <Select defaultValue="gpt-3.5-turbo">
                <option value="gpt-3.5-turbo">OpenAI GPT-3.5 Turbo</option>
                <option value="gpt-4">OpenAI GPT-4</option>
                <option value="claude-instant">Anthropic Claude Instant</option>
                <option value="llama2">Ollama Llama2</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Logging Level</FormLabel>
              <Select defaultValue="info">
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
                <option value="trace">Trace</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Model Fallback Strategy</FormLabel>
              <Select defaultValue="next-available">
                <option value="next-available">Try Next Available</option>
                <option value="specific-model">Use Specific Model</option>
                <option value="fail">Fail Request</option>
              </Select>
            </FormControl>
          </SimpleGrid>
        </Box>

        <Divider />
        
        <Box width="full">
          <Heading size="sm" mb={4}>Feature Flags</Heading>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} width="full">
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="enable-caching" mb="0" fontSize="sm">
                Enable Response Caching
              </FormLabel>
              <Switch id="enable-caching" defaultChecked colorScheme="green" />
            </FormControl>
            
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="enable-metrics" mb="0" fontSize="sm">
                Enable Metrics Collection
              </FormLabel>
              <Switch id="enable-metrics" defaultChecked colorScheme="green" />
            </FormControl>
            
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="enable-rate-limiting" mb="0" fontSize="sm">
                Enable Rate Limiting
              </FormLabel>
              <Switch id="enable-rate-limiting" defaultChecked colorScheme="green" />
            </FormControl>
            
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="enable-auth" mb="0" fontSize="sm">
                Enable Authentication
              </FormLabel>
              <Switch id="enable-auth" defaultChecked colorScheme="green" />
            </FormControl>
          </SimpleGrid>
        </Box>
        
        <HStack justifyContent="flex-end" width="full" pt={4}>
          <Button variant="outline" mr={3}>
            Reset
          </Button>
          <Button colorScheme="blue" leftIcon={<Icon as={FiSave} />} onClick={() => onSave({})}>
            Save Changes
          </Button>
        </HStack>
      </VStack>
    </GlassPanel>
  );
};

// Security Settings Panel
interface SecurityConfigPanelProps {
  onSave: (data: any) => void;
}

const SecurityConfigPanel: React.FC<SecurityConfigPanelProps> = ({ onSave }) => {
  return (
    <GlassPanel variant="light" elevation={1} p={6}>
      <VStack spacing={6} align="start" width="full">
        <Box width="full">
          <Heading size="sm" mb={4}>Authentication</Heading>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} width="full">
            <FormControl>
              <FormLabel fontSize="sm">Authentication Method</FormLabel>
              <Select defaultValue="api-key">
                <option value="none">None</option>
                <option value="api-key">API Key</option>
                <option value="jwt">JWT</option>
                <option value="oauth2">OAuth 2.0</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Key Expiration</FormLabel>
              <Select defaultValue="30d">
                <option value="never">Never</option>
                <option value="1d">1 Day</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="90d">90 Days</option>
              </Select>
            </FormControl>
          </SimpleGrid>
        </Box>
        
        <Box width="full">
          <HStack justify="space-between" mb={4}>
            <Heading size="sm">API Keys</Heading>
            <Button size="sm" colorScheme="blue" leftIcon={<Icon as={FiPlus} />}>
              Generate New Key
            </Button>
          </HStack>
          
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Key Name</Th>
                  <Th>Created</Th>
                  <Th>Expires</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Primary Gateway Key</Td>
                  <Td>2023-05-15</Td>
                  <Td>2024-05-15</Td>
                  <Td><Badge colorScheme="green">Active</Badge></Td>
                  <Td>
                    <HStack spacing={1}>
                      <IconButton
                        aria-label="View key"
                        icon={<Icon as={FiEye} />}
                        size="xs"
                        variant="ghost"
                      />
                      <IconButton
                        aria-label="Revoke key"
                        icon={<Icon as={FiTrash2} />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                      />
                    </HStack>
                  </Td>
                </Tr>
                <Tr>
                  <Td>Development Key</Td>
                  <Td>2023-08-22</Td>
                  <Td>2024-08-22</Td>
                  <Td><Badge colorScheme="green">Active</Badge></Td>
                  <Td>
                    <HStack spacing={1}>
                      <IconButton
                        aria-label="View key"
                        icon={<Icon as={FiEye} />}
                        size="xs"
                        variant="ghost"
                      />
                      <IconButton
                        aria-label="Revoke key"
                        icon={<Icon as={FiTrash2} />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                      />
                    </HStack>
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
        
        <HStack justifyContent="flex-end" width="full" pt={4}>
          <Button colorScheme="blue" leftIcon={<Icon as={FiSave} />} onClick={() => onSave({})}>
            Save Changes
          </Button>
        </HStack>
      </VStack>
    </GlassPanel>
  );
};

// Rate Limiting Panel
interface RateLimitingPanelProps {
  onSave: (data: any) => void;
}

const RateLimitingPanel: React.FC<RateLimitingPanelProps> = ({ onSave }) => {
  return (
    <GlassPanel variant="light" elevation={1} p={6}>
      <VStack spacing={6} align="start" width="full">
        <Box width="full">
          <FormControl display="flex" alignItems="center" mb={4}>
            <FormLabel htmlFor="enable-global-rate-limiting" mb="0" fontSize="md">
              <Heading size="sm">Enable Global Rate Limiting</Heading>
            </FormLabel>
            <Switch id="enable-global-rate-limiting" defaultChecked colorScheme="green" />
          </FormControl>
          
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} width="full">
            <FormControl>
              <FormLabel fontSize="sm">Requests per Minute</FormLabel>
              <NumberInput defaultValue={100} min={1} max={10000}>
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Tokens per Minute</FormLabel>
              <NumberInput defaultValue={10000} min={100} max={1000000}>
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Rate Limit Strategy</FormLabel>
              <Select defaultValue="sliding-window">
                <option value="fixed-window">Fixed Window</option>
                <option value="sliding-window">Sliding Window</option>
                <option value="token-bucket">Token Bucket</option>
              </Select>
            </FormControl>
          </SimpleGrid>
        </Box>
        
        <Divider />
        
        <Box width="full">
          <Heading size="sm" mb={4}>Per-Model Rate Limits</Heading>
          
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Model</Th>
                  <Th>Provider</Th>
                  <Th>Req/Min</Th>
                  <Th>Tokens/Min</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>gpt-3.5-turbo</Td>
                  <Td>OpenAI</Td>
                  <Td>50</Td>
                  <Td>5,000</Td>
                  <Td><Badge colorScheme="green">Enabled</Badge></Td>
                  <Td>
                    <IconButton
                      aria-label="Edit limits"
                      icon={<Icon as={FiEdit} />}
                      size="xs"
                      variant="ghost"
                    />
                  </Td>
                </Tr>
                <Tr>
                  <Td>gpt-4</Td>
                  <Td>OpenAI</Td>
                  <Td>10</Td>
                  <Td>2,000</Td>
                  <Td><Badge colorScheme="green">Enabled</Badge></Td>
                  <Td>
                    <IconButton
                      aria-label="Edit limits"
                      icon={<Icon as={FiEdit} />}
                      size="xs"
                      variant="ghost"
                    />
                  </Td>
                </Tr>
                <Tr>
                  <Td>claude-instant</Td>
                  <Td>Anthropic</Td>
                  <Td>25</Td>
                  <Td>4,000</Td>
                  <Td><Badge colorScheme="green">Enabled</Badge></Td>
                  <Td>
                    <IconButton
                      aria-label="Edit limits"
                      icon={<Icon as={FiEdit} />}
                      size="xs"
                      variant="ghost"
                    />
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
        
        <HStack justifyContent="flex-end" width="full" pt={4}>
          <Button colorScheme="blue" leftIcon={<Icon as={FiSave} />} onClick={() => onSave({})}>
            Save Changes
          </Button>
        </HStack>
      </VStack>
    </GlassPanel>
  );
};

// Model Providers Panel
interface ProvidersPanelProps {
  onSave: (data: any) => void;
}

const ProvidersPanel: React.FC<ProvidersPanelProps> = ({ onSave }) => {
  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
      {/* OpenAI Provider */}
      <ProviderCard 
        name="OpenAI"
        isConnected={true}
        onSave={() => onSave({ provider: 'openai' })}
      >
        <FormControl>
          <FormLabel fontSize="sm">API Key</FormLabel>
          <InputGroup>
            <Input type="password" placeholder="sk-..." defaultValue="sk-••••••••••••••••••••••••••••••" />
            <InputRightElement>
              <IconButton
                aria-label="Show API key"
                icon={<Icon as={FiEye} />}
                variant="ghost"
                size="sm"
              />
            </InputRightElement>
          </InputGroup>
        </FormControl>
        
        <FormControl>
          <FormLabel fontSize="sm">Organization ID</FormLabel>
          <Input placeholder="org-..." defaultValue="org-123456789" />
        </FormControl>
        
        <FormControl>
          <FormLabel fontSize="sm">API Version</FormLabel>
          <Input placeholder="YYYY-MM-DD" defaultValue="2023-05-15" />
        </FormControl>
      </ProviderCard>
      
      {/* Anthropic Provider */}
      <ProviderCard 
        name="Anthropic"
        isConnected={true}
        onSave={() => onSave({ provider: 'anthropic' })}
      >
        <FormControl>
          <FormLabel fontSize="sm">API Key</FormLabel>
          <InputGroup>
            <Input type="password" placeholder="sk-ant-..." defaultValue="sk-ant-••••••••••••••••••••••••••" />
            <InputRightElement>
              <IconButton
                aria-label="Show API key"
                icon={<Icon as={FiEye} />}
                variant="ghost"
                size="sm"
              />
            </InputRightElement>
          </InputGroup>
        </FormControl>
        
        <FormControl>
          <FormLabel fontSize="sm">Version</FormLabel>
          <Select defaultValue="claude-2.1">
            <option value="claude-2.0">Claude 2.0</option>
            <option value="claude-2.1">Claude 2.1</option>
            <option value="claude-3-haiku">Claude 3 Haiku</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
          </Select>
        </FormControl>
      </ProviderCard>
      
      {/* Ollama Provider */}
      <ProviderCard 
        name="Ollama"
        isConnected={false}
        onSave={() => onSave({ provider: 'ollama' })}
      >
        <FormControl>
          <FormLabel fontSize="sm">Host</FormLabel>
          <Input placeholder="http://localhost:11434" />
        </FormControl>
        
        <FormControl>
          <FormLabel fontSize="sm">Connect Mode</FormLabel>
          <Select defaultValue="direct">
            <option value="direct">Direct Connection</option>
            <option value="proxy">Via Proxy</option>
          </Select>
        </FormControl>
      </ProviderCard>
      
      {/* HuggingFace Provider */}
      <ProviderCard 
        name="Hugging Face"
        isConnected={false}
        onSave={() => onSave({ provider: 'huggingface' })}
      >
        <FormControl>
          <FormLabel fontSize="sm">API Key</FormLabel>
          <InputGroup>
            <Input type="password" placeholder="hf_..." />
            <InputRightElement>
              <IconButton
                aria-label="Show API key"
                icon={<Icon as={FiEye} />}
                variant="ghost"
                size="sm"
              />
            </InputRightElement>
          </InputGroup>
        </FormControl>
        
        <FormControl>
          <FormLabel fontSize="sm">Endpoint Type</FormLabel>
          <Select defaultValue="inference-api">
            <option value="inference-api">Inference API</option>
            <option value="endpoint">Endpoints</option>
          </Select>
        </FormControl>
      </ProviderCard>
      
      {/* Add New Provider Card */}
      <GlassPanel variant="light" elevation={1} p={6} borderStyle="dashed">
        <VStack align="center" spacing={4} width="full" py={8}>
          <Icon as={FiPlus} boxSize={8} color={useSemanticToken('text.secondary')} />
          <Text fontWeight="medium">Add New Provider</Text>
          <Button size="sm" colorScheme="blue" variant="outline">
            Configure Provider
          </Button>
        </VStack>
      </GlassPanel>
    </SimpleGrid>
  );
};

// Provider Card Component
interface ProviderCardProps {
  name: string;
  isConnected: boolean;
  onSave: () => void;
  children: React.ReactNode;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ name, isConnected, onSave, children }) => {
  return (
    <GlassPanel variant="light" elevation={1} p={6}>
      <VStack align="start" spacing={4} width="full">
        <HStack width="full" justify="space-between">
          <Heading size="sm">{name}</Heading>
          <Badge colorScheme={isConnected ? "green" : "red"} variant="solid" fontSize="xs">
            {isConnected ? 'Connected' : 'Not Connected'}
          </Badge>
        </HStack>
        
        {children}
        
        <HStack spacing={2} alignSelf="flex-end">
          <Button size="sm" variant="ghost" leftIcon={<Icon as={FiRefreshCw} />}>
            Test Connection
          </Button>
          <Button 
            size="sm" 
            colorScheme="blue"
            onClick={onSave}
          >
            {isConnected ? 'Save' : 'Connect'}
          </Button>
        </HStack>
      </VStack>
    </GlassPanel>
  );
};

// Advanced Settings Panel
interface AdvancedPanelProps {
  onSave: (data: any) => void;
}

const AdvancedPanel: React.FC<AdvancedPanelProps> = ({ onSave }) => {
  return (
    <GlassPanel variant="light" elevation={1} p={6}>
      <VStack spacing={6} align="start" width="full">
        <Box width="full">
          <Heading size="sm" mb={4}>Advanced Gateway Configuration</Heading>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} width="full">
            <FormControl>
              <FormLabel fontSize="sm">Gateway Mode</FormLabel>
              <Select defaultValue="production">
                <option value="development">Development</option>
                <option value="production">Production</option>
                <option value="hybrid">Hybrid</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Thread Pool Size</FormLabel>
              <NumberInput defaultValue={4} min={1} max={32}>
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Cache TTL (seconds)</FormLabel>
              <NumberInput defaultValue={300} min={0} max={86400}>
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Max Request Size (KB)</FormLabel>
              <NumberInput defaultValue={1024} min={64} max={10240}>
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </SimpleGrid>
        </Box>

        <Divider />
        
        <Box width="full">
          <Heading size="sm" mb={4}>Gateway JSON Configuration</Heading>
          <FormControl>
            <FormLabel fontSize="sm">
              Manual Configuration (Advanced)
              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                Edit the JSON configuration directly. Be careful, invalid JSON will prevent the gateway from starting.
              </Text>
            </FormLabel>
            <Textarea
              fontFamily="monospace"
              fontSize="sm"
              height="200px"
              defaultValue={JSON.stringify({
                "gateway": {
                  "name": "AIHomelab Gateway",
                  "host": "0.0.0.0",
                  "port": 8123,
                  "environment": "production",
                  "timeout": 30000,
                  "default_model": "gpt-3.5-turbo",
                  "log_level": "info"
                },
                "features": {
                  "caching": true,
                  "metrics": true,
                  "rate_limiting": true,
                  "authentication": true
                },
                "providers": {
                  "openai": {
                    "api_key": "sk-••••••••••••••••••••••••••••••",
                    "organization_id": "org-123456789"
                  },
                  "anthropic": {
                    "api_key": "sk-ant-••••••••••••••••••••••••••"
                  }
                }
              }, null, 2)}
            />
          </FormControl>
        </Box>
        
        <HStack justifyContent="flex-end" width="full" pt={4}>
          <Button variant="outline" mr={3}>
            Reset
          </Button>
          <Button colorScheme="blue" leftIcon={<Icon as={FiSave} />} onClick={() => onSave({})}>
            Save Changes
          </Button>
        </HStack>
      </VStack>
    </GlassPanel>
  );
};
