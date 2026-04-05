/**
 * useOpenClawChat
 * Manages streaming SSE chat with the OpenClaw gateway via /api/openclaw/chat proxy.
 * Supports delta streaming (text events), tool events, sources, and session continuity.
 */
import { useCallback, useRef, useState } from 'react';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  sessionId?: string;
  isStreaming?: boolean;
  toolActivity?: string[];
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  error?: string;
}

export interface UseOpenClawChatOptions {
  agentId?: string;
  sessionId?: string;
  userId?: string;
}

export interface UseOpenClawChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentSessionId: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  setSessionId: (id: string) => void;
  loadHistory: (sessionKey: string) => Promise<void>;
  abortStream: () => void;
  error: string | null;
}

let msgCounter = 0;
function newId() {
  return `msg_${Date.now()}_${++msgCounter}`;
}

export function useOpenClawChat(opts: UseOpenClawChatOptions = {}): UseOpenClawChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(opts.sessionId ?? null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const agentIdRef = useRef(opts.agentId);
  agentIdRef.current = opts.agentId;

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    setError(null);

    const userMsg: ChatMessage = {
      id: newId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
      sessionId: currentSessionId ?? undefined,
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = newId();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      toolActivity: [],
      sources: [],
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setIsStreaming(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/openclaw/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          sessionId: currentSessionId ?? undefined,
          agentId: agentIdRef.current ?? undefined,
          userId: opts.userId ?? 'dashboard-user',
          stream: true,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let sessionIdFromStream: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (!rawData) continue;

            try {
              const data = JSON.parse(rawData);

              if (currentEvent === 'text' || (!currentEvent && typeof data.text === 'string')) {
                const chunk = data.text ?? '';
                accumulated += chunk;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: accumulated, isStreaming: true } : m
                  )
                );
              } else if (currentEvent === 'tools' && data.tool) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, toolActivity: [...(m.toolActivity ?? []), data.tool] }
                      : m
                  )
                );
              } else if (currentEvent === 'sources' && Array.isArray(data)) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, sources: data } : m))
                );
              } else if (currentEvent === 'done') {
                if (data.sessionId) {
                  sessionIdFromStream = data.sessionId;
                }
              } else if (currentEvent === 'error') {
                throw new Error(data.error ?? data.message ?? 'Stream error');
              }
              // Reset event for next data line
              currentEvent = '';
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== 'Stream error') {
                // JSON parse error on SSE line — skip
              } else {
                throw parseErr;
              }
            }
          }
        }
      }

      // Finalize assistant message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: accumulated || m.content,
                isStreaming: false,
                sessionId: sessionIdFromStream ?? currentSessionId ?? undefined,
              }
            : m
        )
      );

      if (sessionIdFromStream) {
        setCurrentSessionId(sessionIdFromStream);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false, content: m.content || '*(aborted)*' } : m
          )
        );
      } else {
        const errMsg = err.message ?? 'Unknown error';
        setError(errMsg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, isStreaming: false, error: errMsg, content: m.content || '' }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, currentSessionId, opts.userId]);

  const abortStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const setSessionId = useCallback((id: string) => {
    setCurrentSessionId(id);
  }, []);

  const loadHistory = useCallback(async (sessionKey: string) => {
    try {
      const res = await fetch('/api/openclaw/gateway-rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'chat.history', params: { sessionKey, limit: 50 } }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok) return;

      const raw = data.result?.messages ?? [];
      const loaded: ChatMessage[] = raw
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .map((m: any) => {
          // content is [{type:'text', text:'...'}] or a plain string
          const content = Array.isArray(m.content)
            ? m.content.map((c: any) => c.text ?? '').join('')
            : String(m.content ?? '');
          return {
            id: newId(),
            role: m.role as ChatRole,
            content,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          };
        });

      setMessages(loaded);
      setCurrentSessionId(sessionKey);
      setError(null);
    } catch {
      // silently fail — history is non-critical
    }
  }, []);

  return {
    messages,
    isStreaming,
    currentSessionId,
    sendMessage,
    clearMessages,
    setSessionId,
    loadHistory,
    abortStream,
    error,
  };
}

export default useOpenClawChat;
