/**
 * useMessageSelection Hook
 * 
 * React hook for managing message selection state in the Deep Research workspace.
 * Provides reactive state updates and convenient methods for message management.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getMessageSelectionEngine,
  MessageSelectionEngine,
  MessageSelectionState,
  MessageWithId,
  ensureMessageIds,
  generateMessageId,
} from '@/lib/research/message-selection-engine';

export interface UseMessageSelectionResult {
  /** Whether selection mode is active */
  isSelectionMode: boolean;
  /** Toggle selection mode on/off */
  setSelectionMode: (enabled: boolean) => void;
  /** Check if a specific message is selected */
  isSelected: (messageId: string) => boolean;
  /** Toggle selection for a message */
  toggleSelection: (messageId: string) => void;
  /** Select a message (include in context) */
  select: (messageId: string) => void;
  /** Deselect a message (exclude from context) */
  deselect: (messageId: string) => void;
  /** Select all messages */
  selectAll: () => void;
  /** Deselect all messages */
  deselectAll: () => void;
  /** Get filtered messages (only selected ones) */
  getSelectedMessages: <T extends { id?: string }>(messages: T[]) => T[];
  /** Number of excluded messages */
  excludedCount: number;
  /** Reset all selection state */
  reset: () => void;
  /** Remove a message from tracking (when deleted) */
  removeMessage: (messageId: string) => void;
  /** Get selected count from total */
  getSelectedCount: (total: number) => number;
}

export function useMessageSelection(messages?: any[]): UseMessageSelectionResult {
  const engine = useMemo(() => getMessageSelectionEngine(), []);
  const [state, setState] = useState<MessageSelectionState>(engine.getState());

  // Subscribe to engine state changes
  useEffect(() => {
    const unsubscribe = engine.subscribe(() => {
      setState({ ...engine.getState() });
    });
    return unsubscribe;
  }, [engine]);

  // Memoized message IDs for deselectAll
  const messageIds = useMemo(() => {
    if (!messages) return [];
    return messages.map(m => m.id || generateMessageId(m));
  }, [messages]);

  const setSelectionMode = useCallback((enabled: boolean) => {
    engine.setSelectionMode(enabled);
  }, [engine]);

  const isSelected = useCallback((messageId: string) => {
    return engine.isSelected(messageId);
  }, [engine]);

  const toggleSelection = useCallback((messageId: string) => {
    engine.toggleSelection(messageId);
  }, [engine]);

  const select = useCallback((messageId: string) => {
    engine.select(messageId);
  }, [engine]);

  const deselect = useCallback((messageId: string) => {
    engine.deselect(messageId);
  }, [engine]);

  const selectAll = useCallback(() => {
    engine.selectAll();
  }, [engine]);

  const deselectAll = useCallback(() => {
    engine.deselectAll(messageIds);
  }, [engine, messageIds]);

  const getSelectedMessages = useCallback(<T extends { id?: string }>(msgs: T[]): T[] => {
    return engine.getSelectedMessages(msgs);
  }, [engine]);

  const reset = useCallback(() => {
    engine.reset();
  }, [engine]);

  const removeMessage = useCallback((messageId: string) => {
    engine.removeMessage(messageId);
  }, [engine]);

  const getSelectedCount = useCallback((total: number) => {
    return engine.getSelectedCount(total);
  }, [engine]);

  return {
    isSelectionMode: state.isSelectionMode,
    setSelectionMode,
    isSelected,
    toggleSelection,
    select,
    deselect,
    selectAll,
    deselectAll,
    getSelectedMessages,
    excludedCount: state.excludedIds.size,
    reset,
    removeMessage,
    getSelectedCount,
  };
}

// Re-export utilities
export { ensureMessageIds, generateMessageId, type MessageWithId };
