/**
 * Experiment Charts Component
 * Displays score trends, distribution, and accuracy charts for training experiments
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Select,
  Spinner,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { SimpleGlassPanel } from '@/components/ui/SimpleGlassPanel';

const TRAINING_API_URL = process.env.NEXT_PUBLIC_TRAINING_API_URL || 'http://100.111.219.30:8022';

interface ChartDataPoint {
  experiment_num: number;
  overall_score: number | null;
  clinical_accuracy: number | null;
  guideline_alignment: number | null;
  evidence_quality: number | null;
  safety: number | null;
  avg_overall: number;
  avg_clinical_accuracy: number;
  avg_guideline_alignment: number;
  avg_safety: number;
  complexity: string;
}

interface ChartData {
  run_id: string;
  total_experiments: number;
  data_points: ChartDataPoint[];
  distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  complexity_breakdown: Array<{
    level: string;
    avg_score: number;
    count: number;
  }>;
}

const COLORS = {
  overall: '#8B5CF6',
  clinical_accuracy: '#10B981',
  guideline_alignment: '#F59E0B',
  safety: '#EF4444',
  evidence_quality: '#3B82F6',
};

const PIE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

interface ExperimentChartsProps {
  runId: string | null;
}

export default function ExperimentCharts({ runId }: ExperimentChartsProps) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'overall' | 'accuracy' | 'safety'>('all');

  const textSecondary = useSemanticToken('text.secondary');

  useEffect(() => {
    if (!runId) return;
    
    const fetchChartData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${TRAINING_API_URL}/api/training/runs/${runId}/chart-data`);
        if (response.ok) {
          const data = await response.json();
          setChartData(data);
        }
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
    const interval = setInterval(fetchChartData, 10000);
    return () => clearInterval(interval);
  }, [runId]);

  if (!runId) {
    return (
      <SimpleGlassPanel p={6}>
        <Text color={textSecondary} textAlign="center">Select a training run to view charts</Text>
      </SimpleGlassPanel>
    );
  }

  if (loading && !chartData) {
    return (
      <SimpleGlassPanel p={6}>
        <VStack py={8}>
          <Spinner size="lg" color="purple.500" />
          <Text color={textSecondary}>Loading chart data...</Text>
        </VStack>
      </SimpleGlassPanel>
    );
  }

  if (!chartData || chartData.data_points.length === 0) {
    return (
      <SimpleGlassPanel p={6}>
        <Text color={textSecondary} textAlign="center">No experiment data available yet</Text>
      </SimpleGlassPanel>
    );
  }

  // Filter out null values for cleaner charts
  const validDataPoints = chartData.data_points.filter(d => d.overall_score !== null);

  return (
    <VStack spacing={6} align="stretch">
      {/* Metric Selector */}
      <HStack justify="space-between">
        <Text fontSize="lg" fontWeight="bold">Training Progress Charts</Text>
        <Select 
          w="200px" 
          value={selectedMetric} 
          onChange={(e) => setSelectedMetric(e.target.value as any)}
          bg="whiteAlpha.100"
        >
          <option value="all">All Metrics</option>
          <option value="overall">Overall Score</option>
          <option value="accuracy">Clinical Accuracy</option>
          <option value="safety">Safety Score</option>
        </Select>
      </HStack>

      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        {/* Score Trend Line Chart */}
        <GridItem colSpan={2}>
          <SimpleGlassPanel p={4}>
            <Text fontSize="md" fontWeight="semibold" mb={4}>Score Progression (Running Average)</Text>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.data_points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="experiment_num" 
                  stroke="#9CA3AF"
                  label={{ value: 'Experiment #', position: 'bottom', fill: '#9CA3AF' }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  stroke="#9CA3AF"
                  label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                {(selectedMetric === 'all' || selectedMetric === 'overall') && (
                  <Line 
                    type="monotone" 
                    dataKey="avg_overall" 
                    name="Overall" 
                    stroke={COLORS.overall} 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {(selectedMetric === 'all' || selectedMetric === 'accuracy') && (
                  <Line 
                    type="monotone" 
                    dataKey="avg_clinical_accuracy" 
                    name="Clinical Accuracy" 
                    stroke={COLORS.clinical_accuracy} 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {(selectedMetric === 'all' || selectedMetric === 'safety') && (
                  <Line 
                    type="monotone" 
                    dataKey="avg_safety" 
                    name="Safety" 
                    stroke={COLORS.safety} 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {selectedMetric === 'all' && (
                  <Line 
                    type="monotone" 
                    dataKey="avg_guideline_alignment" 
                    name="Guideline Alignment" 
                    stroke={COLORS.guideline_alignment} 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </SimpleGlassPanel>
        </GridItem>

        {/* Individual Scores Scatter */}
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Text fontSize="md" fontWeight="semibold" mb={4}>Individual Experiment Scores</Text>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={validDataPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="experiment_num" stroke="#9CA3AF" />
                <YAxis domain={[0, 100]} stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="overall_score" 
                  name="Score" 
                  stroke={COLORS.overall}
                  fill={COLORS.overall}
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </SimpleGlassPanel>
        </GridItem>

        {/* Score Distribution Pie Chart */}
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Text fontSize="md" fontWeight="semibold" mb={4}>Score Distribution</Text>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Excellent (80+)', value: chartData.distribution.excellent },
                    { name: 'Good (60-79)', value: chartData.distribution.good },
                    { name: 'Fair (40-59)', value: chartData.distribution.fair },
                    { name: 'Poor (<40)', value: chartData.distribution.poor },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => value > 0 ? `${value}` : ''}
                >
                  {PIE_COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </SimpleGlassPanel>
        </GridItem>

        {/* Complexity Breakdown Bar Chart */}
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Text fontSize="md" fontWeight="semibold" mb={4}>Score by Query Complexity</Text>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData.complexity_breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="level" stroke="#9CA3AF" />
                <YAxis domain={[0, 100]} stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: number, name: string) => [value.toFixed(1), name]}
                />
                <Bar dataKey="avg_score" name="Avg Score" fill={COLORS.overall} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SimpleGlassPanel>
        </GridItem>

        {/* Safety vs Accuracy Comparison */}
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Text fontSize="md" fontWeight="semibold" mb={4}>Safety vs Clinical Accuracy</Text>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { 
                  name: 'Current Run', 
                  safety: chartData.data_points.length > 0 
                    ? chartData.data_points[chartData.data_points.length - 1].avg_safety 
                    : 0,
                  accuracy: chartData.data_points.length > 0 
                    ? chartData.data_points[chartData.data_points.length - 1].avg_clinical_accuracy 
                    : 0,
                  alignment: chartData.data_points.length > 0 
                    ? chartData.data_points[chartData.data_points.length - 1].avg_guideline_alignment 
                    : 0,
                }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis domain={[0, 100]} stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="accuracy" name="Clinical Accuracy" fill={COLORS.clinical_accuracy} />
                <Bar dataKey="safety" name="Safety" fill={COLORS.safety} />
                <Bar dataKey="alignment" name="Guideline Alignment" fill={COLORS.guideline_alignment} />
              </BarChart>
            </ResponsiveContainer>
          </SimpleGlassPanel>
        </GridItem>
      </Grid>

      {/* Summary Stats */}
      <SimpleGlassPanel p={4}>
        <HStack justify="space-around" wrap="wrap" spacing={8}>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="purple.400">
              {chartData.total_experiments}
            </Text>
            <Text fontSize="sm" color={textSecondary}>Total Experiments</Text>
          </VStack>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="green.400">
              {chartData.data_points.length > 0 
                ? chartData.data_points[chartData.data_points.length - 1].avg_overall.toFixed(1) 
                : '-'}
            </Text>
            <Text fontSize="sm" color={textSecondary}>Avg Overall Score</Text>
          </VStack>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="blue.400">
              {chartData.data_points.length > 0 
                ? chartData.data_points[chartData.data_points.length - 1].avg_clinical_accuracy.toFixed(1) 
                : '-'}
            </Text>
            <Text fontSize="sm" color={textSecondary}>Avg Clinical Accuracy</Text>
          </VStack>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="red.400">
              {chartData.data_points.length > 0 
                ? chartData.data_points[chartData.data_points.length - 1].avg_safety.toFixed(1) 
                : '-'}
            </Text>
            <Text fontSize="sm" color={textSecondary}>Avg Safety Score</Text>
          </VStack>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="yellow.400">
              {chartData.data_points.length > 0 
                ? chartData.data_points[chartData.data_points.length - 1].avg_guideline_alignment.toFixed(1) 
                : '-'}
            </Text>
            <Text fontSize="sm" color={textSecondary}>Avg Guideline Alignment</Text>
          </VStack>
        </HStack>
      </SimpleGlassPanel>
    </VStack>
  );
}
