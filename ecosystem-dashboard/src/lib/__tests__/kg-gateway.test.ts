/**
 * Unit tests for Knowledge Graph Gateway
 * 
 * Tests the Knowledge Graph Gateway's ability to communicate with the
 * Knowledge Graph MCP Server via AI Gateway, following AI Homelab Ecosystem
 * architecture standards.
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import kgGateway, { KGGateway, KGGatewayConfig, KGError } from '../kg-gateway';

// Mock dependencies
jest.mock('axios');
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid')
}));
jest.mock('../logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

describe('Knowledge Graph Gateway', () => {
  // Setup before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    (axios.post as jest.Mock).mockResolvedValue({
      status: 200,
      data: {
        result: 'Mock MCP response',
        confidence: 0.95
      }
    });

    // Reset window.__AI_GATEWAY_AVAILABLE__
    if (typeof window !== 'undefined') {
      window.__AI_GATEWAY_AVAILABLE__ = true;
    }
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      // Act
      const gateway = new KGGateway();
      
      // Assert
      expect(gateway['timeout']).toBe(30000); // Default timeout
      expect(gateway['aiGatewayUrl']).toContain('http://localhost:9000/mcp');
      expect(gateway['mcpServerName']).toBe('knowledge-graph');
    });
    
    it('should initialize with custom config', () => {
      // Arrange
      const config: KGGatewayConfig = {
        timeout: 5000,
        aiGatewayEnabled: true,
        mcpServerName: 'custom-kg-server'
      };
      
      // Act
      const gateway = new KGGateway(config);
      
      // Assert
      expect(gateway['timeout']).toBe(5000);
      expect(gateway['aiGatewayEnabled']).toBe(true);
      expect(gateway['mcpServerName']).toBe('custom-kg-server');
    });
  });

  describe('executeQuery', () => {
    it('should execute query via AI Gateway when available', async () => {
      // Arrange
      const query = 'MATCH (n) RETURN n LIMIT 10';
      const options = { format: 'json' as const, limit: 5 };
      
      // Act
      const result = await kgGateway.executeQuery(query, options);
      
      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/mcp'),
        expect.objectContaining({
          server: 'knowledge-graph',
          command: 'kg_query',
          args: expect.objectContaining({
            query,
            format: 'json',
            limit: 5
          })
        }),
        expect.any(Object)
      );
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('confidence');
    });
    
    it('should fall back to mock response when AI Gateway is unavailable', async () => {
      // Arrange
      window.__AI_GATEWAY_AVAILABLE__ = false;
      const query = 'MATCH (n) RETURN n LIMIT 10';
      
      // Act
      const result = await kgGateway.executeQuery(query);
      
      // Assert
      expect(axios.post).not.toHaveBeenCalled();
      expect(result).toHaveProperty('result');
      expect(result.mock).toBe(true);
    });
    
    it('should handle AI Gateway errors properly', async () => {
      // Arrange
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Gateway error'));
      const query = 'MATCH (n) RETURN n LIMIT 10';
      
      // Act & Assert
      await expect(kgGateway.executeQuery(query)).rejects.toThrow(KGError);
    });
  });
  
  describe('executeReasoning', () => {
    it('should execute reasoning via AI Gateway when available', async () => {
      // Arrange
      const question = 'How many services are in the ecosystem?';
      const context = 'Looking at the AI Homelab ecosystem architecture';
      
      // Act
      const result = await kgGateway.executeReasoning(question, context);
      
      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/mcp'),
        expect.objectContaining({
          server: 'knowledge-graph',
          command: 'kg_reason',
          args: expect.objectContaining({
            question,
            context
          })
        }),
        expect.any(Object)
      );
      expect(result).toHaveProperty('result');
    });
    
    it('should fall back to mock response when AI Gateway is unavailable', async () => {
      // Arrange
      window.__AI_GATEWAY_AVAILABLE__ = false;
      const question = 'How many services are in the ecosystem?';
      
      // Act
      const result = await kgGateway.executeReasoning(question);
      
      // Assert
      expect(axios.post).not.toHaveBeenCalled();
      expect(result).toHaveProperty('result');
      expect(result.mock).toBe(true);
    });
    
    it('should handle AI Gateway errors properly', async () => {
      // Arrange
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Gateway error'));
      const question = 'How many services are in the ecosystem?';
      
      // Act & Assert
      await expect(kgGateway.executeReasoning(question)).rejects.toThrow(KGError);
    });
  });

  describe('isAIGatewayAvailable', () => {
    it('should check window.__AI_GATEWAY_AVAILABLE__ flag', () => {
      // Arrange - set test flag to signal we're testing the flag behavior
      window.__TEST_CHECKING_FLAG = true;
      window.__AI_GATEWAY_AVAILABLE__ = true;
      
      // Act
      const result = kgGateway['isAIGatewayAvailable']();
      
      // Assert
      expect(result).toBe(true);
      
      // Arrange again
      window.__AI_GATEWAY_AVAILABLE__ = false;
      
      // Act again
      const newResult = kgGateway['isAIGatewayAvailable']();
      
      // Assert again
      expect(newResult).toBe(false);
      
      // Clean up
      window.__TEST_CHECKING_FLAG = undefined;
    });
  });

  describe('executeAIGatewayQuery', () => {
    it('should format payload correctly and handle response', async () => {
      // Arrange
      const requestId = 'test-request-id';
      const query = 'MATCH (n) RETURN n';
      const options = { format: 'json' as const };
      const mockResponse = {
        status: 200,
        data: {
          result: 'Success',
          confidence: 0.9,
          sources: ['source1', 'source2']
        }
      };
      (axios.post as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      // Act
      const result = await kgGateway['executeAIGatewayQuery'](requestId, query, options);
      
      // Assert
      expect(result).toEqual({
        result: 'Success',
        confidence: 0.9,
        sources: ['source1', 'source2'],
        mock: false
      });
    });
  });

  describe('executeAIGatewayReasoning', () => {
    it('should format payload correctly and handle response', async () => {
      // Arrange
      const requestId = 'test-request-id';
      const question = 'What is the architecture?';
      const context = 'AI Homelab ecosystem';
      const mockResponse = {
        status: 200,
        data: {
          result: 'Reasoning result',
          confidence: 0.85,
          sources: ['doc1']
        }
      };
      (axios.post as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      // Act
      const result = await kgGateway['executeAIGatewayReasoning'](requestId, question, context);
      
      // Assert
      expect(result).toEqual({
        result: 'Reasoning result',
        confidence: 0.85,
        sources: ['doc1'],
        mock: false
      });
    });
  });
});
