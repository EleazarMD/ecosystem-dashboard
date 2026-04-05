/**
 * React hook for managing Workspace AI conversations
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  AIConversation,
  AIMessage,
  AIProject,
  CreateConversationRequest,
  AddMessageRequest,
  SearchResult,
} from '@/types/workspace-ai';

export function useWorkspaceConversations() {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [projects, setProjects] = useState<AIProject[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start as true - initial load pending
  const [error, setError] = useState<string | null>(null);

  /**
   * Load all conversations
   */
  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/workspace-ai/conversations');

      if (!response.ok) {
        // If API doesn't exist (404), silently fail - Goose backend not set up yet
        if (response.status === 404) {
          console.warn('[useWorkspaceConversations] Goose API not available yet');
          setConversations([]);
          return;
        }
        throw new Error('Failed to load conversations');
      }

      const data = await response.json();
      setConversations(data.conversations || []);

      console.log(`[useWorkspaceConversations] Loaded ${data.conversations?.length || 0} conversations`);
    } catch (err) {
      console.error('[useWorkspaceConversations] Error loading conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
      setConversations([]); // Set empty array to prevent retries
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(async (req?: CreateConversationRequest) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/workspace-ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req || {}),
      });

      if (!response.ok) {
        // If API doesn't exist (404), silently fail - Goose backend not set up yet
        if (response.status === 404) {
          console.warn('[useWorkspaceConversations] Goose API not available yet - skipping conversation creation');
          return null;
        }
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      setConversations(prev => [data.conversation, ...prev]);
      setCurrentConversation(data.conversation);
      setMessages([]);

      console.log(`[useWorkspaceConversations] ✅ Created conversation: ${data.conversation.id}`);
      return data.conversation;
    } catch (err) {
      console.error('[useWorkspaceConversations] Error creating conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to create conversation');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load a specific conversation with its messages
   * SAFETY: Limits to most recent 100 messages to prevent browser freeze
   */
  const loadConversation = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/workspace-ai/conversations/${id}`);

      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }

      const data = await response.json();
      setCurrentConversation(data.conversation);

      // SAFETY: Limit to most recent 100 messages to prevent browser freeze from duplicates
      const allMessages = (data.messages || []).map((msg: any) => ({
        ...msg,
        // Expose tools_used from metadata for easier UI access
        tools_used: msg.metadata?.tools_used || msg.tools_used || [],
      }));
      const limitedMessages = allMessages.slice(-100); // Get last 100 messages

      if (allMessages.length > 100) {
        console.warn(`[useWorkspaceConversations] ⚠️ Conversation has ${allMessages.length} messages, limiting to most recent 100`);
      }

      setMessages(limitedMessages);

      console.log(`[useWorkspaceConversations] Loaded conversation ${id} with ${limitedMessages.length} messages (total: ${allMessages.length})`);
    } catch (err) {
      console.error('[useWorkspaceConversations] Error loading conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Add a message to current conversation
   */
  const addMessage = useCallback(async (req: AddMessageRequest) => {
    if (!currentConversation) {
      const errorMsg = 'No active conversation - cannot save message';
      console.error('[useWorkspaceConversations]', errorMsg);
      throw new Error(errorMsg);
    }

    try {
      console.log(`[useWorkspaceConversations] 💾 Saving ${req.role} message to conversation:`, currentConversation.id);

      const response = await fetch(`/api/workspace-ai/messages/${currentConversation.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[useWorkspaceConversations] API error details:', {
          status: response.status,
          conversationId: currentConversation.id,
          error: errorData,
        });
        throw new Error(errorData.error || `Failed to add message (HTTP ${response.status})`);
      }

      const data = await response.json();

      // Add user message
      setMessages(prev => [...prev, data.message]);

      // Add assistant response if present
      if (data.response) {
        setMessages(prev => [...prev, data.response]);
      }

      console.log(`[useWorkspaceConversations] ✅ Added messages to conversation ${currentConversation.id}`);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add message';
      console.error('[useWorkspaceConversations] Error adding message:', {
        error: errorMsg,
        conversationId: currentConversation?.id,
        role: req.role,
      });
      setError(errorMsg);
      throw err; // Re-throw so caller can handle
    }
  }, [currentConversation]);

  /**
   * Update conversation (title, pinned, etc.)
   */
  const updateConversation = useCallback(async (id: string, updates: any) => {
    try {
      const response = await fetch(`/api/workspace-ai/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update conversation');
      }

      const data = await response.json();

      // Update in list
      setConversations(prev =>
        prev.map(c => (c.id === id ? data.conversation : c))
      );

      // Update current if it's the one being updated
      if (currentConversation?.id === id) {
        setCurrentConversation(data.conversation);
      }

      console.log(`[useWorkspaceConversations] ✅ Updated conversation: ${id}`);
      return data.conversation;
    } catch (err) {
      console.error('[useWorkspaceConversations] Error updating conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to update conversation');
      return null;
    }
  }, [currentConversation]);

  /**
   * Archive conversation
   */
  const archiveConversation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/workspace-ai/conversations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to archive conversation');
      }

      // Remove from list
      setConversations(prev => prev.filter(c => c.id !== id));

      // Clear if it's the current conversation
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }

      console.log(`[useWorkspaceConversations] 🗑️ Archived conversation: ${id}`);
    } catch (err) {
      console.error('[useWorkspaceConversations] Error archiving conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to archive conversation');
    }
  }, [currentConversation]);

  /**
   * Load all projects
   */
  const loadProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/workspace-ai/projects');

      if (!response.ok) {
        throw new Error('Failed to load projects');
      }

      const data = await response.json();
      setProjects(data.projects);
      console.log(`[useWorkspaceConversations] Loaded ${data.projects.length} projects`);
    } catch (err) {
      console.error('[useWorkspaceConversations] Error loading projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    }
  }, []);

  /**
   * Search conversations
   */
  const searchConversations = useCallback(async (query: string, projectId?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ q: query });
      if (projectId) params.append('project_id', projectId);

      const response = await fetch(`/api/workspace-ai/search?${params}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.results);
      console.log(`[useWorkspaceConversations] Found ${data.results.length} search results`);
      return data.results;
    } catch (err) {
      console.error('[useWorkspaceConversations] Error searching:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Generate title for conversation
   */
  const generateTitle = useCallback(async (conversationId: string, firstMessage?: string) => {
    try {
      const response = await fetch('/api/workspace-ai/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, first_message: firstMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate title');
      }

      const data = await response.json();

      // Update conversation in list
      setConversations(prev =>
        prev.map(c => (c.id === conversationId ? { ...c, title: data.title } : c))
      );

      // Update current if it's the one being updated
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(prev => prev ? { ...prev, title: data.title } : null);
      }

      console.log(`[useWorkspaceConversations] ✅ Generated title: "${data.title}"`);
      return data.title;
    } catch (err) {
      console.error('[useWorkspaceConversations] Error generating title:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate title');
      return null;
    }
  }, [currentConversation]);

  /**
   * Export conversation
   */
  const exportConversation = useCallback(async (
    conversationId: string,
    format: 'json' | 'markdown' | 'text' = 'markdown'
  ) => {
    try {
      const response = await fetch(`/api/workspace-ai/export/${conversationId}?format=${format}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${conversationId}.${format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'txt'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log(`[useWorkspaceConversations] ✅ Exported conversation as ${format}`);
    } catch (err) {
      console.error('[useWorkspaceConversations] Error exporting:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }, []);

  /**
   * Cleanup empty/ghost conversations
   */
  const cleanupEmptyConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/workspace-ai/conversations/cleanup', {
        method: 'DELETE',
      });

      if (!response.ok) {
        // If cleanup fails, just log it - not critical
        console.warn('[useWorkspaceConversations] Cleanup endpoint not available or failed');
        return;
      }

      const data = await response.json();
      console.log(`[useWorkspaceConversations] 🧹 Cleaned up ${data.deletedCount} ghost conversations`);

      return data.deletedCount;
    } catch (err) {
      console.warn('[useWorkspaceConversations] Error during cleanup:', err);
      return 0;
    }
  }, []);

  // Load conversations and projects on mount, with automatic cleanup
  useEffect(() => {
    // Clean up empty conversations first, then load the clean list
    cleanupEmptyConversations().then(() => {
      loadConversations();
      loadProjects();
    });
  }, [loadConversations, loadProjects, cleanupEmptyConversations]);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    projects,
    searchResults,
    isLoading,
    error,

    // Actions
    loadConversations,
    loadProjects,
    createConversation,
    loadConversation,
    addMessage,
    updateConversation,
    archiveConversation,
    searchConversations,
    generateTitle,
    exportConversation,
    cleanupEmptyConversations,
  };
}
