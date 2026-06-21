/**
 * Page Utilities
 * Shared utilities for working with workspace pages across all agents
 */

import { Block } from '@/lib/editor/BlockModel';

/**
 * Extract page title from a Block object
 * Handles both MCP format (string) and Notion format (rich text array)
 * 
 * @param page - The page block object
 * @returns The page title as a string, or 'Untitled' if not found
 */
export function extractPageTitle(page: Block | any): string {
  // Try Pi-workspace top-level format first
  const titleField = page?.title || page?.properties?.title;

  if (!titleField) {
    return 'Untitled';
  }

  // Handle string format
  if (typeof titleField === 'string') {
    return titleField || 'Untitled';
  }

  // Handle Notion format: rich text array
  if (Array.isArray(titleField) && titleField.length > 0) {
    const firstSegment = titleField[0];
    return firstSegment?.text?.content || firstSegment?.plainText || 'Untitled';
  }

  return 'Untitled';
}

/**
 * Extract page icon from a Block object
 * Handles both MCP format (string) and Notion format (emoji object)
 * 
 * @param page - The page block object
 * @returns The page icon as a string, or '📄' if not found
 */
export function extractPageIcon(page: Block | any): string {
  const iconField = page?.icon || page?.properties?.icon;

  if (!iconField || (typeof iconField === 'object' && Object.keys(iconField).length === 0)) {
    return '📄';
  }

  // Handle string format
  if (typeof iconField === 'string') {
    return iconField || '📄';
  }

  // Handle object format (emoji property)
  if (typeof iconField === 'object' && iconField.emoji) {
    return iconField.emoji;
  }

  return '📄';
}

/**
 * Convert MCP servers object to mcpSources array
 * Used for sending to Goose API
 * 
 * @param mcpServers - Object with server names as keys and boolean values
 * @returns Array of enabled server names
 */
export function mcpServersToSources(mcpServers?: {
  workspace?: boolean;
  notion?: boolean;
  github?: boolean;
  filesystem?: boolean;
  knowledgeGraph?: boolean;
  perplexity?: boolean;
  custom?: string[];
}): string[] {
  if (!mcpServers) {
    return ['workspace', 'memory']; // Default fallback
  }

  const sources: string[] = [];

  // Add enabled servers
  Object.entries(mcpServers).forEach(([key, value]) => {
    if (key === 'custom' && Array.isArray(value)) {
      sources.push(...value);
    } else if (value === true) {
      sources.push(key);
    }
  });

  // Ensure at least workspace and memory are included
  if (!sources.includes('workspace')) {
    sources.push('workspace');
  }
  if (!sources.includes('memory')) {
    sources.push('memory');
  }

  return sources;
}

/**
 * Get the Goose AI assistant icon
 * Centralized function to ensure consistency across all agents
 * 
 * @returns The path to the goose icon
 */
export function getGooseIcon(): string {
  return '/goose-icon.png';
}

/**
 * Get the Goose AI assistant name
 * Centralized function to ensure consistency across all agents
 * 
 * @returns The assistant name
 */
export function getGooseAssistantName(): string {
  return 'Goose';
}
