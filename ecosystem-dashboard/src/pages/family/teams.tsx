/**
 * Family Learning Teams Page
 *
 * Parent-facing page for managing learning teams.
 * Accessible at /family/teams.
 */

import React from 'react';
import { Box, Container } from '@chakra-ui/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LearningTeamsManager from '@/components/family/LearningTeamsManager';
import { withParent } from '@/lib/auth/withParent';

function LearningTeamsPage() {
  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <LearningTeamsManager />
      </Container>
    </DashboardLayout>
  );
}

export default withParent(LearningTeamsPage);
