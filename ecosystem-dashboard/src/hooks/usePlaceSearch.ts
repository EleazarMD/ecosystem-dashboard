/**
 * Place Search Hook
 * Fetches places using Google Places API or local database
 */

import { useState, useEffect, useCallback } from 'react';

interface Place {
  id?: string;
  place_id?: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
}

interface UsePlaceSearchOptions {
  enabled?: boolean;
  debounceMs?: number;
  useGoogle?: boolean;
}

interface UsePlaceSearchResult {
  places: Place[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  refetch: () => void;
}

export function usePlaceSearch({
  enabled = true,
  debounceMs = 300,
  useGoogle = false,
}: UsePlaceSearchOptions): UsePlaceSearchResult {
  const [places, setPlaces] = useState<Place[]>([]);
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

  // Fetch places
  const fetchPlaces = useCallback(async (query?: string) => {
    if (!enabled || !query) {
      setPlaces([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        query,
        ...(useGoogle && { useGoogle: 'true' }),
      });

      const response = await fetch(`/api/places/autocomplete?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch places');
      }

      const data = await response.json();
      setPlaces(data.places || []);
    } catch (err) {
      console.error('Place search error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, useGoogle]);

  // Debounced search
  useEffect(() => {
    fetchPlaces(debouncedQuery);
  }, [debouncedQuery, fetchPlaces]);

  // Search function
  const search = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Refetch function
  const refetch = useCallback(() => {
    fetchPlaces(searchQuery);
  }, [fetchPlaces, searchQuery]);

  return {
    places,
    loading,
    error,
    search,
    refetch,
  };
}
