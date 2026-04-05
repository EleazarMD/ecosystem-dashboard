import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  Box, 
  Card, 
  CardBody, 
  CardHeader, 
  Heading, 
  Text, 
  Divider, 
  Tag, 
  CircularProgress, 
  Button, 
  SimpleGrid, 
  Stat, 
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  StatGroup, 
  Flex, 
  Spinner, 
  Progress, 
  VStack, 
  HStack, 
  Center 
} from '@chakra-ui/react';
import { ecosystemApi } from '@/lib/api';
import { useWebSocket, NotificationSeverity } from '@/lib/websocket';
import dynamic from 'next/dynamic';
// Client-only chart components to avoid SSR issues
const Doughnut = dynamic(() => import('react-chartjs-2').then(m => m.Doughnut), { ssr: false });
const Bar = dynamic(() => import('react-chartjs-2').then(m => m.Bar), { ssr: false });
import { format } from 'date-fns';
import { domainColors } from '@/styles/theme'; 
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Chart.js will be dynamically imported and registered on the client

// Helper function to format dates (if not already available elsewhere)
const formatDate = (dateString: string | number | Date) => {
  try {
    return format(new Date(dateString), 'PPpp'); 
  } catch (e) {
    return 'Invalid Date';
  }
};

// Define interfaces for the data structure (replace 'any' types)
interface HealthMetrics {
  overallHealth: number;
  issuesCount: number;
  warningsCount: number;
}

interface ProjectStat {
  id: string;
  name: string;
  progress: number;
  lastUpdated: string;
}

interface ProjectStats {
  total: number;
  byStatus: Record<string, number>;
  byDomain: Record<string, number>;
  recentlyUpdated: ProjectStat[];
}

interface TaskStat {
  id: string;
  name: string;
  projectName: string;
  completedAt: string;
}

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  byPriority: Record<string, number>;
  recentlyCompleted: TaskStat[];
}

interface ComponentStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

interface DocumentationStat {
  id: string;
  title: string;
  path: string;
  lastUpdated: string;
}

interface DocumentationStats {
  total: number;
  byType: Record<string, number>;
  recentlyUpdated: DocumentationStat[];
}

interface EcosystemOverviewData {
  healthMetrics: HealthMetrics;
  projectStats: ProjectStats;
  taskStats: TaskStats;
  componentStats: ComponentStats;
  documentationStats: DocumentationStats;
}

const EcosystemOverviewPage = () => {
  const router = useRouter();
  const [overview, setOverview] = useState<EcosystemOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useWebSocket();
  const [chartsReady, setChartsReady] = useState(false);
  
  // Colors from semantic tokens
  const textColor = useSemanticToken('text.primary');
  const secondaryTextColor = useSemanticToken('text.secondary');
  const cardBg = useSemanticToken('surface.elevated'); 
  const errorColor = useSemanticToken('status.error');
  const warningColor = useSemanticToken('status.warning');
  const successColor = useSemanticToken('status.success');
  const primaryColor = useSemanticToken('status.info');
  const borderColor = useSemanticToken('border.default');
  const trackColor = useSemanticToken('surface.disabled');

  // Dynamically import and register Chart.js on the client
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const chartjs = await import('chart.js');
        const { ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } = chartjs;
        // Register once on client
        chartjs.Chart.register(
          ArcElement,
          Tooltip,
          Legend,
          CategoryScale,
          LinearScale,
          BarElement,
          Title
        );
        if (mounted) setChartsReady(true);
      } catch (e) {
        console.error('Failed to load Chart.js', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const fetchOverview = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await ecosystemApi.get('/overview');
        setOverview(response.data);
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch ecosystem overview.';
        setError(errorMessage);
        addNotification('Failed to load overview', errorMessage, NotificationSeverity.ERROR);
        console.error('Error fetching ecosystem overview:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [addNotification]);

  // Prepare chart data - memoize if performance becomes an issue
  const projectStatusChartData = {
    labels: Object.keys(overview?.projectStats?.byStatus || {}),
    datasets: [
      {
        data: Object.values(overview?.projectStats?.byStatus || {}),
        backgroundColor: ['#4CAF50', '#FFC107', '#F44336', '#9E9E9E'], 
        borderColor: cardBg,
        borderWidth: 2,
      },
    ],
  };

  const projectDomainChartData = {
    labels: Object.keys(overview?.projectStats?.byDomain || {}),
    datasets: [
      {
        data: Object.values(overview?.projectStats?.byDomain || {}),
        backgroundColor: Object.keys(overview?.projectStats?.byDomain || {}).map(domain => {
          const colorObj = domainColors[domain as keyof typeof domainColors];
          return colorObj && typeof colorObj === 'object' && 'primary' in colorObj ? colorObj.primary : '#757575';
        }),
        borderColor: cardBg,
        borderWidth: 2,
      },
    ],
  };

  const taskPriorityChartData = {
    labels: Object.keys(overview?.taskStats?.byPriority || {}),
    datasets: [
      {
        label: 'Tasks by Priority',
        data: Object.values(overview?.taskStats?.byPriority || {}),
        backgroundColor: ['#F44336', '#FF9800', '#2196F3'], 
      },
    ],
  };

  const componentTypeChartData = {
    labels: Object.keys(overview?.componentStats?.byType || {}),
    datasets: [
      {
        data: Object.values(overview?.componentStats?.byType || {}),
        backgroundColor: ['#03A9F4', '#8BC34A', '#FFEB3B', '#607D8B'], 
        borderColor: cardBg,
        borderWidth: 2,
      },
    ],
  };
  
  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
           color: secondaryTextColor, 
        }
      }
    }
  };
  
  const barChartOptions = {
    ...chartOptions,
     scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: secondaryTextColor, 
        },
        grid: {
          color: borderColor 
        }
      },
      x: {
         ticks: {
           color: secondaryTextColor, 
        },
         grid: {
          display: false 
        }
      }
    },
    plugins: {
       legend: {
        display: false 
      }
    }
  };

  if (loading) {
    return (
      <Center h="80vh">
        <Spinner size="xl" thickness="4px" speed="0.65s" color={primaryColor} emptyColor="gray.200" />
      </Center>
    );
  }

  if (error || !overview) {
    return (
      <Center h="80vh">
        <VStack spacing={4}>
            <Heading size="md" color={errorColor}>Oops! Something went wrong.</Heading>
            <Text color={secondaryTextColor}>{error || 'Could not load ecosystem data.'}</Text>
            <Button colorScheme="blue" onClick={() => router.reload()} mt={4}>Retry</Button>
        </VStack>
      </Center>
    );
  }

  return (
    <>
      <Head>
        <title>Ecosystem Overview - AI Homelab Dashboard</title>
        <meta name="description" content="Monitor the health and progress of the AI Homelab Ecosystem." />
      </Head>
      
      <Box w="100%" p={{ base: 4, md: 6 }}> 
        <Heading as="h1" size="xl" mb={2} color={textColor}>
          Ecosystem Overview
        </Heading>
        <Text color={secondaryTextColor} mb={6} fontSize="lg">
          Monitor the health, progress, and structure of the AI Homelab Ecosystem.
        </Text>
        <Divider mb={8} borderColor={borderColor}/>

        {/* Section: Health Overview */}
        <Box mb={10}>
            <Heading as="h2" size="lg" mb={5} color={textColor}>Health Status</Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Card bg={cardBg} variant="outline" borderColor={borderColor}>
                <CardBody>
                <VStack spacing={3} align="center">
                    <Heading as="h3" size="md" color={secondaryTextColor} fontWeight="medium">Overall Health</Heading>
                    <Box position="relative" display="inline-flex" my={2}> 
                        <CircularProgress 
                            value={overview.healthMetrics.overallHealth}
                            size="100px" 
                            thickness="6px" 
                            color={overview.healthMetrics.overallHealth > 80 ? successColor :
                                   overview.healthMetrics.overallHealth > 60 ? warningColor : errorColor} 
                            trackColor={trackColor}
                        />
                        <Center position="absolute" top={0} left={0} right={0} bottom={0}>
                            <Text fontSize="xl" fontWeight="bold" color={textColor}>
                                {`${Math.round(overview.healthMetrics.overallHealth)}%`}
                            </Text>
                        </Center>
                    </Box>
                </VStack>
                </CardBody>
            </Card>
            <Card bg={cardBg} variant="outline" borderColor={borderColor}>
                <CardBody>
                <VStack spacing={3} align="center">
                    <Heading as="h3" size="md" color={secondaryTextColor} fontWeight="medium">Issues</Heading>
                    <Text fontSize="4xl" fontWeight="bold" color={errorColor} my={4}>
                        {overview.healthMetrics.issuesCount}
                    </Text>
                    <Text fontSize="sm" color={secondaryTextColor} textAlign="center">
                        Open issues requiring attention
                    </Text>
                </VStack>
                </CardBody>
            </Card>
            <Card bg={cardBg} variant="outline" borderColor={borderColor}>
                <CardBody>
                <VStack spacing={3} align="center">
                    <Heading as="h3" size="md" color={secondaryTextColor} fontWeight="medium">Warnings</Heading>
                    <Text fontSize="4xl" fontWeight="bold" color={warningColor} my={4}>
                        {overview.healthMetrics.warningsCount}
                    </Text>
                    <Text fontSize="sm" color={secondaryTextColor} textAlign="center">
                        Potential concerns to monitor
                    </Text>
                </VStack>
                </CardBody>
            </Card>
            </SimpleGrid>
        </Box>

        <Divider mb={10} borderColor={borderColor}/>

        {/* Section: Project Statistics */}
         <Box mb={10}>
            <Heading as="h2" size="lg" mb={5} color={textColor}>Project Statistics</Heading>
            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
                {/* Card 1: Project Status Chart */} 
                <Card bg={cardBg} variant="outline" borderColor={borderColor}>
                    <CardHeader pb={0}>
                        <Heading size='md' color={textColor}>Status Distribution</Heading>
                    </CardHeader>
                    <CardBody>
                        <Box h="280px">
                          {chartsReady ? (
                            <Doughnut data={projectStatusChartData} options={chartOptions} />
                          ) : (
                            <Center h="100%"><Spinner /></Center>
                          )}
                        </Box>
                        <Text fontSize="sm" color={secondaryTextColor} mt={4} textAlign="center">
                            Total Projects: {overview.projectStats.total}
                        </Text>
                    </CardBody>
                </Card>
                {/* Card 2: Project Domain Chart */} 
                <Card bg={cardBg} variant="outline" borderColor={borderColor}>
                    <CardHeader pb={0}>
                        <Heading size='md' color={textColor}>Projects by Domain</Heading>
                    </CardHeader>
                    <CardBody>
                        <Box h="280px">
                          {chartsReady ? (
                            <Doughnut data={projectDomainChartData} options={chartOptions} />
                          ) : (
                            <Center h="100%"><Spinner /></Center>
                          )}
                        </Box>
                    </CardBody>
                </Card>
                {/* Card 3: Recently Updated List */} 
                <Card bg={cardBg} variant="outline" borderColor={borderColor}>
                    <CardHeader>
                        <Heading size='md' color={textColor}>Recently Updated</Heading>
                    </CardHeader>
                    <CardBody pt={0} maxH={{ base: "none", lg: "350px" }} overflowY="auto"> 
                        <VStack divider={<Divider borderColor={borderColor} />} spacing={4} align="stretch">
                            {overview.projectStats.recentlyUpdated.length > 0 ? (
                                overview.projectStats.recentlyUpdated.map((project) => (
                                <Box key={project.id}>
                                    <Text fontWeight="medium" color={textColor} noOfLines={1}>{project.name}</Text>
                                    <Flex align="center" mt={2} mb={1}>
                                    <Progress 
                                        value={project.progress} 
                                        size="sm"
                                        colorScheme={project.progress === 100 ? 'green' : 'blue'} 
                                        borderRadius="full"
                                        flex={1} mr={3}
                                    />
                                    <Text fontSize="sm" fontWeight="medium" color={secondaryTextColor}>{`${Math.round(project.progress)}%`}</Text>
                                    </Flex>
                                    <Text fontSize="xs" color={secondaryTextColor}>
                                    Updated: {formatDate(project.lastUpdated)}
                                    </Text>
                                </Box>
                                ))
                            ) : (
                                <Text fontSize="sm" color={secondaryTextColor}>No recent updates.</Text>
                            )}
                        </VStack>
                    </CardBody>
                </Card>
            </SimpleGrid>
        </Box>

        <Divider mb={10} borderColor={borderColor}/>

        {/* Section: Task Statistics */}
        <Box mb={10}>
            <Heading as="h2" size="lg" mb={5} color={textColor}>Task Statistics</Heading>
            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
                 {/* Card 1: Task Completion Stats */} 
                <Card bg={cardBg} variant="outline" borderColor={borderColor}>
                    <CardHeader>
                        <Heading size='md' color={textColor}>Completion Status</Heading>
                    </CardHeader>
                    <CardBody>
                        <Center mb={6}>
                            <Text fontSize="3xl" fontWeight="bold" color={textColor}>
                            {overview.taskStats.completed}/{overview.taskStats.total}
                            </Text>
                            <Text ml={2} fontSize="md" color={secondaryTextColor}>Tasks Completed</Text>
                        </Center>
                        <HStack justify="space-around">
                            <VStack spacing={1}>
                                <Text fontSize="2xl" fontWeight="semibold" color={successColor}>
                                    {overview.taskStats.completed}
                                </Text>
                                <Text fontSize="xs" color={secondaryTextColor}>Completed</Text>
                            </VStack>
                            <VStack spacing={1}>
                                <Text fontSize="2xl" fontWeight="semibold" color={warningColor}>
                                    {overview.taskStats.inProgress}
                                </Text>
                                <Text fontSize="xs" color={secondaryTextColor}>In Progress</Text>
                            </VStack>
                            <VStack spacing={1}>
                                <Text fontSize="2xl" fontWeight="semibold" color={secondaryTextColor}>
                                    {overview.taskStats.notStarted}
                                </Text>
                                <Text fontSize="xs" color={secondaryTextColor}>Not Started</Text>
                            </VStack>
                        </HStack>
                    </CardBody>
                </Card>
                {/* Card 2: Tasks by Priority Chart */} 
                <Card bg={cardBg} variant="outline" borderColor={borderColor}>
                    <CardHeader pb={0}>
                        <Heading size='md' color={textColor}>Tasks by Priority</Heading>
                    </CardHeader>
                    <CardBody>
                         <Box h="250px">
                           {chartsReady ? (
                             <Bar data={taskPriorityChartData} options={barChartOptions} />
                           ) : (
                             <Center h="100%"><Spinner /></Center>
                           )}
                        </Box>
                    </CardBody>
                </Card>
                {/* Card 3: Recently Completed Tasks List */} 
                <Card bg={cardBg} variant="outline" borderColor={borderColor}>
                    <CardHeader>
                        <Heading size='md' color={textColor}>Recently Completed</Heading>
                    </CardHeader>
                    <CardBody pt={0} maxH={{ base: "none", lg: "300px" }} overflowY="auto">
                       <VStack divider={<Divider borderColor={borderColor} />} spacing={4} align="stretch">
                            {overview.taskStats.recentlyCompleted.length > 0 ? (
                                overview.taskStats.recentlyCompleted.map((task) => (
                                <Box key={task.id}>
                                    <Text fontWeight="medium" color={textColor} noOfLines={1}>{task.name}</Text>
                                    <Text fontSize="xs" color={secondaryTextColor} display="block">
                                    Project: {task.projectName}
                                    </Text>
                                    <Text fontSize="xs" color={secondaryTextColor}>
                                    Completed: {formatDate(task.completedAt)}
                                    </Text>
                                </Box>
                                ))
                            ) : (
                                <Text fontSize="sm" color={secondaryTextColor}>No recently completed tasks.</Text>
                            )}
                        </VStack>
                    </CardBody>
                </Card>
            </SimpleGrid>
        </Box>

        <Divider mb={10} borderColor={borderColor}/>

        {/* Section: Component Statistics */}
        <Box mb={10}>
            <Heading as="h2" size="lg" mb={5} color={textColor}>Component Statistics</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                {/* Card 1: Components by Type Chart */} 
                <Card bg={cardBg} variant="outline" borderColor={borderColor}>
                    <CardHeader pb={0}>
                        <Heading size='md' color={textColor}>Components by Type</Heading>
                    </CardHeader>
                    <CardBody>
                         <Box h="280px">
                           {chartsReady ? (
                             <Doughnut data={componentTypeChartData} options={chartOptions} />
                           ) : (
                             <Center h="100%"><Spinner /></Center>
                           )}
                        </Box>
                        <Text fontSize="sm" color={secondaryTextColor} mt={4} textAlign="center">
                            Total Components: {overview.componentStats.total}
                        </Text>
                    </CardBody>
                </Card>
                 {/* Card 2: Components by Status Stats */} 
                <Card bg={cardBg} variant="outline" borderColor={borderColor}>
                    <CardHeader>
                        <Heading size='md' color={textColor}>Components by Status</Heading>
                    </CardHeader>
                    <CardBody>
                        <HStack justify="space-around" mt={8} mb={8}> 
                            {Object.entries(overview.componentStats.byStatus).map(([status, count]) => (
                            <VStack key={status} spacing={1}>
                                <Text fontSize="2xl" fontWeight="semibold" color={
                                status === 'Active' ? successColor :
                                status === 'Deprecated' ? errorColor :
                                status === 'In Development' ? warningColor :
                                secondaryTextColor
                                }>
                                {count}
                                </Text>
                                <Text fontSize="xs" color={secondaryTextColor}>{status}</Text>
                            </VStack>
                            ))}
                        </HStack>
                    </CardBody>
                </Card>
            </SimpleGrid>
        </Box>

        <Divider mb={10} borderColor={borderColor}/>

        {/* Section: Documentation Statistics */}
        <Box mb={10}> 
            <Heading as="h2" size="lg" mb={5} color={textColor}>Documentation Statistics</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                 {/* Card 1: Documentation by Type Stats */} 
                <Card bg={cardBg} variant="outline" borderColor={borderColor}>
                    <CardHeader>
                        <Heading size='md' color={textColor}>Documentation by Type</Heading>
                    </CardHeader>
                    <CardBody>
                        <HStack justify="space-around" mt={6} mb={6}> 
                            {Object.entries(overview.documentationStats.byType).map(([type, count]) => (
                            <VStack key={type} spacing={1}>
                                <Text fontSize="2xl" fontWeight="semibold" color={textColor}>{count}</Text>
                                <Text fontSize="xs" color={secondaryTextColor}>{type}</Text>
                            </VStack>
                            ))}
                        </HStack>
                        <Text fontSize="sm" color={secondaryTextColor} mt={4} textAlign="center">
                            Total Documents: {overview.documentationStats.total}
                        </Text>
                    </CardBody>
                </Card>
                {/* Card 2: Recently Updated Documentation List */} 
                <Card bg={cardBg} variant="outline" borderColor={borderColor}>
                    <CardHeader>
                        <Heading size='md' color={textColor}>Recently Updated Docs</Heading>
                    </CardHeader>
                     <CardBody pt={0} maxH={{ base: "none", md: "350px" }} overflowY="auto">
                        <VStack divider={<Divider borderColor={borderColor} />} spacing={4} align="stretch">
                            {overview.documentationStats.recentlyUpdated.length > 0 ? (
                                overview.documentationStats.recentlyUpdated.map((doc) => (
                                <Box key={doc.id}>
                                    <Text fontWeight="medium" color={textColor} noOfLines={1}>{doc.title}</Text>
                                    <Text fontSize="xs" color={secondaryTextColor} display="block" noOfLines={1}>
                                    Path: {doc.path}
                                    </Text>
                                    <Text fontSize="xs" color={secondaryTextColor}>
                                    Updated: {formatDate(doc.lastUpdated)}
                                    </Text>
                                </Box>
                                ))
                            ) : (
                                <Text fontSize="sm" color={secondaryTextColor}>No recently updated documents.</Text>
                            )}
                        </VStack>
                    </CardBody>
                </Card>
            </SimpleGrid>
        </Box>
      </Box>
    </>
  );
};

export default EcosystemOverviewPage;
