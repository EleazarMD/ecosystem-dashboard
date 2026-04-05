/**
 * Activity Bridge Service
 * Enables cross-activity communication and actions
 * 
 * This service provides a centralized way for panels to trigger actions
 * in other activities without tight coupling.
 */

import { useRouter } from 'next/router';
import { useToast } from '@chakra-ui/react';

export type ActivityType = 
  | 'workspace'
  | 'chat'
  | 'dictionary'
  | 'art-studio'
  | 'email'
  | 'planner'
  | 'books';

export interface CreateNoteParams {
  title: string;
  content: string;
  tags?: string[];
  category?: string;
}

export interface SendToChatParams {
  characterId?: string;
  message: string;
  context?: string;
}

export interface CreateArtParams {
  prompt: string;
  style?: string;
  referenceImage?: string;
}

export interface ScheduleTaskParams {
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
}

export interface SaveWordParams {
  word: string;
  definition: string;
  example?: string;
  category?: string;
}

/**
 * Activity Bridge Hook
 * Use this in components to trigger cross-activity actions
 */
export function useActivityBridge() {
  const router = useRouter();
  const toast = useToast();

  /**
   * Create a note in the workspace
   */
  const createNote = async (params: CreateNoteParams): Promise<string | null> => {
    try {
      const response = await fetch('/api/child/workspace/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: params.title,
          content: params.content,
          tags: params.tags || [],
          category: params.category || 'notes',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create note');
      }

      const data = await response.json();
      
      toast({
        title: 'Note created!',
        description: `"${params.title}" has been saved to your workspace`,
        status: 'success',
        duration: 3000,
      });

      return data.pageId;
    } catch (error) {
      console.error('[ActivityBridge] Error creating note:', error);
      toast({
        title: 'Error',
        description: 'Could not create note. Please try again.',
        status: 'error',
        duration: 3000,
      });
      return null;
    }
  };

  /**
   * Navigate to workspace with optional page
   */
  const openWorkspace = (pageId?: string) => {
    const url = pageId ? `/child/workspace?page=${pageId}` : '/child/workspace';
    router.push(url);
  };

  /**
   * Send a message to a chat character
   */
  const sendToChat = async (params: SendToChatParams): Promise<boolean> => {
    try {
      // Store the pre-filled message in session storage
      sessionStorage.setItem('chat-prefill', JSON.stringify({
        characterId: params.characterId,
        message: params.message,
        context: params.context,
      }));

      // Navigate to chat
      router.push('/child/chat');

      toast({
        title: 'Opening chat...',
        description: 'Your message is ready to send',
        status: 'info',
        duration: 2000,
      });

      return true;
    } catch (error) {
      console.error('[ActivityBridge] Error sending to chat:', error);
      toast({
        title: 'Error',
        description: 'Could not open chat. Please try again.',
        status: 'error',
        duration: 3000,
      });
      return false;
    }
  };

  /**
   * Create an art project
   */
  const createArt = async (params: CreateArtParams): Promise<boolean> => {
    try {
      // Store the art prompt in session storage
      sessionStorage.setItem('art-prefill', JSON.stringify({
        prompt: params.prompt,
        style: params.style,
        referenceImage: params.referenceImage,
      }));

      // Navigate to art studio
      router.push('/child/art-studio');

      toast({
        title: 'Opening Art Studio...',
        description: 'Your idea is ready to create',
        status: 'info',
        duration: 2000,
      });

      return true;
    } catch (error) {
      console.error('[ActivityBridge] Error creating art:', error);
      toast({
        title: 'Error',
        description: 'Could not open Art Studio. Please try again.',
        status: 'error',
        duration: 3000,
      });
      return false;
    }
  };

  /**
   * Schedule a task in the planner
   */
  const scheduleTask = async (params: ScheduleTaskParams): Promise<string | null> => {
    try {
      const response = await fetch('/api/child/planner/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to schedule task');
      }

      const data = await response.json();

      toast({
        title: 'Task scheduled!',
        description: `"${params.title}" has been added to your planner`,
        status: 'success',
        duration: 3000,
      });

      return data.taskId;
    } catch (error) {
      console.error('[ActivityBridge] Error scheduling task:', error);
      toast({
        title: 'Error',
        description: 'Could not schedule task. Please try again.',
        status: 'error',
        duration: 3000,
      });
      return null;
    }
  };

  /**
   * Save a word to the dictionary collection
   */
  const saveWord = async (params: SaveWordParams): Promise<boolean> => {
    try {
      const response = await fetch('/api/child/dictionary/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to save word');
      }

      toast({
        title: 'Word saved!',
        description: `"${params.word}" has been added to your collection`,
        status: 'success',
        duration: 3000,
      });

      return true;
    } catch (error) {
      console.error('[ActivityBridge] Error saving word:', error);
      toast({
        title: 'Error',
        description: 'Could not save word. Please try again.',
        status: 'error',
        duration: 3000,
      });
      return false;
    }
  };

  /**
   * Navigate to a specific activity
   */
  const navigateTo = (activity: ActivityType, params?: Record<string, string>) => {
    const routes: Record<ActivityType, string> = {
      workspace: '/child/workspace',
      chat: '/child/chat',
      dictionary: '/child/dictionary',
      'art-studio': '/child/art-studio',
      email: '/child/email',
      planner: '/child/planner',
      books: '/child/book-explorer',
    };

    let url = routes[activity];
    
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    router.push(url);
  };

  /**
   * Dispatch a custom event for activity-to-activity communication
   */
  const dispatchEvent = (eventName: string, detail: any) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  };

  /**
   * Listen for custom events from other activities
   */
  const addEventListener = (eventName: string, handler: (e: CustomEvent) => void) => {
    window.addEventListener(eventName, handler as EventListener);
    return () => window.removeEventListener(eventName, handler as EventListener);
  };

  return {
    // Core actions
    createNote,
    openWorkspace,
    sendToChat,
    createArt,
    scheduleTask,
    saveWord,
    navigateTo,
    
    // Event system
    dispatchEvent,
    addEventListener,
  };
}

/**
 * Activity Bridge Events
 * Standard event names for cross-activity communication
 */
export const ActivityEvents = {
  WORD_SELECTED: 'activity:word-selected',
  NOTE_CREATED: 'activity:note-created',
  TASK_SCHEDULED: 'activity:task-scheduled',
  CHAT_MESSAGE_SENT: 'activity:chat-message-sent',
  ART_CREATED: 'activity:art-created',
  BOOK_OPENED: 'activity:book-opened',
} as const;
