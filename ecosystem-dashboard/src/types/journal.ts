/**
 * Journal Types for Child Journal Activity
 * 
 * Integrated with Workspace-AI and Planner for a cohesive
 * journaling experience that emphasizes:
 * - Creative thinking and self-expression
 * - Highlighting positives of the day
 * - Reflecting on challenges and improvements
 * - GooseMind-powered skill evaluation and recommendations
 */

// ============================================================================
// Core Journal Types
// ============================================================================

export type JournalEntryType = 
  | 'daily'           // Daily reflection journal
  | 'gratitude'       // What I'm thankful for
  | 'creative'        // Creative writing/stories
  | 'learning'        // What I learned today
  | 'goals'           // Goals and aspirations
  | 'feelings'        // Emotional check-in
  | 'adventure';      // Adventures and experiences

export type MoodType = 
  | 'amazing'         // 🌟
  | 'happy'           // 😊
  | 'okay'            // 😐
  | 'sad'             // 😢
  | 'frustrated'      // 😤
  | 'excited'         // 🎉
  | 'calm'            // 😌
  | 'tired';          // 😴

export const MOOD_CONFIG: Record<MoodType, { emoji: string; label: string; color: string }> = {
  amazing: { emoji: '🌟', label: 'Amazing', color: 'yellow' },
  happy: { emoji: '😊', label: 'Happy', color: 'green' },
  okay: { emoji: '😐', label: 'Okay', color: 'gray' },
  sad: { emoji: '😢', label: 'Sad', color: 'blue' },
  frustrated: { emoji: '😤', label: 'Frustrated', color: 'red' },
  excited: { emoji: '🎉', label: 'Excited', color: 'purple' },
  calm: { emoji: '😌', label: 'Calm', color: 'teal' },
  tired: { emoji: '😴', label: 'Tired', color: 'orange' },
};

export const JOURNAL_TYPE_CONFIG: Record<JournalEntryType, { emoji: string; label: string; color: string; prompt: string }> = {
  daily: { 
    emoji: '📔', 
    label: 'Daily Journal', 
    color: 'blue',
    prompt: 'What happened today? Tell me about your day!'
  },
  gratitude: { 
    emoji: '💝', 
    label: 'Gratitude', 
    color: 'pink',
    prompt: 'What are you thankful for today?'
  },
  creative: { 
    emoji: '✨', 
    label: 'Creative Writing', 
    color: 'purple',
    prompt: 'Let your imagination run wild! Write a story, poem, or anything creative.'
  },
  learning: { 
    emoji: '🧠', 
    label: 'Learning Log', 
    color: 'green',
    prompt: 'What did you learn today? What was interesting?'
  },
  goals: { 
    emoji: '🎯', 
    label: 'Goals & Dreams', 
    color: 'orange',
    prompt: 'What do you want to achieve? What are your dreams?'
  },
  feelings: { 
    emoji: '💭', 
    label: 'Feelings Check-in', 
    color: 'teal',
    prompt: 'How are you feeling? It\'s okay to share your emotions.'
  },
  adventure: { 
    emoji: '🗺️', 
    label: 'Adventure Log', 
    color: 'cyan',
    prompt: 'Tell me about an adventure or exciting experience!'
  },
};

// ============================================================================
// Journal Entry Structure
// ============================================================================

export interface JournalHighlight {
  id: string;
  text: string;
  type: 'positive' | 'challenge' | 'improvement';
  emoji?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  type: JournalEntryType;
  title: string;
  content: string;
  mood?: MoodType;
  highlights: JournalHighlight[];
  tags: string[];
  date: string;              // YYYY-MM-DD format
  createdAt: Date;
  updatedAt: Date;
  
  // Integration fields
  linkedPlannerItems?: string[];   // IDs of related planner items
  linkedWorkspacePages?: string[]; // IDs of related workspace pages
  
  // GooseMind evaluation
  aiEvaluation?: JournalAIEvaluation;
  
  // Media attachments
  images?: string[];
  drawings?: string[];
  
  // Privacy
  isPrivate: boolean;
  sharedWithParent: boolean;
}

// ============================================================================
// GooseMind AI Evaluation
// ============================================================================

export interface JournalSkillScore {
  skill: string;
  score: number;           // 1-5 scale
  trend: 'improving' | 'stable' | 'needs_attention';
  feedback: string;
}

export interface JournalAIEvaluation {
  id: string;
  entryId: string;
  evaluatedAt: Date;
  
  // Overall assessment
  overallScore: number;    // 1-5 scale
  encouragement: string;   // Positive, encouraging message
  
  // Skill breakdown
  skills: {
    creativity: JournalSkillScore;
    expression: JournalSkillScore;
    reflection: JournalSkillScore;
    vocabulary: JournalSkillScore;
    structure: JournalSkillScore;
  };
  
  // Recommendations
  recommendations: JournalRecommendation[];
  
  // Writing prompts for next time
  suggestedPrompts: string[];
  
  // Strengths identified
  strengths: string[];
  
  // Areas for growth (framed positively)
  growthAreas: string[];
}

export interface JournalRecommendation {
  id: string;
  type: 'writing_tip' | 'prompt_suggestion' | 'skill_practice' | 'creative_challenge';
  title: string;
  description: string;
  emoji: string;
  priority: 'low' | 'medium' | 'high';
}

// ============================================================================
// Journal Statistics & Progress
// ============================================================================

export interface JournalStreak {
  currentStreak: number;
  longestStreak: number;
  lastEntryDate: string;
  totalEntries: number;
  entriesThisWeek: number;
  entriesThisMonth: number;
}

export interface JournalProgress {
  userId: string;
  streak: JournalStreak;
  
  // Skill progression over time
  skillHistory: {
    date: string;
    skills: Record<string, number>;
  }[];
  
  // Achievements
  badges: JournalBadge[];
  
  // Favorite topics/themes
  topTags: { tag: string; count: number }[];
  topMoods: { mood: MoodType; count: number }[];
  
  // Writing stats
  totalWords: number;
  averageWordsPerEntry: number;
  longestEntry: number;
}

export interface JournalBadge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  earnedAt: Date;
  type: 'streak' | 'milestone' | 'skill' | 'special';
}

// ============================================================================
// Journal Prompts & Templates
// ============================================================================

export interface JournalPrompt {
  id: string;
  type: JournalEntryType;
  prompt: string;
  emoji: string;
  difficulty: 'easy' | 'medium' | 'challenging';
  tags: string[];
  ageRange: '6-8' | '9-11' | '12+' | 'all';
}

export const DAILY_PROMPTS: JournalPrompt[] = [
  { id: 'dp1', type: 'daily', prompt: 'What was the best part of your day?', emoji: '⭐', difficulty: 'easy', tags: ['reflection'], ageRange: 'all' },
  { id: 'dp2', type: 'daily', prompt: 'What made you smile today?', emoji: '😊', difficulty: 'easy', tags: ['positive'], ageRange: 'all' },
  { id: 'dp3', type: 'daily', prompt: 'If today was a color, what color would it be and why?', emoji: '🎨', difficulty: 'medium', tags: ['creative', 'feelings'], ageRange: 'all' },
  { id: 'dp4', type: 'gratitude', prompt: 'Name 3 things you\'re grateful for today.', emoji: '💝', difficulty: 'easy', tags: ['gratitude'], ageRange: 'all' },
  { id: 'dp5', type: 'gratitude', prompt: 'Who helped you today? How did they help?', emoji: '🤝', difficulty: 'easy', tags: ['gratitude', 'relationships'], ageRange: 'all' },
  { id: 'dp6', type: 'learning', prompt: 'What\'s something new you learned today?', emoji: '💡', difficulty: 'easy', tags: ['learning'], ageRange: 'all' },
  { id: 'dp7', type: 'learning', prompt: 'What question do you have about the world?', emoji: '❓', difficulty: 'medium', tags: ['curiosity'], ageRange: 'all' },
  { id: 'dp8', type: 'feelings', prompt: 'How are you feeling right now? Why do you think you feel that way?', emoji: '💭', difficulty: 'medium', tags: ['emotions'], ageRange: 'all' },
  { id: 'dp9', type: 'goals', prompt: 'What\'s one thing you want to get better at?', emoji: '🎯', difficulty: 'easy', tags: ['goals'], ageRange: 'all' },
  { id: 'dp10', type: 'creative', prompt: 'If you could have any superpower, what would it be?', emoji: '🦸', difficulty: 'easy', tags: ['imagination'], ageRange: 'all' },
  { id: 'dp11', type: 'adventure', prompt: 'Describe a place you\'d love to visit. What would you do there?', emoji: '✈️', difficulty: 'medium', tags: ['dreams', 'adventure'], ageRange: 'all' },
  { id: 'dp12', type: 'daily', prompt: 'What was challenging today? How did you handle it?', emoji: '💪', difficulty: 'medium', tags: ['reflection', 'growth'], ageRange: '9-11' },
];

// ============================================================================
// API Types
// ============================================================================

export interface CreateJournalEntryParams {
  type: JournalEntryType;
  title: string;
  content: string;
  mood?: MoodType;
  highlights?: Omit<JournalHighlight, 'id'>[];
  tags?: string[];
  date?: string;
  isPrivate?: boolean;
  sharedWithParent?: boolean;
  linkedPlannerItems?: string[];
  linkedWorkspacePages?: string[];
}

export interface UpdateJournalEntryParams {
  id: string;
  title?: string;
  content?: string;
  mood?: MoodType;
  highlights?: JournalHighlight[];
  tags?: string[];
  isPrivate?: boolean;
  sharedWithParent?: boolean;
  linkedPlannerItems?: string[];
  linkedWorkspacePages?: string[];
}

export interface JournalSearchParams {
  query?: string;
  type?: JournalEntryType;
  mood?: MoodType;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface JournalAIRequest {
  entryId: string;
  action: 'evaluate' | 'suggest_improvements' | 'generate_prompt' | 'continue_writing';
  context?: string;
}

export interface JournalAIResponse {
  success: boolean;
  evaluation?: JournalAIEvaluation;
  suggestions?: string[];
  prompt?: JournalPrompt;
  continuation?: string;
  encouragement?: string;
}
