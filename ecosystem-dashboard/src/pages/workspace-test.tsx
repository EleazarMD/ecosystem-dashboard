/**
 * Workspace Test Page
 * Test page for BlockEditor with chart functionality
 */

import React from 'react';
import { Box, Heading, Text } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { BlockEditor } from '@/components/workspace/BlockEditor';

export default function WorkspaceTestPage() {
  const workspaceId = 'test-workspace';

  return (
    <DashboardLayout>
      <Box maxW="4xl" mx="auto" p={6}>
        <Box mb={6}>
          <Heading size="lg" mb={2}>
            Chart Block Test Page
          </Heading>
          <Text color={useSemanticToken('text.secondary')}>
            Type <strong>/</strong> to open the slash menu and insert chart blocks
          </Text>
        </Box>

        <BlockEditor
          workspaceId={workspaceId}
          initialBlocks={[]}
          readOnly={false}
        />
      </Box>
    </DashboardLayout>
  );
}
