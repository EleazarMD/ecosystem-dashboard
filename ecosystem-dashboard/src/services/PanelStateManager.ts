/**
 * Panel State Manager
 * Handles persistence and restoration of panel state
 */

import { PanelContext } from '@/components/layout/panels/types';

interface PanelState {
  context: PanelContext;
  activeTab: string;
  isOpen: boolean;
  width?: number;
  customData?: any;
  timestamp: number;
}

const STORAGE_KEY = 'right-panel-state';
const STATE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export class PanelStateManager {
  /**
   * Save current panel state to localStorage
   */
  static saveState(state: Omit<PanelState, 'timestamp'>): void {
    try {
      const stateWithTimestamp: PanelState = {
        ...state,
        timestamp: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithTimestamp));
    } catch (error) {
      console.error('[PanelStateManager] Error saving state:', error);
    }
  }

  /**
   * Load panel state from localStorage
   * Returns null if state is expired or invalid
   */
  static loadState(): PanelState | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const state: PanelState = JSON.parse(stored);

      // Check if state is expired
      const age = Date.now() - state.timestamp;
      if (age > STATE_EXPIRY_MS) {
        this.clearState();
        return null;
      }

      return state;
    } catch (error) {
      console.error('[PanelStateManager] Error loading state:', error);
      return null;
    }
  }

  /**
   * Clear saved panel state
   */
  static clearState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[PanelStateManager] Error clearing state:', error);
    }
  }

  /**
   * Save panel preferences (per-context settings)
   */
  static savePreferences(context: PanelContext, preferences: PanelPreferences): void {
    try {
      const key = `panel-prefs-${context}`;
      localStorage.setItem(key, JSON.stringify(preferences));
    } catch (error) {
      console.error('[PanelStateManager] Error saving preferences:', error);
    }
  }

  /**
   * Load panel preferences for a context
   */
  static loadPreferences(context: PanelContext): PanelPreferences | null {
    try {
      const key = `panel-prefs-${context}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[PanelStateManager] Error loading preferences:', error);
      return null;
    }
  }

  /**
   * Track panel usage analytics
   */
  static trackUsage(context: PanelContext, panelId: string, tabId?: string): void {
    try {
      const key = 'panel-usage-stats';
      const stored = localStorage.getItem(key);
      const stats: UsageStats = stored ? JSON.parse(stored) : {};

      const contextKey = `${context}:${panelId}${tabId ? `:${tabId}` : ''}`;
      
      if (!stats[contextKey]) {
        stats[contextKey] = {
          count: 0,
          lastUsed: 0,
        };
      }

      stats[contextKey].count++;
      stats[contextKey].lastUsed = Date.now();

      localStorage.setItem(key, JSON.stringify(stats));
    } catch (error) {
      console.error('[PanelStateManager] Error tracking usage:', error);
    }
  }

  /**
   * Get usage statistics
   */
  static getUsageStats(): UsageStats {
    try {
      const key = 'panel-usage-stats';
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[PanelStateManager] Error getting usage stats:', error);
      return {};
    }
  }

  /**
   * Get most used panels for a context
   */
  static getMostUsedPanels(context: PanelContext, limit: number = 5): string[] {
    const stats = this.getUsageStats();
    const contextStats = Object.entries(stats)
      .filter(([key]) => key.startsWith(`${context}:`))
      .map(([key, data]) => ({
        panelId: key.split(':')[1],
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(item => item.panelId);

    return contextStats;
  }
}

interface PanelPreferences {
  defaultWidth?: number;
  favoriteTab?: string;
  autoOpen?: boolean;
  customSettings?: Record<string, any>;
}

interface UsageStats {
  [key: string]: {
    count: number;
    lastUsed: number;
  };
}
