/**
 * Performance Analytics Page
 * Comprehensive view of all performance metrics
 */

import React from 'react';
import { Box, Container } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { PerformanceAnalyticsDashboard } from '../components/analytics/PerformanceAnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <Box minH="100vh" bg={useSemanticToken('surface.base')} py={8}>
      <Container maxW="container.xl">
        <PerformanceAnalyticsDashboard />
      </Container>
    </Box>
  );
}
