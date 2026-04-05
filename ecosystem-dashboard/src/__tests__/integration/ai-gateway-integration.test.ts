/**
 * Integration Tests for AI Gateway Backend Integration
 * Tests end-to-end functionality with real WebSocket and API calls
 */

import { renderHook, act } from '@testing-library/react';
import { useAIGatewayBackend } from '../../lib/ai-gateway-backend-client';

// Mock WebSocket for integration testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  private listeners: { [key: string]: ((event: any) => void)[] } = {};

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.dispatchEvent('open', {});
    }, 10);
  }

  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(l => l !== listener);
    }
  }

  send(data: string) {
    // Simulate echo for testing
    setTimeout(() => {
      this.dispatchEvent('message', { data });
    }, 10);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.dispatchEvent('close', {});
  }

  private dispatchEvent(type: string, event: any) {
    if (this.listeners[type]) {
      this.listeners[type].forEach(listener => listener(event));
    }
    
    // Also call direct handlers
    if (type === 'open' && this.onopen) this.onopen(event);
    if (type === 'message' && this.onmessage) this.onmessage(event);
    if (type === 'error' && this.onerror) this.onerror(event);
    if (type === 'close' && this.onclose) this.onclose(event);
  }

  // Simulate receiving a message from server
  simulateMessage(data: any) {
    this.dispatchEvent('message', { data: JSON.stringify(data) });
  }
}

// Replace global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('AI Gateway Backend Integration', () => {
  let mockFetch: jest.Mock;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    // Mock successful API responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Integration Flow', () => {
    it('should establish connection and load initial data', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          name: 'Test Provider',
          type: 'ollama',
          enabled: true,
          endpoint: 'http://localhost:11434',
          models: ['llama3.1:8b'],
          capabilities: ['chat_completion']
        }
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProviders)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ version: '1.0.0' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ timeout: 30000 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'healthy' })
        });

      const { result, waitForNextUpdate } = renderHook(() => useAIGatewayBackend());

      // Wait for initial data load
      await waitForNextUpdate();

      expect(result.current.providers).toEqual(mockProviders);
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle real-time provider updates via WebSocket', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAIGatewayBackend());

      // Wait for initial connection
      await waitForNextUpdate();

      // Simulate WebSocket message for provider update
      const wsInstance = (WebSocket as any).mock.instances[0] as MockWebSocket;
      
      act(() => {
        wsInstance.simulateMessage({
          type: 'provider_updated',
          data: {
            id: 'provider-1',
            name: 'Updated Provider',
            enabled: false
          },
          timestamp: new Date().toISOString()
        });
      });

      // Should trigger a refresh of providers
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8404/ai-inferencing/api/v1/providers'
      );
    });

    it('should handle WebSocket reconnection on connection loss', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAIGatewayBackend());

      await waitForNextUpdate();

      const wsInstance = (WebSocket as any).mock.instances[0] as MockWebSocket;
      
      // Simulate connection loss
      act(() => {
        wsInstance.close();
      });

      // Should attempt reconnection
      await waitForNextUpdate();

      expect(WebSocket).toHaveBeenCalledTimes(2);
    });
  });

  describe('Provider CRUD Integration', () => {
    it('should create provider and update state', async () => {
      const newProvider = {
        name: 'New Provider',
        type: 'openai' as const,
        enabled: true,
        priority: 10,
        endpoint: 'https://api.openai.com/v1',
        models: ['gpt-4'],
        capabilities: ['chat_completion']
      };

      const createdProvider = {
        ...newProvider,
        id: 'new-provider-id',
        createdAt: '2025-01-01T12:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createdProvider)
      });

      const { result, waitForNextUpdate } = renderHook(() => useAIGatewayBackend());

      await waitForNextUpdate();

      await act(async () => {
        const created = await result.current.createProvider(newProvider);
        expect(created).toEqual(createdProvider);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8404/ai-inferencing/api/v1/providers',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newProvider)
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const { result, waitForNextUpdate } = renderHook(() => useAIGatewayBackend());

      await waitForNextUpdate();

      await expect(
        result.current.createProvider({
          name: 'Test',
          type: 'ollama',
          enabled: true,
          priority: 10,
          endpoint: 'http://localhost:11434',
          models: [],
          capabilities: []
        })
      ).rejects.toThrow('API Error');
    });
  });

  describe('Configuration Management Integration', () => {
    it('should update global configuration', async () => {
      const config = {
        aiGateway: {
          timeout: 45000,
          maxRetries: 5,
          enableFallback: true
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(config)
      });

      const { result, waitForNextUpdate } = renderHook(() => useAIGatewayBackend());

      await waitForNextUpdate();

      await act(async () => {
        await result.current.updateGlobalConfig(config);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8404/ai-inferencing/api/v1/config/global',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(config)
        })
      );
    });
  });

  describe('Health Monitoring Integration', () => {
    it('should check provider health and update state', async () => {
      const healthData = {
        status: 'healthy',
        responseTime: 200,
        lastCheck: new Date().toISOString()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(healthData)
      });

      const { result, waitForNextUpdate } = renderHook(() => useAIGatewayBackend());

      await waitForNextUpdate();

      await act(async () => {
        const health = await result.current.checkProviderHealth('provider-1');
        expect(health).toEqual(healthData);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8404/ai-inferencing/api/v1/providers/provider-1/health',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network failures gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));

      const { result, waitForNextUpdate } = renderHook(() => useAIGatewayBackend());

      await waitForNextUpdate();

      expect(result.current.error).toBe('Network failure');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.providers).toEqual([]);
    });

    it('should recover from errors on retry', async () => {
      const mockProviders = [{ id: '1', name: 'Test' }];

      mockFetch
        .mockRejectedValueOnce(new Error('Network failure'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProviders)
        });

      const { result, waitForNextUpdate } = renderHook(() => useAIGatewayBackend());

      await waitForNextUpdate();

      // Should have error initially
      expect(result.current.error).toBe('Network failure');

      // Retry should succeed
      await act(async () => {
        await result.current.refreshData();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.providers).toEqual(mockProviders);
    });
  });
});
