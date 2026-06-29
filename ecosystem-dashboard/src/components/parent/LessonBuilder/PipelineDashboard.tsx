/**
 * Pipeline Dashboard — shows a lesson's pipeline status, task progress,
 * and allows dispatching/executing tasks and advancing the pipeline.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Badge, Button, Spinner, Progress,
  IconButton, Tooltip, Divider, SimpleGrid, Stat, StatLabel,
  StatNumber, StatHelpText, useToast, Alert, AlertIcon,
} from '@chakra-ui/react';
import {
  FiRefreshCw, FiPlay, FiZap, FiCheckCircle, FiClock,
  FiLoader, FiAlertCircle, FiEye, FiArrowRight,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PipelineStatus {
  lesson: {
    id: string;
    title: string;
    lifecycleState: string;
    designSpec: any;
  };
  phase: {
    state: string;
    leadAgent: string;
    description: string;
  } | null;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  failedTasks: number;
  totalSteps: number;
  totalAssets: number;
  totalReviews: number;
  readyToAdvance: boolean;
  nextAction: string;
}

interface Task {
  id: string;
  agentId: string;
  taskType: string;
  status: string;
  stepId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

const TASK_STATUS_ICONS: Record<string, any> = {
  pending: FiClock,
  in_progress: FiLoader,
  completed: FiCheckCircle,
  failed: FiAlertCircle,
  skipped: FiCheckCircle,
};

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: 'gray',
  in_progress: 'blue',
  completed: 'green',
  failed: 'red',
  skipped: 'gray',
};

const AGENT_LABELS: Record<string, string> = {
  'claude-opus': 'Claude Opus',
  'gpt-5.5': 'GPT 5.5',
  'gemini-image-pro': 'Gemini Image Pro',
  'nano-banana': 'Nano Banana',
  'minimax-m3': 'MiniMax M3',
  'local-llm': 'Local LLM',
  'human': 'Human',
};

const STATE_COLORS: Record<string, string> = {
  draft: 'gray', spec: 'blue', generating: 'orange',
  reviewing: 'yellow', approved: 'green', published: 'green', archived: 'gray',
};

interface PipelineDashboardProps {
  lessonId: string;
  onPublishComplete: () => void;
}

export function PipelineDashboard({ lessonId, onPublishComplete }: PipelineDashboardProps) {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const bgHover = useSemanticToken('surface.hover');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, fullRes] = await Promise.all([
        fetch(`/api/learn/lessons/orchestrate?action=status&id=${lessonId}`),
        fetch(`/api/learn/lessons?id=${lessonId}`),
      ]);
      const statusData = await statusRes.json();
      const fullData = await fullRes.json();
      setStatus(statusData);
      setTasks(fullData.tasks || []);
    } catch {
      toast({ title: 'Failed to load pipeline status', status: 'error', duration: 2000 });
    } finally {
      setLoading(false);
    }
  }, [lessonId, toast]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const handleDispatch = async () => {
    try {
      const res = await fetch('/api/learn/lessons/orchestrate?action=dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      });
      const data = await res.json();
      toast({ title: data.message, status: data.stateTransitioned ? 'success' : 'info', duration: 3000 });
      load();
    } catch {
      toast({ title: 'Failed to dispatch', status: 'error', duration: 3000 });
    }
  };

  const handleExecuteTask = async (taskId: string) => {
    setExecuting(taskId);
    try {
      const res = await fetch('/api/learn/lessons/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: data.pipelineAdvanced ? 'Pipeline advanced!' : 'Task completed',
          description: data.message,
          status: 'success',
          duration: 4000,
        });
      } else {
        toast({
          title: 'Task failed',
          description: data.error,
          status: 'error',
          duration: 4000,
        });
      }
      load();
    } catch {
      toast({ title: 'Failed to execute task', status: 'error', duration: 3000 });
    } finally {
      setExecuting(null);
    }
  };

  const handlePublish = async () => {
    try {
      const res = await fetch('/api/learn/lessons/orchestrate?action=publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, publishedBy: 'parent' }),
      });
      const data = await res.json();
      if (data.id) {
        toast({ title: 'Lesson published!', status: 'success', duration: 4000 });
        onPublishComplete();
      } else {
        toast({ title: data.error || 'Failed to publish', status: 'error', duration: 3000 });
      }
    } catch {
      toast({ title: 'Failed to publish', status: 'error', duration: 3000 });
    }
  };

  if (loading && !status) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={4} color={textSecondary}>Loading pipeline...</Text>
      </Box>
    );
  }

  if (!status) return null;

  const progressPct = status.totalTasks > 0
    ? Math.round((status.completedTasks / status.totalTasks) * 100)
    : 0;

  return (
    <VStack spacing={4} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <VStack align="start" spacing={0}>
          <Text fontSize="lg" fontWeight="semibold">{status.lesson.title}</Text>
          <HStack spacing={2}>
            <Badge colorScheme={STATE_COLORS[status.lesson.lifecycleState] || 'gray'}>
              {status.lesson.lifecycleState}
            </Badge>
            {status.phase && (
              <Text fontSize="xs" color={textSecondary}>{status.phase.description}</Text>
            )}
          </HStack>
        </VStack>
        <HStack>
          <IconButton aria-label="Refresh" icon={<FiRefreshCw />} size="sm" variant="ghost" onClick={load} />
          {status.lesson.lifecycleState === 'generating' && status.pendingTasks > 0 && (
            <Button size="sm" colorScheme="blue" leftIcon={<FiZap />} onClick={handleDispatch}>
              Dispatch ({status.pendingTasks})
            </Button>
          )}
          {status.lesson.lifecycleState === 'approved' && (
            <Button size="sm" colorScheme="green" leftIcon={<FiCheckCircle />} onClick={handlePublish}>
              Publish
            </Button>
          )}
        </HStack>
      </HStack>

      {/* Progress bar */}
      <Box>
        <HStack justify="space-between" mb={1}>
          <Text fontSize="sm" fontWeight="medium">Pipeline Progress</Text>
          <Text fontSize="xs" color={textSecondary}>{progressPct}% ({status.completedTasks}/{status.totalTasks} tasks)</Text>
        </HStack>
        <Progress value={progressPct} size="sm" colorScheme="blue" borderRadius="full" />
      </Box>

      {/* Stats */}
      <SimpleGrid columns={4} spacing={3}>
        <StatCard label="Steps" value={status.totalSteps} icon={FiEye} color="purple" />
        <StatCard label="Assets" value={status.totalAssets} icon={FiCheckCircle} color="blue" />
        <StatCard label="Reviews" value={status.totalReviews} icon={FiEye} color="yellow" />
        <StatCard label="Failed" value={status.failedTasks} icon={FiAlertCircle} color="red" />
      </SimpleGrid>

      {/* Next action alert */}
      <Alert status={status.failedTasks > 0 ? 'error' : 'info'} borderRadius="md" fontSize="sm">
        <AlertIcon />
        <Text>{status.nextAction}</Text>
      </Alert>

      <Divider />

      {/* Task list */}
      <VStack spacing={2} align="stretch">
        <Text fontSize="sm" fontWeight="semibold">Tasks</Text>
        {tasks.length === 0 ? (
          <Text fontSize="sm" color={textSecondary}>No tasks yet.</Text>
        ) : (
          tasks.map((task) => {
            const TaskIcon = TASK_STATUS_ICONS[task.status] || FiClock;
            const isExecuting = executing === task.id;
            const canExecute = task.status === 'pending' || task.status === 'in_progress';
            return (
              <HStack
                key={task.id}
                p={2}
                borderRadius="md"
                border="1px solid"
                borderColor={borderColor}
                _hover={{ bg: bgHover }}
                spacing={3}
              >
                <TaskIcon style={{ flexShrink: 0 }} />
                <Box flex={1} minW={0}>
                  <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                    {task.taskType.replace(/_/g, ' ')}
                  </Text>
                  <Text fontSize="xs" color={textSecondary}>
                    {AGENT_LABELS[task.agentId] || task.agentId}
                    {task.errorMessage && ` · ${task.errorMessage}`}
                  </Text>
                </Box>
                <Badge colorScheme={TASK_STATUS_COLORS[task.status] || 'gray'} fontSize="xs">
                  {task.status}
                </Badge>
                {canExecute && task.agentId !== 'human' && (
                  <Tooltip label="Execute task">
                    <IconButton
                      aria-label="Execute task"
                      icon={isExecuting ? <Spinner size="xs" /> : <FiPlay />}
                      size="xs"
                      colorScheme="green"
                      variant="ghost"
                      isLoading={isExecuting}
                      onClick={() => handleExecuteTask(task.id)}
                    />
                  </Tooltip>
                )}
              </HStack>
            );
          })
        )}
      </VStack>
    </VStack>
  );
}

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string; value: number; icon: any; color: string;
}) {
  const textSecondary = useSemanticToken('text.secondary');
  return (
    <Box p={2} borderRadius="md" borderWidth={1} borderColor={useSemanticToken('border.default')}>
      <HStack spacing={2}>
        <Icon style={{ color: `var(--chakra-colors-${color}-500, ${color})` }} />
        <Box>
          <Stat>
            <StatLabel fontSize="xs" color={textSecondary}>{label}</StatLabel>
            <StatNumber fontSize="md">{value}</StatNumber>
          </Stat>
        </Box>
      </HStack>
    </Box>
  );
}
