import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  IconButton,
  Select,
  Spinner,
  useToast,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  SimpleGrid,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Tooltip,
  Divider,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  FiCheck,
  FiX,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiTarget,
  FiUsers,
  FiTrendingUp,
  FiBriefcase,
  FiLayers,
  FiDatabase,
  FiBarChart2,
  FiCpu,
  FiAlertCircle,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const GOOSE_MIND_API = process.env.NEXT_PUBLIC_GOOSE_MIND_API || 'https://rtx-workstation.tailb64e64.ts.net:8031';

interface KnowledgeItem {
  id: string;
  content: string;
  domain: string;
  type: string;
  review_status: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface KnowledgeStats {
  total: number;
  by_domain: Record<string, number>;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
}

const domainIcons: Record<string, React.ElementType> = {
  goals: FiTarget,
  preferences: FiLayers,
  relationships: FiUsers,
  strategy: FiTrendingUp,
  projects: FiBriefcase,
  data_science: FiBarChart2,
  business: FiDatabase,
  professional: FiCpu,
};

const domainColors: Record<string, string> = {
  goals: 'purple',
  preferences: 'blue',
  relationships: 'green',
  strategy: 'orange',
  projects: 'cyan',
  data_science: 'pink',
  business: 'yellow',
  professional: 'teal',
};

const statusColors: Record<string, string> = {
  pending_review: 'yellow',
  verified: 'green',
  needs_update: 'orange',
  deprecated: 'red',
};

const LearningTab: React.FC = () => {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('pending_review');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  const textSecondary = useSemanticToken('text.secondary');
  const bgCard = useSemanticToken('bg.card');

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${GOOSE_MIND_API}/knowledge/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDomain) params.append('domain', selectedDomain);
      if (selectedStatus) params.append('status', selectedStatus);
      params.append('limit', '50');
      
      const response = await fetch(`${GOOSE_MIND_API}/knowledge/review?${params}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      toast({
        title: 'Failed to load knowledge',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDomain, selectedStatus, toast]);

  useEffect(() => {
    fetchStats();
    fetchItems();
  }, [fetchStats, fetchItems]);

  const handleUpdateStatus = async (itemId: string, newStatus: string) => {
    try {
      const response = await fetch(`${GOOSE_MIND_API}/knowledge/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledge_id: itemId,
          new_status: newStatus,
          notes: reviewNotes || undefined,
        }),
      });
      
      if (response.ok) {
        toast({
          title: `Marked as ${newStatus}`,
          status: 'success',
          duration: 2000,
        });
        fetchItems();
        fetchStats();
        onClose();
      }
    } catch (error) {
      toast({
        title: 'Failed to update',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleUpdateContent = async (itemId: string, newContent: string) => {
    try {
      const response = await fetch(`${GOOSE_MIND_API}/knowledge/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledge_id: itemId,
          new_content: newContent,
        }),
      });
      
      if (response.ok) {
        toast({
          title: 'Content updated',
          status: 'success',
          duration: 2000,
        });
        fetchItems();
        onClose();
      }
    } catch (error) {
      toast({
        title: 'Failed to update content',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this knowledge item?')) return;
    
    try {
      const response = await fetch(`${GOOSE_MIND_API}/knowledge/${itemId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({
          title: 'Deleted',
          status: 'info',
          duration: 2000,
        });
        fetchItems();
        fetchStats();
      }
    } catch (error) {
      toast({
        title: 'Failed to delete',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const openEditModal = (item: KnowledgeItem) => {
    setSelectedItem(item);
    setEditContent(item.content);
    setReviewNotes('');
    onOpen();
  };

  const DomainIcon = ({ domain }: { domain: string }) => {
    const IconComponent = domainIcons[domain] || FiLayers;
    return <IconComponent />;
  };

  return (
    <Box>
      {/* Stats Overview */}
      <Card mb={6}>
        <CardHeader>
          <HStack justify="space-between">
            <Heading size="md">Knowledge Base Learning</Heading>
            <Button
              leftIcon={<FiRefreshCw />}
              size="sm"
              onClick={() => { fetchStats(); fetchItems(); }}
            >
              Refresh
            </Button>
          </HStack>
        </CardHeader>
        <CardBody>
          {stats ? (
            <VStack spacing={4} align="stretch">
              <StatGroup>
                <Stat>
                  <StatLabel>Total Knowledge</StatLabel>
                  <StatNumber>{stats.total}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Pending Review</StatLabel>
                  <StatNumber color="yellow.500">
                    {stats.by_status?.pending_review || 0}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Verified</StatLabel>
                  <StatNumber color="green.500">
                    {stats.by_status?.verified || 0}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Needs Update</StatLabel>
                  <StatNumber color="orange.500">
                    {stats.by_status?.needs_update || 0}
                  </StatNumber>
                </Stat>
              </StatGroup>
              
              <Divider />
              
              <Text fontWeight="medium" mb={2}>By Domain</Text>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                {Object.entries(stats.by_domain || {}).map(([domain, count]) => (
                  <HStack
                    key={domain}
                    p={2}
                    borderRadius="md"
                    bg={bgCard}
                    cursor="pointer"
                    onClick={() => setSelectedDomain(domain)}
                    _hover={{ opacity: 0.8 }}
                  >
                    <DomainIcon domain={domain} />
                    <Text fontSize="sm" textTransform="capitalize">
                      {domain.replace('_', ' ')}
                    </Text>
                    <Badge colorScheme={domainColors[domain] || 'gray'}>
                      {count}
                    </Badge>
                  </HStack>
                ))}
              </SimpleGrid>
            </VStack>
          ) : (
            <Spinner />
          )}
        </CardBody>
      </Card>

      {/* Filters */}
      <Card mb={6}>
        <CardBody>
          <HStack spacing={4}>
            <Select
              placeholder="All Domains"
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              maxW="200px"
            >
              <option value="goals">Goals</option>
              <option value="preferences">Preferences</option>
              <option value="relationships">Relationships</option>
              <option value="strategy">Strategy</option>
              <option value="projects">Projects</option>
              <option value="data_science">Data Science</option>
              <option value="business">Business</option>
              <option value="professional">Professional</option>
            </Select>
            
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              maxW="200px"
            >
              <option value="">All Status</option>
              <option value="pending_review">Pending Review</option>
              <option value="verified">Verified</option>
              <option value="needs_update">Needs Update</option>
              <option value="deprecated">Deprecated</option>
            </Select>
            
            <Text color={textSecondary} fontSize="sm">
              {items.length} items
            </Text>
          </HStack>
        </CardBody>
      </Card>

      {/* Knowledge Items */}
      {loading ? (
        <Box textAlign="center" py={8}>
          <Spinner size="lg" />
        </Box>
      ) : items.length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          No knowledge items found. The agent learns from your conversations automatically.
        </Alert>
      ) : (
        <VStack spacing={4} align="stretch">
          {items.map((item) => (
            <Card key={item.id}>
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <HStack>
                      <DomainIcon domain={item.domain} />
                      <Badge colorScheme={domainColors[item.domain] || 'gray'}>
                        {item.domain?.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">{item.type}</Badge>
                      <Badge colorScheme={statusColors[item.review_status] || 'gray'}>
                        {item.review_status?.replace('_', ' ')}
                      </Badge>
                    </HStack>
                    <HStack>
                      <Tooltip label="Verify">
                        <IconButton
                          aria-label="Verify"
                          icon={<FiCheck />}
                          size="sm"
                          colorScheme="green"
                          variant="ghost"
                          onClick={() => handleUpdateStatus(item.id, 'verified')}
                        />
                      </Tooltip>
                      <Tooltip label="Needs Update">
                        <IconButton
                          aria-label="Needs Update"
                          icon={<FiAlertCircle />}
                          size="sm"
                          colorScheme="orange"
                          variant="ghost"
                          onClick={() => handleUpdateStatus(item.id, 'needs_update')}
                        />
                      </Tooltip>
                      <Tooltip label="Edit">
                        <IconButton
                          aria-label="Edit"
                          icon={<FiEdit2 />}
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(item)}
                        />
                      </Tooltip>
                      <Tooltip label="Delete">
                        <IconButton
                          aria-label="Delete"
                          icon={<FiTrash2 />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => handleDelete(item.id)}
                        />
                      </Tooltip>
                    </HStack>
                  </HStack>
                  
                  <Text>{item.content}</Text>
                  
                  {item.created_at && (
                    <Text fontSize="xs" color={textSecondary}>
                      Learned: {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  )}
                </VStack>
              </CardBody>
            </Card>
          ))}
        </VStack>
      )}

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Knowledge</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {selectedItem && (
                <>
                  <HStack>
                    <Badge colorScheme={domainColors[selectedItem.domain] || 'gray'}>
                      {selectedItem.domain}
                    </Badge>
                    <Badge variant="outline">{selectedItem.type}</Badge>
                  </HStack>
                  
                  <Text fontWeight="medium">Content</Text>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                  />
                  
                  <Text fontWeight="medium">Review Notes (optional)</Text>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes about this review..."
                    rows={2}
                  />
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={2}>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                colorScheme="orange"
                onClick={() => selectedItem && handleUpdateStatus(selectedItem.id, 'needs_update')}
              >
                Flag for Update
              </Button>
              <Button
                colorScheme="green"
                onClick={() => {
                  if (selectedItem) {
                    if (editContent !== selectedItem.content) {
                      handleUpdateContent(selectedItem.id, editContent);
                    } else {
                      handleUpdateStatus(selectedItem.id, 'verified');
                    }
                  }
                }}
              >
                {editContent !== selectedItem?.content ? 'Save & Verify' : 'Verify'}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default LearningTab;
