/**
 * Review Panel — view generated lesson content and submit reviews.
 * Shows steps with their content, allows approve/reject/revision.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Badge, Button, Spinner, Textarea,
  IconButton, Divider, useToast, SimpleGrid, Alert, AlertIcon,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
} from '@chakra-ui/react';
import {
  FiRefreshCw, FiCheckCircle, FiXCircle, FiEdit, FiEye,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Step {
  id: string;
  stepNumber: number;
  stepType: string;
  title: string;
  stepEmoji: string;
  content: any;
  contentAgent: string | null;
  visualAgent: string | null;
  visualSpec: any;
}

interface Review {
  id: string;
  reviewerType: string;
  reviewerId: string;
  reviewKind: string;
  verdict: string;
  score: number | null;
  notes: string | null;
}

interface ReviewPanelProps {
  lessonId: string;
  onReviewed: () => void;
}

const AGENT_LABELS: Record<string, string> = {
  'claude-opus': 'Claude Opus',
  'gpt-5.5': 'GPT 5.5',
  'gemini-image-pro': 'Gemini Image Pro',
  'nano-banana': 'Nano Banana',
  'minimax-m3': 'MiniMax M3',
  'local-llm': 'Local LLM',
};

const VERDICT_COLORS: Record<string, string> = {
  approved: 'green',
  rejected: 'red',
  revision_requested: 'yellow',
};

export function ReviewPanel({ lessonId, onReviewed }: ReviewPanelProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/learn/lessons?id=${lessonId}`);
      const data = await res.json();
      setSteps(data.steps || []);
      setReviews(data.reviews || []);
    } catch {
      toast({ title: 'Failed to load content', status: 'error', duration: 2000 });
    } finally {
      setLoading(false);
    }
  }, [lessonId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmitReview = async (verdict: 'approved' | 'rejected' | 'revision_requested', notes: string) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/learn/lessons/orchestrate?action=review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          reviewerType: 'human',
          reviewerId: 'parent',
          reviewKind: 'pedagogical',
          verdict,
          notes,
        }),
      });
      const data = await res.json();
      toast({ title: data.message, status: 'success', duration: 3000 });
      load();
      onReviewed();
    } catch {
      toast({ title: 'Failed to submit review', status: 'error', duration: 3000 });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={4} color={textSecondary}>Loading content...</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="lg" fontWeight="semibold">Content Review</Text>
        <IconButton aria-label="Refresh" icon={<FiRefreshCw />} size="sm" variant="ghost" onClick={load} />
      </HStack>

      {/* Existing reviews */}
      {reviews.length > 0 && (
        <Box>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>Submitted Reviews</Text>
          <VStack spacing={2} align="stretch">
            {reviews.map((review) => (
              <HStack key={review.id} p={2} borderRadius="md" borderWidth={1} borderColor={borderColor} spacing={3}>
                <Badge colorScheme={VERDICT_COLORS[review.verdict] || 'gray'} fontSize="xs">
                  {review.verdict.replace(/_/g, ' ')}
                </Badge>
                <Text fontSize="xs" flex={1} noOfLines={2}>
                  {review.notes || 'No notes'}
                </Text>
                <Text fontSize="xs" color={textSecondary}>
                  {review.reviewerType} · {review.reviewKind}
                </Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}

      <Divider />

      {/* Steps with content */}
      <VStack spacing={2} align="stretch">
        <Text fontSize="sm" fontWeight="semibold">Lesson Steps ({steps.length})</Text>
        {steps.length === 0 ? (
          <Text fontSize="sm" color={textSecondary}>No steps generated yet.</Text>
        ) : (
          <Accordion allowMultiple>
            {steps.map((step) => (
              <AccordionItem key={step.id} borderWidth={1} borderRadius="md" borderColor={borderColor} mb={2}>
                <AccordionButton>
                  <HStack flex={1} spacing={3} textAlign="left">
                    <Text fontSize="lg">{step.stepEmoji}</Text>
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="medium">
                        {step.stepNumber}. {step.title}
                      </Text>
                      <Text fontSize="xs" color={textSecondary}>
                        {step.stepType}
                        {step.contentAgent && ` · ${AGENT_LABELS[step.contentAgent] || step.contentAgent}`}
                      </Text>
                    </Box>
                    {step.content ? (
                      <Badge colorScheme="green" fontSize="xs">content</Badge>
                    ) : (
                      <Badge colorScheme="gray" fontSize="xs">empty</Badge>
                    )}
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel>
                  <StepContent step={step} />
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </VStack>

      {steps.length > 0 && steps.some((s) => s.content) && (
        <ReviewActions onSubmit={handleSubmitReview} submitting={submitting} />
      )}
    </VStack>
  );
}

// ─── Step content viewer ────────────────────────────────────────────────────

function StepContent({ step }: { step: Step }) {
  const textSecondary = useSemanticToken('text.secondary');
  const c = step.content || {};

  return (
    <VStack spacing={3} align="stretch">
      {c.bodyText && (
        <Box>
          <Text fontSize="xs" fontWeight="semibold" color={textSecondary}>Body Text</Text>
          <Text fontSize="sm" mt={1}>{c.bodyText}</Text>
        </Box>
      )}
      {c.prompt && (
        <Box>
          <Text fontSize="xs" fontWeight="semibold" color={textSecondary}>Prompt</Text>
          <Text fontSize="sm" mt={1}>{c.prompt}</Text>
        </Box>
      )}
      {c.narrativeHook && (
        <Box>
          <Text fontSize="xs" fontWeight="semibold" color={textSecondary}>Narrative Hook</Text>
          <Text fontSize="sm" mt={1} fontStyle="italic">{c.narrativeHook}</Text>
        </Box>
      )}
      {c.funFact && (
        <Box>
          <Text fontSize="xs" fontWeight="semibold" color={textSecondary}>Fun Fact</Text>
          <Text fontSize="sm" mt={1}>💡 {c.funFact}</Text>
        </Box>
      )}
      {c.question && (
        <Box>
          <Text fontSize="xs" fontWeight="semibold" color={textSecondary}>Assessment Question</Text>
          <Text fontSize="sm" mt={1}>{c.question}</Text>
          {c.choices && (
            <VStack spacing={1} align="stretch" mt={2}>
              {c.choices.map((choice: any) => (
                <HStack key={choice.id} spacing={2}>
                  <Badge colorScheme={choice.correct ? 'green' : 'gray'} fontSize="xs">
                    {choice.id}
                  </Badge>
                  <Text fontSize="sm">{choice.label}</Text>
                  {choice.correct && <Text fontSize="xs" color="green.500">✓ correct</Text>}
                </HStack>
              ))}
            </VStack>
          )}
          {c.explanation && (
            <Text fontSize="xs" color={textSecondary} mt={2}>
              Explanation: {c.explanation}
            </Text>
          )}
        </Box>
      )}
      {c.answerKey && (
        <Box>
          <Text fontSize="xs" fontWeight="semibold" color={textSecondary}>Answer Key</Text>
          <Text fontSize="sm" mt={1}>
            Answer: {c.answerKey.answer}
            {c.answerKey.explanation && ` — ${c.answerKey.explanation}`}
          </Text>
        </Box>
      )}
      {c.hintSet && c.hintSet.length > 0 && (
        <Box>
          <Text fontSize="xs" fontWeight="semibold" color={textSecondary}>Hints</Text>
          <VStack spacing={1} align="stretch" mt={1}>
            {c.hintSet.map((hint: string, i: number) => (
              <Text key={i} fontSize="xs">💡 {hint}</Text>
            ))}
          </VStack>
        </Box>
      )}
      {c.narrationScript && (
        <Box>
          <Text fontSize="xs" fontWeight="semibold" color={textSecondary}>Narration Script</Text>
          <Text fontSize="sm" mt={1} fontStyle="italic">{c.narrationScript}</Text>
        </Box>
      )}
      {step.visualSpec && (
        <Box>
          <Text fontSize="xs" fontWeight="semibold" color={textSecondary}>Visual Spec</Text>
          <Text fontSize="xs" mt={1}>{JSON.stringify(step.visualSpec, null, 2)}</Text>
        </Box>
      )}
      {!c.bodyText && !c.question && !c.prompt && !c.narrationScript && (
        <Text fontSize="sm" color={textSecondary}>No content generated yet for this step.</Text>
      )}
    </VStack>
  );
}

// ─── Review actions ─────────────────────────────────────────────────────────

function ReviewActions({
  onSubmit, submitting,
}: {
  onSubmit: (verdict: 'approved' | 'rejected' | 'revision_requested', notes: string) => void;
  submitting: boolean;
}) {
  const [notes, setNotes] = useState('');

  return (
    <VStack spacing={3} align="stretch" p={3} borderRadius="md" borderWidth={1}>
      <Text fontSize="sm" fontWeight="semibold">Submit Review</Text>
      <Textarea
        size="sm"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Review notes (optional)..."
      />
      <HStack justify="flex-end" spacing={2}>
        <Button
          size="sm"
          colorScheme="yellow"
          variant="outline"
          leftIcon={<FiEdit />}
          isLoading={submitting}
          onClick={() => onSubmit('revision_requested', notes)}
        >
          Request Revision
        </Button>
        <Button
          size="sm"
          colorScheme="red"
          variant="outline"
          leftIcon={<FiXCircle />}
          isLoading={submitting}
          onClick={() => onSubmit('rejected', notes)}
        >
          Reject
        </Button>
        <Button
          size="sm"
          colorScheme="green"
          leftIcon={<FiCheckCircle />}
          isLoading={submitting}
          onClick={() => onSubmit('approved', notes)}
        >
          Approve
        </Button>
      </HStack>
    </VStack>
  );
}
