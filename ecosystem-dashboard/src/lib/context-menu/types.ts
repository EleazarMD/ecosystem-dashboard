/**
 * Context Menu System Types
 * 
 * Modular context menu engine for use across dashboard platforms.
 * Supports grouped actions, keyboard shortcuts, and nested menus.
 */

export type MenuItemVariant = 'default' | 'danger' | 'success' | 'warning';

export interface ContextMenuItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: React.ElementType;
  shortcut?: string;
  variant?: MenuItemVariant;
  disabled?: boolean;
  hidden?: boolean;
  onClick: () => void | Promise<void>;
}

export interface ContextMenuGroup {
  id: string;
  label?: string;
  items: ContextMenuItem[];
}

export interface ContextMenuConfig {
  groups: ContextMenuGroup[];
  header?: {
    title: string;
    subtitle?: string;
  };
  width?: number;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuState {
  isOpen: boolean;
  position: ContextMenuPosition;
  config: ContextMenuConfig | null;
}

// Platform-specific context types
export type PlatformContext = 'email' | 'workspace' | 'podcast-studio' | 'image-studio' | 'research-lab';

export interface ToolMenuAction<T = any> {
  id: string;
  label: string;
  sublabel?: string;
  icon?: React.ElementType;
  shortcut?: string;
  variant?: MenuItemVariant;
  group: string;
  platforms: PlatformContext[];
  isVisible?: (context: T) => boolean;
  isDisabled?: (context: T) => boolean;
  execute: (context: T) => void | Promise<void>;
}

export interface ToolMenuRegistry<T = any> {
  actions: ToolMenuAction<T>[];
  groups: { id: string; label?: string; order: number }[];
}
