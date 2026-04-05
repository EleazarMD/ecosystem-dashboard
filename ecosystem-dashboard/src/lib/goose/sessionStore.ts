/**
 * Shared Goose Session Store
 * Global storage for Goose sessions across ALL API routes
 * Uses Node.js global to share across webpack chunks
 */

export interface GooseSession {
  id: string;
  pageId: string;
  context: {
    pageTitle: string;
    blockCount: number;
    workspaceId: string;
  };
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
  }>;
  createdAt: number;
}

// Extend global interface
declare global {
  var gooseSessionsMap: Map<string, GooseSession> | undefined;
}

// Singleton session store (shared across all API routes via Node.js global)
class SessionStore {
  private sessions: Map<string, GooseSession>;

  constructor() {
    // Use global.gooseSessionsMap to share across all API routes
    if (!global.gooseSessionsMap) {
      global.gooseSessionsMap = new Map();
      console.log('[SessionStore] ✅ Initialized GLOBAL session store');
    } else {
      console.log('[SessionStore] 🔄 Reusing existing GLOBAL session store');
    }
    this.sessions = global.gooseSessionsMap;
  }

  set(sessionId: string, session: GooseSession): void {
    this.sessions.set(sessionId, session);
    console.log(`[SessionStore] 💾 Stored session: ${sessionId} (total: ${this.sessions.size})`);
  }

  get(sessionId: string): GooseSession | undefined {
    const session = this.sessions.get(sessionId);
    console.log(`[SessionStore] 🔍 Retrieved session: ${sessionId} - ${session ? 'FOUND' : 'NOT FOUND'}`);
    return session;
  }

  getAll(): GooseSession[] {
    return Array.from(this.sessions.values());
  }

  delete(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    console.log(`[SessionStore] 🗑️ Deleted session: ${sessionId} - ${deleted ? 'SUCCESS' : 'NOT FOUND'}`);
    return deleted;
  }

  update(sessionId: string, updates: Partial<GooseSession>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.set(sessionId, { ...session, ...updates });
      console.log(`[SessionStore] ✏️ Updated session: ${sessionId}`);
    } else {
      console.log(`[SessionStore] ❌ Cannot update - session not found: ${sessionId}`);
    }
  }

  size(): number {
    return this.sessions.size;
  }
}

// Export new instance (will use global Map)
export const sessionStore = new SessionStore();
