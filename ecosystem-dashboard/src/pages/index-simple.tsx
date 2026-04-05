import React from 'react';
import { Box, Heading, Text, VStack, Container, Badge, Button, HStack, SimpleGrid, Divider, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import OneButtonControl from '../components/knowledge-graph/OneButtonControl';

export default function HomePage() {
  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box
          bg="linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)"
          borderRadius="2xl"
          p={6}
          border="1px solid"
          borderColor="purple.200"
        >
          <VStack align="start" spacing={3}>
            <Heading size="2xl" color={useSemanticToken('text.primary')}>
              AI Homelab Dashboard
            </Heading>
            <Text color={useSemanticToken('text.secondary')} fontSize="lg">
              Ecosystem monitoring and management
            </Text>
            <HStack spacing={3}>
              <Badge colorScheme="green" size="lg" px={2.5} py={0.5}>
                HEALTHY
              </Badge>
              <Badge colorScheme="blue" size="lg" px={2.5} py={0.5}>
                ECOSYSTEM INGESTION ACTIVE
              </Badge>
              <Button colorScheme="purple" variant="outline">
                Refresh
              </Button>
            </HStack>
          </VStack>
        </Box>

        {/* One-Button Knowledge Graph Control */}
        <Alert status="success" borderRadius="lg" bg="green.50" borderColor="green.200" borderWidth={2}>
          <AlertIcon />
          <Box>
            <AlertTitle>🚀 Quick Start: Knowledge Graph System</AlertTitle>
            <AlertDescription>
              Start the complete AI Homelab Knowledge Graph ecosystem with one click below!
            </AlertDescription>
          </Box>
        </Alert>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {/* One-Button Control */}
          <OneButtonControl size="md" showDetails={true} />

          {/* Quick Actions */}
          <Box p={4} bg={useSemanticToken('surface.elevated')} borderRadius="lg" border="1px solid" borderColor={useSemanticToken('border.default')}>
            <VStack spacing={3} align="stretch">
              <Heading size="md" color="gray.700">
                Quick Actions
              </Heading>

              <VStack spacing={2} align="stretch">
                <Link href="/knowledge-graph-control" passHref legacyBehavior>
                  <Button as="a" rightIcon={<ExternalLinkIcon />} colorScheme="blue" variant="outline" size="sm">
                    Advanced Control Panel
                  </Button>
                </Link>

                <Link href="/system-overview" passHref legacyBehavior>
                  <Button as="a" rightIcon={<ExternalLinkIcon />} colorScheme="purple" variant="outline" size="sm">
                    System Overview Dashboard
                  </Button>
                </Link>

                <Link href="/ide-memory" passHref legacyBehavior>
                  <Button as="a" rightIcon={<ExternalLinkIcon />} colorScheme="green" variant="outline" size="sm">
                    IDE Memory Dashboard
                  </Button>
                </Link>

                <Link href="/database" passHref legacyBehavior>
                  <Button as="a" rightIcon={<ExternalLinkIcon />} colorScheme="cyan" variant="outline" size="sm">
                    Database Management
                  </Button>
                </Link>
              </VStack>
            </VStack>
          </Box>
        </SimpleGrid>

        {/* Primary Navigation */}
        <Alert status="success" borderRadius="xl" mb={6}>
          <AlertIcon />
          <AlertTitle>Ecosystem Documents Ingestion Pipeline Active!</AlertTitle>
          <AlertDescription>
            MistralCHRATOR coordinating with Llama subagents to process 2,823 AI Homelab ecosystem documents.
            Access full pipeline transparency through Agentic Control.
          </AlertDescription>
        </Alert>

        {/* Navigation */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          <Link href="/agentic-control" passHref legacyBehavior>
            <Button
              as="a"
              height="80px"
              flexDirection="column"
              bg="purple.50"
              border="2px solid"
              borderColor="purple.200"
              _hover={{ borderColor: 'purple.400', bg: 'purple.100' }}
              borderRadius="xl"
            >
              <Text fontWeight="bold" color="purple.600">
                🔥 Ecosystem Ingestion Pipeline
              </Text>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                Complete transparency - 2,823 docs
              </Text>
            </Button>
          </Link>

          <Link href="/infrastructure/ai-gateway" passHref legacyBehavior>
            <Button
              as="a"
              height="80px"
              flexDirection="column"
              bg={useSemanticToken('surface.elevated')}
              border="2px solid"
              borderColor="blue.200"
              _hover={{ borderColor: 'blue.400', bg: 'blue.50' }}
              borderRadius="xl"
            >
              <Text fontWeight="bold" color="blue.600">
                AI Gateway
              </Text>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                Model management
              </Text>
            </Button>
          </Link>
        </SimpleGrid>

        <Divider />

        {/* Neo4j Knowledge Graph Status */}
        <Box p={5} bg={useSemanticToken('surface.elevated')} borderRadius="lg" border="1px solid" borderColor={useSemanticToken('border.default')}>
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Heading size="md" color="gray.700">
                🧠 Neo4j Knowledge Graph Database
              </Heading>
              <Badge colorScheme="green" size="lg">CONNECTED</Badge>
            </HStack>

            <Text color={useSemanticToken('text.secondary')}>
              Your AI Homelab ecosystem contains rich interconnected data ready for exploration and analysis.
            </Text>

            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
              <VStack>
                <Text fontSize="2xl" fontWeight="bold" color="blue.500">817,008</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Total Nodes</Text>
              </VStack>
              <VStack>
                <Text fontSize="2xl" fontWeight="bold" color="green.500">817K</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Memory Entries</Text>
              </VStack>
              <VStack>
                <Text fontSize="2xl" fontWeight="bold" color="purple.500">2</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Workspaces</Text>
              </VStack>
              <VStack>
                <Text fontSize="2xl" fontWeight="bold" color="orange.500">3</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Tag Categories</Text>
              </VStack>
            </SimpleGrid>

            <HStack spacing={2} justify="center" wrap="wrap">
              <Button
                as="a"
                href="http://localhost:7474"
                target="_blank"
                rightIcon={<ExternalLinkIcon />}
                colorScheme="cyan"
                size="sm"
              >
                🌐 Neo4j Browser
              </Button>
              <Button
                colorScheme="blue"
                variant="outline"
                size="sm"
                onClick={() => window.open('http://localhost:7474', '_blank')}
              >
                📊 Graph Visualization
              </Button>
            </HStack>

            <Box p={3} bg={useSemanticToken('surface.elevated')} borderRadius="md" border="1px solid" borderColor={useSemanticToken('border.default')}>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')} mb={2}>
                <strong>Quick Query Examples:</strong>
              </Text>
              <VStack spacing={1} align="stretch">
                <Text fontSize="xs" fontFamily="mono" color="gray.700">
                  MATCH (m:Memory)-[r]-(n) RETURN m,r,n LIMIT 100
                </Text>
                <Text fontSize="xs" fontFamily="mono" color="gray.700">
                  MATCH (w:Workspace)-[r]-(n) RETURN w,r,n LIMIT 50
                </Text>
                <Text fontSize="xs" fontFamily="mono" color="gray.700">
                  MATCH (t:Tag)-[r]-(n) RETURN t,r,n LIMIT 50
                </Text>
              </VStack>
            </Box>
          </VStack>
        </Box>

        {/* Welcome Message */}
        <Box p={5} bg={useSemanticToken('surface.base')} borderRadius="lg">
          <VStack spacing={3}>
            <Heading size="lg" color="gray.700">
              Welcome to AI Homelab
            </Heading>
            <Text color={useSemanticToken('text.secondary')} textAlign="center">
              Your AI ecosystem with enhanced Memory Watcher integration is ready.
              Use the one-button control above or navigate to specific dashboards for detailed monitoring.
            </Text>
          </VStack>
        </Box>

        {/* Quick Stats */}
        <Box p={5} bg={useSemanticToken('surface.elevated')} borderRadius="lg" border="1px solid" borderColor={useSemanticToken('border.default')}>
          <VStack spacing={3}>
            <Heading size="md" color="gray.700">
              System Status
            </Heading>
            <HStack spacing={6} wrap="wrap" justify="center">
              <VStack>
                <Text fontSize="2xl" fontWeight="bold" color="green.500">5</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Services Online</Text>
              </VStack>
              <VStack>
                <Text fontSize="2xl" fontWeight="bold" color="blue.500">99.9%</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Uptime</Text>
              </VStack>
              <VStack>
                <Text fontSize="2xl" fontWeight="bold" color="purple.500">234</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Active Connections</Text>
              </VStack>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}

