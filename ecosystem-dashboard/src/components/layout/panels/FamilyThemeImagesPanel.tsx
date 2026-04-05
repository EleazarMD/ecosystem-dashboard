/**
 * Family Theme Images Panel
 * 
 * Right panel for managing child theme images
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  IconButton,
  Select,
  SimpleGrid,
  Icon,
  Spinner,
  useToast,
  Divider,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import {
  FiImage,
  FiUpload,
  FiTrash2,
  FiUser,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ChildOption {
  id: string;
  name: string;
}

export default function FamilyThemeImagesPanel() {
  const { customData } = useRightPanel();
  const toast = useToast();
  
  const bgSubtle = useSemanticToken('surface.subtle');
  const borderColor = useSemanticToken('border.default');
  const textSecondary = useSemanticToken('text.secondary');
  
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>(customData?.selectedChildId || '');
  const [themeImages, setThemeImages] = useState<Record<string, string[]>>({});
  const [selectedTheme, setSelectedTheme] = useState('pusheen');
  const [uploading, setUploading] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update selected child when customData changes
  useEffect(() => {
    if (customData?.selectedChildId) {
      setSelectedChild(customData.selectedChildId);
    }
  }, [customData?.selectedChildId]);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchThemeImages();
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    setLoadingChildren(true);
    try {
      const res = await fetch('/api/admin/children');
      if (res.ok) {
        const data = await res.json();
        setChildren(data.children || []);
        // If no child selected yet, select the first one or use customData
        if (!selectedChild && data.children?.length > 0) {
          setSelectedChild(customData?.selectedChildId || data.children[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setLoadingChildren(false);
    }
  };

  const fetchThemeImages = async () => {
    if (!selectedChild) return;
    try {
      const res = await fetch(`/api/admin/theme-images?childId=${selectedChild}`);
      if (res.ok) {
        const data = await res.json();
        setThemeImages(data);
      }
    } catch (error) {
      console.error('Failed to fetch theme images:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedChild) {
      toast({ title: 'Please select a child first', status: 'warning' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('themeId', selectedTheme);
      formData.append('childId', selectedChild);
      formData.append('imageType', `background-${Date.now()}`);

      const res = await fetch('/api/admin/upload-theme-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: 'Image uploaded!', status: 'success', duration: 2000 });
        fetchThemeImages();
      } else {
        toast({ title: data.error || 'Upload failed', status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to upload image', status: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (imagePath: string) => {
    try {
      const res = await fetch('/api/admin/theme-images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePath }),
      });

      if (res.ok) {
        toast({ title: 'Image deleted', status: 'success', duration: 2000 });
        fetchThemeImages();
      } else {
        toast({ title: 'Failed to delete image', status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to delete image', status: 'error' });
    }
  };

  const selectedChildName = children.find(c => c.id === selectedChild)?.name || '';

  if (loadingChildren) {
    return (
      <Box p={4} textAlign="center">
        <Spinner size="lg" />
        <Text mt={4} color={textSecondary}>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box h="100%" overflow="auto" p={4}>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack spacing={3}>
          <Icon as={FiImage} boxSize={6} color="purple.500" />
          <Box>
            <Heading size="sm">Theme Images</Heading>
            <Text fontSize="xs" color={textSecondary}>
              Upload backgrounds for dashboards
            </Text>
          </Box>
        </HStack>

        <Divider />

        {/* Child Selector */}
        <FormControl size="sm">
          <FormLabel fontSize="xs" mb={1}>Child</FormLabel>
          <Select 
            value={selectedChild} 
            onChange={(e) => setSelectedChild(e.target.value)}
            size="sm"
            icon={<FiUser />}
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </Select>
        </FormControl>

        {/* Theme Selector */}
        <FormControl size="sm">
          <FormLabel fontSize="xs" mb={1}>Theme</FormLabel>
          <Select 
            value={selectedTheme} 
            onChange={(e) => setSelectedTheme(e.target.value)}
            size="sm"
          >
            <option value="pusheen">🐱 Pusheen</option>
            <option value="minecraft">⛏️ Minecraft</option>
            <option value="default">🎨 Default</option>
          </Select>
        </FormControl>

        {/* Upload Button */}
        <Box>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <Button
            leftIcon={<FiUpload />}
            onClick={() => fileInputRef.current?.click()}
            isLoading={uploading}
            isDisabled={!selectedChild}
            colorScheme="purple"
            size="sm"
            w="100%"
          >
            Upload Background
          </Button>
        </Box>

        <Divider />

        {/* Images Grid */}
        <Box>
          <Text fontSize="xs" fontWeight="bold" mb={2} color={textSecondary}>
            {selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} Images
            {selectedChildName && ` for ${selectedChildName}`}
          </Text>
          
          {themeImages[selectedTheme]?.length > 0 ? (
            <SimpleGrid columns={2} spacing={2}>
              {themeImages[selectedTheme].map((imagePath) => (
                <Box
                  key={imagePath}
                  position="relative"
                  borderRadius="md"
                  overflow="hidden"
                  border="1px solid"
                  borderColor={borderColor}
                  _hover={{ borderColor: 'purple.300' }}
                >
                  <Box
                    as="img"
                    src={imagePath}
                    alt="Theme background"
                    w="100%"
                    h="80px"
                    objectFit="cover"
                  />
                  <IconButton
                    aria-label="Delete image"
                    icon={<FiTrash2 />}
                    size="xs"
                    colorScheme="red"
                    position="absolute"
                    top={1}
                    right={1}
                    onClick={() => handleDeleteImage(imagePath)}
                  />
                  <Text 
                    fontSize="2xs" 
                    p={1} 
                    bg="blackAlpha.700" 
                    color="white" 
                    isTruncated
                  >
                    {imagePath.split('/').pop()}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          ) : (
            <Box 
              p={4} 
              textAlign="center" 
              bg={bgSubtle} 
              borderRadius="md"
              border="2px dashed"
              borderColor={borderColor}
            >
              <Icon as={FiImage} boxSize={8} color="gray.400" mb={2} />
              <Text fontSize="xs" color={textSecondary}>
                No images yet
              </Text>
              <Text fontSize="2xs" color="gray.400">
                Upload backgrounds above
              </Text>
            </Box>
          )}
        </Box>
      </VStack>
    </Box>
  );
}
