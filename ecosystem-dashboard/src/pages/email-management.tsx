/**
 * Email Management Dashboard
 * UI for managing emails with PIC context, Hermes intelligence, and approval workflows
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
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
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Textarea,
  FormControl,
  FormLabel,
  Spinner,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardHeader,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';
import axios from 'axios';

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  priority_score?: number;
  priority_level?: string;
  is_read: boolean;
}

interface Draft {
  id: string;
  to: string;
  subject: string;
  body: string;
  created_at: string;
  pic_context_used: boolean;
}

export default function EmailManagement() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftForm, setDraftForm] = useState({
    recipient: '',
    subject: '',
    body: '',
    tone: 'professional'
  });
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    high_priority: 0,
    pending_approvals: 0
  });

  const toast = useToast();

  useEffect(() => {
    loadPriorityInbox();
    loadStats();
  }, []);

  const loadPriorityInbox = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/hermes/priority', {
        params: { limit: 20, min_score: 70 },
        headers: { 'X-Internal-Service-Key': process.env.NEXT_PUBLIC_INTERNAL_SERVICE_KEY }
      });
      setEmails(response.data.emails || []);
    } catch (error: any) {
      toast({
        title: 'Failed to load emails',
        description: error.message,
        status: 'error',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/email/stats', {
        headers: { 'X-Internal-Service-Key': process.env.NEXT_PUBLIC_INTERNAL_SERVICE_KEY }
      });
      setStats(response.data);
    } catch (error) {
      // Stats are optional
    }
  };

  const searchEmails = async () => {
    if (!searchQuery.trim()) {
      loadPriorityInbox();
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/openclaw/skills/homelab-email', {
        action: 'search',
        query: searchQuery
      });
      setEmails(response.data.results || []);
    } catch (error: any) {
      toast({
        title: 'Search failed',
        description: error.message,
        status: 'error',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const createDraft = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/hermes/draft', {
        recipient: draftForm.recipient,
        subject: draftForm.subject,
        tone: draftForm.tone,
        include_pic_context: true
      }, {
        headers: { 'X-Internal-Service-Key': process.env.NEXT_PUBLIC_INTERNAL_SERVICE_KEY }
      });

      toast({
        title: 'Draft created',
        description: 'Email draft created with PIC context',
        status: 'success',
        duration: 3000
      });

      setDraftModalOpen(false);
      setDraftForm({ recipient: '', subject: '', body: '', tone: 'professional' });
      
      // Reload drafts
      loadDrafts();
    } catch (error: any) {
      toast({
        title: 'Failed to create draft',
        description: error.message,
        status: 'error',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDrafts = async () => {
    try {
      const response = await axios.get('/api/email/drafts');
      setDrafts(response.data.drafts || []);
    } catch (error) {
      // Drafts are optional
    }
  };

  const sendEmail = async (draft: Draft) => {
    try {
      const response = await axios.post('/api/approvals/email', {
        action: 'send',
        email: {
          to: draft.to,
          subject: draft.subject,
          body: draft.body
        },
        agent: {
          id: 'dashboard',
          name: 'Email Management Dashboard',
          type: 'email-agent'
        },
        reasoning: 'User-initiated email send from dashboard'
      });

      toast({
        title: 'Approval requested',
        description: `Email submitted for approval. ID: ${response.data.approval_id}`,
        status: 'info',
        duration: 5000
      });
    } catch (error: any) {
      toast({
        title: 'Failed to send email',
        description: error.message,
        status: 'error',
        duration: 5000
      });
    }
  };

  const getPriorityBadge = (level?: string) => {
    const colors: Record<string, string> = {
      critical: 'red',
      high: 'orange',
      medium: 'yellow',
      low: 'gray'
    };
    return (
      <Badge colorScheme={colors[level || 'low'] || 'gray'}>
        {level || 'normal'}
      </Badge>
    );
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading>Email Management</Heading>

        {/* Stats */}
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Emails</StatLabel>
                <StatNumber>{stats.total}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Unread</StatLabel>
                <StatNumber>{stats.unread}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>High Priority</StatLabel>
                <StatNumber>{stats.high_priority}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Pending Approvals</StatLabel>
                <StatNumber>{stats.pending_approvals}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Actions */}
        <HStack>
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchEmails()}
          />
          <Button onClick={searchEmails} isLoading={loading}>Search</Button>
          <Button colorScheme="blue" onClick={() => setDraftModalOpen(true)}>
            New Draft
          </Button>
          <Button onClick={loadPriorityInbox} isLoading={loading}>
            Refresh
          </Button>
        </HStack>

        {/* Tabs */}
        <Tabs>
          <TabList>
            <Tab>Priority Inbox</Tab>
            <Tab>Drafts</Tab>
            <Tab>Sent</Tab>
          </TabList>

          <TabPanels>
            {/* Priority Inbox */}
            <TabPanel>
              {loading ? (
                <Box textAlign="center" py={8}>
                  <Spinner size="xl" />
                </Box>
              ) : (
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>From</Th>
                      <Th>Subject</Th>
                      <Th>Date</Th>
                      <Th>Priority</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {emails.map((email) => (
                      <Tr key={email.id} bg={email.is_read ? 'transparent' : 'blue.50'}>
                        <Td>{email.from}</Td>
                        <Td fontWeight={email.is_read ? 'normal' : 'bold'}>
                          {email.subject}
                        </Td>
                        <Td>{new Date(email.date).toLocaleDateString()}</Td>
                        <Td>{getPriorityBadge(email.priority_level)}</Td>
                        <Td>
                          <Button size="sm" onClick={() => setSelectedEmail(email)}>
                            View
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </TabPanel>

            {/* Drafts */}
            <TabPanel>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>To</Th>
                    <Th>Subject</Th>
                    <Th>Created</Th>
                    <Th>PIC Context</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {drafts.map((draft) => (
                    <Tr key={draft.id}>
                      <Td>{draft.to}</Td>
                      <Td>{draft.subject}</Td>
                      <Td>{new Date(draft.created_at).toLocaleDateString()}</Td>
                      <Td>
                        <Badge colorScheme={draft.pic_context_used ? 'green' : 'gray'}>
                          {draft.pic_context_used ? 'Yes' : 'No'}
                        </Badge>
                      </Td>
                      <Td>
                        <Button size="sm" colorScheme="blue" onClick={() => sendEmail(draft)}>
                          Send (Approval Required)
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            {/* Sent */}
            <TabPanel>
              <Text color="gray.500">Sent emails will appear here</Text>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Draft Modal */}
      <Modal isOpen={draftModalOpen} onClose={() => setDraftModalOpen(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Email Draft</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Recipient</FormLabel>
                <Input
                  value={draftForm.recipient}
                  onChange={(e) => setDraftForm({ ...draftForm, recipient: e.target.value })}
                  placeholder="recipient@example.com"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Subject</FormLabel>
                <Input
                  value={draftForm.subject}
                  onChange={(e) => setDraftForm({ ...draftForm, subject: e.target.value })}
                  placeholder="Email subject"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Tone</FormLabel>
                <Select
                  value={draftForm.tone}
                  onChange={(e) => setDraftForm({ ...draftForm, tone: e.target.value })}
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                </Select>
              </FormControl>

              <Text fontSize="sm" color="gray.600">
                Draft will be generated with PIC context (relationship data, communication preferences)
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setDraftModalOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={createDraft} isLoading={loading}>
              Create Draft
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
