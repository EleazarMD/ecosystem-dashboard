import React, { useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  VStack,
  HStack,
  SimpleGrid,
  Spinner,
  Center,
  Text,
  Heading,
  Card,
  CardBody,
  Badge,
  IconButton,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Head from 'next/head';
import { Brain, Activity, Zap, Database, TrendingUp, Clock } from 'lucide-react';
import { LLMServiceMonitor } from '@/components/monitoring/LLMServiceMonitor';

// Compact stat card component
const CompactStatCard = ({ icon: Icon, label, value, status, trend }: any) => {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  const statusColor = {
    healthy: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue'
  }[status] || 'gray';

  return (
    <Card 
      size="sm" 
      bg={bg} 
      borderWidth="1px" 
      borderColor={borderColor}
      _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
      transition="all 0.2s"
    >
      <CardBody p={3}>
        <HStack spacing={3} align="start">
          <Box 
            p={2} 
            borderRadius="md" 
            bg={`${statusColor}.50`}
            color={`${statusColor}.500`}
          >
            <Icon size={16} />
          </Box>
          <VStack align="start" spacing={0} flex={1}>
            <Text fontSize="xs" color="gray.500" fontWeight="medium">
              {label}
            </Text>
            <HStack spacing={2}>
              <Text fontSize="lg" fontWeight="bold">
                {value}
              </Text>
              {trend && (
                <Badge size="sm" colorScheme={trend > 0 ? 'green' : 'red'} fontSize="xs">
                  {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </Badge>
              )}
            </HStack>
          </VStack>
          <Badge colorScheme={statusColor} size="sm">
            {status}
          </Badge>
        </HStack>
      </CardBody>
    </Card>
  );
};

// Compact section header
const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <HStack justify="space-between" mb={3}>
    <Heading size="sm" fontWeight="semibold">
      {title}
    </Heading>
    {action}
  </HStack>
);

// Main compact dashboard
const CompactHomePage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const bg = useColorModeValue('gray.50', 'gray.900');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/landing');
      return;
    }
    
    if ((session.user as any)?.accountType === 'child') {
      router.push('/child/home');
    }
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>AI Homelab - Dashboard</title>
        <meta name="description" content="Compact AI Homelab Dashboard" />
      </Head>
      
      <Box bg={bg} minH="100vh">
        <Container maxW="1400px" py={4} px={4}>
          <VStack align="stretch" spacing={4}>
            {/* Header */}
            <HStack justify="space-between" mb={2}>
              <VStack align="start" spacing={0}>
                <Heading size="md">AI Homelab</Heading>
                <Text fontSize="sm" color="gray.500">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
              </VStack>
              <HStack spacing={2}>
                <Badge colorScheme="green" px={2} py={1}>
                  All Systems Operational
                </Badge>
              </HStack>
            </HStack>

            {/* Quick Stats Grid */}
            <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={3}>
              <CompactStatCard
                icon={Brain}
                label="LLM Services"
                value="3"
                status="healthy"
              />
              <CompactStatCard
                icon={Activity}
                label="Active Tasks"
                value="12"
                status="info"
                trend={8}
              />
              <CompactStatCard
                icon={Zap}
                label="GPU Usage"
                value="67%"
                status="warning"
              />
              <CompactStatCard
                icon={Database}
                label="Storage"
                value="2.4TB"
                status="healthy"
              />
              <CompactStatCard
                icon={TrendingUp}
                label="Requests/min"
                value="145"
                status="healthy"
                trend={12}
              />
              <CompactStatCard
                icon={Clock}
                label="Uptime"
                value="99.8%"
                status="healthy"
              />
            </SimpleGrid>

            {/* Main Content Grid */}
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
              {/* LLM Services */}
              <Box>
                <SectionHeader title="LLM Services" />
                <LLMServiceMonitor refreshInterval={10000} />
              </Box>

              {/* System Health */}
              <Box>
                <SectionHeader title="System Health" />
                <Card size="sm">
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between">
                        <Text fontSize="sm" fontWeight="medium">CPU</Text>
                        <Text fontSize="sm">45%</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="sm" fontWeight="medium">Memory</Text>
                        <Text fontSize="sm">62%</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="sm" fontWeight="medium">Network</Text>
                        <Badge colorScheme="green" size="sm">Healthy</Badge>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              </Box>
            </SimpleGrid>

            {/* Recent Activity */}
            <Box>
              <SectionHeader title="Recent Activity" />
              <Card size="sm">
                <CardBody>
                  <VStack align="stretch" spacing={2}>
                    {[
                      { time: '2m ago', event: 'Qwen3-32B completed inference', status: 'success' },
                      { time: '5m ago', event: 'Clinical LLM started', status: 'info' },
                      { time: '12m ago', event: 'Embeddings service healthy', status: 'success' },
                    ].map((item, i) => (
                      <HStack key={i} justify="space-between" py={1}>
                        <HStack spacing={3}>
                          <Badge 
                            size="sm" 
                            colorScheme={item.status === 'success' ? 'green' : 'blue'}
                          >
                            {item.time}
                          </Badge>
                          <Text fontSize="sm">{item.event}</Text>
                        </HStack>
                      </HStack>
                    ))}
                  </VStack>
                </CardBody>
              </Card>
            </Box>
          </VStack>
        </Container>
      </Box>
    </DashboardLayout>
  );
};

export default CompactHomePage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  
  if (!session) {
    return {
      redirect: {
        destination: '/landing',
        permanent: false,
      },
    };
  }
  
  if (session?.user && (session.user as any).accountType === 'child') {
    return {
      redirect: {
        destination: '/child/home',
        permanent: false,
      },
    };
  }
  
  return {
    props: {},
  };
};
