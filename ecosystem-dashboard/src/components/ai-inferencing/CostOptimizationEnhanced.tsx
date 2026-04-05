/**
 * Cost Optimization Enhanced - Smart cost analysis and savings recommendations
 * Focus: Cost breakdown, savings opportunities, optimization actions
 */

import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  SimpleGrid,
  
  Icon,
  Button,
  Badge,
  Progress,
  Divider,
} from '@chakra-ui/react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertCircle,
  FiCheckCircle,
  FiZap,
  FiActivity,
} from 'react-icons/fi';

interface CostRecommendation {
  id: string;
  type: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  currentCost: number;
  potentialSavings: number;
  complexity: 'easy' | 'medium' | 'hard';
  action: string;
}

interface ModelCost {
  model: string;
  provider: string;
  cost: number;
  requests: number;
  percentage: number;
}

interface CostTrend {
  date: string;
  cost: number;
  savings: number;
}

interface Props {
  recommendations: CostRecommendation[];
  modelCosts: ModelCost[];
  costTrends: CostTrend[];
  timeRange: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a78bfa', '#f687b3'];

export function CostOptimizationEnhanced({
  recommendations,
  modelCosts,
  costTrends,
  timeRange,
}: Props) {
  const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set());

  // Colors
  const borderColor = useSemanticToken('border.default');
  const mutedText = useSemanticToken('text.secondary');
  const cardBg = useSemanticToken('surface.elevated');

  // Calculate totals
  const totalCost = modelCosts.reduce((sum, m) => sum + m.cost, 0);
  const totalSavings = recommendations.reduce((sum, r) => sum + r.potentialSavings, 0);
  const appliedSavings = Array.from(appliedRecommendations)
    .map((id) => recommendations.find((r) => r.id === id)?.potentialSavings || 0)
    .reduce((sum, s) => sum + s, 0);

  const monthlyProjection = totalCost * 30; // Assuming daily cost
  const monthlySavings = totalSavings * 30;

  const handleApplyRecommendation = (id: string) => {
    const newApplied = new Set(appliedRecommendations);
    if (newApplied.has(id)) {
      newApplied.delete(id);
    } else {
      newApplied.add(id);
    }
    setAppliedRecommendations(newApplied);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'high':
        return FiAlertCircle;
      case 'medium':
        return FiActivity;
      case 'low':
        return FiCheckCircle;
      default:
        return FiZap;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'high':
        return 'red';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'green';
      default:
        return 'blue';
    }
  };

  return (
    <VStack spacing={6} align="stretch" width="full">
      {/* Compact Header */}
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={1}>
          <HStack spacing={3} color={mutedText} fontSize="sm">
            <Text fontWeight="500">${totalCost.toFixed(2)} today</Text>
            <Text>·</Text>
            <Text>${monthlyProjection.toFixed(2)} projected/month</Text>
            <Text>·</Text>
            <Text fontWeight="600" color={useSemanticToken('status.success')}>
              ${totalSavings.toFixed(2)} potential savings
            </Text>
          </HStack>
          <HStack spacing={2} fontSize="xs">
            <Badge colorScheme="green">
              {recommendations.filter((r) => r.type === 'high').length} high impact
            </Badge>
            <Badge colorScheme="yellow">
              {recommendations.filter((r) => r.complexity === 'easy').length} easy wins
            </Badge>
          </HStack>
        </VStack>

        <Button
          leftIcon={<FiDollarSign />}
          colorScheme="green"
          size="sm"
          isDisabled={appliedRecommendations.size === 0}
        >
          Apply {appliedRecommendations.size} Selected
        </Button>
      </HStack>

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FiDollarSign} color={useSemanticToken('interactive.primary')} />
                <Text fontSize="xs" color={mutedText} textTransform="uppercase">
                  Today's Cost
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="700">
                ${totalCost.toFixed(2)}
              </Text>
              <HStack spacing={1} color={useSemanticToken('status.error')} fontSize="xs">
                <Icon as={FiTrendingUp} />
                <Text>+18% vs yesterday</Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FiTrendingUp} color={useSemanticToken('interactive.secondary')} />
                <Text fontSize="xs" color={mutedText} textTransform="uppercase">
                  Monthly Projection
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="700">
                ${monthlyProjection.toFixed(0)}
              </Text>
              <Text fontSize="xs" color={mutedText}>
                Based on current usage
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FiZap} color={useSemanticToken('status.success')} />
                <Text fontSize="xs" color={mutedText} textTransform="uppercase">
                  Potential Savings
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="700">
                ${totalSavings.toFixed(2)}
              </Text>
              <Text fontSize="xs" color={useSemanticToken('status.success')}>
                ${monthlySavings.toFixed(0)}/month
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FiCheckCircle} color={useSemanticToken('status.warning')} />
                <Text fontSize="xs" color={mutedText} textTransform="uppercase">
                  Applied Savings
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="700">
                ${appliedSavings.toFixed(2)}
              </Text>
              <Text fontSize="xs" color={mutedText}>
                {appliedRecommendations.size} recommendation(s)
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Two Charts Side-by-Side */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {/* Cost Breakdown Pie Chart */}
        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Text fontSize="md" fontWeight="600" mb={4}>
              Cost Breakdown by Model
            </Text>
            <Box height="250px">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modelCosts as any[]}
                    dataKey="cost"
                    nameKey="model"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: any) => `${entry.model}: $${entry.cost.toFixed(2)}`}
                    labelLine={false}
                  >
                    {modelCosts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => `$${value.toFixed(4)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>

        {/* Cost Trends Line Chart */}
        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Text fontSize="md" fontWeight="600" mb={4}>
              Cost & Savings Trends (7 Days)
            </Text>
            <Box height="250px">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={mutedText} />
                  <YAxis tick={{ fontSize: 11 }} stroke={mutedText} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Daily Cost"
                  />
                  <Line
                    type="monotone"
                    dataKey="savings"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Savings"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Recommendations */}
      <Box>
        <Text fontSize="md" fontWeight="600" mb={4}>
          Optimization Recommendations
        </Text>
        <VStack spacing={3} align="stretch">
          {recommendations
            .sort((a, b) => b.potentialSavings - a.potentialSavings)
            .map((rec) => {
              const isApplied = appliedRecommendations.has(rec.id);

              return (
                <Card
                  key={rec.id}
                  borderWidth="2px"
                  borderColor={isApplied ? useSemanticToken('status.success') : borderColor}
                  bg={isApplied ? useSemanticToken('status.successSubtle') : cardBg}
                >
                  <CardBody>
                    <HStack spacing={4} align="start">
                      {/* Icon */}
                      <Icon
                        as={getTypeIcon(rec.type)}
                        boxSize={6}
                        color={useSemanticToken('icon.primary')}
                        mt={1}
                      />

                      {/* Content */}
                      <VStack align="start" spacing={2} flex={1}>
                        <HStack justify="space-between" width="full">
                          <HStack spacing={2}>
                            <Text fontSize="md" fontWeight="600">
                              {rec.title}
                            </Text>
                            <Badge colorScheme={getTypeColor(rec.type)} size="sm">
                              {rec.type.toUpperCase()} IMPACT
                            </Badge>
                            <Badge variant="outline" size="sm">
                              {rec.complexity}
                            </Badge>
                          </HStack>

                          <HStack spacing={3}>
                            <VStack align="end" spacing={0}>
                              <Text fontSize="xs" color={mutedText}>
                                Potential Savings
                              </Text>
                              <Text fontSize="lg" fontWeight="700" color={useSemanticToken('status.success')}>
                                ${rec.potentialSavings.toFixed(2)}/day
                              </Text>
                              <Text fontSize="xs" color={mutedText}>
                                ${(rec.potentialSavings * 30).toFixed(0)}/month
                              </Text>
                            </VStack>
                          </HStack>
                        </HStack>

                        <Text fontSize="sm" color={mutedText}>
                          {rec.description}
                        </Text>

                        <HStack spacing={3} fontSize="xs">
                          <Text color={mutedText}>Current cost:</Text>
                          <Text fontWeight="600">${rec.currentCost.toFixed(4)}</Text>
                          <Icon as={FiTrendingDown} color={useSemanticToken('status.success')} />
                          <Text fontWeight="600" color={useSemanticToken('status.success')}>
                            Save {((rec.potentialSavings / rec.currentCost) * 100).toFixed(0)}%
                          </Text>
                        </HStack>

                        <Divider />

                        <HStack justify="space-between" width="full">
                          <Text fontSize="sm" fontWeight="600" color={useSemanticToken('interactive.primary')}>
                            {rec.action}
                          </Text>
                          <Button
                            size="sm"
                            colorScheme={isApplied ? 'green' : 'blue'}
                            variant={isApplied ? 'solid' : 'outline'}
                            leftIcon={isApplied ? <FiCheckCircle /> : undefined}
                            onClick={() => handleApplyRecommendation(rec.id)}
                          >
                            {isApplied ? 'Applied' : 'Apply'}
                          </Button>
                        </HStack>
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>
              );
            })}
        </VStack>
      </Box>

      {/* Cost per Provider */}
      <Card borderWidth="1px" borderColor={borderColor}>
        <CardBody>
          <Text fontSize="md" fontWeight="600" mb={4}>
            Cost Distribution by Provider
          </Text>
          <Box height="200px">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={modelCosts.reduce((acc: any[], curr) => {
                  const existing = acc.find((item) => item.provider === curr.provider);
                  if (existing) {
                    existing.cost += curr.cost;
                    existing.requests += curr.requests;
                  } else {
                    acc.push({
                      provider: curr.provider,
                      cost: curr.cost,
                      requests: curr.requests,
                    });
                  }
                  return acc;
                }, [])}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                <XAxis dataKey="provider" tick={{ fontSize: 11 }} stroke={mutedText} />
                <YAxis tick={{ fontSize: 11 }} stroke={mutedText} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `$${value.toFixed(4)}`}
                />
                <Bar dataKey="cost" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardBody>
      </Card>
    </VStack>
  );
}
