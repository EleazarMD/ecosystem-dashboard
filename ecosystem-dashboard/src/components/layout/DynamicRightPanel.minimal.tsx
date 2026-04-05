/**
 * Minimal Dynamic Right Panel - For Testing
 * This is a stripped-down version to verify the container works
 */

import React from 'react';
import { Box, Text, IconButton } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { FiX } from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';

console.log('📦 [DynamicRightPanel.MINIMAL] Module loaded');

interface DynamicRightPanelProps {
  systemData?: any;
  onClose: () => void;
}

export default function DynamicRightPanelMinimal({ onClose }: DynamicRightPanelProps) {
  console.log('🎨 [DynamicRightPanel.MINIMAL] Component rendering');
  
  const { context, activeTab, width } = useRightPanel();
  
  console.log('🎨 [DynamicRightPanel.MINIMAL] State:', { context, activeTab, width });
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');

  return (
    <Box
      position="fixed"
      right="0"
      top="70px"
      h="calc(100vh - 70px)"
      w={`${width}px`}
      bg={bgColor}
      borderLeft="1px solid"
      borderColor={borderColor}
      boxShadow="lg"
      zIndex={1000}
      display="flex"
      flexDirection="column"
    >
      {/* Header */}
      <Box
        p={4}
        borderBottom="1px solid"
        borderColor={borderColor}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        <Text fontWeight="bold" color={textColor}>
          Right Panel Test
        </Text>
        <IconButton
          aria-label="Close panel"
          icon={<FiX />}
          size="sm"
          variant="ghost"
          onClick={onClose}
        />
      </Box>

      {/* Content */}
      <Box flex="1" overflow="auto" p={4}>
        <Text color={textColor} mb={2}>
          ✅ Panel is rendering!
        </Text>
        <Text color={useSemanticToken('text.secondary')} fontSize="sm" mb={4}>
          Context: {context}
        </Text>
        <Text color={useSemanticToken('text.secondary')} fontSize="sm" mb={4}>
          Active Tab: {activeTab}
        </Text>
        <Text color={useSemanticToken('text.secondary')} fontSize="sm">
          Width: {width}px
        </Text>
      </Box>
    </Box>
  );
}
