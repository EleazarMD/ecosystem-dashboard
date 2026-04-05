/**
 * Message Selection Engine
 * 
 * Manages message selection state for deep research context.
 * Allows users to:
 * - Select/deselect individual messages to include in research context
 * - Delete messages from the conversation
 * - Persist selection state across session
 * 
 * Following the pattern established by ContextMenuEngine for consistent UX.
 */

export interface MessageWithId {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  cost?: number;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  meta?: {
    wordCount: number;
    charCount: number;
    tokenEstimate: number;
    memorySizeKB: number;
    model?: string;
    processingTimeMs?: number;
    inputTokens?: number;
    outputTokens?: number;
    sourceCount?: number;
  };
}

export interface MessageSelectionState {
  /** Set of message IDs that are excluded from context (inverse selection for efficiency) */
  excludedIds: Set<string>;
  /** Whether selection mode is active */
  isSelectionMode: boolean;
  /** Last modified timestamp */
  lastModified: number;
}

const STORAGE_KEY = 'research-message-selection';

/**
 * Generate a unique ID for a message based on its content and timestamp
 */
export function generateMessageId(message: { content: string; timestamp: Date; role: string }): string {
  const timestampStr = message.timestamp instanceof Date 
    ? message.timestamp.getTime().toString()
    : new Date(message.timestamp).getTime().toString();
  const contentHash = message.content.substring(0, 50).replace(/\s+/g, '_');
  return `msg_${message.role}_${timestampStr}_${contentHash.substring(0, 20)}`;
}

/**
 * Add IDs to messages that don't have them
 */
export function ensureMessageIds(messages: any[]): MessageWithId[] {
  return messages.map(msg => ({
    ...msg,
    id: msg.id || generateMessageId(msg),
  }));
}

// ── State Management ────────────────────────────────────────────────

function loadState(): MessageSelectionState {
  if (typeof window === 'undefined') {
    return { excludedIds: new Set(), isSelectionMode: false, lastModified: Date.now() };
  }
  
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { excludedIds: new Set(), isSelectionMode: false, lastModified: Date.now() };
    }
    const parsed = JSON.parse(raw);
    return {
      excludedIds: new Set(parsed.excludedIds || []),
      isSelectionMode: parsed.isSelectionMode || false,
      lastModified: parsed.lastModified || Date.now(),
    };
  } catch {
    return { excludedIds: new Set(), isSelectionMode: false, lastModified: Date.now() };
  }
}

function saveState(state: MessageSelectionState): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      excludedIds: Array.from(state.excludedIds),
      isSelectionMode: state.isSelectionMode,
      lastModified: state.lastModified,
    }));
  } catch {
    // Session storage may be full or unavailable
  }
}

// ── Public API ──────────────────────────────────────────────────────

export class MessageSelectionEngine {
  private state: MessageSelectionState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = loadState();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.state.lastModified = Date.now();
    saveState(this.state);
    this.listeners.forEach(l => l());
  }

  /**
   * Get current state
   */
  getState(): MessageSelectionState {
    return this.state;
  }

  /**
   * Check if a message is selected (included in context)
   */
  isSelected(messageId: string): boolean {
    return !this.state.excludedIds.has(messageId);
  }

  /**
   * Toggle selection for a single message
   */
  toggleSelection(messageId: string): void {
    if (this.state.excludedIds.has(messageId)) {
      this.state.excludedIds.delete(messageId);
    } else {
      this.state.excludedIds.add(messageId);
    }
    this.notify();
  }

  /**
   * Include a message in context
   */
  select(messageId: string): void {
    this.state.excludedIds.delete(messageId);
    this.notify();
  }

  /**
   * Exclude a message from context
   */
  deselect(messageId: string): void {
    this.state.excludedIds.add(messageId);
    this.notify();
  }

  /**
   * Select all messages (clear exclusions)
   */
  selectAll(): void {
    this.state.excludedIds.clear();
    this.notify();
  }

  /**
   * Deselect all messages
   */
  deselectAll(messageIds: string[]): void {
    this.state.excludedIds = new Set(messageIds);
    this.notify();
  }

  /**
   * Toggle selection mode
   */
  setSelectionMode(enabled: boolean): void {
    this.state.isSelectionMode = enabled;
    this.notify();
  }

  /**
   * Get selected messages filtered from full list
   */
  getSelectedMessages<T extends { id?: string }>(messages: T[]): T[] {
    return messages.filter(msg => {
      const id = msg.id || generateMessageId(msg as any);
      return !this.state.excludedIds.has(id);
    });
  }

  /**
   * Get count of selected messages
   */
  getSelectedCount(totalMessages: number): number {
    return totalMessages - this.state.excludedIds.size;
  }

  /**
   * Clear selection state (reset)
   */
  reset(): void {
    this.state = { excludedIds: new Set(), isSelectionMode: false, lastModified: Date.now() };
    this.notify();
  }

  /**
   * Remove a message ID from tracking (when message is deleted)
   */
  removeMessage(messageId: string): void {
    this.state.excludedIds.delete(messageId);
    this.notify();
  }
}

// Singleton instance
let engineInstance: MessageSelectionEngine | null = null;

export function getMessageSelectionEngine(): MessageSelectionEngine {
  if (!engineInstance) {
    engineInstance = new MessageSelectionEngine();
  }
  return engineInstance;
}

/**
 * Format messages for deep research context, filtering by selection
 */
export function formatSelectedMessagesForContext(
  messages: MessageWithId[],
  maxMessages: number = 10,
  maxChars: number = 12000
): string {
  const engine = getMessageSelectionEngine();
  const selected = engine.getSelectedMessages(messages);
  
  // Take most recent messages up to limit
  const recent = selected.slice(-maxMessages);
  
  let context = '';
  let charCount = 0;
  
  for (const msg of recent) {
    const prefix = msg.role === 'user' ? 'User' : 'Assistant';
    const entry = `**${prefix}**: ${msg.content}\n\n`;
    
    if (charCount + entry.length > maxChars) {
      break;
    }
    
    context += entry;
    charCount += entry.length;
  }
  
  return context.trim();
}
