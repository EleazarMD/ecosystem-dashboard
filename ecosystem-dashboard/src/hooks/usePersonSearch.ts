/**
 * Person Search Hook
 * Fetches and searches workspace members for Person picker
 */

import { useState, useEffect, useCallback } from 'react';
import { User } from '../types/property-values';

interface UsePersonSearchOptions {
  workspaceId: string;
  enabled?: boolean;
  debounceMs?: number;
}

interface UsePersonSearchResult {
  users: User[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  refetch: () => void;
}

export function usePersonSearch({
  workspaceId,
  enabled = true,
  debounceMs = 300,
}: UsePersonSearchOptions): UsePersonSearchResult {
  const [users, setUsers] = useState<User[]>([]);
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

  // Fetch users
  const fetchUsers = useCallback(async (query?: string) => {
    if (!enabled || !workspaceId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        workspaceId,
        ...(query && { query }),
      });

      const response = await fetch(`/api/users/search?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Person search error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, enabled]);

  // Initial fetch and debounced search
  useEffect(() => {
    fetchUsers(debouncedQuery);
  }, [debouncedQuery, fetchUsers]);

  // Search function
  const search = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Refetch function
  const refetch = useCallback(() => {
    fetchUsers(searchQuery);
  }, [fetchUsers, searchQuery]);

  return {
    users,
    loading,
    error,
    search,
    refetch,
  };
}
