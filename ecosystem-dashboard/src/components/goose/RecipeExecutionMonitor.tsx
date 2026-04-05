/**
 * Recipe Execution Monitor
 * Monitor and manage headless Goose recipe executions
 * 
 * @author AI Homelab Team
 * @version 1.0.0
 * @date 2025-11-09
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Tooltip,
  Code,
  Progress,
} from '@chakra-ui/react';
import {
  FiPlay,
  FiRefreshCw,
  FiTrash2,
  FiEye,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiCalendar,
} from 'react-icons/fi';

interface Execution {
  id: string;
  recipe_name: string;
  agent_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  start_time: string | null;
  end_time: string | null;
  exit_code: number | null;
  output: string;
  error: string;
  trigger_type: 'manual' | 'scheduled' | 'event';
}

interface Schedule {
  id: string;
  recipe_name: string;
  agent_id: string;
  cron_expression: string;
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
  run_count: number;
}

interface Stats {
  total_executions: number;
  running_executions: number;
  completed_executions: number;
  failed_executions: number;
  active_schedules: number;
  success_rate: number;
}

export function RecipeExecutionMonitor() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Fetch data
  const fetchData = async () => {
    try {
      const [execRes, schedRes, statsRes] = await Promise.all([
        fetch('http://localhost:9001/api/headless/executions'),
        fetch('http://localhost:9001/api/headless/schedules'),
        fetch('http://localhost:9001/api/headless/stats'),
      ]);

      if (execRes.ok) {
        const data = await execRes.json();
        setExecutions(data.executions || []);
      }

      if (schedRes.ok) {
        const data = await schedRes.json();
        setSchedules(data.schedules || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch execution data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch execution data',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Toggle schedule
  const toggleSchedule = async (scheduleId: string, enabled: boolean) => {
    try {
      const res = await fetch(
        `http://localhost:9001/api/headless/schedules/${scheduleId}/toggle`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled }),
        }
      );

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Schedule ${enabled ? 'enabled' : 'disabled'}`,
          status: 'success',
          duration: 2000,
        });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
    }
  };

  // Delete schedule
  const deleteSchedule = async (scheduleId: string) => {
    try {
      const res = await fetch(
        `http://localhost:9001/api/headless/schedules/${scheduleId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Schedule deleted',
          status: 'success',
          duration: 2000,
        });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  };

  // View execution details
  const viewExecution = (execution: Execution) => {
    setSelectedExecution(execution);
    onOpen();
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { colorScheme: 'gray', icon: FiClock },
      running: { colorScheme: 'blue', icon: FiLoader },
      completed: { colorScheme: 'green', icon: FiCheckCircle },
      failed: { colorScheme: 'red', icon: FiXCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge colorScheme={config.colorScheme} display="flex" alignItems="center" gap={1}>
        <Icon size={12} />
        {status}
      </Badge>
    );
  };

  // Calculate duration
  const getDuration = (start: string | null, end: string | null) => {
    if (!start) return '-';
    if (!end) return 'In progress...';

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const duration = (endTime - startTime) / 1000;

    if (duration < 60) return `${duration.toFixed(1)}s`;
    if (duration < 3600) return `${(duration / 60).toFixed(1)}m`;
    return `${(duration / 3600).toFixed(1)}h`;
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" color="blue.500" />
        <Text mt={4} color={useSemanticToken('text.secondary')}>Loading execution data...</Text>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="2xl" fontWeight="bold">
              Recipe Execution Monitor
            </Text>
            <HStack spacing={2}>
              <Button
                leftIcon={<FiRefreshCw />}
                size="sm"
                onClick={fetchData}
                variant="outline"
              >
                Refresh
              </Button>
            </HStack>
          </HStack>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            Monitor and manage headless Goose recipe executions
          </Text>
        </Box>

        {/* Stats Cards */}
        {stats && (
          <HStack spacing={4}>
            <Box
              flex={1}
              p={4}
              bg="blue.50"
              borderRadius="md"
              borderLeft="4px"
              borderColor="blue.500"
            >
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>
                Total Executions
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="blue.700">
                {stats.total_executions}
              </Text>
            </Box>

            <Box
              flex={1}
              p={4}
              bg="orange.50"
              borderRadius="md"
              borderLeft="4px"
              borderColor="orange.500"
            >
              <HStack>
                <FiLoader />
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  Running
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="bold" color="orange.700">
                {stats.running_executions}
              </Text>
            </Box>

            <Box
              flex={1}
              p={4}
              bg="green.50"
              borderRadius="md"
              borderLeft="4px"
              borderColor="green.500"
            >
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>
                Success Rate
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="green.700">
                {stats.success_rate.toFixed(1)}%
              </Text>
            </Box>

            <Box
              flex={1}
              p={4}
              bg="purple.50"
              borderRadius="md"
              borderLeft="4px"
              borderColor="purple.500"
            >
              <HStack>
                <FiCalendar />
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  Active Schedules
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="bold" color="purple.700">
                {stats.active_schedules}
              </Text>
            </Box>
          </HStack>
        )}

        <Divider />

        {/* Tabs */}
        <Tabs colorScheme="blue">
          <TabList>
            <Tab>
              <HStack>
                <FiPlay />
                <Text>Executions</Text>
                <Badge colorScheme="blue">{executions.length}</Badge>
              </HStack>
            </Tab>
            <Tab>
              <HStack>
                <FiCalendar />
                <Text>Schedules</Text>
                <Badge colorScheme="purple">{schedules.length}</Badge>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            {/* Executions Tab */}
            <TabPanel px={0}>
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Recipe</Th>
                      <Th>Agent</Th>
                      <Th>Status</Th>
                      <Th>Trigger</Th>
                      <Th>Duration</Th>
                      <Th>Started</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {executions.length === 0 ? (
                      <Tr>
                        <Td colSpan={7} textAlign="center" py={8}>
                          <Text color={useSemanticToken('text.secondary')}>No executions yet</Text>
                        </Td>
                      </Tr>
                    ) : (
                      executions.map((exec) => (
                        <Tr key={exec.id}>
                          <Td>
                            <Text fontWeight="medium">{exec.recipe_name}</Text>
                          </Td>
                          <Td>
                            <Code fontSize="xs">{exec.agent_id}</Code>
                          </Td>
                          <Td>{getStatusBadge(exec.status)}</Td>
                          <Td>
                            <Badge size="sm" variant="outline">
                              {exec.trigger_type}
                            </Badge>
                          </Td>
                          <Td>
                            <Text fontSize="xs">
                              {getDuration(exec.start_time, exec.end_time)}
                            </Text>
                          </Td>
                          <Td>
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                              {exec.start_time
                                ? new Date(exec.start_time).toLocaleString()
                                : '-'}
                            </Text>
                          </Td>
                          <Td>
                            <Tooltip label="View Details">
                              <IconButton
                                icon={<FiEye />}
                                size="sm"
                                variant="ghost"
                                aria-label="View"
                                onClick={() => viewExecution(exec)}
                              />
                            </Tooltip>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Box>
            </TabPanel>

            {/* Schedules Tab */}
            <TabPanel px={0}>
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Recipe</Th>
                      <Th>Cron Expression</Th>
                      <Th>Status</Th>
                      <Th>Run Count</Th>
                      <Th>Last Run</Th>
                      <Th>Next Run</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {schedules.length === 0 ? (
                      <Tr>
                        <Td colSpan={7} textAlign="center" py={8}>
                          <Text color={useSemanticToken('text.secondary')}>No schedules configured</Text>
                        </Td>
                      </Tr>
                    ) : (
                      schedules.map((sched) => (
                        <Tr key={sched.id}>
                          <Td>
                            <Text fontWeight="medium">{sched.recipe_name}</Text>
                          </Td>
                          <Td>
                            <Code fontSize="xs">{sched.cron_expression}</Code>
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={sched.enabled ? 'green' : 'gray'}
                            >
                              {sched.enabled ? 'Active' : 'Disabled'}
                            </Badge>
                          </Td>
                          <Td>
                            <Text fontSize="sm">{sched.run_count}</Text>
                          </Td>
                          <Td>
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                              {sched.last_run
                                ? new Date(sched.last_run).toLocaleString()
                                : 'Never'}
                            </Text>
                          </Td>
                          <Td>
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                              {sched.next_run
                                ? new Date(sched.next_run).toLocaleString()
                                : '-'}
                            </Text>
                          </Td>
                          <Td>
                            <HStack spacing={1}>
                              <Tooltip
                                label={sched.enabled ? 'Disable' : 'Enable'}
                              >
                                <IconButton
                                  icon={<FiPlay />}
                                  size="sm"
                                  variant="ghost"
                                  aria-label="Toggle"
                                  colorScheme={sched.enabled ? 'orange' : 'green'}
                                  onClick={() =>
                                    toggleSchedule(sched.id, !sched.enabled)
                                  }
                                />
                              </Tooltip>
                              <Tooltip label="Delete">
                                <IconButton
                                  icon={<FiTrash2 />}
                                  size="sm"
                                  variant="ghost"
                                  aria-label="Delete"
                                  colorScheme="red"
                                  onClick={() => deleteSchedule(sched.id)}
                                />
                              </Tooltip>
                            </HStack>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Execution Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Execution Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedExecution && (
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    Recipe:
                  </Text>
                  <Text>{selectedExecution.recipe_name}</Text>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    Status:
                  </Text>
                  {getStatusBadge(selectedExecution.status)}
                </Box>

                {selectedExecution.exit_code !== null && (
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" mb={2}>
                      Exit Code:
                    </Text>
                    <Badge
                      colorScheme={
                        selectedExecution.exit_code === 0 ? 'green' : 'red'
                      }
                    >
                      {selectedExecution.exit_code}
                    </Badge>
                  </Box>
                )}

                {selectedExecution.output && (
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" mb={2}>
                      Output:
                    </Text>
                    <Code
                      display="block"
                      whiteSpace="pre-wrap"
                      p={3}
                      fontSize="xs"
                      maxH="200px"
                      overflowY="auto"
                    >
                      {selectedExecution.output}
                    </Code>
                  </Box>
                )}

                {selectedExecution.error && (
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" mb={2} color="red.600">
                      Error:
                    </Text>
                    <Code
                      display="block"
                      whiteSpace="pre-wrap"
                      p={3}
                      fontSize="xs"
                      bg="red.50"
                      color="red.800"
                      maxH="200px"
                      overflowY="auto"
                    >
                      {selectedExecution.error}
                    </Code>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
