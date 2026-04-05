/**
 * Unit Tests for AI Gateway Backend Client
 * Tests the native integration without any middleware or bridges
 */

import { renderHook, act } from '@testing-library/react';
import { useAIGatewayBackend } from '../ai-gateway-backend-client';

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: WebSocket.OPEN
}));

// Mock fetch
global.fetch = jest.fn();

describe('AI Gateway Backend Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ providers: [], config: {} })
    });
  });

  describe('useAIGatewayBackend Hook', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAIGatewayBackend());
      
      expect(result.current.providers).toEqual([]);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should establish WebSocket connection on mount', () => {
      renderHook(() => useAIGatewayBackend());
      
      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8404/ws');
    });

    it('should fetch providers on initialization', async () => {
      const mockProviders = [
        {
          id: 'test-provider',
          name: 'Test Provider',
          type: 'ollama',
          enabled: true,
          endpoint: 'http://localhost:11434',
          models: ['llama3.1:8b'],
          capabilities: ['chat_completion']
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProviders)
      });

      const { result, waitForNextUpdate } = renderHook(() => useAIGatewayBackend());
      
      await waitForNextUpdate();
      
      expect(fetch).toHaveBeenCalledWith('http://localhost:8404/ai-inferencing/api/v1/providers');
      expect(result.current.providers).toEqual(mockProviders);
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result, waitForNextUpdate } = renderHook(() => useAIGatewayBackend());
      
      await waitForNextUpdate();
      
      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Provider CRUD Operations', () => {
    it('should create a new provider', async () => {
      const newProvider = {
        name: 'New Provider',
        type: 'openai' as const,
        enabled: true,
        priority: 10,
        endpoint: 'https://api.openai.com/v1',
        models: ['gpt-4'],
        capabilities: ['chat_completion']
      };

      const createdProvider = { ...newProvider, id: 'new-id', createdAt: '2025-01-01', updatedAt: '2025-01-01' };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createdProvider)
      });

      const { result } = renderHook(() => useAIGatewayBackend());
      
      await act(async () => {
        await result.current.createProvider(newProvider);
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8404/ai-inferencing/api/v1/providers',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProvider)
        })
      );
    });

    it('should update an existing provider', async () => {
      const updates = { enabled: false, priority: 5 };
      const updatedProvider = { id: 'test-id', ...updates };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedProvider)
      });

      const { result } = renderHook(() => useAIGatewayBackend());
      
      await act(async () => {
        await result.current.updateProvider('test-id', updates);
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8404/ai-inferencing/api/v1/providers/test-id',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
      );
    });

    it('should delete a provider', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const { result } = renderHook(() => useAIGatewayBackend());
      
      await act(async () => {
        await result.current.deleteProvider('test-id');
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8404/ai-inferencing/api/v1/providers/test-id',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should check provider health', async () => {
      const healthData = { status: 'healthy', responseTime: 150 };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(healthData)
      });

      const { result } = renderHook(() => useAIGatewayBackend());
      
      await act(async () => {
        await result.current.checkProviderHealth('test-id');
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8404/ai-inferencing/api/v1/providers/test-id/health',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('WebSocket Integration', () => {
    it('should handle WebSocket messages', () => {
      const mockWs = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN
      };

      (WebSocket as jest.Mock).mockImplementation(() => mockWs);

      renderHook(() => useAIGatewayBackend());

      expect(mockWs.addEventListener).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockWs.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWs.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should reconnect on WebSocket close', () => {
      const mockWs = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.CLOSED
      };

      (WebSocket as jest.Mock).mockImplementation(() => mockWs);

      renderHook(() => useAIGatewayBackend());

      // Simulate close event
      const closeHandler = mockWs.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )[1];

      act(() => {
        closeHandler();
      });

      // Should attempt reconnection
      expect(WebSocket).toHaveBeenCalledTimes(2);
    });
  });

  describe('Configuration Management', () => {
    it('should update global configuration', async () => {
      const config = {
        aiGateway: {
          timeout: 30000,
          maxRetries: 3,
          enableFallback: true
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(config)
      });

      const { result } = renderHook(() => useAIGatewayBackend());
      
      await act(async () => {
        await result.current.updateGlobalConfig(config);
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8404/ai-inferencing/api/v1/config/global',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        })
      );
    });
  });
});
