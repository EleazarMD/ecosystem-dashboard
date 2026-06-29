/**
 * ReflectionCard — Metacognition check-in after a learning step.
 *
 * Asks the child: "How did that feel?" with three options:
 * - 😊 Easy!   → difficultyRating: 'easy'
 * - 😌 Just right → difficultyRating: 'just-right'
 * - 🤔 Very hard → difficultyRating: 'hard'
 *
 * Optionally allows a free-text note. On submit, POSTs to /api/child/reflection
 * which stores the reflection in LearnerMemory for tutor warm-up next session.
 *
 * Contract: docs/LEARNING_PATH_STUDIO_REVIEW_2026-06.md §3.D
 */

import React, { useState, useCallback } from 'react';
import { Box, VStack, HStack, Text, Button, Textarea, Spinner } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useChildTheme } from '../ChildThemeProvider';
import { useLearningSounds } from '@/hooks/useLearningSounds';
import { useSession } from 'next-auth/react';

const popIn = keyframes`
  0% { opacity: 0; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
`;

type DifficultyRating = 'easy' | 'just-right' | 'hard';

const OPTIONS: Array<{ value: DifficultyRating; emoji: string; label: string; color: string }> = [
  { value: 'easy', emoji: '😊', label: 'Easy!', color: '#38a169' },
  { value: 'just-right', label: 'Just right', emoji: '😌', color: '#3182ce' },
  { value: 'hard', label: 'Very hard', emoji: '🤔', color: '#dd6b20' },
];

export interface ReflectionCardProps {
  /** Step title for context */
  stepTitle?: string;
  /** Skill code for the reflection record */
  skillCode?: string;
  /** Whether the step was completed successfully */
  wasCompleted: boolean;
  /** Child ID (falls back to session) */
  childId?: string;
  /** Called when the reflection is submitted or skipped */
  onDone: () => void;
}

export function ReflectionCard({
  stepTitle,
  skillCode,
  wasCompleted,
  childId,
  onDone,
}: ReflectionCardProps) {
  const { colors } = useChildTheme();
  const { play } = useLearningSounds();
  const { data: session } = useSession();
  const effectiveChildId = childId || session?.user?.id;

  const [selected, setSelected] = useState<DifficultyRating | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await fetch('/api/child/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillCode,
          stepTitle,
          difficultyRating: selected,
          note: note.trim() || undefined,
          wasCompleted,
          childId: effectiveChildId,
        }),
      });
    } catch {
      // best-effort
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      play('correct');
      setTimeout(() => onDone(), 1200);
    }
  }, [selected, note, skillCode, stepTitle, wasCompleted, effectiveChildId, play, onDone]);

  if (submitted) {
    return (
      <Box
        p={5}
        borderRadius="2xl"
        bg={colors.backgroundSecondary}
        border="2px solid"
        borderColor={colors.primary}
        textAlign="center"
        animation={`${popIn} 0.3s ease-out`}
      >
        <Text fontSize="3xl" mb={2}>🌟</Text>
        <Text fontWeight="700" fontSize="sm" color={colors.text}>
          Thanks for reflecting!
        </Text>
        <Text fontSize="xs" color={colors.textMuted} mt={1}>
          Your tutor will remember this for next time.
        </Text>
      </Box>
    );
  }

  return (
    <Box
      p={5}
      borderRadius="2xl"
      bg={colors.backgroundSecondary}
      border="2px solid"
      borderColor={colors.border}
      animation={`${popIn} 0.3s ease-out`}
    >
      <VStack spacing={4} align="stretch">
        {/* Question */}
        <VStack spacing={1} align="center">
          <Text fontSize="2xl">🪞</Text>
          <Text fontWeight="800" fontSize="md" color={colors.text} textAlign="center">
            How did that feel?
          </Text>
          {stepTitle && (
            <Text fontSize="xs" color={colors.textMuted} textAlign="center">
              {stepTitle}
            </Text>
          )}
        </VStack>

        {/* Difficulty options */}
        <HStack spacing={3} justify="center">
          {OPTIONS.map((opt) => (
            <Box
              key={opt.value}
              as="button"
              onClick={() => {
                play('click');
                setSelected(opt.value);
              }}
              p={4}
              borderRadius="xl"
              bg={selected === opt.value ? `${opt.color}20` : colors.background}
              border="2px solid"
              borderColor={selected === opt.value ? opt.color : colors.border}
              transition="all 0.2s"
              _hover={{ transform: 'scale(1.05)', borderColor: opt.color }}
              _active={{ transform: 'scale(0.98)' }}
              textAlign="center"
              style={{ cursor: 'pointer' }}
            >
              <VStack spacing={1}>
                <Text fontSize="2xl">{opt.emoji}</Text>
                <Text fontSize="xs" fontWeight="700" color={selected === opt.value ? opt.color : colors.text}>
                  {opt.label}
                </Text>
              </VStack>
            </Box>
          ))}
        </HStack>

        {/* Optional note */}
        {selected && !showNote && (
          <Button
            size="xs"
            variant="ghost"
            color={colors.textMuted}
            onClick={() => setShowNote(true)}
          >
            + Add a note (optional)
          </Button>
        )}

        {showNote && (
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything you want to remember about this step?"
            size="sm"
            borderRadius="lg"
            bg={colors.background}
            border="1px solid"
            borderColor={colors.border}
            color={colors.text}
            maxLength={200}
            rows={2}
          />
        )}

        {/* Actions */}
        <HStack justify="center" spacing={3} pt={1}>
          <Button size="sm" variant="ghost" color={colors.textMuted} onClick={onDone}>
            Skip
          </Button>
          <Button
            size="sm"
            colorScheme="purple"
            isDisabled={!selected || submitting}
            onClick={handleSubmit}
          >
            {submitting ? <Spinner size="sm" /> : 'Submit'}
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
