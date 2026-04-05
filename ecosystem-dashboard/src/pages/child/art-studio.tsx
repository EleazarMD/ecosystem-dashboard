/**
 * Child Art Studio Page
 * 
 * Enhanced child-friendly image generation interface with:
 * - Centered image canvas
 * - Bottom input bar
 * - Kid-themed controls and animations
 * - Gallery view
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  SimpleGrid,
  Image,
  Spinner,
  Progress,
  IconButton,
  useToast,
  Badge,
  Flex,
  Tooltip,
  Select,
  Tabs,
  TabList,
  Tab,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  AspectRatio,
  Wrap,
  WrapItem,
  InputGroup,
  InputRightElement,
  useBreakpointValue,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerBody,
  DrawerHeader,
} from '@chakra-ui/react';
import { 
  FiArrowLeft, 
  FiClock, 
  FiImage, 
  FiDownload, 
  FiRefreshCw,
  FiZap,
  FiHeart,
  FiStar,
  FiMaximize2,
  FiGrid,
  FiTrash2,
  FiSend,
} from 'react-icons/fi';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { useRouter } from 'next/router';
import { authOptions } from '../api/auth/[...nextauth]';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { useChildTheme } from '@/components/child/ChildThemeProvider';
import { BackgroundContextMenu, getBackgroundStyles, BackgroundMode } from '@/components/child/BackgroundContextMenu';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useKidsPIC } from '@/hooks/useKidsPIC';

const PROMPT_SUGGESTIONS = [
  { emoji: '🐉', text: 'A friendly dragon' },
  { emoji: '🌲', text: 'A magical forest' },
  { emoji: '🤖', text: 'A cute robot' },
  { emoji: '🦸', text: 'A superhero' },
  { emoji: '🚀', text: 'A space adventure' },
  { emoji: '🏰', text: 'A fairy tale castle' },
  { emoji: '🦄', text: 'A rainbow unicorn' },
  { emoji: '🐱', text: 'A playful kitten' },
];

const ART_STYLES = [
  { id: 'cartoon', emoji: '🎨', label: 'Cartoon', description: 'Fun and colorful' },
  { id: 'watercolor', emoji: '🖌️', label: 'Watercolor', description: 'Soft and dreamy' },
  { id: 'pixel', emoji: '👾', label: 'Pixel Art', description: 'Retro game style' },
  { id: 'storybook', emoji: '📚', label: 'Storybook', description: 'Like a fairy tale' },
  { id: '3d', emoji: '🎮', label: '3D Render', description: 'Modern and shiny' },
];

const SIZE_OPTIONS = [
  { id: 'square', label: '⬜ Square', ratio: '1:1' },
  { id: 'wide', label: '🖼️ Wide', ratio: '16:9' },
  { id: 'tall', label: '📱 Tall', ratio: '9:16' },
];

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: Date;
  style?: string;
  favorite?: boolean;
  jobId?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: {
    percent: number;
    message: string;
  };
}

function ArtStudioPageContent() {
  const router = useRouter();
  const toast = useToast();
  const { colors, childExtras } = useChildTheme();
  const { setIsOpen, setContext, isOpen: isRightPanelOpen } = useRightPanel();
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  const { isOpen: isDeleteConfirmOpen, onOpen: onDeleteConfirmOpen, onClose: onDeleteConfirmClose } = useDisclosure();
  const [imageToDelete, setImageToDelete] = useState<GeneratedImage | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // PIC integration for tracking art activities
  const { logActivity, updateProgress, addKnowledge } = useKidsPIC();
  
  // Mobile/tablet responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const isTablet = useBreakpointValue({ base: false, md: true, lg: false });
  const headerPadding = useBreakpointValue({ base: 2, md: 4 });
  const inputSize = useBreakpointValue({ base: 'md', md: 'lg' });
  const buttonSize = useBreakpointValue({ base: 'md', md: 'lg' });
  const galleryColumns = useBreakpointValue({ base: 2, sm: 3, md: 3, lg: 4 });
  const thumbnailSize = useBreakpointValue({ base: '50px', md: '60px' });

  // Core state
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [usageMinutes, setUsageMinutes] = useState(0);
  const [limitMinutes, setLimitMinutes] = useState(120);
  
  // Async job state
  const [pendingJobs, setPendingJobs] = useState<Set<string>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Settings state
  const [selectedStyle, setSelectedStyle] = useState('cartoon');
  const [selectedSize, setSelectedSize] = useState('square');
  const [viewMode, setViewMode] = useState<'canvas' | 'gallery'>('gallery');
  const [selectedImageForModal, setSelectedImageForModal] = useState<GeneratedImage | null>(null);

  const backgroundImages = childExtras?.decorations?.backgroundImages;
  const backgroundImage = backgroundImages?.default;
  
  // Background mode state
  const [bgMode, setBgMode] = useState<BackgroundMode>('cover');
  
  useEffect(() => {
    const saved = localStorage.getItem('childBgMode');
    if (saved) setBgMode(saved as BackgroundMode);
  }, []);
  
  const handleBgModeChange = (mode: BackgroundMode) => {
    setBgMode(mode);
    localStorage.setItem('childBgMode', mode);
  };
  
  const bgStyles = getBackgroundStyles(bgMode);

  // Set right panel context - keep closed by default
  // Only run on mount to avoid closing panel when user opens it
  useEffect(() => {
    setContext('child-art-studio');
    setIsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Toggle settings panel for mobile
  const handleToggleSettings = () => {
    if (isMobile) {
      onSettingsOpen();
    } else {
      setIsOpen(!isRightPanelOpen);
    }
  };
  
  // Load completed images from database on mount
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
          }));
          setImages(loadedImages);
          // Set the most recent image as current if no current image
          if (!currentImage && loadedImages.length > 0) {
            setCurrentImage(loadedImages[0]);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load completed images:', e);
    }
  };

  useEffect(() => {
    fetchUsage();
    fetchSuggestions();
    loadCompletedImages();
    loadPendingJobs();
    
    // Start polling for pending jobs
    startJobPolling();
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);
  
  // Update currentImage when the images array changes (e.g., when job completes)
  useEffect(() => {
    setCurrentImage(prev => {
      if (!prev || !prev.jobId) return prev;
      
      const updatedImage = images.find(img => img.jobId === prev.jobId);
      if (!updatedImage) return prev;
      
      // Update if status changed or imageUrl changed
      if (updatedImage.status !== prev.status || updatedImage.imageUrl !== prev.imageUrl) {
        return updatedImage;
      }
      return prev;
    });
  }, [images]);
  
  // Load pending jobs from localStorage on mount
  const loadPendingJobs = () => {
    try {
      const saved = localStorage.getItem('childArtPendingJobs');
      if (saved) {
        const jobIds = JSON.parse(saved);
        setPendingJobs(new Set(jobIds));
        // Check status of all pending jobs
        jobIds.forEach((jobId: string) => checkJobStatus(jobId));
      }
    } catch (e) {
      console.error('Failed to load pending jobs:', e);
    }
  };
  
  // Save pending jobs to localStorage
  const savePendingJobs = (jobs: Set<string>) => {
    try {
      localStorage.setItem('childArtPendingJobs', JSON.stringify(Array.from(jobs)));
    } catch (e) {
      console.error('Failed to save pending jobs:', e);
    }
  };
  
  // Start polling for job status updates
  const startJobPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(() => {
      if (pendingJobs.size > 0) {
        pendingJobs.forEach(jobId => checkJobStatus(jobId));
      }
    }, 2000); // Poll every 2 seconds for real-time progress
  };
  
  // Check status of a specific job
  const checkJobStatus = async (jobId: string) => {
    try {
      const res = await fetch(`/api/child/art-studio/jobs/${jobId}`);
      if (!res.ok) {
        // Job not found or error - remove from pending
        setPendingJobs(prev => {
          const updated = new Set(prev);
          updated.delete(jobId);
          savePendingJobs(updated);
          return updated;
        });
        // Also remove from images
        setImages(prev => prev.filter(img => img.jobId !== jobId));
        return;
      }
      
      const data = await res.json();
      if (!data.success || !data.job) return;
      
      const job = data.job;
      
      // If job is cancelled or failed, remove it immediately without showing toast
      if (job.status === 'cancelled' || job.status === 'failed') {
        setPendingJobs(prev => {
          const updated = new Set(prev);
          updated.delete(jobId);
          savePendingJobs(updated);
          return updated;
        });
        setImages(prev => prev.filter(img => img.jobId !== jobId));
        return;
      }
      
      // Update or add image with job status
      setImages(prev => {
        const existing = prev.find(img => img.jobId === jobId);
        if (existing) {
          // Update existing image
          return prev.map(img => 
            img.jobId === jobId
              ? {
                  ...img,
                  status: job.status,
                  progress: job.progress,
                  imageUrl: job.resultUrl || img.imageUrl,
                }
              : img
          );
        } else {
          // Add new pending image
          return [{
            id: jobId,
            jobId,
            prompt: job.prompt,
            imageUrl: job.resultUrl || '',
            createdAt: new Date(job.createdAt),
            style: job.style,
            status: job.status,
            progress: job.progress,
            favorite: false,
          }, ...prev];
        }
      });
      
      // Update currentImage in real-time if it's the active job
      setCurrentImage(prev => {
        if (prev && prev.jobId === jobId) {
          console.log('[Art Studio] Updating currentImage:', job.status, 'URL:', job.resultUrl);
          const updated = {
            ...prev,
            status: job.status,
            progress: job.progress,
            imageUrl: job.resultUrl || prev.imageUrl,
          };
          // Force re-render by creating new object
          return updated;
        }
        return prev;
      });
      
      // If job is completed, show success toast and remove from pending
      if (job.status === 'completed' && job.resultUrl) {
        console.log('[Art Studio] Job completed:', jobId, 'URL:', job.resultUrl);
        
        // Reload completed images from gallery to ensure we have the latest
        loadCompletedImages();
        
        toast({
          title: '🎉 Your masterpiece is ready!',
          description: `"${job.prompt.substring(0, 50)}..."`,
          status: 'success',
          duration: 5000,
        });
        
        setPendingJobs(prev => {
          const updated = new Set(prev);
          updated.delete(jobId);
          savePendingJobs(updated);
          return updated;
        });
      }
      
      // If job just failed (not cancelled), show error toast
      if (job.status === 'failed') {
        toast({
          title: 'Oops!',
          description: job.errorMessage || 'Something went wrong. Try again! 🎨',
          status: 'error',
          duration: 5000,
        });
        
        setPendingJobs(prev => {
          const updated = new Set(prev);
          updated.delete(jobId);
          savePendingJobs(updated);
          return updated;
        });
        
        setImages(prev => prev.filter(img => img.jobId !== jobId));
      }
    } catch (error) {
      console.error('Failed to check job status:', error);
    }
  };

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

  const fetchSuggestions = async () => {
    try {
      const res = await fetch('/api/child/services/image');
      const data = await res.json();
      // Could use data.suggestions here
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);

    try {
      // Get style details for LLM augmentation
      const styleInfo = ART_STYLES.find(s => s.id === selectedStyle);
      const sizeInfo = SIZE_OPTIONS.find(s => s.id === selectedSize);

      // Submit async job - returns immediately with jobId
      const res = await fetch('/api/child/art-studio/jobs/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          style: selectedStyle,
          styleLabel: styleInfo?.label || 'Cartoon',
          styleDescription: styleInfo?.description || 'Fun and colorful',
          size: selectedSize,
          sizeRatio: sizeInfo?.ratio || '1:1',
        }),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[Art Studio] Non-JSON response:', res.status, contentType);
        throw new Error(res.status === 401 ? 'Please sign in to create art' : 'Server error - please try again');
      }

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
        const isAfterHours = data.message?.includes('outside your allowed hours');
        toast({
          title: isAfterHours ? '🌙 Time to rest!' : '🎨 Let\'s try something else!',
          description: data.message,
          status: 'warning',
          duration: 5000,
        });
        return;
      }

      if (data.success && data.jobId) {
        // Job submitted successfully - add to pending jobs
        const jobId = data.jobId;
        setPendingJobs(prev => {
          const updated = new Set(prev);
          updated.add(jobId);
          savePendingJobs(updated);
          return updated;
        });
        
        // Add pending image to gallery immediately
        const newImage: GeneratedImage = {
          id: jobId,
          jobId,
          prompt: prompt.trim(),
          imageUrl: '', // Will be filled when job completes
          createdAt: new Date(),
          style: selectedStyle,
          status: 'pending',
          progress: {
            percent: 0,
            message: "We're starting to create your masterpiece! 🎨✨",
          },
          favorite: false,
        };
        setImages(prev => [newImage, ...prev]);
        setCurrentImage(newImage);
        
        // Log to PIC system
        logActivity({
          activityType: 'art_created',
          activityCategory: 'art-studio',
          sourceType: 'art-studio',
          sourceId: jobId,
          title: prompt.trim(),
          metadata: { style: selectedStyle, size: selectedSize },
        });
        updateProgress('art-studio', 'artworks_created', 1);
        addKnowledge({
          sourceType: 'activity',
          sourceId: jobId,
          knowledgeType: 'interest',
          category: 'art',
          title: `Created art: ${prompt.trim()}`,
          content: `Created ${styleInfo?.label || 'cartoon'} style artwork about: ${prompt.trim()}`,
          keywords: [selectedStyle, 'art', ...prompt.trim().split(' ').slice(0, 5)],
        });
        
        setPrompt('');
        
        // Don't show toast - kids don't need this notification
        
        // Start checking this job immediately
        checkJobStatus(jobId);
      } else {
        console.error('[Art Studio] API error response:', data);
        const errorMsg = typeof data.error === 'string' ? data.error 
          : typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error))
          : data.details || data.message || 'Unknown error';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('[Art Studio] Error:', error.message);
      const displayError = typeof error.message === 'string' && !error.message.includes('[object')
        ? error.message 
        : 'Something went wrong. Try again!';
      toast({
        title: 'Oops!',
        description: displayError,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    inputRef.current?.focus();
  };

  const toggleFavorite = (imageId: string) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, favorite: !img.favorite } : img
    ));
  };

  // Open delete confirmation modal
  const confirmDelete = (image: GeneratedImage, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setImageToDelete(image);
    onDeleteConfirmOpen();
  };

  // Actually delete the image after confirmation
  const deleteImage = async () => {
    if (!imageToDelete) return;
    
    console.log('[Art Studio] Deleting image:', imageToDelete.id);
    
    try {
      const res = await fetch(`/api/child/art-studio/delete?imageId=${imageToDelete.id}`, {
        method: 'DELETE',
      });
      
      console.log('[Art Studio] Delete response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('[Art Studio] Delete response:', data);
        
        setImages(prev => prev.filter(img => img.id !== imageToDelete.id));
        if (currentImage?.id === imageToDelete.id) {
          const remaining = images.filter(img => img.id !== imageToDelete.id);
          setCurrentImage(remaining.length > 0 ? remaining[0] : null);
        }
        if (selectedImageForModal?.id === imageToDelete.id) {
          onModalClose();
        }
        toast({
          title: '🗑️ Bye bye!',
          description: 'Your picture has been removed',
          status: 'success',
          duration: 2000,
        });
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Art Studio] Delete failed:', res.status, errorData);
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

  // Navigate to next/previous image in gallery viewer
  const navigateImage = (direction: 'prev' | 'next') => {
    if (!selectedImageForModal) return;
    const currentIndex = images.findIndex(img => img.id === selectedImageForModal.id);
    if (currentIndex === -1) return;
    
    let newIndex: number;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    } else {
      newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    }
    setSelectedImageForModal(images[newIndex]);
  };

  const openImageModal = (image: GeneratedImage) => {
    setSelectedImageForModal(image);
    onModalOpen();
  };

  const usagePercent = Math.min(100, (usageMinutes / limitMinutes) * 100);
  const remainingMinutes = Math.max(0, limitMinutes - usageMinutes);
  const currentStyleInfo = ART_STYLES.find(s => s.id === selectedStyle);

  return (
    <ChildDashboardLayout pageType="art">
      <BackgroundContextMenu onModeChange={handleBgModeChange} currentMode={bgMode}>
      <Flex
        direction="column"
        h="calc(100vh - 60px)"
        bg={colors?.background || '#ffecd2'}
        backgroundImage={backgroundImage ? `url(${backgroundImage})` : undefined}
        backgroundRepeat={bgStyles.backgroundRepeat}
        backgroundSize={bgStyles.backgroundSize}
        backgroundPosition={bgStyles.backgroundPosition}
        backgroundAttachment={bgStyles.backgroundAttachment}
        position="relative"
      >
        {/* Background overlay */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(255, 255, 255, 0.85)"
        />

        {/* Main Content */}
        <Flex direction="column" flex={1} position="relative" zIndex={1} overflow="hidden">
          {/* Header Bar */}
          <HStack 
            px={headerPadding} 
            py={{ base: 2, md: 3 }} 
            bg="white" 
            borderBottom="1px solid" 
            borderColor="gray.100"
            justify="space-between"
            flexShrink={0}
          >
            <HStack spacing={{ base: 2, md: 3 }}>
              <IconButton
                icon={<FiArrowLeft />}
                aria-label="Back"
                variant="ghost"
                size="sm"
                onClick={() => router.push('/child/home')}
                borderRadius="full"
              />
              <Text fontSize={{ base: 'xl', md: '2xl' }}>🎨</Text>
              {!isMobile && <Text fontWeight="bold" fontSize="lg">Art Studio</Text>}
            </HStack>

            {/* View Toggle & Usage */}
            <HStack spacing={{ base: 2, md: 4 }}>
              {/* View Mode Toggle */}
              <HStack bg="gray.100" p={1} borderRadius="lg">
                <IconButton
                  icon={<FiImage />}
                  aria-label="Canvas View"
                  size="sm"
                  variant={viewMode === 'canvas' ? 'solid' : 'ghost'}
                  colorScheme={viewMode === 'canvas' ? 'green' : 'gray'}
                  onClick={() => setViewMode('canvas')}
                  borderRadius="md"
                />
                <IconButton
                  icon={<FiGrid />}
                  aria-label="Gallery View"
                  size="sm"
                  variant={viewMode === 'gallery' ? 'solid' : 'ghost'}
                  colorScheme={viewMode === 'gallery' ? 'green' : 'gray'}
                  onClick={() => setViewMode('gallery')}
                  borderRadius="md"
                />
              </HStack>

              {/* Usage - compact on mobile */}
              <HStack spacing={{ base: 1, md: 2 }}>
                <FiClock size={isMobile ? 12 : 14} />
                <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">{remainingMinutes}m</Text>
                {!isMobile && (
                  <Box w="60px">
                    <Progress
                      value={usagePercent}
                      size="xs"
                      colorScheme={usagePercent > 80 ? 'red' : usagePercent > 50 ? 'orange' : 'green'}
                      borderRadius="full"
                    />
                  </Box>
                )}
              </HStack>
            </HStack>
          </HStack>

          {/* Canvas / Gallery Area */}
          <Box flex={1} overflow="auto" p={4}>
            {viewMode === 'canvas' ? (
              /* Canvas View - Centered Image with constrained height */
              <Flex 
                direction="column" 
                align="center" 
                justify="flex-start" 
                h="full" 
                maxH="full"
                overflow="hidden"
                py={2}
              >
                {loading ? (
                  /* Loading State */
                  <VStack spacing={6} p={8}>
                    <Box
                      w="120px"
                      h="120px"
                      borderRadius="full"
                      bg={colors?.primary ? `${colors.primary}22` : 'green.100'}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      animation="pulse 1.5s infinite"
                    >
                      <Text fontSize="4xl">🎨</Text>
                    </Box>
                    <VStack spacing={2}>
                      <Text fontSize="xl" fontWeight="bold" color={colors?.primary || 'green.600'}>
                        Creating your masterpiece...
                      </Text>
                      <Text color="gray.500">This might take a moment!</Text>
                      <Spinner size="lg" color={colors?.primary || 'green.500'} thickness="3px" mt={2} />
                    </VStack>
                  </VStack>
                ) : currentImage ? (
                  /* Current Image Display - constrained to fit with thumbnails */
                  <VStack spacing={3} w="full" flex={1} minH={0} overflow="hidden">
                    <Box
                      position="relative"
                      borderRadius="2xl"
                      overflow="hidden"
                      boxShadow="2xl"
                      bg="white"
                      w="full"
                      maxW={{ base: '90vw', md: '500px' }}
                      aspectRatio={1}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {currentImage.status === 'pending' || currentImage.status === 'processing' ? (
                        /* Pending/Processing State */
                        <VStack spacing={4} p={8} w="full" maxW="400px">
                          <Box
                            w="120px"
                            h="120px"
                            borderRadius="full"
                            bg={colors?.primary ? `${colors.primary}22` : 'green.100'}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            animation="pulse 1.5s infinite"
                          >
                            <Text fontSize="4xl">🎨</Text>
                          </Box>
                          <VStack spacing={3} w="full">
                            <Text fontSize="xl" fontWeight="bold" color={colors?.primary || 'green.600'} textAlign="center">
                              {currentImage.progress?.message || 'Creating your masterpiece...'}
                            </Text>
                            <Box w="full" bg="gray.100" borderRadius="full" p={1}>
                              <Box
                                w={`${currentImage.progress?.percent || 0}%`}
                                h="24px"
                                bg={`linear-gradient(90deg, ${colors?.primary || '#48bb78'}, ${colors?.secondary || '#38a169'})`}
                                borderRadius="full"
                                transition="width 0.5s ease-in-out"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                position="relative"
                                overflow="hidden"
                              >
                                <Box
                                  position="absolute"
                                  top={0}
                                  left={0}
                                  right={0}
                                  bottom={0}
                                  bgGradient="linear(to-r, transparent, whiteAlpha.400, transparent)"
                                  animation="shimmer 2s infinite"
                                  sx={{
                                    '@keyframes shimmer': {
                                      '0%': { transform: 'translateX(-100%)' },
                                      '100%': { transform: 'translateX(100%)' }
                                    }
                                  }}
                                />
                                <Text fontSize="xs" fontWeight="bold" color="white" zIndex={1}>
                                  {currentImage.progress?.percent || 0}%
                                </Text>
                              </Box>
                            </Box>
                            <Text color="gray.500" fontSize="sm" textAlign="center">
                              You can navigate away and come back later! ✨
                            </Text>
                          </VStack>
                        </VStack>
                      ) : currentImage.imageUrl ? (
                        <Image
                          src={currentImage.imageUrl}
                          alt={currentImage.prompt}
                          w="auto"
                          h="auto"
                          maxW="100%"
                          maxH="100%"
                          objectFit="contain"
                          bg="gray.50"
                          style={{ imageRendering: 'crisp-edges' }}
                        />
                      ) : (
                        /* Failed State */
                        <VStack spacing={4} p={8}>
                          <Text fontSize="4xl">😕</Text>
                          <Text fontSize="lg" fontWeight="bold">Oops! Something went wrong</Text>
                          <Text color="gray.500">Try creating a new artwork!</Text>
                        </VStack>
                      )}
                      {/* Image Controls Overlay */}
                      <HStack
                        position="absolute"
                        top={2}
                        right={2}
                        spacing={1}
                        bg="blackAlpha.500"
                        backdropFilter="blur(8px)"
                        p={1}
                        borderRadius="full"
                      >
                        <Tooltip label="Favorite">
                          <IconButton
                            icon={<FiHeart />}
                            aria-label="Favorite"
                            size="xs"
                            colorScheme={currentImage.favorite ? 'red' : 'gray'}
                            variant="solid"
                            bg={currentImage.favorite ? 'red.500' : 'whiteAlpha.900'}
                            color={currentImage.favorite ? 'white' : 'gray.600'}
                            onClick={() => toggleFavorite(currentImage.id)}
                            borderRadius="full"
                            _hover={{ transform: 'scale(1.1)' }}
                          />
                        </Tooltip>
                        <Tooltip label="Share">
                          <IconButton
                            icon={<Text fontSize="xs">📤</Text>}
                            aria-label="Share"
                            size="xs"
                            variant="solid"
                            bg="whiteAlpha.900"
                            onClick={() => {
                              toast({
                                title: '📤 Coming soon!',
                                description: 'Share feature is on the way',
                                status: 'info',
                                duration: 2000,
                              });
                            }}
                            borderRadius="full"
                            _hover={{ transform: 'scale(1.1)' }}
                          />
                        </Tooltip>
                        <Tooltip label="Fullscreen">
                          <IconButton
                            icon={<FiMaximize2 />}
                            aria-label="Fullscreen"
                            size="xs"
                            variant="solid"
                            bg="whiteAlpha.900"
                            onClick={() => openImageModal(currentImage)}
                            borderRadius="full"
                            _hover={{ transform: 'scale(1.1)' }}
                          />
                        </Tooltip>
                        <Tooltip label="Download">
                          <IconButton
                            icon={<FiDownload />}
                            aria-label="Download"
                            size="xs"
                            variant="solid"
                            bg="whiteAlpha.900"
                            as="a"
                            href={currentImage.imageUrl}
                            download={`art-${currentImage.id}.png`}
                            borderRadius="full"
                            _hover={{ transform: 'scale(1.1)' }}
                          />
                        </Tooltip>
                        <Tooltip label="Delete">
                          <IconButton
                            icon={<Text fontSize="xs">🗑️</Text>}
                            aria-label="Delete"
                            size="xs"
                            variant="solid"
                            bg="whiteAlpha.900"
                            onClick={(e) => confirmDelete(currentImage, e)}
                            borderRadius="full"
                            _hover={{ transform: 'scale(1.1)', bg: 'red.50' }}
                          />
                        </Tooltip>
                      </HStack>
                    </Box>
                    {/* Image Info - compact */}
                    <Box textAlign="center" flexShrink={0}>
                      <Text fontWeight="medium" fontSize={{ base: 'sm', md: 'md' }} noOfLines={1} px={2}>
                        "{currentImage.prompt}"
                      </Text>
                      <HStack justify="center" mt={1} spacing={2}>
                        <Badge colorScheme="green" fontSize="xs">{currentStyleInfo?.emoji} {currentStyleInfo?.label}</Badge>
                        <Badge colorScheme="gray" fontSize="xs">
                          {new Date(currentImage.createdAt).toLocaleTimeString()}
                        </Badge>
                      </HStack>
                    </Box>
                  </VStack>
                ) : (
                  /* Empty State */
                  <VStack spacing={6} p={8} textAlign="center">
                    <Box
                      w="150px"
                      h="150px"
                      borderRadius="3xl"
                      bg={colors?.primary ? `${colors.primary}11` : 'green.50'}
                      border="3px dashed"
                      borderColor={colors?.primary ? `${colors.primary}44` : 'green.200'}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      p={4}
                    >
                      {childExtras?.serviceIcons?.art ? (
                        <Image 
                          src={childExtras.serviceIcons.art} 
                          alt="Art Studio"
                          w="100px"
                          h="100px"
                          objectFit="contain"
                        />
                      ) : (
                        <Text fontSize="5xl">🖼️</Text>
                      )}
                    </Box>
                    <VStack spacing={2}>
                      <Text fontSize="xl" fontWeight="bold" color="gray.700">
                        Ready to create!
                      </Text>
                      <Text color="gray.500" maxW="300px">
                        Type what you want to draw below and click the magic button!
                      </Text>
                    </VStack>
                  </VStack>
                )}
              </Flex>
            ) : (
              /* Gallery View */
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between" flexWrap="wrap" gap={2}>
                  <Text fontWeight="bold" fontSize="lg">🖼️ Your Gallery ({images.length})</Text>
                  <HStack spacing={2}>
                    {images.some(i => i.favorite) && (
                      <Badge colorScheme="red">❤️ {images.filter(i => i.favorite).length} favorites</Badge>
                    )}
                    <Text fontSize="xs" color="gray.500">Click to view • Hover for options</Text>
                  </HStack>
                </HStack>
                {images.length === 0 ? (
                  <Box bg="white" borderRadius="2xl" p={8} textAlign="center">
                    <Text fontSize="4xl" mb={4}>🎨</Text>
                    <Text fontWeight="medium">No creations yet!</Text>
                    <Text color="gray.500" fontSize="sm">Create your first artwork above</Text>
                  </Box>
                ) : (
                  <SimpleGrid columns={galleryColumns} spacing={{ base: 3, md: 4 }}>
                    {images.map((image) => (
                      <Box
                        key={image.id}
                        bg="white"
                        borderRadius="xl"
                        overflow="hidden"
                        boxShadow="md"
                        position="relative"
                        cursor="pointer"
                        transition="all 0.2s"
                        _hover={{ transform: 'translateY(-4px)', boxShadow: 'xl' }}
                        onClick={() => openImageModal(image)}
                        role="group"
                      >
                        <AspectRatio ratio={1}>
                          {image.status === 'pending' || image.status === 'processing' ? (
                            <Box bg="gray.100" display="flex" alignItems="center" justifyContent="center" p={4}>
                              <VStack spacing={3} w="full">
                                <Box
                                  w="60px"
                                  h="60px"
                                  borderRadius="full"
                                  bg="green.100"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  animation="pulse 1.5s infinite"
                                >
                                  <Text fontSize="2xl">🎨</Text>
                                </Box>
                                <VStack spacing={1} w="full">
                                  <Text fontSize="2xs" color="gray.600" fontWeight="bold" textAlign="center">
                                    {image.progress?.message || 'Creating...'}
                                  </Text>
                                  <Box w="full" bg="gray.200" borderRadius="full" h="6px">
                                    <Box
                                      w={`${image.progress?.percent || 0}%`}
                                      h="full"
                                      bg="green.400"
                                      borderRadius="full"
                                      transition="width 0.5s ease-in-out"
                                      position="relative"
                                      overflow="hidden"
                                    >
                                      <Box
                                        position="absolute"
                                        top={0}
                                        left={0}
                                        right={0}
                                        bottom={0}
                                        bgGradient="linear(to-r, transparent, whiteAlpha.600, transparent)"
                                        animation="shimmer 2s infinite"
                                        sx={{
                                          '@keyframes shimmer': {
                                            '0%': { transform: 'translateX(-100%)' },
                                            '100%': { transform: 'translateX(100%)' }
                                          }
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                  <Text fontSize="3xs" color="gray.500">
                                    {image.progress?.percent || 0}%
                                  </Text>
                                </VStack>
                              </VStack>
                            </Box>
                          ) : image.imageUrl ? (
                            <Image
                              src={image.imageUrl}
                              alt={image.prompt}
                              objectFit="cover"
                            />
                          ) : (
                            <Box bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                              <VStack spacing={1}>
                                <Text fontSize="2xl">😕</Text>
                                <Text fontSize="2xs" color="gray.500">Failed</Text>
                              </VStack>
                            </Box>
                          )}
                        </AspectRatio>
                        {/* Top-right action icons - always visible */}
                        <HStack
                          position="absolute"
                          top={1}
                          right={1}
                          spacing={0.5}
                          zIndex={2}
                        >
                          {/* Favorite button */}
                          <IconButton
                            icon={<Text fontSize="2xs">{image.favorite ? '❤️' : '🤍'}</Text>}
                            aria-label={image.favorite ? 'Remove from favorites' : 'Add to favorites'}
                            size="2xs"
                            minW="20px"
                            h="20px"
                            bg="whiteAlpha.900"
                            backdropFilter="blur(8px)"
                            boxShadow="md"
                            borderRadius="full"
                            _hover={{ transform: 'scale(1.1)', bg: 'white' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(image.id);
                            }}
                          />
                          {/* Share button */}
                          <IconButton
                            icon={<Text fontSize="2xs">📤</Text>}
                            aria-label="Share image"
                            size="2xs"
                            minW="20px"
                            h="20px"
                            bg="whiteAlpha.900"
                            backdropFilter="blur(8px)"
                            boxShadow="md"
                            borderRadius="full"
                            _hover={{ transform: 'scale(1.1)', bg: 'white' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toast({
                                title: '📤 Coming soon!',
                                description: 'Share feature is on the way',
                                status: 'info',
                                duration: 2000,
                              });
                            }}
                          />
                          {/* Delete button */}
                          <IconButton
                            icon={<Text fontSize="2xs">🗑️</Text>}
                            aria-label="Delete image"
                            size="2xs"
                            minW="20px"
                            h="20px"
                            bg="whiteAlpha.900"
                            backdropFilter="blur(8px)"
                            boxShadow="md"
                            borderRadius="full"
                            _hover={{ transform: 'scale(1.1)', bg: 'red.50' }}
                            onClick={(e) => confirmDelete(image, e)}
                          />
                        </HStack>
                        {/* Favorite badge - always visible when favorited */}
                        {image.favorite && (
                          <Box 
                            position="absolute" 
                            top={1} 
                            left={1} 
                            zIndex={1}
                            bg="white"
                            borderRadius="full"
                            p={1}
                            boxShadow="sm"
                          >
                            <Text fontSize="xs">❤️</Text>
                          </Box>
                        )}
                        {/* Status badge */}
                        {(image.status === 'pending' || image.status === 'processing') && (
                          <Box position="absolute" top={1} left={1} zIndex={1}>
                            <Badge colorScheme="yellow" fontSize="2xs">
                              {image.status === 'pending' ? '⏳ Queued' : '🎨 Creating'}
                            </Badge>
                          </Box>
                        )}
                        {/* Prompt text */}
                        <Box p={2} bg="white">
                          <Text fontSize="xs" noOfLines={1} fontWeight="medium">
                            {image.prompt}
                          </Text>
                        </Box>
                      </Box>
                    ))}
                  </SimpleGrid>
                )}
              </VStack>
            )}
          </Box>

          {/* Bottom Input Bar */}
          <Box
            bg="white"
            borderTop="1px solid"
            borderColor="gray.200"
            p={{ base: 3, md: 4 }}
            pb={{ base: 'calc(env(safe-area-inset-bottom) + 12px)', md: 4 }}
            flexShrink={0}
          >
            <Container maxW="container.lg" px={{ base: 2, md: 4 }}>
              <VStack spacing={{ base: 2, md: 3 }}>
                {/* Style & Size Selection - scrollable on mobile */}
                <HStack 
                  w="full" 
                  spacing={2} 
                  overflowX="auto" 
                  pb={1}
                  css={{
                    '&::-webkit-scrollbar': { display: 'none' },
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {ART_STYLES.map((style) => (
                    <Tooltip key={style.id} label={style.description} isDisabled={isMobile}>
                      <Button
                        size={{ base: 'xs', md: 'sm' }}
                        variant={selectedStyle === style.id ? 'solid' : 'outline'}
                        colorScheme={selectedStyle === style.id ? 'green' : 'gray'}
                        onClick={() => setSelectedStyle(style.id)}
                        borderRadius="full"
                        flexShrink={0}
                        px={{ base: 2, md: 3 }}
                      >
                        {style.emoji} {isMobile ? '' : style.label}
                      </Button>
                    </Tooltip>
                  ))}
                </HStack>

                {/* Prompt Input */}
                <HStack w="full" spacing={{ base: 2, md: 3 }}>
                  <InputGroup size={inputSize} flex={1}>
                    <Input
                      ref={inputRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                      placeholder={isMobile ? "Describe your picture..." : "Describe your picture... ✨"}
                      borderRadius="full"
                      bg="gray.50"
                      border="2px solid"
                      borderColor={colors?.primary ? `${colors.primary}44` : 'green.200'}
                      _focus={{ borderColor: colors?.primary || 'green.500', bg: 'white' }}
                      pr="50px"
                      fontSize={{ base: 'sm', md: 'md' }}
                    />
                    <InputRightElement width="50px" h="full">
                      <IconButton
                        icon={<FiZap />}
                        aria-label="Random idea"
                        size="sm"
                        variant="ghost"
                        colorScheme="green"
                        onClick={() => {
                          const random = PROMPT_SUGGESTIONS[Math.floor(Math.random() * PROMPT_SUGGESTIONS.length)];
                          setPrompt(random.text);
                        }}
                        borderRadius="full"
                      />
                    </InputRightElement>
                  </InputGroup>
                  <Button
                    colorScheme="green"
                    size={buttonSize}
                    borderRadius="full"
                    onClick={handleGenerate}
                    isLoading={loading}
                    loadingText="✨"
                    leftIcon={isMobile ? undefined : <FiSend />}
                    px={{ base: 4, md: 8 }}
                    minW={{ base: 'auto', md: '120px' }}
                  >
                    {isMobile ? '✨' : 'Create!'}
                  </Button>
                </HStack>

                {/* Quick Suggestions - fewer on mobile */}
                <Wrap spacing={{ base: 1, md: 2 }} justify="center">
                  {PROMPT_SUGGESTIONS.slice(0, isMobile ? 4 : 6).map((suggestion, i) => (
                    <WrapItem key={i}>
                      <Button
                        size="xs"
                        variant="ghost"
                        borderRadius="full"
                        onClick={() => handleSuggestionClick(suggestion.text)}
                        color="gray.600"
                        fontSize={{ base: '2xs', md: 'xs' }}
                        px={{ base: 2, md: 3 }}
                        _hover={{ bg: colors?.primary ? `${colors.primary}11` : 'green.50', color: colors?.primary || 'green.600' }}
                      >
                        {suggestion.emoji} {isMobile ? '' : suggestion.text}
                      </Button>
                    </WrapItem>
                  ))}
                </Wrap>
              </VStack>
            </Container>
          </Box>
        </Flex>
      </Flex>

      {/* Fullscreen Gallery Viewer Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="full">
        <ModalOverlay bg="blackAlpha.900" />
        <ModalContent bg="transparent" boxShadow="none" m={0}>
          <ModalCloseButton color="white" size="lg" zIndex={10} top={4} right={4} />
          <ModalBody 
            display="flex" 
            alignItems="center" 
            justifyContent="center" 
            p={0} 
            position="relative"
            h="100vh"
            overflow="hidden"
          >
            {selectedImageForModal && (
              <>
                {/* Previous Button */}
                {images.length > 1 && (
                  <IconButton
                    icon={<Text fontSize="2xl">◀</Text>}
                    aria-label="Previous image"
                    position="absolute"
                    left={{ base: 2, md: 6 }}
                    top="50%"
                    transform="translateY(-50%)"
                    zIndex={10}
                    size="lg"
                    borderRadius="full"
                    bg="whiteAlpha.300"
                    color="white"
                    _hover={{ bg: 'whiteAlpha.500' }}
                    onClick={() => navigateImage('prev')}
                  />
                )}

                {/* Main Content */}
                <VStack 
                  spacing={{ base: 2, md: 3 }} 
                  w="100%" 
                  h="100vh"
                  px={{ base: 12, md: 20 }}
                  py={{ base: 4, md: 6 }}
                  justify="center"
                  overflow="hidden"
                >
                  {/* Image Counter */}
                  <HStack spacing={2} color="white" flexShrink={0}>
                    <Text fontSize="sm" opacity={0.8}>
                      {images.findIndex(img => img.id === selectedImageForModal.id) + 1} / {images.length}
                    </Text>
                  </HStack>

                  {/* Image */}
                  <Box
                    position="relative"
                    w="auto"
                    h="auto"
                    maxW={{ base: '85vw', md: '80vw' }}
                    maxH={{ base: 'calc(100vh - 280px)', md: 'calc(100vh - 250px)' }}
                    flex="0 1 auto"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Image
                      src={selectedImageForModal.imageUrl}
                      alt={selectedImageForModal.prompt}
                      w="auto"
                      h="auto"
                      maxW="100%"
                      maxH="100%"
                      objectFit="contain"
                      borderRadius="xl"
                      boxShadow="2xl"
                    />
                  </Box>

                  {/* Prompt */}
                  <Text 
                    color="white" 
                    fontSize={{ base: 'sm', md: 'md' }} 
                    textAlign="center" 
                    maxW="600px" 
                    px={4}
                    noOfLines={2}
                    flexShrink={0}
                  >
                    "{selectedImageForModal.prompt}"
                  </Text>

                  {/* Action Buttons */}
                  <HStack spacing={{ base: 2, md: 4 }} flexWrap="wrap" justify="center" flexShrink={0}>
                    <Button
                      leftIcon={<FiDownload />}
                      colorScheme="green"
                      size={{ base: 'sm', md: 'md' }}
                      as="a"
                      href={selectedImageForModal.imageUrl}
                      download={`art-${selectedImageForModal.id}.png`}
                    >
                      Download
                    </Button>
                    <Button
                      leftIcon={<FiHeart />}
                      variant="outline"
                      colorScheme={selectedImageForModal.favorite ? 'red' : 'gray'}
                      color="white"
                      size={{ base: 'sm', md: 'md' }}
                      onClick={() => {
                        toggleFavorite(selectedImageForModal.id);
                        setSelectedImageForModal({
                          ...selectedImageForModal,
                          favorite: !selectedImageForModal.favorite
                        });
                      }}
                    >
                      {selectedImageForModal.favorite ? '❤️ Favorited' : '🤍 Favorite'}
                    </Button>
                    <Button
                      leftIcon={<Text>🗑️</Text>}
                      variant="outline"
                      colorScheme="red"
                      color="white"
                      size={{ base: 'sm', md: 'md' }}
                      onClick={() => confirmDelete(selectedImageForModal)}
                    >
                      Delete
                    </Button>
                  </HStack>

                  {/* Thumbnail Strip */}
                  {images.length > 1 && (
                    <HStack 
                      spacing={2} 
                      overflowX="auto" 
                      maxW="90vw" 
                      py={2}
                      px={4}
                      css={{
                        '&::-webkit-scrollbar': { height: '6px' },
                        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.3)', borderRadius: '3px' },
                      }}
                    >
                      {images.map((img) => (
                        <Box
                          key={img.id}
                          w="50px"
                          h="50px"
                          borderRadius="md"
                          overflow="hidden"
                          cursor="pointer"
                          border="2px solid"
                          borderColor={selectedImageForModal.id === img.id ? 'green.400' : 'transparent'}
                          opacity={selectedImageForModal.id === img.id ? 1 : 0.6}
                          _hover={{ opacity: 1 }}
                          onClick={() => setSelectedImageForModal(img)}
                          flexShrink={0}
                          transition="all 0.2s"
                        >
                          {img.imageUrl ? (
                            <Image
                              src={img.imageUrl}
                              alt={img.prompt}
                              w="full"
                              h="full"
                              objectFit="cover"
                            />
                          ) : (
                            <Box w="full" h="full" bg="gray.600" />
                          )}
                        </Box>
                      ))}
                    </HStack>
                  )}
                </VStack>

                {/* Next Button */}
                {images.length > 1 && (
                  <IconButton
                    icon={<Text fontSize="2xl">▶</Text>}
                    aria-label="Next image"
                    position="absolute"
                    right={{ base: 2, md: 6 }}
                    top="50%"
                    transform="translateY(-50%)"
                    zIndex={10}
                    size="lg"
                    borderRadius="full"
                    bg="whiteAlpha.300"
                    color="white"
                    _hover={{ bg: 'whiteAlpha.500' }}
                    onClick={() => navigateImage('next')}
                  />
                )}
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteConfirmOpen} onClose={onDeleteConfirmClose} isCentered size="sm">
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent borderRadius="2xl" mx={4} overflow="hidden">
          <ModalBody p={6} textAlign="center">
            <VStack spacing={4}>
              {/* Kid-friendly illustration */}
              <Box
                w="80px"
                h="80px"
                borderRadius="full"
                bg="red.50"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="4xl">🗑️</Text>
              </Box>
              
              {/* Title */}
              <Text fontSize="xl" fontWeight="bold" color="gray.700">
                Delete this picture?
              </Text>
              
              {/* Preview of image to delete */}
              {imageToDelete && imageToDelete.imageUrl && (
                <Box
                  w="100px"
                  h="100px"
                  borderRadius="xl"
                  overflow="hidden"
                  boxShadow="md"
                  border="3px solid"
                  borderColor="red.200"
                >
                  <Image
                    src={imageToDelete.imageUrl}
                    alt={imageToDelete.prompt}
                    w="full"
                    h="full"
                    objectFit="cover"
                  />
                </Box>
              )}
              
              {/* Message */}
              <Text color="gray.500" fontSize="sm">
                This will remove the picture forever. Are you sure?
              </Text>
              
              {/* Action buttons */}
              <HStack spacing={3} w="full" pt={2}>
                <Button
                  flex={1}
                  variant="outline"
                  colorScheme="gray"
                  borderRadius="full"
                  onClick={onDeleteConfirmClose}
                  leftIcon={<Text>👋</Text>}
                >
                  Keep it
                </Button>
                <Button
                  flex={1}
                  colorScheme="red"
                  borderRadius="full"
                  onClick={deleteImage}
                  leftIcon={<Text>🗑️</Text>}
                >
                  Delete
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
      </BackgroundContextMenu>
    </ChildDashboardLayout>
  );
}

export default function ChildArtStudioPage() {
  return (
    <ChildDashboardLayout pageType="art">
      <ArtStudioPageContent />
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
