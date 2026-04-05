import React from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  Badge,
  HStack,
  Icon,
  Link,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import Head from 'next/head';
import OneButtonControl from '@/components/knowledge-graph/OneButtonControl';
import KnowledgeGraphControl from '@/components/knowledge-graph/KnowledgeGraphControl';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const KnowledgeGraphControlPage: React.FC = () => {
  const serviceEndpoints = [
    {
      name: 'Knowledge Graph API',
      url: 'http://localhost:8765',
      description: 'Main API for graph queries and operations',
      type: 'Core Service'
    },
    {
      name: 'IDE Memory Backend',
      url: 'http://localhost:9579',
      description: 'Memory synchronization with Windsurf IDE',
      type: 'Core Service'
    },
    {
      name: 'AI Gateway',
      url: 'http://localhost:8777',
      description: 'LLM inference and model routing',
      type: 'Core Service'
    },
    {
      name: 'Neo4j Browser',
      url: 'http://localhost:7474',
      description: 'Graph database management interface',
      type: 'Database'
    },
    {
      name: 'Orchestrator Agent',
      url: 'http://localhost:41240',
      description: 'Multi-agent workflow coordination',
      type: 'Agent'
    },
    {
      name: 'Graph Query Agent',
      url: 'http://localhost:41241',
      description: 'Cypher queries and graph traversal',
      type: 'Agent'
    },
    {
      name: 'Vector Search Agent',
      url: 'http://localhost:41242',
      description: 'Semantic search and embeddings',
      type: 'Agent'
    },
    {
      name: 'Documentation Agent',
      url: 'http://localhost:41243',
      description: 'Markdown processing and entity extraction',
      type: 'Agent'
    },
    {
      name: 'Reasoning Agent',
      url: 'http://localhost:41244',
      description: 'Multi-hop reasoning and pattern detection',
      type: 'Agent'
    },
    {
      name: 'Enhanced Memory Agent',
      url: 'http://localhost:41245',
      description: 'IDE memory processing and synchronization',
      type: 'Agent'
    },
    {
      name: 'Integration Agent',
      url: 'http://localhost:41246',
      description: 'API discovery and schema mapping',
      type: 'Agent'
    }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Core Service': return 'blue';
      case 'Database': return 'purple';
      case 'Agent': return 'green';
      default: return 'gray';
    }
  };

  return (
    <>
      <Head>
        <title>Knowledge Graph Control - AI Homelab Dashboard</title>
        <meta name="description" content="One-click control for the complete AI Homelab Knowledge Graph ecosystem" />
      </Head>

      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box textAlign="center">
            <Heading size="2xl" mb={4} bgGradient="linear(to-r, blue.400, purple.500)" bgClip="text">
              🧠 AI Homelab Knowledge Graph Control
            </Heading>
            <Text fontSize="lg" color={useSemanticToken('text.secondary')} maxW="700px" mx="auto">
              One-click control for the complete AI Homelab ecosystem. Start all 12 services including 
              Memory Watcher, 7 AI Agents, and Knowledge Graph infrastructure with a single button.
            </Text>
          </Box>

          {/* Prominent One-Button Control */}
          <Alert status="info" borderRadius="lg" bg="blue.50" borderColor="blue.200" borderWidth={2}>
            <AlertIcon />
            <Box>
              <AlertTitle>🚀 One-Click System Control!</AlertTitle>
              <AlertDescription>
                Use the control panel below to start/stop the entire Knowledge Graph system with enhanced Memory Watcher integration.
              </AlertDescription>
            </Box>
          </Alert>

          {/* Main One-Button Control Component */}
          <Box display="flex" justifyContent="center" maxW="600px" mx="auto">
            <OneButtonControl size="lg" showDetails={true} />
          </Box>

          <Divider />

          {/* Advanced Control Component */}
          <Box>
            <Heading size="lg" mb={4} textAlign="center">Advanced System Control</Heading>
            <Box display="flex" justifyContent="center">
              <KnowledgeGraphControl refreshInterval={30000} />
            </Box>
          </Box>

        <Divider />

        {/* System Architecture Overview */}
        <Box>
          <Heading size="lg" mb={6} textAlign="center">
            System Architecture
          </Heading>
          
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {serviceEndpoints.map((endpoint) => (
              <Card key={endpoint.name} variant="outline" size="sm">
                <CardBody>
                  <VStack align="start" spacing={3}>
                    <HStack justify="space-between" w="full">
                      <Badge colorScheme={getTypeColor(endpoint.type)} size="sm">
                        {endpoint.type}
                      </Badge>
                      <Link href={endpoint.url} isExternal>
                        <Icon as={ExternalLinkIcon} boxSize={3} />
                      </Link>
                    </HStack>
                    
                    <Box>
                      <Heading size="sm" mb={1}>
                        {endpoint.name}
                      </Heading>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={2}>
                        {endpoint.description}
                      </Text>
                      <Text fontSize="xs" fontFamily="mono" color="blue.600">
                        {endpoint.url}
                      </Text>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* System Information */}
        <Box>
          <Heading size="lg" mb={4} textAlign="center">
            System Information
          </Heading>
          
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            <Card>
              <CardBody>
                <Heading size="md" mb={3}>Features</Heading>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm">• Multi-agent AI reasoning and coordination</Text>
                  <Text fontSize="sm">• Knowledge Graph traversal and querying</Text>
                  <Text fontSize="sm">• Semantic search and vector operations</Text>
                  <Text fontSize="sm">• IDE memory synchronization</Text>
                  <Text fontSize="sm">• Document processing and entity extraction</Text>
                  <Text fontSize="sm">• A2A (Agent-to-Agent) protocol communication</Text>
                  <Text fontSize="sm">• Real-time health monitoring</Text>
                </VStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <Heading size="md" mb={3}>Technical Stack</Heading>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm">• Neo4j Graph Database (7474, 7687)</Text>
                  <Text fontSize="sm">• PostgreSQL with pgvector (5432)</Text>
                  <Text fontSize="sm">• Redis Cache (6379)</Text>
                  <Text fontSize="sm">• Node.js Microservices</Text>
                  <Text fontSize="sm">• AI Gateway with LLM routing</Text>
                  <Text fontSize="sm">• 7 Specialized AI Agents</Text>
                  <Text fontSize="sm">• Automated startup/shutdown scripts</Text>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        {/* Usage Instructions */}
        <Card bg="blue.50" borderColor="blue.200">
          <CardBody>
            <Heading size="md" mb={3} color="blue.800">
              Usage Instructions
            </Heading>
            <VStack align="start" spacing={2} color="blue.700">
              <Text fontSize="sm">
                <strong>Toggle Switch:</strong> Use the main toggle to start or stop the entire Knowledge Graph system
              </Text>
              <Text fontSize="sm">
                <strong>Restart Button:</strong> Restart all services while maintaining configuration
              </Text>
              <Text fontSize="sm">
                <strong>System Health:</strong> Monitor the health percentage and individual service status
              </Text>
              <Text fontSize="sm">
                <strong>Details Panel:</strong> Expand to view individual service status and recent logs
              </Text>
              <Text fontSize="sm">
                <strong>Auto-Refresh:</strong> Status updates automatically every 30 seconds
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
    </>
  );
};

export default KnowledgeGraphControlPage;
