/**
 * Research Costs Panel — displays cumulative spend tracking, model breakdown, and budget alerts.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Divider,
  Progress,
  Switch,
  Input,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { FiDollarSign, FiTrendingUp, FiAlertTriangle, FiTrash2 } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  getCostSummary,
  getCostEntries,
  clearCostHistory,
  getBudgetConfig,
  setBudgetConfig,
  checkBudgetAlerts,
  getDailyBreakdown,
  type CostSummary,
  type BudgetConfig,
} from '@/lib/research/cost-tracker';

export default function ResearchCostsPanel() {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const surfaceBase = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');

  const [summary, setSummary] = useState<CostSummary>(() => getCostSummary());
  const [budget, setBudget] = useState<BudgetConfig>(() => getBudgetConfig());
  const [alerts] = useState(() => checkBudgetAlerts());
  const dailyData = getDailyBreakdown(14);

  const refresh = useCallback(() => setSummary(getCostSummary()), []);

  const updateBudget = useCallback((updates: Partial<BudgetConfig>) => {
    const newBudget = { ...budget, ...updates };
    setBudget(newBudget);
    setBudgetConfig(newBudget);
  }, [budget]);

  const maxDailySpend = Math.max(...dailyData.map(d => d.spend), 0.01);

  return (
    <VStack spacing={3} align="stretch" p={3} h="full" overflowY="auto">
      {/* Header */}
      <HStack justify="space-between">
        <HStack spacing={2}>
          <FiDollarSign />
          <Text fontSize="sm" fontWeight="700" color={textColor}>
            Research Costs
          </Text>
        </HStack>
        {summary.totalSessions > 0 && (
          <Button
            size="xs"
            variant="ghost"
            colorScheme="red"
            leftIcon={<FiTrash2 size={12} />}
            onClick={() => {
              if (confirm('Clear all cost history?')) {
                clearCostHistory();
                refresh();
              }
            }}
          >
            Clear
          </Button>
        )}
      </HStack>

      {/* Budget Alerts */}
      {alerts.alerts.length > 0 && (
        <Box p={2.5} bg="red.900" borderRadius="md" border="1px solid" borderColor="red.600">
          <HStack spacing={1.5} mb={1}>
            <FiAlertTriangle color="orange" size={14} />
            <Text fontSize="xs" fontWeight="600" color="red.200">Budget Alert</Text>
          </HStack>
          {alerts.alerts.map((a, i) => (
            <Text key={i} fontSize="2xs" color="red.300">{a}</Text>
          ))}
        </Box>
      )}

      {/* Spend Overview */}
      <Box p={3} bg={surfaceBase} borderRadius="md" border="1px solid" borderColor={borderColor}>
        <Text fontSize="xs" fontWeight="600" color={textColor} mb={2}>Spend Overview</Text>
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="xs" color={mutedColor}>Today</Text>
            <Text fontSize="xs" fontWeight="600" color={textColor}>${summary.todaySpend.toFixed(4)}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs" color={mutedColor}>This Week</Text>
            <Text fontSize="xs" fontWeight="600" color={textColor}>${summary.weekSpend.toFixed(4)}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs" color={mutedColor}>This Month</Text>
            <Text fontSize="xs" fontWeight="600" color={textColor}>${summary.monthSpend.toFixed(4)}</Text>
          </HStack>
          <Divider />
          <HStack justify="space-between">
            <Text fontSize="xs" fontWeight="600" color={textColor}>Total</Text>
            <Text fontSize="sm" fontWeight="700" color="green.400">${summary.totalSpend.toFixed(4)}</Text>
          </HStack>
          <HStack justify="space-between" fontSize="2xs" color={mutedColor}>
            <Text>{summary.totalSessions} sessions</Text>
            <Text>Avg: ${summary.averageCostPerSession.toFixed(4)}/session</Text>
          </HStack>
        </VStack>
      </Box>

      {/* Model Breakdown */}
      {Object.keys(summary.byModel).length > 0 && (
        <Box p={3} bg={surfaceBase} borderRadius="md" border="1px solid" borderColor={borderColor}>
          <Text fontSize="xs" fontWeight="600" color={textColor} mb={2}>By Model</Text>
          <VStack spacing={1.5} align="stretch">
            {Object.entries(summary.byModel)
              .sort(([, a], [, b]) => b.spend - a.spend)
              .map(([model, data]) => (
                <HStack key={model} justify="space-between">
                  <HStack spacing={1.5}>
                    <Badge colorScheme="gray" fontSize="2xs" variant="subtle">{model}</Badge>
                    <Text fontSize="2xs" color={mutedColor}>{data.sessions}x</Text>
                  </HStack>
                  <Text fontSize="xs" fontWeight="500" color={textColor}>${data.spend.toFixed(4)}</Text>
                </HStack>
              ))}
          </VStack>
        </Box>
      )}

      {/* 14-Day Spend Chart (simple bar chart) */}
      {dailyData.some(d => d.spend > 0) && (
        <Box p={3} bg={surfaceBase} borderRadius="md" border="1px solid" borderColor={borderColor}>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="xs" fontWeight="600" color={textColor}>14-Day Trend</Text>
            <FiTrendingUp size={14} color={mutedColor} />
          </HStack>
          <HStack spacing={0.5} align="end" h="60px">
            {dailyData.map((day, i) => (
              <Box
                key={i}
                flex={1}
                bg={day.spend > 0 ? 'purple.500' : 'whiteAlpha.100'}
                borderRadius="sm"
                h={`${Math.max((day.spend / maxDailySpend) * 100, day.spend > 0 ? 8 : 2)}%`}
                title={`${day.date}: $${day.spend.toFixed(4)} (${day.sessions} sessions)`}
                transition="height 0.2s"
                _hover={{ bg: day.spend > 0 ? 'purple.400' : 'whiteAlpha.200' }}
              />
            ))}
          </HStack>
          <HStack justify="space-between" mt={1}>
            <Text fontSize="2xs" color={mutedColor}>{dailyData[0]?.date}</Text>
            <Text fontSize="2xs" color={mutedColor}>{dailyData[dailyData.length - 1]?.date}</Text>
          </HStack>
        </Box>
      )}

      <Divider />

      {/* Budget Settings */}
      <Box p={3} bg={surfaceBase} borderRadius="md" border="1px solid" borderColor={borderColor}>
        <HStack justify="space-between" mb={2}>
          <Text fontSize="xs" fontWeight="600" color={textColor}>Budget Alerts</Text>
          <Switch
            size="sm"
            colorScheme="orange"
            isChecked={budget.enabled}
            onChange={(e) => updateBudget({ enabled: e.target.checked })}
          />
        </HStack>
        {budget.enabled && (
          <VStack spacing={2} align="stretch">
            <FormControl size="sm">
              <FormLabel fontSize="2xs" color={mutedColor} mb={0.5}>Daily Limit ($)</FormLabel>
              <Input
                size="xs"
                type="number"
                value={budget.dailyLimit}
                onChange={(e) => updateBudget({ dailyLimit: parseFloat(e.target.value) || 0 })}
                bg="transparent"
                borderColor={borderColor}
              />
            </FormControl>
            <FormControl size="sm">
              <FormLabel fontSize="2xs" color={mutedColor} mb={0.5}>Weekly Limit ($)</FormLabel>
              <Input
                size="xs"
                type="number"
                value={budget.weeklyLimit}
                onChange={(e) => updateBudget({ weeklyLimit: parseFloat(e.target.value) || 0 })}
                bg="transparent"
                borderColor={borderColor}
              />
            </FormControl>
            <FormControl size="sm">
              <FormLabel fontSize="2xs" color={mutedColor} mb={0.5}>Monthly Limit ($)</FormLabel>
              <Input
                size="xs"
                type="number"
                value={budget.monthlyLimit}
                onChange={(e) => updateBudget({ monthlyLimit: parseFloat(e.target.value) || 0 })}
                bg="transparent"
                borderColor={borderColor}
              />
            </FormControl>
          </VStack>
        )}
      </Box>

      {/* Empty state */}
      {summary.totalSessions === 0 && (
        <VStack spacing={2} py={4}>
          <FiDollarSign size={24} color={mutedColor} />
          <Text fontSize="xs" color={mutedColor} textAlign="center">
            No cost data yet. Research costs will be tracked automatically.
          </Text>
        </VStack>
      )}
    </VStack>
  );
}
