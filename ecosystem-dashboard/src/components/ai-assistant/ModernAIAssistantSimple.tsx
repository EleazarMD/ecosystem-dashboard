import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface ModernAIAssistantSimpleProps {
  isOpen: boolean;
  onClose: () => void;
  width?: number;
  dashboardContext?: any;
}

const ModernAIAssistantSimple: React.FC<ModernAIAssistantSimpleProps> = ({
  isOpen,
  onClose,
  width = 400,
  dashboardContext
}) => {
  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      right={4}
      top={20}
      width={`${width}px`}
      height="600px"
      bg={useSemanticToken('surface.elevated')}
      boxShadow="xl"
      borderRadius="lg"
      p={4}
      zIndex={1000}
    >
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        AI Assistant
      </Text>
      <Text color={useSemanticToken('text.secondary')}>
        AI Assistant is loading... Please wait while we initialize the complete system.
      </Text>
      <Box mt={4}>
        <button onClick={onClose} style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: '4px' }}>
          Close
        </button>
      </Box>
    </Box>
  );
};

export default ModernAIAssistantSimple;
