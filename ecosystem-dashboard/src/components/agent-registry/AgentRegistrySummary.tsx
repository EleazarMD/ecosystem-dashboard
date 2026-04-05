import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardBody, 
  Heading, 
  Text, 
  SimpleGrid, 
  Spinner,
  Divider,
  Alert, 
  AlertIcon,
  Tag,
} from '@chakra-ui/react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAgentRegistry } from '@/context/AgentRegistryContext';
import { AgentRegistryEventType } from '@/lib/agent-registry-client';
import CountCard from '@/components/common/CountCard';
import StatusIndicator from '@/components/common/StatusIndicator';

/**
 * Agent Registry Summary Component
 * 
 * Displays a summary dashboard for the Agent Registry Service
 * with real-time updates using the AHIS client
 */
const AgentRegistrySummary: React.FC = () => {
  // Get the Agent Registry client from context
  const { client, isConnected, lastEvent } = useAgentRegistry();
  
  // Local state for summary data
  const [localSummaryData, setLocalSummaryData] = useState<any>(null);
  
  // Fetch summary data from the dashboard API
  const { data, error, isLoading, mutate } = useSWR('/api/proxy/agent-registry/dashboard/summary', fetcher, {
    refreshInterval: 60000, // Refresh every minute as a fallback
  });
  
  // Fetch health data
  const { data: healthData } = useSWR('/api/proxy/agent-registry/dashboard/health', fetcher, {
    refreshInterval: 60000, // Refresh every minute
  });
  
  // Update local data when API data changes
  useEffect(() => {
    if (data?.success && data?.data) {
      setLocalSummaryData(data.data);
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
      AgentRegistryEventType.PLATFORM_REGISTERED,
      AgentRegistryEventType.PLATFORM_REMOVED
    ];
    
    // Subscribe to events
    const unsubscribers = refreshEvents.map(eventType =>
      client.subscribe(eventType, () => {
        // Refresh data when an event occurs
        mutate();
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
      client.getDashboardSummary()
        .then(summaryData => {
          if (summaryData) {
            setLocalSummaryData(summaryData);
          }
        })
        .catch(err => console.error('Failed to get summary data from AHIS client:', err));
    }
  }, [error, client, isConnected]);
  
  if (isLoading && !localSummaryData) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Spinner size="xl" />
      </Box>
    );
  }
  
  if ((error || !data?.success) && !localSummaryData) {
    return (
      <Box p={2}>
        <Alert status="error">
          <AlertIcon />
          Error loading summary data: {error?.message || data?.error?.message || 'Unknown error'}
        </Alert>
      </Box>
    );
  }
  
  const summaryData = localSummaryData || {};
  
  // Prepare data for status distribution chart
  const statusData = Object.entries(summaryData.agentsByStatus || {}).map(([status, count]) => ({
    name: status,
    value: count as number
  }));
  
  // Prepare data for type distribution chart
  const typeData = Object.entries(summaryData.agentsByType || {}).map(([type, count]) => ({
    name: type,
    value: count as number
  }));
  
  // Colors for the charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  
  // Status colors
  const STATUS_COLORS = {
    active: '#4CAF50',
    inactive: '#FFC107',
    error: '#F44336',
    pending: '#2196F3',
    unknown: '#9E9E9E'
  };
  
  // Type colors
  const TYPE_COLORS = {
    assistant: '#3F51B5',
    service: '#009688',
    tool: '#FF5722',
    system: '#673AB7',
    other: '#607D8B'
  };
  
  // Determine service status
  const serviceStatus = healthData?.data?.status || 'unknown';
  
  return (
    <Box mb={3}>
      <Card variant="outline">
        <CardBody>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Heading as="h2" size="md">
              Agent Registry Overview
            </Heading>
            <Box display="flex" alignItems="center" gap={1}>
              <StatusIndicator status={serviceStatus === 'healthy' ? 'online' : 'error'} label={serviceStatus} />
              {isConnected && (
                <Tag 
                  size="sm" 
                  colorScheme="green" 
                  variant="outline" 
                >
                  Real-time updates active
                </Tag>
              )}
              {lastEvent && (
                <Tag 
                  size="sm" 
                  colorScheme="blue" 
                  variant="outline" 
                >
                  Last update: {new Date(lastEvent.timestamp).toLocaleTimeString()}
                </Tag>
              )}
            </Box>
          </Box>
          
          <Divider mb={2} />
          
          {/* Summary metrics */}
          <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={2} mb={4}>
            <Box>
              <CountCard 
                title="Total Agents" 
                count={summaryData.totalAgents || 0} 
                icon="people" 
                color="#3F51B5"
              />
            </Box>
            <Box>
              <CountCard 
                title="Total Platforms" 
                count={summaryData.totalPlatforms || 0} 
                icon="devices" 
                color="#009688"
              />
            </Box>
            <Box>
              <CountCard 
                title="Total Services" 
                count={summaryData.totalServices || 0} 
                icon="miscellaneous_services" 
                color="#FF5722"
              />
            </Box>
            <Box>
              <CountCard 
                title="Total Capabilities" 
                count={summaryData.totalCapabilities || 0} 
                icon="psychology" 
                color="#673AB7"
              />
            </Box>
          </SimpleGrid>
          
          {/* Distribution charts */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {/* Status distribution */}
            <Card variant="outline">
              <CardBody>
                <Heading as="h3" size="sm" mb={2}>
                  Agent Status Distribution
                </Heading>
                <Box height="300px">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} agents`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>
            
            {/* Type distribution */}
            <Card variant="outline">
              <CardBody>
                <Heading as="h3" size="sm" mb={2}>
                  Agent Type Distribution
                </Heading>
                <Box height="300px">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {typeData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={TYPE_COLORS[entry.name as keyof typeof TYPE_COLORS] || COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} agents`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>
          </SimpleGrid>
        </CardBody>
      </Card>
    </Box>
  );
};

export default AgentRegistrySummary;
