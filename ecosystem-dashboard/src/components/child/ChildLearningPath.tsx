/**
 * Child Learning Path — Child UI
 *
 * Visualizes the child's individualized learning path with a progress track,
 * step cards, and interactive content. Supports adaptive difficulty.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Heading, Text, Button, Badge, SimpleGrid,
  Spinner, useToast, Progress, Icon, CircularProgress,
  CircularProgressLabel, Alert, AlertIcon, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalCloseButton, ModalFooter, Textarea, Input,
} from '@chakra-ui/react';
import {
  FiMap, FiCheckCircle, FiCircle, FiLock, FiStar, FiZap,
  FiChevronRight, FiRefreshCw, FiPause, FiPlay, FiAward,
} from 'react-icons/fi';
import { SimpleGlassPanel } from '@/components/ui/SimpleGlassPanel';

interface PathStep {
  id: string;
  stepNumber: number;
  title: string;
  description?: string;
  stepEmoji: string;
  customPrompt?: string;
  customContentType?: string;
  skillCode?: string;
  targetDifficulty?: number;
  hints: string[];
  isCompleted: boolean;
  completedAt?: string;
  score?: number;
  timeSpentSeconds?: number;
}

interface LearningPath {
  id: string;
  title: string;
  description?: string;
  pathEmoji: string;
  source: string;
  focusDomains: string[];
  totalSteps: number;
  currentStep: number;
  currentDifficulty: number;
  status: 'active' | 'completed' | 'paused' | 'archived';
  steps: PathStep[];
  completionPct: number;
}

const DIFFICULTY_STARS = (level: number) => '⭐'.repeat(level);

export default function ChildLearningPath() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [activePath, setActivePath] = useState<LearningPath | null>(null);
  const [selectedStep, setSelectedStep] = useState<PathStep | null>(null);
  const [stepResponse, setStepResponse] = useState('');
  const [showHints, setShowHints] = useState(false);
  const [completing, setCompleting] = useState(false);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchPaths = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/child/learning-path?action=active');
      const data = await res.json();
      if (res.ok) {
        setPaths(data.paths || []);
        setActivePath(data.path || (data.paths?.[0] || null));
      }
    } catch (err) {
      console.error('Failed to fetch paths:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaths();
  }, [fetchPaths]);

  const handleGeneratePath = async () => {
    try {
      const res = await fetch('/api/child/learning-path?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        toast({ title: 'New learning path created! 🗺️', status: 'success', duration: 3000 });
        fetchPaths();
      } else {
        const data = await res.json();
        toast({ title: 'Failed to create path', description: data.error, status: 'error', duration: 5000 });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 5000 });
    }
  };

  const handleOpenStep = (step: PathStep) => {
    if (step.isCompleted) return;
    setSelectedStep(step);
    setStepResponse('');
    setShowHints(false);
    onOpen();
  };

  const handleCompleteStep = async () => {
    if (!activePath || !selectedStep) return;
    setCompleting(true);
    try {
      const res = await fetch('/api/child/learning-path?action=complete-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pathId: activePath.id,
          stepNumber: selectedStep.stepNumber,
          score: 1.0,
          timeSpentSeconds: 60,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pathCompleted) {
          toast({ title: '🎉 Path Complete! Congratulations!', status: 'success', duration: 5000 });
        } else {
          toast({ title: `Step ${selectedStep.stepNumber} complete! ${selectedStep.stepEmoji}`, status: 'success', duration: 3000 });
        }
        onClose();
        fetchPaths();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 5000 });
    } finally {
      setCompleting(false);
    }
  };

  const handlePausePath = async () => {
    if (!activePath) return;
    try {
      await fetch(`/api/child/learning-path?action=pause&pathId=${activePath.id}`, { method: 'POST' });
      toast({ title: 'Path paused', status: 'info', duration: 3000 });
      fetchPaths();
    } catch (err) {
      console.error('Failed to pause path:', err);
    }
  };

  const handleResumePath = async () => {
    if (!activePath) return;
    try {
      await fetch(`/api/child/learning-path?action=resume&pathId=${activePath.id}`, { method: 'POST' });
      toast({ title: 'Path resumed!', status: 'success', duration: 3000 });
      fetchPaths();
    } catch (err) {
      console.error('Failed to resume path:', err);
    }
  };

  if (loading) {
    return (
      <VStack justify="center" h="200px">
        <Spinner size="lg" color="purple.400" />
        <Text fontSize="sm" color="gray.500">Loading your learning path...</Text>
      </VStack>
    );
  }

  // No active path
  if (!activePath) {
    return (
      <VStack spacing={6} py={8}>
        <Text fontSize="5xl">🗺️</Text>
        <VStack spacing={2}>
          <Heading size="sm" color="gray.500">No Active Learning Path</Heading>
          <Text fontSize="sm" color="gray.400" textAlign="center" maxW="300px">
            Generate a personalized learning path tailored just for you! It adapts to your skill level and interests.
          </Text>
        </VStack>
        <Button
          leftIcon={<FiMap />}
          colorScheme="purple"
          size="lg"
          onClick={handleGeneratePath}
        >
          Create My Learning Path
        </Button>
      </VStack>
    );
  }

  const completedSteps = activePath.steps.filter((s) => s.isCompleted).length;
  const currentStepData = activePath.steps.find((s) => !s.isCompleted);

  return (
    <VStack spacing={4} align="stretch">
      {/* Path Header */}
      <SimpleGlassPanel p={4}>
        <HStack justify="space-between" align="start">
          <HStack>
            <Text fontSize="3xl">{activePath.pathEmoji}</Text>
            <VStack align="start" spacing={0}>
              <Heading size="sm">{activePath.title}</Heading>
              {activePath.description && (
                <Text fontSize="xs" color="gray.500">{activePath.description}</Text>
              )}
              <HStack mt={1}>
                <Badge colorScheme="purple" fontSize="2xs">
                  Difficulty: {DIFFICULTY_STARS(activePath.currentDifficulty)}
                </Badge>
                {activePath.focusDomains.length > 0 && (
                  <Badge colorScheme="blue" fontSize="2xs">
                    {activePath.focusDomains.join(', ')}
                  </Badge>
                )}
              </HStack>
            </VStack>
          </HStack>
          <HStack>
            {activePath.status === 'active' ? (
              <IconButton aria-label="Pause" icon={<FiPause />} size="xs" variant="ghost" onClick={handlePausePath} />
            ) : activePath.status === 'paused' ? (
              <IconButton aria-label="Resume" icon={<FiPlay />} size="xs" variant="ghost" onClick={handleResumePath} />
            ) : null}
            <IconButton aria-label="Refresh" icon={<FiRefreshCw />} size="xs" variant="ghost" onClick={fetchPaths} />
          </HStack>
        </HStack>
      </SimpleGlassPanel>

      {/* Progress Overview */}
      <SimpleGlassPanel p={4}>
        <HStack justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" fontWeight="bold">Your Progress</Text>
            <Text fontSize="xs" color="gray.500">
              {completedSteps} of {activePath.totalSteps} steps completed
            </Text>
          </VStack>
          <CircularProgress
            value={activePath.completionPct}
            color="purple.400"
            size="60px"
            thickness="8px"
          >
            <CircularProgressLabel fontSize="sm" fontWeight="bold">
              {Math.round(activePath.completionPct)}%
            </CircularProgressLabel>
          </CircularProgress>
        </HStack>
        <Progress
          value={activePath.completionPct}
          colorScheme="purple"
          size="sm"
          borderRadius="full"
          mt={2}
        />
      </SimpleGlassPanel>

      {/* Path Steps */}
      <VStack align="stretch" spacing={2}>
        <Text fontSize="sm" fontWeight="bold">Steps</Text>
        {activePath.steps.map((step, idx) => {
          const isCurrent = !step.isCompleted && activePath.steps.slice(0, idx).every((s) => s.isCompleted);
          const isLocked = !step.isCompleted && !isCurrent && activePath.steps.slice(0, idx).some((s) => !s.isCompleted);

          return (
            <SimpleGlassPanel
              key={step.id}
              p={3}
              cursor={isLocked ? 'not-allowed' : 'pointer'}
              opacity={isLocked ? 0.5 : 1}
              onClick={() => !isLocked && handleOpenStep(step)}
              _hover={!isLocked ? { transform: 'translateY(-2px)', transition: '0.2s' } : {}}
            >
              <HStack justify="space-between">
                <HStack>
                  {/* Step Status Icon */}
                  {step.isCompleted ? (
                    <Icon as={FiCheckCircle} color="green.400" boxSize={5} />
                  ) : isLocked ? (
                    <Icon as={FiLock} color="gray.300" boxSize={5} />
                  ) : isCurrent ? (
                    <Icon as={FiZap} color="purple.400" boxSize={5} />
                  ) : (
                    <Icon as={FiCircle} color="gray.300" boxSize={5} />
                  )}

                  <Text fontSize="lg">{step.stepEmoji}</Text>
                  <VStack align="start" spacing={0}>
                    <Text
                      fontSize="sm"
                      fontWeight={isCurrent ? 'bold' : 'normal'}
                      color={step.isCompleted ? 'gray.400' : 'inherit'}
                      textDecoration={step.isCompleted ? 'line-through' : 'none'}
                    >
                      {step.title}
                    </Text>
                    {step.targetDifficulty && (
                      <Text fontSize="2xs" color="gray.400">
                        {DIFFICULTY_STARS(step.targetDifficulty)}
                      </Text>
                    )}
                  </VStack>
                </HStack>
                <HStack>
                  {step.isCompleted && (
                    <Badge colorScheme="green" fontSize="2xs">✓ Done</Badge>
                  )}
                  {isCurrent && (
                    <Badge colorScheme="purple" fontSize="2xs">Current</Badge>
                  )}
                  {!isLocked && !step.isCompleted && (
                    <Icon as={FiChevronRight} color="gray.400" />
                  )}
                </HStack>
              </HStack>
            </SimpleGlassPanel>
          );
        })}
      </VStack>

      {/* Step Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Text fontSize="2xl">{selectedStep?.stepEmoji}</Text>
              <Text>{selectedStep?.title}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {selectedStep?.description && (
                <Text fontSize="sm" color="gray.600">{selectedStep.description}</Text>
              )}

              {selectedStep?.customPrompt && (
                <Box p={4} borderRadius="md" bg="purple.50">
                  <Text fontSize="sm" fontWeight="medium">
                    {selectedStep.customPrompt}
                  </Text>
                </Box>
              )}

              <Textarea
                placeholder="Write your answer here..."
                value={stepResponse}
                onChange={(e) => setStepResponse(e.target.value)}
                rows={4}
              />

              {/* Hints */}
              {selectedStep && selectedStep.hints.length > 0 && (
                <VStack align="stretch" spacing={2}>
                  <Button
                    size="xs"
                    variant="ghost"
                    colorScheme="yellow"
                    onClick={() => setShowHints(!showHints)}
                  >
                    {showHints ? 'Hide Hints' : `Show ${selectedStep.hints.length} Hints`}
                  </Button>
                  {showHints && (
                    <VStack align="start" spacing={1}>
                      {selectedStep.hints.map((hint, i) => (
                        <HStack key={i}>
                          <Text fontSize="sm">💡</Text>
                          <Text fontSize="sm" color="gray.600">{hint}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  )}
                </VStack>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button
              colorScheme="green"
              leftIcon={<FiCheckCircle />}
              onClick={handleCompleteStep}
              isLoading={completing}
            >
              Complete Step
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
