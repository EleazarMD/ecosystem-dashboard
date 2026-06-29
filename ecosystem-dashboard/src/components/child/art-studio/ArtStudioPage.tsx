/**
 * ArtStudioPage — Redesigned child art studio with Gemini integration.
 *
 * FSD Agentic Harness integration:
 * - Registers a live ArtStudioContextProvider with the Context Hub.
 * - Uses the shared PiCodeTransport companion via the right panel.
 * - Logs activity to the PCG learner model.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import {
  useToast, useDisclosure, Modal, ModalOverlay, ModalContent, ModalBody,
  VStack, HStack, Text, Box, Button, Image,
} from '@chakra-ui/react';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useKidsPCG } from '@/hooks/useKidsPCG';
import {
  KNOWN_ACTIVITY_IDS,
  useActivityContext,
  createArtStudioContextProvider,
} from '@/domains/learning/shared/activity-registry';
import type { ArtStudioStateSnapshot } from '@/domains/learning/shared/activities/all-context-providers';
import { ArtStudioShell } from './ArtStudioShell';
import { ArtGallery } from './ArtGallery';
import type { ArtImage, ArtStyle, ArtSize, PromptSuggestion } from './art-studio-types';

const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  { emoji: '🐉', text: 'A friendly dragon' },
  { emoji: '🌲', text: 'A magical forest' },
  { emoji: '🤖', text: 'A cute robot' },
  { emoji: '🦸', text: 'A superhero' },
  { emoji: '🚀', text: 'A space adventure' },
  { emoji: '🏰', text: 'A fairy tale castle' },
  { emoji: '🦄', text: 'A rainbow unicorn' },
  { emoji: '🐱', text: 'A playful kitten' },
];

const ART_STYLES: ArtStyle[] = [
  { id: 'cartoon', emoji: '🎨', label: 'Cartoon', description: 'Fun and colorful' },
  { id: 'watercolor', emoji: '🖌️', label: 'Watercolor', description: 'Soft and dreamy' },
  { id: 'pixel', emoji: '👾', label: 'Pixel Art', description: 'Retro game style' },
  { id: 'storybook', emoji: '📚', label: 'Storybook', description: 'Like a fairy tale' },
  { id: '3d', emoji: '🎮', label: '3D Render', description: 'Modern and shiny' },
];

const ART_SIZES: ArtSize[] = [
  { id: 'square', label: '⬜ Square', ratio: '1:1', aspectRatio: '1:1' },
  { id: 'wide', label: '🖼️ Wide', ratio: '16:9', aspectRatio: '16:9' },
  { id: 'tall', label: '📱 Tall', ratio: '9:16', aspectRatio: '9:16' },
  { id: 'portrait', label: '📷 Portrait', ratio: '4:3', aspectRatio: '4:3' },
];

export function ArtStudioPage() {
  const toast = useToast();
  const { setIsOpen, setContext } = useRightPanel();
  const { logActivity, updateProgress, addKnowledge } = useKidsPCG();
  const { isOpen: isDeleteConfirmOpen, onOpen: onDeleteConfirmOpen, onClose: onDeleteConfirmClose } = useDisclosure();
  const [imageToDelete, setImageToDelete] = useState<ArtImage | null>(null);

  // Context Hub state
  const artStateRef = useRef<ArtStudioStateSnapshot>({
    childName: '',
    view: 'canvas',
    selectedStyle: 'cartoon',
    selectedSize: 'square',
    currentPrompt: '',
    hasUnsavedChanges: false,
    imageCount: 0,
    currentImageId: null,
  });

  useActivityContext(KNOWN_ACTIVITY_IDS.ART_STUDIO, () => createArtStudioContextProvider(artStateRef));

  // Core state
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ArtImage[]>([]);
  const [currentImage, setCurrentImage] = useState<ArtImage | null>(null);
  const [usageMinutes, setUsageMinutes] = useState(0);
  const [limitMinutes, setLimitMinutes] = useState(120);
  const [selectedStyle, setSelectedStyle] = useState('cartoon');
  const [selectedSize, setSelectedSize] = useState('square');
  const [viewMode, setViewMode] = useState<'canvas' | 'gallery'>('gallery');

  // Async job state (legacy HiDream jobs)
  const [pendingJobs, setPendingJobs] = useState<Set<string>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync context state
  useEffect(() => {
    artStateRef.current = {
      ...artStateRef.current,
      currentPrompt: prompt,
      selectedStyle,
      selectedSize,
      view: viewMode,
      hasUnsavedChanges: prompt.trim().length > 0,
      imageCount: images.length,
      currentImageId: currentImage?.id || null,
    };
  }, [prompt, selectedStyle, selectedSize, viewMode, images.length, currentImage?.id]);

  // Set right panel context on mount
  useEffect(() => {
    setContext('child-art');
    setIsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchUsage();
    loadCompletedImages();
    loadPendingJobs();
    startJobPolling();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Update currentImage when images array changes
  useEffect(() => {
    setCurrentImage((prev) => {
      if (!prev || !prev.jobId) return prev;
      const updatedImage = images.find((img) => img.id === prev.jobId || img.id === prev.id);
      if (!updatedImage) return prev;
      if (updatedImage.status !== prev.status || updatedImage.imageUrl !== prev.imageUrl) {
        return updatedImage;
      }
      return prev;
    });
  }, [images]);

  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/child/dashboard');
      const data = await res.json();
      if (res.ok) {
        setUsageMinutes(data.todayUsageMinutes);
        setLimitMinutes(data.dailyLimitMinutes);
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  };

  const loadCompletedImages = async () => {
    try {
      const res = await fetch('/api/child/art-studio/gallery');
      if (res.ok) {
        const data = await res.json();
        if (data.images && data.images.length > 0) {
          const loadedImages = data.images.map((img: any) => ({
            id: img.id,
            prompt: img.prompt,
            imageUrl: img.image_url,
            createdAt: new Date(img.created_at),
            style: img.style,
            favorite: img.favorite,
            status: 'completed' as const,
            source: 'job' as const,
          }));
          setImages(loadedImages);
          if (!currentImage && loadedImages.length > 0) {
            setCurrentImage(loadedImages[0]);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load completed images:', e);
    }
  };

  const loadPendingJobs = () => {
    try {
      const saved = localStorage.getItem('childArtPendingJobs');
      if (saved) {
        const jobIds = JSON.parse(saved);
        setPendingJobs(new Set(jobIds));
        jobIds.forEach((jobId: string) => checkJobStatus(jobId));
      }
    } catch (e) {
      console.error('Failed to load pending jobs:', e);
    }
  };

  const savePendingJobs = (jobs: Set<string>) => {
    try {
      localStorage.setItem('childArtPendingJobs', JSON.stringify(Array.from(jobs)));
    } catch (e) {
      console.error('Failed to save pending jobs:', e);
    }
  };

  const startJobPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(() => {
      if (pendingJobs.size > 0) {
        pendingJobs.forEach((jobId) => checkJobStatus(jobId));
      }
    }, 2000);
  };

  const checkJobStatus = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/child/art-studio/jobs/${jobId}`);
      if (!res.ok) {
        setPendingJobs((prev) => {
          const updated = new Set(prev);
          updated.delete(jobId);
          savePendingJobs(updated);
          return updated;
        });
        setImages((prev) => prev.filter((img) => img.id !== jobId));
        return;
      }

      const data = await res.json();
      if (!data.success || !data.job) return;
      const job = data.job;

      if (job.status === 'cancelled' || job.status === 'failed') {
        setPendingJobs((prev) => {
          const updated = new Set(prev);
          updated.delete(jobId);
          savePendingJobs(updated);
          return updated;
        });
        setImages((prev) => prev.filter((img) => img.id !== jobId));
        return;
      }

      setImages((prev) => {
        const existing = prev.find((img) => img.id === jobId);
        if (existing) {
          return prev.map((img) =>
            img.id === jobId
              ? {
                  ...img,
                  status: job.status,
                  progress: job.progress,
                  imageUrl: job.resultUrl || img.imageUrl,
                }
              : img,
          );
        } else {
          const newImage: ArtImage = {
            id: jobId,
            prompt: job.prompt,
            imageUrl: job.resultUrl || '',
            createdAt: new Date(job.createdAt),
            style: job.style,
            status: job.status,
            progress: job.progress,
            favorite: false,
            source: 'job',
          };
          return [newImage, ...prev];
        }
      });

      setCurrentImage((prev) => {
        if (prev && (prev.id === jobId || prev.jobId === jobId)) {
          return {
            ...prev,
            status: job.status,
            progress: job.progress,
            imageUrl: job.resultUrl || prev.imageUrl,
          };
        }
        return prev;
      });

      if (job.status === 'completed' && job.resultUrl) {
        loadCompletedImages();
        toast({
          title: '🎉 Your masterpiece is ready!',
          description: `"${job.prompt.substring(0, 50)}..."`,
          status: 'success',
          duration: 5000,
        });
        setPendingJobs((prev) => {
          const updated = new Set(prev);
          updated.delete(jobId);
          savePendingJobs(updated);
          return updated;
        });
      }

      if (job.status === 'failed') {
        toast({
          title: 'Oops!',
          description: job.errorMessage || 'Something went wrong. Try again! 🎨',
          status: 'error',
          duration: 5000,
        });
        setPendingJobs((prev) => {
          const updated = new Set(prev);
          updated.delete(jobId);
          savePendingJobs(updated);
          return updated;
        });
        setImages((prev) => prev.filter((img) => img.id !== jobId));
      }
    } catch (error) {
      console.error('Failed to check job status:', error);
    }
  }, [loadCompletedImages, toast]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setViewMode('canvas');

    try {
      const sizeInfo = ART_SIZES.find((s) => s.id === selectedSize);
      const styleInfo = ART_STYLES.find((s) => s.id === selectedStyle);

      const res = await fetch('/api/child/art-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style: selectedStyle,
          aspectRatio: sizeInfo?.aspectRatio || '1:1',
          enhancePrompt: true,
        }),
      });

      const data = await res.json();

      if (data.requiresApproval) {
        toast({
          title: '📨 Asking your parent!',
          description: data.message,
          status: 'info',
          duration: 5000,
        });
        setPrompt('');
        return;
      }

      if (data.blocked) {
        toast({
          title: '🎨 Let\'s try something else!',
          description: data.message,
          status: 'warning',
          duration: 5000,
        });
        return;
      }

      if (data.success && data.imageUrl) {
        const newImage: ArtImage = {
          id: data.imageId || `gemini-${Date.now()}`,
          prompt: prompt.trim(),
          imageUrl: data.imageUrl,
          createdAt: new Date(),
          style: selectedStyle,
          status: 'completed',
          favorite: false,
          source: 'gemini',
        };

        setImages((prev) => [newImage, ...prev]);
        setCurrentImage(newImage);
        setPrompt('');

        logActivity({
          activityType: 'art_created',
          activityCategory: 'art-studio',
          sourceType: 'art-studio',
          sourceId: newImage.id,
          title: prompt.trim(),
          metadata: { style: selectedStyle, size: selectedSize, model: 'gemini' },
        });
        updateProgress('art-studio', 'artworks_created', 1);
        addKnowledge({
          sourceType: 'activity',
          sourceId: newImage.id,
          knowledgeType: 'interest',
          category: 'art',
          title: `Created art: ${prompt.trim()}`,
          content: `Created ${styleInfo?.label || 'cartoon'} style artwork about: ${prompt.trim()}`,
          keywords: [selectedStyle, 'art', ...prompt.trim().split(' ').slice(0, 5)],
        });

        toast({
          title: '🎨 Your masterpiece is ready!',
          description: 'You can customize, share, or print it.',
          status: 'success',
          duration: 3000,
        });
      } else {
        throw new Error(data.error || data.message || 'Unknown error');
      }
    } catch (error: any) {
      console.error('[Art Studio] Error:', error.message);
      toast({
        title: 'Oops!',
        description: error.message || 'Something went wrong. Try again!',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [prompt, loading, selectedStyle, selectedSize, logActivity, updateProgress, addKnowledge, toast]);

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
  };

  const handleRandomIdea = () => {
    const random = PROMPT_SUGGESTIONS[Math.floor(Math.random() * PROMPT_SUGGESTIONS.length)];
    setPrompt(random.text);
  };

  const toggleFavorite = (imageId: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, favorite: !img.favorite } : img,
      ),
    );
  };

  const confirmDelete = (image: ArtImage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImageToDelete(image);
    onDeleteConfirmOpen();
  };

  const deleteImage = async () => {
    if (!imageToDelete) return;
    try {
      const res = await fetch(`/api/child/art-studio/delete?imageId=${imageToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageToDelete.id));
        if (currentImage?.id === imageToDelete.id) {
          const remaining = images.filter((img) => img.id !== imageToDelete.id);
          setCurrentImage(remaining.length > 0 ? remaining[0] : null);
        }
        toast({
          title: '🗑️ Bye bye!',
          description: 'Your picture has been removed',
          status: 'success',
          duration: 2000,
        });
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('[Art Studio] Delete error:', error);
      toast({
        title: 'Oops!',
        description: error instanceof Error ? error.message : 'Could not delete the picture',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setImageToDelete(null);
      onDeleteConfirmClose();
    }
  };

  const openImage = (image: ArtImage) => {
    setCurrentImage(image);
    setViewMode('canvas');
  };

  const handlePrint = (image: ArtImage) => {
    if (!image.imageUrl) return;
    const printWindow = window.open(image.imageUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handleShare = (image: ArtImage) => {
    if (navigator.share && image.imageUrl) {
      navigator
        .share({
          title: 'My Art Studio Creation',
          text: image.prompt,
          url: window.location.origin + image.imageUrl,
        })
        .catch(() => {
          // User cancelled or sharing failed
        });
    } else {
      navigator.clipboard.writeText(window.location.origin + image.imageUrl);
      toast({
        title: '📋 Link copied!',
        description: 'Share it with your family!',
        status: 'success',
        duration: 2000,
      });
    }
  };

  const handleCustomize = (image: ArtImage) => {
    // Open the image as a starting point for a new prompt
    setPrompt(`Make a new version of "${image.prompt}" with more details`);
    setCurrentImage(image);
    setViewMode('canvas');
    toast({
      title: '✏️ Customization mode',
      description: 'Edit the prompt below and create a new version!',
      status: 'info',
      duration: 3000,
    });
  };

  const usagePercent = Math.min(100, (usageMinutes / limitMinutes) * 100);
  const remainingMinutes = Math.max(0, limitMinutes - usageMinutes);

  return (
    <ChildDashboardLayout pageType="art">
      <ArtStudioShell
        prompt={prompt}
        onPromptChange={setPrompt}
        onGenerate={handleGenerate}
        loading={loading}
        currentImage={currentImage}
        images={images}
        selectedStyle={selectedStyle}
        onStyleChange={setSelectedStyle}
        selectedSize={selectedSize}
        onSizeChange={setSelectedSize}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSuggestionClick={handleSuggestionClick}
        onRandomIdea={handleRandomIdea}
        onToggleFavorite={toggleFavorite}
        onOpenImage={openImage}
        onDeleteImage={confirmDelete}
        onPrintImage={handlePrint}
        onShareImage={handleShare}
        onCustomizeImage={handleCustomize}
        usageMinutes={usageMinutes}
        limitMinutes={limitMinutes}
        usagePercent={usagePercent}
        remainingMinutes={remainingMinutes}
        styles={ART_STYLES}
        sizes={ART_SIZES}
        suggestions={PROMPT_SUGGESTIONS}
      >
        <ArtGallery
          images={images}
          onOpenImage={openImage}
          onToggleFavorite={toggleFavorite}
          onDeleteImage={confirmDelete}
          onCustomizeImage={handleCustomize}
          onShareImage={handleShare}
          onPrintImage={handlePrint}
        />
        <Modal isOpen={isDeleteConfirmOpen} onClose={onDeleteConfirmClose} isCentered size="md">
          <ModalOverlay />
          <ModalContent borderRadius="2xl" p={4}>
            <ModalBody>
              <VStack spacing={4} align="center" py={4}>
                <Box fontSize="4xl">🗑️</Box>
                <Text fontSize="xl" fontWeight="bold" textAlign="center">
                  Delete this picture?
                </Text>
                <Text color="gray.600" textAlign="center">
                  {imageToDelete?.prompt}
                </Text>
                <HStack spacing={3} pt={2}>
                  <Button onClick={onDeleteConfirmClose} colorScheme="gray" borderRadius="full">
                    Keep it
                  </Button>
                  <Button onClick={deleteImage} colorScheme="red" borderRadius="full">
                    Delete
                  </Button>
                </HStack>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </ArtStudioShell>
    </ChildDashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  const user = session.user as any;
  if (user.accountType !== 'child') {
    return {
      redirect: {
        destination: '/image-studio',
        permanent: false,
      },
    };
  }

  return { props: {} };
};
