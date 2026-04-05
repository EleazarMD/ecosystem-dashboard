import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Flex,
  Button,
} from '@chakra-ui/react';
import {
  FiDollarSign,
  FiTrendingDown,
  FiAlertTriangle,
  FiCheckCircle,
  FiArrowRight,
} from 'react-icons/fi';

interface CostRecommendation {
  id: string;
  type: 'switch_model' | 'switch_provider' | 'optimize_routing' | 'reduce_usage';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  currentCost: number;
  projectedCost: number;
  savings: number;
  savingsPercent: number;
  fromModel?: string;
  toModel?: string;
  fromProvider?: string;
  toProvider?: string;
}

interface CostOptimizationPanelProps {
  recommendations: CostRecommendation[];
  totalMonthlyCost: number;
  projectedMonthlyCost: number;
}

export const CostOptimizationPanel: React.FC<CostOptimizationPanelProps> = ({
  recommendations,
  totalMonthlyCost,
  projectedMonthlyCost,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'switch_model': return FiArrowRight;
      case 'switch_provider': return FiArrowRight;
      case 'optimize_routing': return FiCheckCircle;
      case 'reduce_usage': return FiTrendingDown;
      default: return FiDollarSign;
    }
  };

  const totalPotentialSavings = recommendations.reduce((sum, rec) => sum + rec.savings, 0);

  return (
    <Box>
      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
        <Icon as={FiDollarSign} /> Cost Optimization
      </Heading>

      {/* Summary Stats */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Card variant="outline">
          <CardBody>
            <Stat>
              <StatLabel>Current Monthly Cost</StatLabel>
              <StatNumber color="purple.500">{formatCurrency(totalMonthlyCost)}</StatNumber>
              <StatHelpText>Based on last 30 days</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card variant="outline">
          <CardBody>
            <Stat>
              <StatLabel>Potential Savings</StatLabel>
              <StatNumber color="green.500">{formatCurrency(totalPotentialSavings)}</StatNumber>
              <StatHelpText>
                {totalMonthlyCost > 0 
                  ? `${((totalPotentialSavings / totalMonthlyCost) * 100).toFixed(1)}% reduction`
                  : 'No cost yet'
                }
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card variant="outline">
          <CardBody>
            <Stat>
              <StatLabel>Projected Monthly Cost</StatLabel>
              <StatNumber color="blue.500">{formatCurrency(projectedMonthlyCost)}</StatNumber>
              <StatHelpText>With optimizations</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <Heading size="sm">Optimization Recommendations</Heading>
        </CardHeader>
        <CardBody>
          <VStack align="stretch" spacing={4}>
            {recommendations.map((rec) => (
              <Card key={rec.id} variant="outline" borderLeft="4px" borderLeftColor={`${getSeverityColor(rec.severity)}.500`}>
                <CardBody>
                  <Flex justify="space-between" align="start" mb={2}>
                    <HStack spacing={2}>
                      <Icon as={getTypeIcon(rec.type)} boxSize={5} color={`${getSeverityColor(rec.severity)}.500`} />
                      <VStack align="start" spacing={0}>
                        <HStack>
                          <Text fontWeight="bold" fontSize="md">{rec.title}</Text>
                          <Badge colorScheme={getSeverityColor(rec.severity)} fontSize="xs">
                            {rec.severity} priority
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{rec.description}</Text>
                      </VStack>
                    </HStack>
                    <VStack align="end" spacing={0}>
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Monthly Savings</Text>
                      <Text fontSize="xl" fontWeight="bold" color="green.500">
                        {formatCurrency(rec.savings)}
                      </Text>
                      <Badge colorScheme="green" fontSize="xs">
                        -{rec.savingsPercent.toFixed(1)}%
                      </Badge>
                    </VStack>
                  </Flex>

                  {(rec.fromModel || rec.fromProvider) && (
                    <HStack mt={3} spacing={4} fontSize="sm">
                      {rec.fromModel && rec.toModel && (
                        <HStack>
                          <Badge colorScheme="gray">{rec.fromModel}</Badge>
                          <Icon as={FiArrowRight} />
                          <Badge colorScheme="green">{rec.toModel}</Badge>
                        </HStack>
                      )}
                      {rec.fromProvider && rec.toProvider && (
                        <HStack>
                          <Badge colorScheme="gray">{rec.fromProvider}</Badge>
                          <Icon as={FiArrowRight} />
                          <Badge colorScheme="green">{rec.toProvider}</Badge>
                        </HStack>
                      )}
                      <Flex flex={1} justify="flex-end">
                        <Button size="xs" colorScheme="blue" variant="outline">
                          Apply
                        </Button>
                      </Flex>
                    </HStack>
                  )}
                </CardBody>
              </Card>
            ))}

            {recommendations.length === 0 && (
              <Alert status="success">
                <AlertIcon />
                <Box>
                  <AlertTitle>Fully Optimized!</AlertTitle>
                  <AlertDescription>
                    Your current configuration is cost-optimized. No recommendations at this time.
                  </AlertDescription>
                </Box>
              </Alert>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Cost Breakdown */}
      {recommendations.length > 0 && (
        <Alert status="info" mt={4}>
          <AlertIcon />
          <Box>
            <AlertTitle>💡 Pro Tip</AlertTitle>
            <AlertDescription>
              Implementing all recommendations could save you{' '}
              <strong>{formatCurrency(totalPotentialSavings)}/month</strong>{' '}
              ({((totalPotentialSavings / totalMonthlyCost) * 100).toFixed(1)}% reduction in AI costs)
            </AlertDescription>
          </Box>
        </Alert>
      )}
    </Box>
  );
};
