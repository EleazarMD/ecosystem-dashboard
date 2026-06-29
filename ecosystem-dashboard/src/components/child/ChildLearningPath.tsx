/**
 * Child Learning Path — Child UI
 *
 * Visualizes the child's individualized learning path as a Brilliant-inspired
 * trail: a central spine, alternating 3D cards, a floating guide, and polished
 * progress chrome. Supports adaptive difficulty and step completion.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Box, VStack, HStack, Heading, Text, Button, Badge, Spinner, useToast,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalCloseButton, IconButton, Collapse,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { keyframes } from '@emotion/react';
import {
  FiMap, FiRefreshCw, FiPause, FiPlay, FiAward,
} from 'react-icons/fi';
import { useLearningSounds } from '@/hooks/useLearningSounds';
import {
  TrailContainer,
  TrailHeader,
  TrailPath,
  TrailCard,
  TrailGuide,
  TrailProgress,
  TrailStartBar,
  TrailSectionBanner,
  adjustColor,
  CardPlayer,
  buildCardSetFromStep,
  DailyMissionCard,
  type TrailItem,
  type TrailSection,
  type LearningCard,
  type CardPlayerResult,
} from '@/components/child/learning-kit';
import {
  KNOWN_ACTIVITY_IDS,
  useActivityContext,
  getContextHub,
  createLearningPathContextProvider,
  type LearningPathStateSnapshot,
} from '@/domains/learning/shared/activity-registry';

const slideUp = keyframes`
  0% { opacity: 0; transform: translateY(15px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
`;

interface PathStep {
  id: string;
  stepNumber: number;
  title: string;
  description?: string;
  stepEmoji: string;
  contentItemId?: string;
  customPrompt?: string;
  customContentType?: string;
  skillCode?: string;
  targetDifficulty?: number;
  hints: string[];
  cardSet?: unknown[];
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

const TRAIL_ACCENT = '#9f7aea';

const DIFFICULTY_STARS = (level: number) => '⭐'.repeat(level);

const DOMAIN_COLORS: Record<string, string> = {
  math: '#805ad5',
  reading: '#3182ce',
  writing: '#d69e2e',
  analytical: '#38a169',
  science: '#dd6b20',
  social: '#d53f8c',
  art: '#e53e3e',
  default: '#9f7aea',
};

const DOMAIN_EMOJI: Record<string, string> = {
  math: '📐',
  reading: '📚',
  writing: '✏️',
  analytical: '🧩',
  science: '🔬',
  social: '🌍',
  art: '🎨',
  default: '🌟',
};

/**
 * Studio articulation map (§6): customContentType → studio route.
 * Steps with these content types navigate to the studio with returnTo params.
 * Everything else (problem, question, reasoning, card_set) opens the CardPlayer modal.
 */
const STUDIO_ROUTE_MAP: Record<string, string> = {
  writing: '/child/journal',
  read: '/child/book-explorer',
  explore: '/child/pokemon-lab',
  art: '/child/art-studio',
};

function getDomainColor(value?: string) {
  if (!value) return DOMAIN_COLORS.default;
  const key = value.toLowerCase().split(/[\s,._-]+/)[0] ?? 'default';
  return DOMAIN_COLORS[key] || DOMAIN_COLORS.default;
}

function getDomainEmoji(value?: string) {
  if (!value) return DOMAIN_EMOJI.default;
  const key = value.toLowerCase().split(/[\s,._-]+/)[0] ?? 'default';
  return DOMAIN_EMOJI[key] || DOMAIN_EMOJI.default;
}

function getSkillDomain(skillCode?: string) {
  return skillCode?.split('.')[0] || 'default';
}

function getSkillDescription(skillCode?: string) {
  const domain = getSkillDomain(skillCode);
  const domainMessages: Record<string, string> = {
    math: 'Math skills help you count, compare, and solve number puzzles.',
    reading: 'Reading skills help you understand stories and discover new words.',
    writing: 'Writing skills help you share your ideas and make your own stories.',
    analytical: 'Analytical skills help you spot patterns, sort things, and solve puzzles.',
    science: 'Science skills help you explore how the world works.',
    social: 'Social skills help you understand people, places, and communities.',
    art: 'Art skills help you create, draw, and express yourself.',
  };
  return domainMessages[domain] || 'This skill helps you learn something new and grow stronger!';
}

function SkillDetailPanel({ step }: { step: PathStep }) {
  const domain = getSkillDomain(step.skillCode);
  const color = getDomainColor(domain);
  const emoji = getDomainEmoji(domain);

  return (
    <Box
      borderRadius="lg"
      p={3}
      border="2px solid"
      borderColor={`${color}40`}
      bg={`${color}10`}
    >
      <VStack spacing={2} align="start">
        <HStack spacing={2}>
          <Text fontSize="lg">{emoji}</Text>
          <Text fontSize="xs" fontWeight="700" color={color} textTransform="capitalize">
            {domain} skill
          </Text>
        </HStack>
        {step.skillCode && (
          <Badge colorScheme="whiteAlpha" variant="solid" fontSize="0.65rem" borderRadius="full">
            {step.skillCode}
          </Badge>
        )}
        <Text fontSize="xs" color="gray.600">
          {getSkillDescription(step.skillCode)}
        </Text>
        {step.description && (
          <Text fontSize="2xs" color="gray.500">
            {step.description}
          </Text>
        )}
      </VStack>
    </Box>
  );
}

export default function ChildLearningPath({ childId }: { childId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const { play } = useLearningSounds();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [activePath, setActivePath] = useState<LearningPath | null>(null);
  const [selectedStep, setSelectedStep] = useState<PathStep | null>(null);
  const [stepCards, setStepCards] = useState<LearningCard[]>([]);
  const [completing, setCompleting] = useState(false);
  const [expandedSkillStep, setExpandedSkillStep] = useState<string | null>(null);
  const [trailHeight, setTrailHeight] = useState(600);
  const trailRef = useRef<HTMLDivElement>(null);

  // Context Hub: this surface emits a live ContextFrame so the always-present
  // tutor companion knows the child's actual path + current step (FSD §1.6).
  const lpStateRef = useRef<LearningPathStateSnapshot>({});
  useActivityContext(
    KNOWN_ACTIVITY_IDS.LEARNING_PATH,
    () => createLearningPathContextProvider(lpStateRef),
  );

  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchPaths = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/child/learning-path?action=active');
      const data = await res.json();
      if (res.ok) {
        setPaths(data.paths || []);
        setActivePath(data.path || (data.paths?.[0] || null));
      } else {
        setError(data.error || 'Failed to load learning path');
      }
    } catch (err) {
      console.error('Failed to fetch paths:', err);
      setError('Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaths();
  }, [fetchPaths]);

  useEffect(() => {
    if (trailRef.current) {
      setTrailHeight(Math.max(600, trailRef.current.scrollHeight));
    }
  }, [activePath?.steps]);

  // Keep the Context Hub frame in sync with the active path + current step so
  // the companion can coach "what's next" and explain the step on screen.
  useEffect(() => {
    if (!activePath) {
      lpStateRef.current = {};
    } else {
      const currentStep = activePath.steps.find((s) => !s.isCompleted);
      const skillCodes = Array.from(
        new Set(activePath.steps.map((s) => s.skillCode).filter((c): c is string => !!c)),
      );
      lpStateRef.current = {
        pathId: activePath.id,
        pathName: activePath.title,
        progress: (activePath.completionPct || 0) / 100,
        status: activePath.status,
        totalSteps: activePath.totalSteps,
        currentObjective: currentStep?.title,
        currentStepNumber: currentStep?.stepNumber,
        currentStepTitle: currentStep?.title,
        currentStepSkillCode: currentStep?.skillCode,
        currentStepDifficulty: currentStep?.targetDifficulty,
        currentStepPrompt: currentStep?.customPrompt || currentStep?.description,
        skillCodes,
      };
    }
    getContextHub().notifyFrameUpdate(KNOWN_ACTIVITY_IDS.LEARNING_PATH);
  }, [activePath]);

  const handleGeneratePath = async () => {
    try {
      const res = await fetch('/api/child/learning-path?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
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

  const handleOpenStep = async (step: PathStep) => {
    if (step.isCompleted) return;

    // Studio articulation (§6): if customContentType maps to a studio route,
    // navigate there with returnTo params instead of opening the CardPlayer modal.
    const studioRoute = step.customContentType ? STUDIO_ROUTE_MAP[step.customContentType] : undefined;
    if (studioRoute) {
      const query = new URLSearchParams({
        returnTo: 'learning-path',
        stepNumber: String(step.stepNumber),
        pathId: activePath?.id || '',
        skillCode: step.skillCode || '',
        prompt: step.customPrompt || '',
      });
      router.push(`${studioRoute}?${query.toString()}`);
      return;
    }

    // Default: open CardPlayer modal for problem/question/reasoning/card_set
    setSelectedStep(step);

    // If the step has an explicit cardSet (from a rich template), use it directly.
    if (step.cardSet && Array.isArray(step.cardSet) && step.cardSet.length > 0) {
      setStepCards(step.cardSet as LearningCard[]);
      onOpen();
      return;
    }

    // Fetch a content item from the catalog so the check card gets a real
    // prompt + hint set instead of self-assessment placeholders.
    let contentItem: ReturnType<typeof buildCardSetFromStep> extends never
      ? never
      : Parameters<typeof buildCardSetFromStep>[1] | undefined;

    if (step.skillCode) {
      try {
        const res = await fetch(
          `/api/learn/content?skill=${encodeURIComponent(step.skillCode)}&limit=1`,
        );
        if (res.ok) {
          const data = await res.json();
          const item = data.items?.[0];
          if (item) {
            contentItem = {
              prompt: item.prompt,
              hintSet: item.hintSet || [],
              type: item.type,
            };
          }
        }
      } catch {
        // Catalog fetch failed — proceed with step-only card set
      }
    }

    setStepCards(buildCardSetFromStep(step, contentItem));
    onOpen();
  };

  const handleCardPlayerComplete = async (result: CardPlayerResult) => {
    if (!activePath || !selectedStep) return;
    // Only complete the step if the attempt was correct — incorrect attempts
    // should not advance the path. The /api/learn/attempt endpoint already
    // auto-completes the step on correct answers, so this is mostly a
    // safety net for cases where pathCompleted wasn't returned.
    if (!result.correct) {
      onClose();
      return;
    }
    setCompleting(true);
    try {
      // If the check card already completed the path step via /api/learn/attempt,
      // we just refresh. Otherwise, complete it with the real score.
      if (!result.pathCompleted) {
        const res = await fetch('/api/child/learning-path?action=complete-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pathId: activePath.id,
            stepNumber: selectedStep.stepNumber,
            score: result.score,
            timeSpentSeconds: 60,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.pathCompleted) {
            play('levelUp');
            toast({ title: '🎉 Path Complete! Congratulations!', status: 'success', duration: 5000 });
          } else {
            play('correct');
            toast({ title: `Step ${selectedStep.stepNumber} complete! ${selectedStep.stepEmoji}`, status: 'success', duration: 3000 });
          }
        }
      } else {
        play('levelUp');
        toast({ title: '🎉 Path Complete! Congratulations!', status: 'success', duration: 5000 });
      }
      onClose();
      fetchPaths();
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

  const sections = useMemo<TrailSection[]>(() => {
    if (!activePath) return [];
    const out: TrailSection[] = [];
    activePath.steps.forEach((step, idx) => {
      const domain = step.skillCode?.split('.')[0] || activePath.focusDomains[0] || 'default';
      const color = getDomainColor(domain);
      const last = out[out.length - 1];
      if (!last || last.color !== color) {
        out.push({
          id: `${domain}-${idx}`,
          title: domain,
          emoji: getDomainEmoji(domain),
          color,
          items: [],
        });
      }
      out[out.length - 1].items.push({
        id: step.id,
        title: step.title,
        description: step.description,
        emoji: step.stepEmoji,
        color,
        isCompleted: step.isCompleted,
        isCurrent:
          !step.isCompleted &&
          activePath.steps.slice(0, idx).every((s) => s.isCompleted),
        isLocked:
          !step.isCompleted &&
          activePath.steps.slice(0, idx).some((s) => !s.isCompleted),
        isLast: idx === activePath.steps.length - 1,
        metadata: (
          <VStack spacing={2} align="stretch">
            <HStack spacing={2} justify="space-between">
              <HStack spacing={2} flexWrap="wrap">
                {step.skillCode && (
                  <HStack spacing={0} align="center">
                    <Badge colorScheme="whiteAlpha" variant="solid" fontSize="0.65rem">
                      {step.skillCode}
                    </Badge>
                    <IconButton
                      aria-label={`Learn more about ${step.skillCode}`}
                      icon={<SearchIcon />}
                      size="xs"
                      variant="ghost"
                      colorScheme="blue"
                      opacity={0.7}
                      _hover={{ opacity: 1, transform: 'scale(1.1)' }}
                      transition="all 0.15s ease"
                      onClick={(e) => {
                        e.stopPropagation();
                        play('click');
                        setExpandedSkillStep((prev) => (prev === step.id ? null : step.id));
                      }}
                    />
                  </HStack>
                )}
                {step.targetDifficulty && (
                  <Badge colorScheme="yellow" variant="subtle" fontSize="0.65rem">
                    {DIFFICULTY_STARS(step.targetDifficulty)}
                  </Badge>
                )}
                {step.isCompleted && step.score && (
                  <Badge colorScheme="green" variant="solid" fontSize="0.65rem">
                    {Math.round(step.score * 100)}%
                  </Badge>
                )}
              </HStack>
              {!step.isCompleted && (
                <Badge
                  colorScheme={step.isCompleted ? 'green' : 'purple'}
                  variant="solid"
                  fontSize="0.65rem"
                >
                  {step.isCompleted ? 'Done' : activePath.steps.slice(0, activePath.steps.indexOf(step)).some((s) => !s.isCompleted) ? 'Locked' : 'Open'}
                </Badge>
              )}
            </HStack>
            <Collapse in={expandedSkillStep === step.id}>
              <SkillDetailPanel step={step} />
            </Collapse>
          </VStack>
        ),
      });
    });
    return out;
  }, [activePath, expandedSkillStep]);

  const flatItems = useMemo<TrailItem[]>(() => {
    const items: TrailItem[] = [];
    sections.forEach((sec) => {
      items.push(...sec.items);
    });
    return items;
  }, [sections]);

  const guideLines = useMemo(() => {
    if (!activePath) return ['Your learning path is ready. Tap a step to begin!'];
    if (activePath.status === 'paused') {
      return ['This path is paused. Tap Resume to keep going!', 'Your progress is saved.'];
    }
    if (activePath.completionPct >= 100) {
      return ['Amazing work! You finished this path!', 'Keep exploring your next journey.'];
    }
    const currentStep = activePath.steps.find((s) => !s.isCompleted);
    if (currentStep) {
      return [
        `Step ${currentStep.stepNumber}: ${currentStep.title}`,
        'Tap any open step to start practicing.',
        'Complete one step to unlock the next!',
      ];
    }
    return ['Your learning path is ready. Tap a step to begin!'];
  }, [activePath]);

  if (loading) {
    return (
      <VStack justify="center" h="300px" spacing={4}>
        <Box animation={`${pulse} 1.5s ease-in-out infinite`} fontSize="5xl">🗺️</Box>
        <Text fontSize="sm" color="gray.500">Loading your learning path...</Text>
        <Spinner size="sm" color="purple.400" />
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack justify="center" h="300px" spacing={4}>
        <Text fontSize="4xl">⚠️</Text>
        <Text color="red.400" textAlign="center" fontWeight="bold">{error}</Text>
        <Button size="sm" colorScheme="purple" variant="outline" onClick={fetchPaths}>
          Try Again
        </Button>
      </VStack>
    );
  }

  // No active path
  if (!activePath) {
    return (
      <VStack spacing={8} py={12} animation={`${slideUp} 0.5s ease-out`}>
        <Box animation={`${float} 3s ease-in-out infinite`} fontSize="6xl">🗺️</Box>
        <VStack spacing={3}>
          <Heading size="md" color="gray.600">No Active Learning Path</Heading>
          <Text fontSize="sm" color="gray.400" textAlign="center" maxW="350px">
            Generate a personalized learning path tailored just for you! It adapts to your skill level and interests.
          </Text>
        </VStack>
        <Button
          leftIcon={<FiMap />}
          colorScheme="purple"
          size="lg"
          borderRadius="full"
          boxShadow="0 4px 12px rgba(159, 122, 234, 0.4)"
          _hover={{ transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(159, 122, 234, 0.5)' }}
          transition="all 0.2s"
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
    <VStack spacing={6} align="stretch">
      {/* Daily Mission — hero "Start today's adventure" card */}
      <DailyMissionCard childId={childId} />

      <TrailContainer accent={TRAIL_ACCENT}>
      {/* Hero Header */}
      <TrailHeader
        title={activePath.title}
        subtitle={activePath.description || 'Follow your personalized path one step at a time.'}
        emoji={activePath.pathEmoji}
        accent={TRAIL_ACCENT}
      >
        <HStack spacing={2} wrap="wrap" pt={2}>
          <Badge colorScheme="purple" variant="solid" borderRadius="full" px={3} py={1}>
            {DIFFICULTY_STARS(activePath.currentDifficulty)}
          </Badge>
          {activePath.focusDomains.map((d) => (
            <Badge key={d} bg={`${getDomainColor(d)}55`} color="white" borderRadius="full" px={3} py={1} fontSize="2xs">
              {getDomainEmoji(d)} {d}
            </Badge>
          ))}
          {activePath.status === 'paused' && (
            <Badge colorScheme="orange" variant="solid" borderRadius="full" px={3} py={1}>
              Paused
            </Badge>
          )}
          {activePath.completionPct >= 100 && (
            <Badge colorScheme="green" variant="solid" borderRadius="full" px={3} py={1}>
              <FiAward style={{ marginRight: 4 }} /> Complete
            </Badge>
          )}
        </HStack>
      </TrailHeader>

      {/* Progress + Controls */}
      <TrailProgress
        label="Your Journey Progress"
        value={completedSteps}
        total={activePath.totalSteps}
        percent={activePath.completionPct}
        accent={TRAIL_ACCENT}
      >
        <HStack spacing={2} mt={3} justify="flex-end">
          <Button
            leftIcon={<FiRefreshCw />}
            size="sm"
            variant="ghost"
            colorScheme="whiteAlpha"
            onClick={fetchPaths}
          >
            Refresh
          </Button>
          {activePath.status === 'active' ? (
            <Button
              leftIcon={<FiPause />}
              size="sm"
              variant="outline"
              colorScheme="orange"
              onClick={handlePausePath}
            >
              Pause
            </Button>
          ) : activePath.status === 'paused' ? (
            <Button
              leftIcon={<FiPlay />}
              size="sm"
              colorScheme="green"
              onClick={handleResumePath}
            >
              Resume
            </Button>
          ) : null}
        </HStack>
      </TrailProgress>

      {/* Trail Map */}
      <Box position="relative" ref={trailRef}>
        <TrailPath height={trailHeight} color={TRAIL_ACCENT} progress={(activePath?.completionPct || 0) / 100} />
        <VStack align="stretch" spacing={0} position="relative" zIndex={1}>
          {sections.map((section, secIdx) => (
            <React.Fragment key={section.id}>
              <TrailSectionBanner
                title={section.title}
                emoji={section.emoji}
                color={section.color}
                index={secIdx}
              />
              {section.items.map((item, itemIdx) => {
                const globalIndex = flatItems.findIndex((i) => i.id === item.id);
                return (
                  <TrailCard
                    key={item.id}
                    item={item}
                    index={globalIndex}
                    total={flatItems.length}
                    onClick={() => {
                      const step = activePath.steps[globalIndex];
                      if (step) handleOpenStep(step);
                    }}
                    accentColor={section.color}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </VStack>
      </Box>

      {/* Floating guide mascot */}
      <TrailGuide
        emoji="🦊"
        title="Path Guide"
        lines={guideLines}
        accent={TRAIL_ACCENT}
        hidden={!currentStepData}
      />

      {/* Floating start bar when there is a current step */}
      <TrailStartBar
        emoji={currentStepData?.stepEmoji}
        title={currentStepData?.title || 'Your next step'}
        subtitle={currentStepData ? `Step ${currentStepData.stepNumber} of ${activePath.totalSteps}` : undefined}
        color={TRAIL_ACCENT}
        onClick={() => currentStepData && handleOpenStep(currentStepData)}
        hidden={!currentStepData || activePath.status === 'paused'}
      />

      {/* Step Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay zIndex={1400} backdropFilter="blur(4px)" bg="blackAlpha.300" />
        <ModalContent zIndex={1400} borderRadius="2xl" overflow="hidden" boxShadow="2xl">
          <ModalHeader bg="purple.50" pb={4} borderBottom="1px solid" borderColor="purple.100">
            <HStack spacing={3}>
              <Box
                w="48px" h="48px" borderRadius="xl"
                bgGradient={`linear(135deg, ${TRAIL_ACCENT}, ${adjustColor(TRAIL_ACCENT, -20)})`}
                display="flex" alignItems="center" justifyContent="center"
                flexShrink={0}
                boxShadow="md"
              >
                <Text fontSize="2xl">{selectedStep?.stepEmoji}</Text>
              </Box>
              <VStack align="start" spacing={0}>
                <Text fontSize="md" fontWeight="bold" color="gray.800">{selectedStep?.title}</Text>
                {selectedStep?.skillCode && (
                  <Badge colorScheme="purple" fontSize="2xs" borderRadius="full">
                    {selectedStep.skillCode}
                  </Badge>
                )}
              </VStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="gray.500" />
          <ModalBody bg="white" py={5}>
            {selectedStep && stepCards.length > 0 && (
              <CardPlayer
                cards={stepCards}
                childId={childId}
                pathId={activePath?.id}
                stepNumber={selectedStep.stepNumber}
                onComplete={handleCardPlayerComplete}
                onExit={onClose}
                onCardChange={(index, total, card) => {
                  lpStateRef.current = {
                    ...lpStateRef.current,
                    currentCardIndex: index + 1,
                    currentCardTotal: total,
                    currentCardType: card.type,
                    currentCardTitle: card.title,
                    currentCardQuestion: 'question' in card ? card.question : undefined,
                  };
                  getContextHub().notifyFrameUpdate(KNOWN_ACTIVITY_IDS.LEARNING_PATH);
                }}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </TrailContainer>
    </VStack>
  );
}
