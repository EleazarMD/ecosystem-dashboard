/**
 * Panel Renderer
 * Simple component that renders the resolved panel with error boundaries
 */

import React from 'react';
import { Box, Text, VStack, Icon, Spinner } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { FiAlertCircle } from 'react-icons/fi';
import { ResolvedPanel } from '../types';
import ErrorBoundary from '@/components/common/ErrorBoundary';

interface PanelRendererProps {
  resolved: ResolvedPanel;
}

export const PanelRenderer: React.FC<PanelRendererProps> = ({ resolved }) => {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const bgError = 'red.50';

  // Debug logging removed to prevent console spam

  // Handle resolution error
  if (resolved.error) {
    return (
      <Box h="full" p={6} display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Icon as={FiAlertCircle} boxSize={12} color="red.500" />
          <Text fontSize="lg" fontWeight="600" color={textColor}>
            Panel Error
          </Text>
          <Text fontSize="sm" color={mutedColor} textAlign="center" maxW="300px">
            {resolved.error}
          </Text>
        </VStack>
      </Box>
    );
  }

  const { metadata, props } = resolved;
  const PanelComponent = metadata.component;


  return (
    <ErrorBoundary
      componentName={metadata.displayName}
      fallback={
        <Box h="full" p={6} bg={bgError} borderRadius="md" m={4}>
          <VStack align="stretch" spacing={3}>
            <VStack align="start" spacing={1}>
              <Text fontSize="lg" fontWeight="600" color="red.600">
                {metadata.displayName} Error
              </Text>
              <Text fontSize="sm" color={mutedColor}>
                The panel encountered an error while rendering
              </Text>
            </VStack>
          </VStack>
        </Box>
      }
    >
      <React.Suspense
        fallback={
          <Box h="full" display="flex" alignItems="center" justifyContent="center">
            <VStack spacing={3}>
              <Spinner size="lg" color="blue.500" />
              <Text fontSize="sm" color={mutedColor}>
                Loading {metadata.displayName}...
              </Text>
            </VStack>
          </Box>
        }
      >
        <Box h="full" overflow="auto" position="relative">
          {/* Use key prop to force re-mount when data changes (e.g., email selection) */}
          <PanelComponent key={props.key} {...props} />
        </Box>
      </React.Suspense>
    </ErrorBoundary>
  );
};
