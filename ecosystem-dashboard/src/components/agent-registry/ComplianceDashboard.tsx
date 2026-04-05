import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  SimpleGrid,
  Spinner,
  Divider,
  Progress,
  Tooltip,
  Tag,
  Alert,
  AlertIcon,
  Flex,
  HStack,
  VStack,
  Badge,
  Center,
  Stack,
} from '@chakra-ui/react';
import useSWR from 'swr';
import { fetcher } from '../../lib/fetcher';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Legend,
  Cell,
  Tooltip as RechartsTooltip
} from 'recharts';
import { useAgentRegistry } from '../../context/AgentRegistryContext';
import { AgentRegistryEventType } from '../../lib/agent-registry-client';
import { useSemanticToken } from '@/hooks/useSemanticToken';

/**
 * Compliance Dashboard Component
 * 
 * Displays compliance metrics for agents and platforms in the Agent Registry Service
 * with real-time updates using the AHIS client
 */
const ComplianceDashboard: React.FC = () => {
  // Get the Agent Registry client from context
  const { client, isConnected, lastEvent } = useAgentRegistry();
  
  // Local state for compliance data
  const [localComplianceData, setLocalComplianceData] = useState<any>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  // Fetch compliance data from the dashboard API
  const { data, error, isLoading, mutate } = useSWR('/api/proxy/agent-registry/dashboard/compliance', fetcher, {
    refreshInterval: 60000, // Refresh every minute as a fallback
  });
  
  // Update local data when API data changes
  useEffect(() => {
    if (data?.success && data?.data) {
      setLocalComplianceData(data.data);
      setLastUpdateTime(new Date());
    }
  }, [data]);
  
  // Subscribe to real-time updates
  useEffect(() => {
    if (!client || !isConnected) return;
    
    // Define event types that should trigger a refresh
    const refreshEvents = [
      AgentRegistryEventType.AGENT_REGISTERED,
      AgentRegistryEventType.AGENT_UPDATED,
      AgentRegistryEventType.AGENT_REMOVED,
      AgentRegistryEventType.COMPLIANCE_UPDATED,
      AgentRegistryEventType.PLATFORM_REGISTERED,
      AgentRegistryEventType.PLATFORM_UPDATED,
      AgentRegistryEventType.PLATFORM_REMOVED
    ];
    
    // Subscribe to events
    const unsubscribers = refreshEvents.map(eventType =>
      client.subscribe(eventType, () => {
        // Refresh data when an event occurs
        mutate();
        setLastUpdateTime(new Date());
      })
    );
    
    // Cleanup subscriptions
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [client, isConnected, mutate]);
  
  // Try to get data from AHIS client if API fails
  useEffect(() => {
    if (error && client && isConnected) {
      client.getDashboardCompliance()
        .then(complianceData => {
          if (complianceData) {
            setLocalComplianceData(complianceData);
            setLastUpdateTime(new Date());
          }
        })
        .catch(err => console.error('Failed to get compliance data from AHIS client:', err));
    }
  }, [error, client, isConnected]);
  
  if (isLoading && !localComplianceData) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Spinner size="xl" />
      </Box>
    );
  }
  
  if ((error || !data?.success) && !localComplianceData) {
    return (
      <Box p={2}>
        <Alert status="error">
          <AlertIcon />
          Error loading compliance data: {error?.message || data?.error?.message || 'Unknown error'}
        </Alert>
      </Box>
    );
  }
  
  const complianceData = localComplianceData || {};
  const agentCompliance = complianceData.agents || { total: 0, compliant: 0, partiallyCompliant: 0, nonCompliant: 0 };
  const platformCompliance = complianceData.platforms || { total: 0, compliant: 0, partiallyCompliant: 0, nonCompliant: 0 };
  
  // Calculate compliance percentages
  const agentCompliancePercentage = Math.round((agentCompliance.compliant / agentCompliance.total) * 100) || 0;
  const platformCompliancePercentage = Math.round((platformCompliance.compliant / platformCompliance.total) * 100) || 0;
  
  // Prepare data for charts
  const agentComplianceData = [
    { name: 'Compliant', value: agentCompliance.compliant },
    { name: 'Partially Compliant', value: agentCompliance.partiallyCompliant },
    { name: 'Non-Compliant', value: agentCompliance.nonCompliant }
  ];
  
  const platformComplianceData = [
    { name: 'Compliant', value: platformCompliance.compliant },
    { name: 'Partially Compliant', value: platformCompliance.partiallyCompliant },
    { name: 'Non-Compliant', value: platformCompliance.nonCompliant }
  ];
  
  // Colors for the charts
  const COLORS = {
    compliant: 'green.500',
    partiallyCompliant: 'yellow.500',
    nonCompliant: 'red.500'
  };
  
  // Function to get color based on compliance level
  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return 'green.500';
    if (percentage >= 50) return 'yellow.500';
    return 'red.500';
  };
  
  // Function to get label based on compliance level
  const getComplianceLabel = (percentage: number) => {
    if (percentage >= 80) return 'Compliant';
    if (percentage >= 50) return 'Partially Compliant';
    return 'Non-Compliant';
  };
  
  return (
    <Box mb={3}>
      <Card variant="outline">
        <CardBody>
          <Flex justifyContent="space-between" alignItems="center" mb={2}>
            <Heading as="h2" size="lg">
              Compliance Dashboard
            </Heading>
            <HStack spacing={2}>
              <Tag colorScheme={agentCompliancePercentage >= 80 ? 'green' : agentCompliancePercentage >= 50 ? 'yellow' : 'red'} size="md">
                Agent Compliance: {agentCompliancePercentage}%
              </Tag>
              <Tag colorScheme={platformCompliancePercentage >= 80 ? 'green' : platformCompliancePercentage >= 50 ? 'yellow' : 'red'} size="md">
                Platform Compliance: {platformCompliancePercentage}%
              </Tag>
            </HStack>
          </Flex>
          
          <Divider my={3} />
          
          {/* Compliance Summary */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
            {/* Agent Compliance */}
            <Card variant="outline">
              <CardBody>
                <Flex justifyContent="space-between" alignItems="center" mb={2}>
                  <Heading as="h3" size="md">
                    Agent Compliance <Text as="span" fontSize="sm" color={useSemanticToken('text.secondary')}>({agentCompliance.total} total)</Text>
                  </Heading>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    {agentCompliance.compliant} of {agentCompliance.total} compliant
                  </Text>
                </Flex>
                
                <Box mb={4}>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Overall Compliance: {agentCompliancePercentage}%
                  </Text>
                  <Tooltip label={getComplianceLabel(agentCompliancePercentage)}>
                    <Progress 
                      value={agentCompliancePercentage} 
                      colorScheme={agentCompliancePercentage >= 80 ? 'green' : agentCompliancePercentage >= 50 ? 'yellow' : 'red'} 
                      size="md" 
                      borderRadius="md"
                    />
                  </Tooltip>
                </Box>
                
                <SimpleGrid columns={3} spacing={2}>
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" color="green.500">
                      {agentCompliance.compliant}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      Compliant
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" color="yellow.500">
                      {agentCompliance.partiallyCompliant}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      Partially
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" color="red.500">
                      {agentCompliance.nonCompliant}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      Non-Compliant
                    </Text>
                  </Box>
                </SimpleGrid>
              </CardBody>
            </Card>
            
            {/* Platform Compliance */}
            <Card variant="outline">
              <CardBody>
                <Flex justifyContent="space-between" alignItems="center" mb={2}>
                  <Heading as="h3" size="md">
                    Platform Compliance <Text as="span" fontSize="sm" color={useSemanticToken('text.secondary')}>({platformCompliance.total} total)</Text>
                  </Heading>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    {platformCompliance.compliant} of {platformCompliance.total} compliant
                  </Text>
                </Flex>
                
                <Box mb={4}>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Overall Compliance: {platformCompliancePercentage}%
                  </Text>
                  <Tooltip label={getComplianceLabel(platformCompliancePercentage)}>
                    <Progress 
                      value={platformCompliancePercentage} 
                      colorScheme={platformCompliancePercentage >= 80 ? 'green' : platformCompliancePercentage >= 50 ? 'yellow' : 'red'} 
                      size="md" 
                      borderRadius="md"
                    />
                  </Tooltip>
                </Box>
                
                <SimpleGrid columns={3} spacing={2}>
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" color="green.500">
                      {platformCompliance.compliant}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      Compliant
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" color="yellow.500">
                      {platformCompliance.partiallyCompliant}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      Partially
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" color="red.500">
                      {platformCompliance.nonCompliant}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      Non-Compliant
                    </Text>
                  </Box>
                </SimpleGrid>
              </CardBody>
            </Card>
          </SimpleGrid>
          
          {/* Compliance Charts */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {/* Agent Compliance Chart */}
            <Card variant="outline">
              <CardBody>
                <Heading as="h3" size="sm" mb={2}>
                  Agent Compliance Breakdown
                </Heading>
                <Box height="300px">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={agentComplianceData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => [`${value} agents`, 'Count']} />
                      <Legend />
                      <Bar dataKey="value" name="Agents">
                        {agentComplianceData.map((entry, index) => {
                          let color;
                          switch (entry.name) {
                            case 'Compliant':
                              color = COLORS.compliant;
                              break;
                            case 'Partially Compliant':
                              color = COLORS.partiallyCompliant;
                              break;
                            default:
                              color = COLORS.nonCompliant;
                          }
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>
            
            {/* Platform Compliance Chart */}
            <Card variant="outline">
              <CardBody>
                <Heading as="h3" size="sm" mb={2}>
                  Platform Compliance Breakdown
                </Heading>
                <Box height="300px">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={platformComplianceData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => [`${value} platforms`, 'Count']} />
                      <Legend />
                      <Bar dataKey="value" name="Platforms">
                        {platformComplianceData.map((entry, index) => {
                          let color;
                          switch (entry.name) {
                            case 'Compliant':
                              color = COLORS.compliant;
                              break;
                            case 'Partially Compliant':
                              color = COLORS.partiallyCompliant;
                              break;
                            default:
                              color = COLORS.nonCompliant;
                          }
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>
          </SimpleGrid>
          
          <Flex justifyContent="flex-end" mt={2}>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              Last updated: {lastUpdateTime ? lastUpdateTime.toLocaleString() : 
                (complianceData.timestamp ? new Date(complianceData.timestamp).toLocaleString() : 'Unknown')}
            </Text>
          </Flex>
        </CardBody>
      </Card>
    </Box>
  );
};

export default ComplianceDashboard;
