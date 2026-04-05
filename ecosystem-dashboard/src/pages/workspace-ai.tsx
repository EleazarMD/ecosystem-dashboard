/**
 * Workspace AI Page
 * Conversational AI interface with Goose integration
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Flex } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { WorkspaceAI } from '@/components/workspace/WorkspaceAI';
import { WorkspaceNav } from '@/components/workspace/WorkspaceNav';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { extractPageTitle, extractPageIcon } from '@/lib/workspace/page-utils';

export default function WorkspaceAIPage() {
  const router = useRouter();
  const [myPages, setMyPages] = useState<any[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const userId = 'eleazar'; // Homelab user - matches iOS app UserConfig.defaultUserId
  const { setCustomData } = useRightPanel();

  // Pick up ?message= from dashboard prompt bar
  const initialMessage = typeof router.query.message === 'string' ? router.query.message : undefined;

  // Shared state for Goose mode (Direct API vs Agent)
  // Default to false (Direct API) as requested
  const [useGoose, setUseGoose] = useState(false);

  // Web Search Provider (Perplexity vs Perplexica)
  const [webSearchProvider, setWebSearchProvider] = useState<'perplexity' | 'perplexica'>('perplexity');

  // Deep Research settings state
  const [deepResearchMaxTokens, setDeepResearchMaxTokens] = useState(8000);
  const [deepResearchModel, setDeepResearchModel] = useState<'sonar-pro' | 'sonar-reasoning'>('sonar-pro');
  const [deepResearchClarificationQuestions, setDeepResearchClarificationQuestions] = useState(3);
  const [deepResearchSourceRecency, setDeepResearchSourceRecency] = useState<'day' | 'week' | 'month' | 'year' | 'any'>('any');
  const [deepResearchAutoPlanning, setDeepResearchAutoPlanning] = useState(true);

  // Sync settings and useGoose to RightPanel customData
  useEffect(() => {
    setCustomData({
      workspaceAISettings: {
        useGoose, // Shared state
        onUseGooseChange: setUseGoose, // Allow settings panel to toggle it
        webSearchProvider,
        onWebSearchProviderChange: setWebSearchProvider,
        deepResearchMaxTokens,
        onDeepResearchMaxTokensChange: setDeepResearchMaxTokens,
        deepResearchModel,
        onDeepResearchModelChange: setDeepResearchModel,
        deepResearchClarificationQuestions,
        onDeepResearchClarificationQuestionsChange: setDeepResearchClarificationQuestions,
        deepResearchSourceRecency,
        onDeepResearchSourceRecencyChange: setDeepResearchSourceRecency,
        deepResearchAutoPlanning,
        onDeepResearchAutoPlanningChange: setDeepResearchAutoPlanning,
      },
    });
  }, [
    useGoose,
    webSearchProvider, // Add dependency
    deepResearchMaxTokens,
    deepResearchModel,
    deepResearchClarificationQuestions,
    deepResearchSourceRecency,
    deepResearchAutoPlanning,
    setCustomData,
  ]);

  // Load workspace and pages
  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const response = await fetch('/api/workspace/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        });

        if (response.ok) {
          const data = await response.json();
          const workspaces = data.workspaces || [];
          const targetWorkspaceId = '3f8d0fc6-737a-42b8-8ae5-90f30e0822a9';
          const workspace = workspaces.find((ws: any) => ws.id === targetWorkspaceId) || workspaces[0];

          if (workspace) {
            setCurrentWorkspace(workspace);

            // Load pages
            const blocksResponse = await fetch(`/api/workspace/${workspace.id}/blocks`);
            if (blocksResponse.ok) {
              const blocksData = await blocksResponse.json();
              const rootBlocks = blocksData.blocks?.filter((b: any) => !b.parent_id) || [];
              setMyPages(rootBlocks);
            }
          }
        }
      } catch (error) {
        console.error('Error loading workspace:', error);
      }
    };

    loadWorkspace();
  }, []);

  return (
    <DashboardLayout>
      <Flex h="calc(100vh - 60px)">
        {/* Workspace Navigation */}
        <WorkspaceNav
          myPages={myPages.map(block => ({
            id: block.id,
            title: extractPageTitle(block),
            icon: extractPageIcon(block),
            updated_at: block.updated_at?.toString() || new Date().toISOString(),
          }))}
          currentWorkspace={currentWorkspace}
          userId={userId}
          onPageClick={(pageId) => {
            window.location.href = `/workspace?page=${pageId}`;
          }}
          onHomeClick={() => {
            window.location.href = '/workspace';
          }}
          onWorkspaceAIClick={() => {
            // Already on Workspace AI page
          }}
          onFilesClick={() => {
            // TODO: Navigate to files view
          }}
          onExpandedChange={setSidebarExpanded}
        />

        {/* Main Workspace AI Content - Glassmorphic Center Panel */}
        <Box
          flex="1"
          position="relative"
          overflow="hidden"
        >
          <WorkspaceAI
            userName="User"
            useGoose={useGoose}
            onUseGooseChange={setUseGoose}
            webSearchProvider={webSearchProvider}
            model="xrt-llama-3.3-70b"
            deepResearchMaxTokens={deepResearchMaxTokens}
            deepResearchModel={deepResearchModel}
            deepResearchClarificationQuestions={deepResearchClarificationQuestions}
            deepResearchSourceRecency={deepResearchSourceRecency}
            deepResearchAutoPlanning={deepResearchAutoPlanning}
            leftSidebarWidth={sidebarExpanded ? 280 : 48}
            initialMessage={initialMessage}
          />
        </Box>
      </Flex>
    </DashboardLayout>
  );
}
