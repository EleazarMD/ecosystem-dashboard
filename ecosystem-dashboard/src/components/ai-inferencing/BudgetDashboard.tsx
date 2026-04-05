import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Grid,
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Card,
  CardBody,
  Badge,
  Button,
  IconButton,
  Spinner,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Select,
} from '@chakra-ui/react';
import { FiRefreshCw, FiAlertTriangle, FiDollarSign, FiTrendingUp } from 'react-icons/fi';
import { BudgetServiceCard } from './BudgetServiceCard';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
const ADMIN_KEY = 'ai-inferencing-admin-key-2024';

interface BudgetStatus {
  serviceId: string;
  budget: {
    dailyLimit: number;
    monthlyLimit: number;
    alertThresholds: {
      50: boolean;
      80: boolean;
      100: boolean;
    };
    autoSuspend: boolean;
    notificationWebhook?: string;
  };
  usage: {
    dailyCost: number;
    monthlyCost: number;
  };
  dailyPercent: string;
  monthlyPercent: string;
  suspended: boolean;
}

export function BudgetDashboard() {
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'healthy' | 'warning' | 'critical' | 'suspended'>('all');
  
  const toast = useToast();
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const fetchBudgets = async () => {
    try {
      const response = await fetch(`${AI_INFERENCING_URL}/api/v1/budgets`, {
        headers: {
          'X-Admin-Key': ADMIN_KEY,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch budgets');

      const data = await response.json();
      setBudgets(data.budgets || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast({
        title: 'Error loading budgets',
        description: 'Failed to fetch budget data from AI Inferencing Service',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchBudgets, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate overview stats
  const totalDailySpend = budgets.reduce((sum, b) => sum + b.usage.dailyCost, 0);
  const totalMonthlySpend = budgets.reduce((sum, b) => sum + b.usage.monthlyCost, 0);
  const totalDailyBudget = budgets.reduce((sum, b) => sum + b.budget.dailyLimit, 0);
  const totalMonthlyBudget = budgets.reduce((sum, b) => sum + b.budget.monthlyLimit, 0);
  
  const servicesAtRisk = budgets.filter(b => {
    const dailyPercent = parseFloat(b.dailyPercent);
    const monthlyPercent = parseFloat(b.monthlyPercent);
    return dailyPercent >= 80 || monthlyPercent >= 80;
  }).length;
  
  const suspendedCount = budgets.filter(b => b.suspended).length;

  // Filter budgets
  const getFilteredBudgets = () => {
    if (filterStatus === 'all') return budgets;
    
    return budgets.filter(b => {
      const dailyPercent = parseFloat(b.dailyPercent);
      const monthlyPercent = parseFloat(b.monthlyPercent);
      const maxPercent = Math.max(dailyPercent, monthlyPercent);
      
      switch (filterStatus) {
        case 'suspended':
          return b.suspended;
        case 'critical':
          return maxPercent >= 80 && maxPercent < 100 && !b.suspended;
        case 'warning':
          return maxPercent >= 50 && maxPercent < 80;
        case 'healthy':
          return maxPercent < 50 && !b.suspended;
        default:
          return true;
      }
    });
  };

  const filteredBudgets = getFilteredBudgets();

  if (loading) {
    return (
      <VStack h="full" justify="center" align="center" p={8}>
        <Spinner size="xl" color="purple.500" thickness="4px" />
        <Text>Loading budget data...</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch" p={6}>
      {/* Header */}
      <HStack justify="space-between">
        <VStack align="start" spacing={0}>
          <Heading size="lg">Budget Management</Heading>
          <Text color={useSemanticToken('text.secondary')} fontSize="sm">
            Monitor and control spending across all services
          </Text>
        </VStack>
        <IconButton
          aria-label="Refresh"
          icon={<FiRefreshCw />}
          onClick={fetchBudgets}
          size="sm"
          variant="ghost"
        />
      </HStack>

      {/* Alerts */}
      {suspendedCount > 0 && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Services Suspended</AlertTitle>
            <AlertDescription>
              {suspendedCount} service{suspendedCount > 1 ? 's have' : ' has'} been suspended due to budget limits.
              Review and resume services as needed.
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {servicesAtRisk > 0 && suspendedCount === 0 && (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Budget Alert</AlertTitle>
            <AlertDescription>
              {servicesAtRisk} service{servicesAtRisk > 1 ? 's are' : ' is'} at or above 80% of budget limit.
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {/* Overview Stats */}
      <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Daily Spending</StatLabel>
              <StatNumber>${totalDailySpend.toFixed(2)}</StatNumber>
              <StatHelpText>
                of ${totalDailyBudget.toFixed(2)} ({((totalDailySpend / totalDailyBudget) * 100).toFixed(1)}%)
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Monthly Spending</StatLabel>
              <StatNumber>${totalMonthlySpend.toFixed(2)}</StatNumber>
              <StatHelpText>
                of ${totalMonthlyBudget.toFixed(2)} ({((totalMonthlySpend / totalMonthlyBudget) * 100).toFixed(1)}%)
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Services at Risk</StatLabel>
              <StatNumber>
                <HStack>
                  <FiAlertTriangle color={servicesAtRisk > 0 ? 'orange' : 'inherit'} />
                  <Text>{servicesAtRisk}</Text>
                </HStack>
              </StatNumber>
              <StatHelpText>≥80% of budget</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Total Services</StatLabel>
              <StatNumber>{budgets.length}</StatNumber>
              <StatHelpText>
                {suspendedCount > 0 && (
                  <Badge colorScheme="red">{suspendedCount} suspended</Badge>
                )}
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </Grid>

      {/* Filter */}
      <HStack>
        <Text fontSize="sm" fontWeight="medium">
          Filter:
        </Text>
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          size="sm"
          width="200px"
        >
          <option value="all">All Services ({budgets.length})</option>
          <option value="healthy">
            Healthy (&lt;50%) ({budgets.filter(b => {
              const max = Math.max(parseFloat(b.dailyPercent), parseFloat(b.monthlyPercent));
              return max < 50 && !b.suspended;
            }).length})
          </option>
          <option value="warning">
            Warning (50-80%) ({budgets.filter(b => {
              const max = Math.max(parseFloat(b.dailyPercent), parseFloat(b.monthlyPercent));
              return max >= 50 && max < 80;
            }).length})
          </option>
          <option value="critical">
            Critical (≥80%) ({budgets.filter(b => {
              const max = Math.max(parseFloat(b.dailyPercent), parseFloat(b.monthlyPercent));
              return max >= 80 && max < 100 && !b.suspended;
            }).length})
          </option>
          <option value="suspended">Suspended ({suspendedCount})</option>
        </Select>
      </HStack>

      {/* Service Budget Cards */}
      {filteredBudgets.length === 0 ? (
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <VStack py={8}>
              <Text color={useSemanticToken('text.secondary')}>No services match the current filter</Text>
            </VStack>
          </CardBody>
        </Card>
      ) : (
        <Grid templateColumns="repeat(auto-fill, minmax(350px, 1fr))" gap={4}>
          {filteredBudgets.map((budget) => (
            <BudgetServiceCard
              key={budget.serviceId}
              status={budget}
              onUpdate={fetchBudgets}
            />
          ))}
        </Grid>
      )}
    </VStack>
  );
}
