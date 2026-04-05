/**
 * Student Progress Context
 * 
 * Shared context for tracking student progress across:
 * - Planner (homework, activities, goals)
 * - Workspace (documents, math practice, reading)
 * 
 * This enables contextual awareness between pages.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Types for planner items
interface PlannerItem {
  id: string;
  title: string;
  type: 'homework' | 'activity' | 'reminder' | 'goal';
  date: string;
  time?: string;
  completed: boolean;
  subject?: string;
  notes?: string;
}

// Types for workspace documents
interface WorkspaceDocument {
  id: string;
  title: string;
  type: 'story' | 'essay' | 'poem' | 'homework' | 'notes';
  content: string;
  wordCount: number;
  lastEdited: Date;
  linkedPlannerItem?: string; // Link to planner homework
}

// Types for math progress
interface MathProgress {
  topic: string;
  problemsSolved: number;
  correctAnswers: number;
  lastPracticed: Date;
}

// Types for reading progress
interface ReadingProgress {
  bookTitle: string;
  pagesRead: number;
  totalPages?: number;
  lastRead: Date;
  notes: string[];
}

// Overall student progress
interface StudentProgress {
  // Planner data
  plannerItems: PlannerItem[];
  todaysTasks: PlannerItem[];
  upcomingHomework: PlannerItem[];
  completedToday: number;
  
  // Workspace data
  documents: WorkspaceDocument[];
  recentDocuments: WorkspaceDocument[];
  
  // Math progress
  mathProgress: MathProgress[];
  totalMathProblems: number;
  mathAccuracy: number;
  
  // Reading progress
  readingProgress: ReadingProgress[];
  booksExplored: number;
  
  // Streaks and achievements
  dailyStreak: number;
  totalPointsEarned: number;
  achievements: string[];
  
  // Learning preferences
  preferredSubjects: string[];
  mathDifficulty: 'easy' | 'medium' | 'hard';
}

interface StudentProgressContextType {
  progress: StudentProgress;
  loading: boolean;
  
  // Planner actions
  fetchPlannerItems: () => Promise<void>;
  addPlannerItem: (item: Omit<PlannerItem, 'id'>) => Promise<void>;
  completePlannerItem: (id: string) => Promise<void>;
  
  // Workspace actions
  fetchDocuments: () => Promise<void>;
  saveDocument: (doc: Omit<WorkspaceDocument, 'id' | 'lastEdited'>) => Promise<void>;
  linkDocumentToHomework: (docId: string, homeworkId: string) => void;
  
  // Math actions
  recordMathPractice: (topic: string, correct: boolean) => void;
  
  // Reading actions
  recordBookProgress: (bookTitle: string, pagesRead: number) => void;
  
  // Get contextual suggestions
  getHomeworkSuggestions: () => PlannerItem[];
  getWritingPrompts: () => string[];
  getMathRecommendations: () => string[];
}

const defaultProgress: StudentProgress = {
  plannerItems: [],
  todaysTasks: [],
  upcomingHomework: [],
  completedToday: 0,
  documents: [],
  recentDocuments: [],
  mathProgress: [],
  totalMathProblems: 0,
  mathAccuracy: 0,
  readingProgress: [],
  booksExplored: 0,
  dailyStreak: 0,
  totalPointsEarned: 0,
  achievements: [],
  preferredSubjects: [],
  mathDifficulty: 'easy',
};

const StudentProgressContext = createContext<StudentProgressContextType | undefined>(undefined);

export function StudentProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<StudentProgress>(defaultProgress);
  const [loading, setLoading] = useState(true);

  // Load progress from localStorage and API on mount
  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    setLoading(true);
    try {
      // Load from localStorage first for immediate display
      const cached = localStorage.getItem('studentProgress');
      if (cached) {
        const parsed = JSON.parse(cached);
        setProgress(prev => ({ ...prev, ...parsed }));
      }

      // Fetch planner items from API
      await fetchPlannerItems();
      
      // Load math progress from localStorage
      const mathData = localStorage.getItem('childMathProgress');
      if (mathData) {
        const mathProgress = JSON.parse(mathData);
        setProgress(prev => ({
          ...prev,
          mathProgress,
          totalMathProblems: mathProgress.reduce((sum: number, m: MathProgress) => sum + m.problemsSolved, 0),
          mathAccuracy: calculateMathAccuracy(mathProgress),
        }));
      }

      // Load reading progress
      const readingData = localStorage.getItem('childReadingProgress');
      if (readingData) {
        const readingProgress = JSON.parse(readingData);
        setProgress(prev => ({
          ...prev,
          readingProgress,
          booksExplored: readingProgress.length,
        }));
      }

      // Load streak and achievements
      const streakData = localStorage.getItem('childStreak');
      if (streakData) {
        const { streak, points, achievements } = JSON.parse(streakData);
        setProgress(prev => ({
          ...prev,
          dailyStreak: streak || 0,
          totalPointsEarned: points || 0,
          achievements: achievements || [],
        }));
      }

    } catch (error) {
      console.error('Failed to load student progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMathAccuracy = (mathProgress: MathProgress[]): number => {
    const total = mathProgress.reduce((sum, m) => sum + m.problemsSolved, 0);
    const correct = mathProgress.reduce((sum, m) => sum + m.correctAnswers, 0);
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  };

  const fetchPlannerItems = useCallback(async () => {
    try {
      const res = await fetch('/api/child/planner');
      if (res.ok) {
        const data = await res.json();
        const items: PlannerItem[] = data.items || [];
        
        // Use local timezone instead of UTC
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todaysTasks = items.filter(i => i.date === today);
        const upcomingHomework = items.filter(i => 
          i.type === 'homework' && 
          !i.completed && 
          new Date(i.date) >= new Date()
        ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setProgress(prev => ({
          ...prev,
          plannerItems: items,
          todaysTasks,
          upcomingHomework,
          completedToday: todaysTasks.filter(t => t.completed).length,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch planner items:', error);
    }
  }, []);

  const addPlannerItem = async (item: Omit<PlannerItem, 'id'>) => {
    try {
      const res = await fetch('/api/child/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        await fetchPlannerItems();
      }
    } catch (error) {
      console.error('Failed to add planner item:', error);
    }
  };

  const completePlannerItem = async (id: string) => {
    try {
      const res = await fetch('/api/child/planner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: true }),
      });
      if (res.ok) {
        await fetchPlannerItems();
        // Award points for completion
        updateStreak(10);
      }
    } catch (error) {
      console.error('Failed to complete planner item:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/child/documents');
      if (res.ok) {
        const data = await res.json();
        const documents: WorkspaceDocument[] = data.documents || [];
        const recentDocuments = documents
          .sort((a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime())
          .slice(0, 5);
        
        setProgress(prev => ({
          ...prev,
          documents,
          recentDocuments,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const saveDocument = async (doc: Omit<WorkspaceDocument, 'id' | 'lastEdited'>) => {
    try {
      const res = await fetch('/api/child/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      if (res.ok) {
        await fetchDocuments();
        updateStreak(5);
      }
    } catch (error) {
      console.error('Failed to save document:', error);
    }
  };

  const linkDocumentToHomework = (docId: string, homeworkId: string) => {
    setProgress(prev => ({
      ...prev,
      documents: prev.documents.map(d => 
        d.id === docId ? { ...d, linkedPlannerItem: homeworkId } : d
      ),
    }));
  };

  const recordMathPractice = (topic: string, correct: boolean) => {
    setProgress(prev => {
      const existing = prev.mathProgress.find(m => m.topic === topic);
      let newMathProgress: MathProgress[];
      
      if (existing) {
        newMathProgress = prev.mathProgress.map(m => 
          m.topic === topic 
            ? { 
                ...m, 
                problemsSolved: m.problemsSolved + 1,
                correctAnswers: m.correctAnswers + (correct ? 1 : 0),
                lastPracticed: new Date(),
              }
            : m
        );
      } else {
        newMathProgress = [
          ...prev.mathProgress,
          {
            topic,
            problemsSolved: 1,
            correctAnswers: correct ? 1 : 0,
            lastPracticed: new Date(),
          },
        ];
      }

      // Save to localStorage
      localStorage.setItem('childMathProgress', JSON.stringify(newMathProgress));

      // Award points
      if (correct) {
        updateStreak(5);
      }

      return {
        ...prev,
        mathProgress: newMathProgress,
        totalMathProblems: newMathProgress.reduce((sum, m) => sum + m.problemsSolved, 0),
        mathAccuracy: calculateMathAccuracy(newMathProgress),
      };
    });
  };

  const recordBookProgress = (bookTitle: string, pagesRead: number) => {
    setProgress(prev => {
      const existing = prev.readingProgress.find(r => r.bookTitle === bookTitle);
      let newReadingProgress: ReadingProgress[];
      
      if (existing) {
        newReadingProgress = prev.readingProgress.map(r =>
          r.bookTitle === bookTitle
            ? { ...r, pagesRead: r.pagesRead + pagesRead, lastRead: new Date() }
            : r
        );
      } else {
        newReadingProgress = [
          ...prev.readingProgress,
          {
            bookTitle,
            pagesRead,
            lastRead: new Date(),
            notes: [],
          },
        ];
      }

      localStorage.setItem('childReadingProgress', JSON.stringify(newReadingProgress));
      updateStreak(3);

      return {
        ...prev,
        readingProgress: newReadingProgress,
        booksExplored: newReadingProgress.length,
      };
    });
  };

  const updateStreak = (points: number) => {
    setProgress(prev => {
      const today = new Date().toDateString();
      const lastActive = localStorage.getItem('childLastActive');
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      let newStreak = prev.dailyStreak;
      if (lastActive === yesterday) {
        newStreak = prev.dailyStreak + 1;
      } else if (lastActive !== today) {
        newStreak = 1;
      }

      const newPoints = prev.totalPointsEarned + points;
      
      localStorage.setItem('childLastActive', today);
      localStorage.setItem('childStreak', JSON.stringify({
        streak: newStreak,
        points: newPoints,
        achievements: prev.achievements,
      }));

      return {
        ...prev,
        dailyStreak: newStreak,
        totalPointsEarned: newPoints,
      };
    });
  };

  // Contextual suggestions based on progress
  const getHomeworkSuggestions = (): PlannerItem[] => {
    return progress.upcomingHomework.slice(0, 3);
  };

  const getWritingPrompts = (): string[] => {
    const prompts: string[] = [];
    
    // Suggest based on upcoming homework
    const writingHomework = progress.upcomingHomework.filter(h => 
      h.subject?.toLowerCase().includes('english') || 
      h.subject?.toLowerCase().includes('writing') ||
      h.title.toLowerCase().includes('essay') ||
      h.title.toLowerCase().includes('story')
    );
    
    if (writingHomework.length > 0) {
      prompts.push(`Work on: ${writingHomework[0].title}`);
    }

    // Suggest based on reading progress
    if (progress.readingProgress.length > 0) {
      const lastBook = progress.readingProgress[0];
      prompts.push(`Write about "${lastBook.bookTitle}"`);
    }

    // Default prompts
    prompts.push('Start a new creative story');
    prompts.push('Write about your day');
    
    return prompts.slice(0, 4);
  };

  const getMathRecommendations = (): string[] => {
    const recommendations: string[] = [];
    
    // Find topics that need practice (low accuracy)
    const weakTopics = progress.mathProgress
      .filter(m => m.problemsSolved > 0 && (m.correctAnswers / m.problemsSolved) < 0.7)
      .map(m => m.topic);
    
    if (weakTopics.length > 0) {
      recommendations.push(`Practice more: ${weakTopics[0]}`);
    }

    // Check for math homework
    const mathHomework = progress.upcomingHomework.filter(h =>
      h.subject?.toLowerCase().includes('math') ||
      h.title.toLowerCase().includes('math')
    );
    
    if (mathHomework.length > 0) {
      recommendations.push(`Homework due: ${mathHomework[0].title}`);
    }

    // Suggest new topics
    const allTopics = ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Fractions', 'Geometry'];
    const practicedTopics = progress.mathProgress.map(m => m.topic);
    const newTopics = allTopics.filter(t => !practicedTopics.includes(t));
    
    if (newTopics.length > 0) {
      recommendations.push(`Try something new: ${newTopics[0]}`);
    }

    return recommendations;
  };

  return (
    <StudentProgressContext.Provider
      value={{
        progress,
        loading,
        fetchPlannerItems,
        addPlannerItem,
        completePlannerItem,
        fetchDocuments,
        saveDocument,
        linkDocumentToHomework,
        recordMathPractice,
        recordBookProgress,
        getHomeworkSuggestions,
        getWritingPrompts,
        getMathRecommendations,
      }}
    >
      {children}
    </StudentProgressContext.Provider>
  );
}

// Default context value for use outside provider (e.g., in right panel components)
const defaultContextValue: StudentProgressContextType = {
  progress: defaultProgress,
  loading: false,
  fetchPlannerItems: async () => {},
  addPlannerItem: async () => {},
  completePlannerItem: async () => {},
  fetchDocuments: async () => {},
  saveDocument: async () => {},
  linkDocumentToHomework: () => {},
  recordMathPractice: () => {},
  recordBookProgress: () => {},
  getHomeworkSuggestions: () => [],
  getWritingPrompts: () => [],
  getMathRecommendations: () => [],
};

export function useStudentProgress() {
  const context = useContext(StudentProgressContext);
  // Return safe default if used outside provider (e.g., in right panel)
  if (context === undefined) {
    return defaultContextValue;
  }
  return context;
}

export default StudentProgressContext;
