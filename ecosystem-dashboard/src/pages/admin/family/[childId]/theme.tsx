/**
 * Child Theme Settings Page
 * 
 * Configure theme and background images for a specific child
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  IconButton,
  useToast,
  Spinner,
  FormControl,
  FormLabel,
  Select,
  Divider,
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Alert,
  AlertIcon,
  Badge,
  Radio,
  RadioGroup,
  Stack,
} from '@chakra-ui/react';
import {
  FiImage,
  FiUpload,
  FiTrash2,
  FiCheck,
  FiSave,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';

const AVAILABLE_THEMES = [
  { id: 'child-pusheen', name: 'Pusheen', description: 'Soft pastels with cute cat aesthetic', emoji: '🐱' },
  { id: 'child-minecraft', name: 'Minecraft', description: 'Blocky adventure theme', emoji: '⛏️' },
  { id: 'child-default', name: 'Default', description: 'Simple and clean', emoji: '🌟' },
];

export default function ChildThemePage() {
  const router = useRouter();
  const { childId } = router.query;
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [childName, setChildName] = useState('');
  const [currentTheme, setCurrentTheme] = useState('child-default');
  const [selectedTheme, setSelectedTheme] = useState('child-default');
  const [themeImages, setThemeImages] = useState<Record<string, string[]>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (childId) {
      fetchChildData();
      fetchThemeImages();
    }
  }, [childId]);

  const fetchChildData = async () => {
    setLoading(true);
    try {
      // Get child info
      const childRes = await fetch(`/api/admin/children/${childId}`);
      const childData = await childRes.json();
      if (childRes.ok) {
        setChildName(childData.child.name);
        const themeId = childData.child.settings?.themeId || 'child-default';
        setCurrentTheme(themeId);
        setSelectedTheme(themeId);
      }
    } catch (error) {
      toast({ title: 'Failed to fetch child data', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchThemeImages = async () => {
    try {
      // Fetch images for this specific child
      const res = await fetch(`/api/admin/theme-images?childId=${childId}`);
      if (res.ok) {
        const data = await res.json();
        setThemeImages(data);
      }
    } catch (error) {
      console.error('Failed to fetch theme images:', error);
    }
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/children/${childId}/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: selectedTheme }),
      });

      if (res.ok) {
        setCurrentTheme(selectedTheme);
        toast({ title: 'Theme saved successfully', status: 'success' });
      } else {
        const data = await res.json();
        toast({ title: data.error || 'Failed to save theme', status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to save theme', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine which theme folder to upload to based on selected theme
    const themeFolder = selectedTheme.replace('child-', '');

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('themeId', themeFolder);
      formData.append('childId', childId as string);
      formData.append('imageType', `background-${Date.now()}`);

      const res = await fetch('/api/admin/upload-theme-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: 'Image uploaded successfully', status: 'success' });
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
        toast({ title: 'Image deleted', status: 'success' });
        fetchThemeImages();
      } else {
        toast({ title: 'Failed to delete image', status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to delete image', status: 'error' });
    }
  };

  const getThemeFolder = (themeId: string) => themeId.replace('child-', '');

  if (loading) {
    return (
      <DashboardLayout>
        <Container maxW="container.xl" py={6}>
          <Box textAlign="center" py={12}>
            <Spinner size="xl" />
            <Text mt={4} color="gray.500">Loading theme settings...</Text>
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink as={NextLink} href="/admin">Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink as={NextLink} href="/admin/family">Family</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink as={NextLink} href={`/admin/family/${childId}`}>{childName}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink>Theme</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>

          {/* Header */}
          <HStack spacing={4}>
            <Icon as={FiImage} boxSize={8} color="purple.500" />
            <Box>
              <Heading size="lg">{childName}'s Theme Settings</Heading>
              <Text color="gray.600">Customize the dashboard appearance</Text>
            </Box>
          </HStack>

          {/* Theme Selection */}
          <GlassPanel p={6}>
            <VStack align="stretch" spacing={6}>
              <Heading size="md">Select Theme</Heading>
              
              <RadioGroup value={selectedTheme} onChange={setSelectedTheme}>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  {AVAILABLE_THEMES.map((theme) => (
                    <Box
                      key={theme.id}
                      p={4}
                      borderRadius="lg"
                      border="2px solid"
                      borderColor={selectedTheme === theme.id ? 'purple.500' : 'gray.200'}
                      bg={selectedTheme === theme.id ? 'purple.50' : 'white'}
                      cursor="pointer"
                      onClick={() => setSelectedTheme(theme.id)}
                      _hover={{ borderColor: 'purple.300' }}
                      transition="all 0.2s"
                    >
                      <Radio value={theme.id} colorScheme="purple">
                        <HStack spacing={3}>
                          <Text fontSize="2xl">{theme.emoji}</Text>
                          <Box>
                            <Text fontWeight="bold">{theme.name}</Text>
                            <Text fontSize="sm" color="gray.600">{theme.description}</Text>
                          </Box>
                        </HStack>
                      </Radio>
                      {currentTheme === theme.id && (
                        <Badge colorScheme="green" ml={10} mt={2}>
                          <HStack spacing={1}>
                            <FiCheck />
                            <Text>Current</Text>
                          </HStack>
                        </Badge>
                      )}
                    </Box>
                  ))}
                </SimpleGrid>
              </RadioGroup>

              {selectedTheme !== currentTheme && (
                <Button
                  leftIcon={<FiSave />}
                  colorScheme="purple"
                  onClick={handleSaveTheme}
                  isLoading={saving}
                  alignSelf="flex-start"
                >
                  Save Theme Selection
                </Button>
              )}
            </VStack>
          </GlassPanel>

          {/* Theme Background Images */}
          <GlassPanel p={6}>
            <VStack align="stretch" spacing={6}>
              <HStack justify="space-between" flexWrap="wrap" gap={4}>
                <Box>
                  <Heading size="md">
                    {AVAILABLE_THEMES.find(t => t.id === selectedTheme)?.emoji}{' '}
                    {AVAILABLE_THEMES.find(t => t.id === selectedTheme)?.name} Background Images
                  </Heading>
                  <Text fontSize="sm" color="gray.600">
                    These images are used as backgrounds on different pages
                  </Text>
                </Box>
                
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
                    colorScheme="purple"
                  >
                    Upload Image
                  </Button>
                </Box>
              </HStack>

              <Divider />

              {/* Display uploaded images for selected theme */}
              {themeImages[getThemeFolder(selectedTheme)]?.length > 0 ? (
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={4}>
                  {themeImages[getThemeFolder(selectedTheme)].map((imagePath) => (
                    <Box
                      key={imagePath}
                      position="relative"
                      borderRadius="lg"
                      overflow="hidden"
                      border="2px solid"
                      borderColor="gray.200"
                      _hover={{ borderColor: 'purple.300' }}
                    >
                      <Box
                        as="img"
                        src={imagePath}
                        alt="Theme background"
                        w="100%"
                        h="120px"
                        objectFit="cover"
                      />
                      <IconButton
                        aria-label="Delete image"
                        icon={<FiTrash2 />}
                        size="sm"
                        colorScheme="red"
                        position="absolute"
                        top={2}
                        right={2}
                        onClick={() => handleDeleteImage(imagePath)}
                      />
                      <Text 
                        fontSize="xs" 
                        p={2} 
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
                  p={8} 
                  textAlign="center" 
                  bg="gray.50" 
                  borderRadius="lg"
                  border="2px dashed"
                  borderColor="gray.300"
                >
                  <Icon as={FiImage} boxSize={12} color="gray.400" mb={4} />
                  <Text color="gray.500" fontWeight="medium">
                    No images uploaded for this theme yet.
                  </Text>
                  <Text color="gray.400" fontSize="sm">
                    Click "Upload Image" to add backgrounds.
                  </Text>
                </Box>
              )}
            </VStack>
          </GlassPanel>

          {/* Back Button */}
          <HStack>
            <Button
              as={NextLink}
              href={`/admin/family/${childId}`}
              variant="outline"
            >
              Back to {childName}'s Profile
            </Button>
          </HStack>
        </VStack>
      </Container>
    </DashboardLayout>
  );
}

export { familyAdminRouteGuard as getServerSideProps } from '@/lib/auth/admin-route-guard';
