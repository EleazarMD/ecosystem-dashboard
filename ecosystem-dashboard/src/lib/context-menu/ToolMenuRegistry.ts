/**
 * Tool Menu Registry
 * 
 * Central registry for platform-specific context menu actions.
 * Actions can be registered once and filtered by platform context.
 */

import type { 
  ToolMenuAction, 
  ToolMenuRegistry as IToolMenuRegistry, 
  PlatformContext,
  ContextMenuConfig,
  ContextMenuGroup,
  ContextMenuItem,
} from './types';

class ToolMenuRegistryClass<T = any> {
  private actions: ToolMenuAction<T>[] = [];
  private groups: { id: string; label?: string; order: number }[] = [];

  registerGroup(id: string, label?: string, order: number = 0) {
    const existing = this.groups.find(g => g.id === id);
    if (!existing) {
      this.groups.push({ id, label, order });
      this.groups.sort((a, b) => a.order - b.order);
    }
    return this;
  }

  registerAction(action: ToolMenuAction<T>) {
    const existing = this.actions.find(a => a.id === action.id);
    if (!existing) {
      this.actions.push(action);
    }
    return this;
  }

  registerActions(actions: ToolMenuAction<T>[]) {
    actions.forEach(action => this.registerAction(action));
    return this;
  }

  getActionsForPlatform(platform: PlatformContext): ToolMenuAction<T>[] {
    return this.actions.filter(action => action.platforms.includes(platform));
  }

  buildConfig(
    platform: PlatformContext, 
    context: T, 
    header?: { title: string; subtitle?: string }
  ): ContextMenuConfig {
    const platformActions = this.getActionsForPlatform(platform);
    
    // Group actions
    const groupedActions = new Map<string, ContextMenuItem[]>();
    
    for (const action of platformActions) {
      // Check visibility
      if (action.isVisible && !action.isVisible(context)) {
        continue;
      }

      const menuItem: ContextMenuItem = {
        id: action.id,
        label: action.label,
        sublabel: action.sublabel,
        icon: action.icon,
        shortcut: action.shortcut,
        variant: action.variant,
        disabled: action.isDisabled ? action.isDisabled(context) : false,
        hidden: false,
        onClick: () => action.execute(context),
      };

      if (!groupedActions.has(action.group)) {
        groupedActions.set(action.group, []);
      }
      groupedActions.get(action.group)!.push(menuItem);
    }

    // Build groups in order
    const groups: ContextMenuGroup[] = [];
    for (const groupDef of this.groups) {
      const items = groupedActions.get(groupDef.id);
      if (items && items.length > 0) {
        groups.push({
          id: groupDef.id,
          label: groupDef.label,
          items,
        });
      }
    }

    return {
      groups,
      header,
    };
  }

  clear() {
    this.actions = [];
    this.groups = [];
    return this;
  }
}

// Singleton instance for global registry
export const globalToolMenuRegistry = new ToolMenuRegistryClass();

// Factory for platform-specific registries
export function createToolMenuRegistry<T = any>(): ToolMenuRegistryClass<T> {
  return new ToolMenuRegistryClass<T>();
}

export default ToolMenuRegistryClass;
