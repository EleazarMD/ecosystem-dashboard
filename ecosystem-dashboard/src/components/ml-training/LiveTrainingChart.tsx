import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, VStack, HStack, Text, Badge, Spinner, Grid, GridItem, StatLabel, StatNumber, StatHelpText, StatArrow } from '@chakra-ui/react';
import StatWrapper from '@/components/ui/StatWrapper';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Zap, TrendingDown, Shield } from 'lucide-react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { SimpleGlassPanel } from '@/components/ui/SimpleGlassPanel';

const WS_URL = 'ws://100.111.219.30:8022';

interface Metric { run_id: string; epoch: number; step: number; metric_type: string; value: number; }

export default function LiveTrainingChart({ runId }: { runId?: string }) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [connected, setConnected] = useState(false);
  const [latestValues, setLatestValues] = useState<Record<string, number>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const textSecondary = useSemanticToken('text.secondary');

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/training/metrics`);
    ws.onopen = () => { setConnected(true); if (runId) ws.send(JSON.stringify({ action: 'subscribe', run_id: runId })); };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'metric') { setMetrics(prev => [...prev, data].slice(-500)); setLatestValues(prev => ({ ...prev, [data.metric_type]: data.value })); }
      else if (data.type === 'history') setMetrics(data.metrics || []);
    };
    ws.onclose = () => setConnected(false);
    wsRef.current = ws;
    return () => ws.close();
  }, [runId]);

  const chartData = React.useMemo(() => {
    const byStep: Record<number, any> = {};
    metrics.forEach(m => { const k = m.epoch * 10000 + m.step; if (!byStep[k]) byStep[k] = { epoch: m.epoch, step: m.step }; byStep[k][m.metric_type] = m.value; });
    return Object.values(byStep).sort((a: any, b: any) => (a.epoch * 10000 + a.step) - (b.epoch * 10000 + b.step));
  }, [metrics]);

  return (
    <VStack spacing={4} align="stretch">
      <SimpleGlassPanel p={4}><HStack><Badge colorScheme={connected ? 'green' : 'red'}>{connected ? '● Live' : '○ Disconnected'}</Badge><Text fontSize="sm" color={textSecondary}>{metrics.length} points</Text></HStack></SimpleGlassPanel>
      <Grid templateColumns="repeat(4, 1fr)" gap={4}>
        <GridItem><SimpleGlassPanel p={4}><StatWrapper><StatLabel>Loss</StatLabel><StatNumber color="red.400">{latestValues.loss?.toFixed(4) || '--'}</StatNumber></StatWrapper></SimpleGlassPanel></GridItem>
        <GridItem><SimpleGlassPanel p={4}><StatWrapper><StatLabel>Accuracy</StatLabel><StatNumber color="green.400">{latestValues.accuracy ? `${(latestValues.accuracy*100).toFixed(1)}%` : '--'}</StatNumber></StatWrapper></SimpleGlassPanel></GridItem>
        <GridItem><SimpleGlassPanel p={4}><StatWrapper><StatLabel>Score</StatLabel><StatNumber color="purple.400">{latestValues.score?.toFixed(1) || '--'}</StatNumber></StatWrapper></SimpleGlassPanel></GridItem>
        <GridItem><SimpleGlassPanel p={4}><StatWrapper><StatLabel>Safety</StatLabel><StatNumber color="blue.400">{latestValues.safety?.toFixed(1) || '--'}</StatNumber></StatWrapper></SimpleGlassPanel></GridItem>
      </Grid>
      <SimpleGlassPanel p={4}>
        <Text fontSize="md" fontWeight="semibold" mb={4}>Training Progress (Real-time)</Text>
        {chartData.length === 0 ? <VStack py={12}><Spinner size="lg" color="purple.500"/><Text color={textSecondary}>Waiting for metrics...</Text></VStack> :
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#374151"/><XAxis dataKey="step" stroke="#9CA3AF"/><YAxis stroke="#9CA3AF"/><Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}/><Legend/>
              <Line type="monotone" dataKey="loss" stroke="#EF4444" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="safety" stroke="#3B82F6" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>}
      </SimpleGlassPanel>
    </VStack>
  );
}
