import React from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  Icon,
  HStack,
  Divider,
  Spinner,
  Alert,
  AlertIcon,
  IconButton,
} from '@chakra-ui/react';
import { FiMessageSquare, FiRefreshCw } from 'react-icons/fi';
import { useExplainability } from '@/context/ExplainabilityContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const ExplainabilityPanel = () => {
  const { explanation, loading, error, refreshExplanation } = useExplainability();
  const bgColor = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.secondary');

  return (
    <Box p={6} bg={bgColor} borderRadius="lg" h="100%">
      <VStack align="stretch" spacing={6}>
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiMessageSquare} w={6} h={6} color="blue.500" />
            <Heading size="md">Agent Insights</Heading>
          </HStack>
          <IconButton
            aria-label="Refresh explanation"
            icon={<FiRefreshCw />}
            onClick={refreshExplanation}
            isLoading={loading}
            size="sm"
            variant="ghost"
          />
        </HStack>
        <Divider />

        {loading && !explanation && (
          <VStack justify="center" h="100%">
            <Spinner />
            <Text>Generating insights...</Text>
          </VStack>
        )}

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {explanation && (
          <>
            <VStack align="stretch" spacing={4}>
              <Heading size="sm">Why this layout?</Heading>
              <Text fontSize="sm" color={textColor}>
                {explanation.layout}
              </Text>
            </VStack>
            <Divider />
            <VStack align="stretch" spacing={4}>
              <Heading size="sm">What am I seeing?</Heading>
              <Text fontSize="sm" color={textColor}>
                {explanation.widgets}
              </Text>
            </VStack>
            <Divider />
            <VStack align="stretch" spacing={4}>
              <Heading size="sm">Agent Reasoning</Heading>
              <Text fontStyle="italic" fontSize="sm" color={textColor}>
                {explanation.reasoning}
              </Text>
            </VStack>
          </>
        )}
      </VStack>
    </Box>
  );
};

export default ExplainabilityPanel;
