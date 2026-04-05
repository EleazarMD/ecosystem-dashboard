/**
 * Admin Theme Images Panel
 * Right panel content for viewing and managing theme background images
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Spinner,
  Icon,
  SimpleGrid,
  Image,
  IconButton,
  useToast,
  Select,
  FormControl,
  FormLabel,
  Progress,
} from '@chakra-ui/react';
import {
  FiImage,
  FiUpload,
  FiTrash2,
  FiCheck,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const THEMES = [
  { id: 'pusheen', name: 'Pusheen', color: 'pink' },
  { id: 'space', name: 'Space', color: 'purple' },
  { id: 'ocean', name: 'Ocean', color: 'blue' },
  { id: 'forest', name: 'Forest', color: 'green' },
  { id: 'candy', name: 'Candy', color: 'pink' },
];

export default function AdminThemeImagesPanel() {
  const { activeTab } = useRightPanel();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const bgSubtle = useSemanticToken('surface.subtle');
  const textSecondary = useSemanticToken('text.secondary');
  
  const [themeImages, setThemeImages] = useState<Record<string, string[]>>({});
  const [selectedTheme, setSelectedTheme] = useState('pusheen');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchThemeImages();
  }, []);

  const fetchThemeImages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/theme-images');
      if (res.ok) {
        const data = await res.json();
        setThemeImages(data);
      }
    } catch (error) {
      console.error('Failed to fetch theme images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('theme', selectedTheme);

    try {
      const res = await fetch('/api/admin/theme-images', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast({ title: 'Image uploaded', status: 'success', duration: 2000 });
        fetchThemeImages();
      } else {
        toast({ title: 'Upload failed', status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Upload failed', status: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (theme: string, imageUrl: string) => {
    try {
      const res = await fetch('/api/admin/theme-images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, imageUrl }),
      });

      if (res.ok) {
        toast({ title: 'Image deleted', status: 'success', duration: 2000 });
        fetchThemeImages();
      }
    } catch (error) {
      toast({ title: 'Delete failed', status: 'error' });
    }
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={4} color={textSecondary}>Loading theme images...</Text>
      </Box>
    );
  }

  // Gallery Tab
  if (activeTab === 'theme-gallery') {
    const currentImages = themeImages[selectedTheme] || [];
    
    return (
      <VStack spacing={4} p={4} align="stretch">
        <Text fontWeight="bold" fontSize="md">Theme Gallery</Text>
        
        {/* Theme Selector */}
        <FormControl size="sm">
          <FormLabel fontSize="sm">Select Theme</FormLabel>
          <Select
            size="sm"
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
          >
            {THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </Select>
        </FormControl>

        {/* Image Grid */}
        {currentImages.length > 0 ? (
          <SimpleGrid columns={2} spacing={2}>
            {currentImages.map((imageUrl, index) => (
              <Box
                key={index}
                position="relative"
                borderRadius="md"
                overflow="hidden"
                _hover={{ '& .delete-btn': { opacity: 1 } }}
              >
                <Image
                  src={imageUrl}
                  alt={`${selectedTheme} theme ${index + 1}`}
                  objectFit="cover"
                  h="80px"
                  w="100%"
                />
                <IconButton
                  className="delete-btn"
                  aria-label="Delete image"
                  icon={<FiTrash2 />}
                  size="xs"
                  colorScheme="red"
                  position="absolute"
                  top={1}
                  right={1}
                  opacity={0}
                  transition="opacity 0.2s"
                  onClick={() => handleDeleteImage(selectedTheme, imageUrl)}
                />
              </Box>
            ))}
          </SimpleGrid>
        ) : (
          <Box p={4} bg={bgSubtle} borderRadius="md" textAlign="center">
            <Icon as={FiImage} boxSize={8} color="gray.400" mb={2} />
            <Text fontSize="sm" color={textSecondary}>
              No images for this theme
            </Text>
          </Box>
        )}

        {/* Stats */}
        <HStack justify="space-between" p={2} bg={bgSubtle} borderRadius="md">
          <Text fontSize="sm">Total Images</Text>
          <Text fontSize="sm" fontWeight="bold">{currentImages.length}</Text>
        </HStack>
      </VStack>
    );
  }

  // Upload Tab
  if (activeTab === 'theme-upload') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <Text fontWeight="bold" fontSize="md">Upload Theme Image</Text>
        
        {/* Theme Selector */}
        <FormControl>
          <FormLabel fontSize="sm">Target Theme</FormLabel>
          <Select
            size="sm"
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
          >
            {THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </Select>
        </FormControl>

        {/* Upload Area */}
        <Box
          p={6}
          bg={bgSubtle}
          borderRadius="md"
          border="2px dashed"
          borderColor="gray.300"
          textAlign="center"
          cursor="pointer"
          onClick={() => fileInputRef.current?.click()}
          _hover={{ borderColor: 'blue.400', bg: 'blue.50' }}
          transition="all 0.2s"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          
          {uploading ? (
            <>
              <Spinner size="lg" color="blue.500" mb={2} />
              <Text fontSize="sm" color={textSecondary}>Uploading...</Text>
              <Progress size="sm" isIndeterminate mt={2} />
            </>
          ) : (
            <>
              <Icon as={FiUpload} boxSize={8} color="gray.400" mb={2} />
              <Text fontSize="sm" fontWeight="medium">Click to upload</Text>
              <Text fontSize="xs" color={textSecondary} mt={1}>
                PNG, JPG, or WebP up to 5MB
              </Text>
            </>
          )}
        </Box>

        {/* Current Theme Stats */}
        <Box p={3} bg={bgSubtle} borderRadius="md">
          <HStack justify="space-between">
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" fontWeight="medium">
                {THEMES.find(t => t.id === selectedTheme)?.name} Theme
              </Text>
              <Text fontSize="xs" color={textSecondary}>
                {(themeImages[selectedTheme] || []).length} images
              </Text>
            </VStack>
            <Icon as={FiCheck} color="green.500" />
          </HStack>
        </Box>
      </VStack>
    );
  }

  return null;
}
