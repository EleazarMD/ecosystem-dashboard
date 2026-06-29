/**
 * Lesson Builder — Lesson list + creation form
 * Part of the Lesson Builder control room.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Badge, Button, IconButton, Spinner,
  FormControl, FormLabel, Input, Select, Textarea, FormHelperText,
  SimpleGrid, useToast, useDisclosure, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, Divider, Progress, Tooltip,
} from '@chakra-ui/react';
import {
  FiPlus, FiRefreshCw, FiPlay, FiEye, FiCheckCircle, FiClock,
  FiAlertCircle, FiLoader, FiArrowRight,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  ageBand: string;
  difficulty: number;
  lifecycleState: string;
  estimatedMinutes: number;
  skillCodes: string[];
  createdAt: string;
  updatedAt: string;
}

const STATE_COLORS: Record<string, string> = {
  draft: 'gray',
  spec: 'blue',
  generating: 'orange',
  reviewing: 'yellow',
  approved: 'green',
  published: 'green',
  archived: 'gray',
};

const STATE_ICONS: Record<string, any> = {
  draft: FiClock,
  spec: FiLoader,
  generating: FiLoader,
  reviewing: FiEye,
  approved: FiCheckCircle,
  published: FiCheckCircle,
  archived: FiAlertCircle,
};

interface LessonListProps {
  onSelectLesson: (lessonId: string) => void;
  refreshKey: number;
  onRefresh: () => void;
}

export function LessonList({ onSelectLesson, refreshKey, onRefresh }: LessonListProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const bgHover = useSemanticToken('surface.hover');

  const loadLessons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/learn/lessons');
      const data = await res.json();
      setLessons(Array.isArray(data) ? data : (data.lessons || []));
    } catch {
      toast({ title: 'Failed to load lessons', status: 'error', duration: 2000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadLessons();
  }, [loadLessons, refreshKey]);

  const handleCreate = async (formData: Record<string, any>) => {
    try {
      // Auto-generate lessonCode from title if not provided
      const payload = {
        ...formData,
        lessonCode: formData.lessonCode || formData.title.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 60),
      };
      const res = await fetch('/api/learn/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.id || data.lesson) {
        toast({ title: 'Lesson created', status: 'success', duration: 2000 });
        onClose();
        loadLessons();
        onRefresh();
      } else {
        toast({ title: data.error || 'Failed to create lesson', status: 'error', duration: 3000 });
      }
    } catch {
      toast({ title: 'Failed to create lesson', status: 'error', duration: 3000 });
    }
  };

  const handleStartPipeline = async (lessonId: string) => {
    try {
      const res = await fetch('/api/learn/lessons/orchestrate?action=start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      });
      const data = await res.json();
      if (data.stateTransitioned) {
        toast({ title: data.message, status: 'success', duration: 3000 });
        loadLessons();
        onRefresh();
      } else {
        toast({ title: data.error || data.message, status: 'error', duration: 3000 });
      }
    } catch {
      toast({ title: 'Failed to start pipeline', status: 'error', duration: 3000 });
    }
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={4} color={textSecondary}>Loading lessons...</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="lg" fontWeight="semibold">Lessons</Text>
        <HStack>
          <IconButton aria-label="Refresh" icon={<FiRefreshCw />} size="sm" variant="ghost" onClick={() => { loadLessons(); onRefresh(); }} />
          <Button leftIcon={<FiPlus />} size="sm" colorScheme="blue" onClick={onOpen}>New Lesson</Button>
        </HStack>
      </HStack>

      {lessons.length === 0 ? (
        <Box p={8} textAlign="center" borderWidth={1} borderRadius="lg" borderColor={borderColor}>
          <Text color={textSecondary}>No lessons yet. Create your first lesson to get started.</Text>
        </Box>
      ) : (
        <VStack spacing={2} align="stretch">
          {lessons.map((lesson) => {
            const StateIcon = STATE_ICONS[lesson.lifecycleState] || FiClock;
            return (
              <HStack
                key={lesson.id}
                p={3}
                borderRadius="md"
                border="1px solid"
                borderColor={borderColor}
                _hover={{ bg: bgHover }}
                cursor="pointer"
                onClick={() => onSelectLesson(lesson.id)}
                spacing={3}
              >
                <StateIcon style={{ flexShrink: 0 }} />
                <Box flex={1} minW={0}>
                  <Text fontWeight="medium" noOfLines={1}>{lesson.title}</Text>
                  <Text fontSize="xs" color={textSecondary} noOfLines={1}>
                    {lesson.subject} · {lesson.ageBand} · {lesson.skillCodes?.join(', ') || 'no skills'}
                  </Text>
                </Box>
                <Badge colorScheme={STATE_COLORS[lesson.lifecycleState] || 'gray'} fontSize="xs">
                  {lesson.lifecycleState}
                </Badge>
                {lesson.lifecycleState === 'draft' && (
                  <Tooltip label="Start pipeline">
                    <IconButton
                      aria-label="Start pipeline"
                      icon={<FiPlay />}
                      size="xs"
                      colorScheme="green"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleStartPipeline(lesson.id); }}
                    />
                  </Tooltip>
                )}
                <IconButton
                  aria-label="View details"
                  icon={<FiArrowRight />}
                  size="xs"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); onSelectLesson(lesson.id); }}
                />
              </HStack>
            );
          })}
        </VStack>
      )}

      <CreateLessonModal isOpen={isOpen} onClose={onClose} onCreate={handleCreate} />
    </VStack>
  );
}

// ─── Create Lesson Modal ────────────────────────────────────────────────────

function CreateLessonModal({
  isOpen, onClose, onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (formData: Record<string, any>) => void;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: 'math',
    ageBand: 'middle',
    difficulty: 2,
    estimatedMinutes: 10,
    skillCodes: '',
  });

  const handleSubmit = () => {
    onCreate({
      ...form,
      skillCodes: form.skillCodes.split(',').map((s) => s.trim()).filter(Boolean),
      difficulty: Number(form.difficulty),
      estimatedMinutes: Number(form.estimatedMinutes),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create New Lesson</ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Title</FormLabel>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Fractions with Pizza"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What should the child learn?"
                rows={2}
              />
            </FormControl>

            <SimpleGrid columns={2} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Subject</FormLabel>
                <Select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                  <option value="math">Math</option>
                  <option value="reading">Reading</option>
                  <option value="writing">Writing</option>
                  <option value="analytical">Analytical</option>
                  <option value="science">Science</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Age Band</FormLabel>
                <Select value={form.ageBand} onChange={(e) => setForm({ ...form, ageBand: e.target.value })}>
                  <option value="early">Early (4-7)</option>
                  <option value="middle">Middle (8-10)</option>
                  <option value="tween">Tween (11-13)</option>
                </Select>
              </FormControl>
            </SimpleGrid>

            <SimpleGrid columns={2} spacing={4}>
              <FormControl>
                <FormLabel>Difficulty (1-5)</FormLabel>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Estimated Minutes</FormLabel>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  value={form.estimatedMinutes}
                  onChange={(e) => setForm({ ...form, estimatedMinutes: Number(e.target.value) })}
                />
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel>Skill Codes</FormLabel>
              <Input
                value={form.skillCodes}
                onChange={(e) => setForm({ ...form, skillCodes: e.target.value })}
                placeholder="e.g., TEKS.3.4A, TEKS.3.4B"
              />
              <FormHelperText>Comma-separated curriculum skill codes</FormHelperText>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleSubmit} isDisabled={!form.title}>
            Create Lesson
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
