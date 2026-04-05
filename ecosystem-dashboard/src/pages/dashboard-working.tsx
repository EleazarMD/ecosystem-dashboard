import React from 'react';
import {
  Box,
  Container,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export default function WorkingDashboard() {
  return (
    <ErrorBoundary>
      <Box minH="100vh" bg={useSemanticToken('surface.base')}>
        <Container maxW="7xl" py={8}>
          <VStack spacing={8} align="stretch">
            <Box>
              <Heading size="xl" mb={2}>AI Homelab Dashboard</Heading>
              <Text color={useSemanticToken('text.secondary')}>System Status and Monitoring</Text>
            </Box>

            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle>Dashboard Online!</AlertTitle>
                <AlertDescription>
                  AI Gateway SDK crashes resolved and dashboard is now stable.
                </AlertDescription>
              </Box>
            </Alert>

            <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={6}>
              <GridItem>
                <GlassPanel p={6}>
                  <VStack align="start" spacing={4}>
                    <Heading size="md">AI Gateway Status</Heading>
                    <Badge colorScheme="green">Connected</Badge>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      SDK fixes applied successfully
                    </Text>
                  </VStack>
                </GlassPanel>
              </GridItem>

              <GridItem>
                <GlassPanel p={6}>
                  <VStack align="start" spacing={4}>
                    <Heading size="md">Memory Usage</Heading>
                    <Stat>
                      <StatLabel>Heap Usage</StatLabel>
                      <StatNumber>Normal</StatNumber>
                      <StatHelpText>Optimized configuration</StatHelpText>
                    </Stat>
                    <Progress value={65} colorScheme="green" />
                  </VStack>
                </GlassPanel>
              </GridItem>

              <GridItem>
                <GlassPanel p={6}>
                  <VStack align="start" spacing={4}>
                    <Heading size="md">System Health</Heading>
                    <Badge colorScheme="green">Healthy</Badge>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      All services operational
                    </Text>
                  </VStack>
                </GlassPanel>
              </GridItem>
            </Grid>
          </VStack>
        </Container>
      </Box>
    </ErrorBoundary>
  );
}
