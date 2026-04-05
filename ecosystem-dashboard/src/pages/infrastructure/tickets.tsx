/**
 * Ticket Tracker Page
 * 
 * Infrastructure-domain page for viewing and managing tickets created by
 * Nova Agent conversations, OpenClaw analysis, and manual entries.
 * Tickets flow: Nova creates → OpenClaw analyzes → Windsurf implements → Approval → Resolve
 */

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Badge,
  Button,
  IconButton,
  Icon,
  Select,
  Input,
  Textarea,
  Spinner,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Tag,
  TagLabel,
  Tooltip,
  Divider,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import {
  FiRefreshCw,
  FiPlus,
  FiFilter,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiTool,
  FiEye,
  FiGitBranch,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  severity: string;
  category: string;
  component: string | null;
  tags: string[];
  source_agent: string;
  source_context: string | null;
  assigned_to: string | null;
  delegated_to: string | null;
  delegation_status: string | null;
  analysis: string | null;
  analysis_agent: string | null;
  proposed_fix: string | null;
  affected_files: string[];
  resolution: string | null;
  resolution_agent: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'red',
  triaged: 'orange',
  analyzing: 'blue',
  in_progress: 'purple',
  awaiting_approval: 'yellow',
  resolved: 'green',
  closed: 'gray',
  wont_fix: 'gray',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'blue',
  low: 'gray',
};

const AGENT_LABELS: Record<string, string> = {
  nova: 'Nova',
  openclaw: 'OpenClaw',
  windsurf: 'Windsurf',
  manual: 'Manual',
};

function TicketRow({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceHover = useSemanticToken('surface.hover');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  const age = getAge(ticket.created_at);

  return (
    <Box
      p={3}
      borderBottom="1px solid"
      borderColor={borderSubtle}
      cursor="pointer"
      _hover={{ bg: surfaceHover }}
      onClick={onClick}
      transition="background 0.15s"
    >
      <Flex justify="space-between" align="start" gap={3}>
        <Box flex={1} minW={0}>
          <HStack spacing={2} mb={1}>
            <Badge colorScheme={STATUS_COLORS[ticket.status] || 'gray'} fontSize="2xs">
              {ticket.status.replace('_', ' ')}
            </Badge>
            <Badge colorScheme={PRIORITY_COLORS[ticket.priority] || 'gray'} variant="outline" fontSize="2xs">
              {ticket.priority}
            </Badge>
            <Badge variant="subtle" fontSize="2xs">{ticket.category}</Badge>
          </HStack>
          <Text fontSize="sm" fontWeight="600" color={textPrimary} noOfLines={1}>
            {ticket.title}
          </Text>
          {ticket.description && (
            <Text fontSize="xs" color={textSecondary} noOfLines={1} mt={0.5}>
              {ticket.description}
            </Text>
          )}
          <HStack spacing={2} mt={1.5}>
            {ticket.component && (
              <Tag size="sm" variant="subtle" colorScheme="purple">
                <TagLabel>{ticket.component}</TagLabel>
              </Tag>
            )}
            <Text fontSize="2xs" color={textSecondary}>
              {AGENT_LABELS[ticket.source_agent] || ticket.source_agent} · {age}
            </Text>
            {ticket.assigned_to && (
              <Text fontSize="2xs" color={textSecondary}>
                → {AGENT_LABELS[ticket.assigned_to] || ticket.assigned_to}
              </Text>
            )}
          </HStack>
        </Box>
        <Icon as={FiEye} color={textSecondary} boxSize={3.5} mt={1} flexShrink={0} />
      </Flex>
    </Box>
  );
}

function TicketDetail({
  ticket,
  onUpdate,
  isUpdating,
}: {
  ticket: Ticket;
  onUpdate: (fields: Partial<Ticket>) => void;
  isUpdating: boolean;
}) {
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceElevated = useSemanticToken('surface.elevated');

  return (
    <VStack align="stretch" spacing={4} p={4}>
      <Box>
        <HStack spacing={2} mb={2}>
          <Badge colorScheme={STATUS_COLORS[ticket.status] || 'gray'} fontSize="xs">
            {ticket.status.replace('_', ' ')}
          </Badge>
          <Badge colorScheme={PRIORITY_COLORS[ticket.priority] || 'gray'} variant="outline" fontSize="xs">
            {ticket.priority}
          </Badge>
          <Badge variant="subtle" fontSize="xs">{ticket.severity}</Badge>
          <Badge variant="subtle" fontSize="xs">{ticket.category}</Badge>
        </HStack>
        <Text fontSize="lg" fontWeight="700" color={textPrimary}>{ticket.title}</Text>
        {ticket.description && (
          <Text fontSize="sm" color={textSecondary} mt={2} whiteSpace="pre-wrap">
            {ticket.description}
          </Text>
        )}
      </Box>

      <Divider borderColor={borderSubtle} />

      <SimpleGrid columns={2} spacing={3}>
        <Box>
          <Text fontSize="2xs" fontWeight="600" color={textSecondary} textTransform="uppercase">Source</Text>
          <Text fontSize="sm" color={textPrimary}>{AGENT_LABELS[ticket.source_agent] || ticket.source_agent}</Text>
        </Box>
        <Box>
          <Text fontSize="2xs" fontWeight="600" color={textSecondary} textTransform="uppercase">Component</Text>
          <Text fontSize="sm" color={textPrimary}>{ticket.component || '—'}</Text>
        </Box>
        <Box>
          <Text fontSize="2xs" fontWeight="600" color={textSecondary} textTransform="uppercase">Assigned To</Text>
          <Text fontSize="sm" color={textPrimary}>
            {ticket.assigned_to ? (AGENT_LABELS[ticket.assigned_to] || ticket.assigned_to) : '—'}
          </Text>
        </Box>
        <Box>
          <Text fontSize="2xs" fontWeight="600" color={textSecondary} textTransform="uppercase">Created</Text>
          <Text fontSize="sm" color={textPrimary}>{new Date(ticket.created_at).toLocaleString()}</Text>
        </Box>
      </SimpleGrid>

      {ticket.source_context && (
        <Box>
          <Text fontSize="2xs" fontWeight="600" color={textSecondary} textTransform="uppercase" mb={1}>
            Conversation Context
          </Text>
          <Box bg={surfaceElevated} p={3} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" color={textPrimary}>
            {ticket.source_context}
          </Box>
        </Box>
      )}

      {ticket.analysis && (
        <Box>
          <Text fontSize="2xs" fontWeight="600" color={textSecondary} textTransform="uppercase" mb={1}>
            Analysis ({ticket.analysis_agent || '?'})
          </Text>
          <Box bg={surfaceElevated} p={3} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" color={textPrimary}>
            {ticket.analysis}
          </Box>
        </Box>
      )}

      {ticket.proposed_fix && (
        <Box>
          <Text fontSize="2xs" fontWeight="600" color={textSecondary} textTransform="uppercase" mb={1}>
            Proposed Fix
          </Text>
          <Box bg={surfaceElevated} p={3} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" color={textPrimary}>
            {ticket.proposed_fix}
          </Box>
        </Box>
      )}

      {ticket.affected_files && ticket.affected_files.length > 0 && (
        <Box>
          <Text fontSize="2xs" fontWeight="600" color={textSecondary} textTransform="uppercase" mb={1}>
            Affected Files
          </Text>
          <VStack align="stretch" spacing={0.5}>
            {ticket.affected_files.map((f: string, i: number) => (
              <Text key={i} fontSize="xs" fontFamily="mono" color={textPrimary}>{f}</Text>
            ))}
          </VStack>
        </Box>
      )}

      {ticket.resolution && (
        <Box>
          <Text fontSize="2xs" fontWeight="600" color={textSecondary} textTransform="uppercase" mb={1}>
            Resolution ({ticket.resolution_agent || '?'})
          </Text>
          <Box bg={surfaceElevated} p={3} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" color={textPrimary}>
            {ticket.resolution}
          </Box>
        </Box>
      )}

      <Divider borderColor={borderSubtle} />

      {/* Quick actions */}
      <HStack spacing={2} flexWrap="wrap">
        {ticket.status === 'open' && (
          <>
            <Button size="xs" colorScheme="blue" onClick={() => onUpdate({ status: 'triaged' })} isLoading={isUpdating}>
              Triage
            </Button>
            <Button size="xs" colorScheme="purple" onClick={() => onUpdate({ status: 'analyzing', assigned_to: 'openclaw' })} isLoading={isUpdating}>
              Assign to OpenClaw
            </Button>
            <Button size="xs" variant="outline" onClick={() => onUpdate({ assigned_to: 'windsurf' })} isLoading={isUpdating}>
              Assign to Windsurf
            </Button>
          </>
        )}
        {ticket.status === 'triaged' && (
          <>
            <Button size="xs" colorScheme="purple" onClick={() => onUpdate({ status: 'analyzing', assigned_to: 'openclaw' })} isLoading={isUpdating}>
              Send to OpenClaw
            </Button>
            <Button size="xs" variant="outline" onClick={() => onUpdate({ assigned_to: 'windsurf' })} isLoading={isUpdating}>
              Send to Windsurf
            </Button>
          </>
        )}
        {(ticket.status === 'analyzing' || ticket.status === 'in_progress') && (
          <Button size="xs" colorScheme="green" onClick={() => onUpdate({ status: 'resolved' })} isLoading={isUpdating}>
            Mark Resolved
          </Button>
        )}
        {ticket.status !== 'closed' && ticket.status !== 'wont_fix' && (
          <>
            <Button size="xs" variant="ghost" onClick={() => onUpdate({ status: 'closed' })} isLoading={isUpdating}>
              Close
            </Button>
            <Button size="xs" variant="ghost" colorScheme="gray" onClick={() => onUpdate({ status: 'wont_fix' })} isLoading={isUpdating}>
              Won&apos;t Fix
            </Button>
          </>
        )}
      </HStack>
    </VStack>
  );
}

function getAge(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TicketsPage = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newCategory, setNewCategory] = useState('bug');
  const [newComponent, setNewComponent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const toast = useToast();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceElevated = useSemanticToken('surface.elevated');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      params.set('per_page', '100');

      const res = await fetch(`/api/tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleUpdate = async (fields: Partial<Ticket>) => {
    if (!selectedTicket) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        setTickets(prev => prev.map(t => t.id === data.ticket.id ? data.ticket : t));
        toast({ title: 'Ticket updated', status: 'success', duration: 2000 });
      }
    } catch (err) {
      toast({ title: 'Update failed', status: 'error', duration: 3000 });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          priority: newPriority,
          category: newCategory,
          component: newComponent.trim() || undefined,
          source_agent: 'manual',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(prev => [data.ticket, ...prev]);
        setTotal(prev => prev + 1);
        onCreateClose();
        setNewTitle('');
        setNewDesc('');
        setNewComponent('');
        toast({ title: 'Ticket created', status: 'success', duration: 2000 });
      }
    } catch (err) {
      toast({ title: 'Create failed', status: 'error', duration: 3000 });
    } finally {
      setIsCreating(false);
    }
  };

  // Stats
  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => ['analyzing', 'in_progress', 'awaiting_approval'].includes(t.status)).length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  return (
    <DashboardLayout>
      <Head>
        <title>Tickets | AI Homelab</title>
      </Head>

      <Box maxW="1400px" mx="auto">
        {/* Header */}
        <Flex justify="space-between" align="center" mb={4}>
          <HStack spacing={3}>
            <Icon as={FiTool} color={textPrimary} boxSize={5} />
            <Text fontSize="lg" fontWeight="700" color={textPrimary}>Ticket Tracker</Text>
            <Badge colorScheme="blue" variant="solid" fontSize="xs">{total}</Badge>
          </HStack>
          <HStack spacing={2}>
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw />}
              variant="ghost"
              size="sm"
              onClick={fetchTickets}
              isLoading={loading}
            />
            <Button leftIcon={<FiPlus />} size="sm" colorScheme="blue" onClick={onCreateOpen}>
              New Ticket
            </Button>
          </HStack>
        </Flex>

        {/* Stats */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mb={4}>
          <Stat bg={surfaceElevated} p={3} borderRadius="md" border="1px solid" borderColor={borderSubtle}>
            <StatLabel fontSize="xs">Open</StatLabel>
            <StatNumber fontSize="xl" color="red.400">{openCount}</StatNumber>
            <StatHelpText fontSize="2xs">Needs attention</StatHelpText>
          </Stat>
          <Stat bg={surfaceElevated} p={3} borderRadius="md" border="1px solid" borderColor={borderSubtle}>
            <StatLabel fontSize="xs">In Progress</StatLabel>
            <StatNumber fontSize="xl" color="blue.400">{inProgressCount}</StatNumber>
            <StatHelpText fontSize="2xs">Analyzing / fixing</StatHelpText>
          </Stat>
          <Stat bg={surfaceElevated} p={3} borderRadius="md" border="1px solid" borderColor={borderSubtle}>
            <StatLabel fontSize="xs">Resolved</StatLabel>
            <StatNumber fontSize="xl" color="green.400">{resolvedCount}</StatNumber>
            <StatHelpText fontSize="2xs">Done</StatHelpText>
          </Stat>
          <Stat bg={surfaceElevated} p={3} borderRadius="md" border="1px solid" borderColor={borderSubtle}>
            <StatLabel fontSize="xs">Total</StatLabel>
            <StatNumber fontSize="xl">{total}</StatNumber>
            <StatHelpText fontSize="2xs">All time</StatHelpText>
          </Stat>
        </SimpleGrid>

        {/* Filters */}
        <HStack spacing={2} mb={3}>
          <Icon as={FiFilter} color={textSecondary} boxSize={3.5} />
          <Select
            size="xs"
            maxW="140px"
            placeholder="All statuses"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="open">Open</option>
            <option value="triaged">Triaged</option>
            <option value="analyzing">Analyzing</option>
            <option value="in_progress">In Progress</option>
            <option value="awaiting_approval">Awaiting Approval</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
          <Select
            size="xs"
            maxW="120px"
            placeholder="All priorities"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </HStack>

        {/* Main layout: list + detail */}
        <Flex gap={4} direction={{ base: 'column', lg: 'row' }}>
          {/* Ticket list */}
          <Box
            flex={1}
            bg={surfaceElevated}
            border="1px solid"
            borderColor={borderSubtle}
            borderRadius="md"
            overflow="hidden"
            maxH="calc(100vh - 340px)"
            overflowY="auto"
          >
            {loading ? (
              <Flex justify="center" p={8}><Spinner size="sm" /></Flex>
            ) : tickets.length === 0 ? (
              <Box p={6} textAlign="center">
                <Text fontSize="sm" color={textSecondary}>No tickets found</Text>
              </Box>
            ) : (
              tickets.map(ticket => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => setSelectedTicket(ticket)}
                />
              ))
            )}
          </Box>

          {/* Detail panel */}
          {selectedTicket && (
            <Box
              w={{ base: 'full', lg: '480px' }}
              bg={surfaceElevated}
              border="1px solid"
              borderColor={borderSubtle}
              borderRadius="md"
              maxH="calc(100vh - 340px)"
              overflowY="auto"
              flexShrink={0}
            >
              <TicketDetail
                ticket={selectedTicket}
                onUpdate={handleUpdate}
                isUpdating={isUpdating}
              />
            </Box>
          )}
        </Flex>
      </Box>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="md">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader fontSize="md">Create Ticket</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <Input
                placeholder="Title"
                size="sm"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                size="sm"
                rows={3}
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
              <HStack w="full" spacing={2}>
                <Select size="sm" value={newPriority} onChange={e => setNewPriority(e.target.value)}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
                <Select size="sm" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                  <option value="bug">Bug</option>
                  <option value="feature">Feature</option>
                  <option value="improvement">Improvement</option>
                  <option value="investigation">Investigation</option>
                  <option value="maintenance">Maintenance</option>
                </Select>
              </HStack>
              <Input
                placeholder="Component (e.g. nova-agent, openclaw, hermes-core)"
                size="sm"
                value={newComponent}
                onChange={e => setNewComponent(e.target.value)}
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" size="sm" mr={2} onClick={onCreateClose}>Cancel</Button>
            <Button
              colorScheme="blue"
              size="sm"
              onClick={handleCreate}
              isLoading={isCreating}
              isDisabled={!newTitle.trim()}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
};

export default TicketsPage;
