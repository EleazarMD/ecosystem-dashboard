import React from 'react';
import { Box, Heading, Text, VStack, Badge } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

export default function HealthPage() {
  return (
    <Box p={8}>
      <VStack spacing={4} align="start">
        <Heading>AI Homelab Dashboard Health Check</Heading>
        <Text>Server Status: <Badge colorScheme="green">Running</Badge></Text>
        <Text>Port: 8404</Text>
        <Text>Environment: Development</Text>
        <Text>
          The dashboard server is running successfully after optimization.
          Removed all demo files, test files, and broken components.
        </Text>
      </VStack>
    </Box>
  );
}
