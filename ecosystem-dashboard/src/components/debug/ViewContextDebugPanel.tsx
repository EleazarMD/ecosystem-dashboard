/**
 * ViewContext Debug Panel
 * Shows current view context state for testing and debugging
 * Only renders when DEBUG_PANEL_CONTEXT feature flag is enabled
 */

import React from 'react';
import { Box, VStack, HStack, Text, Badge, Code } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { useViewContext } from '@/contexts/ViewContextManager';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { isFeatureEnabled } from '@/lib/featureFlags';

export const ViewContextDebugPanel: React.FC = () => {
  const debugEnabled = isFeatureEnabled('DEBUG_PANEL_CONTEXT');
  const viewContextEnabled = isFeatureEnabled('USE_VIEW_CONTEXT_MANAGER');
  
  if (!debugEnabled) return null;

  const { viewContext, getRightPanelContext } = useViewContext();
  const { context: rightPanelContext, activeTab } = useRightPanel();

  const bgColor = useSemanticToken('surface.highlight');
  const borderColor = useSemanticToken('border.default');

  return (
    <Box
      position="fixed"
      bottom={4}
      left={4}
      p={3}
      bg={bgColor}
      borderWidth="2px"
      borderColor={borderColor}
      borderRadius="md"
      boxShadow="lg"
      maxW="300px"
      zIndex={9999}
      fontSize="xs"
    >
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="sm">ViewContext Debug</Text>
          <Badge colorScheme={viewContextEnabled ? 'green' : 'red'}>
            {viewContextEnabled ? 'ENABLED' : 'DISABLED'}
          </Badge>
        </HStack>

        {viewContextEnabled && (
          <>
            <Box>
              <Text fontWeight="semibold" mb={1}>Module:</Text>
              <Code colorScheme="blue">{viewContext.module}</Code>
            </Box>

            <Box>
              <Text fontWeight="semibold" mb={1}>View Type:</Text>
              <Code colorScheme="purple">{viewContext.viewType}</Code>
            </Box>

            {viewContext.detail && (
              <Box>
                <Text fontWeight="semibold" mb={1}>Detail:</Text>
                <Code colorScheme="green" display="block" whiteSpace="pre-wrap">
                  {JSON.stringify(viewContext.detail, null, 2)}
                </Code>
              </Box>
            )}

            <Box>
              <Text fontWeight="semibold" mb={1}>Mapped Panel Context:</Text>
              <Code colorScheme="orange">{getRightPanelContext()}</Code>
            </Box>

            <Box>
              <Text fontWeight="semibold" mb={1}>Actual Panel Context:</Text>
              <Code colorScheme="cyan">{rightPanelContext}</Code>
            </Box>

            <Box>
              <Text fontWeight="semibold" mb={1}>Active Tab:</Text>
              <Code colorScheme="pink">{activeTab}</Code>
            </Box>
          </>
        )}
      </VStack>
    </Box>
  );
};
