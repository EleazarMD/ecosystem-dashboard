/**
 * Lesson Builder page — parent-facing control room for the
 * multi-agent lesson authoring pipeline.
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Box, Spinner, Center, Text } from '@chakra-ui/react';
import DashboardLayout from '@/components/DashboardLayout';
import { LessonBuilder } from '@/components/parent/LessonBuilder';

export default function LessonBuilderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return (
      <DashboardLayout>
        <Center h="100%">
          <Spinner size="lg" />
        </Center>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box h="calc(100vh - 120px)" overflow="hidden">
        <LessonBuilder />
      </Box>
    </DashboardLayout>
  );
}
