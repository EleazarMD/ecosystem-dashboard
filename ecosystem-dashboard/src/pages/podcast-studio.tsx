import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { withFeatureGuard } from '@/lib/auth/withFeatureGuard';
import {
  Box,
  Flex,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PodcastStudioProvider } from '@/contexts/PodcastStudioContext';
import SourcesPanel from '@/components/podcast-studio/SourcesPanel';
import ScriptGenerationTabs from '@/components/podcast-studio/ScriptGenerationTabs';
import dynamic from 'next/dynamic';

// Dynamically import NotebookSelector
const NotebookSelector = dynamic(
  () => import('@/components/podcast-studio/NotebookSelector'),
  { ssr: false }
);

// Dynamically import AddSourceModal
const AddSourceModal = dynamic<{
  isOpen: boolean;
  onClose: () => void;
  onAddSource: (source: any) => void;
  projectId: string;
}>(
  () => import('@/components/podcast-studio/AddSourceModal'),
  { ssr: false }
);

// --- Type Definitions ---

export interface ResearchMaterial {
  id: string;
  title: string;
  type: 'article' | 'pdf' | 'note' | 'web';
  content: string;
  url?: string;
  author?: string;
  date?: string;
  // Fields required by ResearchHub/SourcesPanel
  source: string;
  wordCount: number;
  metadata?: any; 
}

export interface PodcastHost {
  id: string;
  name: string;
  role: 'host' | 'guest' | 'expert';
  gender?: 'male' | 'female';
  voiceId?: string;
  voiceName?: string;
  personality: string | {
    archetype: string;
    expertise: string[];
    communicationStyle: string;
    energyLevel: number;
  };
  voiceStyle?: {
    basePrompt: string;
    emotionalRange: string[];
  };
  style?: string;
  avatar?: string;
}

export interface ConversationTurn {
  id: string;
  hostId: string;
  text: string;
  duration?: number; // seconds
  tone?: string;
}

export interface AudienceProfile {
  level: 'beginner' | 'intermediate' | 'expert';
  tone: 'casual' | 'professional' | 'academic' | 'entertaining';
  interests: string[];
}

export interface PodcastProject {
  id: string;
  title: string;
  researchMaterials: ResearchMaterial[];
  hosts: PodcastHost[];
  script: ConversationTurn[];
  audience: AudienceProfile;
  audioUrl?: string;
  status: 'draft' | 'scripting' | 'generating' | 'ready';
  createdAt: Date;
  updatedAt: Date;
}

// --- Main Page Component ---

function PodcastStudioPage() {
  // Layout State
  const [leftPanelWidth, setLeftPanelWidth] = useState(450);
  const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  
  // Script selection state
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [selectedScript, setSelectedScript] = useState<any | null>(null);
  
  // Podcast episode selection state
  const [selectedPodcastEpisode, setSelectedPodcastEpisode] = useState<any | null>(null);
  const [podcastRefreshTrigger, setPodcastRefreshTrigger] = useState(0);
  
  // Script refresh trigger for left sidebar
  const [scriptRefreshTrigger, setScriptRefreshTrigger] = useState(0);
  
  // Debug: Log state changes
  console.log('🎯 podcast-studio render - selectedScriptId:', selectedScriptId);
  console.log('🎯 podcast-studio render - selectedScript exists:', !!selectedScript);
  
  // Notebook Selector Modal
  const { isOpen: isNotebookSelectorOpen, onOpen: onNotebookSelectorOpen, onClose: onNotebookSelectorClose } = useDisclosure();
  
  // Add Source Modal
  const { isOpen: isAddSourceOpen, onOpen: onAddSourceOpen, onClose: onAddSourceClose } = useDisclosure();
  
  // Data State
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();
  
  const [project, setProject] = useState<PodcastProject>({
    id: '',
    title: 'New Podcast Episode',
    researchMaterials: [],
    hosts: [
      {
        id: 'host-1',
        name: 'Sarah',
        role: 'host',
        gender: 'female',
        voiceId: 'Kore',
        personality: 'Engaging and curious',
        style: 'Professional yet conversational'
      },
      {
        id: 'host-2',
        name: 'Michael',
        role: 'expert',
        gender: 'male',
        voiceId: 'Charon',
        personality: 'Knowledgeable and analytical',
        style: 'Deep and insightful'
      }
    ],
    script: [],
    audience: {
      level: 'intermediate',
      tone: 'professional',
      interests: ['AI', 'Technology']
    },
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Load or create notebook on mount
  useEffect(() => {
    const initializeNotebook = async () => {
      try {
        setIsLoading(true);
        
        // Check for existing notebooks
        const response = await fetch('/api/podcast-studio/projects');
        if (!response.ok) throw new Error('Failed to fetch projects');
        
        const projects = await response.json();
        
        if (projects.length > 0) {
          // Load the most recent notebook
          const latestProject = projects[0];
          const materials = latestProject.researchMaterials || [];
          
          setProject(prev => ({
            ...prev,
            id: latestProject.id,
            title: latestProject.title || latestProject.name || 'Untitled Notebook',
            researchMaterials: materials.map((m: any) => ({
              id: m.id,
              title: m.title,
              type: m.type === 'pdf' ? 'pdf' : m.type === 'article' ? 'article' : 'web',
              content: m.content || '',
              url: m.url,
              source: m.url ? new URL(m.url).hostname : 'Upload',
              wordCount: m.word_count || 0,
              metadata: m.metadata,
            })),
            status: latestProject.status || 'draft',
            createdAt: new Date(latestProject.created_at),
            updatedAt: new Date(latestProject.updated_at),
          }));
          
          // Auto-select all materials
          setSelectedSourceIds(materials.map((m: any) => m.id));
          
          console.log(`📓 Loaded notebook: ${latestProject.title} (${materials.length} sources)`);
        } else {
          // Create a new notebook with today's date
          const today = new Date();
          const title = `Podcast Notes - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
          
          const createResponse = await fetch('/api/podcast-studio/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              description: 'Auto-created notebook',
              metadata: { emoji: '🎙️' },
            }),
          });
          
          if (!createResponse.ok) throw new Error('Failed to create project');
          
          const newProject = await createResponse.json();
          setProject(prev => ({
            ...prev,
            id: newProject.id,
            title: newProject.title,
            createdAt: new Date(newProject.created_at),
            updatedAt: new Date(newProject.updated_at),
          }));
          
          console.log(`📓 Created new notebook: ${newProject.title}`);
        }
      } catch (error) {
        console.error('Failed to initialize notebook:', error);
        toast({
          title: 'Failed to load notebook',
          description: 'Using local storage only',
          status: 'warning',
          duration: 3000,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeNotebook();
  }, [toast]);

  // Auto-save material to database
  const saveSourceToDatabase = useCallback(async (source: any, projectId: string) => {
    const payload = {
      projectId,
      title: source.title,
      type: source.type === 'url' ? 'article' : source.type || 'document',
      url: source.url,
      content: source.content || source.description || '',
      wordCount: source.wordCount || 0,
      pageCount: source.pageCount,
      isSelected: true,
      metadata: source.metadata,
    };
    
    console.log('📤 Saving material with payload:', { 
      projectId, 
      title: payload.title, 
      type: payload.type,
      contentLength: payload.content?.length || 0,
      hasUrl: !!payload.url,
    });
    
    try {
      const response = await fetch('/api/podcast-studio/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { rawError: errorText };
        }
        console.error('❌ Save material failed:', { 
          status: response.status, 
          statusText: response.statusText,
          projectId, 
          error: errorData 
        });
        throw new Error((errorData as any).message || (errorData as any).error || `Failed to save material (${response.status})`);
      }
      
      const savedMaterial = await response.json();
      console.log(`💾 Auto-saved source: ${source.title} (id: ${savedMaterial.id})`);
      return savedMaterial;
    } catch (error) {
      console.error('Failed to save source:', error);
      throw error;
    }
  }, []);

  // Delete material from database
  const deleteSourceFromDatabase = useCallback(async (materialId: string) => {
    try {
      const response = await fetch(`/api/podcast-studio/materials?id=${materialId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete material');
      }
      
      console.log(`🗑️ Deleted source from database: ${materialId}`);
    } catch (error) {
      console.error('Failed to delete source:', error);
    }
  }, []);

  // Sources Panel Handlers
  const handleToggleSource = (id: string) => {
    setSelectedSourceIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (selectedSourceIds.length === project.researchMaterials.length) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(project.researchMaterials.map(m => m.id));
    }
  };

  const handleImportFromStoryIntel = async (materials: ResearchMaterial[]) => {
    if (!project.id) return;
    
    // Save each material to database
    const savedMaterials: ResearchMaterial[] = [];
    for (const material of materials) {
      try {
        const saved = await saveSourceToDatabase({
          title: material.title,
          type: 'article',
          url: material.url,
          content: material.content,
          wordCount: material.wordCount,
        }, project.id);
        
        savedMaterials.push({
          ...material,
          id: saved.id,
        });
      } catch (error) {
        console.error('Failed to save story:', error);
        savedMaterials.push(material); // Keep local version
      }
    }
    
    setProject(prev => ({
      ...prev,
      researchMaterials: [...prev.researchMaterials, ...savedMaterials]
    }));
    // Auto-select imported materials
    setSelectedSourceIds(prev => [...prev, ...savedMaterials.map(m => m.id)]);
    
    toast({
      title: `${savedMaterials.length} stories imported`,
      status: 'success',
      duration: 2000,
    });
  };

  const handleAddSource = () => {
    onAddSourceOpen();
  };

  const handleSourceAdded = async (source: any) => {
    // Validate project ID is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!project.id || !uuidRegex.test(project.id)) {
      console.error(`❌ Invalid project.id: "${project.id}"`);
      toast({
        title: 'No notebook loaded',
        description: 'Please wait for notebook to initialize or refresh the page',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      setIsSaving(true);
      console.log(`📝 Saving source to project: ${project.id} (title: ${project.title})`);
      
      // Save to database first
      const savedMaterial = await saveSourceToDatabase(source, project.id);
      
      // Convert to ResearchMaterial format using the database ID
      let sourceHostname = 'Upload';
      if (savedMaterial.url) {
        try {
          sourceHostname = new URL(savedMaterial.url).hostname;
        } catch {
          sourceHostname = 'Link';
        }
      }
      
      const material: ResearchMaterial = {
        id: savedMaterial.id,
        title: savedMaterial.title,
        type: savedMaterial.type === 'article' ? 'article' : savedMaterial.type === 'pdf' ? 'pdf' : 'web',
        content: savedMaterial.content || '',
        url: savedMaterial.url,
        source: sourceHostname,
        wordCount: savedMaterial.word_count || 0,
        metadata: savedMaterial.metadata,
      };
      
      setProject(prev => ({
        ...prev,
        researchMaterials: [...prev.researchMaterials, material]
      }));
      
      // Auto-select the new material
      setSelectedSourceIds(prev => [...prev, material.id]);
      
      toast({
        title: 'Source saved',
        description: `"${material.title}" added to notebook`,
        status: 'success',
        duration: 2000,
      });
      
      onAddSourceClose();
    } catch (error) {
      console.error('Failed to save source:', error);
      toast({
        title: 'Failed to save source',
        description: 'Source added locally but not saved to database',
        status: 'error',
        duration: 3000,
      });
      
      // Still add locally as fallback
      let fallbackSourceHostname = 'Upload';
      if (source.url) {
        try {
          fallbackSourceHostname = new URL(source.url).hostname;
        } catch {
          fallbackSourceHostname = 'Link';
        }
      }
      
      const material: ResearchMaterial = {
        id: `local-${Date.now()}`,
        title: source.title,
        type: source.type === 'url' ? 'web' : source.type as any,
        content: source.content || source.description || '',
        url: source.url,
        source: fallbackSourceHostname,
        wordCount: source.wordCount || 0,
        metadata: {
          pageCount: source.pageCount,
          materialId: source.materialId,
        },
      };
      
      setProject(prev => ({
        ...prev,
        researchMaterials: [...prev.researchMaterials, material]
      }));
      setSelectedSourceIds(prev => [...prev, material.id]);
      onAddSourceClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    // Delete from database if it's a database ID (not local)
    if (!id.startsWith('local-')) {
      await deleteSourceFromDatabase(id);
    }
    
    setProject(prev => ({
      ...prev,
      researchMaterials: prev.researchMaterials.filter(m => m.id !== id)
    }));
    // Remove from selected if it was selected
    setSelectedSourceIds(prev => prev.filter(x => x !== id));
  };

  // Batch delete sources
  const handleBatchDeleteSources = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    try {
      // Separate local and database IDs
      const dbIds = ids.filter(id => !id.startsWith('local-'));
      
      if (dbIds.length > 0) {
        const response = await fetch(`/api/podcast-studio/materials?ids=${dbIds.join(',')}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete materials');
        }
        
        const result = await response.json();
        console.log(`🗑️ Batch deleted ${result.deletedCount} sources from database`);
      }
      
      // Remove from local state
      setProject(prev => ({
        ...prev,
        researchMaterials: prev.researchMaterials.filter(m => !ids.includes(m.id))
      }));
      setSelectedSourceIds([]);
      
      toast({
        title: `Deleted ${ids.length} source${ids.length > 1 ? 's' : ''}`,
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to batch delete sources:', error);
      toast({
        title: 'Failed to delete sources',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Batch delete scripts
  const handleBatchDeleteScripts = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    try {
      const response = await fetch(`/api/podcast-studio/script-versions?scriptIds=${ids.join(',')}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete scripts');
      }
      
      const result = await response.json();
      console.log(`🗑️ Batch deleted ${result.deletedCount} scripts`);
      
      // Clear main view if the currently displayed script was among those deleted
      if (selectedScriptId && ids.includes(selectedScriptId)) {
        setSelectedScriptId(null);
        setSelectedScript(null);
      }
      
      // Trigger refresh of script versions list
      setScriptRefreshTrigger(prev => prev + 1);
      
      toast({
        title: `Deleted ${result.deletedCount} script${result.deletedCount > 1 ? 's' : ''}`,
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to batch delete scripts:', error);
      toast({
        title: 'Failed to delete scripts',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Batch delete audio files
  const handleBatchDeleteAudio = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    try {
      const response = await fetch(`/api/podcast-studio/audio-generations?audioIds=${ids.join(',')}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete audio files');
      }
      
      const result = await response.json();
      console.log(`🗑️ Batch deleted ${result.deletedCount} audio files`);
      
      // Trigger refresh of podcast library
      setPodcastRefreshTrigger(prev => prev + 1);
      
      toast({
        title: `Deleted ${result.deletedCount} audio file${result.deletedCount > 1 ? 's' : ''}`,
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to batch delete audio:', error);
      toast({
        title: 'Failed to delete audio files',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Colors
  const centerBg = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');

  // Memoize parsed script to avoid re-parsing on every render
  const parsedGeneratedScript = useMemo(() => {
    console.log('🔄 parsedGeneratedScript useMemo running, selectedScript:', !!selectedScript);
    if (selectedScript) {
      try {
        console.log('📜 Parsing selectedScript.content:', selectedScript.content?.substring(0, 100));
        const parsed = JSON.parse(selectedScript.content || '[]');
        console.log('📜 Parsed script from selection:', parsed.length, 'turns');
        return parsed;
      } catch (e) {
        console.error('❌ Failed to parse script content:', e);
        return [];
      }
    }
    console.log('📜 No selectedScript, using project.script:', project.script.length);
    return project.script.map(s => ({ 
      id: s.id, 
      speaker: project.hosts.find(h => h.id === s.hostId)?.name || 'Unknown', 
      content: s.text, 
      emotion: s.tone || 'neutral',
      duration: s.duration 
    }));
  }, [selectedScript, project.script, project.hosts]);

  return (
    <DashboardLayout>
      <PodcastStudioProvider>
        {/* Main Layout Container - Full Screen minus header */}
        <Flex h="calc(100vh - 64px)" w="full" overflow="hidden">
          
          {/* LEFT PANEL: Sources (RetractablePanel is Fixed position) */}
          <SourcesPanel 
            materials={project.researchMaterials}
            selectedIds={selectedSourceIds}
            onToggleSource={handleToggleSource}
            onToggleAll={handleToggleAll}
            onAddSource={handleAddSource}
            onImportFromStoryIntel={handleImportFromStoryIntel}
            onDeleteSource={handleDeleteSource}
            onBatchDeleteSources={handleBatchDeleteSources}
            onBatchDeleteScripts={handleBatchDeleteScripts}
            onBatchDeleteAudio={handleBatchDeleteAudio}
            onScriptDeleted={(scriptId) => {
              console.log('🗑️ Script deleted from sidebar:', scriptId);
              if (selectedScriptId === scriptId) {
                setSelectedScriptId(null);
                setSelectedScript(null);
              }
            }}
            isCollapsed={isSourcesCollapsed}
            onToggleCollapse={() => setIsSourcesCollapsed(!isSourcesCollapsed)}
            projectId={project.id}
            onWidthChange={setLeftPanelWidth}
            onNotebookSelectorOpen={onNotebookSelectorOpen}
            mode={activeTabIndex === 1 ? 'scripts' : activeTabIndex === 2 ? 'podcasts' : 'sources'}
            selectedScriptId={selectedScriptId}
            onScriptSelect={(script) => {
              console.log('📜 Script selected in podcast-studio:', script);
              console.log('📜 Script content length:', script?.content?.length);
              setSelectedScriptId(script.id);
              setSelectedScript(script);
              console.log('📜 State updated, selectedScriptId:', script.id);
            }}
            onSelectForAudio={(script) => {
              console.log('🎵 Script selected for audio:', script);
              setSelectedScriptId(script.id);
              setSelectedScript(script);
            }}
            onPodcastSelect={async (episode) => {
              console.log('🎧 Podcast episode selected:', episode);
              
              // Fetch script data — try by scriptId first, then fall back to most recent
              let scriptData = null;
              let scriptLanguage: string | null = null;
              const epProjectId = episode.projectId || project.id;
              if (epProjectId) {
                try {
                  const scriptResponse = await fetch(`/api/podcast-studio/script-versions?projectId=${epProjectId}`);
                  if (scriptResponse.ok) {
                    const scripts = await scriptResponse.json();
                    // Try matching by scriptId first
                    let matchingScript = episode.scriptId
                      ? scripts.find((s: any) => s.id === episode.scriptId)
                      : null;
                    // Fall back to the most recent script (already sorted by created_at DESC)
                    if (!matchingScript && scripts.length > 0) {
                      matchingScript = scripts[0];
                      console.log('📝 No scriptId on episode, using most recent script');
                    }
                    if (matchingScript?.content) {
                      try {
                        scriptData = JSON.parse(matchingScript.content);
                        console.log('📝 Loaded script with', scriptData.length, 'turns');
                      } catch (e) {
                        console.error('Failed to parse script content:', e);
                      }
                    }
                    // Extract language from script generation_params
                    if (matchingScript?.generation_params) {
                      const params = typeof matchingScript.generation_params === 'string'
                        ? JSON.parse(matchingScript.generation_params)
                        : matchingScript.generation_params;
                      scriptLanguage = params?.language || null;
                      console.log('🌐 Script language from generation_params:', scriptLanguage);
                    }
                  }
                } catch (error) {
                  console.error('Failed to fetch script:', error);
                }
              }
              
              const audioUrl = episode.audioUrl || episode.filePath || '';
              console.log('🎵 Setting episode with audioUrl:', audioUrl);
              console.log('🎵 Episode data:', episode);
              
              setSelectedPodcastEpisode({
                id: episode.id,
                title: episode.title || episode.projectTitle || 'Podcast Episode',
                audioUrl: audioUrl,
                filePath: episode.filePath,
                duration: episode.duration,
                script: scriptData,
                ttsProvider: episode.ttsProvider,
                ttsModel: episode.ttsModel,
                language: scriptLanguage || episode.language,
              });
              // Switch to Audio tab (index 2) when episode is selected
              setActiveTabIndex(2);
            }}
            selectedPodcastEpisodeId={selectedPodcastEpisode?.id}
            podcastRefreshTrigger={podcastRefreshTrigger}
            scriptSavedTrigger={scriptRefreshTrigger}
          />

          {/* CENTER PANEL: Main Workspace */}
          {/* We add margin-left to account for the fixed Left Panel */}
          <Box 
            ml={isSourcesCollapsed ? '50px' : `${leftPanelWidth}px`} 
            flex="1" 
            h="full"
            overflow="hidden"
            bg={centerBg}
            transition="margin-left 0.1s ease-out"
          >
            <ScriptGenerationTabs 
              selectedSourceCount={selectedSourceIds.length}
              selectedMaterials={project.researchMaterials.filter(m => selectedSourceIds.includes(m.id))}
              hosts={project.hosts.map(h => ({ id: h.id, name: h.name, voiceName: h.voiceId, gender: h.gender, role: h.role, personality: h.personality }))}
              generatedScript={parsedGeneratedScript}
              projectId={project.id}
              selectedScriptId={selectedScriptId}
              selectedPodcastEpisode={selectedPodcastEpisode}
              selectedScriptSettings={selectedScript ? {
                ai_model: selectedScript.ai_model,
                ai_provider: selectedScript.ai_provider,
                script_length: selectedScript.script_length,
                generation_params: selectedScript.generation_params,
              } : null}
              onTabChange={(index) => {
                console.log('📑 Tab changed to:', index);
                setActiveTabIndex(index);
              }}
              onAudioDeleted={() => {
                // Trigger refresh of podcast library
                setPodcastRefreshTrigger(prev => prev + 1);
                // Clear selected podcast episode if it was deleted
                setSelectedPodcastEpisode(null);
              }}
              onScriptSaved={() => {
                // Trigger refresh of script menu in left sidebar
                console.log('📝 Script saved, incrementing refresh trigger');
                setScriptRefreshTrigger(prev => prev + 1);
              }}
              onAudioSaved={() => {
                // Trigger refresh of podcast library in left sidebar
                console.log('🎵 Audio saved, incrementing podcast refresh trigger');
                setPodcastRefreshTrigger(prev => prev + 1);
              }}
            />
          </Box>

          {/* Notes Panel is rendered in DynamicRightPanel, not here */}

        </Flex>

        {/* Notebook Selector Modal */}
        <NotebookSelector
          isOpen={isNotebookSelectorOpen}
          onClose={onNotebookSelectorClose}
          currentNotebookId={project.id}
          onSelectNotebook={async (notebookId) => {
            // Load the selected notebook
            try {
              const response = await fetch(`/api/podcast-studio/projects?id=${notebookId}`);
              if (!response.ok) throw new Error('Failed to fetch notebook');
              
              const loadedProject = await response.json();
              const materials = loadedProject.researchMaterials || [];
              
              setProject(prev => ({
                ...prev,
                id: loadedProject.id,
                title: loadedProject.title || loadedProject.name || 'Untitled Notebook',
                researchMaterials: materials.map((m: any) => ({
                  id: m.id,
                  title: m.title,
                  type: m.type === 'pdf' ? 'pdf' : m.type === 'article' ? 'article' : 'web',
                  content: m.content || '',
                  url: m.url,
                  source: m.url ? new URL(m.url).hostname : 'Upload',
                  wordCount: m.word_count || 0,
                  metadata: m.metadata,
                })),
                status: loadedProject.status || 'draft',
                createdAt: new Date(loadedProject.created_at),
                updatedAt: new Date(loadedProject.updated_at),
              }));
              
              setSelectedSourceIds(materials.map((m: any) => m.id));
              setSelectedScriptId(null);
              setSelectedScript(null);
              
              toast({
                title: 'Notebook loaded',
                description: `Switched to "${loadedProject.title}"`,
                status: 'success',
                duration: 2000,
              });
            } catch (error) {
              console.error('Failed to load notebook:', error);
              toast({
                title: 'Failed to load notebook',
                status: 'error',
                duration: 3000,
              });
            }
            onNotebookSelectorClose();
          }}
          onCreateNotebook={async (seriesId) => {
            // Create a new notebook
            try {
              const today = new Date();
              const title = `Podcast Notes - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
              
              const response = await fetch('/api/podcast-studio/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title,
                  description: 'New notebook',
                  metadata: { emoji: '🎙️' },
                  series_id: seriesId || null,
                }),
              });
              
              if (!response.ok) throw new Error('Failed to create notebook');
              
              const newProject = await response.json();
              
              setProject(prev => ({
                ...prev,
                id: newProject.id,
                title: newProject.title,
                researchMaterials: [],
                createdAt: new Date(newProject.created_at),
                updatedAt: new Date(newProject.updated_at),
              }));
              
              setSelectedSourceIds([]);
              setSelectedScriptId(null);
              setSelectedScript(null);
              
              toast({
                title: 'Notebook created',
                description: `Created "${newProject.title}"`,
                status: 'success',
                duration: 2000,
              });
            } catch (error) {
              console.error('Failed to create notebook:', error);
              toast({
                title: 'Failed to create notebook',
                status: 'error',
                duration: 3000,
              });
            }
            onNotebookSelectorClose();
          }}
        />

        {/* Add Source Modal */}
        <AddSourceModal
          isOpen={isAddSourceOpen}
          onClose={onAddSourceClose}
          onAddSource={handleSourceAdded}
          projectId={project.id}
        />
      </PodcastStudioProvider>
    </DashboardLayout>
  );
}

export default withFeatureGuard(PodcastStudioPage, 'podcast-studio');
