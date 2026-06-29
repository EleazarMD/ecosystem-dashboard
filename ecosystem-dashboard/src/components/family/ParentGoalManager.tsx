/**
 * ParentGoalManager — Phase 7 control-plane component.
 *
 * Lets parents create, view, and manage learning goals that steer the
 * planner's next-best-action. Goals map to skill codes and remain active
 * for a configurable duration (default 7 days).
 *
 * Backend: /api/learn/parent/goals (CRUD)
 * Service: ParentGoalService (in-process, injects getActiveGoalSkillCodes
 *   into composePlan as assignmentSkillCodes).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Badge, Button, IconButton,
  Card, CardBody, Input, Textarea, Select, NumberInput,
  NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, Checkbox, CheckboxGroup, Wrap, WrapItem,
  Spinner, Center, useToast, Divider, Heading,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay, useDisclosure,
} from '@chakra-ui/react';
import { FiPlus, FiX, FiCheck, FiTarget, FiClock, FiTrash2 } from 'react-icons/fi';

interface ParentGoal {
  id: string;
  childId: string;
  parentId: string;
  title: string;
  description?: string;
  skillCodes: string[];
  durationDays: number;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  createdAt: number;
  expiresAt: number;
  completedAt?: number;
}

interface ParentGoalManagerProps {
  childId: string;
  childName: string;
}

const SKILL_OPTIONS: Array<{ code: string; label: string; domain: string }> = [
  { code: 'math.counting', label: 'Math: Counting', domain: 'math' },
  { code: 'math.addition', label: 'Math: Addition', domain: 'math' },
  { code: 'math.subtraction', label: 'Math: Subtraction', domain: 'math' },
  { code: 'math.multiplication', label: 'Math: Multiplication', domain: 'math' },
  { code: 'math.division', label: 'Math: Division', domain: 'math' },
  { code: 'math.fractions', label: 'Math: Fractions', domain: 'math' },
  { code: 'math.word_problems', label: 'Math: Word Problems', domain: 'math' },
  { code: 'reading.comp.literal', label: 'Reading: Literal Comprehension', domain: 'reading' },
  { code: 'reading.comp.inferential', label: 'Reading: Inferential Comprehension', domain: 'reading' },
  { code: 'reading.vocabulary', label: 'Reading: Vocabulary', domain: 'reading' },
  { code: 'reading.fluency', label: 'Reading: Fluency', domain: 'reading' },
  { code: 'writing.grammar', label: 'Writing: Grammar', domain: 'writing' },
  { code: 'writing.structure', label: 'Writing: Structure', domain: 'writing' },
  { code: 'writing.creativity', label: 'Writing: Creative Writing', domain: 'writing' },
  { code: 'science.observation', label: 'Science: Observation', domain: 'science' },
  { code: 'science.hypothesis', label: 'Science: Hypothesis', domain: 'science' },
  { code: 'science.data_collection', label: 'Science: Data Collection', domain: 'science' },
  { code: 'meta.learning_awareness', label: 'Meta: Learning Awareness', domain: 'meta' },
];

const DOMAIN_COLORS: Record<string, string> = {
  math: 'blue',
  reading: 'green',
  writing: 'orange',
  science: 'purple',
  meta: 'gray',
};

function formatExpiry(expiresAt: number): string {
  const now = Date.now();
  const ms = expiresAt - now;
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Expired';
  if (days === 1) return 'Expires today';
  return `Expires in ${days} days`;
}

export default function ParentGoalManager({ childId, childName }: ParentGoalManagerProps) {
  const [goals, setGoals] = useState<ParentGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState(7);

  // Delete dialog
  const [goalToDelete, setGoalToDelete] = useState<ParentGoal | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch(`/api/learn/parent/goals?childId=${childId}&includeInactive=true`);
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals || []);
      }
    } catch {
      // silent — toast on action
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleCreate = async () => {
    if (!title.trim() || selectedSkills.length === 0) {
      toast({
        title: 'Title and at least one skill are required',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/learn/parent/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          title: title.trim(),
          description: description.trim() || undefined,
          skillCodes: selectedSkills,
          durationDays,
        }),
      });

      if (res.ok) {
        toast({ title: 'Goal created!', status: 'success', duration: 3000 });
        setTitle('');
        setDescription('');
        setSelectedSkills([]);
        setDurationDays(7);
        setShowForm(false);
        fetchGoals();
      } else {
        const data = await res.json();
        toast({ title: data.error || 'Failed to create goal', status: 'error', duration: 4000 });
      }
    } catch {
      toast({ title: 'Network error', status: 'error', duration: 4000 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelGoal = async (goal: ParentGoal) => {
    try {
      const res = await fetch('/api/learn/parent/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: goal.id, action: 'cancel' }),
      });

      if (res.ok) {
        toast({ title: 'Goal cancelled', status: 'info', duration: 3000 });
        fetchGoals();
      }
    } catch {
      toast({ title: 'Failed to cancel goal', status: 'error', duration: 4000 });
    }
    onClose();
    setGoalToDelete(null);
  };

  const handleCompleteGoal = async (goal: ParentGoal) => {
    try {
      const res = await fetch('/api/learn/parent/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: goal.id, action: 'complete' }),
      });

      if (res.ok) {
        toast({ title: 'Goal completed! 🎉', status: 'success', duration: 3000 });
        fetchGoals();
      }
    } catch {
      toast({ title: 'Failed to complete goal', status: 'error', duration: 4000 });
    }
  };

  const activeGoals = goals.filter((g) => g.status === 'active');
  const pastGoals = goals.filter((g) => g.status !== 'active');

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={0}>
          <Heading size="sm">Learning Goals</Heading>
          <Text fontSize="xs" color="gray.500">
            Set focus areas that steer {childName}'s learning plan toward specific skills.
          </Text>
        </VStack>
        {!showForm && (
          <Button
            leftIcon={<FiPlus />}
            size="sm"
            colorScheme="purple"
            onClick={() => setShowForm(true)}
          >
            New Goal
          </Button>
        )}
      </HStack>

      {showForm && (
        <Card borderWidth="1px" borderColor="purple.200" borderRadius="lg">
          <CardBody p={4}>
            <VStack spacing={3} align="stretch">
              <Heading size="xs" color="purple.600">Create a Learning Goal</Heading>

              <Box>
                <Text fontSize="xs" fontWeight="600" mb={1}>Title</Text>
                <Input
                  size="sm"
                  placeholder="e.g., Focus on multiplication this week"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Box>

              <Box>
                <Text fontSize="xs" fontWeight="600" mb={1}>Description (optional)</Text>
                <Textarea
                  size="sm"
                  placeholder="Why this goal? Any context for the AI tutor..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </Box>

              <Box>
                <Text fontSize="xs" fontWeight="600" mb={2}>Skills to focus on</Text>
                <CheckboxGroup value={selectedSkills} onChange={(vals) => setSelectedSkills(vals as string[])}>
                  <Wrap spacing={2}>
                    {SKILL_OPTIONS.map((skill) => (
                      <WrapItem key={skill.code}>
                        <Checkbox value={skill.code} size="sm" colorScheme={DOMAIN_COLORS[skill.domain] || 'gray'}>
                          {skill.label}
                        </Checkbox>
                      </WrapItem>
                    ))}
                  </Wrap>
                </CheckboxGroup>
              </Box>

              <Box>
                <Text fontSize="xs" fontWeight="600" mb={1}>Duration (days)</Text>
                <NumberInput
                  size="sm"
                  min={1}
                  max={30}
                  value={durationDays}
                  onChange={(_, val) => setDurationDays(val || 7)}
                >
                  <NumberInputField w="100px" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Box>

              <HStack justify="flex-end" spacing={2}>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  colorScheme="purple"
                  leftIcon={<FiCheck />}
                  onClick={handleCreate}
                  isLoading={submitting}
                >
                  Create Goal
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <Center py={6}><Spinner size="sm" color="purple.500" /></Center>
      ) : activeGoals.length === 0 && !showForm ? (
        <Box p={4} borderRadius="lg" borderWidth="1px" borderColor="gray.200" textAlign="center">
          <Text fontSize="sm" color="gray.500">
            No active goals. Create one to steer {childName}'s learning plan toward specific skills.
          </Text>
        </Box>
      ) : (
        <VStack spacing={3} align="stretch">
          {activeGoals.map((goal) => (
            <Card key={goal.id} borderWidth="1px" borderRadius="lg" borderColor="purple.100">
              <CardBody p={4}>
                <VStack spacing={2} align="stretch">
                  <HStack justify="space-between">
                    <HStack spacing={2}>
                      <FiTarget color="var(--chakra-colors-purple-500)" />
                      <Text fontWeight="600" fontSize="sm">{goal.title}</Text>
                    </HStack>
                    <Badge colorScheme="green" fontSize="2xs">Active</Badge>
                  </HStack>

                  {goal.description && (
                    <Text fontSize="xs" color="gray.600">{goal.description}</Text>
                  )}

                  <Wrap spacing={1}>
                    {goal.skillCodes.map((code) => {
                      const skill = SKILL_OPTIONS.find((s) => s.code === code);
                      const domain = skill?.domain || 'meta';
                      return (
                        <WrapItem key={code}>
                          <Badge colorScheme={DOMAIN_COLORS[domain] || 'gray'} fontSize="2xs" variant="subtle">
                            {skill?.label || code}
                          </Badge>
                        </WrapItem>
                      );
                    })}
                  </Wrap>

                  <HStack justify="space-between">
                    <HStack spacing={1} fontSize="2xs" color="gray.400">
                      <FiClock />
                      <Text>{formatExpiry(goal.expiresAt)}</Text>
                    </HStack>
                    <HStack spacing={1}>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorScheme="green"
                        leftIcon={<FiCheck />}
                        onClick={() => handleCompleteGoal(goal)}
                      >
                        Complete
                      </Button>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        icon={<FiTrash2 />}
                        aria-label="Cancel goal"
                        onClick={() => { setGoalToDelete(goal); onOpen(); }}
                      />
                    </HStack>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </VStack>
      )}

      {pastGoals.length > 0 && (
        <>
          <Divider />
          <Text fontSize="xs" fontWeight="600" color="gray.400" textTransform="uppercase">
            Past Goals
          </Text>
          <VStack spacing={2} align="stretch">
            {pastGoals.map((goal) => (
              <HStack key={goal.id} justify="space-between" opacity={0.6}>
                <HStack spacing={2}>
                  <Text fontSize="sm" textDecoration={goal.status === 'completed' ? 'line-through' : 'none'}>
                    {goal.title}
                  </Text>
                  <Badge fontSize="2xs" colorScheme={
                    goal.status === 'completed' ? 'green' :
                    goal.status === 'cancelled' ? 'red' : 'gray'
                  }>
                    {goal.status}
                  </Badge>
                </HStack>
                <Text fontSize="2xs" color="gray.400">
                  {new Date(goal.createdAt).toLocaleDateString()}
                </Text>
              </HStack>
            ))}
          </VStack>
        </>
      )}

      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="sm" fontWeight="bold">
              Cancel this goal?
            </AlertDialogHeader>
            <AlertDialogBody fontSize="sm">
              "{goalToDelete?.title}" will be cancelled. {childName}'s learning plan will no longer prioritize these skills.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} size="sm" onClick={onClose}>Keep Goal</Button>
              <Button size="sm" colorScheme="red" ml={3} onClick={() => goalToDelete && handleCancelGoal(goalToDelete)}>
                Cancel Goal
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </VStack>
  );
}
