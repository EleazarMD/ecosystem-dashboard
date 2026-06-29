/**
 * Child Lesson Player Page
 *
 * Route: /child/lesson/[lessonId]
 *
 * Renders a published lesson in the Brilliant-style interactive player.
 * Uses ChildDashboardLayout for theme + navigation.
 */

import React from 'react';
import { useRouter } from 'next/router';
import { Box, Spinner, Center } from '@chakra-ui/react';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { LessonPlayer } from '@/components/child/LessonPlayer';

export default function ChildLessonPage() {
  const router = useRouter();
  const { lessonId } = router.query;

  const handleExit = () => {
    router.push('/child/learn');
  };

  const handleComplete = () => {
    // Could record completion to API, show confetti, etc.
    // For now, the LessonPlayer handles the celebration screen.
  };

  if (!lessonId || typeof lessonId !== 'string') {
    return (
      <ChildDashboardLayout pageType="learn">
        <Center h="calc(100vh - 64px)">
          <Spinner size="xl" />
        </Center>
      </ChildDashboardLayout>
    );
  }

  return (
    <ChildDashboardLayout pageType="learn">
      <Box h="calc(100vh - 64px)" overflow="hidden">
        <LessonPlayer
          lessonId={lessonId}
          onComplete={handleComplete}
          onExit={handleExit}
        />
      </Box>
    </ChildDashboardLayout>
  );
}
