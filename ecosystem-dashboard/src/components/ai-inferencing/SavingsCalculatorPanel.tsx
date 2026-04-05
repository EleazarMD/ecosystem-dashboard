/**
 * Savings Calculator Panel
 * Right panel calculator for Cost Optimization page
 */

import React from 'react';
import {
  VStack,
  Box,
  Text,
  HStack,
  Badge,
  Button,
  Icon,
} from '@chakra-ui/react';
import { FiCheck, FiCheckCircle } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Opportunity {
  action: string;
  savings: number;
  priority: 'high' | 'medium' | 'low';
}

interface Props {
  potentialSavings: {
    daily: number;
    monthly: number;
  };
  opportunities: Opportunity[];
  onApplyRecommendation: (action: string) => void;
  onApplyAll: () => void;
}

export function SavingsCalculatorPanel({
  potentialSavings,
  opportunities,
  onApplyRecommendation,
  onApplyAll,
}: Props) {
  const mutedText = useSemanticToken('text.secondary');
  const bgColor = useSemanticToken('surface.highlight');
  const borderColor = useSemanticToken('border.default');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <VStack spacing={4} align="stretch" p={4}>
      {/* Potential Savings */}
      <Box bg={bgColor} p={4} borderRadius="md">
        <Text fontSize="xs" fontWeight="600" mb={1} textTransform="uppercase">
          Potential Savings
        </Text>
        <HStack spacing={4} mt={2}>
          <VStack align="start" spacing={0}>
            <Text fontSize="2xl" fontWeight="700" lineHeight="1">
              ${potentialSavings.daily.toFixed(2)}
            </Text>
            <Text fontSize="xs" color={mutedText}>
              per day
            </Text>
          </VStack>
          <VStack align="start" spacing={0}>
            <Text fontSize="2xl" fontWeight="700" lineHeight="1">
              ${potentialSavings.monthly.toFixed(2)}
            </Text>
            <Text fontSize="xs" color={mutedText}>
              per month
            </Text>
          </VStack>
        </HStack>
      </Box>

      {/* Top Opportunities */}
      <Box>
        <Text fontSize="sm" fontWeight="600" mb={3}>
          💡 Top Opportunities
        </Text>
        <VStack spacing={2} align="stretch">
          {opportunities.map((opportunity, index) => (
            <Box
              key={index}
              p={3}
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="md"
              cursor="pointer"
              _hover={{ bg: useSemanticToken('surface.base') }}
              onClick={() => onApplyRecommendation(opportunity.action)}
            >
              <HStack justify="space-between" mb={1}>
                <Badge
                  colorScheme={getPriorityColor(opportunity.priority)}
                  fontSize="xs"
                  textTransform="uppercase"
                >
                  {opportunity.priority}
                </Badge>
                <Text fontSize="sm" fontWeight="600" color="green.500">
                  ${opportunity.savings.toFixed(2)}
                </Text>
              </HStack>
              <Text fontSize="xs" color={mutedText}>
                {opportunity.action}
              </Text>
            </Box>
          ))}
        </VStack>
      </Box>

      {/* Apply All Button */}
      <Box pt={2} borderTopWidth="1px" borderColor={borderColor}>
        <Button
          size="sm"
          width="full"
          leftIcon={<Icon as={FiCheckCircle} />}
          colorScheme="green"
          onClick={onApplyAll}
        >
          Apply All Recommendations
        </Button>
        <Text fontSize="xs" color={mutedText} mt={2} textAlign="center">
          Automatically optimize costs
        </Text>
      </Box>

      {/* Quick Stats */}
      <Box pt={2} borderTopWidth="1px" borderColor={borderColor}>
        <HStack justify="space-between" fontSize="xs">
          <Text color={mutedText}>Total opportunities:</Text>
          <Text fontWeight="600">{opportunities.length}</Text>
        </HStack>
        <HStack justify="space-between" fontSize="xs" mt={1}>
          <Text color={mutedText}>Potential reduction:</Text>
          <Text fontWeight="600" color="green.500">
            {((potentialSavings.daily / 10) * 100).toFixed(0)}%
          </Text>
        </HStack>
      </Box>
    </VStack>
  );
}
