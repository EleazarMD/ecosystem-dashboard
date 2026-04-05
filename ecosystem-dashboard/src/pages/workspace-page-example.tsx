/**
 * Example Workspace Page with Goose Integration
 * Demonstrates proper onPageUpdate implementation
 */

import React, { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { WorkspacePageView } from '@/components/workspace/WorkspacePageView';
import { Block } from '@/lib/editor/BlockModel';

export default function WorkspacePageExample() {
  const [pageTitle, setPageTitle] = useState('My Workspace Page');
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: 'block-1',
      type: 'heading_1',
      content: [{ text: 'Welcome to Your Workspace' }],
      parentId: null,
      children: [],
      createdTime: Date.now(),
      lastEditedTime: Date.now(),
      createdBy: 'user-123',
      lastEditedBy: 'user-123',
      properties: {},
    },
    {
      id: 'block-2',
      type: 'paragraph',
      content: [{ text: 'Try pressing ⌘J to open the Goose AI assistant!' }],
      parentId: null,
      children: [],
      createdTime: Date.now(),
      lastEditedTime: Date.now(),
      createdBy: 'user-123',
      lastEditedBy: 'user-123',
      properties: {},
    },
    {
      id: 'block-3',
      type: 'paragraph',
      content: [{ text: 'Ask Goose to create blocks, tables, or databases. The page will automatically refresh after Goose makes changes.' }],
      parentId: null,
      children: [],
      createdTime: Date.now(),
      lastEditedTime: Date.now(),
      createdBy: 'user-123',
      lastEditedBy: 'user-123',
      properties: {},
    },
  ]);

  const handleTitleChange = (newTitle: string) => {
    console.log('[WorkspacePageExample] Title changed:', newTitle);
    setPageTitle(newTitle);
  };

  const handleBlocksChange = (newBlocks: Block[]) => {
    console.log('[WorkspacePageExample] Blocks changed:', newBlocks.length);
    setBlocks(newBlocks);
  };

  const handleSave = () => {
    console.log('[WorkspacePageExample] Saving page...');
    // TODO: Implement save to database
  };

  return (
    <DashboardLayout>
      <Box h="calc(100vh - 60px)" overflow="hidden">
        <WorkspacePageView
          pageId="example-page-123"
          pageTitle={pageTitle}
          initialBlocks={blocks}
          onTitleChange={handleTitleChange}
          onBlocksChange={handleBlocksChange}
          onSave={handleSave}
        />
      </Box>
    </DashboardLayout>
  );
}
