import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Text,
  Spinner,
  HStack,
  VStack,
  Badge,
  Button,
  Select,
  Flex,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiRefreshCw, FiFilter } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import type { WorkflowStatus } from '@/pages/api/get-workflow-status';

// ── Dimension Metadata ─────────────────────────────────────────────

interface DimMeta {
  label: string;
  icon: string;
  accent: string;
  group: 'core' | 'cognitive';
}

const DIMS: Record<string, DimMeta> = {
  clinical:         { label: 'Clinical',             icon: '🏥', accent: '#E53E3E', group: 'core' },
  communication:    { label: 'Communication',        icon: '✉️', accent: '#3182CE', group: 'core' },
  family:           { label: 'Family',               icon: '👨‍👩‍👧‍👦', accent: '#D53F8C', group: 'core' },
  research:         { label: 'Research',             icon: '🔬', accent: '#805AD5', group: 'core' },
  health:           { label: 'Health',               icon: '💚', accent: '#38A169', group: 'core' },
  financial:        { label: 'Financial',            icon: '💰', accent: '#D69E2E', group: 'core' },
  goals:            { label: 'Goals',                icon: '🎯', accent: '#DD6B20', group: 'core' },
  infrastructure:   { label: 'Infra',                icon: '⚙️', accent: '#718096', group: 'core' },
  metacognition:    { label: 'Metacog',              icon: '🪞', accent: '#00B5D8', group: 'cognitive' },
  decision_fatigue: { label: 'Decision',             icon: '🔋', accent: '#E53E3E', group: 'cognitive' },
  flow:             { label: 'Flow',                 icon: '🌊', accent: '#3182CE', group: 'cognitive' },
  attention:        { label: 'Attention',            icon: '🧠', accent: '#805AD5', group: 'cognitive' },
  chronobiology:    { label: 'Chrono',               icon: '🕐', accent: '#319795', group: 'cognitive' },
  social_capital:   { label: 'Social',               icon: '🤝', accent: '#D53F8C', group: 'cognitive' },
  meaning:          { label: 'Meaning',              icon: '✨', accent: '#D69E2E', group: 'cognitive' },
  habits:           { label: 'Habits',               icon: '🔄', accent: '#38A169', group: 'cognitive' },
};

const CATEGORIES: Record<string, string> = {
  'real-time': 'RT', 'periodic': 'P', 'long-horizon': 'LH',
};

// ── Helpers ────────────────────────────────────────────────────────

const statusDot = (s: string) => {
  if (s === 'running') return { dot: '●', color: '#48BB78', label: 'Running' };
  if (s === 'pending') return { dot: '○', color: '#ECC94B', label: 'Planned' };
  if (s === 'failed')  return { dot: '●', color: '#FC8181', label: 'Failed' };
  return { dot: '○', color: '#A0AEC0', label: s };
};

const loadColor = (load?: string) => {
  const map: Record<string, string> = { critical: '#FC8181', high: '#F6AD55', medium: '#ECC94B', low: '#A0AEC0' };
  return load ? map[load] : null;
};

// ── Component ──────────────────────────────────────────────────────

export const IntelligenceWorkflowsPanel: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDim, setFilterDim] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const textMuted = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const isDark = useColorModeValue(false, true);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await fetch('/api/get-workflow-status');
      if (resp.ok) setWorkflows(await resp.json());
    } catch (err) {
      console.error('Failed to fetch workflows', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  // ── Derived data ───────────────────────────────────────────
  const stats = useMemo(() => {
    const running = workflows.filter(w => w.status === 'running').length;
    const pending = workflows.filter(w => w.status === 'pending').length;
    const failed  = workflows.filter(w => w.status === 'failed').length;
    const critical = workflows.filter(w => w.cognitiveLoadReduction === 'critical' && w.status === 'running').length;
    return { total: workflows.length, running, pending, failed, critical };
  }, [workflows]);

  const dimStats = useMemo(() => {
    const m: Record<string, { total: number; running: number }> = {};
    workflows.forEach(wf => {
      const d = wf.dimension || 'unknown';
      if (!m[d]) m[d] = { total: 0, running: 0 };
      m[d].total++;
      if (wf.status === 'running') m[d].running++;
    });
    return m;
  }, [workflows]);

  const filtered = useMemo(() => workflows.filter(w => {
    if (filterDim !== 'all' && w.dimension !== filterDim) return false;
    if (filterCat !== 'all' && w.category !== filterCat) return false;
    if (filterStatus !== 'all' && w.status !== filterStatus) return false;
    return true;
  }), [workflows, filterDim, filterCat, filterStatus]);

  const clearFilters = () => { setFilterDim('all'); setFilterCat('all'); setFilterStatus('all'); };
  const hasFilters = filterDim !== 'all' || filterCat !== 'all' || filterStatus !== 'all';

  if (loading) {
    return (
      <Flex align="center" justify="center" py={20} gap={3}>
        <Spinner size="md" color="purple.400" />
        <Text color={textMuted} fontSize="sm">Loading workflows…</Text>
      </Flex>
    );
  }

  // ── Dimension pill ─────────────────────────────────────────
  const DimPill = ({ dimKey, meta, ds }: { dimKey: string; meta: DimMeta; ds: { total: number; running: number } }) => {
    const isSelected = filterDim === dimKey;
    const pct = ds.total > 0 ? Math.round((ds.running / ds.total) * 100) : 0;
    
    return (
      <Box
        as="button"
        display="inline-flex"
        alignItems="center"
        gap={1.5}
        px={2.5}
        py={1}
        borderRadius="md"
        fontSize="xs"
        fontWeight="500"
        bg={isSelected ? `${meta.accent}20` : (isDark ? 'whiteAlpha.50' : 'blackAlpha.40')}
        color={isSelected ? meta.accent : textMuted}
        border="1px solid"
        borderColor={isSelected ? meta.accent : 'transparent'}
        onClick={() => setFilterDim(isSelected ? 'all' : dimKey)}
        transition="all 0.15s ease"
        _hover={{
          bg: `${meta.accent}15`,
          borderColor: `${meta.accent}60`,
        }}
        minW="60px"
      >
        <Text>{meta.icon}</Text>
        <Text>{ds.running}/{ds.total}</Text>
        {pct > 0 && (
          <Box w="20px" h="3px" bg={isDark ? 'whiteAlpha.200' : 'blackAlpha.200'} borderRadius="full" ml={1}>
            <Box h="full" w={`${pct}%`} bg={meta.accent} borderRadius="full" />
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {/* ── Compact KPI Bar ────────────────────────────────── */}
      <HStack spacing={-1} mb={4} overflowX="auto" pb={2}>
        {[
          { label: 'Total', value: stats.total, sub: `${Object.keys(dimStats).length} dims`, accent: '#A0AEC0' },
          { label: 'Active', value: stats.running, sub: `${stats.total ? Math.round(stats.running / stats.total * 100) : 0}%`, accent: '#48BB78' },
          { label: 'Planned', value: stats.pending, sub: 'queue', accent: '#ECC94B' },
          { label: 'Failed', value: stats.failed, sub: 'error', accent: stats.failed > 0 ? '#FC8181' : '#A0AEC0' },
          { label: 'Critical', value: stats.critical, sub: 'relief', accent: '#9F7AEA' },
        ].map((stat, i) => (
          <Box
            key={stat.label}
            flex="1"
            minW="100px"
            p={3}
            bg={isDark ? 'whiteAlpha.50' : 'blackAlpha.30'}
            borderLeftRadius={i === 0 ? 'lg' : '0'}
            borderRightRadius={i === 4 ? 'lg' : '0'}
            borderLeft={i > 0 ? '1px solid' : 'none'}
            borderColor={isDark ? 'whiteAlpha.100' : 'blackAlpha.100'}
          >
            <Text fontSize="9px" fontWeight="600" textTransform="uppercase" color={textMuted} letterSpacing="wider">
              {stat.label}
            </Text>
            <Text fontSize="xl" fontWeight="700" color={stat.accent} lineHeight="1.1">
              {stat.value}
            </Text>
            <Text fontSize="9px" color={textMuted}>{stat.sub}</Text>
          </Box>
        ))}
      </HStack>

      {/* ── Dimension Pills ────────────────────────────────── */}
      <Box mb={4}>
        <HStack mb={2}>
          <Text fontSize="10px" fontWeight="600" textTransform="uppercase" color={textMuted} letterSpacing="wide">Core</Text>
        </HStack>
        <Flex gap={1.5} flexWrap="wrap" mb={3}>
          {Object.entries(DIMS).filter(([, m]) => m.group === 'core').map(([k, m]) => (
            <DimPill key={k} dimKey={k} meta={m} ds={dimStats[k] || { total: 0, running: 0 }} />
          ))}
        </Flex>
        <HStack mb={2}>
          <Text fontSize="10px" fontWeight="600" textTransform="uppercase" color={textMuted} letterSpacing="wide">Cognitive</Text>
        </HStack>
        <Flex gap={1.5} flexWrap="wrap">
          {Object.entries(DIMS).filter(([, m]) => m.group === 'cognitive').map(([k, m]) => (
            <DimPill key={k} dimKey={k} meta={m} ds={dimStats[k] || { total: 0, running: 0 }} />
          ))}
        </Flex>
      </Box>

      {/* ── Filter Row ─────────────────────────────────────── */}
      <Flex align="center" gap={2} mb={4} flexWrap="wrap">
        <HStack spacing={1}>
          <FiFilter size={12} color={textMuted} />
          <Select
            size="xs"
            h="28px"
            w="140px"
            fontSize="xs"
            borderRadius="md"
            value={filterDim}
            onChange={e => setFilterDim(e.target.value)}
            bg={isDark ? 'whiteAlpha.50' : 'white'}
          >
            <option value="all">All Dimensions</option>
            <optgroup label="Core">
              {Object.entries(DIMS).filter(([, v]) => v.group === 'core').map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </optgroup>
            <optgroup label="Cognitive">
              {Object.entries(DIMS).filter(([, v]) => v.group === 'cognitive').map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </optgroup>
          </Select>
        </HStack>

        <Select
          size="xs"
          h="28px"
          w="100px"
          fontSize="xs"
          borderRadius="md"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          bg={isDark ? 'whiteAlpha.50' : 'white'}
        >
          <option value="all">All Types</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>

        <Select
          size="xs"
          h="28px"
          w="100px"
          fontSize="xs"
          borderRadius="md"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          bg={isDark ? 'whiteAlpha.50' : 'white'}
        >
          <option value="all">All Status</option>
          <option value="running">Running</option>
          <option value="pending">Planned</option>
          <option value="failed">Failed</option>
        </Select>

        {hasFilters && (
          <Button size="xs" h="28px" variant="ghost" onClick={clearFilters} fontSize="xs" color={textMuted}>
            Clear
          </Button>
        )}

        <Box flex={1} />

        <Text fontSize="xs" color={textMuted}>
          {filtered.length} / {stats.total}
        </Text>

        <IconButton
          aria-label="Refresh"
          icon={<FiRefreshCw size={12} />}
          size="xs"
          variant="ghost"
          onClick={fetchWorkflows}
        />
      </Flex>

      {/* ── Workflow Table ─────────────────────────────────── */}
      <Box
        bg={isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
        borderRadius="lg"
        border="1px solid"
        borderColor={borderColor}
        overflow="hidden"
      >
        <Table size="sm" variant="unstyled">
          <Thead>
            <Tr borderBottom="1px solid" borderColor={borderColor}>
              <Th fontSize="10px" fontWeight="600" textTransform="uppercase" color={textMuted} py={2} px={3}>Status</Th>
              <Th fontSize="10px" fontWeight="600" textTransform="uppercase" color={textMuted} py={2} px={3}>Workflow</Th>
              <Th fontSize="10px" fontWeight="600" textTransform="uppercase" color={textMuted} py={2} px={3}>Dimension</Th>
              <Th fontSize="10px" fontWeight="600" textTransform="uppercase" color={textMuted} py={2} px={3}>Type</Th>
              <Th fontSize="10px" fontWeight="600" textTransform="uppercase" color={textMuted} py={2} px={3}>Load</Th>
              <Th fontSize="10px" fontWeight="600" textTransform="uppercase" color={textMuted} py={2} px={3}>Schedule</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map(wf => {
              const dim = DIMS[wf.dimension || ''] || { label: '—', icon: '❓', accent: '#A0AEC0' };
              const st = statusDot(wf.status);
              const loadFg = loadColor(wf.cognitiveLoadReduction);

              return (
                <Tr
                  key={wf.id}
                  _hover={{ bg: isDark ? 'whiteAlpha.50' : 'blackAlpha.30' }}
                  transition="background 0.15s"
                  borderBottom="1px solid"
                  borderColor={isDark ? 'whiteAlpha.50' : 'blackAlpha.50'}
                >
                  <Td py={2} px={3} w="80px">
                    <HStack spacing={1.5}>
                      <Text fontSize="8px" color={st.color}>{st.dot}</Text>
                      <Text fontSize="xs" color={st.color} fontWeight="500">{st.label}</Text>
                    </HStack>
                  </Td>
                  <Td py={2} px={3}>
                    <VStack align="start" spacing={0}>
                      <Text fontSize="xs" fontWeight="500">{wf.name}</Text>
                      <Text fontSize="10px" color={textMuted} noOfLines={1} maxW="200px">{wf.details}</Text>
                    </VStack>
                  </Td>
                  <Td py={2} px={3} w="100px">
                    <Badge
                      bg={`${dim.accent}15`}
                      color={dim.accent}
                      fontSize="9px"
                      fontWeight="600"
                      px={2}
                      py={0.5}
                      borderRadius="md"
                    >
                      {dim.icon} {dim.label}
                    </Badge>
                  </Td>
                  <Td py={2} px={3} w="60px">
                    <Text fontSize="xs" color={textMuted}>{CATEGORIES[wf.category || ''] || wf.category}</Text>
                  </Td>
                  <Td py={2} px={3} w="70px">
                    {loadFg && (
                      <Badge
                        bg={`${loadFg}15`}
                        color={loadFg}
                        fontSize="9px"
                        fontWeight="500"
                        px={1.5}
                        py={0.5}
                        borderRadius="sm"
                      >
                        {wf.cognitiveLoadReduction}
                      </Badge>
                    )}
                  </Td>
                  <Td py={2} px={3} w="120px">
                    <Text fontSize="10px" color={textMuted} fontFamily="mono">{wf.schedule}</Text>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default IntelligenceWorkflowsPanel;
