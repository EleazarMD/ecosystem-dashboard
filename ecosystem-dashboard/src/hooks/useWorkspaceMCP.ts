/**
 * Custom hook for MCP settings and AI context management
 */

import { useEffect } from 'react';
import { Workspace, Block } from '../types/workspace';

interface UseWorkspaceMCPProps {
  selectedPage: Block | null;
  pageBlocks: any[];
  workspace: Workspace | null;
  setMcpSettings: (settings: any) => void;
  setAIContext: (context: any) => void;
}

export function useWorkspaceMCP(props: UseWorkspaceMCPProps) {
  const { selectedPage, pageBlocks, workspace, setMcpSettings, setAIContext } = props;

  // Load MCP settings when context changes
  useEffect(() => {
    const agentId = selectedPage ? 'page-agent' : 'workspace-ai';
    loadMCPSettings(agentId);
  }, [selectedPage]);

  // Update AI context when page changes
  useEffect(() => {
    if (selectedPage && workspace) {
      setAIContext({
        type: 'workspace-page',
        data: {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          pageId: selectedPage.id,
          pageTitle: selectedPage.properties?.title?.[0]?.text?.content || 'Untitled',
          pageType: selectedPage.type,
          blockCount: pageBlocks.length,
          hasContent: pageBlocks.length > 0,
        },
      });
    }
  }, [selectedPage, pageBlocks, workspace]);

  const loadMCPSettings = async (agentId: string) => {
    try {
      console.log('🔧 [MCP] Loading settings from database for:', agentId);
      const response = await fetch(`/api/goose/settings/${agentId}`);
      
      if (response.ok) {
        const data = await response.json();
        const enabledTools = data.enabledTools || [];
        console.log('🔧 [MCP] Loaded enabledTools from database:', enabledTools);
        
        const settings = {
          workspace: enabledTools.includes('workspace'),
          notion: enabledTools.includes('notion'),
          github: enabledTools.includes('github'),
          filesystem: enabledTools.includes('filesystem'),
          knowledgeGraph: enabledTools.includes('knowledgeGraph'),
          developer: enabledTools.includes('developer'),
          screen: enabledTools.includes('screen'),
          memory: enabledTools.includes('memory'),
        };
        
        setMcpSettings(settings);
        console.log('✅ [MCP] Settings loaded successfully:', settings);
      }
    } catch (error) {
      console.error('Failed to load MCP settings:', error);
    }
  };

  return {
    loadMCPSettings,
  };
}
