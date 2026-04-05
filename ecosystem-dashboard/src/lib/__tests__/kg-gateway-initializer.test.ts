/**
 * Unit tests for Knowledge Graph Gateway Initializer
 * 
 * Tests the KG Gateway initializer's ability to detect AI Gateway availability
 * and properly initialize the KG Gateway for MCP communication.
 */

import axios from 'axios';
import { initializeKGGateway, isKGGatewayReadyWithAIGateway, isKGGatewayInitialized } from '../kg-gateway-initializer';
import logger from '../logger';

// Mock dependencies
jest.mock('axios');
jest.mock('../logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Knowledge Graph Gateway Initializer', () => {
  // Save original window.__AI_GATEWAY_AVAILABLE__ and environment variables
  const originalWindowValue = window.__AI_GATEWAY_AVAILABLE__;
  const originalEnv = process.env;
  
  // Setup before each test
  beforeEach(() => {
    // Reset mocks and globals
    jest.clearAllMocks();
    window.__AI_GATEWAY_AVAILABLE__ = undefined;
    
    // Mock environment variables
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_AI_GATEWAY_ENABLED: 'true',
      NEXT_PUBLIC_AI_GATEWAY_HOST: 'test-gateway',
      NEXT_PUBLIC_AI_GATEWAY_PORT: '9000',
      NEXT_PUBLIC_AI_GATEWAY_SECURE: 'false'
    };
    
    // Mock axios to return success by default
    (axios.get as jest.Mock).mockResolvedValue({ status: 200 });
  });
  
  // Cleanup after each test
  afterEach(() => {
    window.__AI_GATEWAY_AVAILABLE__ = originalWindowValue;
    process.env = originalEnv;
  });
  
  // Tests for initializeKGGateway
  describe('initializeKGGateway', () => {
    it('should initialize successfully when AI Gateway is available', async () => {
      // Arrange
      (axios.get as jest.Mock).mockResolvedValueOnce({ status: 200 });
      
      // Act
      await initializeKGGateway();
      
      // Assert
      expect(window.__AI_GATEWAY_AVAILABLE__).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/AI Gateway available/),
        expect.any(Object)
      );
    });
    
    it('should handle unavailable AI Gateway', async () => {
      // Arrange
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));
      
      // Act
      await initializeKGGateway();
      
      // Assert
      expect(window.__AI_GATEWAY_AVAILABLE__).toBe(false);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/AI Gateway not available/),
        expect.any(Object)
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/AI Gateway is not available/),
        expect.any(Object)
      );
    });
    
    it('should handle initialization errors gracefully', async () => {
      // Arrange
      (axios.get as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });
      
      // Act
      await initializeKGGateway();
      
      // Assert
      expect(window.__AI_GATEWAY_AVAILABLE__).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringMatching(/Error initializing Knowledge Graph Gateway/),
        expect.any(Object)
      );
    });
    
    it('should only initialize once even if called multiple times', async () => {
      // Act
      await initializeKGGateway();
      const firstCallCount = (logger.info as jest.Mock).mock.calls.length;
      
      // Call again
      await initializeKGGateway();
      const secondCallCount = (logger.info as jest.Mock).mock.calls.length;
      
      // Assert
      expect(secondCallCount).toBe(firstCallCount); // No additional logging calls
    });
  });
  
  // Tests for isKGGatewayReadyWithAIGateway
  describe('isKGGatewayReadyWithAIGateway', () => {
    it('should return false when not initialized', () => {
      // Act
      const result = isKGGatewayReadyWithAIGateway();
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should return true when initialized and AI Gateway available', async () => {
      // Arrange
      window.__AI_GATEWAY_AVAILABLE__ = true;
      await initializeKGGateway();
      
      // Act
      const result = isKGGatewayReadyWithAIGateway();
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should return false when initialized but AI Gateway unavailable', async () => {
      // Arrange
      window.__AI_GATEWAY_AVAILABLE__ = false;
      await initializeKGGateway();
      
      // Act
      const result = isKGGatewayReadyWithAIGateway();
      
      // Assert
      expect(result).toBe(false);
    });
  });
  
  // Tests for isKGGatewayInitialized
  describe('isKGGatewayInitialized', () => {
    it('should return false before initialization', () => {
      // Act
      const result = isKGGatewayInitialized();
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should return true after initialization', async () => {
      // Arrange
      await initializeKGGateway();
      
      // Act
      const result = isKGGatewayInitialized();
      
      // Assert
      expect(result).toBe(true);
    });
  });
});
