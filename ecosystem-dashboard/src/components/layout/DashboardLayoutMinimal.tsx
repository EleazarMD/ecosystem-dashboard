import React from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayoutMinimal({ children }: DashboardLayoutProps) {
  return (
    <Box minH="100vh" bg={useSemanticToken('surface.base')}>
      {/* Simple Header */}
      <Box
        position="fixed"
        w="full"
        h="60px"
        bg={useSemanticToken('surface.elevated')}
        borderBottom="1px solid"
        borderColor={useSemanticToken('border.default')}
        zIndex="sticky"
      >
        <Flex h="full" alignItems="center" px={4}>
          <Text fontSize="lg" fontWeight="bold">
            AI Homelab Dashboard (Minimal)
          </Text>
        </Flex>
      </Box>

      {/* Main Content */}
      <Box pt="60px" px={4}>
        {children}
      </Box>
    </Box>
  );
}
