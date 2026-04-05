/**
 * ULTRA-MINIMAL TEST - No hooks, no context, just a box
 */

import React from 'react';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

console.log('📦 [DynamicRightPanel.TEST] Module loaded successfully');

interface DynamicRightPanelProps {
  systemData?: any;
  onClose: () => void;
}

export default function DynamicRightPanelTest({ onClose }: DynamicRightPanelProps) {
  console.log('🎨 [DynamicRightPanel.TEST] Component rendering');
  
  return (
    <Box
      position="fixed"
      right="0"
      top="70px"
      h="calc(100vh - 70px)"
      w="400px"
      bg={useSemanticToken('surface.elevated')}
      boxShadow="lg"
      zIndex={1000}
      p={4}
    >
      <h1>✅ PANEL WORKS!</h1>
      <p>If you see this, the dynamic import is working.</p>
      <button onClick={onClose}>Close</button>
    </Box>
  );
}
