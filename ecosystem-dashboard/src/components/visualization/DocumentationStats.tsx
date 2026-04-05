import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Flex,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from '@chakra-ui/react';
import { ecosystemApi } from '@/lib/api';
import StatWrapper from '@/components/ui/StatWrapper';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Chart.js will be loaded dynamically on the client to avoid SSR issues

interface DocumentationStats {
  totalCount: number;
  byType: Record<string, number>;
  byProject: Record<string, number>;
}

interface DocumentationStatsProps {
  // Add any props if needed
}

const DocumentationStats: React.FC<DocumentationStatsProps> = () => {
  const [stats, setStats] = useState<DocumentationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const typeChartRef = useRef<HTMLCanvasElement>(null);
  const projectChartRef = useRef<HTMLCanvasElement>(null);
  
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const chartBgColor = useSemanticToken('surface.elevated');
  const chartGridColor = 'rgba(128,128,128,0.2)';

  // Type colors for consistency
  const typeColors = {
    'technical': '#3182CE', // blue
    'user': '#38A169',      // green
    'api': '#DD6B20',       // orange
    'strategic': '#805AD5', // purple
    'other': '#718096'      // gray
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await ecosystemApi.get('/dashboard/api/documentation-stats');
        if (response.data.success) {
          setStats(response.data.data);
        } else {
          throw new Error('Failed to fetch documentation statistics');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch documentation statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let typeChartInstance: any;
    let projectChartInstance: any;

    if (!stats || !typeChartRef.current || !projectChartRef.current) return;

    (async () => {
      const chartjs = await import('chart.js');
      chartjs.Chart.register(...chartjs.registerables);

      // Destroy any existing charts
      const existingType = chartjs.Chart.getChart(typeChartRef.current!);
      if (existingType) existingType.destroy();
      const existingProj = chartjs.Chart.getChart(projectChartRef.current!);
      if (existingProj) existingProj.destroy();

      // Create the documentation type chart
      const typeLabels = Object.keys(stats.byType);
      const typeDataVals = Object.values(stats.byType);
      const typeBgColors = typeLabels.map(type => {
        switch (type) {
          case 'technical': return '#3182CE';
          case 'user': return '#38A169';
          case 'api': return '#DD6B20';
          case 'strategic': return '#805AD5';
          default: return '#718096';
        }
      });

      typeChartInstance = new chartjs.Chart(typeChartRef.current!, {
        type: 'doughnut',
        data: {
          labels: typeLabels,
          datasets: [{
            data: typeDataVals,
            backgroundColor: typeBgColors,
            borderColor: chartBgColor,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: textColor }
            },
            title: { display: false }
          },
          cutout: '60%'
        }
      });

      // Create the documentation by project chart
      const projectLabels = Object.keys(stats.byProject);
      const projectDataVals = Object.values(stats.byProject);

      projectChartInstance = new chartjs.Chart(projectChartRef.current!, {
        type: 'bar',
        data: {
          labels: projectLabels,
          datasets: [{
            label: 'Documentation Count',
            data: projectDataVals,
            backgroundColor: '#3182CE',
            borderColor: '#2C5282',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: chartGridColor },
              ticks: { color: textColor }
            },
            x: {
              grid: { display: false },
              ticks: { color: textColor }
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    })();

    return () => {
      try { typeChartInstance?.destroy(); } catch {}
      try { projectChartInstance?.destroy(); } catch {}
    };
  }, [stats, chartBgColor, chartGridColor, textColor]);

  if (loading && !stats) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading documentation statistics...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        Error loading documentation statistics: {error}
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert status="info">
        <AlertIcon />
        No documentation statistics available.
      </Alert>
    );
  }

  // Create a sorted array of documentation types for the table
  const sortedTypes = Object.entries(stats.byType)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));

  // Create a sorted array of projects for the table
  const sortedProjects = Object.entries(stats.byProject)
    .sort((a, b) => b[1] - a[1])
    .map(([project, count]) => ({ project, count }));

  return (
    <Box>
      <Heading size="md" mb={4}>Documentation Statistics</Heading>

      {/* Summary Card */}
      <Card bg={cardBg} boxShadow="sm" borderColor={borderColor} borderWidth="1px" mb={6}>
        <CardBody>
          <StatWrapper>
            <StatLabel>Total Documentation</StatLabel>
            <StatNumber>{stats.totalCount}</StatNumber>
            <StatHelpText>Across all projects and types</StatHelpText>
          </StatWrapper>
        </CardBody>
      </Card>

      {/* Charts */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
        <Card bg={cardBg} boxShadow="sm" borderColor={borderColor} borderWidth="1px">
          <CardHeader>
            <Heading size="sm">Documentation by Type</Heading>
          </CardHeader>
          <CardBody>
            <Box height="250px" position="relative">
              <canvas ref={typeChartRef} />
            </Box>
          </CardBody>
        </Card>

        <Card bg={cardBg} boxShadow="sm" borderColor={borderColor} borderWidth="1px">
          <CardHeader>
            <Heading size="sm">Documentation by Project</Heading>
          </CardHeader>
          <CardBody>
            <Box height="250px" position="relative">
              <canvas ref={projectChartRef} />
            </Box>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Tables */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        <Card bg={cardBg} boxShadow="sm" borderColor={borderColor} borderWidth="1px">
          <CardHeader>
            <Heading size="sm">Documentation Types</Heading>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Type</Th>
                    <Th isNumeric>Count</Th>
                    <Th isNumeric>Percentage</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {sortedTypes.map(({ type, count }) => (
                    <Tr key={type}>
                      <Td>
                        <Flex align="center">
                          <Box 
                            w="10px" 
                            h="10px" 
                            borderRadius="full" 
                            bg={typeColors[type as keyof typeof typeColors] || typeColors.other}
                            mr={2}
                          />
                          {type}
                        </Flex>
                      </Td>
                      <Td isNumeric>{count}</Td>
                      <Td isNumeric>{Math.round((count / stats.totalCount) * 100)}%</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>

        <Card bg={cardBg} boxShadow="sm" borderColor={borderColor} borderWidth="1px">
          <CardHeader>
            <Heading size="sm">Top Projects</Heading>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Project</Th>
                    <Th isNumeric>Count</Th>
                    <Th isNumeric>Percentage</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {sortedProjects.slice(0, 5).map(({ project, count }) => (
                    <Tr key={project}>
                      <Td>{project}</Td>
                      <Td isNumeric>{count}</Td>
                      <Td isNumeric>{Math.round((count / stats.totalCount) * 100)}%</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
};

export default DocumentationStats;
