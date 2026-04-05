/**
 * Optimization Dashboard Component
 * Displays pipeline configuration variables, stage attribution, and sensitivity analysis
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  Spinner,
  Grid,
  GridItem,
  Progress,
  Tooltip,
  Icon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { Settings, Target, Layers, TrendingUp, AlertTriangle } from 'lucide-react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { SimpleGlassPanel } from '@/components/ui/SimpleGlassPanel';

const TRAINING_API_URL = process.env.NEXT_PUBLIC_TRAINING_API_URL || 'http://100.111.219.30:8022';

interface Variable {
  name: string;
  type: string;
  stage: number;
  default: any;
  min: number | null;
  max: number | null;
  categories: string[] | null;
  description: string;
  tier: number;
}

interface StageAttribution {
  stage: number;
  stage_name: string;
  attribution_count: number;
  avg_score_when_attributed: number;
  avg_confidence: number;
}

interface PipelineConfig {
  config_id: string;
  config_name: string;
  parent_config_id: string | null;
  created_at: string;
  is_active: boolean;
  [key: string]: any;
}

const STAGE_COLORS = {
  1: '#8B5CF6', // Enrichment - Purple
  2: '#3B82F6', // Planning - Blue
  3: '#10B981', // Guidelines - Green
  4: '#F59E0B', // Search - Amber
  5: '#EF4444', // Evaluation - Red
  6: '#EC4899', // Synthesis - Pink
};

const TIER_COLORS = {
  1: '#EF4444', // Major - Red
  2: '#F59E0B', // Minor - Amber
  3: '#10B981', // Fine-tuning - Green
};

export default function OptimizationDashboard() {
  const [variables, setVariables] = useState<{
    major_variables: Record<string, Variable>;
    minor_variables: Record<string, Variable>;
    fine_tuning_variables: Record<string, Variable>;
    total_count: number;
  } | null>(null);
  const [stageAttribution, setStageAttribution] = useState<StageAttribution[]>([]);
  const [configs, setConfigs] = useState<PipelineConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const textSecondary = useSemanticToken('text.secondary');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [varsRes, attrRes, configsRes] = await Promise.all([
        fetch(`${TRAINING_API_URL}/api/training/variables`),
        fetch(`${TRAINING_API_URL}/api/training/stage-attribution`),
        fetch(`${TRAINING_API_URL}/api/training/configs`),
      ]);

      if (varsRes.ok) {
        const data = await varsRes.json();
        setVariables(data);
      }
      if (attrRes.ok) {
        const data = await attrRes.json();
        setStageAttribution(data.attribution || []);
      }
      if (configsRes.ok) {
        const data = await configsRes.json();
        setConfigs(data.configs || []);
        if (data.configs?.length > 0 && !selectedConfig) {
          setSelectedConfig(data.configs[0].config_id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch optimization data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedConfig]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !variables) {
    return (
      <SimpleGlassPanel p={6}>
        <VStack py={8}>
          <Spinner size="lg" color="purple.500" />
          <Text color={textSecondary}>Loading optimization data...</Text>
        </VStack>
      </SimpleGlassPanel>
    );
  }

  // Prepare stage attribution chart data
  const stageChartData = stageAttribution.map(s => ({
    name: s.stage_name,
    count: s.attribution_count,
    avgScore: Math.round(s.avg_score_when_attributed),
    confidence: Math.round(s.avg_confidence * 100),
    fill: STAGE_COLORS[s.stage as keyof typeof STAGE_COLORS] || '#6B7280',
  }));

  // Prepare variables by stage for radar chart
  const variablesByStage = variables ? [1, 2, 3, 4, 5, 6].map(stage => {
    const allVars = {
      ...variables.major_variables,
      ...variables.minor_variables,
      ...variables.fine_tuning_variables,
    };
    const stageVars = Object.values(allVars).filter(v => v.stage === stage);
    return {
      stage: `S${stage}`,
      major: stageVars.filter(v => v.tier === 1).length,
      minor: stageVars.filter(v => v.tier === 2).length,
      fine: stageVars.filter(v => v.tier === 3).length,
      total: stageVars.length,
    };
  }) : [];

  return (
    <VStack spacing={6} align="stretch">
      <Tabs variant="soft-rounded" colorScheme="purple">
        <TabList>
          <Tab><Icon as={Target} mr={2} /> Stage Attribution</Tab>
          <Tab><Icon as={Settings} mr={2} /> Variables</Tab>
          <Tab><Icon as={Layers} mr={2} /> Configs</Tab>
        </TabList>

        <TabPanels>
          {/* Stage Attribution Tab */}
          <TabPanel px={0}>
            <Grid templateColumns="repeat(2, 1fr)" gap={6}>
              {/* Attribution Bar Chart */}
              <GridItem colSpan={2}>
                <SimpleGlassPanel p={4}>
                  <Text fontSize="md" fontWeight="semibold" mb={4}>
                    Issue Attribution by Pipeline Stage
                  </Text>
                  <Text fontSize="sm" color={textSecondary} mb={4}>
                    Shows which pipeline stages are most frequently attributed as the cause of quality issues
                  </Text>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stageChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#9CA3AF" />
                      <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={100} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => {
                          if (name === 'count') return [`${value} issues`, 'Attribution Count'];
                          if (name === 'avgScore') return [`${value}/100`, 'Avg Score'];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="count" name="Attribution Count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </SimpleGlassPanel>
              </GridItem>

              {/* Attribution Summary Cards */}
              {stageAttribution.slice(0, 4).map((attr) => (
                <GridItem key={attr.stage}>
                  <SimpleGlassPanel p={4}>
                    <HStack justify="space-between" mb={2}>
                      <Badge
                        colorScheme={attr.attribution_count > 10 ? 'red' : attr.attribution_count > 5 ? 'yellow' : 'green'}
                        fontSize="sm"
                      >
                        Stage {attr.stage}
                      </Badge>
                      <Text fontSize="lg" fontWeight="bold">
                        {attr.attribution_count} issues
                      </Text>
                    </HStack>
                    <Text fontSize="md" fontWeight="semibold">{attr.stage_name}</Text>
                    <HStack mt={2} spacing={4}>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="xs" color={textSecondary}>Avg Score</Text>
                        <Text fontSize="sm" fontWeight="medium">
                          {attr.avg_score_when_attributed?.toFixed(1) || 'N/A'}
                        </Text>
                      </VStack>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="xs" color={textSecondary}>Confidence</Text>
                        <Text fontSize="sm" fontWeight="medium">
                          {(attr.avg_confidence * 100).toFixed(0)}%
                        </Text>
                      </VStack>
                    </HStack>
                    <Progress
                      value={attr.attribution_count}
                      max={Math.max(...stageAttribution.map(s => s.attribution_count))}
                      colorScheme={attr.attribution_count > 10 ? 'red' : 'purple'}
                      size="sm"
                      mt={2}
                      borderRadius="full"
                    />
                  </SimpleGlassPanel>
                </GridItem>
              ))}
            </Grid>
          </TabPanel>

          {/* Variables Tab */}
          <TabPanel px={0}>
            <Grid templateColumns="repeat(3, 1fr)" gap={6}>
              {/* Major Variables */}
              <GridItem>
                <SimpleGlassPanel p={4}>
                  <HStack mb={4}>
                    <Badge colorScheme="red">Tier 1</Badge>
                    <Text fontSize="md" fontWeight="semibold">Major Variables</Text>
                  </HStack>
                  <Text fontSize="sm" color={textSecondary} mb={4}>
                    Highest impact on output quality
                  </Text>
                  <VStack align="stretch" spacing={2}>
                    {variables && Object.entries(variables.major_variables).map(([name, v]) => (
                      <Box key={name} p={2} bg="whiteAlpha.50" borderRadius="md">
                        <HStack justify="space-between">
                          <Text fontSize="sm" fontWeight="medium">{name}</Text>
                          <Badge size="sm" colorScheme="purple">S{v.stage}</Badge>
                        </HStack>
                        <Text fontSize="xs" color={textSecondary}>{v.description}</Text>
                        <HStack mt={1} fontSize="xs">
                          <Text>Default: {String(v.default)}</Text>
                          {v.min !== null && <Text>Range: [{v.min}, {v.max}]</Text>}
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </SimpleGlassPanel>
              </GridItem>

              {/* Minor Variables */}
              <GridItem>
                <SimpleGlassPanel p={4}>
                  <HStack mb={4}>
                    <Badge colorScheme="yellow">Tier 2</Badge>
                    <Text fontSize="md" fontWeight="semibold">Minor Variables</Text>
                  </HStack>
                  <Text fontSize="sm" color={textSecondary} mb={4}>
                    Secondary impact, refinement
                  </Text>
                  <VStack align="stretch" spacing={2}>
                    {variables && Object.entries(variables.minor_variables).map(([name, v]) => (
                      <Box key={name} p={2} bg="whiteAlpha.50" borderRadius="md">
                        <HStack justify="space-between">
                          <Text fontSize="sm" fontWeight="medium">{name}</Text>
                          <Badge size="sm" colorScheme="blue">S{v.stage}</Badge>
                        </HStack>
                        <Text fontSize="xs" color={textSecondary}>{v.description}</Text>
                        <HStack mt={1} fontSize="xs">
                          <Text>Default: {String(v.default)}</Text>
                          {v.min !== null && <Text>Range: [{v.min}, {v.max}]</Text>}
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </SimpleGlassPanel>
              </GridItem>

              {/* Fine-tuning Variables */}
              <GridItem>
                <SimpleGlassPanel p={4}>
                  <HStack mb={4}>
                    <Badge colorScheme="green">Tier 3</Badge>
                    <Text fontSize="md" fontWeight="semibold">Fine-tuning</Text>
                  </HStack>
                  <Text fontSize="sm" color={textSecondary} mb={4}>
                    Final optimization pass
                  </Text>
                  <VStack align="stretch" spacing={2}>
                    {variables && Object.entries(variables.fine_tuning_variables).map(([name, v]) => (
                      <Box key={name} p={2} bg="whiteAlpha.50" borderRadius="md">
                        <HStack justify="space-between">
                          <Text fontSize="sm" fontWeight="medium">{name}</Text>
                          <Badge size="sm" colorScheme="green">S{v.stage}</Badge>
                        </HStack>
                        <Text fontSize="xs" color={textSecondary}>{v.description}</Text>
                        <HStack mt={1} fontSize="xs">
                          <Text>Default: {String(v.default)}</Text>
                          {v.categories && <Text>Options: {v.categories.join(', ')}</Text>}
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </SimpleGlassPanel>
              </GridItem>

              {/* Variables by Stage Radar */}
              <GridItem colSpan={3}>
                <SimpleGlassPanel p={4}>
                  <Text fontSize="md" fontWeight="semibold" mb={4}>Variables Distribution by Stage</Text>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={variablesByStage}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="stage" stroke="#9CA3AF" />
                      <PolarRadiusAxis stroke="#9CA3AF" />
                      <Radar name="Major" dataKey="major" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} />
                      <Radar name="Minor" dataKey="minor" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} />
                      <Radar name="Fine-tuning" dataKey="fine" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </SimpleGlassPanel>
              </GridItem>
            </Grid>
          </TabPanel>

          {/* Configs Tab */}
          <TabPanel px={0}>
            <SimpleGlassPanel p={4}>
              <HStack justify="space-between" mb={4}>
                <Text fontSize="md" fontWeight="semibold">Pipeline Configurations</Text>
                <Select
                  w="300px"
                  value={selectedConfig || ''}
                  onChange={(e) => setSelectedConfig(e.target.value)}
                  bg="whiteAlpha.100"
                >
                  {configs.map((c) => (
                    <option key={c.config_id} value={c.config_id}>
                      {c.config_name}
                    </option>
                  ))}
                </Select>
              </HStack>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Config Name</Th>
                    <Th>Parent</Th>
                    <Th>Created</Th>
                    <Th>Active</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {configs.map((config) => (
                    <Tr key={config.config_id}>
                      <Td fontWeight="medium">{config.config_name}</Td>
                      <Td>{config.parent_config_id ? 'Variant' : 'Base'}</Td>
                      <Td>{new Date(config.created_at).toLocaleDateString()}</Td>
                      <Td>
                        <Badge colorScheme={config.is_active ? 'green' : 'gray'}>
                          {config.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </SimpleGlassPanel>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Summary Stats */}
      <SimpleGlassPanel p={4}>
        <HStack justify="space-around" wrap="wrap" spacing={8}>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="purple.400">
              {variables?.total_count || 0}
            </Text>
            <Text fontSize="sm" color={textSecondary}>Total Variables</Text>
          </VStack>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="red.400">
              {variables ? Object.keys(variables.major_variables).length : 0}
            </Text>
            <Text fontSize="sm" color={textSecondary}>Major (Tier 1)</Text>
          </VStack>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="yellow.400">
              {variables ? Object.keys(variables.minor_variables).length : 0}
            </Text>
            <Text fontSize="sm" color={textSecondary}>Minor (Tier 2)</Text>
          </VStack>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="green.400">
              {variables ? Object.keys(variables.fine_tuning_variables).length : 0}
            </Text>
            <Text fontSize="sm" color={textSecondary}>Fine-tuning (Tier 3)</Text>
          </VStack>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="blue.400">
              {configs.length}
            </Text>
            <Text fontSize="sm" color={textSecondary}>Configurations</Text>
          </VStack>
        </HStack>
      </SimpleGlassPanel>
    </VStack>
  );
}
