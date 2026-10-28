/**
 * Assigned lessons — published lessons the family assigned to this child,
 * as cards into the Brilliant-style lesson player. Hidden when empty.
 */
import React, { useEffect, useState } from 'react';
import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/router';

interface AssignedLesson {
  id: string;
  title: string;
  emoji?: string | null;
  subject: string;
  estimatedMinutes?: number | null;
  status?: string;
  currentStep?: number | null;
  dueDate?: string | null;
}

export default function AssignedLessonsCard() {
  const router = useRouter();
  const [lessons, setLessons] = useState<AssignedLesson[]>([]);

  useEffect(() => {
    let alive = true;
    fetch('/api/learn/lessons/my-lessons')
      .then(r => (r.ok ? r.json() : { lessons: [] }))
      .then(d => { if (alive) setLessons(Array.isArray(d?.lessons) ? d.lessons : []); })
      .catch(() => { /* no lessons row when the fetch fails */ });
    return () => { alive = false; };
  }, []);

  if (!lessons.length) {
    return null;
  }

  return (
    <Box bg="white" borderRadius="2xl" p={5} shadow="sm" w="100%">
      <Heading size="sm" mb={3} letterSpacing="-0.01em">Your lessons</Heading>
      <VStack spacing={3} align="stretch">
        {lessons.map(l => (
          <Box
            key={l.id}
            as="button"
            textAlign="left"
            onClick={() => router.push(`/child/lesson/${l.id}`)}
            bg="gray.50"
            borderRadius="xl"
            p={4}
            _hover={{ bg: 'gray.100', transform: 'translateY(-1px)' }}
            transition="all 0.15s ease"
            cursor="pointer"
          >
            <HStack spacing={3}>
              <Text fontSize="2xl">{l.emoji || '📚'}</Text>
              <VStack spacing={0} align="start">
                <Text fontWeight="bold" fontSize="md" noOfLines={1}>{l.title}</Text>
                <HStack spacing={2} fontSize="xs" color="gray.500">
                  <Text textTransform="capitalize">{l.subject}</Text>
                  {l.estimatedMinutes ? <Text>· about {l.estimatedMinutes} min</Text> : null}
                  {l.dueDate ? <Text>· due {String(l.dueDate).slice(0, 10)}</Text> : null}
                </HStack>
              </VStack>
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
