/**
 * Page Creator Component
 * Handles page and database creation logic
 */

import { useToast } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { Workspace, Block } from '../../types/workspace';

interface PageCreatorProps {
  workspace: Workspace | null;
  setBlocks: (blocks: Block[]) => void;
  blocks: Block[];
  handlePageClick: (pageId: string, page?: Block) => Promise<void>;
}

export function usePageCreator(props: PageCreatorProps) {
  const { workspace, setBlocks, blocks, handlePageClick } = props;
  const toast = useToast();

  const createNewPage = async () => {
    if (!workspace) return;

    try {
      const response = await fetch('/api/blocks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.id,
          type: 'page',
          properties: {
            title: [{ text: { content: 'Untitled' } }],
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBlocks([...blocks, data.block]);
        
        toast({
          title: 'Page created',
          status: 'success',
          duration: 2000,
        });

        // Open the newly created page
        await handlePageClick(data.block.id, data.block);
      }
    } catch (error) {
      console.error('Failed to create page:', error);
      toast({
        title: 'Failed to create page',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleSelectTemplate = async (template: any) => {
    if (!workspace) return;

    try {
      const response = await fetch('/api/blocks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.id,
          type: template.type || 'page',
          properties: {
            title: [{ text: { content: template.title || 'Untitled' } }],
            icon: template.icon ? { emoji: template.icon } : undefined,
          },
          content: template.content || '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBlocks([...blocks, data.block]);
        
        toast({
          title: `${template.title} created`,
          status: 'success',
          duration: 2000,
        });

        // Open the newly created page
        await handlePageClick(data.block.id, data.block);
      }
    } catch (error) {
      console.error('Failed to create from template:', error);
      toast({
        title: 'Failed to create page',
        status: 'error',
        duration: 3000,
      });
    }
  };

  return {
    createNewPage,
    handleSelectTemplate,
  };
}
