/**
 * Safety Management Panel for AI Gateway
 * Manages parental controls for Image Studio:
 * - Blocked terms management
 * - Audit log viewing
 * - Safety statistics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  useToast,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Textarea,
  Switch,
  Spinner,
  Alert,
  AlertIcon,
  Tooltip,
  Divider,
} from '@chakra-ui/react';
import {
  FiShield,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiEye,
  FiAlertTriangle,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiDownload,
  FiFilter,
} from 'react-icons/fi';

interface BlockedTerm {
  id: number;
  term: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

interface AuditLogEntry {
  id: number;
  user_id: string;
  service_id: string;
  prompt: string;
  model: string;
  violations: string[] | null;
  action: 'generated' | 'blocked' | 'failed';
  created_at: string;
}

interface SafetyStats {
  totalBlocked: number;
  totalGenerated: number;
  totalFailed: number;
  blockedTermsCount: number;
  topViolations: { term: string; count: number }[];
  recentActivity: AuditLogEntry[];
}

export const SafetyManagementPanel: React.FC = () => {
  const [blockedTerms, setBlockedTerms] = useState<BlockedTerm[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<SafetyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTerm, setNewTerm] = useState('');
  const [newCategory, setNewCategory] = useState('adult');
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterUser, setFilterUser] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadBlockedTerms(),
        loadAuditLog(),
        loadStats(),
      ]);
    } catch (error) {
      console.error('Failed to load safety data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBlockedTerms = async () => {
    try {
      const response = await fetch('/api/safety/blocked-terms');
      if (response.ok) {
        const data = await response.json();
        setBlockedTerms(data.terms || []);
      }
    } catch (error) {
      console.error('Failed to load blocked terms:', error);
    }
  };

  const loadAuditLog = async () => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterAction) params.append('action', filterAction);
      if (filterUser) params.append('user_id', filterUser);
      
      const response = await fetch(`/api/safety/audit-log?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAuditLog(data.entries || []);
      }
    } catch (error) {
      console.error('Failed to load audit log:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/safety/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadAuditLog();
  }, [filterAction, filterUser]);

  const handleAddTerm = async () => {
    if (!newTerm.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a term to block',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      const response = await fetch('/api/safety/blocked-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: newTerm.trim().toLowerCase(),
          category: newCategory,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Term Added',
          description: `"${newTerm}" has been added to blocked terms`,
          status: 'success',
          duration: 3000,
        });
        setNewTerm('');
        onAddClose();
        loadBlockedTerms();
        loadStats();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to add term',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add term',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleToggleTerm = async (term: BlockedTerm) => {
    try {
      const response = await fetch(`/api/safety/blocked-terms/${term.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !term.is_active }),
      });

      if (response.ok) {
        toast({
          title: term.is_active ? 'Term Disabled' : 'Term Enabled',
          description: `"${term.term}" has been ${term.is_active ? 'disabled' : 'enabled'}`,
          status: 'success',
          duration: 2000,
        });
        loadBlockedTerms();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update term',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeleteTerm = async (term: BlockedTerm) => {
    if (!confirm(`Are you sure you want to delete "${term.term}"?`)) return;

    try {
      const response = await fetch(`/api/safety/blocked-terms/${term.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Term Deleted',
          description: `"${term.term}" has been removed`,
          status: 'success',
          duration: 2000,
        });
        loadBlockedTerms();
        loadStats();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete term',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleViewEntry = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    onDetailOpen();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'adult': return 'red';
      case 'violence': return 'orange';
      case 'substance': return 'purple';
      case 'hate': return 'gray';
      default: return 'blue';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'generated': return 'green';
      case 'blocked': return 'red';
      case 'failed': return 'orange';
      default: return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading safety data...</Text>
      </Box>
    );
  }

  return (
    <Box>
      {/* Stats Overview */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <FiShield />
                  <Text>Blocked Requests</Text>
                </HStack>
              </StatLabel>
              <StatNumber color="red.500">{stats?.totalBlocked || 0}</StatNumber>
              <StatHelpText>Safety filter activations</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <FiCheck />
                  <Text>Successful Generations</Text>
                </HStack>
              </StatLabel>
              <StatNumber color="green.500">{stats?.totalGenerated || 0}</StatNumber>
              <StatHelpText>Safe images created</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <FiAlertTriangle />
                  <Text>Failed Requests</Text>
                </HStack>
              </StatLabel>
              <StatNumber color="orange.500">{stats?.totalFailed || 0}</StatNumber>
              <StatHelpText>Technical failures</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <FiX />
                  <Text>Active Blocked Terms</Text>
                </HStack>
              </StatLabel>
              <StatNumber color="blue.500">{stats?.blockedTermsCount || blockedTerms.filter(t => t.is_active).length}</StatNumber>
              <StatHelpText>Parental control filters</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Main Content Tabs */}
      <Tabs colorScheme="blue">
        <TabList>
          <Tab>
            <HStack>
              <FiShield />
              <Text>Blocked Terms</Text>
              <Badge colorScheme="blue">{blockedTerms.length}</Badge>
            </HStack>
          </Tab>
          <Tab>
            <HStack>
              <FiEye />
              <Text>Audit Log</Text>
              <Badge colorScheme="gray">{auditLog.length}</Badge>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels>
          {/* Blocked Terms Tab */}
          <TabPanel px={0}>
            <Card>
              <CardHeader>
                <HStack justify="space-between">
                  <Heading size="sm">Manage Blocked Terms</Heading>
                  <HStack>
                    <Button
                      size="sm"
                      leftIcon={<FiRefreshCw />}
                      onClick={loadBlockedTerms}
                      variant="outline"
                    >
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      leftIcon={<FiPlus />}
                      colorScheme="blue"
                      onClick={onAddOpen}
                    >
                      Add Term
                    </Button>
                  </HStack>
                </HStack>
              </CardHeader>
              <CardBody>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Term</Th>
                      <Th>Category</Th>
                      <Th>Status</Th>
                      <Th>Added</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {blockedTerms.map((term) => (
                      <Tr key={term.id} opacity={term.is_active ? 1 : 0.5}>
                        <Td fontFamily="mono">{term.term}</Td>
                        <Td>
                          <Badge colorScheme={getCategoryColor(term.category)}>
                            {term.category}
                          </Badge>
                        </Td>
                        <Td>
                          <Switch
                            size="sm"
                            isChecked={term.is_active}
                            onChange={() => handleToggleTerm(term)}
                            colorScheme="green"
                          />
                        </Td>
                        <Td fontSize="xs" color="gray.500">
                          {formatDate(term.created_at)}
                        </Td>
                        <Td>
                          <IconButton
                            aria-label="Delete term"
                            icon={<FiTrash2 />}
                            size="xs"
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => handleDeleteTerm(term)}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {blockedTerms.length === 0 && (
                  <Text textAlign="center" color="gray.500" py={4}>
                    No blocked terms configured
                  </Text>
                )}
              </CardBody>
            </Card>
          </TabPanel>

          {/* Audit Log Tab */}
          <TabPanel px={0}>
            <Card>
              <CardHeader>
                <VStack align="stretch" spacing={4}>
                  <HStack justify="space-between">
                    <Heading size="sm">Image Generation Audit Log</Heading>
                    <HStack>
                      <Button
                        size="sm"
                        leftIcon={<FiRefreshCw />}
                        onClick={loadAuditLog}
                        variant="outline"
                      >
                        Refresh
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={<FiDownload />}
                        variant="outline"
                      >
                        Export
                      </Button>
                    </HStack>
                  </HStack>
                  <HStack>
                    <Select
                      size="sm"
                      placeholder="All Actions"
                      value={filterAction}
                      onChange={(e) => setFilterAction(e.target.value)}
                      maxW="150px"
                    >
                      <option value="blocked">Blocked</option>
                      <option value="generated">Generated</option>
                      <option value="failed">Failed</option>
                    </Select>
                    <Input
                      size="sm"
                      placeholder="Filter by user..."
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                      maxW="200px"
                    />
                  </HStack>
                </VStack>
              </CardHeader>
              <CardBody>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Time</Th>
                      <Th>User</Th>
                      <Th>Action</Th>
                      <Th>Model</Th>
                      <Th>Prompt Preview</Th>
                      <Th>Details</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {auditLog.map((entry) => (
                      <Tr key={entry.id}>
                        <Td fontSize="xs" whiteSpace="nowrap">
                          {formatDate(entry.created_at)}
                        </Td>
                        <Td>
                          <Badge variant="outline">{entry.user_id}</Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme={getActionColor(entry.action)}>
                            {entry.action}
                          </Badge>
                        </Td>
                        <Td fontSize="xs">{entry.model || '-'}</Td>
                        <Td maxW="200px" isTruncated>
                          <Tooltip label={entry.prompt}>
                            <Text fontSize="xs">{entry.prompt?.substring(0, 50)}...</Text>
                          </Tooltip>
                        </Td>
                        <Td>
                          <IconButton
                            aria-label="View details"
                            icon={<FiEye />}
                            size="xs"
                            variant="ghost"
                            onClick={() => handleViewEntry(entry)}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {auditLog.length === 0 && (
                  <Text textAlign="center" color="gray.500" py={4}>
                    No audit log entries found
                  </Text>
                )}
              </CardBody>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Add Term Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Blocked Term</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Term to Block</FormLabel>
                <Input
                  placeholder="Enter term..."
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="adult">Adult Content</option>
                  <option value="violence">Violence</option>
                  <option value="substance">Substance</option>
                  <option value="hate">Hate Speech</option>
                  <option value="other">Other</option>
                </Select>
              </FormControl>
              <Alert status="info" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  Terms are matched case-insensitively as whole words in prompts.
                </Text>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleAddTerm}>
              Add Term
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Entry Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Text>Audit Log Entry</Text>
              {selectedEntry && (
                <Badge colorScheme={getActionColor(selectedEntry.action)}>
                  {selectedEntry.action}
                </Badge>
              )}
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedEntry && (
              <VStack align="stretch" spacing={4}>
                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.500">User</Text>
                    <Text>{selectedEntry.user_id}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.500">Service</Text>
                    <Text>{selectedEntry.service_id || '-'}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.500">Model</Text>
                    <Text>{selectedEntry.model || '-'}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.500">Time</Text>
                    <Text>{formatDate(selectedEntry.created_at)}</Text>
                  </Box>
                </SimpleGrid>
                
                <Divider />
                
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.500" mb={2}>Prompt</Text>
                  <Box bg="gray.50" p={3} borderRadius="md" _dark={{ bg: 'gray.700' }}>
                    <Text fontSize="sm" whiteSpace="pre-wrap">{selectedEntry.prompt}</Text>
                  </Box>
                </Box>
                
                {selectedEntry.violations && selectedEntry.violations.length > 0 && (
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.500" mb={2}>Violations</Text>
                    <HStack flexWrap="wrap">
                      {selectedEntry.violations.map((v, i) => (
                        <Badge key={i} colorScheme="red">{v}</Badge>
                      ))}
                    </HStack>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onDetailClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SafetyManagementPanel;
