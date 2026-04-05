/**
 * AHIS Client Compliance Dashboard
 * 
 * This page displays the compliance status of projects in the AI Homelab Ecosystem
 * with respect to AHIS client integration standards.
 */

import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import MCPComplianceStatus from '@/components/compliance/MCPComplianceStatus'; // Component name maintained for compatibility
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  VStack,
  HStack,
  Link,
  Badge,
  useColorMode,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { GlassPanel } from '@/components/ui';

const ComplianceDashboard: NextPage = () => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  
  return (
    <>
      <Head>
        <title>AHIS Client Compliance - AI Homelab Dashboard</title>
        <meta name="description" content="Monitor AHIS client compliance across the AI Homelab Ecosystem" />
      </Head>
      
      <Box 
        bg={isDark ? 'gray.900' : 'gray.50'} 
        minH="100vh" 
        p={{ base: 3, md: 4, lg: 6 }}
      >
        {/* Header Section */}
        <GlassPanel
          variant="light"
          elevation={1}
          animated={false}
          mb={6}
          p={4}
        >
          <VStack align="start" spacing={2}>
            <Heading 
              size="lg" 
              color={isDark ? 'white' : 'gray.800'}
              fontWeight="semibold"
            >
              AHIS Client Compliance
            </Heading>
            <Text 
              color={isDark ? 'whiteAlpha.600' : 'gray.500'}
              fontSize="sm"
            >
              Monitor and manage AHIS client integration compliance across all ecosystem projects
            </Text>
            
            <Alert 
              status="info" 
              mt={4} 
              borderRadius="lg"
              bg={isDark ? 'blue.900' : 'blue.50'}
              border="1px solid"
              borderColor={isDark ? 'blue.700' : 'blue.200'}
            >
              <AlertIcon />
              <Box>
                <Text fontSize="sm" fontWeight="medium">
                  Standardized Integration Monitoring
                </Text>
                <Text fontSize="xs">
                  This dashboard ensures all projects follow standardized AHIS client integration patterns,
                  enabling consistent progress tracking and real-time monitoring.
                </Text>
              </Box>
            </Alert>
          </VStack>
        </GlassPanel>

        {/* Compliance Overview */}
        <GlassPanel
          variant="light"
          elevation={1}
          animated={false}
          mb={6}
          p={6}
        >
          <VStack align="start" spacing={4}>
            <Heading 
              size="md"
              color={isDark ? 'white' : 'gray.800'}
              fontWeight="medium"
            >
              Compliance Overview
            </Heading>
            
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} w="full">
              <GlassPanel
                variant="light"
                elevation={1}
                animated={false}
                p={4}
                bg={isDark ? 'green.900' : 'green.50'}
                borderColor={isDark ? 'green.700' : 'green.200'}
              >
                <VStack align="start" spacing={2}>
                  <HStack>
                    <Heading size="sm" color={isDark ? 'green.200' : 'green.700'}>
                      Compliant Projects
                    </Heading>
                    <Badge colorScheme="green" size="sm">Active</Badge>
                  </HStack>
                  <Text fontSize="xs" color={isDark ? 'green.300' : 'green.600'}>
                    Projects that fully implement all required AHIS client integration standards.
                  </Text>
                </VStack>
              </GlassPanel>
              
              <GlassPanel
                variant="light"
                elevation={1}
                animated={false}
                p={4}
                bg={isDark ? 'yellow.900' : 'yellow.50'}
                borderColor={isDark ? 'yellow.700' : 'yellow.200'}
              >
                <VStack align="start" spacing={2}>
                  <HStack>
                    <Heading size="sm" color={isDark ? 'yellow.200' : 'yellow.700'}>
                      Partial Compliance
                    </Heading>
                    <Badge colorScheme="yellow" size="sm">Review</Badge>
                  </HStack>
                  <Text fontSize="xs" color={isDark ? 'yellow.300' : 'yellow.600'}>
                    Projects that implement some but not all AHIS client integration standards.
                  </Text>
                </VStack>
              </GlassPanel>
              
              <GlassPanel
                variant="light"
                elevation={1}
                animated={false}
                p={4}
                bg={isDark ? 'red.900' : 'red.50'}
                borderColor={isDark ? 'red.700' : 'red.200'}
              >
                <VStack align="start" spacing={2}>
                  <HStack>
                    <Heading size="sm" color={isDark ? 'red.200' : 'red.700'}>
                      Non-Compliant Projects
                    </Heading>
                    <Badge colorScheme="red" size="sm">Action Required</Badge>
                  </HStack>
                  <Text fontSize="xs" color={isDark ? 'red.300' : 'red.600'}>
                    Projects that do not implement the required AHIS client integration standards.
                  </Text>
                </VStack>
              </GlassPanel>
            </SimpleGrid>
          </VStack>
        </GlassPanel>
        
        {/* Compliance Status Component */}
        <GlassPanel
          variant="light"
          elevation={1}
          animated={false}
          mb={6}
          p={6}
        >
          <VStack align="start" spacing={3}>
            <Heading 
              size="md"
              color={isDark ? 'white' : 'gray.800'}
              fontWeight="medium"
            >
              Project Compliance Status
            </Heading>
            <Box w="full">
              <MCPComplianceStatus />
            </Box>
          </VStack>
        </GlassPanel>
        
        {/* Integration Resources */}
        <GlassPanel
          variant="light"
          elevation={1}
          animated={false}
          p={6}
        >
          <VStack align="start" spacing={4}>
            <Heading 
              size="md"
              color={isDark ? 'white' : 'gray.800'}
              fontWeight="medium"
            >
              Integration Resources
            </Heading>
            <Text 
              fontSize="sm" 
              color={isDark ? 'whiteAlpha.600' : 'gray.500'}
            >
              Resources to help you implement AHIS client integration in your projects
            </Text>
            
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
              <GlassPanel variant="light" elevation={1} animated={false} p={4}>
                <VStack align="start" spacing={2}>
                  <Heading size="sm" color={isDark ? 'white' : 'gray.800'}>
                    Integration Guide
                  </Heading>
                  <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.600'}>
                    Comprehensive guide for implementing AHIS client integration in your projects.
                  </Text>
                  <Link 
                    href="/docs/technical/AHIS_CLIENT_INTEGRATION_GUIDE.md" 
                    color="blue.500" 
                    fontSize="xs"
                    fontWeight="medium"
                  >
                    View Integration Guide →
                  </Link>
                </VStack>
              </GlassPanel>
              
              <GlassPanel variant="light" elevation={1} animated={false} p={4}>
                <VStack align="start" spacing={2}>
                  <Heading size="sm" color={isDark ? 'white' : 'gray.800'}>
                    Templates
                  </Heading>
                  <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.600'}>
                    Ready-to-use templates for different programming languages and frameworks.
                  </Text>
                  <Link 
                    href="/templates/mcp-client" 
                    color="blue.500" 
                    fontSize="xs"
                    fontWeight="medium"
                  >
                    Browse Templates →
                  </Link>
                </VStack>
              </GlassPanel>
              
              <GlassPanel variant="light" elevation={1} animated={false} p={4}>
                <VStack align="start" spacing={2}>
                  <Heading size="sm" color={isDark ? 'white' : 'gray.800'}>
                    Compliance Testing Tool
                  </Heading>
                  <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.600'}>
                    Tool for testing AHIS client integration compliance in your projects.
                  </Text>
                  <Link 
                    href="/tools/mcp-client-compliance-test.js" 
                    color="blue.500" 
                    fontSize="xs"
                    fontWeight="medium"
                  >
                    View Testing Tool →
                  </Link>
                </VStack>
              </GlassPanel>
              
              <GlassPanel variant="light" elevation={1} animated={false} p={4}>
                <VStack align="start" spacing={2}>
                  <Heading size="sm" color={isDark ? 'white' : 'gray.800'}>
                    AIHDS Integration
                  </Heading>
                  <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.600'}>
                    Learn how AHIS client integration works with the AI Homelab Development System.
                  </Text>
                  <Link 
                    href="/docs/technical/AIHDS_INTEGRATION.md" 
                    color="blue.500" 
                    fontSize="xs"
                    fontWeight="medium"
                  >
                    View AIHDS Integration →
                  </Link>
                </VStack>
              </GlassPanel>
            </SimpleGrid>
          </VStack>
        </GlassPanel>
      </Box>
    </>
  );
};

export default ComplianceDashboard;
