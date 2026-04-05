/**
 * Panel Engine Core
 * Central orchestration and validation for the right panel system
 */

import { PanelContext } from '../types';
import { PANEL_CONFIGS } from '@/contexts/RightPanelContext';
import { PANEL_REGISTRY } from '../config/panelRegistry.minimal';
import { PANEL_ROUTES } from '../config/panelRoutes';

export class PanelEngine {
  /**
   * Validate that all panel configurations are properly set up
   * Run this during development to catch configuration errors
   */
  static validateConfiguration(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate PANEL_CONFIGS
    Object.entries(PANEL_CONFIGS).forEach(([context, config]) => {
      // Check tabs exist
      if (!config.tabs || config.tabs.length === 0) {
        errors.push(`Context "${context}" has no tabs defined`);
      }

      // Check default tab exists
      const defaultTabExists = config.tabs.some(tab => tab.id === config.defaultTab);
      if (!defaultTabExists) {
        errors.push(`Context "${context}" defaultTab "${config.defaultTab}" not found in tabs`);
      }

      // Check width is reasonable
      if (config.width < 200 || config.width > 1000) {
        warnings.push(`Context "${context}" has unusual width: ${config.width}px`);
      }

      // Check tab IDs are unique
      const tabIds = config.tabs.map(t => t.id);
      const duplicates = tabIds.filter((id, index) => tabIds.indexOf(id) !== index);
      if (duplicates.length > 0) {
        errors.push(`Context "${context}" has duplicate tab IDs: ${duplicates.join(', ')}`);
      }
    });

    // 2. Validate PANEL_ROUTES
    PANEL_ROUTES.forEach((route, index) => {
      // Check contexts are valid
      route.contexts.forEach(ctx => {
        if (ctx !== 'default' && !PANEL_CONFIGS[ctx as PanelContext]) {
          errors.push(`Route ${index}: context "${ctx}" not found in PANEL_CONFIGS`);
        }
      });

      // Check panel exists in registry
      if (!PANEL_REGISTRY[route.panelId]) {
        errors.push(`Route ${index}: panelId "${route.panelId}" not found in PANEL_REGISTRY`);
      }

      // Check priority is set
      if (route.priority === undefined) {
        warnings.push(`Route ${index}: no priority set for panelId "${route.panelId}"`);
      }
    });

    // 3. Validate PANEL_REGISTRY
    Object.entries(PANEL_REGISTRY).forEach(([panelId, panel]) => {
      // Check ID matches key
      if (panel.id !== panelId) {
        errors.push(`Panel "${panelId}": id mismatch (key: "${panelId}", id: "${panel.id}")`);
      }

      // Check required fields
      if (!panel.displayName) {
        errors.push(`Panel "${panelId}": missing displayName`);
      }
      if (!panel.component) {
        errors.push(`Panel "${panelId}": missing component`);
      }
    });

    // 4. Check for orphaned panels (in registry but no routes)
    const routedPanelIds = new Set(PANEL_ROUTES.map(r => r.panelId));
    Object.keys(PANEL_REGISTRY).forEach(panelId => {
      if (!routedPanelIds.has(panelId) && panelId !== 'default' && panelId !== 'ai-assistant') {
        warnings.push(`Panel "${panelId}" is registered but has no routes`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get all contexts that use a specific panel
   */
  static getContextsForPanel(panelId: string): PanelContext[] {
    const contexts = new Set<PanelContext>();
    
    PANEL_ROUTES.forEach(route => {
      if (route.panelId === panelId) {
        route.contexts.forEach(ctx => {
          if (ctx !== 'default') {
            contexts.add(ctx as PanelContext);
          }
        });
      }
    });

    return Array.from(contexts);
  }

  /**
   * Get all panels available for a specific context
   */
  static getPanelsForContext(context: PanelContext): string[] {
    const panelIds = new Set<string>();

    PANEL_ROUTES.forEach(route => {
      if (route.contexts.includes(context) || route.contexts.includes('default')) {
        panelIds.add(route.panelId);
      }
    });

    return Array.from(panelIds);
  }

  /**
   * Get routing statistics
   */
  static getRoutingStats() {
    const stats = {
      totalContexts: Object.keys(PANEL_CONFIGS).length,
      totalPanels: Object.keys(PANEL_REGISTRY).length,
      totalRoutes: PANEL_ROUTES.length,
      routesByPriority: {
        high: PANEL_ROUTES.filter(r => (r.priority || 0) >= 100).length,
        medium: PANEL_ROUTES.filter(r => (r.priority || 0) >= 50 && (r.priority || 0) < 100).length,
        low: PANEL_ROUTES.filter(r => (r.priority || 0) < 50).length,
      },
      childContexts: Object.keys(PANEL_CONFIGS).filter(k => k.startsWith('child-')).length,
      adultContexts: Object.keys(PANEL_CONFIGS).filter(k => !k.startsWith('child-') && k !== 'default').length,
    };

    return stats;
  }

  /**
   * Generate a visual map of the panel routing
   */
  static generateRoutingMap(): string {
    let map = '# Panel Routing Map\n\n';

    Object.entries(PANEL_CONFIGS).forEach(([context, config]) => {
      map += `## ${context}\n`;
      map += `- Width: ${config.width}px\n`;
      map += `- Default Tab: ${config.defaultTab}\n`;
      map += `- Tabs: ${config.tabs.map(t => t.id).join(', ')}\n`;
      
      const routes = PANEL_ROUTES.filter(r => r.contexts.includes(context as PanelContext));
      map += `- Routes (${routes.length}):\n`;
      
      routes.sort((a, b) => (b.priority || 0) - (a.priority || 0)).forEach(route => {
        let routeDesc = `  - [P${route.priority || 0}] ${route.panelId}`;
        if (route.tabId) routeDesc += ` (tab: ${route.tabId})`;
        if (route.customDataType) routeDesc += ` (type: ${route.customDataType})`;
        map += routeDesc + '\n';
      });
      
      map += '\n';
    });

    return map;
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
