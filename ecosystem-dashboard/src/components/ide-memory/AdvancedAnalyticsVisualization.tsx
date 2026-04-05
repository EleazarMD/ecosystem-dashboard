/**
 * Advanced Analytics Visualization Component
 * 
 * Interactive charts and visualizations for predictive analytics,
 * quality scoring trends, and ecosystem relationship mapping.
 * 
 * @module components/ide-memory/AdvancedAnalyticsVisualization
 * @updated 2025-08-14
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  SimpleGrid,
  Heading,
  Card,
  CardBody,
  CardHeader,
  Text,
  Badge,
  VStack,
  HStack,
  Progress,
  Spinner,
  Alert,
  AlertIcon,
  Tooltip,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  useQualityScoring,
  usePredictiveAnalytics,
  useContextualIntelligence,
} from '../../hooks/useIDEMemoryAnalytics';

interface AdvancedAnalyticsVisualizationProps {
  workspace?: string;
}

const AdvancedAnalyticsVisualization: React.FC<AdvancedAnalyticsVisualizationProps> = ({
  workspace = 'all'
}) => {
  const { data: qualityData, loading: qualityLoading } = useQualityScoring();
  const { data: predictiveData, loading: predictiveLoading } = usePredictiveAnalytics();
  const { data: contextualData, loading: contextualLoading } = useContextualIntelligence(workspace);

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Color schemes for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  const QUALITY_COLORS = {
    accuracy: '#0088FE',
    consistency: '#00C49F', 
    relevance: '#FFBB28',
    completeness: '#FF8042',
    temporalDecay: '#8884D8'
  };

  // Prepare quality evolution data for line chart
  const qualityEvolutionData = useMemo(() => {
    if (!qualityData?.historicalTrends?.qualityEvolution) return [];
    
    return qualityData.historicalTrends.qualityEvolution.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      overall: Math.round(item.overall_score * 100),
      accuracy: Math.round(item.accuracy * 100),
      consistency: Math.round(item.consistency * 100),
      relevance: Math.round(item.relevance * 100),
      completeness: Math.round(item.completeness * 100),
    }));
  }, [qualityData]);

  // Prepare dimensional scores for radar chart
  const dimensionalScoresData = useMemo(() => {
    if (!qualityData?.dimensionalScores) return [];
    
    return [
      {
        dimension: 'Accuracy',
        score: Math.round(qualityData.dimensionalScores.accuracy.score * 100),
        confidence: Math.round(qualityData.dimensionalScores.accuracy.confidence * 100),
      },
      {
        dimension: 'Consistency', 
        score: Math.round(qualityData.dimensionalScores.consistency.score * 100),
        confidence: Math.round(qualityData.dimensionalScores.consistency.confidence * 100),
      },
      {
        dimension: 'Relevance',
        score: Math.round(qualityData.dimensionalScores.relevance.score * 100),
        confidence: Math.round(qualityData.dimensionalScores.relevance.confidence * 100),
      },
      {
        dimension: 'Completeness',
        score: Math.round(qualityData.dimensionalScores.completeness.score * 100),
        confidence: Math.round(qualityData.dimensionalScores.completeness.confidence * 100),
      },
      {
        dimension: 'Temporal',
        score: Math.round(qualityData.dimensionalScores.temporalDecay.score * 100),
        confidence: Math.round(qualityData.dimensionalScores.temporalDecay.confidence * 100),
      },
    ];
  }, [qualityData]);

  // Prepare conflict prediction data
  const conflictPredictionData = useMemo(() => {
    if (!predictiveData?.conflictPrediction?.potentialConflicts) return [];
    
    return predictiveData.conflictPrediction.potentialConflicts.map(conflict => ({
      type: conflict.type.replace('_', ' '),
      probability: Math.round(conflict.probability * 100),
      severity: conflict.severity,
      daysUntil: Math.ceil((new Date(conflict.predicted_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }));
  }, [predictiveData]);

  // Prepare optimization opportunities data
  const optimizationData = useMemo(() => {
    if (!predictiveData?.optimizationOpportunities?.consolidationCandidates) return [];
    
    return predictiveData.optimizationOpportunities.consolidationCandidates.map(opp => ({
      type: opp.type.replace('_', ' '),
      improvement: Math.round(opp.potential_improvement * 100),
      effort: opp.effort_required,
      memories: opp.memories.length,
    }));
  }, [predictiveData]);

  if (qualityLoading || predictiveLoading || contextualLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="blue.500" />
        <Text mt={4} color={useSemanticToken('text.secondary')}>Loading advanced analytics...</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Quality Evolution Trends */}
      <Card bg={cardBg} borderColor={borderColor}>
        <CardHeader>
          <Heading size="md">Memory Quality Evolution</Heading>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            Multi-dimensional quality trends over time
          </Text>
        </CardHeader>
        <CardBody>
          <Box h="300px" minH="300px" w="100%" minW="300px">
            <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={300}>
              <LineChart data={qualityEvolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <RechartsTooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="overall" 
                  stroke="#8884D8" 
                  strokeWidth={3}
                  name="Overall Quality"
                />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke={QUALITY_COLORS.accuracy}
                  name="Accuracy"
                />
                <Line 
                  type="monotone" 
                  dataKey="consistency" 
                  stroke={QUALITY_COLORS.consistency}
                  name="Consistency"
                />
                <Line 
                  type="monotone" 
                  dataKey="relevance" 
                  stroke={QUALITY_COLORS.relevance}
                  name="Relevance"
                />
                <Line 
                  type="monotone" 
                  dataKey="completeness" 
                  stroke={QUALITY_COLORS.completeness}
                  name="Completeness"
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardBody>
      </Card>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Dimensional Quality Radar Chart */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Quality Dimensions</Heading>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              Current scores across all quality dimensions
            </Text>
          </CardHeader>
          <CardBody>
            <Box h="300px" minH="300px" w="100%" minW="300px">
              <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={300}>
                <RadarChart data={dimensionalScoresData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#8884D8"
                    fill="#8884D8"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Confidence"
                    dataKey="confidence"
                    stroke="#82CA9D"
                    fill="#82CA9D"
                    fillOpacity={0.1}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>

        {/* Conflict Predictions */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Conflict Predictions</Heading>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              Predicted conflicts by type and timeline
            </Text>
          </CardHeader>
          <CardBody>
            <Box h="300px" minH="300px" w="100%" minW="300px">
              <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={300}>
                <BarChart data={conflictPredictionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="probability" fill="#FF8042" name="Probability %" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Optimization Opportunities */}
      <Card bg={cardBg} borderColor={borderColor}>
        <CardHeader>
          <Heading size="md">Optimization Opportunities</Heading>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            Potential improvements and their impact
          </Text>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {optimizationData.map((opp, index) => (
              <Box key={index} p={4} borderWidth={1} borderRadius="md" borderColor={borderColor}>
                <VStack align="start" spacing={2}>
                  <HStack justify="space-between" w="full">
                    <Text fontWeight="bold" fontSize="sm">
                      {opp.type}
                    </Text>
                    <Badge colorScheme="green" variant="subtle">
                      +{opp.improvement}%
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    {opp.memories} memories affected
                  </Text>
                  <Progress 
                    value={opp.improvement} 
                    colorScheme="green" 
                    size="sm" 
                    w="full"
                  />
                  <Badge 
                    colorScheme={opp.effort === 'low' ? 'green' : opp.effort === 'medium' ? 'yellow' : 'red'}
                    variant="outline"
                    fontSize="xs"
                  >
                    {opp.effort} effort
                  </Badge>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Contextual Intelligence Summary */}
      {contextualData && (
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Contextual Intelligence Summary</Heading>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              Real-time ecosystem integration and recommendations
            </Text>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
              <VStack align="start" spacing={2}>
                <Text fontWeight="bold" color="blue.600">Ecosystem Integration</Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {Math.round(contextualData.ecosystemIntegration.score * 100)}%
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  {contextualData.ecosystemIntegration.serviceConnections.length} service connections
                </Text>
              </VStack>
              
              <VStack align="start" spacing={2}>
                <Text fontWeight="bold" color="green.600">Relevant Memories</Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {contextualData.contextualRecommendations.relevantMemories.length}
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  for current context
                </Text>
              </VStack>
              
              <VStack align="start" spacing={2}>
                <Text fontWeight="bold" color="orange.600">Suggested Actions</Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {contextualData.contextualRecommendations.suggestedActions.length}
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  optimization opportunities
                </Text>
              </VStack>
              
              <VStack align="start" spacing={2}>
                <Text fontWeight="bold" color="purple.600">KG Connectivity</Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {Math.round(contextualData.realTimeMetrics.integrationMetrics.knowledge_graph_sync * 100)}%
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  sync health
                </Text>
              </VStack>
            </SimpleGrid>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
};

export default AdvancedAnalyticsVisualization;
