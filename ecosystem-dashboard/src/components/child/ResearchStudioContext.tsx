import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  ProactiveSuggestion,
  WorkflowStage,
  ExportReadiness,
} from '@/lib/research/proactive-engine';

export interface ResearchStudioSource {
  id: string;
  title: string;
  url: string;
  query: string;
  tool: string;
  addedAt: number;
}

export interface ResearchStudioNote {
  id: string;
  text: string;
  createdAt: number;
  source?: 'manual' | 'proactive';
  acceptedFromSuggestion?: boolean;
}

export interface ResearchSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  activeQuery: string;
  activeTool: string;
  sources: ResearchStudioSource[];
  notes: ResearchStudioNote[];
  followUpIdeas: string[];
  messageCount: number;
}

export type ExportFormat = 'docx' | 'pptx' | 'pdf';

export type ExportState = 'idle' | 'preparing' | 'ready' | 'downloading' | 'error';

export interface ResearchStudioSnapshot {
  activeQuery: string;
  activeTool: string;
  sources: ResearchStudioSource[];
  notes: ResearchStudioNote[];
  followUpIdeas: string[];
  messageCount: number;
  proactiveSuggestions: ProactiveSuggestion[];
  dismissedSuggestionIds: string[];
  workflowStage: WorkflowStage;
  exportReadiness: ExportReadiness | null;
  exportState: ExportState;
  exportFormat: ExportFormat | null;
  exportHtml: string | null;
  exportTitle: string | null;
  showDocumentViewer: boolean;
  sessions: ResearchSession[];
  activeSessionId: string | null;
}

interface ResearchStudioContextValue extends ResearchStudioSnapshot {
  setActiveQuery: (query: string) => void;
  setActiveTool: (tool: string) => void;
  setMessageCount: (count: number) => void;
  addSources: (sources: Omit<ResearchStudioSource, 'id' | 'addedAt'>[]) => void;
  addFollowUpIdeas: (ideas: string[]) => void;
  removeSource: (id: string) => void;
  addNote: (text: string, source?: 'manual' | 'proactive') => void;
  removeNote: (id: string) => void;
  addProactiveSuggestions: (suggestions: ProactiveSuggestion[]) => void;
  dismissSuggestion: (id: string) => void;
  clearProactiveSuggestions: () => void;
  setWorkflowStage: (stage: WorkflowStage) => void;
  setExportReadiness: (readiness: ExportReadiness | null) => void;
  setExportState: (state: ExportState) => void;
  setExportFormat: (format: ExportFormat | null) => void;
  setExportHtml: (html: string | null) => void;
  setExportTitle: (title: string | null) => void;
  setShowDocumentViewer: (show: boolean) => void;
  saveCurrentSession: () => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
  startNewSession: () => void;
}

const STORAGE_KEY_SOURCES = 'childResearchSources';
const STORAGE_KEY_NOTES = 'childResearchNotes';
const STORAGE_KEY_SESSIONS = 'childResearchSessions';
const STORAGE_KEY_ACTIVE_SESSION = 'childResearchActiveSession';
const MAX_SESSIONS = 20;
const initialSnapshot: ResearchStudioSnapshot = {
  activeQuery: '',
  activeTool: '',
  sources: [],
  notes: [],
  followUpIdeas: [],
  messageCount: 0,
  proactiveSuggestions: [],
  dismissedSuggestionIds: [],
  workflowStage: 'exploring',
  exportReadiness: null,
  exportState: 'idle',
  exportFormat: null,
  exportHtml: null,
  exportTitle: null,
  showDocumentViewer: false,
  sessions: [],
  activeSessionId: null,
};

const ResearchStudioContext = createContext<ResearchStudioContextValue | null>(null);

export function ResearchStudioProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<ResearchStudioSnapshot>(initialSnapshot);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedSources = localStorage.getItem(STORAGE_KEY_SOURCES);
      if (savedSources) {
        const sources = JSON.parse(savedSources) as ResearchStudioSource[];
        setSnapshot((current) => ({ ...current, sources }));
      }
      const savedNotes = localStorage.getItem(STORAGE_KEY_NOTES);
      if (savedNotes) {
        const notes = JSON.parse(savedNotes) as ResearchStudioNote[];
        setSnapshot((current) => ({ ...current, notes }));
      }
      const savedSessions = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (savedSessions) {
        const sessions = JSON.parse(savedSessions) as ResearchSession[];
        setSnapshot((current) => ({ ...current, sessions }));
      }
      const savedActiveSession = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION);
      if (savedActiveSession) {
        setSnapshot((current) => ({ ...current, activeSessionId: savedActiveSession }));
      }
    } catch {
      setSnapshot(initialSnapshot);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hasHydrated) {
      localStorage.setItem(STORAGE_KEY_SOURCES, JSON.stringify(snapshot.sources));
    }
  }, [hasHydrated, snapshot.sources]);

  useEffect(() => {
    if (hasHydrated) {
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(snapshot.notes));
    }
  }, [hasHydrated, snapshot.notes]);

  // Persist sessions to localStorage
  useEffect(() => {
    if (hasHydrated) {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(snapshot.sessions));
    }
  }, [hasHydrated, snapshot.sessions]);

  useEffect(() => {
    if (hasHydrated) {
      if (snapshot.activeSessionId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION, snapshot.activeSessionId);
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
      }
    }
  }, [hasHydrated, snapshot.activeSessionId]);

  const setActiveQuery = useCallback((activeQuery: string) => {
    setSnapshot((current) => current.activeQuery === activeQuery ? current : { ...current, activeQuery });
  }, []);

  const setActiveTool = useCallback((activeTool: string) => {
    setSnapshot((current) => current.activeTool === activeTool ? current : { ...current, activeTool });
  }, []);

  const setMessageCount = useCallback((messageCount: number) => {
    setSnapshot((current) => current.messageCount === messageCount ? current : { ...current, messageCount });
  }, []);

  const addSources = useCallback((sources: Omit<ResearchStudioSource, 'id' | 'addedAt'>[]) => {
    if (sources.length === 0) return;
    setSnapshot((current) => {
      const additions = sources
        .filter((source) => source.title || source.url)
        .map((source) => ({
          ...source,
          id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          addedAt: Date.now(),
        }));
      const existingUrls = new Set(current.sources.map((source) => source.url).filter(Boolean));
      const uniqueAdditions = additions.filter((source) => !source.url || !existingUrls.has(source.url));
      return { ...current, sources: [...uniqueAdditions, ...current.sources].slice(0, 50) };
    });
  }, []);

  const addFollowUpIdeas = useCallback((ideas: string[]) => {
    setSnapshot((current) => ({
      ...current,
      followUpIdeas: [...ideas, ...current.followUpIdeas]
        .filter((idea, index, all) => Boolean(idea) && all.indexOf(idea) === index)
        .slice(0, 10),
    }));
  }, []);

  const removeSource = useCallback((id: string) => {
    setSnapshot((current) => ({
      ...current,
      sources: current.sources.filter((source) => source.id !== id),
    }));
  }, []);

  const addNote = useCallback((text: string, source: 'manual' | 'proactive' = 'manual') => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSnapshot((current) => {
      const note: ResearchStudioNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: trimmed,
        createdAt: Date.now(),
        source,
      };
      return { ...current, notes: [note, ...current.notes].slice(0, 100) };
    });
  }, []);

  const removeNote = useCallback((id: string) => {
    setSnapshot((current) => ({
      ...current,
      notes: current.notes.filter((n) => n.id !== id),
    }));
  }, []);

  const addProactiveSuggestions = useCallback((suggestions: ProactiveSuggestion[]) => {
    if (suggestions.length === 0) return;
    setSnapshot((current) => {
      const existingIds = new Set(current.proactiveSuggestions.map((s) => s.id));
      const fresh = suggestions.filter((s) => !existingIds.has(s.id) && !current.dismissedSuggestionIds.includes(s.id));
      if (fresh.length === 0) return current;
      return {
        ...current,
        proactiveSuggestions: [...fresh, ...current.proactiveSuggestions].slice(0, 20),
      };
    });
  }, []);

  const dismissSuggestion = useCallback((id: string) => {
    setSnapshot((current) => ({
      ...current,
      proactiveSuggestions: current.proactiveSuggestions.filter((s) => s.id !== id),
      dismissedSuggestionIds: [...current.dismissedSuggestionIds, id].slice(0, 100),
    }));
  }, []);

  const clearProactiveSuggestions = useCallback(() => {
    setSnapshot((current) => ({ ...current, proactiveSuggestions: [] }));
  }, []);

  const setWorkflowStage = useCallback((workflowStage: WorkflowStage) => {
    setSnapshot((current) => current.workflowStage === workflowStage ? current : { ...current, workflowStage });
  }, []);

  const setExportReadiness = useCallback((exportReadiness: ExportReadiness | null) => {
    setSnapshot((current) => ({ ...current, exportReadiness }));
  }, []);

  const setExportState = useCallback((exportState: ExportState) => {
    setSnapshot((current) => ({ ...current, exportState }));
  }, []);

  const setExportFormat = useCallback((exportFormat: ExportFormat | null) => {
    setSnapshot((current) => ({ ...current, exportFormat }));
  }, []);

  const setExportHtml = useCallback((exportHtml: string | null) => {
    setSnapshot((current) => ({ ...current, exportHtml }));
  }, []);

  const setExportTitle = useCallback((exportTitle: string | null) => {
    setSnapshot((current) => ({ ...current, exportTitle }));
  }, []);

  const setShowDocumentViewer = useCallback((showDocumentViewer: boolean) => {
    setSnapshot((current) => ({ ...current, showDocumentViewer }));
  }, []);

  // ─── Session management ───────────────────────────────────────────────

  const saveCurrentSession = useCallback(() => {
    setSnapshot((current) => {
      const now = Date.now();
      const title = current.activeQuery || `Research Session ${new Date(now).toLocaleDateString()}`;
      const session: ResearchSession = {
        id: current.activeSessionId || `session-${now}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        createdAt: current.activeSessionId ? (current.sessions.find(s => s.id === current.activeSessionId)?.createdAt || now) : now,
        updatedAt: now,
        activeQuery: current.activeQuery,
        activeTool: current.activeTool,
        sources: current.sources,
        notes: current.notes,
        followUpIdeas: current.followUpIdeas,
        messageCount: current.messageCount,
      };
      const existingIdx = current.sessions.findIndex(s => s.id === session.id);
      const sessions = existingIdx >= 0
        ? current.sessions.map(s => s.id === session.id ? session : s)
        : [session, ...current.sessions].slice(0, MAX_SESSIONS);
      return { ...current, sessions, activeSessionId: session.id };
    });
  }, []);

  const loadSession = useCallback((id: string) => {
    setSnapshot((current) => {
      const session = current.sessions.find(s => s.id === id);
      if (!session) return current;
      return {
        ...current,
        activeQuery: session.activeQuery,
        activeTool: session.activeTool,
        sources: session.sources,
        notes: session.notes,
        followUpIdeas: session.followUpIdeas,
        messageCount: session.messageCount,
        activeSessionId: session.id,
        proactiveSuggestions: [],
        dismissedSuggestionIds: [],
        exportState: 'idle',
        exportHtml: null,
        exportTitle: null,
        showDocumentViewer: false,
      };
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSnapshot((current) => ({
      ...current,
      sessions: current.sessions.filter(s => s.id !== id),
      activeSessionId: current.activeSessionId === id ? null : current.activeSessionId,
    }));
  }, []);

  const startNewSession = useCallback(() => {
    setSnapshot((current) => ({
      ...current,
      activeQuery: '',
      activeTool: '',
      sources: [],
      notes: [],
      followUpIdeas: [],
      messageCount: 0,
      activeSessionId: null,
      proactiveSuggestions: [],
      dismissedSuggestionIds: [],
      exportState: 'idle',
      exportHtml: null,
      exportTitle: null,
      showDocumentViewer: false,
    }));
  }, []);

  const value = useMemo<ResearchStudioContextValue>(() => ({
    ...snapshot,
    setActiveQuery,
    setActiveTool,
    setMessageCount,
    addSources,
    addFollowUpIdeas,
    removeSource,
    addNote,
    removeNote,
    addProactiveSuggestions,
    dismissSuggestion,
    clearProactiveSuggestions,
    setWorkflowStage,
    setExportReadiness,
    setExportState,
    setExportFormat,
    setExportHtml,
    setExportTitle,
    setShowDocumentViewer,
    saveCurrentSession,
    loadSession,
    deleteSession,
    startNewSession,
  }), [snapshot, setActiveQuery, setActiveTool, setMessageCount, addSources, addFollowUpIdeas, removeSource, addNote, removeNote, addProactiveSuggestions, dismissSuggestion, clearProactiveSuggestions, setWorkflowStage, setExportReadiness, setExportState, setExportFormat, setExportHtml, setExportTitle, setShowDocumentViewer, saveCurrentSession, loadSession, deleteSession, startNewSession]);

  return <ResearchStudioContext.Provider value={value}>{children}</ResearchStudioContext.Provider>;
}

export function useResearchStudio() {
  return useContext(ResearchStudioContext);
}
