import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  Select,
  Button,
  Divider,
  Badge,
  Icon,
  FormControl,
  FormLabel,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Input,
  InputGroup,
  InputLeftElement,
  
} from '@chakra-ui/react';
import { FiDollarSign, FiSave, FiAlertTriangle, FiTarget } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface CostOptimizationControlsProps {
  recommendations?: any[];
  currentCost?: number;
  monthlyBudget?: number;
  onApplyOptimizations?: () => void;
}

export default function CostOptimizationControls({
  recommendations = [],
  currentCost = 0,
  monthlyBudget: externalMonthlyBudget = 1000,
  onApplyOptimizations,
}: CostOptimizationControlsProps) {
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [autoOptimize, setAutoOptimize] = useState(false);
  const [savingsGoal, setSavingsGoal] = useState(20);
  
  // Calculate projected and potential savings from recommendations
  const daysInMonth = 30;
  const dailyCost = currentCost;
  const projectedMonthlyCost = dailyCost * daysInMonth;
  const potentialSavings = recommendations.reduce((sum, rec) => sum + (rec.estimatedSavings || 0), 0);

  return (
    <VStack spacing={4} align="stretch" p={4}>
      {/* Header */}
      <Box>
        <HStack spacing={2} mb={2}>
          <Icon as={FiDollarSign} color="orange.500" />
          <Text fontSize="md" fontWeight="bold">Cost Settings</Text>
        </HStack>
        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
          Manage cost optimization preferences
        </Text>
      </Box>

      <Divider />

      {/* Budget Settings */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={3} color={useSemanticToken('text.secondary')}>
          BUDGET MANAGEMENT
        </Text>
        
        <VStack spacing={3} align="stretch">
          <FormControl>
            <FormLabel fontSize="sm">Monthly Budget ($)</FormLabel>
            <InputGroup size="sm">
              <InputLeftElement pointerEvents="none">
                <FiDollarSign color="gray" />
              </InputLeftElement>
              <Input 
                type="number" 
                value={externalMonthlyBudget}
                readOnly
                pl={8}
                bg={useSemanticToken('surface.hover')}
              />
            </InputGroup>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Alert Threshold: {alertThreshold}%</FormLabel>
            <Slider 
              value={alertThreshold}
              onChange={setAlertThreshold}
              min={50}
              max={100}
              colorScheme="orange"
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
              Alert when spending reaches {alertThreshold}% of budget
            </Text>
          </FormControl>
        </VStack>
      </Box>

      <Divider />

      {/* Optimization Settings */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={3} color={useSemanticToken('text.secondary')}>
          OPTIMIZATION
        </Text>
        
        <VStack spacing={3} align="stretch">
          <HStack justify="space-between">
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" fontWeight="medium">Auto-Optimize</Text>
              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Enable automatic cost optimization</Text>
            </VStack>
            <Switch 
              colorScheme="orange"
              isChecked={autoOptimize}
              onChange={(e) => setAutoOptimize(e.target.checked)}
            />
          </HStack>

          <FormControl>
            <FormLabel fontSize="sm">Savings Goal: {savingsGoal}%</FormLabel>
            <Slider 
              value={savingsGoal}
              onChange={setSavingsGoal}
              min={5}
              max={50}
              step={5}
              colorScheme="orange"
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Optimization Strategy</FormLabel>
            <Select size="sm">
              <option value="balanced">Balanced (Cost + Performance)</option>
              <option value="aggressive">Aggressive (Max Savings)</option>
              <option value="quality">Quality First (Min Cost Impact)</option>
            </Select>
          </FormControl>
        </VStack>
      </Box>

      <Divider />

      {/* Current Status */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={3} color={useSemanticToken('text.secondary')}>
          CURRENT MONTH
        </Text>
        
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between" p={2} bg={useSemanticToken('status.successSubtle')} borderRadius="md">
            <Text fontSize="sm">Spent Today</Text>
            <Badge colorScheme="green">
              ${currentCost.toFixed(2)}
            </Badge>
          </HStack>
          
          <HStack justify="space-between" p={2} bg={useSemanticToken('interactive.surface')} borderRadius="md">
            <Text fontSize="sm">Projected Monthly</Text>
            <Badge colorScheme={projectedMonthlyCost > externalMonthlyBudget ? 'red' : 'blue'}>
              ${projectedMonthlyCost.toFixed(2)}
            </Badge>
          </HStack>

          <HStack justify="space-between" p={2} bg={useSemanticToken('status.warningSubtle')} borderRadius="md">
            <Text fontSize="sm">Potential Savings</Text>
            <Badge colorScheme="orange">${potentialSavings.toFixed(2)}</Badge>
          </HStack>
        </VStack>
      </Box>

      <Divider />

      {/* Recommendations */}
      <Box>
        <HStack spacing={2} mb={2}>
          <Icon as={FiTarget} color="orange.500" />
          <Text fontSize="xs" fontWeight="bold" color={useSemanticToken('text.secondary')}>
            TOP RECOMMENDATIONS
          </Text>
        </HStack>
        
        <VStack spacing={2} align="stretch">
          {recommendations.length > 0 ? (
            recommendations.slice(0, 2).map((rec: any, index: number) => (
              <Box 
                key={index}
                p={2} 
                bg={useSemanticToken('status.warningSubtle')} 
                borderRadius="md" 
                borderLeft="3px solid" 
                borderColor={useSemanticToken('status.warning')}
              >
                <Text fontSize="xs" fontWeight="semibold">{rec.title || rec.recommendation}</Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  {rec.description || `Save $${rec.estimatedSavings?.toFixed(2) || '0'}/month`}
                </Text>
              </Box>
            ))
          ) : (
            <Text fontSize="sm" color={useSemanticToken('text.secondary')} textAlign="center" py={4}>
              No recommendations available
            </Text>
          )}
        </VStack>
      </Box>

      <Divider />

      {/* Actions */}
      <Box>
        <VStack spacing={2}>
          <Button 
            size="sm" 
            width="full" 
            leftIcon={<FiSave />}
            colorScheme="orange"
            onClick={onApplyOptimizations}
            isDisabled={!onApplyOptimizations || recommendations.length === 0}
          >
            Apply Optimizations ({recommendations.length})
          </Button>
          <Button 
            size="sm" 
            width="full" 
            leftIcon={<FiAlertTriangle />}
            variant="outline"
          >
            View All Alerts
          </Button>
        </VStack>
      </Box>
    </VStack>
  );
}
