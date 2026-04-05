/**
 * Kids PIC (Personal Identity Core) React Hook
 * 
 * Provides easy access to the PIC system from React components.
 * Handles profile, knowledge, progress, achievements, and activity logging.
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ChildProfile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  ageGroup: 'early' | 'middle' | 'tween';
  gradeLevel?: string;
  favoriteTopics: string[];
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  preferredCharacters: string[];
  interests: string[];
  currentGoals: Goal[];
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  progress: number;
  status: 'active' | 'completed' | 'paused';
}

export interface KnowledgeEntry {
  id: string;
  sourceType: string;
  knowledgeType: string;
  category: string;
  title?: string;
  content: string;
  keywords: string[];
  importanceScore: number;
}

export interface ChildProgress {
  id: string;
  category: string;
  metricName: string;
  currentValue: number;
  targetValue?: number;
  streakCount: number;
  bestStreak: number;
}

export interface Achievement {
  id: string;
  achievementCode: string;
  title: string;
  description?: string;
  icon: string;
  category: string;
  earnedAt: Date;
}

export interface ChildContext {
  profile: ChildProfile;
  recentActivities: any[];
  currentProgress: ChildProgress[];
  recentAchievements: Achievement[];
  relevantKnowledge: KnowledgeEntry[];
  characterRelationships: any[];
}

// ============================================================================
// Hook
// ============================================================================

export function useKidsPIC() {
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [context, setContext] = useState<ChildContext | null>(null);
  const [progress, setProgress] = useState<ChildProgress[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/child/pic?action=profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContext = useCallback(async () => {
    try {
      const res = await fetch('/api/child/pic?action=context');
      if (res.ok) {
        const data = await res.json();
        setContext(data.context);
        return data.context;
      }
    } catch (err: any) {
      console.error('Failed to fetch context:', err);
    }
    return null;
  }, []);

  const fetchContextSummary = useCallback(async (): Promise<string> => {
    try {
      const res = await fetch('/api/child/pic?action=context-summary');
      if (res.ok) {
        const data = await res.json();
        return data.summary;
      }
    } catch (err: any) {
      console.error('Failed to fetch context summary:', err);
    }
    return '';
  }, []);

  const fetchProgress = useCallback(async (category?: string) => {
    try {
      const url = category 
        ? `/api/child/pic?action=progress&category=${category}`
        : '/api/child/pic?action=progress';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProgress(data.progress);
        return data.progress;
      }
    } catch (err: any) {
      console.error('Failed to fetch progress:', err);
    }
    return [];
  }, []);

  const fetchAchievements = useCallback(async () => {
    try {
      const res = await fetch('/api/child/pic?action=achievements');
      if (res.ok) {
        const data = await res.json();
        setAchievements(data.achievements);
        return data.achievements;
      }
    } catch (err: any) {
      console.error('Failed to fetch achievements:', err);
    }
    return [];
  }, []);

  // ============================================================================
  // Knowledge Management
  // ============================================================================

  const addKnowledge = useCallback(async (entry: {
    sourceType: 'workspace' | 'planner' | 'journal' | 'chat' | 'books' | 'activity';
    sourceId?: string;
    knowledgeType: 'fact' | 'preference' | 'achievement' | 'goal' | 'interest' | 'skill' | 'memory' | 'relationship';
    category: string;
    title?: string;
    content: string;
    keywords?: string[];
    importanceScore?: number;
  }) => {
    try {
      const res = await fetch('/api/child/pic?action=knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        const data = await res.json();
        return data.entry;
      }
    } catch (err: any) {
      console.error('Failed to add knowledge:', err);
    }
    return null;
  }, []);

  const searchKnowledge = useCallback(async (query: string): Promise<KnowledgeEntry[]> => {
    try {
      const res = await fetch(`/api/child/pic?action=search-knowledge&q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        return data.results;
      }
    } catch (err: any) {
      console.error('Failed to search knowledge:', err);
    }
    return [];
  }, []);

  // ============================================================================
  // Progress Tracking
  // ============================================================================

  const updateProgress = useCallback(async (
    category: string,
    metricName: string,
    value: number,
    options?: { incrementStreak?: boolean; targetValue?: number; unit?: string }
  ) => {
    try {
      const res = await fetch('/api/child/pic?action=progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, metricName, value, ...options }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update local progress state
        setProgress(prev => {
          const idx = prev.findIndex(p => p.category === category && p.metricName === metricName);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = data.progress;
            return updated;
          }
          return [...prev, data.progress];
        });
        
        // Handle new achievements
        if (data.newAchievements?.length > 0) {
          setAchievements(prev => [...data.newAchievements, ...prev]);
        }
        
        return { progress: data.progress, newAchievements: data.newAchievements };
      }
    } catch (err: any) {
      console.error('Failed to update progress:', err);
    }
    return null;
  }, []);

  // ============================================================================
  // Activity Logging
  // ============================================================================

  const logActivity = useCallback(async (activity: {
    activityType: string;
    activityCategory: string;
    sourceType: string;
    sourceId?: string;
    title?: string;
    description?: string;
    metadata?: Record<string, any>;
    durationSeconds?: number;
  }) => {
    try {
      const res = await fetch('/api/child/pic?action=activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      });
      if (res.ok) {
        const data = await res.json();
        return data.activity;
      }
    } catch (err: any) {
      console.error('Failed to log activity:', err);
    }
    return null;
  }, []);

  // ============================================================================
  // Character Interactions
  // ============================================================================

  const recordCharacterInteraction = useCallback(async (
    characterId: string,
    characterName: string,
    topic?: string,
    memorableMoment?: string
  ) => {
    try {
      const res = await fetch('/api/child/pic?action=character-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, characterName, topic, memorableMoment }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.interaction;
      }
    } catch (err: any) {
      console.error('Failed to record character interaction:', err);
    }
    return null;
  }, []);

  // ============================================================================
  // Profile Updates
  // ============================================================================

  const updateProfile = useCallback(async (updates: Partial<ChildProfile>) => {
    try {
      const res = await fetch('/api/child/pic?action=profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        return data.profile;
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err);
    }
    return null;
  }, []);

  // ============================================================================
  // Convenience Methods for Common Activities
  // ============================================================================

  const logJournalEntry = useCallback(async (entryId: string, title: string, content: string) => {
    // Log activity
    await logActivity({
      activityType: 'journal_entry',
      activityCategory: 'journal',
      sourceType: 'journal',
      sourceId: entryId,
      title,
      description: content.substring(0, 200),
    });

    // Add knowledge
    await addKnowledge({
      sourceType: 'journal',
      sourceId: entryId,
      knowledgeType: 'memory',
      category: 'personal',
      title,
      content,
      importanceScore: 0.7,
    });

    // Update progress
    return updateProgress('journal', 'journal_entries', 1, { incrementStreak: true });
  }, [logActivity, addKnowledge, updateProgress]);

  const logPlannerTask = useCallback(async (taskId: string, title: string, completed: boolean) => {
    await logActivity({
      activityType: completed ? 'task_completed' : 'task_created',
      activityCategory: 'planner',
      sourceType: 'planner',
      sourceId: taskId,
      title,
    });

    if (completed) {
      return updateProgress('planner', 'tasks_completed', 1, { incrementStreak: false });
    }
    return null;
  }, [logActivity, updateProgress]);

  const logWorkspacePage = useCallback(async (pageId: string, title: string, pageType?: string) => {
    await logActivity({
      activityType: 'page_created',
      activityCategory: 'workspace',
      sourceType: 'workspace',
      sourceId: pageId,
      title,
      metadata: { pageType },
    });

    return updateProgress('workspace', 'pages_created', 1, { incrementStreak: false });
  }, [logActivity, updateProgress]);

  const logChatSession = useCallback(async (sessionId: string, characterId: string, characterName: string, topic?: string) => {
    await logActivity({
      activityType: 'chat_session',
      activityCategory: 'chat',
      sourceType: 'chat',
      sourceId: sessionId,
      title: `Chat with ${characterName}`,
      metadata: { characterId, topic },
    });

    await recordCharacterInteraction(characterId, characterName, topic);

    return updateProgress('chat', 'chat_sessions', 1, { incrementStreak: false });
  }, [logActivity, recordCharacterInteraction, updateProgress]);

  const logBookRead = useCallback(async (bookId: string, title: string, pagesRead?: number) => {
    await logActivity({
      activityType: 'book_read',
      activityCategory: 'books',
      sourceType: 'books',
      sourceId: bookId,
      title,
      metadata: { pagesRead },
    });

    return updateProgress('books', 'books_read', 1, { incrementStreak: false });
  }, [logActivity, updateProgress]);

  return {
    // State
    profile,
    context,
    progress,
    achievements,
    loading,
    error,

    // Fetch methods
    fetchProfile,
    fetchContext,
    fetchContextSummary,
    fetchProgress,
    fetchAchievements,

    // Knowledge
    addKnowledge,
    searchKnowledge,

    // Progress
    updateProgress,

    // Activity
    logActivity,

    // Characters
    recordCharacterInteraction,

    // Profile
    updateProfile,

    // Convenience methods
    logJournalEntry,
    logPlannerTask,
    logWorkspacePage,
    logChatSession,
    logBookRead,
  };
}

export default useKidsPIC;
