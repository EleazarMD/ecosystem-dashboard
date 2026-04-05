import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, 
  Heading, 
  Text, 
  Spinner, 
  VStack, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  useColorMode,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useAuth } from '@/context/AuthContext';
import GrafanaDashboards from '@/components/monitoring/GrafanaDashboards';
import { GlassPanel } from '@/components/ui';

const AISystemsPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <Box 
        bg={isDark ? 'gray.900' : 'gray.50'} 
        minH="100vh" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text color={isDark ? 'whiteAlpha.700' : 'gray.600'}>
            Loading AI Systems...
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
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
            AI Systems Dashboard
          </Heading>
          <Text 
            color={isDark ? 'whiteAlpha.600' : 'gray.500'}
            fontSize="sm"
          >
            Insights and management capabilities for AI systems within the ecosystem
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
                Integrated AI Systems Monitoring
              </Text>
              <Text fontSize="xs">
                This dashboard provides comprehensive monitoring and management for all AI systems 
                deployed within the homelab ecosystem.
              </Text>
            </Box>
          </Alert>
        </VStack>
      </GlassPanel>

      {/* Main Content */}
      <GlassPanel
        variant="light"
        elevation={1}
        animated={false}
        p={6}
      >
        <Tabs variant="enclosed" colorScheme="blue" isLazy>
          <TabList mb={6}>
            <Tab 
              fontSize="sm" 
              fontWeight="medium"
              _selected={{
                color: isDark ? 'white' : 'blue.600',
                borderColor: isDark ? 'blue.400' : 'blue.500',
              }}
            >
              Overview
            </Tab>
            <Tab 
              fontSize="sm" 
              fontWeight="medium"
              _selected={{
                color: isDark ? 'white' : 'blue.600',
                borderColor: isDark ? 'blue.400' : 'blue.500',
              }}
            >
              Performance
            </Tab>
            <Tab 
              fontSize="sm" 
              fontWeight="medium"
              _selected={{
                color: isDark ? 'white' : 'blue.600',
                borderColor: isDark ? 'blue.400' : 'blue.500',
              }}
            >
              Resources
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel p={0}>
              <GlassPanel
                variant="light"
                elevation={2}
                animated={false}
                p={4}
              >
                <VStack align="start" spacing={3}>
                  <Heading 
                    size="md"
                    color={isDark ? 'white' : 'gray.800'}
                    fontWeight="medium"
                  >
                    System Overview
                  </Heading>
                  <Text 
                    fontSize="sm" 
                    color={isDark ? 'whiteAlpha.600' : 'gray.500'}
                  >
                    Comprehensive overview of all AI systems in the ecosystem
                  </Text>
                  <Box w="full">
                    <GrafanaDashboards height={600} standalone={false} />
                  </Box>
                </VStack>
              </GlassPanel>
            </TabPanel>

            <TabPanel p={0}>
              <GlassPanel
                variant="light"
                elevation={2}
                animated={false}
                p={4}
              >
                <VStack align="start" spacing={3}>
                  <Heading 
                    size="md"
                    color={isDark ? 'white' : 'gray.800'}
                    fontWeight="medium"
                  >
                    Performance Metrics
                  </Heading>
                  <Text 
                    fontSize="sm" 
                    color={isDark ? 'whiteAlpha.600' : 'gray.500'}
                  >
                    Real-time performance metrics and analytics for AI systems
                  </Text>
                  <Alert status="warning" borderRadius="lg">
                    <AlertIcon />
                    <Text fontSize="sm">
                      Performance metrics dashboard is currently under development. 
                      Advanced metrics will be available in the next release.
                    </Text>
                  </Alert>
                </VStack>
              </GlassPanel>
            </TabPanel>

            <TabPanel p={0}>
              <GlassPanel
                variant="light"
                elevation={2}
                animated={false}
                p={4}
              >
                <VStack align="start" spacing={3}>
                  <Heading 
                    size="md"
                    color={isDark ? 'white' : 'gray.800'}
                    fontWeight="medium"
                  >
                    Resource Allocation
                  </Heading>
                  <Text 
                    fontSize="sm" 
                    color={isDark ? 'whiteAlpha.600' : 'gray.500'}
                  >
                    Resource allocation and utilization across AI systems
                  </Text>
                  <Alert status="warning" borderRadius="lg">
                    <AlertIcon />
                    <Text fontSize="sm">
                      Resource allocation dashboard is currently under development. 
                      Detailed resource monitoring will be available soon.
                    </Text>
                  </Alert>
                </VStack>
              </GlassPanel>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </GlassPanel>
    </Box>
  );
};

export default AISystemsPage;
