/**
 * Memory Console — Unified agentic memory management dashboard.
 *
 * Consolidates the scattered memory pages (ide-memory, personal-context,
 * personal-knowledge-graph, knowledge-graph) into a single tabbed console
 * with: Overview, Graph, Preferences, Observations, Interventions,
 * Consolidation, Drift, and Retrieval Debug.
 *
 * Talks to PCG (:8765) via proxied /api/pcg/* and /api/kg/* routes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, VStack, HStack, Heading, Text, Divider,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  Button, Badge, IconButton, useToast,
  Input, Textarea, Select,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Alert, AlertIcon, AlertTitle, AlertDescription,
  Stat, StatLabel, StatNumber, StatHelpText,
  SimpleGrid, Code, Spinner, Flex, Spacer,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  FiRefreshCw, FiTrash2, FiCheck, FiX, FiAlertCircle,
  FiDatabase, FiBrain, FiActivity, FiSearch, FiLayers,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Known users for the user selector (from PCG _USER_BOLT_URIS)
const KNOWN_USERS = [
  { id: 'dfd9379f-a9cd-4241-99e7-140f5e89e3cd', name: 'Eleazar' },
  { id: '096f1fe3-16b3-4642-a1d9-2a11bf3843dd', name: 'Claudia' },
  { id: 'bcb80071-81a4-4e4e-aff2-fe96d6702b08', name: 'Luca' },
  { id: '40c2f03c-60b7-4344-b215-dbbcf565f9a5', name: 'Sofia' },
];
const DEFAULT_USER_ID = KNOWN_USERS[0].id;
import { GlassPanel } from '@/components/ui/GlassPanel';

const PCG_API = "/api/pcg";
const KG_API = '/api/kg';

// ─── Overview Tab ───────────────────────────────────────────────────

function OverviewTab({ userId = DEFAULT_USER_ID }: { userId?: string }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kg/stats`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      toast({ title: 'Failed to fetch stats', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) return <Spinner />;
  if (!stats) return <Alert status="error"><AlertIcon />Could not load PCG stats</Alert>;

  const { graph, vector, models } = stats;

  return (
    <VStack spacing={4} align="stretch">
      <SimpleGrid columns={4} spacing={4}>
        <StatCard label="Graph Entities" value={graph?.entities ?? 0} icon={FiDatabase} />
        <StatCard label="Relationships" value={graph?.relationships ?? 0} icon={FiLayers} />
        <StatCard label="Communities" value={graph?.communities ?? 0} icon={FiBrain} />
        <StatCard label="Vector Entities" value={vector?.entities ?? 0} icon={FiSearch} />
      </SimpleGrid>

      <GlassPanel p={4}>
        <Heading size="sm" mb={3}>Models</Heading>
        <SimpleGrid columns={3} spacing={3}>
          <Box><Text fontSize="xs" color="gray.500">Extraction</Text><Code>{models?.extraction}</Code></Box>
          <Box><Text fontSize="xs" color="gray.500">Embedding</Text><Code>{models?.embedding}</Code></Box>
          <Box><Text fontSize="xs" color="gray.500">Summarization</Text><Code>{models?.summarization}</Code></Box>
        </SimpleGrid>
      </GlassPanel>

      <HStack>
        <Button leftIcon={<FiRefreshCw />} onClick={fetchStats} size="sm">Refresh</Button>
        <Button colorScheme="blue" size="sm" onClick={async () => {
          try {
            await fetch(`/api/kg/communities/build`, { method: 'POST' });
            toast({ title: 'Community detection triggered', status: 'success', duration: 3000 });
            setTimeout(fetchStats, 5000);
          } catch {
            toast({ title: 'Failed to trigger community detection', status: 'error', duration: 3000 });
          }
        }}>Build Communities</Button>
      </HStack>
    </VStack>
  );
}

function StatCard({ label, value, icon: Icon }: any) {
  return (
    <GlassPanel p={4}>
      <HStack>
        <Icon size={20} opacity={0.6} />
        <Box>
          <StatLabel fontSize="xs">{label}</StatLabel>
          <StatNumber fontSize="lg">{value?.toLocaleString()}</StatNumber>
        </Box>
      </HStack>
    </GlassPanel>
  );
}

// ─── Preferences Tab ────────────────────────────────────────────────

function PreferencesTab({ userId = DEFAULT_USER_ID }: { userId?: string }) {
  const [prefs, setPrefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchPrefs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${PCG_API}/pic/preferences?userId=${userId}`, {
        headers: { 'X-PIC-Read-Key': process.env.NEXT_PUBLIC_PIC_READ_KEY || '' },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPrefs(Array.isArray(data) ? data : data.preferences ?? []);
    } catch {
      setPrefs([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  if (loading) return <Spinner />;

  return (
    <VStack spacing={3} align="stretch">
      <HStack>
        <Heading size="sm">Preferences ({prefs.length})</Heading>
        <Spacer />
        <Button leftIcon={<FiRefreshCw />} onClick={fetchPrefs} size="sm">Refresh</Button>
      </HStack>
      <TableContainer>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Key</Th><Th>Value</Th><Th>Scope</Th><Th>Confidence</Th><Th>Source</Th>
            </Tr>
          </Thead>
          <Tbody>
            {prefs.map((p: any, i: number) => (
              <Tr key={i}>
                <Td><Code fontSize="xs">{p.key ?? p.id}</Code></Td>
                <Td>{p.value ?? p.content}</Td>
                <Td><Badge fontSize="xs">{p.scope ?? 'global'}</Badge></Td>
                <Td>{p.confidence?.toFixed(2) ?? '1.00'}</Td>
                <Td><Badge colorScheme={p.source === 'consolidated' ? 'purple' : 'blue'} fontSize="xs">{p.source ?? 'explicit'}</Badge></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
      {prefs.length === 0 && <Alert status="info"><AlertIcon />No preferences found. Requires PIC authentication.</Alert>}
    </VStack>
  );
}

// ─── Observations Tab ───────────────────────────────────────────────

function ObservationsTab({ userId = DEFAULT_USER_ID }: { userId?: string }) {
  const [obs, setObs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchObs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${PCG_API}/pic/learn?userId=${userId}`, {
        headers: { 'X-PIC-Read-Key': process.env.NEXT_PUBLIC_PIC_READ_KEY || '' },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setObs(Array.isArray(data) ? data : data.observations ?? []);
    } catch {
      setObs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchObs(); }, [fetchObs]);

  if (loading) return <Spinner />;

  const newCount = obs.filter(o => o.status === 'new').length;
  const promotedCount = obs.filter(o => o.status === 'promoted').length;
  const decayedCount = obs.filter(o => o.status === 'decayed').length;

  return (
    <VStack spacing={3} align="stretch">
      <HStack>
        <Heading size="sm">Observations ({obs.length})</Heading>
        <Badge colorScheme="green">{newCount} new</Badge>
        <Badge colorScheme="purple">{promotedCount} promoted</Badge>
        <Badge colorScheme="gray">{decayedCount} decayed</Badge>
        <Spacer />
        <Button leftIcon={<FiRefreshCw />} onClick={fetchObs} size="sm">Refresh</Button>
      </HStack>
      <TableContainer>
        <Table size="sm">
          <Thead>
            <Tr><Th>Content</Th><Th>Category</Th><Th>Status</Th><Th>Confidence</Th><Th>Created</Th></Tr>
          </Thead>
          <Tbody>
            {obs.map((o: any, i: number) => (
              <Tr key={i} opacity={o.status === 'decayed' ? 0.5 : 1}>
                <Td maxW="300px" isTruncated>{o.content ?? o.observation ?? o.value}</Td>
                <Td><Badge fontSize="xs">{o.category ?? '—'}</Badge></Td>
                <Td><Badge colorScheme={o.status === 'new' ? 'green' : o.status === 'promoted' ? 'purple' : 'gray'} fontSize="xs">{o.status ?? 'new'}</Badge></Td>
                <Td>{o.confidence?.toFixed(2) ?? '—'}</Td>
                <Td fontSize="xs">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
      {obs.length === 0 && <Alert status="info"><AlertIcon />No observations found. Requires PIC authentication.</Alert>}
    </VStack>
  );
}

// ─── Interventions Tab ──────────────────────────────────────────────

function InterventionsTab({ userId = DEFAULT_USER_ID }: { userId?: string }) {
  const [interventions, setInterventions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInterventions = useCallback(async () => {
    setLoading(true);
    // Uses the PCG intervention bridge endpoint that receives records
    // from the IDE's IWorkflowMemoryService via fire-and-forget sync.
    try {
      const res = await fetch(`${PCG_API}/pcg/interventions?limit=50&userId=${userId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInterventions(data.interventions ?? []);
    } catch {
      setInterventions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInterventions(); }, [fetchInterventions]);

  if (loading) return <Spinner />;

  return (
    <VStack spacing={3} align="stretch">
      <HStack>
        <Heading size="sm">Intervention Ledger</Heading>
        <Badge colorScheme="red">{interventions.length} records</Badge>
        <Spacer />
        <Button leftIcon={<FiRefreshCw />} onClick={fetchInterventions} size="sm">Refresh</Button>
      </HStack>
      <Alert status="info" variant="left-accent">
        <AlertIcon />
        <Box>
          <Text fontSize="sm">Interventions are synced from the IDE via the PCG intervention bridge.</Text>
          <Text fontSize="xs" color="gray.500">The IDE remains the SSOT — this is a best-effort projection for cross-surface visibility.</Text>
        </Box>
      </Alert>
      <TableContainer>
        <Table size="sm">
          <Thead><Tr><Th>Tag</Th><Th>Workflow</Th><Th>Origin</Th><Th>Model</Th><Th>Created</Th></Tr></Thead>
          <Tbody>
            {interventions.map((r: any, i: number) => (
              <Tr key={i}>
                <Td><Badge fontSize="xs" colorScheme="red">{r.tag ?? '—'}</Badge></Td>
                <Td><Code fontSize="xs">{r.workflow_id ?? r.workflowId ?? '—'}</Code></Td>
                <Td><Badge fontSize="xs">{r.origin ?? 'user_override'}</Badge></Td>
                <Td fontSize="xs">{r.model_id ?? r.modelId ?? '—'}</Td>
                <Td fontSize="xs">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </VStack>
  );
}

// ─── Consolidation Tab ──────────────────────────────────────────────

function ConsolidationTab({ userId = DEFAULT_USER_ID }: { userId?: string }) {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const toast = useToast();

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${PCG_API}/pcg/insights/recent?limit=20&userId=${userId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInsights(Array.isArray(data) ? data : data.insights ?? []);
    } catch {
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const triggerConsolidation = async () => {
    setTriggering(true);
    try {
      const res = await fetch(`${PCG_API}/pcg/consolidate?userId=${userId}`, { method: 'POST' });
      if (res.ok) {
        toast({ title: 'Consolidation triggered', status: 'success', duration: 3000 });
        setTimeout(fetchInsights, 5000);
      } else {
        throw new Error();
      }
    } catch {
      toast({ title: 'Failed to trigger consolidation', status: 'error', duration: 3000 });
    } finally {
      setTriggering(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <VStack spacing={3} align="stretch">
      <HStack>
        <Heading size="sm">Consolidation</Heading>
        <Spacer />
        <Button leftIcon={<FiRefreshCw />} onClick={fetchInsights} size="sm">Refresh</Button>
        <Button colorScheme="blue" size="sm" onClick={triggerConsolidation} isLoading={triggering}>Trigger Now</Button>
      </HStack>
      <Alert status="info" variant="left-accent">
        <AlertIcon />
        <Text fontSize="sm">Consolidation runs daily at 6am UTC. It clusters new observations, creates insights, and promotes high-confidence patterns to preferences.</Text>
      </Alert>
      <Heading size="xs">Recent Insights</Heading>
      <VStack spacing={2} align="stretch">
        {insights.map((ins: any, i: number) => (
          <GlassPanel key={i} p={3}>
            <HStack>
              <Box flex={1}>
                <Text fontSize="sm" fontWeight="medium">{ins.content ?? ins.summary ?? ins.text}</Text>
                <HStack mt={1} spacing={2}>
                  <Badge fontSize="xs" colorScheme="purple">confidence {ins.confidence?.toFixed(2) ?? '—'}</Badge>
                  {ins.created_at && <Text fontSize="xs" color="gray.500">{new Date(ins.created_at).toLocaleString()}</Text>}
                </HStack>
              </Box>
              <HStack>
                <Button size="xs" colorScheme="green" leftIcon={<FiCheck />}>Approve</Button>
                <Button size="xs" colorScheme="red" leftIcon={<FiX />}>Reject</Button>
              </HStack>
            </HStack>
          </GlassPanel>
        ))}
      </VStack>
      {insights.length === 0 && <Alert status="info"><AlertIcon />No insights yet. Run consolidation to generate.</Alert>}
    </VStack>
  );
}

// ─── Retrieval Debug Tab ────────────────────────────────────────────

function RetrievalDebugTab({ userId = DEFAULT_USER_ID }: { userId?: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/kg/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 10 }),
      });
      const data = await res.json();
      setResults(data);
    } catch {
      setResults({ error: 'Search failed' });
    } finally {
      setSearching(false);
    }
  };

  return (
    <VStack spacing={3} align="stretch">
      <Heading size="sm">Retrieval Debug</Heading>
      <HStack>
        <Input
          placeholder="Query: e.g. 'decision making frameworks'"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runSearch()}
        />
        <Button leftIcon={<FiSearch />} onClick={runSearch} isLoading={searching} colorScheme="blue">Search</Button>
      </HStack>
      {results && (
        <GlassPanel p={4}>
          {results.error ? (
            <Alert status="error"><AlertIcon />{results.error}</Alert>
          ) : (
            <VStack spacing={2} align="stretch">
              <Text fontSize="xs" color="gray.500">{results.total_results ?? 0} results</Text>
              {results.entities?.map((e: any, i: number) => (
                <Box key={i} p={2} borderWidth={1} borderRadius="md">
                  <HStack>
                    <Badge fontSize="xs" colorScheme={e.metadata?.type === 'concept' ? 'purple' : 'blue'}>{e.metadata?.type ?? 'entity'}</Badge>
                    <Text fontSize="sm" fontWeight="medium">{e.metadata?.name ?? e.id}</Text>
                    <Spacer />
                    <Text fontSize="xs" color="gray.500">score: {e.score?.toFixed(4)}</Text>
                  </HStack>
                  <Text fontSize="xs" mt={1} color="gray.500" noOfLines={2}>{e.content}</Text>
                </Box>
              ))}
            </VStack>
          )}
        </GlassPanel>
      )}
    </VStack>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function MemoryConsolePage() {
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const userName = KNOWN_USERS.find(u => u.id === userId)?.name || userId.slice(0, 8);

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={4} align="stretch">
          <HStack>
            <FiBrain size={28} />
            <Heading size="lg">Memory Console</Heading>
            <Badge colorScheme="blue" fontSize="sm">PCG :8765</Badge>
            <Spacer />
            <HStack>
              <Text fontSize="sm" color="gray.500">User:</Text>
              <Select
                size="sm"
                width="150px"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                {KNOWN_USERS.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </HStack>
          </HStack>
          <Text color="gray.500" fontSize="sm">
            Unified agentic memory management for {userName} — graph, preferences, observations, interventions, consolidation, and retrieval debugging.
          </Text>
          <Divider />
          <Tabs variant="enclosed" colorScheme="blue">
            <TabList overflowX="auto">
              <Tab><HStack><FiActivity /><Text>Overview</Text></HStack></Tab>
              <Tab><HStack><FiDatabase /><Text>Graph</Text></HStack></Tab>
              <Tab><HStack><FiLayers /><Text>Preferences</Text></HStack></Tab>
              <Tab><HStack><FiBrain /><Text>Observations</Text></HStack></Tab>
              <Tab><HStack><FiAlertCircle /><Text>Interventions</Text></HStack></Tab>
              <Tab><HStack><FiRefreshCw /><Text>Consolidation</Text></HStack></Tab>
              <Tab><HStack><FiSearch /><Text>Retrieval Debug</Text></HStack></Tab>
            </TabList>
            <TabPanels>
              <TabPanel><OverviewTab userId={userId} /></TabPanel>
              <TabPanel><Text color="gray.500">Use the full <Code>knowledge-graph-unified</Code> page for graph visualization.</Text></TabPanel>
              <TabPanel><PreferencesTab userId={userId} /></TabPanel>
              <TabPanel><ObservationsTab userId={userId} /></TabPanel>
              <TabPanel><InterventionsTab userId={userId} /></TabPanel>
              <TabPanel><ConsolidationTab userId={userId} /></TabPanel>
              <TabPanel><RetrievalDebugTab userId={userId} /></TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </DashboardLayout>
  );
}
