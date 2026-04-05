/**
 * Image Studio Context
 * 
 * Manages state for the Image Studio page including active view,
 * gallery data, collections, and favorites
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ImageStudioView = 'generate' | 'edit' | 'gallery' | 'collections' | 'recent' | 'favorites' | 'uploads';

export interface GeneratedImage {
  id: string;
  user_id: string;
  prompt: string;
  negative_prompt?: string;
  model: string;
  width: number;
  height: number;
  steps?: number;
  cfg_scale?: number;
  seed?: number;
  filename: string;
  file_path: string;
  visibility: string;
  is_favorite: boolean;
  created_at: string;
  creator_name?: string;
  reaction_count?: number;
  comment_count?: number;
  generation_time_ms?: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  cover_image_id?: string;
  cover_image_path?: string;
  cover_image_filename?: string;
  image_count: number;
  visibility: string;
  created_at: string;
  updated_at: string;
}

interface ImageStudioContextType {
  activeView: ImageStudioView;
  setActiveView: (view: ImageStudioView) => void;
  
  // Gallery
  galleryImages: GeneratedImage[];
  galleryLoading: boolean;
  galleryTotal: number;
  refreshGallery: () => Promise<void>;
  
  // Collections
  collections: Collection[];
  collectionsLoading: boolean;
  refreshCollections: () => Promise<void>;
  createCollection: (name: string, description?: string) => Promise<void>;
  
  // Selected collection for detail view
  selectedCollection: Collection | null;
  setSelectedCollection: (collection: Collection | null) => void;
  collectionImages: GeneratedImage[];
  collectionImagesLoading: boolean;
  fetchCollectionImages: (collectionId: string) => Promise<void>;
  setCollectionCover: (collectionId: string, imageId: string) => Promise<void>;
  addImageToCollection: (collectionId: string, imageId: string) => Promise<void>;
  removeImageFromCollection: (collectionId: string, imageId: string) => Promise<void>;
  
  // Favorites
  favoriteImages: GeneratedImage[];
  favoritesLoading: boolean;
  refreshFavorites: () => Promise<void>;
  toggleFavorite: (imageId: string) => Promise<void>;
  
  // Recent prompts (stored locally)
  recentPrompts: string[];
  addRecentPrompt: (prompt: string) => void;
  
  // Save image to database
  saveImage: (imageData: Partial<GeneratedImage>) => Promise<GeneratedImage | null>;
  
  // Delete image
  deleteImage: (imageId: string) => Promise<boolean>;
}

const ImageStudioContext = createContext<ImageStudioContextType | null>(null);

export const useImageStudio = () => {
  const context = useContext(ImageStudioContext);
  if (!context) {
    throw new Error('useImageStudio must be used within ImageStudioProvider');
  }
  return context;
};

export const ImageStudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ImageStudioView>('generate');
  
  // Gallery state
  const [galleryImages, setGalleryImages] = useState<GeneratedImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryTotal, setGalleryTotal] = useState(0);
  
  // Collections state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  
  // Selected collection detail state
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionImages, setCollectionImages] = useState<GeneratedImage[]>([]);
  const [collectionImagesLoading, setCollectionImagesLoading] = useState(false);
  
  // Favorites state
  const [favoriteImages, setFavoriteImages] = useState<GeneratedImage[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  
  // Recent prompts (from database + localStorage backup)
  const [recentPrompts, setRecentPrompts] = useState<string[]>([]);

  // Fetch recent prompts from database
  const refreshRecentPrompts = useCallback(async () => {
    try {
      const res = await fetch('/api/images/recent-prompts?limit=20');
      if (res.ok) {
        const data = await res.json();
        setRecentPrompts(data.prompts || []);
        // Also update localStorage as backup
        localStorage.setItem('imageStudio_recentPrompts', JSON.stringify(data.prompts || []));
      }
    } catch (error) {
      console.error('Failed to fetch recent prompts:', error);
      // Fallback to localStorage if API fails
      const stored = localStorage.getItem('imageStudio_recentPrompts');
      if (stored) {
        try {
          setRecentPrompts(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse recent prompts:', e);
        }
      }
    }
  }, []);

  const addRecentPrompt = useCallback((prompt: string) => {
    setRecentPrompts(prev => {
      const filtered = prev.filter(p => p !== prompt);
      const updated = [prompt, ...filtered].slice(0, 20); // Keep last 20
      localStorage.setItem('imageStudio_recentPrompts', JSON.stringify(updated));
      return updated;
    });
    // Refresh from database to stay in sync
    refreshRecentPrompts();
  }, [refreshRecentPrompts]);

  const refreshGallery = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const res = await fetch('/api/images/gallery?filter=mine&limit=50');
      if (res.ok) {
        const data = await res.json();
        setGalleryImages(data.images || []);
        setGalleryTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch gallery:', error);
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  const refreshCollections = useCallback(async () => {
    setCollectionsLoading(true);
    try {
      const res = await fetch('/api/images/collections', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setCollectionsLoading(false);
    }
  }, []);

  const createCollection = useCallback(async (name: string, description?: string) => {
    console.log('[ImageStudioContext] Creating collection:', { name, description });
    const res = await fetch('/api/images/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
      credentials: 'include',
    });
    
    const data = await res.json();
    console.log('[ImageStudioContext] Create collection response:', { ok: res.ok, status: res.status, data });
    
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create collection');
    }
    
    await refreshCollections();
    return data.collection;
  }, [refreshCollections]);

  const fetchCollectionImages = useCallback(async (collectionId: string) => {
    setCollectionImagesLoading(true);
    try {
      const res = await fetch(`/api/images/collections/${collectionId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCollectionImages(data.images || []);
        // Update selected collection with fresh data
        if (data.collection) {
          setSelectedCollection(data.collection);
        }
      }
    } catch (error) {
      console.error('Failed to fetch collection images:', error);
    } finally {
      setCollectionImagesLoading(false);
    }
  }, []);

  const setCollectionCover = useCallback(async (collectionId: string, imageId: string) => {
    try {
      const res = await fetch(`/api/images/collections/${collectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_image_id: imageId }),
        credentials: 'include',
      });
      if (res.ok) {
        await refreshCollections();
        await fetchCollectionImages(collectionId);
      }
    } catch (error) {
      console.error('Failed to set collection cover:', error);
    }
  }, [refreshCollections, fetchCollectionImages]);

  const addImageToCollection = useCallback(async (collectionId: string, imageId: string) => {
    try {
      const res = await fetch(`/api/images/collections/${collectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_id: imageId }),
        credentials: 'include',
      });
      if (res.ok) {
        await refreshCollections();
        if (selectedCollection?.id === collectionId) {
          await fetchCollectionImages(collectionId);
        }
      }
    } catch (error) {
      console.error('Failed to add image to collection:', error);
    }
  }, [refreshCollections, fetchCollectionImages, selectedCollection]);

  const removeImageFromCollection = useCallback(async (collectionId: string, imageId: string) => {
    try {
      const res = await fetch(`/api/images/collections/${collectionId}/items/${imageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setCollectionImages(prev => prev.filter(img => img.id !== imageId));
        await refreshCollections();
      }
    } catch (error) {
      console.error('Failed to remove image from collection:', error);
    }
  }, [refreshCollections]);

  const refreshFavorites = useCallback(async () => {
    setFavoritesLoading(true);
    try {
      const res = await fetch('/api/images/favorites');
      if (res.ok) {
        const data = await res.json();
        setFavoriteImages(data.images || []);
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setFavoritesLoading(false);
    }
  }, []);

  const toggleFavorite = useCallback(async (imageId: string) => {
    try {
      const res = await fetch('/api/images/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_id: imageId }),
      });
      if (res.ok) {
        // Update local state
        setGalleryImages(prev => 
          prev.map(img => 
            img.id === imageId ? { ...img, is_favorite: !img.is_favorite } : img
          )
        );
        await refreshFavorites();
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }, [refreshFavorites]);

  const saveImage = useCallback(async (imageData: Partial<GeneratedImage>): Promise<GeneratedImage | null> => {
    try {
      const res = await fetch('/api/images/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(imageData),
      });
      if (res.ok) {
        const data = await res.json();
        // Refresh gallery to include new image
        await refreshGallery();
        return data.image;
      }
    } catch (error) {
      console.error('Failed to save image:', error);
    }
    return null;
  }, [refreshGallery]);

  const deleteImage = useCallback(async (imageId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        // Remove from local state
        setGalleryImages(prev => prev.filter(img => img.id !== imageId));
        setFavoriteImages(prev => prev.filter(img => img.id !== imageId));
        setGalleryTotal(prev => Math.max(0, prev - 1));
        return true;
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
    return false;
  }, []);

  // Load initial data on mount (eager loading for counts)
  useEffect(() => {
    refreshRecentPrompts();
    refreshGallery();
    refreshCollections();
  }, [refreshRecentPrompts, refreshGallery, refreshCollections]);

  // Refresh data when view changes (lazy loading)
  useEffect(() => {
    if (activeView === 'gallery') {
      refreshGallery();
    } else if (activeView === 'collections') {
      refreshCollections();
    } else if (activeView === 'favorites') {
      refreshFavorites();
    }
  }, [activeView, refreshGallery, refreshCollections, refreshFavorites]);

  return (
    <ImageStudioContext.Provider
      value={{
        activeView,
        setActiveView,
        galleryImages,
        galleryLoading,
        galleryTotal,
        refreshGallery,
        collections,
        collectionsLoading,
        refreshCollections,
        createCollection,
        selectedCollection,
        setSelectedCollection,
        collectionImages,
        collectionImagesLoading,
        fetchCollectionImages,
        setCollectionCover,
        addImageToCollection,
        removeImageFromCollection,
        favoriteImages,
        favoritesLoading,
        refreshFavorites,
        toggleFavorite,
        recentPrompts,
        addRecentPrompt,
        saveImage,
        deleteImage,
      }}
    >
      {children}
    </ImageStudioContext.Provider>
  );
};
