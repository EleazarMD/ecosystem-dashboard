/**
 * Custom hook for workspace page state management
 */

import { useState, useRef } from 'react';
import { Workspace, Block } from '../types/workspace';

export function useWorkspaceState(userId: string) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<Block | null>(null);
  const [pageBlocks, setPageBlocks] = useState<any[]>([]);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showHome, setShowHome] = useState(true);
  const [showAI, setShowAI] = useState(false);
  
  // Document Goose state
  const [useGoose, setUseGoose] = useState(true);
  const [gooseMode, setGooseMode] = useState<'floating' | 'sidebar'>('floating');
  const [gooseOpen, setGooseOpen] = useState(false);
  const blockModelRef = useRef<any>(null);
  
  // Page view state
  const [currentPageView, setCurrentPageView] = useState<'page' | 'table' | 'board' | 'calendar' | 'gallery'>('page');
  
  // Cover state
  const [showCoverSelector, setShowCoverSelector] = useState(false);
  const [selectedCoverType, setSelectedCoverType] = useState<'color' | 'gradient' | 'image'>('gradient');
  
  // Template state
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  
  // Calendar settings
  const [isCalendarSettingsOpen, setIsCalendarSettingsOpen] = useState(false);
  
  // MCP settings
  const [mcpSettings, setMcpSettings] = useState({
    workspace: false,
    notion: false,
    github: false,
    filesystem: false,
    knowledgeGraph: false,
    developer: false,
    screen: false,
    memory: false,
  });
  
  // Refs
  const hasInitialized = useRef(false);
  const hasRestoredPage = useRef(false);

  return {
    // State
    workspace,
    blocks,
    loading,
    loadingContent,
    selectedPageId,
    selectedPage,
    pageBlocks,
    editingPageId,
    editingTitle,
    showHome,
    showAI,
    useGoose,
    gooseMode,
    gooseOpen,
    blockModelRef,
    currentPageView,
    showCoverSelector,
    selectedCoverType,
    showTemplateGallery,
    isCalendarSettingsOpen,
    mcpSettings,
    
    // Setters
    setWorkspace,
    setBlocks,
    setLoading,
    setLoadingContent,
    setSelectedPageId,
    setSelectedPage,
    setPageBlocks,
    setEditingPageId,
    setEditingTitle,
    setShowHome,
    setShowAI,
    setUseGoose,
    setGooseMode,
    setGooseOpen,
    setCurrentPageView,
    setShowCoverSelector,
    setSelectedCoverType,
    setShowTemplateGallery,
    setIsCalendarSettingsOpen,
    setMcpSettings,
    
    // Refs
    hasInitialized,
    hasRestoredPage,
  };
}
