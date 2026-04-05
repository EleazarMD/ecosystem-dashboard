/**
 * Chat History Management
 * Persistent storage and retrieval of podcast studio conversations
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatConversation {
  id: string;
  projectId: string;
  title: string; // Auto-generated from first message
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  sourceCount: number; // Number of sources at time of creation
}

// LocalStorage keys
const CHAT_HISTORY_KEY = 'podcast-studio-chat-history';
const MAX_CONVERSATIONS = 50; // Limit to prevent localStorage bloat

/**
 * Get all chat conversations
 */
export function getAllConversations(): ChatConversation[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!stored) return [];
    
    const conversations: ChatConversation[] = JSON.parse(stored);
    // Sort by most recent first
    return conversations.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('Failed to load chat history:', error);
    return [];
  }
}

/**
 * Get conversations for a specific project
 */
export function getProjectConversations(projectId: string): ChatConversation[] {
  return getAllConversations().filter(c => c.projectId === projectId);
}

/**
 * Save a new conversation
 */
export function saveConversation(
  projectId: string,
  messages: ChatMessage[],
  sourceCount: number
): ChatConversation {
  const now = new Date().toISOString();
  
  // Generate title from first user message
  const firstUserMessage = messages.find(m => m.role === 'user');
  const title = firstUserMessage 
    ? generateConversationTitle(firstUserMessage.content)
    : 'Untitled Conversation';
  
  const conversation: ChatConversation = {
    id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    title,
    messages,
    createdAt: now,
    updatedAt: now,
    messageCount: messages.length,
    sourceCount,
  };
  
  const allConversations = getAllConversations();
  
  // Add new conversation at the beginning
  const updated = [conversation, ...allConversations];
  
  // Limit total conversations
  const limited = updated.slice(0, MAX_CONVERSATIONS);
  
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(limited));
  
  return conversation;
}

/**
 * Update an existing conversation
 */
export function updateConversation(
  conversationId: string,
  messages: ChatMessage[]
): ChatConversation | null {
  const allConversations = getAllConversations();
  const index = allConversations.findIndex(c => c.id === conversationId);
  
  if (index === -1) return null;
  
  const updated = {
    ...allConversations[index],
    messages,
    updatedAt: new Date().toISOString(),
    messageCount: messages.length,
  };
  
  allConversations[index] = updated;
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(allConversations));
  
  return updated;
}

/**
 * Delete a conversation
 */
export function deleteConversation(conversationId: string): void {
  const allConversations = getAllConversations();
  const filtered = allConversations.filter(c => c.id !== conversationId);
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(filtered));
}

/**
 * Search conversations by content
 */
export function searchConversations(query: string, projectId?: string): ChatConversation[] {
  const conversations = projectId 
    ? getProjectConversations(projectId)
    : getAllConversations();
  
  if (!query.trim()) return conversations;
  
  const lowerQuery = query.toLowerCase();
  
  return conversations.filter(conv => {
    // Search in title
    if (conv.title.toLowerCase().includes(lowerQuery)) return true;
    
    // Search in message content
    return conv.messages.some(msg => 
      msg.content.toLowerCase().includes(lowerQuery)
    );
  });
}

/**
 * Get conversation by ID
 */
export function getConversationById(conversationId: string): ChatConversation | null {
  const allConversations = getAllConversations();
  return allConversations.find(c => c.id === conversationId) || null;
}

/**
 * Generate a conversation title from first message
 */
function generateConversationTitle(content: string): string {
  // Remove common question words and trim
  const cleaned = content
    .replace(/^(what|how|why|when|where|who|can you|could you|please)\s+/i, '')
    .trim();
  
  // Truncate to reasonable length
  const maxLength = 50;
  if (cleaned.length <= maxLength) return cleaned;
  
  // Try to break at word boundary
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Export conversation to markdown
 */
export function exportConversationToMarkdown(conversation: ChatConversation): string {
  const lines: string[] = [];
  
  lines.push(`# ${conversation.title}`);
  lines.push('');
  lines.push(`**Created:** ${new Date(conversation.createdAt).toLocaleString()}`);
  lines.push(`**Updated:** ${new Date(conversation.updatedAt).toLocaleString()}`);
  lines.push(`**Messages:** ${conversation.messageCount}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  conversation.messages.forEach((msg, idx) => {
    const role = msg.role === 'user' ? '👤 **You**' : '🤖 **AI Assistant**';
    const timestamp = new Date(msg.timestamp).toLocaleTimeString();
    
    lines.push(`## ${role} (${timestamp})`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    
    if (idx < conversation.messages.length - 1) {
      lines.push('---');
      lines.push('');
    }
  });
  
  return lines.join('\n');
}

/**
 * Clear all chat history (with confirmation)
 */
export function clearAllHistory(): void {
  localStorage.removeItem(CHAT_HISTORY_KEY);
}

/**
 * Get storage statistics
 */
export function getChatHistoryStats(): {
  totalConversations: number;
  totalMessages: number;
  storageSize: number;
  oldestConversation: string | null;
  newestConversation: string | null;
} {
  const conversations = getAllConversations();
  
  return {
    totalConversations: conversations.length,
    totalMessages: conversations.reduce((sum, c) => sum + c.messageCount, 0),
    storageSize: new Blob([JSON.stringify(conversations)]).size,
    oldestConversation: conversations.length > 0 
      ? conversations[conversations.length - 1].createdAt 
      : null,
    newestConversation: conversations.length > 0 
      ? conversations[0].createdAt 
      : null,
  };
}
