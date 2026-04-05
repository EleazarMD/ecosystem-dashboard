/**
 * Relation Search Hook
 * Fetches and searches pages in a target database for Relation picker
 */

import { useState, useEffect, useCallback } from 'react';

interface RelationPage {
  id: string;
  title: string;
  icon?: string;
  properties?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface UseRelationSearchOptions {
  databaseId: string;
  enabled?: boolean;
  debounceMs?: number;
}

interface UseRelationSearchResult {
  pages: RelationPage[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  refetch: () => void;
}

export function useRelationSearch({
  databaseId,
  enabled = true,
  debounceMs = 300,
}: UseRelationSearchOptions): UseRelationSearchResult {
  const [pages, setPages] = useState<RelationPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search query
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  // Fetch pages
  const fetchPages = useCallback(async (query?: string) => {
    if (!enabled || !databaseId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        databaseId,
        ...(query && { query }),
        limit: '50',
      });

      const response = await fetch(`/api/databases/pages?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pages');
      }

      const data = await response.json();
      setPages(data.pages || []);
    } catch (err) {
      console.error('Relation search error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, [databaseId, enabled]);

  // Initial fetch and debounced search
  useEffect(() => {
    fetchPages(debouncedQuery);
  }, [debouncedQuery, fetchPages]);

  // Search function
  const search = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Refetch function
  const refetch = useCallback(() => {
    fetchPages(searchQuery);
  }, [fetchPages, searchQuery]);

  return {
    pages,
    loading,
    error,
    search,
    refetch,
  };
}
