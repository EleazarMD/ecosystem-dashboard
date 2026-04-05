/**
 * Agent Workflow Scheduler Component
 * 
 * Allows users to schedule agent workflows for automated execution
 * with cron-like scheduling and dependency management.
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Input,
  Select,
  Switch,
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Tooltip,
  Alert,
  AlertIcon,
  Grid,
  GridItem,
  Divider
} from '@chakra-ui/react';
import {
  FaClock,
  FaPlay,
  FaPause,
  FaTrash,
  FaEdit,
  FaCalendarAlt,
  FaCheck,
  FaTimes,
  FaExclamationTriangle
} from 'react-icons/fa';

interface ScheduledWorkflow {
  id: string;
  name: string;
  workflowId: string;
  parameters: Record<string, any>;
  schedule: {
    type: 'once' | 'recurring';
    cronExpression?: string;
    nextRun: string;
    timezone: string;
  };
  status: 'active' | 'paused' | 'completed' | 'failed';
  lastRun?: {
    timestamp: string;
    status: 'success' | 'failure';
    duration: number;
  };
  dependencies?: string[];
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    email?: string;
  };
  createdAt: string;
  createdBy: string;
}

const cronPresets = [
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 9 AM', value: '0 9 * * *' },
  { label: 'Weekly on Monday', value: '0 0 * * 1' },
  { label: 'Monthly on 1st', value: '0 0 1 * *' },
  { label: 'Custom', value: 'custom' }
];

export const AgentWorkflowScheduler: React.FC = () => {
  const [scheduledWorkflows, setScheduledWorkflows] = useState<ScheduledWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ScheduledWorkflow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    workflowId: '',
    scheduleType: 'recurring',
    cronPreset: '0 0 * * *',
    customCron: '',
    timezone: 'UTC',
    notifyOnSuccess: true,
    notifyOnFailure: true,
    email: ''
  });

  // Mock data
  useEffect(() => {
    const mockSchedules: ScheduledWorkflow[] = [
      {
        id: 'sched-001',
        name: 'Daily Security Scan',
        workflowId: 'security-scan',
        parameters: { scanScope: ['containers', 'configurations'], severity: 'medium' },
        schedule: {
          type: 'recurring',
          cronExpression: '0 2 * * *',
          nextRun: '2025-08-24T02:00:00Z',
          timezone: 'UTC'
        },
        status: 'active',
        lastRun: {
          timestamp: '2025-08-23T02:00:00Z',
          status: 'success',
          duration: 1200000
        },
        notifications: { onSuccess: true, onFailure: true, email: 'admin@homelab.ai' },
        createdAt: '2025-08-20T10:00:00Z',
        createdBy: 'admin'
      },
      {
        id: 'sched-002',
        name: 'Weekly Database Maintenance',
        workflowId: 'database-maintenance',
        parameters: { databases: ['postgresql', 'neo4j'], includeBackup: true },
        schedule: {
          type: 'recurring',
          cronExpression: '0 1 * * 0',
          nextRun: '2025-08-25T01:00:00Z',
          timezone: 'UTC'
        },
        status: 'active',
        notifications: { onSuccess: true, onFailure: true },
        createdAt: '2025-08-15T14:30:00Z',
        createdBy: 'admin'
      }
    ];
    setScheduledWorkflows(mockSchedules);
  }, []);

  const handleCreateSchedule = () => {
    setSelectedWorkflow(null);
    setIsEditing(false);
    setFormData({
      name: '',
      workflowId: '',
      scheduleType: 'recurring',
      cronPreset: '0 0 * * *',
      customCron: '',
      timezone: 'UTC',
      notifyOnSuccess: true,
      notifyOnFailure: true,
      email: ''
    });
    onOpen();
  };

  const handleEditSchedule = (schedule: ScheduledWorkflow) => {
    setSelectedWorkflow(schedule);
    setIsEditing(true);
    setFormData({
      name: schedule.name,
      workflowId: schedule.workflowId,
      scheduleType: schedule.schedule.type,
      cronPreset: schedule.schedule.cronExpression || '0 0 * * *',
      customCron: schedule.schedule.cronExpression || '',
      timezone: schedule.schedule.timezone,
      notifyOnSuccess: schedule.notifications.onSuccess,
      notifyOnFailure: schedule.notifications.onFailure,
      email: schedule.notifications.email || ''
    });
    onOpen();
  };

  const handleSaveSchedule = () => {
    const newSchedule: ScheduledWorkflow = {
      id: isEditing ? selectedWorkflow!.id : `sched-${Date.now()}`,
      name: formData.name,
      workflowId: formData.workflowId,
      parameters: {},
      schedule: {
        type: formData.scheduleType as 'once' | 'recurring',
        cronExpression: formData.cronPreset === 'custom' ? formData.customCron : formData.cronPreset,
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timezone: formData.timezone
      },
      status: 'active',
      notifications: {
        onSuccess: formData.notifyOnSuccess,
        onFailure: formData.notifyOnFailure,
        email: formData.email || undefined
      },
      createdAt: isEditing ? selectedWorkflow!.createdAt : new Date().toISOString(),
      createdBy: 'admin'
    };

    if (isEditing) {
      setScheduledWorkflows(prev => prev.map(s => s.id === selectedWorkflow!.id ? newSchedule : s));
    } else {
      setScheduledWorkflows(prev => [...prev, newSchedule]);
    }

    onClose();
  };

  const toggleScheduleStatus = (scheduleId: string) => {
    setScheduledWorkflows(prev => prev.map(schedule =>
      schedule.id === scheduleId
        ? { ...schedule, status: schedule.status === 'active' ? 'paused' : 'active' }
        : schedule
    ));
  };

  const deleteSchedule = (scheduleId: string) => {
    setScheduledWorkflows(prev => prev.filter(s => s.id !== scheduleId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'paused': return 'yellow';
      case 'completed': return 'blue';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  const formatNextRun = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `in ${diffHours}h`;
    }
    return date.toLocaleDateString();
  };

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <FaClock />
            <Text fontSize="lg" fontWeight="bold">Workflow Scheduler</Text>
            <Badge colorScheme="blue">{scheduledWorkflows.length} scheduled</Badge>
          </HStack>
          <Button colorScheme="blue" onClick={handleCreateSchedule}>
            Schedule Workflow
          </Button>
        </HStack>

        {/* Summary Cards */}
        <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
          <GridItem>
            <Box p={4} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
              <VStack>
                <Text fontSize="2xl" fontWeight="bold" color="green.600">
                  {scheduledWorkflows.filter(s => s.status === 'active').length}
                </Text>
                <Text fontSize="sm" color="green.700">Active Schedules</Text>
              </VStack>
            </Box>
          </GridItem>
          <GridItem>
            <Box p={4} bg="yellow.50" borderRadius="md" border="1px" borderColor="yellow.200">
              <VStack>
                <Text fontSize="2xl" fontWeight="bold" color="yellow.600">
                  {scheduledWorkflows.filter(s => s.status === 'paused').length}
                </Text>
                <Text fontSize="sm" color="yellow.700">Paused Schedules</Text>
              </VStack>
            </Box>
          </GridItem>
          <GridItem>
            <Box p={4} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
              <VStack>
                <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                  {scheduledWorkflows.filter(s => s.lastRun?.status === 'success').length}
                </Text>
                <Text fontSize="sm" color="blue.700">Successful Runs</Text>
              </VStack>
            </Box>
          </GridItem>
        </Grid>

        {/* Scheduled Workflows Table */}
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Workflow</Th>
                <Th>Schedule</Th>
                <Th>Next Run</Th>
                <Th>Status</Th>
                <Th>Last Run</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {scheduledWorkflows.map(schedule => (
                <Tr key={schedule.id}>
                  <Td>
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="medium">{schedule.name}</Text>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                        Created {new Date(schedule.createdAt).toLocaleDateString()}
                      </Text>
                    </VStack>
                  </Td>
                  <Td>
                    <Badge variant="outline">{schedule.workflowId}</Badge>
                  </Td>
                  <Td>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm">{schedule.schedule.cronExpression}</Text>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{schedule.schedule.timezone}</Text>
                    </VStack>
                  </Td>
                  <Td>
                    <Text fontSize="sm">
                      {formatNextRun(schedule.schedule.nextRun)}
                    </Text>
                  </Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(schedule.status)}>
                      {schedule.status}
                    </Badge>
                  </Td>
                  <Td>
                    {schedule.lastRun ? (
                      <VStack align="start" spacing={1}>
                        <HStack>
                          {schedule.lastRun.status === 'success' ? (
                            <FaCheck color="green" />
                          ) : (
                            <FaTimes color="red" />
                          )}
                          <Text fontSize="sm">
                            {Math.round(schedule.lastRun.duration / 1000)}s
                          </Text>
                        </HStack>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                          {new Date(schedule.lastRun.timestamp).toLocaleDateString()}
                        </Text>
                      </VStack>
                    ) : (
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Never</Text>
                    )}
                  </Td>
                  <Td>
                    <HStack spacing={1}>
                      <Tooltip label={schedule.status === 'active' ? 'Pause' : 'Resume'}>
                        <IconButton
                          size="sm"
                          aria-label="Toggle status"
                          icon={schedule.status === 'active' ? <FaPause /> : <FaPlay />}
                          onClick={() => toggleScheduleStatus(schedule.id)}
                          colorScheme={schedule.status === 'active' ? 'yellow' : 'green'}
                          variant="ghost"
                        />
                      </Tooltip>
                      <Tooltip label="Edit">
                        <IconButton
                          size="sm"
                          aria-label="Edit"
                          icon={<FaEdit />}
                          onClick={() => handleEditSchedule(schedule)}
                          colorScheme="blue"
                          variant="ghost"
                        />
                      </Tooltip>
                      <Tooltip label="Delete">
                        <IconButton
                          size="sm"
                          aria-label="Delete"
                          icon={<FaTrash />}
                          onClick={() => deleteSchedule(schedule.id)}
                          colorScheme="red"
                          variant="ghost"
                        />
                      </Tooltip>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </VStack>

      {/* Schedule Configuration Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {isEditing ? 'Edit Schedule' : 'Create Schedule'}
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Schedule Name</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Daily Security Scan"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Workflow</FormLabel>
                <Select
                  value={formData.workflowId}
                  onChange={(e) => setFormData(prev => ({ ...prev, workflowId: e.target.value }))}
                >
                  <option value="">Select workflow...</option>
                  <option value="security-scan">Security Vulnerability Scan</option>
                  <option value="database-maintenance">Database Maintenance</option>
                  <option value="k8s-deployment">Kubernetes Deployment</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Schedule Type</FormLabel>
                <Select
                  value={formData.scheduleType}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduleType: e.target.value }))}
                >
                  <option value="once">Run Once</option>
                  <option value="recurring">Recurring</option>
                </Select>
              </FormControl>

              {formData.scheduleType === 'recurring' && (
                <FormControl>
                  <FormLabel>Schedule Pattern</FormLabel>
                  <Select
                    value={formData.cronPreset}
                    onChange={(e) => setFormData(prev => ({ ...prev, cronPreset: e.target.value }))}
                  >
                    {cronPresets.map(preset => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </Select>
                  {formData.cronPreset === 'custom' && (
                    <Input
                      mt={2}
                      value={formData.customCron}
                      onChange={(e) => setFormData(prev => ({ ...prev, customCron: e.target.value }))}
                      placeholder="0 0 * * *"
                    />
                  )}
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Timezone</FormLabel>
                <Select
                  value={formData.timezone}
                  onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </Select>
              </FormControl>

              <Divider />

              <Text fontWeight="bold">Notifications</Text>
              
              <HStack justify="space-between">
                <Text>Notify on success</Text>
                <Switch
                  isChecked={formData.notifyOnSuccess}
                  onChange={(e) => setFormData(prev => ({ ...prev, notifyOnSuccess: e.target.checked }))}
                />
              </HStack>

              <HStack justify="space-between">
                <Text>Notify on failure</Text>
                <Switch
                  isChecked={formData.notifyOnFailure}
                  onChange={(e) => setFormData(prev => ({ ...prev, notifyOnFailure: e.target.checked }))}
                />
              </HStack>

              {(formData.notifyOnSuccess || formData.notifyOnFailure) && (
                <FormControl>
                  <FormLabel>Email (optional)</FormLabel>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@homelab.ai"
                  />
                </FormControl>
              )}
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSaveSchedule}>
              {isEditing ? 'Update' : 'Create'} Schedule
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};
