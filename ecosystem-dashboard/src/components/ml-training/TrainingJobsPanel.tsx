/**
 * Training Jobs Panel
 * Manage and monitor active, queued, and completed training jobs
 * Connected to AI Training Hub API for real-time job data
 */

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Button,
  Badge,
  Icon,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Tabs,
  TabList,
  Tab,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Select,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  PlayIcon,
  StopIcon,
  PauseIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon,
  ClockIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ChartBarIcon,
  EyeIcon,
  SignalIcon,
  ArrowDownTrayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useDGXSparkStream } from '@/hooks/useDGXSparkStream';
import {
  useTrainingJobs,
  useTrainingProjects,
  useJobActions,
  useDGXSparkConnection,
} from '@/hooks/useDGXSparkApi';
import type { TrainingJob as ApiTrainingJob, TrainingProject } from '@/services/dgxSparkApi';

interface DisplayJob {
  id: string;
  name: string;
  model: string;
  dataset: string;
  status: 'running' | 'queued' | 'completed' | 'failed' | 'paused' | 'stopped';
  progress: number;
  currentEpoch: number;
  totalEpochs: number;
  trainingLoss: number;
  validationLoss: number;
  learningRate: number;
  gpu: string;
  startedAt: string;
  estimatedCompletion: string;
  metrics: {
    throughput: number;
    samplesPerSecond: number;
  };
  projectId?: string;
  script?: string;
}

export const TrainingJobsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedJob, setSelectedJob] = useState<DisplayJob | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedScript, setSelectedScript] = useState<string>('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isNewJobOpen,
    onOpen: onNewJobOpen,
    onClose: onNewJobClose,
  } = useDisclosure();
  const toast = useToast();
  const router = useRouter();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceElevated = useSemanticToken('surface.elevated');

  // AI Training Hub API connection
  const { data: streamData, isConnected, isConnecting, reconnect } = useDGXSparkStream();
  const { data: apiJobs, refetch: refetchJobs } = useTrainingJobs({ pollInterval: 10000 });
  const { data: projects } = useTrainingProjects();
  const { startJob, stopJob, isStarting, isStopping } = useJobActions();
  const { checkConnection } = useDGXSparkConnection();

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Format date helper
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  // Convert API jobs to display format
  const jobs: DisplayJob[] = useMemo(() => {
    if (!apiJobs) return [];

    return apiJobs.map((job: ApiTrainingJob) => {
      // Find project name
      const project = projects?.find((p: TrainingProject) => p.id === job.project_id);
      
      return {
        id: job.id,
        name: project?.name || job.project_id,
        model: job.script,
        dataset: '-',
        status: job.status === 'stopped' ? 'stopped' : job.status,
        progress: job.status === 'running' ? 50 : job.status === 'completed' ? 100 : 0,
        currentEpoch: 0,
        totalEpochs: 1,
        trainingLoss: 0,
        validationLoss: 0,
        learningRate: 0,
        gpu: 'DGX Spark',
        startedAt: formatDate(job.started_at),
        estimatedCompletion: job.ended_at ? formatDate(job.ended_at) : 'In Progress',
        metrics: { throughput: 0, samplesPerSecond: 0 },
        projectId: job.project_id,
        script: job.script,
      };
    });
  }, [apiJobs, projects]);

  // Get selected project's scripts
  const selectedProject = useMemo(() => {
    if (!selectedProjectId || !projects) return null;
    return projects.find((p: TrainingProject) => p.id === selectedProjectId);
  }, [selectedProjectId, projects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'green';
      case 'queued':
        return 'yellow';
      case 'completed':
        return 'blue';
      case 'failed':
        return 'red';
      case 'paused':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const filteredJobs = () => {
    switch (activeTab) {
      case 0:
        return jobs;
      case 1:
        return jobs.filter((j) => j.status === 'running');
      case 2:
        return jobs.filter((j) => j.status === 'queued');
      case 3:
        return jobs.filter((j) => j.status === 'completed' || j.status === 'failed');
      default:
        return jobs;
    }
  };

  const handleJobAction = async (jobId: string, action: 'stop' | 'pause' | 'resume' | 'delete') => {
    if (action === 'stop') {
      try {
        await stopJob(jobId);
        toast({
          title: 'Job Stopped',
          description: `Job ${jobId} has been stopped`,
          status: 'success',
          duration: 3000,
        });
        refetchJobs();
      } catch (err) {
        toast({
          title: 'Failed to Stop Job',
          description: err instanceof Error ? err.message : 'Unknown error',
          status: 'error',
          duration: 5000,
        });
      }
    } else {
      toast({
        title: `Job ${action}`,
        description: `Action "${action}" is not yet supported`,
        status: 'info',
        duration: 3000,
      });
    }
  };

  const handleStartJob = async () => {
    if (!selectedProjectId || !selectedScript) {
      toast({
        title: 'Missing Selection',
        description: 'Please select a project and script',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      const result = await startJob({
        project_id: selectedProjectId,
        script: selectedScript,
      });
      toast({
        title: 'Job Started',
        description: `Job ${result.job_id} started successfully`,
        status: 'success',
        duration: 3000,
      });
      onNewJobClose();
      setSelectedProjectId('');
      setSelectedScript('');
      refetchJobs();
    } catch (err) {
      toast({
        title: 'Failed to Start Job',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleViewDetails = (job: DisplayJob) => {
    // Navigate to live training page with this job selected
    router.push(`/ml-training?section=live-progress&job=${job.id}`);
    return;
    setSelectedJob(job);
    onOpen();
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <Box>
          <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
            Training Jobs
          </Text>
          <Text fontSize="sm" color={textSecondary}>
            Monitor and manage model training jobs
          </Text>
        </Box>
        <Button
          colorScheme="purple"
          leftIcon={<Icon as={PlayIcon} boxSize={4} />}
          onClick={onNewJobOpen}
        >
          New Training Job
        </Button>
      </HStack>

      {/* Summary Stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <GlassPanel p={4}>
          <HStack>
            <Icon as={PlayIcon} boxSize={5} color="green.400" />
            <Box>
              <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
                {jobs.filter((j) => j.status === 'running').length}
              </Text>
              <Text fontSize="xs" color={textSecondary}>
                Running
              </Text>
            </Box>
          </HStack>
        </GlassPanel>
        <GlassPanel p={4}>
          <HStack>
            <Icon as={ClockIcon} boxSize={5} color="yellow.400" />
            <Box>
              <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
                {jobs.filter((j) => j.status === 'queued').length}
              </Text>
              <Text fontSize="xs" color={textSecondary}>
                Queued
              </Text>
            </Box>
          </HStack>
        </GlassPanel>
        <GlassPanel p={4}>
          <HStack>
            <Icon as={CpuChipIcon} boxSize={5} color="purple.400" />
            <Box>
              <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
                2 / 3
              </Text>
              <Text fontSize="xs" color={textSecondary}>
                GPUs in Use
              </Text>
            </Box>
          </HStack>
        </GlassPanel>
        <GlassPanel p={4}>
          <HStack>
            <Icon as={ChartBarIcon} boxSize={5} color="blue.400" />
            <Box>
              <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
                {jobs.filter((j) => j.status === 'completed').length}
              </Text>
              <Text fontSize="xs" color={textSecondary}>
                Completed
              </Text>
            </Box>
          </HStack>
        </GlassPanel>
      </SimpleGrid>

      {/* Jobs Table */}
      <GlassPanel p={4}>
        <Tabs index={activeTab} onChange={setActiveTab} variant="soft-rounded" colorScheme="purple" size="sm" mb={4}>
          <TabList>
            <Tab>All ({jobs.length})</Tab>
            <Tab>Running ({jobs.filter((j) => j.status === 'running').length})</Tab>
            <Tab>Queued ({jobs.filter((j) => j.status === 'queued').length})</Tab>
            <Tab>History</Tab>
          </TabList>
        </Tabs>

        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th color={textSecondary}>Job Name</Th>
                <Th color={textSecondary}>Model</Th>
                <Th color={textSecondary}>Status</Th>
                <Th color={textSecondary}>Progress</Th>
                <Th color={textSecondary}>Loss</Th>
                <Th color={textSecondary}>Resource</Th>
                <Th color={textSecondary}>ETA</Th>
                <Th color={textSecondary}>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredJobs().map((job) => (
                <Tr key={job.id} _hover={{ bg: surfaceElevated }}>
                  <Td>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium" color={textPrimary}>
                        {job.name}
                      </Text>
                      <Text fontSize="xs" color={textSecondary}>
                        {job.dataset}
                      </Text>
                    </VStack>
                  </Td>
                  <Td>
                    <Text fontSize="sm" color={textSecondary}>
                      {(job.model || "").split('/').pop()}
                    </Text>
                  </Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(job.status)}>{job.status}</Badge>
                  </Td>
                  <Td>
                    <VStack align="start" spacing={1} minW="100px">
                      <Progress
                        value={job.progress}
                        size="xs"
                        colorScheme="purple"
                        w="full"
                        borderRadius="full"
                      />
                      <Text fontSize="xs" color={textSecondary}>
                        Epoch {job.currentEpoch}/{job.totalEpochs} ({job.progress}%)
                      </Text>
                    </VStack>
                  </Td>
                  <Td>
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" color="green.400" fontFamily="mono">
                        {job.trainingLoss > 0 ? job.trainingLoss.toFixed(4) : '-'}
                      </Text>
                      <Text fontSize="xs" color={textSecondary}>
                        val: {job.validationLoss > 0 ? job.validationLoss.toFixed(4) : '-'}
                      </Text>
                    </VStack>
                  </Td>
                  <Td>
                    <Text fontSize="sm" color={textSecondary}>
                      {job.gpu}
                    </Text>
                  </Td>
                  <Td>
                    <Text fontSize="sm" color={textSecondary}>
                      {job.estimatedCompletion}
                    </Text>
                  </Td>
                  <Td>
                    <HStack spacing={1}>
                      <IconButton
                        aria-label="View details"
                        icon={<Icon as={EyeIcon} boxSize={4} />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(job)}
                      />
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          aria-label="More actions"
                          icon={<Icon as={EllipsisVerticalIcon} boxSize={4} />}
                          size="sm"
                          variant="ghost"
                        />
                        <MenuList bg={surfaceElevated}>
                          {job.status === 'running' && (
                            <>
                              <MenuItem
                                icon={<Icon as={PauseIcon} boxSize={4} />}
                                onClick={() => handleJobAction(job.id, 'pause')}
                              >
                                Pause
                              </MenuItem>
                              <MenuItem
                                icon={<Icon as={StopIcon} boxSize={4} />}
                                onClick={() => handleJobAction(job.id, 'stop')}
                                color="red.400"
                              >
                                Stop
                              </MenuItem>
                            </>
                          )}
                          {job.status === 'paused' && (
                            <MenuItem
                              icon={<Icon as={PlayIcon} boxSize={4} />}
                              onClick={() => handleJobAction(job.id, 'resume')}
                            >
                              Resume
                            </MenuItem>
                          )}
                          {job.status === 'completed' && (
                            <MenuItem icon={<Icon as={ArrowDownTrayIcon} boxSize={4} />}>
                              Download Model
                            </MenuItem>
                          )}
                          <MenuItem icon={<Icon as={DocumentTextIcon} boxSize={4} />}>
                            View Logs
                          </MenuItem>
                          <MenuItem
                            icon={<Icon as={TrashIcon} boxSize={4} />}
                            onClick={() => handleJobAction(job.id, 'delete')}
                            color="red.400"
                          >
                            Delete
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </GlassPanel>

      {/* Job Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={surfaceElevated}>
          <ModalHeader color={textPrimary}>
            {selectedJob?.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedJob && (
              <VStack spacing={4} align="stretch">
                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <Text fontSize="xs" color={textSecondary}>Model</Text>
                    <Text color={textPrimary}>{selectedJob.model}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={textSecondary}>Dataset</Text>
                    <Text color={textPrimary}>{selectedJob.dataset}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={textSecondary}>Learning Rate</Text>
                    <Text color={textPrimary} fontFamily="mono">
                      {selectedJob.learningRate}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={textSecondary}>Throughput</Text>
                    <Text color={textPrimary}>
                      {selectedJob.metrics.samplesPerSecond} samples/s
                    </Text>
                  </Box>
                </SimpleGrid>

                <Box h="150px" border="1px dashed" borderColor={borderSubtle} borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                  <Text color={textSecondary}>Training loss curve chart</Text>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New Job Modal */}
      <Modal isOpen={isNewJobOpen} onClose={onNewJobClose} size="lg">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={surfaceElevated}>
          <ModalHeader color={textPrimary}>Start New Training Job</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {!isConnected && (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  Training Hub is not connected. Jobs cannot be started.
                </Alert>
              )}
              <FormControl isRequired>
                <FormLabel color={textPrimary}>Project</FormLabel>
                <Select
                  placeholder="Select a project"
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setSelectedScript('');
                  }}
                  isDisabled={!isConnected}
                >
                  {projects?.map((project: TrainingProject) => (
                    <option key={project.id} value={project.id}>
                      {project.name || project.id}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel color={textPrimary}>Training Script</FormLabel>
                <Select
                  placeholder="Select a script"
                  value={selectedScript}
                  onChange={(e) => setSelectedScript(e.target.value)}
                  isDisabled={!selectedProjectId || !isConnected}
                >
                  {selectedProject?.scripts?.map((script: string) => (
                    <option key={script} value={script}>
                      {script}
                    </option>
                  ))}
                </Select>
              </FormControl>
              {selectedProjectId && selectedScript && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Ready to start</Text>
                    <Text fontSize="sm">
                      Project: {selectedProjectId} | Script: {selectedScript}
                    </Text>
                  </Box>
                </Alert>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onNewJobClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              leftIcon={<Icon as={PlayIcon} boxSize={4} />}
              onClick={handleStartJob}
              isLoading={isStarting}
              isDisabled={!selectedProjectId || !selectedScript || !isConnected}
            >
              Start Training
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default TrainingJobsPanel;
