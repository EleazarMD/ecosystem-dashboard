import React, { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import {
  Box, VStack, HStack, Heading, Text, Badge, Button, Tabs, TabList, Tab,
  TabPanels, TabPanel, Table, Thead, Tbody, Tr, Th, Td, IconButton, Select,
  Spinner, Alert, AlertIcon, Tooltip, Textarea, Input, Code, SimpleGrid,
  Stat, StatLabel, StatNumber, StatHelpText, Switch, Divider, Tag, TagLabel,
  useToast, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure,
} from '@chakra-ui/react';
import {
  FiRefreshCw, FiTrash2, FiPlay, FiPause, FiPower, FiZap, FiClock,
  FiFileText, FiSave, FiChevronDown, FiChevronRight, FiTerminal,
  FiUsers, FiActivity, FiList, FiSettings, FiMonitor, FiExternalLink,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AgentBrowserViewer from '@/components/openclaw/AgentBrowserViewer';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  useOpenClawGateway,
  type GatewaySessionRow,
  type CronJob,
  type LogEntry,
  type AgentFileEntry,
  type SessionsUsageResult,
  type CostUsageSummary,
  type CronRunEntry,
} from '@/hooks/useOpenClawGateway';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtCost(usd: number) {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function fmtTs(ms?: number | null) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString();
}

function fmtRelTime(ms?: number | null) {
  if (!ms) return '—';
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const LOG_LEVEL_COLORS: Record<string, string> = {
  error: '#fc8181', fatal: '#fc8181', warn: '#f6ad55',
  info: '#68d391', debug: '#76e4f7', trace: '#a0aec0',
};

// ─── Subpanels ────────────────────────────────────────────────────────────────

function AgentsPanel({ gw }: { gw: ReturnType<typeof useOpenClawGateway> }) {
  const { state } = gw;
  const bgCard = useSemanticToken('surface.elevated');
  const border = useSemanticToken('border.subtle');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  useEffect(() => {
    if (state.connected) void gw.loadAgents();
  }, [state.connected]);

  return (
    <VStack align="stretch" spacing={3}>
      <HStack justify="space-between">
        <Text fontWeight="600" color={textPrimary}>Agents ({state.agents.length})</Text>
        <Button size="xs" leftIcon={<FiRefreshCw />} onClick={() => void gw.loadAgents()} isDisabled={!state.connected}>
          Refresh
        </Button>
      </HStack>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
        {state.agents.map((agent) => {
          const isSelected = agent.id === state.selectedAgentId;
          return (
            <Box
              key={agent.id}
              p={4}
              bg={bgCard}
              border="2px solid"
              borderColor={isSelected ? 'blue.400' : border}
              borderRadius="lg"
              cursor="pointer"
              onClick={() => gw.setSelectedAgent(agent.id)}
              _hover={{ borderColor: 'blue.300' }}
            >
              <HStack justify="space-between" mb={2}>
                <HStack>
                  <Text fontSize="xl">{agent.identity?.emoji ?? '🤖'}</Text>
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="600" fontSize="sm" color={textPrimary}>
                      {agent.identity?.name ?? agent.name ?? agent.id}
                    </Text>
                    <Text fontSize="xs" color={textSecondary} fontFamily="mono">{agent.id}</Text>
                  </VStack>
                </HStack>
                {isSelected && <Badge colorScheme="blue" fontSize="xs">active</Badge>}
              </HStack>
              {agent.identity?.theme && (
                <Tag size="sm" colorScheme="purple" variant="subtle">
                  <TagLabel>{agent.identity.theme}</TagLabel>
                </Tag>
              )}
            </Box>
          );
        })}
        {state.agents.length === 0 && state.connected && (
          <Text color={textSecondary} fontSize="sm">No agents found.</Text>
        )}
      </SimpleGrid>
    </VStack>
  );
}

function SessionsPanel({ gw }: { gw: ReturnType<typeof useOpenClawGateway> }) {
  const { state } = gw;
  const toast = useToast();
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgCard = useSemanticToken('surface.elevated');
  const border = useSemanticToken('border.subtle');

  useEffect(() => {
    if (state.connected) void gw.loadSessions();
  }, [state.connected]);

  const handleDelete = async (key: string) => {
    if (!window.confirm(`Delete session "${key}"? This archives its transcript.`)) return;
    try {
      await gw.deleteSession(key);
      toast({ title: 'Session deleted', status: 'success', duration: 2000 });
    } catch (err) {
      toast({ title: String(err), status: 'error', duration: 3000 });
    }
  };

  return (
    <VStack align="stretch" spacing={3}>
      <HStack justify="space-between">
        <Text fontWeight="600" color={textPrimary}>Sessions ({state.sessions.length})</Text>
        <Button size="xs" leftIcon={<FiRefreshCw />} onClick={() => void gw.loadSessions()} isDisabled={!state.connected}>
          Refresh
        </Button>
      </HStack>
      <Box overflowX="auto">
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Session</Th>
              <Th>Agent</Th>
              <Th>Surface</Th>
              <Th>Model</Th>
              <Th isNumeric>Tokens</Th>
              <Th>Updated</Th>
              <Th>Thinking</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {state.sessions.map((s) => (
              <Tr key={s.key} _hover={{ bg: bgCard }}>
                <Td>
                  <VStack align="start" spacing={0}>
                    <Text fontSize="xs" fontFamily="mono" color={textPrimary}>{s.displayName ?? s.key.slice(0, 16) + '…'}</Text>
                    <Badge fontSize="2xs" colorScheme={s.kind === 'direct' ? 'blue' : s.kind === 'group' ? 'purple' : 'gray'} variant="subtle">
                      {s.kind}
                    </Badge>
                  </VStack>
                </Td>
                <Td><Text fontSize="xs" color={textSecondary}>{s.agentId ?? '—'}</Text></Td>
                <Td><Text fontSize="xs" color={textSecondary}>{s.surface ?? '—'}</Text></Td>
                <Td>
                  <Text fontSize="xs" color={textSecondary} noOfLines={1} maxW="140px">
                    {s.model ? `${s.modelProvider ?? ''}/${s.model}`.replace(/^\//, '') : '—'}
                  </Text>
                </Td>
                <Td isNumeric>
                  <Text fontSize="xs" color={textSecondary}>{s.totalTokens ? fmtTokens(s.totalTokens) : '—'}</Text>
                </Td>
                <Td><Text fontSize="xs" color={textSecondary}>{fmtRelTime(s.updatedAt)}</Text></Td>
                <Td>
                  {s.thinkingLevel && (
                    <Badge fontSize="2xs" colorScheme="orange" variant="subtle">{s.thinkingLevel}</Badge>
                  )}
                </Td>
                <Td>
                  <Tooltip label="Delete session">
                    <IconButton
                      aria-label="delete" icon={<FiTrash2 />} size="xs" variant="ghost"
                      colorScheme="red" onClick={() => void handleDelete(s.key)}
                    />
                  </Tooltip>
                </Td>
              </Tr>
            ))}
            {state.sessions.length === 0 && (
              <Tr><Td colSpan={8}><Text color={textSecondary} fontSize="sm" textAlign="center" py={4}>No sessions found.</Text></Td></Tr>
            )}
          </Tbody>
        </Table>
      </Box>
    </VStack>
  );
}

function UsagePanel({ gw }: { gw: ReturnType<typeof useOpenClawGateway> }) {
  const { state } = gw;
  const [usage, setUsage] = useState<SessionsUsageResult | null>(null);
  const [cost, setCost] = useState<CostUsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgCard = useSemanticToken('surface.elevated');
  const border = useSemanticToken('border.subtle');

  const load = useCallback(async () => {
    if (!state.connected) return;
    setLoading(true);
    try {
      const { usage: u, cost: c } = await gw.loadUsage(startDate, endDate);
      setUsage(u); setCost(c);
    } finally { setLoading(false); }
  }, [state.connected, startDate, endDate, gw]);

  useEffect(() => { if (state.connected) void load(); }, [state.connected]);

  const totals = usage?.totals;

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between" wrap="wrap" gap={2}>
        <Text fontWeight="600" color={textPrimary}>Token & Cost Usage</Text>
        <HStack>
          <Input size="xs" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} w="130px" />
          <Text fontSize="xs" color={textSecondary}>→</Text>
          <Input size="xs" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} w="130px" />
          <Button size="xs" leftIcon={<FiRefreshCw />} onClick={load} isLoading={loading} isDisabled={!state.connected}>
            Load
          </Button>
        </HStack>
      </HStack>

      {totals && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          {[
            { label: 'Total Tokens', value: fmtTokens(totals.totalTokens) },
            { label: 'Total Cost', value: fmtCost(totals.totalCost) },
            { label: 'Input Tokens', value: fmtTokens(totals.input) },
            { label: 'Output Tokens', value: fmtTokens(totals.output) },
          ].map(({ label, value }) => (
            <Box key={label} p={4} bg={bgCard} borderRadius="lg" border="1px solid" borderColor={border}>
              <Stat>
                <StatLabel fontSize="xs" color={textSecondary}>{label}</StatLabel>
                <StatNumber fontSize="lg">{value}</StatNumber>
              </Stat>
            </Box>
          ))}
        </SimpleGrid>
      )}

      {usage?.aggregates?.byModel && usage.aggregates.byModel.length > 0 && (
        <Box>
          <Text fontWeight="600" fontSize="sm" color={textPrimary} mb={2}>By Model</Text>
          <Table size="sm" variant="simple">
            <Thead><Tr><Th>Model</Th><Th isNumeric>Sessions</Th><Th isNumeric>Tokens</Th><Th isNumeric>Cost</Th></Tr></Thead>
            <Tbody>
              {usage.aggregates.byModel.map((m, i) => (
                <Tr key={i} _hover={{ bg: bgCard }}>
                  <Td><Text fontSize="xs" fontFamily="mono">{[m.provider, m.model].filter(Boolean).join('/')}</Text></Td>
                  <Td isNumeric><Text fontSize="xs">{m.count}</Text></Td>
                  <Td isNumeric><Text fontSize="xs">{fmtTokens(m.totals.totalTokens)}</Text></Td>
                  <Td isNumeric><Text fontSize="xs">{fmtCost(m.totals.totalCost)}</Text></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      {usage?.aggregates?.byAgent && usage.aggregates.byAgent.length > 0 && (
        <Box>
          <Text fontWeight="600" fontSize="sm" color={textPrimary} mb={2}>By Agent</Text>
          <Table size="sm" variant="simple">
            <Thead><Tr><Th>Agent</Th><Th isNumeric>Tokens</Th><Th isNumeric>Cost</Th></Tr></Thead>
            <Tbody>
              {usage.aggregates.byAgent.map((a) => (
                <Tr key={a.agentId} _hover={{ bg: bgCard }}>
                  <Td><Text fontSize="xs">{a.agentId}</Text></Td>
                  <Td isNumeric><Text fontSize="xs">{fmtTokens(a.totals.totalTokens)}</Text></Td>
                  <Td isNumeric><Text fontSize="xs">{fmtCost(a.totals.totalCost)}</Text></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      {usage?.aggregates?.daily && usage.aggregates.daily.length > 0 && (
        <Box>
          <Text fontWeight="600" fontSize="sm" color={textPrimary} mb={2}>Daily Breakdown</Text>
          <Table size="sm" variant="simple">
            <Thead><Tr><Th>Date</Th><Th isNumeric>Tokens</Th><Th isNumeric>Cost</Th><Th isNumeric>Messages</Th></Tr></Thead>
            <Tbody>
              {[...usage.aggregates.daily].reverse().map((d) => (
                <Tr key={d.date} _hover={{ bg: bgCard }}>
                  <Td><Text fontSize="xs" fontFamily="mono">{d.date}</Text></Td>
                  <Td isNumeric><Text fontSize="xs">{fmtTokens(d.tokens)}</Text></Td>
                  <Td isNumeric><Text fontSize="xs">{fmtCost(d.cost)}</Text></Td>
                  <Td isNumeric><Text fontSize="xs">{d.messages}</Text></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      {!loading && !usage && (
        <Text color={textSecondary} fontSize="sm" textAlign="center" py={8}>
          {state.connected ? 'Click Load to fetch usage data.' : 'Connect to the gateway to view usage.'}
        </Text>
      )}
      {loading && <Spinner />}
    </VStack>
  );
}

function CronPanel({ gw }: { gw: ReturnType<typeof useOpenClawGateway> }) {
  const { state } = gw;
  const [runs, setRuns] = useState<CronRunEntry[]>([]);
  const [runsJobId, setRunsJobId] = useState<string | null>(null);
  const toast = useToast();
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgCard = useSemanticToken('surface.elevated');
  const border = useSemanticToken('border.subtle');

  useEffect(() => {
    if (state.connected) void gw.loadCronJobs();
  }, [state.connected]);

  const handleToggle = async (job: CronJob, enabled: boolean) => {
    try {
      await gw.toggleCronJob(job.id, enabled);
      toast({ title: `Cron ${enabled ? 'enabled' : 'disabled'}`, status: 'success', duration: 2000 });
    } catch (err) { toast({ title: String(err), status: 'error', duration: 3000 }); }
  };

  const handleRun = async (job: CronJob) => {
    try {
      await gw.runCronJobNow(job.id);
      toast({ title: `"${job.name}" triggered`, status: 'success', duration: 2000 });
      const r = await gw.loadCronRuns(job.id);
      setRuns(r); setRunsJobId(job.id);
    } catch (err) { toast({ title: String(err), status: 'error', duration: 3000 }); }
  };

  const handleDelete = async (job: CronJob) => {
    if (!window.confirm(`Delete cron job "${job.name}"?`)) return;
    try {
      await gw.deleteCronJob(job.id);
      toast({ title: 'Cron job deleted', status: 'success', duration: 2000 });
    } catch (err) { toast({ title: String(err), status: 'error', duration: 3000 }); }
  };

  const handleViewRuns = async (job: CronJob) => {
    const r = await gw.loadCronRuns(job.id);
    setRuns(r); setRunsJobId(job.id);
  };

  const scheduleLabel = (job: CronJob) => {
    const s = job.schedule;
    if (s.kind === 'at') return `at ${new Date(s.at).toLocaleString()}`;
    if (s.kind === 'every') {
      const ms = s.everyMs;
      if (ms < 60_000) return `every ${ms / 1000}s`;
      if (ms < 3_600_000) return `every ${ms / 60_000}m`;
      return `every ${ms / 3_600_000}h`;
    }
    return `cron: ${s.expr}${s.tz ? ` (${s.tz})` : ''}`;
  };

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <Text fontWeight="600" color={textPrimary}>Scheduled Jobs ({state.cronJobs.length})</Text>
        <Button size="xs" leftIcon={<FiRefreshCw />} onClick={() => void gw.loadCronJobs()} isDisabled={!state.connected}>
          Refresh
        </Button>
      </HStack>

      {state.cronJobs.length === 0 ? (
        <Text color={textSecondary} fontSize="sm" textAlign="center" py={4}>No cron jobs configured.</Text>
      ) : (
        <Table size="sm" variant="simple">
          <Thead>
            <Tr><Th>Name</Th><Th>Agent</Th><Th>Schedule</Th><Th>Next Run</Th><Th>Last Status</Th><Th>Enabled</Th><Th>Actions</Th></Tr>
          </Thead>
          <Tbody>
            {state.cronJobs.map((job) => (
              <Tr key={job.id} _hover={{ bg: bgCard }}>
                <Td>
                  <VStack align="start" spacing={0}>
                    <Text fontSize="xs" fontWeight="500" color={textPrimary}>{job.name}</Text>
                    {job.description && <Text fontSize="2xs" color={textSecondary} noOfLines={1}>{job.description}</Text>}
                  </VStack>
                </Td>
                <Td><Text fontSize="xs" color={textSecondary}>{job.agentId ?? 'main'}</Text></Td>
                <Td><Text fontSize="xs" fontFamily="mono" color={textSecondary}>{scheduleLabel(job)}</Text></Td>
                <Td><Text fontSize="xs" color={textSecondary}>{fmtRelTime(job.state?.nextRunAtMs)}</Text></Td>
                <Td>
                  {job.state?.lastStatus && (
                    <Badge fontSize="2xs" colorScheme={
                      job.state.lastStatus === 'ok' ? 'green' : job.state.lastStatus === 'error' ? 'red' : 'yellow'
                    }>
                      {job.state.lastStatus}
                    </Badge>
                  )}
                </Td>
                <Td>
                  <Switch size="sm" isChecked={job.enabled} onChange={(e) => void handleToggle(job, e.target.checked)} />
                </Td>
                <Td>
                  <HStack spacing={1}>
                    <Tooltip label="Run now">
                      <IconButton aria-label="run" icon={<FiPlay />} size="xs" variant="ghost" colorScheme="green"
                        onClick={() => void handleRun(job)} />
                    </Tooltip>
                    <Tooltip label="View run history">
                      <IconButton aria-label="runs" icon={<FiList />} size="xs" variant="ghost"
                        onClick={() => void handleViewRuns(job)} />
                    </Tooltip>
                    <Tooltip label="Delete">
                      <IconButton aria-label="delete" icon={<FiTrash2 />} size="xs" variant="ghost" colorScheme="red"
                        onClick={() => void handleDelete(job)} />
                    </Tooltip>
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {runsJobId && (
        <Box mt={2}>
          <Text fontWeight="600" fontSize="sm" color={textPrimary} mb={2}>
            Run History — {state.cronJobs.find((j) => j.id === runsJobId)?.name}
          </Text>
          {runs.length === 0 ? (
            <Text color={textSecondary} fontSize="sm">No run history.</Text>
          ) : (
            <Table size="sm" variant="simple">
              <Thead><Tr><Th>Time</Th><Th>Status</Th><Th>Duration</Th><Th>Summary / Error</Th></Tr></Thead>
              <Tbody>
                {runs.map((r, i) => (
                  <Tr key={i}>
                    <Td><Text fontSize="xs" fontFamily="mono">{fmtTs(r.ts * 1000)}</Text></Td>
                    <Td><Badge fontSize="2xs" colorScheme={r.status === 'ok' ? 'green' : r.status === 'error' ? 'red' : 'yellow'}>{r.status}</Badge></Td>
                    <Td><Text fontSize="xs">{r.durationMs ? `${r.durationMs}ms` : '—'}</Text></Td>
                    <Td><Text fontSize="xs" color={r.error ? 'red.300' : textSecondary} noOfLines={2}>{r.error ?? r.summary ?? '—'}</Text></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      )}
    </VStack>
  );
}

function LogsPanel({ gw }: { gw: ReturnType<typeof useOpenClawGateway> }) {
  const { state } = gw;
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  const load = async (reset?: boolean) => {
    if (!state.connected) return;
    setLoading(true);
    try { await gw.loadLogs({ reset }); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (state.connected) void load(true);
  }, [state.connected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.logEntries.length]);

  const filtered = filter
    ? state.logEntries.filter((e) =>
        (e.message ?? '').toLowerCase().includes(filter.toLowerCase()) ||
        (e.subsystem ?? '').toLowerCase().includes(filter.toLowerCase())
      )
    : state.logEntries;

  return (
    <VStack align="stretch" spacing={3} h="full">
      <HStack justify="space-between">
        <Text fontWeight="600" color={textPrimary}>Gateway Logs</Text>
        <HStack>
          <Input
            size="xs" placeholder="filter…" value={filter}
            onChange={(e) => setFilter(e.target.value)} w="160px"
          />
          <Button size="xs" leftIcon={<FiRefreshCw />} onClick={() => void load()} isLoading={loading} isDisabled={!state.connected}>
            Tail
          </Button>
          <Button size="xs" variant="ghost" onClick={() => void load(true)} isDisabled={!state.connected}>
            Reset
          </Button>
        </HStack>
      </HStack>

      <Box
        bg="gray.900" borderRadius="md" p={3} h="480px" overflowY="auto"
        fontFamily="mono" fontSize="xs" whiteSpace="pre-wrap"
      >
        {filtered.map((e, i) => (
          <Box key={i} mb="2px" lineHeight="1.5">
            {e.time && <Text as="span" color="gray.500">{e.time.slice(11, 23)} </Text>}
            {e.level && (
              <Text as="span" color={LOG_LEVEL_COLORS[e.level] ?? 'gray.400'} fontWeight="bold">
                [{e.level.toUpperCase().padEnd(5)}]{' '}
              </Text>
            )}
            {e.subsystem && <Text as="span" color="cyan.400">[{e.subsystem}] </Text>}
            <Text as="span" color="gray.100">{e.message ?? e.raw}</Text>
          </Box>
        ))}
        {filtered.length === 0 && (
          <Text color="gray.600">{state.connected ? 'No log entries.' : 'Connect to view logs.'}</Text>
        )}
        <div ref={bottomRef} />
      </Box>
      <Text fontSize="xs" color={textSecondary}>{filtered.length} entries{filter ? ' (filtered)' : ''}</Text>
    </VStack>
  );
}

function AgentFilesPanel({ gw }: { gw: ReturnType<typeof useOpenClawGateway> }) {
  const { state } = gw;
  const [files, setFiles] = useState<AgentFileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<AgentFileEntry | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgCard = useSemanticToken('surface.elevated');
  const border = useSemanticToken('border.subtle');
  const agentId = state.selectedAgentId;

  const loadFiles = useCallback(async () => {
    if (!state.connected || !agentId) return;
    setLoading(true);
    try {
      const f = await gw.listAgentFiles(agentId);
      setFiles(f);
    } catch (err) {
      toast({ title: `Failed to load files: ${String(err)}`, status: 'error', duration: 3000 });
    } finally { setLoading(false); }
  }, [state.connected, agentId, gw, toast]);

  const openFile = useCallback(async (file: AgentFileEntry) => {
    if (!agentId) return;
    try {
      const full = await gw.getAgentFile(agentId, file.name);
      setSelectedFile(full);
      setEditContent(full.content ?? '');
    } catch (err) {
      toast({ title: `Failed to open: ${String(err)}`, status: 'error', duration: 3000 });
    }
  }, [agentId, gw, toast]);

  const saveFile = useCallback(async () => {
    if (!agentId || !selectedFile) return;
    setSaving(true);
    try {
      await gw.setAgentFile(agentId, selectedFile.name, editContent);
      toast({ title: `${selectedFile.name} saved`, status: 'success', duration: 2000 });
      await loadFiles();
    } catch (err) {
      toast({ title: `Save failed: ${String(err)}`, status: 'error', duration: 3000 });
    } finally { setSaving(false); }
  }, [agentId, selectedFile, editContent, gw, toast, loadFiles]);

  useEffect(() => {
    if (state.connected && agentId) void loadFiles();
  }, [state.connected, agentId]);

  if (!agentId) {
    return <Text color={textSecondary} fontSize="sm" textAlign="center" py={8}>Select an agent in the Agents tab to manage its files.</Text>;
  }

  return (
    <HStack align="stretch" spacing={4} h="520px">
      <VStack align="stretch" w="220px" flexShrink={0} spacing={2}>
        <HStack justify="space-between">
          <Text fontWeight="600" fontSize="sm" color={textPrimary}>{agentId}</Text>
          <IconButton aria-label="refresh" icon={<FiRefreshCw />} size="xs" variant="ghost"
            onClick={loadFiles} isLoading={loading} />
        </HStack>
        <VStack align="stretch" spacing={1}>
          {files.map((f) => (
            <HStack
              key={f.name} p={2} borderRadius="md" cursor="pointer"
              bg={selectedFile?.name === f.name ? 'blue.900' : bgCard}
              border="1px solid" borderColor={selectedFile?.name === f.name ? 'blue.400' : border}
              onClick={() => void openFile(f)}
              _hover={{ borderColor: 'blue.300' }}
            >
              <FiFileText size={12} />
              <VStack align="start" spacing={0} flex={1} minW={0}>
                <Text fontSize="xs" fontWeight="500" color={textPrimary} isTruncated>{f.name}</Text>
                {f.size != null && <Text fontSize="2xs" color={textSecondary}>{(f.size / 1024).toFixed(1)} KB</Text>}
                {f.missing && <Badge fontSize="2xs" colorScheme="red">missing</Badge>}
              </VStack>
            </HStack>
          ))}
          {files.length === 0 && !loading && (
            <Text fontSize="xs" color={textSecondary} p={2}>No files found.</Text>
          )}
        </VStack>
      </VStack>

      <Divider orientation="vertical" />

      <VStack align="stretch" flex={1} spacing={2}>
        {selectedFile ? (
          <>
            <HStack justify="space-between">
              <HStack>
                <Text fontWeight="600" fontSize="sm" color={textPrimary}>{selectedFile.name}</Text>
                {selectedFile.updatedAtMs && (
                  <Text fontSize="xs" color={textSecondary}>· {fmtRelTime(selectedFile.updatedAtMs)}</Text>
                )}
              </HStack>
              <Button size="xs" leftIcon={<FiSave />} colorScheme="blue" onClick={saveFile} isLoading={saving}>
                Save
              </Button>
            </HStack>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              fontFamily="mono" fontSize="xs" h="full" resize="none"
              bg="gray.900" color="gray.100" border="1px solid" borderColor={border}
              spellCheck={false}
            />
          </>
        ) : (
          <VStack justify="center" h="full">
            <FiFileText size={32} color="gray" />
            <Text color={textSecondary} fontSize="sm">Select a file to view or edit</Text>
          </VStack>
        )}
      </VStack>
    </HStack>
  );
}

function BrowserPanel() {
  return <AgentBrowserViewer />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const OpenClawControlPage: React.FC = () => {
  const gw = useOpenClawGateway();
  const { state } = gw;
  const toast = useToast();
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgCard = useSemanticToken('surface.elevated');
  const border = useSemanticToken('border.subtle');

  useEffect(() => {
    gw.connect();
    return () => gw.disconnect();
  }, []);

  const connectionColor = state.connected ? 'green' : state.connecting ? 'yellow' : 'red';
  const connectionLabel = state.connected ? 'Connected' : state.connecting ? 'Connecting…' : 'Disconnected';

  return (
    <>
      <Head>
        <title>OpenClaw Agent Control | AI Homelab</title>
        <meta name="description" content="OpenClaw gateway — agents, sessions, cron, usage, logs, workspace files" />
      </Head>
      <DashboardLayout>
        <Box p={6}>
          <VStack align="stretch" spacing={6}>

            {/* Header */}
            <HStack justify="space-between" wrap="wrap" gap={3}>
              <VStack align="start" spacing={0}>
                <Heading size="lg" color={textPrimary}>OpenClaw Agent Control</Heading>
                <Text color={textSecondary} fontSize="sm">
                  Gateway management — agents, sessions, cron scheduler, usage, logs, workspace files
                </Text>
              </VStack>
              <HStack>
                {state.gatewayVersion && (
                  <Badge colorScheme="gray" fontSize="xs" fontFamily="mono">v{state.gatewayVersion}</Badge>
                )}
                <Badge colorScheme={connectionColor} px={3} py={1} fontSize="sm">{connectionLabel}</Badge>
                <Button
                  size="sm" variant="outline"
                  leftIcon={state.connected ? <FiPower /> : <FiRefreshCw />}
                  colorScheme={state.connected ? 'red' : 'green'}
                  onClick={state.connected ? gw.disconnect : gw.connect}
                >
                  {state.connected ? 'Disconnect' : 'Connect'}
                </Button>
              </HStack>
            </HStack>

            {state.error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">{state.error}</Text>
              </Alert>
            )}

            {/* Summary row */}
            {state.connected && (
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                {[
                  { icon: <FiUsers />, label: 'Agents', value: state.agents.length, color: 'blue' },
                  { icon: <FiActivity />, label: 'Sessions', value: state.sessions.length, color: 'purple' },
                  { icon: <FiClock />, label: 'Cron Jobs', value: state.cronJobs.length, color: 'orange' },
                  { icon: <FiTerminal />, label: 'Log Entries', value: state.logEntries.length, color: 'green' },
                ].map(({ icon, label, value, color }) => (
                  <Box key={label} p={4} bg={bgCard} borderRadius="lg" border="1px solid" borderColor={border}>
                    <HStack>
                      <Box color={`${color}.400`}>{icon}</Box>
                      <Stat>
                        <StatLabel fontSize="xs" color={textSecondary}>{label}</StatLabel>
                        <StatNumber fontSize="lg">{value}</StatNumber>
                      </Stat>
                    </HStack>
                  </Box>
                ))}
              </SimpleGrid>
            )}

            {/* Main tabs */}
            <Box bg={bgCard} borderRadius="xl" border="1px solid" borderColor={border} p={5}>
              <Tabs variant="enclosed" colorScheme="blue" isLazy>
                <TabList>
                  <Tab fontSize="sm"><HStack spacing={1}><FiUsers /><Text>Agents</Text></HStack></Tab>
                  <Tab fontSize="sm"><HStack spacing={1}><FiActivity /><Text>Sessions</Text></HStack></Tab>
                  <Tab fontSize="sm"><HStack spacing={1}><FiZap /><Text>Usage</Text></HStack></Tab>
                  <Tab fontSize="sm"><HStack spacing={1}><FiClock /><Text>Cron</Text></HStack></Tab>
                  <Tab fontSize="sm"><HStack spacing={1}><FiTerminal /><Text>Logs</Text></HStack></Tab>
                  <Tab fontSize="sm"><HStack spacing={1}><FiFileText /><Text>Agent Files</Text></HStack></Tab>
                  <Tab fontSize="sm"><HStack spacing={1}><FiMonitor /><Text>Browser</Text></HStack></Tab>
                </TabList>
                <TabPanels>
                  <TabPanel><AgentsPanel gw={gw} /></TabPanel>
                  <TabPanel><SessionsPanel gw={gw} /></TabPanel>
                  <TabPanel><UsagePanel gw={gw} /></TabPanel>
                  <TabPanel><CronPanel gw={gw} /></TabPanel>
                  <TabPanel><LogsPanel gw={gw} /></TabPanel>
                  <TabPanel><AgentFilesPanel gw={gw} /></TabPanel>
                  <TabPanel><BrowserPanel /></TabPanel>
                </TabPanels>
              </Tabs>
            </Box>

          </VStack>
        </Box>
      </DashboardLayout>
    </>
  );
};

export default OpenClawControlPage;
