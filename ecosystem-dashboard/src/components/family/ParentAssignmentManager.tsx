/**
 * Parent Assignment Manager
 *
 * Parent-facing UI for creating and managing learning assignments.
 * Parents select a skill, add an optional note and due date, and the
 * assignment appears as a priority activity in the child's next plan.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  Select,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
  IconButton,
  Wrap,
  WrapItem,
  Card,
  CardBody,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiTarget,
} from 'react-icons/fi';

interface Assignment {
  id: string;
  childId: string;
  parentUserId: string;
  skillCode: string;
  title: string | null;
  notes: string | null;
  status: 'assigned' | 'completed' | 'archived' | 'cancelled';
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface ParentAssignmentManagerProps {
  childId: string;
  childName: string;
}

const SKILL_OPTIONS = [
  { code: 'math.addition', label: 'Math — Addition' },
  { code: 'math.subtraction', label: 'Math — Subtraction' },
  { code: 'math.multiplication', label: 'Math — Multiplication' },
  { code: 'math.division', label: 'Math — Division' },
  { code: 'math.fractions', label: 'Math — Fractions' },
  { code: 'reading.comp.literal', label: 'Reading — Comprehension' },
  { code: 'reading.comp.inferential', label: 'Reading — Inferential Comprehension' },
  { code: 'reading.vocab', label: 'Reading — Vocabulary' },
  { code: 'writing.narrative', label: 'Writing — Narrative' },
  { code: 'writing.opinion', label: 'Writing — Opinion' },
  { code: 'analytical.infer_evidence', label: 'Thinking — Inference with Evidence' },
  { code: 'analytical.patterns', label: 'Thinking — Pattern Detection' },
];

const STATUS_COLORS: Record<string, string> = {
  assigned: 'blue',
  completed: 'green',
  archived: 'gray',
  cancelled: 'red',
};

export default function ParentAssignmentManager({ childId, childName }: ParentAssignmentManagerProps) {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [skillCode, setSkillCode] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/learn/assignments?childId=${childId}`);
      const data = await res.json();
      if (res.ok) {
        setAssignments(data.assignments || []);
      } else {
        toast({ title: 'Failed to load assignments', status: 'error', duration: 3000 });
      }
    } catch {
      toast({ title: 'Failed to load assignments', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [childId, toast]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleCreate = async () => {
    if (!skillCode) {
      toast({ title: 'Please select a skill', status: 'warning', duration: 3000 });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/learn/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          skillCode,
          title: title || undefined,
          notes: notes || undefined,
          dueDate: dueDate || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: 'Assignment created!', status: 'success', duration: 3000 });
        onClose();
        setSkillCode('');
        setTitle('');
        setNotes('');
        setDueDate('');
        fetchAssignments();
      } else {
        const data = await res.json();
        toast({ title: data.error || 'Failed to create', status: 'error', duration: 3000 });
      }
    } catch {
      toast({ title: 'Failed to create assignment', status: 'error', duration: 3000 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (assignmentId: string) => {
    try {
      const res = await fetch('/api/learn/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, status: 'cancelled' }),
      });
      if (res.ok) {
        toast({ title: 'Assignment cancelled', status: 'info', duration: 3000 });
        fetchAssignments();
      }
    } catch {
      toast({ title: 'Failed to cancel', status: 'error', duration: 3000 });
    }
  };

  const activeAssignments = assignments.filter((a) => a.status === 'assigned');
  const completedAssignments = assignments.filter((a) => a.status === 'completed');
  const cancelledAssignments = assignments.filter((a) => a.status === 'cancelled' || a.status === 'archived');

  const skillLabel = (code: string) => SKILL_OPTIONS.find((s) => s.code === code)?.label || code;

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={0}>
          <Heading size="sm">Parent Assignments</Heading>
          <Text fontSize="sm" color="gray.500">
            Assign practice skills — they appear as priority activities in {childName}'s next session
          </Text>
        </VStack>
        <Button leftIcon={<FiPlus />} colorScheme="purple" size="sm" onClick={onOpen}>
          New Assignment
        </Button>
      </HStack>

      {loading ? (
        <Box textAlign="center" py={6}>
          <Spinner size="md" />
        </Box>
      ) : assignments.length === 0 ? (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <AlertDescription>
            No assignments yet. Create one to guide {childName}'s next practice session.
          </AlertDescription>
        </Alert>
      ) : (
        <VStack align="stretch" spacing={4}>
          {/* Active Assignments */}
          {activeAssignments.length > 0 && (
            <VStack align="stretch" spacing={2}>
              <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
                Active ({activeAssignments.length})
              </Text>
              {activeAssignments.map((a) => (
                <Card key={a.id} borderWidth="1px" borderColor="blue.200" borderRadius="md">
                  <CardBody p={4}>
                    <HStack justify="space-between" align="start">
                      <VStack align="start" spacing={1} flex={1}>
                        <HStack>
                          <FiTarget color="var(--chakra-colors-blue-500)" />
                          <Text fontWeight="semibold">{a.title || skillLabel(a.skillCode)}</Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">{skillLabel(a.skillCode)}</Text>
                        {a.notes && <Text fontSize="sm" color="gray.500" mt={1}>{a.notes}</Text>}
                        <Wrap spacing={2} mt={1}>
                          {a.dueDate && (
                            <WrapItem>
                              <Badge colorScheme="orange" variant="subtle" fontSize="xs">
                                <HStack spacing={1}>
                                  <FiClock />
                                  <Text>Due {new Date(a.dueDate).toLocaleDateString()}</Text>
                                </HStack>
                              </Badge>
                            </WrapItem>
                          )}
                          <WrapItem>
                            <Badge colorScheme={STATUS_COLORS[a.status]} variant="subtle" fontSize="xs">
                              {a.status}
                            </Badge>
                          </WrapItem>
                        </Wrap>
                      </VStack>
                      <IconButton
                        aria-label="Cancel assignment"
                        icon={<FiTrash2 />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleCancel(a.id)}
                      />
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          )}

          {/* Completed Assignments */}
          {completedAssignments.length > 0 && (
            <VStack align="stretch" spacing={2}>
              <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
                Completed ({completedAssignments.length})
              </Text>
              {completedAssignments.slice(0, 5).map((a) => (
                <HStack key={a.id} p={3} bg="green.50" borderRadius="md" spacing={3}>
                  <FiCheckCircle color="var(--chakra-colors-green-500)" />
                  <Text fontSize="sm" flex={1}>{a.title || skillLabel(a.skillCode)}</Text>
                  {a.completedAt && (
                    <Text fontSize="xs" color="gray.500">
                      {new Date(a.completedAt).toLocaleDateString()}
                    </Text>
                  )}
                </HStack>
              ))}
            </VStack>
          )}

          {/* Cancelled/Archived */}
          {cancelledAssignments.length > 0 && (
            <Text fontSize="xs" color="gray.400">
              {cancelledAssignments.length} cancelled/archived
            </Text>
          )}
        </VStack>
      )}

      {/* Create Assignment Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>New Assignment for {childName}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontWeight="semibold" fontSize="sm" mb={2}>Skill to practice</Text>
                <Select
                  value={skillCode}
                  onChange={(e) => setSkillCode(e.target.value)}
                  placeholder="Select a skill..."
                >
                  {SKILL_OPTIONS.map((s) => (
                    <option key={s.code} value={s.code}>{s.label}</option>
                  ))}
                </Select>
              </Box>
              <Box>
                <Text fontWeight="semibold" fontSize="sm" mb={2}>Title (optional)</Text>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Practice addition up to 20"
                />
              </Box>
              <Box>
                <Text fontWeight="semibold" fontSize="sm" mb={2}>Notes for child (optional)</Text>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Encouraging words or specific instructions..."
                  rows={2}
                />
              </Box>
              <Box>
                <Text fontWeight="semibold" fontSize="sm" mb={2}>Due date (optional)</Text>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button
              colorScheme="purple"
              onClick={handleCreate}
              isLoading={submitting}
              loadingText="Creating..."
            >
              Create Assignment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
