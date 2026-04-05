/**
 * Goose Recipe Execution Monitoring Page
 * Monitor and manage headless Goose recipe executions
 */

import React from 'react';
import { Box, Container } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { RecipeExecutionMonitor } from '../components/goose/RecipeExecutionMonitor';

export default function GooseRecipesPage() {
  return (
    <Box minH="100vh" bg={useSemanticToken('surface.base')} py={8}>
      <Container maxW="container.xl">
        <RecipeExecutionMonitor />
      </Container>
    </Box>
  );
}
