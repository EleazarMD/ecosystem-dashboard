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
  if (!page?.properties?.title) {
    return 'Untitled';
  }

  // Handle MCP format: properties.title is a string
  if (typeof page.properties.title === 'string') {
    return page.properties.title || 'Untitled';
  }

  // Handle Notion format: properties.title is a rich text array
  if (Array.isArray(page.properties.title) && page.properties.title.length > 0) {
    const firstSegment = page.properties.title[0];
    return firstSegment?.text?.content || 'Untitled';
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
  if (!page?.properties?.icon) {
    return '📄';
  }

  // Handle MCP format: properties.icon is a string
  if (typeof page.properties.icon === 'string') {
    return page.properties.icon || '📄';
  }

  // Handle Notion format: properties.icon is an object with emoji property
  if (typeof page.properties.icon === 'object' && page.properties.icon.emoji) {
    return page.properties.icon.emoji;
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
