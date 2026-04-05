/**
 * Agent Command Client for AHIS Integration
 * 
 * This module provides standardized communication with the AHIS server
 * for agent command execution following AI Homelab Ecosystem architecture standards.
 */

import logger from '@/lib/logger';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent Command Client Configuration
 */
export interface AgentCommandConfig {
  timeout?: number;
  host?: string;
  port?: string;
  secure?: boolean;
}

/**
 * Agent Command Response
 */
export interface AgentCommandResponse<T = any> {
  answer: string;
  confidence: number;
  reasoning?: string;
  sources?: Array<any>;
  data?: T;
}

/**
 * Agent Command Error
 */
export class AgentCommandError extends Error {
  code: string;
  status: number;
  
  constructor(message: string, code: string = 'COMMAND_ERROR', status: number = 500) {
    super(message);
    this.name = 'AgentCommandError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Client for executing agent commands against the AHIS server
 */
export class AgentCommandClient {
  private timeout: number;
  private host: string;
  private port: string;
  private secure: boolean;
  
  /**
   * Create a new AgentCommandClient
   */
  constructor(config: AgentCommandConfig = {}) {
    this.timeout = config.timeout || 30000;
    this.host = config.host || process.env.NEXT_PUBLIC_AHIS_SERVER_HOST || 'localhost';
    this.port = config.port || process.env.NEXT_PUBLIC_AHIS_SERVER_PORT || '8888';
    this.secure = config.secure || process.env.NEXT_PUBLIC_AHIS_SERVER_SECURE === 'true' || false;
  }
  
  /**
   * Get the base URL for the AHIS server
   */
  private getBaseUrl(): string {
    const protocol = this.secure ? 'https' : 'http';
    return `${protocol}://${this.host}:${this.port}`;
  }
  
  /**
   * Execute a Knowledge Graph query
   */
  async executeKgQuery(query: string, options: { output_format?: string } = {}): Promise<AgentCommandResponse> {
    try {
      logger.info(`[AgentCommandClient] Executing KG Query: ${query}`);
      
      // In a browser environment, use the API endpoint
      if (typeof window !== 'undefined') {
        const response = await axios.post('/api/ahis/agent-command', {
          command: 'kg_query',
          params: {
            query,
            output_format: options.output_format || 'inline'
          }
        });
        
        if (response.data?.error) {
          throw new AgentCommandError(response.data.error.message, response.data.error.code);
        }
        
        return response.data.result;
      }
      
      // In a server environment with AHIS client available
      if (typeof global !== 'undefined' && global.__ahisClient) {
        const client = global.__ahisClient;
        
        // Generate unique ID for this request
        const requestId = uuidv4();
        
        // Create a promise that will be resolved when we get a response
        return new Promise((resolve, reject) => {
          // Set up timeout to reject the promise if it takes too long
          const timeout = setTimeout(() => {
            reject(new AgentCommandError('KG query timed out', 'TIMEOUT', 408));
            client.off('ahis:response', responseHandler);
          }, this.timeout);
          
          // Set up response handler
          const responseHandler = (response: any) => {
            if (response && response.id === requestId) {
              clearTimeout(timeout);
              client.off('ahis:response', responseHandler);
              
              if (response.error) {
                reject(new AgentCommandError(response.error.message, response.error.code));
              } else {
                resolve(response.result || {
                  answer: "No response received from Knowledge Graph",
                  confidence: 0,
                  reasoning: "AHIS server returned empty result"
                });
              }
            }
          };
          
          // Listen for the response with this ID
          client.on('ahis:response', responseHandler);
          
          // Send the command
          try {
            client.emit('ahis:command', {
              jsonrpc: '2.0',
              method: 'agent:kg_query',
              params: {
                query,
                output_format: options.output_format || 'inline'
              },
              id: requestId
            });
          } catch (err: any) {
            clearTimeout(timeout);
            client.off('ahis:response', responseHandler);
            reject(new AgentCommandError(err.message, 'EMISSION_ERROR'));
          }
        });
      }
      
      // No AHIS client available
      throw new AgentCommandError('AHIS client not initialized', 'CLIENT_ERROR');
    } catch (error: any) {
      logger.error(`[AgentCommandClient] KG Query failed: ${error.message}`);
      
      // Format standardized error response
      throw new AgentCommandError(
        error.message || 'Failed to execute KG query',
        error.code || 'KG_QUERY_ERROR',
        error.status || 500
      );
    }
  }
  
  /**
   * Apply reasoning over the Knowledge Graph
   */
  async executeKgReason(question: string, context?: string): Promise<AgentCommandResponse> {
    try {
      logger.info(`[AgentCommandClient] Executing KG Reasoning: ${question}`);
      
      // In a browser environment, use the API endpoint
      if (typeof window !== 'undefined') {
        const response = await axios.post('/api/ahis/agent-command', {
          command: 'kg_reason',
          params: {
            question,
            context
          }
        });
        
        if (response.data?.error) {
          throw new AgentCommandError(response.data.error.message, response.data.error.code);
        }
        
        return response.data.result;
      }
      
      // In a server environment with AHIS client available
      if (typeof global !== 'undefined' && global.__ahisClient) {
        const client = global.__ahisClient;
        
        // Generate unique ID for this request
        const requestId = uuidv4();
        
        // Create a promise that will be resolved when we get a response
        return new Promise((resolve, reject) => {
          // Set up timeout to reject the promise if it takes too long
          const timeout = setTimeout(() => {
            reject(new AgentCommandError('KG reasoning timed out', 'TIMEOUT', 408));
            client.off('ahis:response', responseHandler);
          }, this.timeout);
          
          // Set up response handler
          const responseHandler = (response: any) => {
            if (response && response.id === requestId) {
              clearTimeout(timeout);
              client.off('ahis:response', responseHandler);
              
              if (response.error) {
                reject(new AgentCommandError(response.error.message, response.error.code));
              } else {
                resolve(response.result || {
                  answer: "No response received from Knowledge Graph reasoning",
                  confidence: 0,
                  reasoning: "AHIS server returned empty result"
                });
              }
            }
          };
          
          // Listen for the response with this ID
          client.on('ahis:response', responseHandler);
          
          // Send the command
          try {
            client.emit('ahis:command', {
              jsonrpc: '2.0',
              method: 'agent:kg_reason',
              params: {
                question,
                context
              },
              id: requestId
            });
          } catch (err: any) {
            clearTimeout(timeout);
            client.off('ahis:response', responseHandler);
            reject(new AgentCommandError(err.message, 'EMISSION_ERROR'));
          }
        });
      }
      
      // No AHIS client available
      throw new AgentCommandError('AHIS client not initialized', 'CLIENT_ERROR');
    } catch (error: any) {
      logger.error(`[AgentCommandClient] KG Reasoning failed: ${error.message}`);
      
      // Format standardized error response
      throw new AgentCommandError(
        error.message || 'Failed to execute KG reasoning',
        error.code || 'KG_REASON_ERROR',
        error.status || 500
      );
    }
  }
}

/**
 * Create a singleton instance of the AgentCommandClient
 */
export const agentCommandClient = new AgentCommandClient();

export default agentCommandClient;
