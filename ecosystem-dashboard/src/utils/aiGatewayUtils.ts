/**
 * AI Gateway Utilities
 * Helper functions for the AI Gateway component
 */

import { FiActivity, FiCpu, FiDatabase, FiPackage, FiUsers, FiZap } from 'react-icons/fi';
import { ModelProvider, ModelType, CapabilityType } from '../types/aiGateway';

/**
 * Get the header background color for a model based on its provider
 */
export const getModelHeaderColor = (provider: string, isDark: boolean): string => {
  const providers: Record<string, string> = {
    [ModelProvider.OPENAI.toLowerCase()]: isDark ? 'rgba(16, 163, 127, 0.2)' : 'rgba(16, 163, 127, 0.1)',
    [ModelProvider.ANTHROPIC.toLowerCase()]: isDark ? 'rgba(255, 90, 90, 0.2)' : 'rgba(255, 90, 90, 0.1)',
    [ModelProvider.OLLAMA.toLowerCase()]: isDark ? 'rgba(90, 90, 255, 0.2)' : 'rgba(90, 90, 255, 0.1)',
    [ModelProvider.HUGGINGFACE.toLowerCase()]: isDark ? 'rgba(255, 175, 0, 0.2)' : 'rgba(255, 175, 0, 0.1)',
    [ModelProvider.COHERE.toLowerCase()]: isDark ? 'rgba(160, 160, 255, 0.2)' : 'rgba(160, 160, 255, 0.1)',
  };
  
  return providers[provider.toLowerCase()] || (isDark ? 'rgba(100, 100, 100, 0.2)' : 'rgba(100, 100, 100, 0.1)');
};

/**
 * Get an icon component for a model based on its provider
 */
export const getModelIcon = (provider: string): any => {
  const icons: Record<string, any> = {
    [ModelProvider.OPENAI.toLowerCase()]: FiZap,
    [ModelProvider.ANTHROPIC.toLowerCase()]: FiUsers,
    [ModelProvider.OLLAMA.toLowerCase()]: FiPackage,
    [ModelProvider.HUGGINGFACE.toLowerCase()]: FiDatabase,
    [ModelProvider.COHERE.toLowerCase()]: FiActivity,
  };
  
  return icons[provider.toLowerCase()] || FiCpu;
};

/**
 * Get a user-friendly description for a model type
 */
export const getModelTypeDescription = (type: string): string => {
  const descriptions: Record<string, string> = {
    [ModelType.CHAT.toLowerCase()]: 'Conversational AI Model',
    [ModelType.TEXT.toLowerCase()]: 'Text Generation Model',
    [ModelType.EMBEDDING.toLowerCase()]: 'Vector Embedding Model',
    [ModelType.IMAGE.toLowerCase()]: 'Image Generation Model',
    [ModelType.CODE.toLowerCase()]: 'Code Generation Model',
  };
  
  return descriptions[type.toLowerCase()] || 'AI Model';
};

/**
 * Get a color scheme for a capability
 */
export const getCapabilityColor = (capability: string): string => {
  const colors: Record<string, string> = {
    [CapabilityType.CHAT.toLowerCase()]: 'blue',
    [CapabilityType.TEXT_GENERATION.toLowerCase()]: 'green',
    [CapabilityType.CODE.toLowerCase()]: 'purple',
    [CapabilityType.EMBEDDING.toLowerCase()]: 'orange',
    [CapabilityType.FUNCTION_CALLING.toLowerCase()]: 'red',
    [CapabilityType.IMAGE_GENERATION.toLowerCase()]: 'pink',
  };
  
  return colors[capability.toLowerCase()] || 'gray';
};

/**
 * Format uptime from seconds to a human-readable string
 */
export const formatUptime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

/**
 * Generate mock data for development mode
 */
export const generateMockAIModels = () => [
  {
    id: 'gpt-3.5-turbo',
    provider: 'openai',
    type: 'chat',
    capabilities: ['chat', 'function-calling'],
    configured: true
  },
  {
    id: 'gpt-4',
    provider: 'openai',
    type: 'chat',
    capabilities: ['chat', 'function-calling', 'code'],
    configured: true
  },
  {
    id: 'claude-instant-1',
    provider: 'anthropic',
    type: 'chat',
    capabilities: ['chat', 'text-generation'],
    configured: true
  },
  {
    id: 'text-embedding-ada-002',
    provider: 'openai',
    type: 'embedding',
    capabilities: ['embedding'],
    configured: true
  },
  {
    id: 'llama2',
    provider: 'ollama',
    type: 'chat',
    capabilities: ['chat', 'text-generation'],
    configured: false
  },
  {
    id: 'mistral-7b',
    provider: 'huggingface',
    type: 'text',
    capabilities: ['text-generation'],
    configured: false
  }
];

/**
 * Generate mock gateway status for development mode
 */
export const generateMockGatewayStatus = () => ({
  isOnline: true,
  version: '1.2.3',
  uptime: 86400 + 3600 * 5 + 60 * 23 + 15, // 1 day, 5 hours, 23 minutes, 15 seconds
  requestRate: 42.5,
  models: 6,
  lastUpdated: new Date()
});
