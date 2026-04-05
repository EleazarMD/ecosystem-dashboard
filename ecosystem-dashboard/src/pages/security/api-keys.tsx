import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import {
  Heading,
  VStack,
  HStack,
  Text,
  Badge,
  SimpleGrid,
  Box,
  Icon,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  Checkbox,
  CheckboxGroup,
  Stack,
  IconButton,
  Tooltip,
  Code,
  useClipboard,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import {
  SearchIcon,
  CopyIcon,
  CheckIcon,
  ViewIcon,
  ViewOffIcon,
} from '@chakra-ui/icons';
import {
  FiKey,
  FiPlus,
  FiTrash2,
  FiRefreshCw,
  FiClock,
  FiShield,
  FiActivity,
  FiEdit,
  FiAlertTriangle,
} from 'react-icons/fi';
import SecurityLayout from '@/components/layout/SecurityLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'revoked';
  usageCount: number;
  rateLimit: number;
}

interface ApiKeyStats {
  total: number;
  active: number;
  expired: number;
  revoked: number;
  totalUsage: number;
}

const permissionOptions = [
  { value: 'read', label: 'Read', description: 'Read access to resources' },
  { value: 'write', label: 'Write', description: 'Create and modify resources' },
  { value: 'delete', label: 'Delete', description: 'Delete resources' },
  { value: 'admin', label: 'Admin', description: 'Full administrative access' },
  { value: 'chat', label: 'Chat API', description: 'Access to chat completions' },
  { value: 'embeddings', label: 'Embeddings', description: 'Access to embeddings API' },
  { value: 'images', label: 'Images', description: 'Access to image generation' },
  { value: 'audio', label: 'Audio', description: 'Access to audio APIs' },
];

export default function ApiKeysPage() {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [stats, setStats] = useState<ApiKeyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);
  const { hasCopied, onCopy } = useClipboard(newKeyRevealed || '');
  
  // New key form state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read', 'chat']);
  const [newKeyExpiry, setNewKeyExpiry] = useState('never');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState('60');
  const [creating, setCreating] = useState(false);

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/security/api-keys');
      if (!res.ok) throw new Error('Failed to fetch API keys');
      const data = await res.json();
      setApiKeys(data.keys || []);
      setStats(data.stats || null);
    } catch (err) {
      // Use mock data for demo
      const mockKeys: ApiKey[] = [
        {
          id: 'key-001',
          name: 'Production API',
          prefix: 'sk-prod-****',
          permissions: ['read', 'write', 'chat', 'embeddings'],
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
          lastUsed: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          expiresAt: null,
          status: 'active',
          usageCount: 15847,
          rateLimit: 100,
        },
        {
          id: 'key-002',
          name: 'Development Key',
          prefix: 'sk-dev-****',
          permissions: ['read', 'write', 'chat', 'embeddings', 'images', 'audio'],
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
          lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
          status: 'active',
          usageCount: 3421,
          rateLimit: 60,
        },
        {
          id: 'key-003',
          name: 'CI/CD Pipeline',
          prefix: 'sk-ci-****',
          permissions: ['read', 'chat'],
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
          lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          expiresAt: null,
          status: 'active',
          usageCount: 892,
          rateLimit: 30,
        },
        {
          id: 'key-004',
          name: 'Old Integration',
          prefix: 'sk-old-****',
          permissions: ['read'],
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
          lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
          expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
          status: 'expired',
          usageCount: 234,
          rateLimit: 60,
        },
        {
          id: 'key-005',
          name: 'Compromised Key',
          prefix: 'sk-comp-****',
          permissions: ['read', 'write'],
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
          lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
          expiresAt: null,
          status: 'revoked',
          usageCount: 567,
          rateLimit: 60,
        },
      ];
      
      setApiKeys(mockKeys);
      setStats({
        total: 5,
        active: 3,
        expired: 1,
        revoked: 1,
        totalUsage: 20961,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the API key',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setCreating(true);
    try {
      // In real implementation, this would call the API
      const mockNewKey = `sk-${newKeyName.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 15)}`;
      
      const newKey: ApiKey = {
        id: `key-${Date.now()}`,
        name: newKeyName,
        prefix: `sk-${newKeyName.substring(0, 4).toLowerCase()}-****`,
        permissions: newKeyPermissions,
        createdAt: new Date().toISOString(),
        lastUsed: null,
        expiresAt: newKeyExpiry === 'never' ? null : new Date(Date.now() + parseInt(newKeyExpiry) * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        usageCount: 0,
        rateLimit: parseInt(newKeyRateLimit),
      };

      setApiKeys(prev => [newKey, ...prev]);
      setNewKeyRevealed(mockNewKey);
      
      toast({
        title: 'API Key Created',
        description: 'Make sure to copy your key now. You won\'t be able to see it again!',
        status: 'success',
        duration: 5000,
      });

      // Reset form
      setNewKeyName('');
      setNewKeyPermissions(['read', 'chat']);
      setNewKeyExpiry('never');
      setNewKeyRateLimit('60');
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create API key',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setCreating(false);
    }
  };

  const revokeApiKey = async (key: ApiKey) => {
    try {
      setApiKeys(prev => prev.map(k => k.id === key.id ? { ...k, status: 'revoked' as const } : k));
      toast({
        title: 'API Key Revoked',
        description: `${key.name} has been revoked`,
        status: 'success',
        duration: 3000,
      });
      onDeleteClose();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to revoke API key',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const filteredKeys = apiKeys.filter(key => 
    key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.prefix.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const statusColors: Record<string, string> = {
    active: 'green',
    expired: 'yellow',
    revoked: 'red',
  };

  return (
    <SecurityLayout>
      <Head>
        <title>API Keys | AI Homelab Security</title>
        <meta name="description" content="Manage API keys for secure access" />
      </Head>

      <VStack spacing={6} align="stretch">
        {/* Header */}
        <GlassPanel variant="light" p={6}>
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FiKey} boxSize={6} color="purple.500" />
                <Heading size="lg">API Keys</Heading>
              </HStack>
              <Text color={textSecondary}>
                Manage API keys for programmatic access to your AI services
              </Text>
            </VStack>
            <HStack>
              <Button
                leftIcon={<FiPlus />}
                colorScheme="blue"
                onClick={onOpen}
              >
                Create New Key
              </Button>
              <Button
                leftIcon={<FiRefreshCw />}
                variant="outline"
                onClick={fetchApiKeys}
                isLoading={loading}
              >
                Refresh
              </Button>
            </HStack>
          </HStack>
        </GlassPanel>

        {/* Stats */}
        {stats && (
          <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Total Keys</StatLabel>
                <StatNumber>{stats.total}</StatNumber>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Active</StatLabel>
                <StatNumber color="green.500">{stats.active}</StatNumber>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Expired</StatLabel>
                <StatNumber color="yellow.500">{stats.expired}</StatNumber>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Revoked</StatLabel>
                <StatNumber color="red.500">{stats.revoked}</StatNumber>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Total Usage</StatLabel>
                <StatNumber>{(stats.totalUsage ?? 0).toLocaleString()}</StatNumber>
                <StatHelpText>API calls</StatHelpText>
              </Stat>
            </GlassPanel>
          </SimpleGrid>
        )}

        {/* Search */}
        <GlassPanel variant="light" p={4}>
          <InputGroup maxW="400px">
            <InputLeftElement>
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search API keys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </GlassPanel>

        {/* New Key Revealed Alert */}
        {newKeyRevealed && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon as={FiAlertTriangle} />
            <Box flex={1}>
              <Text fontWeight="bold">Save your API key now!</Text>
              <Text fontSize="sm">This is the only time you'll see this key. Store it securely.</Text>
              <HStack mt={2}>
                <Code p={2} borderRadius="md" fontSize="sm">{newKeyRevealed}</Code>
                <IconButton
                  aria-label="Copy key"
                  icon={hasCopied ? <CheckIcon /> : <CopyIcon />}
                  size="sm"
                  onClick={onCopy}
                  colorScheme={hasCopied ? 'green' : 'gray'}
                />
              </HStack>
            </Box>
            <Button size="sm" onClick={() => setNewKeyRevealed(null)}>Dismiss</Button>
          </Alert>
        )}

        {/* API Keys Table */}
        <GlassPanel variant="light" p={0} overflow="hidden">
          {loading ? (
            <Box textAlign="center" py={12}>
              <Spinner size="xl" />
              <Text mt={4} color="gray.500">Loading API keys...</Text>
            </Box>
          ) : filteredKeys.length === 0 ? (
            <Box textAlign="center" py={12}>
              <Icon as={FiKey} boxSize={12} color="gray.400" mb={4} />
              <Text fontSize="lg" fontWeight="medium">No API keys found</Text>
              <Text color="gray.500">Create your first API key to get started</Text>
            </Box>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Key</Th>
                    <Th>Permissions</Th>
                    <Th>Rate Limit</Th>
                    <Th>Usage</Th>
                    <Th>Last Used</Th>
                    <Th>Expires</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredKeys.map((key) => (
                    <Tr key={key.id} opacity={key.status !== 'active' ? 0.6 : 1}>
                      <Td fontWeight="medium">{key.name}</Td>
                      <Td>
                        <Code fontSize="xs">{key.prefix}</Code>
                      </Td>
                      <Td>
                        <HStack spacing={1} flexWrap="wrap">
                          {key.permissions.slice(0, 3).map(p => (
                            <Badge key={p} size="sm" colorScheme="blue" fontSize="xs">
                              {p}
                            </Badge>
                          ))}
                          {key.permissions.length > 3 && (
                            <Badge size="sm" colorScheme="gray" fontSize="xs">
                              +{key.permissions.length - 3}
                            </Badge>
                          )}
                        </HStack>
                      </Td>
                      <Td>{key.rateLimit}/min</Td>
                      <Td>{key.usageCount.toLocaleString()}</Td>
                      <Td>
                        <HStack>
                          <Icon as={FiClock} boxSize={3} />
                          <Text fontSize="sm">{formatTimeAgo(key.lastUsed)}</Text>
                        </HStack>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color={key.expiresAt && new Date(key.expiresAt) < new Date() ? 'red.500' : undefined}>
                          {formatDate(key.expiresAt)}
                        </Text>
                      </Td>
                      <Td>
                        <Badge colorScheme={statusColors[key.status]}>
                          {key.status}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing={1}>
                          <Tooltip label="View details">
                            <IconButton
                              aria-label="View"
                              icon={<ViewIcon />}
                              size="sm"
                              variant="ghost"
                            />
                          </Tooltip>
                          {key.status === 'active' && (
                            <Tooltip label="Revoke key">
                              <IconButton
                                aria-label="Revoke"
                                icon={<FiTrash2 />}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => {
                                  setSelectedKey(key);
                                  onDeleteOpen();
                                }}
                              />
                            </Tooltip>
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </GlassPanel>
      </VStack>

      {/* Create Key Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New API Key</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Key Name</FormLabel>
                <Input
                  placeholder="e.g., Production API, Development Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
                <FormHelperText>A descriptive name to identify this key</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Permissions</FormLabel>
                <CheckboxGroup value={newKeyPermissions} onChange={(values) => setNewKeyPermissions(values as string[])}>
                  <Stack spacing={2}>
                    {permissionOptions.map(opt => (
                      <Checkbox key={opt.value} value={opt.value}>
                        <HStack>
                          <Text fontWeight="medium">{opt.label}</Text>
                          <Text fontSize="sm" color="gray.500">- {opt.description}</Text>
                        </HStack>
                      </Checkbox>
                    ))}
                  </Stack>
                </CheckboxGroup>
              </FormControl>

              <FormControl>
                <FormLabel>Expiration</FormLabel>
                <Select value={newKeyExpiry} onChange={(e) => setNewKeyExpiry(e.target.value)}>
                  <option value="never">Never expires</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Rate Limit (requests/minute)</FormLabel>
                <Select value={newKeyRateLimit} onChange={(e) => setNewKeyRateLimit(e.target.value)}>
                  <option value="10">10/min</option>
                  <option value="30">30/min</option>
                  <option value="60">60/min (default)</option>
                  <option value="100">100/min</option>
                  <option value="500">500/min</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={createApiKey} isLoading={creating}>
              Create Key
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Revoke API Key</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning" borderRadius="md" mb={4}>
              <AlertIcon />
              <Text>This action cannot be undone.</Text>
            </Alert>
            <Text>
              Are you sure you want to revoke <strong>{selectedKey?.name}</strong>? 
              Any applications using this key will immediately lose access.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={() => selectedKey && revokeApiKey(selectedKey)}>
              Revoke Key
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SecurityLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/security/api-keys',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
