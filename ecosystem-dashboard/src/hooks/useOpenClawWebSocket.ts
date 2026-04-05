/**
 * OpenClaw WebSocket Client Hook
 *
 * Connects to OpenClaw Gateway WebSocket using the correct native protocol:
 * - Outbound: { type: "req", id, method, params }
 * - Inbound response: { type: "res", id, ok, payload, error }
 * - Inbound event: { type: "event", event, payload, seq }
 * - Connect handshake: send "connect" RPC after WS open
 *
 * Supports multi-tenancy via agentId parameter for per-user agents.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const OPENCLAW_WS_URL = process.env.NEXT_PUBLIC_OPENCLAW_WS_URL || 'wss://100.108.41.22:18789';
const OPENCLAW_TOKEN = process.env.NEXT_PUBLIC_OPENCLAW_TOKEN as string | undefined;

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface OpenClawConnectionOptions {
  agentId?: string;
  userId?: string;
  tenantId?: string;
}

interface RpcRequest {
  type: 'req';
  id: string;
  method: string;
  params?: unknown;
}

interface RpcResponse {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string; details?: unknown };
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

interface Session {
  key: string;
  agentId: string;
  model?: string;
  lastActivity?: string;
  messageCount?: number;
}

interface Skill {
  name: string;
  enabled: boolean;
  path: string;
  description?: string;
  apiKeyRequired?: boolean;
}

interface Channel {
  name: string;
  connected: boolean;
  status: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export interface OpenClawState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  sessions: Session[];
  skills: Skill[];
  channels: Channel[];
  logs: LogEntry[];
  chatHistory: ChatMessage[];
  config: Record<string, unknown> | null;
}

export interface OpenClawActions {
  connect: () => void;
  disconnect: () => void;
  // Chat methods
  chatSend: (message: string, sessionKey?: string) => Promise<void>;
  chatHistory: (sessionKey?: string) => Promise<ChatMessage[]>;
  chatAbort: (sessionKey?: string) => Promise<void>;
  // Sessions methods
  sessionsList: () => Promise<Session[]>;
  sessionsPatch: (key: string, patch: Record<string, unknown>) => Promise<void>;
  sessionsDelete: (key: string) => Promise<void>;
  // Skills methods
  skillsStatus: (agentId?: string) => Promise<Skill[]>;
  skillsInstall: (url: string) => Promise<void>;
  skillsUpdate: (name: string, updates: Record<string, unknown>) => Promise<void>;
  // Logs methods
  logsTail: (cursor?: number, limit?: number) => Promise<{ lines: string[]; cursor: number }>;
  // Config methods
  configGet: () => Promise<Record<string, unknown>>;
  configSet: (path: string, value: unknown) => Promise<void>;
  configApply: () => Promise<void>;
  // Channels methods
  channelsStatus: () => Promise<Channel[]>;
  // System methods
  status: () => Promise<Record<string, unknown>>;
  health: () => Promise<Record<string, unknown>>;
  modelsList: () => Promise<string[]>;
}

export function useOpenClawWebSocket(options?: OpenClawConnectionOptions): [OpenClawState, OpenClawActions] {
  const connectionOptions = useRef<OpenClawConnectionOptions>(options || {});
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRequests = useRef<Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>>(new Map());
  const requestIdCounter = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<OpenClawState>({
    connected: false,
    connecting: false,
    error: null,
    sessions: [],
    skills: [],
    channels: [],
    logs: [],
    chatHistory: [],
    config: null,
  });

  const sendRpc = useCallback(async <T = unknown>(method: string, params?: unknown): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const id = generateUUID();
      const request: RpcRequest = { type: 'req', id, method, params };

      pendingRequests.current.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });

      setTimeout(() => {
        if (pendingRequests.current.has(id)) {
          pendingRequests.current.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 30000);

      wsRef.current.send(JSON.stringify(request));
    });
  }, []);

  const sendConnect = useCallback((ws: WebSocket, nonce?: string | null) => {
    const sendConnectFrame = (params: Record<string, unknown>, allowModernRetry: boolean) => {
      const id = generateUUID();
      const frame = { type: 'req' as const, id, method: 'connect', params };
      ws.send(JSON.stringify(frame));
      pendingRequests.current.set(id, {
        resolve: () => setState((prev) => ({ ...prev, connected: true, connecting: false, error: null })),
        reject: (err) => {
          const msg = String(err);
          const shouldRetryModern =
            allowModernRetry &&
            msg.includes('invalid connect params') &&
            (msg.includes("unexpected property 'nonce'") || msg.includes('/client/id'));
          if (shouldRetryModern) {
            sendConnectFrame({
              minProtocol: 3,
              maxProtocol: 3,
              client: { id: 'homelab-dashboard', version: '1.0.0', platform: 'web', mode: 'webchat' },
              role: 'operator',
              scopes: ['operator.admin'],
              auth: OPENCLAW_TOKEN ? { token: OPENCLAW_TOKEN } : undefined,
              ...(nonce ? { nonce } : {}),
            }, false);
            return;
          }
          setState((prev) => ({ ...prev, error: msg, connecting: false }));
        },
      });
    };

    sendConnectFrame({
      minProtocol: 3,
      maxProtocol: 3,
      client: { id: 'cli', version: '1.0.0', platform: 'cli', mode: 'cli' },
      role: 'operator',
      scopes: ['operator.admin'],
      auth: OPENCLAW_TOKEN ? { token: OPENCLAW_TOKEN } : undefined,
      // nonce intentionally omitted on first attempt for compatibility with strict gateway schemas
    }, true);
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string) as Record<string, unknown>;

      if (data.type === 'res') {
        const res = data as unknown as RpcResponse;
        const pending = pendingRequests.current.get(res.id);
        if (pending) {
          pendingRequests.current.delete(res.id);
          if (res.ok) {
            pending.resolve(res.payload);
          } else {
            pending.reject(new Error(res.error?.message || 'Request failed'));
          }
        }
        return;
      }

      if (data.type === 'event') {
        const evt = data as { event?: string; payload?: unknown };
        if (evt.event === 'connect.challenge') {
          const nonce = (evt.payload as { nonce?: string } | undefined)?.nonce ?? null;
          if (wsRef.current) sendConnect(wsRef.current, nonce);
          return;
        }
        switch (evt.event) {
          case 'agent.stream':
          case 'chat.stream':
            setState((prev) => ({
              ...prev,
              chatHistory: [...prev.chatHistory, evt.payload as ChatMessage],
            }));
            break;
        }
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  }, [sendConnect]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState((prev) => ({ ...prev, connecting: true, error: null }));

    try {
      const ws = new WebSocket(OPENCLAW_WS_URL);

      // Do NOT send connect on open — wait for connect.challenge event with nonce
      ws.onopen = () => {}; // sendConnect triggered by connect.challenge event

      ws.onclose = (event) => {
        setState((prev) => ({ ...prev, connected: false, connecting: false }));
        console.log('OpenClaw WebSocket closed:', event.code, event.reason);

        // Auto-reconnect after 5 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      ws.onerror = (error) => {
        setState((prev) => ({ ...prev, error: 'WebSocket connection error', connecting: false }));
        console.error('OpenClaw WebSocket error:', error);
      };

      ws.onmessage = handleMessage;

      wsRef.current = ws;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to connect',
        connecting: false,
      }));
    }
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState((prev) => ({ ...prev, connected: false, connecting: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Actions
  const actions: OpenClawActions = {
    connect,
    disconnect,

    chatSend: async (message: string, sessionKey?: string) => {
      const { agentId } = connectionOptions.current;
      await sendRpc('chat.send', { message, sessionKey, agentId });
    },
    chatHistory: async (sessionKey?: string) => {
      const { agentId } = connectionOptions.current;
      const result = await sendRpc<{ messages: ChatMessage[] }>('chat.history', { sessionKey, agentId });
      return result?.messages || [];
    },
    chatAbort: async (sessionKey?: string) => {
      const { agentId } = connectionOptions.current;
      await sendRpc('chat.abort', { sessionKey, agentId });
    },

    sessionsList: async () => {
      const result = await sendRpc<{ sessions: Session[] }>('sessions.list', {});
      const sessions = result?.sessions || [];
      setState((prev) => ({ ...prev, sessions }));
      return sessions;
    },
    sessionsPatch: async (key: string, patch: Record<string, unknown>) => {
      await sendRpc('sessions.patch', { key, ...patch });
    },
    sessionsDelete: async (key: string) => {
      await sendRpc('sessions.delete', { key, deleteTranscript: true });
    },

    skillsStatus: async (agentId?: string) => {
      const result = await sendRpc<{ skills: Skill[] }>('skills.status', { agentId });
      const skills = result?.skills || [];
      setState((prev) => ({ ...prev, skills }));
      return skills;
    },
    skillsInstall: async (url: string) => {
      await sendRpc('skills.install', { url });
    },
    skillsUpdate: async (name: string, updates: Record<string, unknown>) => {
      await sendRpc('skills.update', { name, ...updates });
    },

    logsTail: async (cursor?: number, limit?: number) => {
      return sendRpc<{ lines: string[]; cursor: number }>('logs.tail', { cursor, limit: limit ?? 200 });
    },

    configGet: async () => {
      const result = await sendRpc<Record<string, unknown>>('config.get', {});
      setState((prev) => ({ ...prev, config: result }));
      return result;
    },
    configSet: async (path: string, value: unknown) => {
      await sendRpc('config.set', { path, value });
    },
    configApply: async () => {
      await sendRpc('config.apply', {});
    },

    channelsStatus: async () => {
      const result = await sendRpc<{ channels: Channel[] }>('channels.status', {});
      const channels = result?.channels || [];
      setState((prev) => ({ ...prev, channels }));
      return channels;
    },

    status: async () => sendRpc<Record<string, unknown>>('status', {}),
    health: async () => sendRpc<Record<string, unknown>>('health', {}),
    modelsList: async () => {
      const result = await sendRpc<{ models: string[] }>('models.list', {});
      return result?.models || [];
    },
  };

  return [state, actions];
}

export default useOpenClawWebSocket;
