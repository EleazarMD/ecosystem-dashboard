/**
 * Conversational Page Builder Agent API
 * 
 * An improved AI agent that:
 * 1. Asks clarifying questions to understand what the child wants
 * 2. Provides clickable options for easy selection
 * 3. Generates better titles based on context
 * 4. Integrates with Kids PIC system for personalization
 * 5. Connects to Planner, Journal, and Chat for cross-activity awareness
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';
import { getKidsPICService } from '@/lib/kids-pic/KidsPICService';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const GOOSE_API_URL = process.env.GOOSE_API_URL || 'http://localhost:8000';
const USE_GOOSEMIND = process.env.USE_CHILD_GOOSEMIND !== 'false'; // Default to true

// ============================================================================
// Types
// ============================================================================

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  options?: ClickableOption[];
  pagePreview?: PagePreview;
}

interface ClickableOption {
  id: string;
  label: string;
  emoji: string;
  value: string;
  description?: string;
}

interface PagePreview {
  title: string;
  icon: string;
  blocks: PageBlock[];
}

interface RichTextItem {
  text: string;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
  };
}

interface PageBlock {
  type: string;
  content: string | RichTextItem[];
  properties?: Record<string, any>;
  children?: PageBlock[];
}

interface AgentState {
  stage: 'initial' | 'clarifying' | 'refining' | 'ready' | 'selecting_style' | 'selecting_title';
  pageType?: string;
  title?: string;
  details: Record<string, any>;
  conversationHistory: ConversationMessage[];
  sessionId?: string;
}

// ============================================================================
// Page Type Definitions
// ============================================================================

const PAGE_TYPES = {
  story: {
    emoji: '📖',
    label: 'Story',
    questions: [
      { key: 'genre', question: 'What kind of story?', options: [
        { id: 'adventure', label: 'Adventure', emoji: '🗺️', value: 'adventure' },
        { id: 'fantasy', label: 'Fantasy/Magic', emoji: '🧙', value: 'fantasy' },
        { id: 'funny', label: 'Funny', emoji: '😄', value: 'funny' },
        { id: 'mystery', label: 'Mystery', emoji: '🔍', value: 'mystery' },
        { id: 'animal', label: 'Animal Story', emoji: '🐾', value: 'animal' },
      ]},
      { key: 'mainCharacter', question: 'Who is the main character?', freeText: true, placeholder: 'A brave knight, a curious cat, me!' },
    ],
  },
  list: {
    emoji: '📋',
    label: 'Checklist',
    questions: [
      { key: 'listType', question: 'What kind of list?', options: [
        { id: 'shopping', label: 'Shopping List', emoji: '🛒', value: 'shopping' },
        { id: 'todo', label: 'To-Do List', emoji: '✅', value: 'todo' },
        { id: 'packing', label: 'Packing List', emoji: '🧳', value: 'packing' },
        { id: 'wishlist', label: 'Wish List', emoji: '⭐', value: 'wishlist' },
        { id: 'custom', label: 'Other List', emoji: '📝', value: 'custom' },
      ]},
    ],
  },
  trip: {
    emoji: '✈️',
    label: 'Trip Planning',
    questions: [
      { key: 'destination', question: 'Where are you going?', freeText: true, placeholder: "Grandma's house, the beach, camping..." },
      { key: 'duration', question: 'How long is the trip?', options: [
        { id: 'day', label: 'Day Trip', emoji: '☀️', value: 'day' },
        { id: 'weekend', label: 'Weekend', emoji: '📅', value: 'weekend' },
        { id: 'week', label: 'Week or More', emoji: '🗓️', value: 'week' },
      ]},
    ],
  },
  project: {
    emoji: '🔬',
    label: 'Project',
    questions: [
      { key: 'projectType', question: 'What kind of project?', options: [
        { id: 'science', label: 'Science Experiment', emoji: '🧪', value: 'science' },
        { id: 'art', label: 'Art Project', emoji: '🎨', value: 'art' },
        { id: 'building', label: 'Building/Making', emoji: '🔧', value: 'building' },
        { id: 'research', label: 'Research Project', emoji: '📚', value: 'research' },
      ]},
      { key: 'topic', question: 'What is your project about?', freeText: true, placeholder: 'Volcanoes, space, plants...' },
    ],
  },
  homework: {
    emoji: '📚',
    label: 'Homework',
    questions: [
      { key: 'subject', question: 'What subject?', options: [
        { id: 'math', label: 'Math', emoji: '🔢', value: 'math' },
        { id: 'reading', label: 'Reading/Writing', emoji: '📖', value: 'reading' },
        { id: 'science', label: 'Science', emoji: '🔬', value: 'science' },
        { id: 'social', label: 'Social Studies', emoji: '🌍', value: 'social' },
        { id: 'other', label: 'Other', emoji: '📝', value: 'other' },
      ]},
      { key: 'assignment', question: 'What do you need to do?', freeText: true, placeholder: 'Write an essay, solve problems...' },
    ],
  },
  goals: {
    emoji: '🎯',
    label: 'Goals',
    questions: [
      { key: 'goalType', question: 'What kind of goal?', options: [
        { id: 'learning', label: 'Learn Something New', emoji: '🧠', value: 'learning' },
        { id: 'habit', label: 'Build a Habit', emoji: '📈', value: 'habit' },
        { id: 'achievement', label: 'Achieve Something', emoji: '🏆', value: 'achievement' },
        { id: 'personal', label: 'Personal Goal', emoji: '💪', value: 'personal' },
      ]},
      { key: 'goal', question: 'What is your goal?', freeText: true, placeholder: 'Read 10 books, learn to swim...' },
    ],
  },
  journal: {
    emoji: '📔',
    label: 'Journal Entry',
    questions: [
      { key: 'journalType', question: 'What would you like to write about?', options: [
        { id: 'day', label: 'My Day', emoji: '☀️', value: 'day' },
        { id: 'feelings', label: 'My Feelings', emoji: '💭', value: 'feelings' },
        { id: 'gratitude', label: 'Things I\'m Grateful For', emoji: '🙏', value: 'gratitude' },
        { id: 'memory', label: 'A Special Memory', emoji: '📸', value: 'memory' },
        { id: 'dream', label: 'My Dreams', emoji: '🌙', value: 'dream' },
      ]},
    ],
  },
};

// ============================================================================
// API Handler
// ============================================================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { action, message, selectedOption, state, currentPage } = req.body;

  try {
    const picService = getKidsPICService(pool);
    const childProfile = await picService.getOrCreateProfile(session.user.id);

    switch (action) {
      case 'start':
        return handleStart(res, childProfile, currentPage);
      case 'message':
        return handleMessage(res, message, state, childProfile, currentPage);
      case 'select':
        return handleSelect(res, selectedOption, state, childProfile, currentPage);
      case 'generate':
        return handleGenerate(res, state, childProfile);
      case 'redesign':
        return handleRedesign(res, state, childProfile, currentPage);
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error: any) {
    console.error('[PageBuilderAgent] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// ============================================================================
// Action Handlers
// ============================================================================

// Current page context interface
interface CurrentPageContext {
  id: string;
  title: string;
  icon: string;
  blocks: PageBlock[];
}

async function handleStart(res: NextApiResponse, childProfile: any, currentPage?: CurrentPageContext): Promise<void> {
  const greeting = getPersonalizedGreeting(childProfile);
  
  const initialState: AgentState = {
    stage: 'initial',
    details: {},
    conversationHistory: [],
  };

  // If viewing an existing page, offer redesign options
  if (currentPage?.id) {
    const pageTitle = currentPage.title || 'this page';
    const response: ConversationMessage = {
      role: 'assistant',
      content: `${greeting}\n\nI see you're working on "${pageTitle}" ${currentPage.icon || '📄'}. How can I help?`,
      options: [
        { id: 'redesign', label: 'Redesign Page', emoji: '✨', value: 'redesign', description: 'Improve structure & layout' },
        { id: 'add-title', label: 'Better Title', emoji: '📝', value: 'add-title', description: 'Create a proper title' },
        { id: 'add-sections', label: 'Add Sections', emoji: '📑', value: 'add-sections', description: 'Add headings & organize' },
        { id: 'format', label: 'Format Content', emoji: '🎨', value: 'format', description: 'Lists, callouts, etc.' },
        { id: 'new-page', label: 'New Page', emoji: '📄', value: 'new-page', description: 'Create something new' },
      ],
    };
    initialState.conversationHistory.push(response);
    // Store current page in state for later use
    initialState.details.currentPage = currentPage;
    
    return res.status(200).json({
      message: response,
      state: initialState,
    });
  }

  // Default: creating a new page
  const response: ConversationMessage = {
    role: 'assistant',
    content: `${greeting}\n\nWhat would you like to create today? Pick one or tell me in your own words! 🎨`,
    options: [
      { id: 'story', label: 'Story', emoji: '📖', value: 'story', description: 'Write an adventure!' },
      { id: 'list', label: 'List', emoji: '📋', value: 'list', description: 'Make a checklist' },
      { id: 'trip', label: 'Trip', emoji: '✈️', value: 'trip', description: 'Plan a trip' },
      { id: 'project', label: 'Project', emoji: '🔬', value: 'project', description: 'Science or art project' },
      { id: 'homework', label: 'Homework', emoji: '📚', value: 'homework', description: 'School assignment' },
      { id: 'goals', label: 'Goals', emoji: '🎯', value: 'goals', description: 'Track your goals' },
    ],
  };

  initialState.conversationHistory.push(response);

  res.status(200).json({
    message: response,
    state: initialState,
  });
}

async function handleMessage(
  res: NextApiResponse,
  message: string,
  state: AgentState,
  childProfile: any,
  currentPage?: CurrentPageContext
): Promise<void> {
  const updatedState = { ...state };
  updatedState.conversationHistory.push({
    role: 'user',
    content: message,
  });

  // Route to GooseMind if enabled
  if (USE_GOOSEMIND) {
    const sessionId = state.sessionId || `page-builder-${Date.now()}`;
    const gooseResult = await callChildGooseMind(message, sessionId, currentPage, childProfile);
    
    const response: ConversationMessage = {
      role: 'assistant',
      content: gooseResult.response,
      options: gooseResult.options,
    };
    
    updatedState.conversationHistory.push(response);
    updatedState.sessionId = sessionId;
    
    return res.status(200).json({ 
      message: response, 
      state: updatedState,
      actions: gooseResult.actions,
    });
  }

  // Analyze the message to understand intent (fallback to old system)
  const analysis = analyzeUserMessage(message);
  
  if (state.stage === 'initial') {
    // User typed instead of selecting - try to understand what they want
    if (analysis.pageType) {
      updatedState.pageType = analysis.pageType;
      updatedState.details = { ...updatedState.details, ...analysis.details };
      updatedState.stage = 'clarifying';
      
      const pageTypeConfig = PAGE_TYPES[analysis.pageType as keyof typeof PAGE_TYPES];
      if (pageTypeConfig && pageTypeConfig.questions.length > 0) {
        const nextQuestion = pageTypeConfig.questions[0];
        const response = createQuestionResponse(nextQuestion, analysis.pageType);
        updatedState.conversationHistory.push(response);
        
        return res.status(200).json({ message: response, state: updatedState });
      }
    } else {
      // Couldn't understand - ask for clarification with options
      const response: ConversationMessage = {
        role: 'assistant',
        content: `That sounds interesting! 🤔 Can you help me understand better? What type of page would work best?`,
        options: [
          { id: 'story', label: 'Story', emoji: '📖', value: 'story' },
          { id: 'list', label: 'List', emoji: '📋', value: 'list' },
          { id: 'project', label: 'Project', emoji: '🔬', value: 'project' },
          { id: 'homework', label: 'Homework', emoji: '📚', value: 'homework' },
          { id: 'other', label: 'Something Else', emoji: '✨', value: 'other' },
        ],
      };
      updatedState.conversationHistory.push(response);
      return res.status(200).json({ message: response, state: updatedState });
    }
  }

  if (state.stage === 'clarifying') {
    // Store the free text answer
    const pageTypeConfig = PAGE_TYPES[state.pageType as keyof typeof PAGE_TYPES];
    if (pageTypeConfig) {
      const answeredQuestions = Object.keys(state.details);
      const currentQuestionIndex = answeredQuestions.length;
      const currentQuestion = pageTypeConfig.questions[currentQuestionIndex];
      
      if (currentQuestion && 'freeText' in currentQuestion && currentQuestion.freeText) {
        updatedState.details[currentQuestion.key] = message;
      }
      
      // Check if there are more questions
      const nextQuestionIndex = currentQuestionIndex + 1;
      if (nextQuestionIndex < pageTypeConfig.questions.length) {
        const nextQuestion = pageTypeConfig.questions[nextQuestionIndex];
        const response = createQuestionResponse(nextQuestion, state.pageType!);
        updatedState.conversationHistory.push(response);
        return res.status(200).json({ message: response, state: updatedState });
      } else {
        // All questions answered - generate title and preview
        updatedState.stage = 'ready';
        const preview = generatePagePreview(updatedState);
        updatedState.title = preview.title;
        
        const response: ConversationMessage = {
          role: 'assistant',
          content: `Perfect! 🎉 Here's what I'll create for you:\n\n**${preview.title}**\n\nDoes this look good?`,
          pagePreview: preview,
          options: [
            { id: 'create', label: 'Create It!', emoji: '✨', value: 'create' },
            { id: 'change-title', label: 'Change Title', emoji: '✏️', value: 'change-title' },
            { id: 'start-over', label: 'Start Over', emoji: '🔄', value: 'start-over' },
          ],
        };
        updatedState.conversationHistory.push(response);
        return res.status(200).json({ message: response, state: updatedState });
      }
    }
  }

  // Handle title clarification input (when we asked for more details)
  if (state.stage === 'selecting_title' && state.details.redesignAction === 'add-title' && !state.details.titleSuggestions) {
    const pageContext = currentPage || state.details.currentPage;
    if (pageContext?.id) {
      // User provided clarification - generate suggestions based on their input
      const userInput = message.trim();
      const suggestions = generateTitleSuggestionsFromInput(userInput);
      
      updatedState.details.titleSuggestions = suggestions;
      const response: ConversationMessage = {
        role: 'assistant',
        content: `Great! Here are some title ideas based on "${userInput}": ✨`,
        options: suggestions.map((title, idx) => ({
          id: `title_${idx}`,
          label: title,
          emoji: '📝',
          value: `title_option_${idx}`,
        })),
      };
      updatedState.conversationHistory.push(response);
      return res.status(200).json({ message: response, state: updatedState });
    }
  }
  
  // Handle custom title input (when user types their own title)
  if (state.stage === 'refining' && state.details.redesignAction === 'add-title') {
    const pageContext = currentPage || state.details.currentPage;
    if (pageContext?.id) {
      // User typed their custom title
      updatedState.details.selectedTitle = message.trim();
      updatedState.details.designStyle = 'organized';
      return handleRedesign(res, updatedState, childProfile, pageContext);
    }
  }

  // Handle text input during style selection
  if (state.stage === 'selecting_style') {
    const response: ConversationMessage = {
      role: 'assistant',
      content: `Please pick one of the style buttons above! 😊 Which design style do you like?`,
      options: [
        { id: 'minimal', label: 'Minimal', emoji: '✨', value: 'style_minimal', description: 'Clean and simple' },
        { id: 'organized', label: 'Organized', emoji: '📂', value: 'style_organized', description: 'Sections & toggles' },
        { id: 'colorful', label: 'Colorful', emoji: '🌈', value: 'style_colorful', description: 'Highlights & colors' },
        { id: 'professional', label: 'Professional', emoji: '💼', value: 'style_professional', description: 'Formal structure' },
      ],
    };
    updatedState.conversationHistory.push(response);
    return res.status(200).json({ message: response, state: updatedState });
  }

  // Default response - provide helpful guidance
  const response: ConversationMessage = {
    role: 'assistant',
    content: `I'm not sure I understood. Can you try again? 😊\n\nTip: Try clicking one of the buttons above, or type what you'd like help with!`,
  };
  updatedState.conversationHistory.push(response);
  res.status(200).json({ message: response, state: updatedState });
}

async function handleSelect(
  res: NextApiResponse,
  selectedOption: ClickableOption,
  state: AgentState,
  childProfile: any,
  currentPage?: CurrentPageContext
): Promise<void> {
  const updatedState = { ...state };
  
  // Add user selection to history
  updatedState.conversationHistory.push({
    role: 'user',
    content: `${selectedOption.emoji} ${selectedOption.label}`,
  });

  if (selectedOption.value === 'create') {
    // Generate the final page
    return handleGenerate(res, updatedState, childProfile);
  }

  if (selectedOption.value === 'start-over' || selectedOption.value === 'new-page') {
    return handleStart(res, childProfile);
  }

  if (selectedOption.value === 'change-title') {
    const response: ConversationMessage = {
      role: 'assistant',
      content: `What would you like to call your page? Type a new title:`,
    };
    updatedState.stage = 'refining';
    updatedState.conversationHistory.push(response);
    return res.status(200).json({ message: response, state: updatedState });
  }

  // Handle redesign-related options for existing pages
  if (['redesign', 'add-title', 'add-sections', 'format'].includes(selectedOption.value)) {
    const pageContext = currentPage || state.details.currentPage;
    if (pageContext?.id) {
      updatedState.details.redesignAction = selectedOption.value;
      
      // For full redesign, ask for design style first
      if (selectedOption.value === 'redesign') {
        updatedState.stage = 'selecting_style';
        const response: ConversationMessage = {
          role: 'assistant',
          content: `Great! What style would you like for your page? 🎨`,
          options: [
            { id: 'minimal', label: 'Minimal', emoji: '✨', value: 'style_minimal', description: 'Clean and simple' },
            { id: 'organized', label: 'Organized', emoji: '📂', value: 'style_organized', description: 'Sections & toggles' },
            { id: 'colorful', label: 'Colorful', emoji: '🌈', value: 'style_colorful', description: 'Highlights & colors' },
            { id: 'professional', label: 'Professional', emoji: '💼', value: 'style_professional', description: 'Formal structure' },
          ],
        };
        updatedState.conversationHistory.push(response);
        return res.status(200).json({ message: response, state: updatedState });
      }
      
      // For "add-title", generate title suggestions first
      if (selectedOption.value === 'add-title') {
        updatedState.stage = 'selecting_title';
        const result = await generateTitleSuggestions(pageContext);
        
        // If we need more input, ask a clarifying question
        if (result.needsInput) {
          const response: ConversationMessage = {
            role: 'assistant',
            content: result.question || 'Tell me more about your page so I can suggest a good title! 😊',
          };
          updatedState.conversationHistory.push(response);
          return res.status(200).json({ message: response, state: updatedState });
        }
        
        // Store suggestions in state for later retrieval
        updatedState.details.titleSuggestions = result.suggestions;
        const response: ConversationMessage = {
          role: 'assistant',
          content: `Here are some title ideas for your page! Pick the one you like best: ✨`,
          options: result.suggestions.map((title, idx) => ({
            id: `title_${idx}`,
            label: title,
            emoji: '📝',
            value: `title_option_${idx}`,
          })),
        };
        updatedState.conversationHistory.push(response);
        return res.status(200).json({ message: response, state: updatedState });
      }
      
      // For other actions, proceed directly with default style
      console.log('[PageBuilderAgent] Triggering redesign for action:', selectedOption.value);
      updatedState.details.designStyle = 'organized';
      return handleRedesign(res, updatedState, childProfile, pageContext);
    } else {
      const response: ConversationMessage = {
        role: 'assistant',
        content: `I need you to open a page first before I can help redesign it! 📄`,
      };
      updatedState.conversationHistory.push(response);
      return res.status(200).json({ message: response, state: updatedState });
    }
  }
  
  // Handle title selection
  if (selectedOption.value.startsWith('title_option_')) {
    const pageContext = currentPage || state.details.currentPage;
    if (pageContext?.id) {
      const optionIndex = parseInt(selectedOption.value.replace('title_option_', ''));
      const titleSuggestions = state.details.titleSuggestions || [];
      const selectedTitle = titleSuggestions[optionIndex];
      
      if (!selectedTitle) {
        const response: ConversationMessage = {
          role: 'assistant',
          content: `Oops! Something went wrong. Can you try again? 😅`,
        };
        updatedState.conversationHistory.push(response);
        return res.status(200).json({ message: response, state: updatedState });
      }
      
      // If user wants to type their own, ask for input
      if (selectedTitle.includes('Let me type')) {
        const response: ConversationMessage = {
          role: 'assistant',
          content: `Great! What would you like to call your page? Type your title below: ✏️`,
        };
        updatedState.stage = 'refining';
        updatedState.conversationHistory.push(response);
        return res.status(200).json({ message: response, state: updatedState });
      }
      
      // Apply the selected title
      updatedState.details.selectedTitle = selectedTitle;
      updatedState.details.designStyle = 'organized';
      return handleRedesign(res, updatedState, childProfile, pageContext);
    }
  }
  
  // Handle design style selection
  if (selectedOption.value.startsWith('style_')) {
    const pageContext = currentPage || state.details.currentPage;
    if (pageContext?.id) {
      const style = selectedOption.value.replace('style_', '');
      updatedState.details.designStyle = style;
      return handleRedesign(res, updatedState, childProfile, pageContext);
    }
  }

  if (state.stage === 'initial') {
    // User selected a page type
    const pageType = selectedOption.value;
    updatedState.pageType = pageType;
    updatedState.stage = 'clarifying';
    
    const pageTypeConfig = PAGE_TYPES[pageType as keyof typeof PAGE_TYPES];
    if (pageTypeConfig && pageTypeConfig.questions.length > 0) {
      const firstQuestion = pageTypeConfig.questions[0];
      const response = createQuestionResponse(firstQuestion, pageType);
      updatedState.conversationHistory.push(response);
      return res.status(200).json({ message: response, state: updatedState });
    } else {
      // No questions - go straight to preview
      updatedState.stage = 'ready';
      const preview = generatePagePreview(updatedState);
      updatedState.title = preview.title;
      
      const response: ConversationMessage = {
        role: 'assistant',
        content: `Great choice! 🎉 Here's what I'll create:\n\n**${preview.title}**`,
        pagePreview: preview,
        options: [
          { id: 'create', label: 'Create It!', emoji: '✨', value: 'create' },
          { id: 'change-title', label: 'Change Title', emoji: '✏️', value: 'change-title' },
          { id: 'start-over', label: 'Start Over', emoji: '🔄', value: 'start-over' },
        ],
      };
      updatedState.conversationHistory.push(response);
      return res.status(200).json({ message: response, state: updatedState });
    }
  }

  if (state.stage === 'clarifying') {
    // User answered a question with an option
    const pageTypeConfig = PAGE_TYPES[state.pageType as keyof typeof PAGE_TYPES];
    if (pageTypeConfig) {
      const answeredQuestions = Object.keys(state.details);
      const currentQuestionIndex = answeredQuestions.length;
      const currentQuestion = pageTypeConfig.questions[currentQuestionIndex];
      
      if (currentQuestion) {
        updatedState.details[currentQuestion.key] = selectedOption.value;
      }
      
      // Check if there are more questions
      const nextQuestionIndex = currentQuestionIndex + 1;
      if (nextQuestionIndex < pageTypeConfig.questions.length) {
        const nextQuestion = pageTypeConfig.questions[nextQuestionIndex];
        const response = createQuestionResponse(nextQuestion, state.pageType!);
        updatedState.conversationHistory.push(response);
        return res.status(200).json({ message: response, state: updatedState });
      } else {
        // All questions answered - generate preview
        updatedState.stage = 'ready';
        const preview = generatePagePreview(updatedState);
        updatedState.title = preview.title;
        
        const response: ConversationMessage = {
          role: 'assistant',
          content: `Perfect! 🎉 Here's what I'll create for you:\n\n**${preview.title}**\n\nDoes this look good?`,
          pagePreview: preview,
          options: [
            { id: 'create', label: 'Create It!', emoji: '✨', value: 'create' },
            { id: 'change-title', label: 'Change Title', emoji: '✏️', value: 'change-title' },
            { id: 'start-over', label: 'Start Over', emoji: '🔄', value: 'start-over' },
          ],
        };
        updatedState.conversationHistory.push(response);
        return res.status(200).json({ message: response, state: updatedState });
      }
    }
  }

  // Default fallback
  const response: ConversationMessage = {
    role: 'assistant',
    content: `Something went wrong. Let's start over! 🔄`,
  };
  return handleStart(res, childProfile);
}

// ============================================================================
// Enhanced Page Redesign System (Qwen3 Text-Based)
// ============================================================================

// Design style presets for different page types
const DESIGN_STYLES = {
  minimal: {
    name: 'Minimal',
    description: 'Clean and simple',
    useToggles: false,
    useCallouts: false,
    maxHeadingDepth: 2,
    colorScheme: 'neutral',
  },
  organized: {
    name: 'Organized',
    description: 'Structured with sections',
    useToggles: true,
    useCallouts: true,
    maxHeadingDepth: 3,
    colorScheme: 'blue',
  },
  colorful: {
    name: 'Colorful',
    description: 'Visual with highlights',
    useToggles: true,
    useCallouts: true,
    useHighlightBoxes: true,
    maxHeadingDepth: 3,
    colorScheme: 'rainbow',
  },
  professional: {
    name: 'Professional',
    description: 'Formal and structured',
    useToggles: true,
    useCallouts: true,
    useDividers: true,
    maxHeadingDepth: 3,
    colorScheme: 'gray',
  },
};

// Page type templates with recommended structures
const PAGE_TYPE_TEMPLATES: Record<string, {
  pattern: RegExp;
  icon: string;
  structure: string[];
  colors: { primary: string; accent: string };
  suggestedBlocks: string[];
}> = {
  trip_planning: {
    pattern: /trip|travel|vacation|visit|journey|flight|hotel|pack/i,
    icon: '✈️',
    structure: ['header', 'overview_callout', 'dates_section', 'packing_toggle', 'itinerary_section', 'checklist'],
    colors: { primary: 'blue', accent: 'green' },
    suggestedBlocks: ['callout', 'to_do', 'toggle', 'numbered_list'],
  },
  homework: {
    pattern: /homework|assignment|school|class|subject|study|learn|test|exam/i,
    icon: '📚',
    structure: ['header', 'assignment_callout', 'notes_section', 'questions', 'resources'],
    colors: { primary: 'purple', accent: 'yellow' },
    suggestedBlocks: ['callout', 'numbered_list', 'to_do', 'quote'],
  },
  story: {
    pattern: /story|tale|adventure|character|once upon|chapter/i,
    icon: '📖',
    structure: ['title_header', 'character_callout', 'chapters', 'notes'],
    colors: { primary: 'pink', accent: 'purple' },
    suggestedBlocks: ['heading_1', 'paragraph', 'quote', 'divider'],
  },
  project: {
    pattern: /project|build|create|make|experiment|science|art/i,
    icon: '🔬',
    structure: ['header', 'goal_callout', 'materials_list', 'steps', 'results'],
    colors: { primary: 'orange', accent: 'green' },
    suggestedBlocks: ['callout', 'bulleted_list', 'numbered_list', 'to_do'],
  },
  list: {
    pattern: /list|checklist|todo|shopping|items|things/i,
    icon: '📋',
    structure: ['header', 'categories', 'items'],
    colors: { primary: 'green', accent: 'blue' },
    suggestedBlocks: ['to_do', 'bulleted_list', 'toggle'],
  },
  goals: {
    pattern: /goal|target|achieve|plan|resolution|habit/i,
    icon: '🎯',
    structure: ['header', 'motivation_callout', 'goals_list', 'progress', 'milestones'],
    colors: { primary: 'orange', accent: 'green' },
    suggestedBlocks: ['callout', 'to_do', 'numbered_list', 'toggle'],
  },
  notes: {
    pattern: /note|idea|thought|remember|memo/i,
    icon: '📝',
    structure: ['header', 'main_content', 'key_points'],
    colors: { primary: 'yellow', accent: 'gray' },
    suggestedBlocks: ['paragraph', 'bulleted_list', 'callout', 'quote'],
  },
};

// Extract rich structured content from blocks (preserving formatting)
function extractStructuredContent(blocks: PageBlock[]): string {
  const lines: string[] = [];
  
  for (const block of blocks) {
    const blockType = block.type || 'paragraph';
    let content = '';
    
    // Handle different content formats
    if (typeof block.content === 'string') {
      content = block.content;
    } else if (Array.isArray(block.content)) {
      // Rich text array
      content = block.content.map((item: any) => {
        if (typeof item === 'string') return item;
        let text = item.text || '';
        // Preserve formatting hints
        if (item.annotations?.bold) text = `**${text}**`;
        if (item.annotations?.italic) text = `*${text}*`;
        return text;
      }).join('');
    }
    
    // Format based on block type
    const props = block.properties || {};
    switch (blockType) {
      case 'heading_1':
        lines.push(`[H1] ${content}`);
        break;
      case 'heading_2':
        lines.push(`[H2] ${content}`);
        break;
      case 'heading_3':
        lines.push(`[H3] ${content}`);
        break;
      case 'bulleted_list':
        lines.push(`• ${content}`);
        break;
      case 'numbered_list':
        lines.push(`1. ${content}`);
        break;
      case 'to_do':
        lines.push(`[${props.checked ? 'x' : ' '}] ${content}`);
        break;
      case 'callout':
        lines.push(`💡 CALLOUT(${props.color || 'default'}): ${content}`);
        break;
      case 'quote':
        lines.push(`> ${content}`);
        break;
      case 'toggle':
        lines.push(`▶ TOGGLE: ${content}`);
        break;
      case 'divider':
        lines.push('---');
        break;
      default:
        if (content) lines.push(content);
    }
  }
  
  return lines.join('\n');
}

// Generate title suggestions from user input
function generateTitleSuggestionsFromInput(userInput: string): string[] {
  const input = userInput.trim();
  const capitalizedInput = input.charAt(0).toUpperCase() + input.slice(1);
  
  const suggestions: string[] = [
    `${capitalizedInput} Planning`,
    `My ${capitalizedInput} Adventure`,
    `${capitalizedInput} Guide`,
    `All About ${capitalizedInput}`,
  ];
  
  // Add custom option
  suggestions.push('Let me type my own...');
  
  return suggestions.slice(0, 4);
}

// Generate title suggestions based on page content
async function generateTitleSuggestions(pageContext: CurrentPageContext): Promise<{ suggestions: string[], needsInput: boolean, question?: string }> {
  const structuredContent = extractStructuredContent(pageContext.blocks);
  
  // Extract key information from content
  const contentLower = structuredContent.toLowerCase();
  
  // Simple keyword-based title generation
  const suggestions: string[] = [];
  let needsInput = false;
  let question = '';
  
  // Check for trip/travel content
  if (contentLower.includes('trip') || contentLower.includes('travel') || contentLower.includes('vacation')) {
    const destination = contentLower.match(/(?:to|in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)?.[1];
    
    if (destination) {
      suggestions.push(`${destination} Trip Planning`);
      suggestions.push(`My ${destination} Adventure`);
      suggestions.push(`${destination} Vacation Plans`);
      suggestions.push(`${destination} Travel Guide`);
    } else {
      // Not enough info - ask for details
      needsInput = true;
      question = 'Where are you planning to go? (e.g., "Turkey", "Beach", "Grandma\'s house")';
    }
  }
  
  // Check for homework/school content
  else if (contentLower.includes('homework') || contentLower.includes('assignment') || contentLower.includes('essay')) {
    const subject = contentLower.match(/(?:for|about)\s+([a-z]+)/i)?.[1];
    
    if (subject) {
      suggestions.push(`${subject.charAt(0).toUpperCase() + subject.slice(1)} Homework`);
      suggestions.push(`${subject.charAt(0).toUpperCase() + subject.slice(1)} Assignment`);
      suggestions.push(`${subject.charAt(0).toUpperCase() + subject.slice(1)} Notes`);
    } else {
      needsInput = true;
      question = 'What subject is this for? (e.g., "Math", "Science", "English")';
    }
  }
  
  // Check for story content
  else if (contentLower.includes('story') || contentLower.includes('once upon')) {
    const storyTopic = contentLower.match(/(?:about|story of)\s+([a-z\s]+)/i)?.[1];
    
    if (storyTopic) {
      suggestions.push(`The Story of ${storyTopic}`);
      suggestions.push(`My ${storyTopic} Adventure`);
    } else {
      needsInput = true;
      question = 'What is your story about? (e.g., "Dragons", "My Pet", "Space Adventure")';
    }
  }
  
  // Check for list/checklist content
  else if (contentLower.includes('list') || contentLower.includes('check') || contentLower.includes('to do')) {
    suggestions.push('My Checklist');
    suggestions.push('Things To Do');
    suggestions.push('Task List');
    suggestions.push('My To-Do List');
  }
  
  // Default - ask what it's about
  else {
    needsInput = true;
    question = 'What is this page about? Tell me in a few words! 😊';
  }
  
  // If we have suggestions, add custom option
  if (suggestions.length > 0) {
    suggestions.push('Let me type my own...');
  }
  
  return { 
    suggestions: suggestions.slice(0, 4), 
    needsInput,
    question 
  };
}

// Detect page type from title and content
function detectPageType(title: string, content: string): string {
  const combined = `${title} ${content}`.toLowerCase();
  
  for (const [type, config] of Object.entries(PAGE_TYPE_TEMPLATES)) {
    if (config.pattern.test(combined)) {
      return type;
    }
  }
  
  return 'notes'; // Default
}

// Generate the enhanced system prompt for Qwen3
function generateRedesignPrompt(
  redesignAction: string,
  pageType: string,
  designStyle: string = 'organized'
): string {
  const template = PAGE_TYPE_TEMPLATES[pageType] || PAGE_TYPE_TEMPLATES.notes;
  const style = DESIGN_STYLES[designStyle as keyof typeof DESIGN_STYLES] || DESIGN_STYLES.organized;
  
  return `You are an expert Notion-style page designer for children. Your task is to redesign a page to be well-organized and visually appealing.

## REDESIGN ACTION: ${redesignAction.toUpperCase()}
${redesignAction === 'redesign' ? 'Completely restructure the page with proper sections and formatting.' : ''}
${redesignAction === 'add-title' ? 'IMPORTANT: Create a NEW, clear, descriptive title that captures the page purpose. Read the content and generate a proper title (e.g., "Turkey Trip Planning" instead of "I want to plan a"). The title should be specific and descriptive.' : ''}
${redesignAction === 'add-sections' ? 'Add clear section headings to organize the content logically.' : ''}
${redesignAction === 'format' ? 'Improve formatting with lists, callouts, and visual elements.' : ''}

## DETECTED PAGE TYPE: ${pageType.toUpperCase()}
Recommended icon: ${template.icon}
Suggested structure: ${template.structure.join(' → ')}
Good block types for this: ${template.suggestedBlocks.join(', ')}
Color scheme: ${template.colors.primary} (primary), ${template.colors.accent} (accent)

## DESIGN STYLE: ${style.name}
${style.description}

## AVAILABLE BLOCK TYPES

### Text Blocks
- heading_1: Main section title (use sparingly, 1-2 per page)
- heading_2: Subsection title
- heading_3: Minor heading
- paragraph: Regular text content

### List Blocks
- bulleted_list: Unordered list item (use for related items)
- numbered_list: Ordered list item (use for steps/sequences)
- to_do: Checkbox item with { "properties": { "checked": false } }

### Rich Blocks
- callout: Highlighted box with { "properties": { "color": "blue|green|yellow|orange|red|purple|pink", "icon": "emoji" } }
- quote: Quoted text (use for important statements)
- toggle: Collapsible section with "children" array for nested content
- divider: Horizontal line separator

### Special Blocks
- highlight_box: Colored emphasis box with { "properties": { "highlightColor": "color" } }
- emoji_row: Decorative emoji separator

## OUTPUT FORMAT (JSON)
{
  "title": "Clear Descriptive Title",
  "icon": "${template.icon}",
  "blocks": [
    {
      "type": "heading_1",
      "content": [{ "text": "Main Title", "annotations": { "bold": true } }]
    },
    {
      "type": "callout",
      "content": [{ "text": "Important overview or tip" }],
      "properties": { "color": "${template.colors.primary}", "icon": "💡" }
    },
    {
      "type": "heading_2",
      "content": [{ "text": "Section Name" }]
    },
    {
      "type": "paragraph",
      "content": [{ "text": "Regular content..." }]
    },
    {
      "type": "to_do",
      "content": [{ "text": "Task item" }],
      "properties": { "checked": false }
    },
    {
      "type": "toggle",
      "content": [{ "text": "Click to expand details" }],
      "children": [
        { "type": "paragraph", "content": [{ "text": "Hidden content here" }] }
      ]
    }
  ]
}

## DESIGN PRINCIPLES
1. Start with a clear heading_1 title
2. Use a callout near the top for overview/purpose
3. Group related content under heading_2 sections
4. Use to_do for actionable items
5. Use toggle for optional/detailed content
6. Use dividers sparingly to separate major sections
7. Keep the design clean and scannable
8. Use colors consistently (${template.colors.primary} for main, ${template.colors.accent} for highlights)

Return ONLY valid JSON. No explanations.`;
}

// Handle page redesign - uses Qwen3 with enhanced structured prompting
async function handleRedesign(
  res: NextApiResponse,
  state: AgentState,
  childProfile: any,
  currentPage?: CurrentPageContext
): Promise<void> {
  if (!currentPage?.id) {
    return res.status(400).json({ error: 'No page to redesign' });
  }

  // Extract structured content from blocks
  const structuredContent = extractStructuredContent(currentPage.blocks);
  
  // Detect page type from content
  const pageType = detectPageType(currentPage.title, structuredContent);
  const template = PAGE_TYPE_TEMPLATES[pageType] || PAGE_TYPE_TEMPLATES.notes;
  
  // Get redesign action and style
  const redesignAction = state.details.redesignAction || 'redesign';
  const designStyle = state.details.designStyle || 'organized';
  const selectedTitle = state.details.selectedTitle; // User-selected title
  
  console.log(`[PageBuilderAgent] Redesigning page: id=${currentPage.id}, title="${currentPage.title}", type=${pageType}, action=${redesignAction}, style=${designStyle}, selectedTitle="${selectedTitle || 'none'}", blocks=${currentPage.blocks?.length || 0}`);
  
  let newBlocks: PageBlock[] = [];
  let newTitle = selectedTitle || currentPage.title; // Use selected title if available
  let newIcon = template.icon;

  try {
    // Generate enhanced prompt for Qwen3
    const systemPrompt = generateRedesignPrompt(redesignAction, pageType, designStyle);
    
    // Call AI Gateway (will route to Qwen3 locally)
    const aiResponse = await fetch(`${AI_GATEWAY_URL}/api/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3-8b',  // Use local Qwen3 model
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Redesign this ${pageType} page.

${redesignAction === 'add-title' ? `CURRENT TITLE IS BAD: "${currentPage.title}" - DO NOT USE THIS. Generate a NEW, descriptive title based on the content below.` : `CURRENT TITLE: "${currentPage.title}"`}
CURRENT ICON: ${currentPage.icon || '📄'}

CURRENT CONTENT (with structure markers):
${structuredContent}

---
Generate a well-designed JSON page structure following the guidelines above.${redesignAction === 'add-title' ? '\nREMEMBER: Create a NEW title that describes what this page is about (e.g., "Turkey Trip Planning" not "I want to plan a").' : ''}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2500,
        reasoning: 'medium',  // Enable chain-of-thought for better structure
      }),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      
      console.log('[PageBuilderAgent] AI response received, length:', content.length, 'first 200 chars:', content.substring(0, 200));
      
      // Parse JSON from response (handle markdown code blocks)
      let jsonStr = content;
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }
      
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          newTitle = parsed.title || currentPage.title;
          newIcon = parsed.icon || template.icon;
          newBlocks = parsed.blocks || [];
          
          // Validate and normalize blocks
          newBlocks = normalizeBlocks(newBlocks);
          
          console.log(`[PageBuilderAgent] Parsed ${newBlocks.length} blocks`);
        } catch (parseError) {
          console.error('[PageBuilderAgent] JSON parse error:', parseError);
        }
      }
    } else {
      console.error('[PageBuilderAgent] AI request failed:', aiResponse.status);
    }
  } catch (error) {
    console.error('[PageBuilderAgent] AI redesign failed:', error);
  }

  // Fallback: create intelligent structure if AI failed
  if (newBlocks.length === 0) {
    console.log('[PageBuilderAgent] Using fallback structure');
    newBlocks = createFallbackStructure(currentPage, pageType, template);
  }

  // Return redesigned page
  const preview: PagePreview = {
    title: newTitle,
    icon: newIcon,
    blocks: newBlocks,
  };

  // Log activity
  try {
    const picService = getKidsPICService(pool);
    await picService.logActivity({
      childId: childProfile.id,
      activityType: 'page_redesigned',
      activityCategory: 'workspace',
      sourceType: 'workspace',
      title: `Redesigned: ${newTitle}`,
      description: `Restructured ${pageType} page with AI assistance (${redesignAction})`,
      metadata: { pageId: currentPage.id, action: redesignAction, pageType, designStyle },
    });
  } catch (error) {
    console.error('[PageBuilderAgent] Failed to log redesign:', error);
  }

  res.status(200).json({
    success: true,
    action: 'redesign',
    pageId: currentPage.id,
    pageType,
    page: preview,
    message: {
      role: 'assistant',
      content: `I've redesigned your ${pageType} page! 🎨 Here's the new structure:`,
      pagePreview: preview,
    },
  });
}

// Normalize blocks to ensure consistent format
function normalizeBlocks(blocks: any[]): PageBlock[] {
  return blocks.map(block => {
    // Ensure content is in rich text format
    let content = block.content;
    if (typeof content === 'string') {
      content = [{ text: content }];
    } else if (!Array.isArray(content)) {
      content = [{ text: String(content || '') }];
    }
    
    // Normalize children recursively
    let children = block.children;
    if (Array.isArray(children)) {
      children = normalizeBlocks(children);
    }
    
    return {
      type: block.type || 'paragraph',
      content,
      properties: block.properties || {},
      ...(children ? { children } : {}),
    };
  });
}

// Create fallback structure when AI fails
function createFallbackStructure(
  currentPage: CurrentPageContext,
  pageType: string,
  template: typeof PAGE_TYPE_TEMPLATES[string]
): PageBlock[] {
  const blocks: PageBlock[] = [];
  
  // Title
  blocks.push({
    type: 'heading_1',
    content: [{ text: currentPage.title || 'Untitled Page' }],
  });
  
  // Overview callout
  blocks.push({
    type: 'callout',
    content: [{ text: 'Add an overview or description here...' }],
    properties: { color: template.colors.primary, icon: template.icon },
  });
  
  // Extract content from original blocks
  const contentBlocks = currentPage.blocks.filter(b => {
    const content = typeof b.content === 'string' ? b.content : 
      Array.isArray(b.content) ? b.content.map((c: any) => c.text || c).join('') : '';
    return content.trim().length > 0;
  });
  
  if (contentBlocks.length > 0) {
    blocks.push({
      type: 'heading_2',
      content: [{ text: 'Content' }],
    });
    
    for (const block of contentBlocks) {
      const content = typeof block.content === 'string' ? block.content :
        Array.isArray(block.content) ? block.content.map((c: any) => c.text || c).join('') : '';
      
      blocks.push({
        type: block.type || 'paragraph',
        content: [{ text: content }],
        properties: block.properties || {},
      });
    }
  }
  
  // Add section based on page type
  if (pageType === 'trip_planning' || pageType === 'list' || pageType === 'goals') {
    blocks.push({
      type: 'heading_2',
      content: [{ text: 'Checklist' }],
    });
    blocks.push({
      type: 'to_do',
      content: [{ text: 'Add your first item...' }],
      properties: { checked: false },
    });
  }
  
  return blocks;
}

async function handleGenerate(
  res: NextApiResponse,
  state: AgentState,
  childProfile: any
): Promise<void> {
  const preview = generatePagePreview(state);
  
  // Log activity to PIC
  try {
    const picService = getKidsPICService(pool);
    await picService.logActivity({
      childId: childProfile.id,
      activityType: 'page_created',
      activityCategory: 'workspace',
      sourceType: 'workspace',
      title: preview.title,
      description: `Created a ${state.pageType} page`,
      metadata: { pageType: state.pageType, details: state.details },
    });

    // Update progress
    await picService.updateProgress(
      childProfile.id,
      'workspace',
      'pages_created',
      1,
      { incrementStreak: false }
    );

    // Check for achievements
    await picService.checkAndAwardAchievements(childProfile.id);
  } catch (error) {
    console.error('[PageBuilderAgent] Failed to log to PIC:', error);
  }

  res.status(200).json({
    success: true,
    page: preview,
    message: {
      role: 'assistant',
      content: `Your page "${preview.title}" is ready! 🎉 Start adding your ideas!`,
    },
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

function getPersonalizedGreeting(childProfile: any): string {
  const greetings = [
    `Hi ${childProfile.displayName || 'there'}! 👋`,
    `Hey ${childProfile.displayName || 'friend'}! 🌟`,
    `Hello ${childProfile.displayName || 'there'}! ✨`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

function createQuestionResponse(question: any, pageType: string): ConversationMessage {
  if (question.freeText) {
    return {
      role: 'assistant',
      content: `${question.question}\n\n💡 *${question.placeholder}*`,
    };
  }
  
  return {
    role: 'assistant',
    content: question.question,
    options: question.options,
  };
}

function analyzeUserMessage(message: string): { pageType?: string; details: Record<string, any> } {
  const lower = message.toLowerCase();
  const details: Record<string, any> = {};
  
  // Detect page type
  let pageType: string | undefined;
  
  if (lower.includes('story') || lower.includes('adventure') || lower.includes('tale') || lower.includes('once upon')) {
    pageType = 'story';
  } else if (lower.includes('list') || lower.includes('shopping') || lower.includes('todo') || lower.includes('checklist')) {
    pageType = 'list';
  } else if (lower.includes('trip') || lower.includes('travel') || lower.includes('vacation') || lower.includes('packing') || lower.includes('going to')) {
    pageType = 'trip';
    // Try to extract destination
    const destMatch = lower.match(/(?:trip to|going to|travel to|vacation (?:to|at))\s+(.+?)(?:\.|,|$)/);
    if (destMatch) {
      details.destination = destMatch[1].trim();
    }
  } else if (lower.includes('project') || lower.includes('experiment') || lower.includes('science')) {
    pageType = 'project';
  } else if (lower.includes('homework') || lower.includes('assignment') || lower.includes('report') || lower.includes('essay')) {
    pageType = 'homework';
  } else if (lower.includes('goal') || lower.includes('want to') || lower.includes('dream')) {
    pageType = 'goals';
  } else if (lower.includes('journal') || lower.includes('diary') || lower.includes('my day')) {
    pageType = 'journal';
  }

  // Extract any mentioned topics
  details.originalPrompt = message;
  
  return { pageType, details };
}

function generatePagePreview(state: AgentState): PagePreview {
  const pageType = state.pageType || 'other';
  const details = state.details;
  const pageConfig = PAGE_TYPES[pageType as keyof typeof PAGE_TYPES];
  
  // Generate smart title
  let title = generateSmartTitle(pageType, details);
  let icon = pageConfig?.emoji || '📄';
  let blocks: PageBlock[] = [];

  switch (pageType) {
    case 'story':
      blocks = generateStoryBlocks(details);
      break;
    case 'list':
      blocks = generateListBlocks(details);
      break;
    case 'trip':
      blocks = generateTripBlocks(details);
      icon = '🧳';
      break;
    case 'project':
      blocks = generateProjectBlocks(details);
      break;
    case 'homework':
      blocks = generateHomeworkBlocks(details);
      break;
    case 'goals':
      blocks = generateGoalsBlocks(details);
      break;
    case 'journal':
      blocks = generateJournalBlocks(details);
      break;
    default:
      blocks = generateGenericBlocks(details);
  }

  return { title, icon, blocks };
}

function generateSmartTitle(pageType: string, details: Record<string, any>): string {
  switch (pageType) {
    case 'story':
      if (details.genre === 'adventure') return 'My Adventure Story';
      if (details.genre === 'fantasy') return 'My Magical Tale';
      if (details.genre === 'mystery') return 'The Mystery of...';
      if (details.mainCharacter) return `The Story of ${details.mainCharacter}`;
      return 'My Story';
    
    case 'list':
      if (details.listType === 'shopping') return 'Shopping List';
      if (details.listType === 'packing') return 'Packing Checklist';
      if (details.listType === 'wishlist') return 'My Wish List';
      return 'My Checklist';
    
    case 'trip':
      if (details.destination) return `Trip to ${details.destination}`;
      if (details.duration === 'weekend') return 'Weekend Trip Packing';
      return 'My Trip Planning';
    
    case 'project':
      if (details.topic) return `${details.topic} Project`;
      if (details.projectType === 'science') return 'My Science Experiment';
      if (details.projectType === 'art') return 'My Art Project';
      return 'My Project';
    
    case 'homework':
      if (details.subject && details.assignment) return `${details.subject}: ${details.assignment}`;
      if (details.subject) return `${details.subject} Homework`;
      return 'My Homework';
    
    case 'goals':
      if (details.goal) return details.goal;
      if (details.goalType === 'learning') return 'Learning Goals';
      if (details.goalType === 'habit') return 'My New Habit';
      return 'My Goals';
    
    case 'journal':
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (details.journalType === 'gratitude') return `Gratitude - ${today}`;
      if (details.journalType === 'memory') return 'A Special Memory';
      return `Journal - ${today}`;
    
    default:
      return details.originalPrompt?.split(' ').slice(0, 5).join(' ') || 'New Page';
  }
}

function generateStoryBlocks(details: Record<string, any>): PageBlock[] {
  const genre = details.genre || 'adventure';
  const character = details.mainCharacter || 'the hero';
  
  return [
    { type: 'callout', content: `Main Character: ${character}`, properties: { icon: '👤', color: 'blue' } },
    { type: 'callout', content: 'Setting: Where does your story happen?', properties: { icon: '🗺️', color: 'green' } },
    { type: 'divider', content: '' },
    { type: 'heading_2', content: '✨ The Beginning' },
    { type: 'paragraph', content: `Once upon a time, ${character}...` },
    { type: 'heading_2', content: '🌟 The Middle' },
    { type: 'paragraph', content: 'Then something exciting happened...' },
    { type: 'heading_2', content: '🎉 The End' },
    { type: 'paragraph', content: 'And so...' },
  ];
}

function generateListBlocks(details: Record<string, any>): PageBlock[] {
  const listType = details.listType || 'todo';
  
  let items = ['Item 1', 'Item 2', 'Item 3'];
  let calloutText = 'Check off items as you complete them!';
  
  if (listType === 'shopping') {
    items = ['Milk', 'Bread', 'Eggs'];
    calloutText = 'Don\'t forget anything!';
  } else if (listType === 'wishlist') {
    items = ['My first wish', 'My second wish', 'My third wish'];
    calloutText = 'Dream big! ⭐';
  }
  
  return [
    { type: 'callout', content: calloutText, properties: { icon: '✅', color: 'green' } },
    { type: 'divider', content: '' },
    ...items.map(item => ({ type: 'to_do', content: item, properties: { checked: false } })),
    { type: 'to_do', content: 'Add more...', properties: { checked: false } },
  ];
}

function generateTripBlocks(details: Record<string, any>): PageBlock[] {
  const destination = details.destination || 'your destination';
  const duration = details.duration || 'weekend';
  
  return [
    { type: 'callout', content: `Trip to: ${destination}`, properties: { icon: '✈️', color: 'blue' } },
    { type: 'divider', content: '' },
    { type: 'heading_2', content: 'Clothes 👕' },
    { type: 'to_do', content: 'T-shirts', properties: { checked: false } },
    { type: 'to_do', content: 'Pants/Shorts', properties: { checked: false } },
    { type: 'to_do', content: 'Pajamas', properties: { checked: false } },
    { type: 'to_do', content: 'Jacket', properties: { checked: false } },
    { type: 'heading_2', content: 'Fun Stuff 🎮' },
    { type: 'to_do', content: 'Favorite book', properties: { checked: false } },
    { type: 'to_do', content: 'Tablet/games', properties: { checked: false } },
    { type: 'to_do', content: 'Coloring supplies', properties: { checked: false } },
    { type: 'heading_2', content: 'Important Things 🔑' },
    { type: 'to_do', content: 'Toothbrush', properties: { checked: false } },
    { type: 'to_do', content: 'Stuffed animal', properties: { checked: false } },
    { type: 'to_do', content: 'Chargers', properties: { checked: false } },
  ];
}

function generateProjectBlocks(details: Record<string, any>): PageBlock[] {
  const topic = details.topic || 'my topic';
  const projectType = details.projectType || 'science';
  
  if (projectType === 'science') {
    return [
      { type: 'callout', content: `Topic: ${topic}`, properties: { icon: '🔬', color: 'purple' } },
      { type: 'divider', content: '' },
      { type: 'heading_2', content: 'My Question ❓' },
      { type: 'paragraph', content: 'What am I trying to find out?' },
      { type: 'heading_2', content: 'My Hypothesis 🤔' },
      { type: 'paragraph', content: 'I think... (my prediction)' },
      { type: 'heading_2', content: 'Materials 🧪' },
      { type: 'bulleted_list', content: 'Item 1' },
      { type: 'bulleted_list', content: 'Item 2' },
      { type: 'heading_2', content: 'Steps 📋' },
      { type: 'numbered_list', content: 'First, I will...' },
      { type: 'numbered_list', content: 'Then, I will...' },
      { type: 'numbered_list', content: 'Finally, I will...' },
      { type: 'heading_2', content: 'Results 📊' },
      { type: 'paragraph', content: 'What happened?' },
      { type: 'heading_2', content: 'Conclusion 💡' },
      { type: 'paragraph', content: 'I learned that...' },
    ];
  }
  
  return [
    { type: 'callout', content: `Project: ${topic}`, properties: { icon: '🎨', color: 'blue' } },
    { type: 'divider', content: '' },
    { type: 'heading_2', content: 'My Idea 💡' },
    { type: 'paragraph', content: 'What I want to create...' },
    { type: 'heading_2', content: 'Materials Needed' },
    { type: 'bulleted_list', content: 'Item 1' },
    { type: 'bulleted_list', content: 'Item 2' },
    { type: 'heading_2', content: 'Steps' },
    { type: 'numbered_list', content: 'Step 1' },
    { type: 'numbered_list', content: 'Step 2' },
  ];
}

function generateHomeworkBlocks(details: Record<string, any>): PageBlock[] {
  const subject = details.subject || 'Subject';
  const assignment = details.assignment || 'Assignment';
  
  return [
    { type: 'callout', content: 'Due Date: (When is this due?)', properties: { icon: '📅', color: 'red' } },
    { type: 'divider', content: '' },
    { type: 'heading_2', content: 'Instructions 📝' },
    { type: 'paragraph', content: assignment || 'What do I need to do?' },
    { type: 'heading_2', content: 'My Work ✏️' },
    { type: 'paragraph', content: 'Start here...' },
    { type: 'heading_2', content: 'Questions I Have ❓' },
    { type: 'bulleted_list', content: 'Any questions?' },
    { type: 'heading_2', content: 'Done! ✅' },
    { type: 'to_do', content: 'Check my work', properties: { checked: false } },
    { type: 'to_do', content: 'Turn it in', properties: { checked: false } },
  ];
}

function generateGoalsBlocks(details: Record<string, any>): PageBlock[] {
  const goal = details.goal || 'My goal';
  const goalType = details.goalType || 'personal';
  
  return [
    { type: 'callout', content: 'You can do it! 💪', properties: { icon: '⭐', color: 'yellow' } },
    { type: 'divider', content: '' },
    { type: 'heading_2', content: 'My Goal 🎯' },
    { type: 'paragraph', content: goal },
    { type: 'heading_2', content: 'Why This Matters 💭' },
    { type: 'paragraph', content: 'This is important to me because...' },
    { type: 'heading_2', content: 'Steps to Get There 📈' },
    { type: 'to_do', content: 'Step 1', properties: { checked: false } },
    { type: 'to_do', content: 'Step 2', properties: { checked: false } },
    { type: 'to_do', content: 'Step 3', properties: { checked: false } },
    { type: 'heading_2', content: 'My Progress 🌟' },
    { type: 'paragraph', content: 'Track how you\'re doing!' },
  ];
}

function generateJournalBlocks(details: Record<string, any>): PageBlock[] {
  const journalType = details.journalType || 'day';
  
  if (journalType === 'gratitude') {
    return [
      { type: 'callout', content: 'What are you thankful for today?', properties: { icon: '🙏', color: 'yellow' } },
      { type: 'divider', content: '' },
      { type: 'heading_2', content: 'I\'m grateful for...' },
      { type: 'numbered_list', content: 'First thing' },
      { type: 'numbered_list', content: 'Second thing' },
      { type: 'numbered_list', content: 'Third thing' },
      { type: 'heading_2', content: 'Something good that happened' },
      { type: 'paragraph', content: 'Today...' },
    ];
  }
  
  if (journalType === 'feelings') {
    return [
      { type: 'callout', content: 'How are you feeling?', properties: { icon: '💭', color: 'purple' } },
      { type: 'divider', content: '' },
      { type: 'heading_2', content: 'Right now I feel...' },
      { type: 'paragraph', content: 'Describe your feelings...' },
      { type: 'heading_2', content: 'Why do I feel this way?' },
      { type: 'paragraph', content: 'Because...' },
      { type: 'heading_2', content: 'What might help?' },
      { type: 'paragraph', content: 'I could...' },
    ];
  }
  
  return [
    { type: 'callout', content: 'What happened today?', properties: { icon: '☀️', color: 'blue' } },
    { type: 'divider', content: '' },
    { type: 'heading_2', content: 'Today I...' },
    { type: 'paragraph', content: 'Write about your day...' },
    { type: 'heading_2', content: 'The best part was' },
    { type: 'paragraph', content: 'My favorite moment...' },
    { type: 'heading_2', content: 'Tomorrow I want to' },
    { type: 'paragraph', content: 'Looking forward to...' },
  ];
}

function generateGenericBlocks(details: Record<string, any>): PageBlock[] {
  return [
    { type: 'paragraph', content: 'Start writing here...' },
    { type: 'divider', content: '' },
    { type: 'heading_2', content: 'Section 1' },
    { type: 'paragraph', content: 'Add your content...' },
    { type: 'heading_2', content: 'Section 2' },
    { type: 'paragraph', content: 'Add more content...' },
  ];
}

// ============================================================================
// GooseMind Integration
// ============================================================================

async function callChildGooseMind(
  message: string,
  sessionId: string,
  currentPage?: CurrentPageContext,
  childProfile?: any
): Promise<{ response: string; options?: ClickableOption[]; actions?: any[] }> {
  try {
    const response = await fetch(`${GOOSE_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: 'child-goosemind',
        session_id: sessionId,
        message: message,
        context: {
          pageId: currentPage?.id,
          page_title: currentPage?.title,
          page_blocks: currentPage?.blocks,
          child_name: childProfile?.displayName,
          child_id: childProfile?.id,
        },
        agency_mode: 'auto',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PageBuilderAgent] GooseMind API error:', response.status, errorText);
      throw new Error(`GooseMind API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[PageBuilderAgent] GooseMind response:', data);
    
    return {
      response: data.response || "I'm here to help! What would you like to do?",
      options: data.options,
      actions: data.actions,
    };
  } catch (error) {
    console.error('[PageBuilderAgent] Failed to call GooseMind:', error);
    // Fallback to simple response
    return {
      response: "I'm having trouble connecting right now. Can you try again? 😊",
    };
  }
}
