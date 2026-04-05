import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

export interface PodcastProject {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'in_progress' | 'ready' | 'published';
  script_length?: string;
  script_tone?: string;
  script_audience?: string;
  script_style?: string;
  include_stories?: boolean;
  include_examples?: boolean;
}

export interface ScriptGeneration {
  id: string;
  project_id: string;
  version: number;
  content: any; // PodcastScript JSON
  is_current: boolean;
  status: string;
  generation_params: any;
  ai_model?: string;
  created_at: Date;
}

/**
 * Hook for managing podcast projects with event-driven PostgreSQL persistence
 */
export function usePodcastProject(projectId: string | null) {
  const [project, setProject] = useState<PodcastProject | null>(null);
  const [activeScript, setActiveScript] = useState<ScriptGeneration | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const toast = useToast();
  const saveDebounceRef = useRef<NodeJS.Timeout>();

  // Load project from database
  const loadProject = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/podcast-studio/projects?id=${projectId}`);
      if (!response.ok) throw new Error('Failed to load project');
      
      const data = await response.json();
      setProject(data);
      
      // Load current script
      const scriptResponse = await fetch(`/api/podcast-studio/scripts?projectId=${projectId}`);
      if (scriptResponse.ok) {
        const scriptData = await scriptResponse.json();
        setActiveScript(scriptData.currentScript);
      }
      
      console.log('✅ Project loaded from database:', data.title);
    } catch (error) {
      console.error('Failed to load project:', error);
      toast({
        title: 'Failed to load project',
        description: 'Using local cache if available',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  // Save project to database
  const saveProject = useCallback(async (
    updatedProject: Partial<PodcastProject>,
    reason: string
  ) => {
    if (!projectId || isSaving) return;
    
    console.log(`💾 Saving project: ${reason}`);
    setIsSaving(true);
    
    try {
      const response = await fetch(`/api/podcast-studio/projects?id=${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject),
      });
      
      if (!response.ok) throw new Error('Failed to save project');
      
      const savedProject = await response.json();
      setProject(savedProject);
      setLastSaved(new Date());
      setIsDirty(false);
      
      toast({
        title: 'Saved',
        description: reason,
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: 'Save failed',
        description: 'Will retry automatically',
        status: 'warning',
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  }, [projectId, isSaving, toast]);

  // Save script to database
  const saveScript = useCallback(async (
    script: any,
    reason: string
  ) => {
    if (!projectId || isSaving) return;
    
    console.log(`💾 Saving script: ${reason}`);
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/podcast-studio/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          content: script,
          status: 'generated',
          generation_params: {},
        }),
      });
      
      if (!response.ok) throw new Error('Failed to save script');
      
      const savedScript = await response.json();
      setActiveScript(savedScript);
      setLastSaved(new Date());
      setIsDirty(false);
      
      toast({
        title: 'Script saved',
        description: reason,
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Script save failed:', error);
      toast({
        title: 'Save failed',
        description: 'Script saved locally',
        status: 'warning',
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  }, [projectId, isSaving, toast]);

  // Debounced save for user edits
  const debouncedSave = useCallback((
    data: any,
    reason: string
  ) => {
    setIsDirty(true);
    
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }
    
    saveDebounceRef.current = setTimeout(() => {
      if (data.content) {
        saveScript(data, reason);
      } else {
        saveProject(data, reason);
      }
    }, 3000); // Wait 3 seconds after last edit
  }, [saveProject, saveScript]);

  // Event handlers for different save triggers
  const onGenerationComplete = useCallback((script: any, pass: number) => {
    console.log(`✅ Pass ${pass} complete - saving immediately`);
    saveScript(script, `Script generation Pass ${pass} complete`);
  }, [saveScript]);

  const onUserEdit = useCallback((data: any) => {
    debouncedSave(data, 'User edited content');
  }, [debouncedSave]);

  const onTabChange = useCallback((fromTab: number, toTab: number) => {
    if (isDirty && activeScript) {
      saveScript(activeScript, `Tab change: ${fromTab} → ${toTab}`);
    }
  }, [isDirty, activeScript, saveScript]);

  const saveNow = useCallback(() => {
    if (activeScript) {
      saveScript(activeScript, 'Manual save');
    } else if (project) {
      saveProject(project, 'Manual save');
    }
  }, [activeScript, project, saveScript, saveProject]);

  // Load on mount
  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId, loadProject]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, []);

  // Save before navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes';
        
        // Emergency save
        if (activeScript) {
          navigator.sendBeacon(
            '/api/podcast-studio/scripts',
            JSON.stringify({
              project_id: projectId,
              content: activeScript,
            })
          );
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, activeScript, projectId]);

  return {
    project,
    activeScript,
    isDirty,
    isSaving,
    isLoading,
    lastSaved,
    
    // Actions
    loadProject,
    saveProject,
    saveScript,
    saveNow,
    
    // Event handlers
    onGenerationComplete,
    onUserEdit,
    onTabChange,
  };
}
