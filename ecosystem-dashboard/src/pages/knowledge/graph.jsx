/**
 * Knowledge Graph Dashboard Page
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Card,
  CardHeader,
  CardBody,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  SimpleGrid,
  Textarea,
  Container
} from '@chakra-ui/react';
import { RepeatIcon, SearchIcon } from '@chakra-ui/icons';
import DashboardLayout from '@/components/layout/DashboardLayout';
// import OneButtonControl from '@/components/knowledge-graph/OneButtonControl';

const KnowledgeGraphPage = () => {
  console.log('🚨 KNOWLEDGE GRAPH COMPONENT RENDERING - /pages/knowledge/graph.jsx');
  const [isLoading, setIsLoading] = useState(false);
  const [queryResults, setQueryResults] = useState(null);
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState({
    totalNodes: 0,
    totalRelationships: 0,
    categories: [],
    lastUpdated: null
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/knowledge-graph/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/knowledge-graph/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (response.ok) {
        const data = await response.json();
        setQueryResults(data);
      }
    } catch (error) {
      console.error('Query failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Container maxW="7xl" py={8}>
        <VStack spacing={6} align="stretch">
          <Box>
            <Heading size="lg" mb={2}>🧠 Knowledge Graph</Heading>
            <Text color="gray.600">
              Explore and query the AI Homelab ecosystem knowledge graph
            </Text>
          </Box>

          {/* Unified One-Click Control - Start/Stop Knowledge Graph Stack */}
          <Card bg="green.50" borderColor="green.200" borderWidth={2}>
            <CardHeader>
              <Heading size="md" color="green.700">🧠 Knowledge Graph Control</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>System Offline</AlertTitle>
                    <AlertDescription>
                      Knowledge Graph system is not running. Click to start all 12 services.
                    </AlertDescription>
                  </Box>
                </Alert>
                
                <Button 
                  colorScheme="green" 
                  size="lg" 
                  width="100%" 
                  height="60px"
                  fontSize="lg"
                  fontWeight="bold"
                  onClick={() => alert('🚀 Starting Knowledge Graph System!\n\nThis would start:\n• Neo4j Database (Port 7474)\n• Knowledge Graph API (Port 8765)\n• IDE Memory Backend (Port 9579)\n• Memory Watcher (Port 9578)\n• AI Gateway (Port 8777)\n• 7 AI Agents (Ports 41240-41246)')}
                  shadow="md"
                  _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                  transition="all 0.2s"
                >
                  🚀 Start Knowledge Graph System
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Stats Overview */}
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
            <Card>
              <CardBody>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                    {stats.totalNodes.toLocaleString()}
                  </Text>
                  <Text fontSize="sm" color="gray.600">Total Nodes</Text>
                </VStack>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold" color="green.500">
                    {stats.totalRelationships.toLocaleString()}
                  </Text>
                  <Text fontSize="sm" color="gray.600">Relationships</Text>
                </VStack>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                    {stats.categories.length}
                  </Text>
                  <Text fontSize="sm" color="gray.600">Categories</Text>
                </VStack>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <VStack>
                  <Badge colorScheme="green" variant="solid">
                    Online
                  </Badge>
                  <Text fontSize="sm" color="gray.600">Status</Text>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Query Interface */}
          <Card>
            <CardHeader>
              <Heading size="md">Natural Language Query</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                <Textarea
                  placeholder="Ask me anything about the AI Homelab ecosystem..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={3}
                />
                <HStack>
                  <Button
                    leftIcon={<SearchIcon />}
                    colorScheme="blue"
                    onClick={handleQuery}
                    isLoading={isLoading}
                    loadingText="Searching..."
                  >
                    Search Knowledge Graph
                  </Button>
                  <Button
                    leftIcon={<RepeatIcon />}
                    variant="outline"
                    onClick={fetchStats}
                  >
                    Refresh Stats
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Results */}
          {queryResults && (
            <Card>
              <CardHeader>
                <Heading size="md">Query Results</Heading>
              </CardHeader>
              <CardBody>
                <Text>Results will be displayed here...</Text>
              </CardBody>
            </Card>
          )}

          {/* Service Status */}
          <Card>
            <CardHeader>
              <Heading size="md">Service Status</Heading>
            </CardHeader>
            <CardBody>
              <Alert status="info">
                <AlertIcon />
                Knowledge Graph services are initializing. Backend API connection needed.
              </Alert>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </DashboardLayout>
  );
};

export default KnowledgeGraphPage;
