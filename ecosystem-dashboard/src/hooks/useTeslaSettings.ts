/**
 * Tesla Dashboard Settings Hook
 * 
 * Provides settings with localStorage cache + API sync.
 * - Loads from localStorage instantly (no flash)
 * - Syncs from API on mount
 * - Writes to both localStorage and API on update
 */

import { useState, useEffect, useCallback, useRef } from 'react';
const STORAGE_KEY = 'tesla-dashboard-settings';

export interface TeslaBookmark {
  id: string;
  label: string;
  url: string;
  icon: string;
  color: string;
}

export interface TeslaDashboardSettings {
  vnc: {
    host: string;
    password: string;
    autoConnect: boolean;
    resize: 'scale' | 'remote' | 'off';
    quality: number;
    showDotCursor: boolean;
    viewOnly: boolean;
  };
  bookmarks: TeslaBookmark[];
  display: {
    browserHeightPercent: number;
    theme: 'auto' | 'light' | 'dark';
    novaWidthPercent: number;
  };
}

const DEFAULT_SETTINGS: TeslaDashboardSettings = {
  vnc: {
    host: 'vnc.hyperspaceanalytics.com',
    password: '',
    autoConnect: true,
    resize: 'scale',
    quality: 6,
    showDotCursor: true,
    viewOnly: false,
  },
  bookmarks: [
    { id: 'youtube', label: 'YouTube', url: 'https://youtube.com', icon: 'Play', color: 'red.400' },
    { id: 'amazon', label: 'Amazon', url: 'https://amazon.com', icon: 'ShoppingCart', color: 'orange.400' },
    { id: 'coursera', label: 'Coursera', url: 'https://coursera.org', icon: 'BookOpen', color: 'blue.400' },
    { id: 'maps', label: 'Maps', url: 'https://maps.google.com', icon: 'Map', color: 'green.400' },
    { id: 'news', label: 'News', url: 'https://news.google.com', icon: 'Newspaper', color: 'purple.400' },
    { id: 'markets', label: 'Markets', url: 'https://finance.yahoo.com', icon: 'TrendingUp', color: 'teal.400' },
  ],
  display: {
    browserHeightPercent: 60,
    theme: 'auto',
    novaWidthPercent: 33,
  },
};

function loadFromStorage(): TeslaDashboardSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveToStorage(settings: TeslaDashboardSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function useTeslaSettings() {
  const [settings, setSettings] = useState<TeslaDashboardSettings>(loadFromStorage);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const mountedRef = useRef(true);

  // Sync from API on mount
  useEffect(() => {
    mountedRef.current = true;
    async function fetchSettings() {
      try {
        const res = await fetch('/api/tesla/settings');
        if (res.ok) {
          const data = await res.json();
          if (mountedRef.current && data.settings) {
            setSettings(data.settings);
            saveToStorage(data.settings);
          }
        }
      } catch (err) {
        console.warn('[TeslaSettings] API fetch failed, using cached:', err);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    }
    fetchSettings();
    return () => { mountedRef.current = false; };
  }, []);

  // Update settings (partial update)
  const updateSettings = useCallback(async (updates: Partial<TeslaDashboardSettings>) => {
    setIsSaving(true);
    const newSettings = { ...settings };

    // Deep merge for nested objects, but replace arrays
    for (const key of Object.keys(updates) as (keyof TeslaDashboardSettings)[]) {
      if (key === 'bookmarks') {
        (newSettings as any)[key] = updates[key];
      } else if (typeof updates[key] === 'object' && updates[key] !== null) {
        (newSettings as any)[key] = { ...(newSettings as any)[key], ...(updates as any)[key] };
      } else {
        (newSettings as any)[key] = updates[key];
      }
    }

    // Optimistic update
    setSettings(newSettings);
    saveToStorage(newSettings);

    // Sync to API
    try {
      await fetch('/api/tesla/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('[TeslaSettings] API save failed, changes cached locally:', err);
    } finally {
      setIsSaving(false);
    }

    return newSettings;
  }, [settings]);

  // Convenience: update a single VNC field
  const updateVnc = useCallback(
    (updates: Partial<TeslaDashboardSettings['vnc']>) => updateSettings({ vnc: { ...settings.vnc, ...updates } }),
    [settings.vnc, updateSettings]
  );

  // Convenience: update bookmarks
  const updateBookmarks = useCallback(
    (bookmarks: TeslaBookmark[]) => updateSettings({ bookmarks }),
    [updateSettings]
  );

  // Convenience: add a bookmark
  const addBookmark = useCallback(
    (bookmark: TeslaBookmark) => updateBookmarks([...settings.bookmarks, bookmark]),
    [settings.bookmarks, updateBookmarks]
  );

  // Convenience: remove a bookmark
  const removeBookmark = useCallback(
    (id: string) => updateBookmarks(settings.bookmarks.filter((b: TeslaBookmark) => b.id !== id)),
    [settings.bookmarks, updateBookmarks]
  );

  // Build VNC URL from settings
  const vncUrl = buildVncUrl(settings.vnc);

  return {
    settings,
    isLoading,
    isSaving,
    updateSettings,
    updateVnc,
    updateBookmarks,
    addBookmark,
    removeBookmark,
    vncUrl,
  };
}

export function buildVncUrl(vnc: TeslaDashboardSettings['vnc']): string {
  const params = new URLSearchParams();
  if (vnc.autoConnect) params.set('autoconnect', 'true');
  if (vnc.resize !== 'off') params.set('resize', vnc.resize);
  if (vnc.showDotCursor) params.set('show_dot', 'true');
  if (vnc.password) params.set('password', vnc.password);
  if (vnc.quality !== 6) params.set('quality', String(vnc.quality));
  if (vnc.viewOnly) params.set('view_only', 'true');

  // Use http for localhost, https for external hosts
  const protocol = vnc.host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${vnc.host}/vnc.html?${params.toString()}`;
}
