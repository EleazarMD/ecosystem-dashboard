/**
 * Family Theme Images Page
 * 
 * Parent-accessible page for managing child theme images
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
  FormControl,
  FormLabel,
  Select,
  Divider,
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Spinner,
} from '@chakra-ui/react';
import {
  FiImage,
  FiUpload,
  FiTrash2,
  FiUser,
  FiArrowLeft,
} from 'react-icons/fi';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ChildOption {
  id: string;
  name: string;
}

export default function FamilyThemeImagesPage() {
  const router = useRouter();
  const toast = useToast();
  const bg = useSemanticToken('surface.base');
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [themeImages, setThemeImages] = useState<Record<string, string[]>>({});
  const [selectedTheme, setSelectedTheme] = useState('pusheen');
  const [uploading, setUploading] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (data.children?.length > 0) {
          setSelectedChild(data.children[0].id);
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

  if (loadingChildren) {
    return (
      <DashboardLayout>
        <Box bg={bg} minH="100vh" py={8}>
          <Container maxW="container.xl">
            <Box textAlign="center" py={12}>
              <Spinner size="xl" />
              <Text mt={4} color="gray.500">Loading...</Text>
            </Box>
          </Container>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box bg={bg} minH="100vh" py={8}>
        <Container maxW="container.xl">
          <VStack spacing={6} align="stretch">
            {/* Breadcrumb */}
            <Breadcrumb>
              <BreadcrumbItem>
                <BreadcrumbLink as={NextLink} href="/family">Family Hub</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem isCurrentPage>
                <BreadcrumbLink>Theme Images</BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>

            {/* Header */}
            <HStack justify="space-between">
              <HStack spacing={4}>
                <Icon as={FiImage} boxSize={8} color="purple.500" />
                <Box>
                  <Heading size="lg">Dashboard Theme Images</Heading>
                  <Text color="gray.600">Upload background images for your children's dashboards</Text>
                </Box>
              </HStack>
              <Button
                leftIcon={<FiArrowLeft />}
                variant="outline"
                onClick={() => router.push('/family')}
              >
                Back to Family Hub
              </Button>
            </HStack>

            {/* Theme Customization Section */}
            <GlassPanel p={6}>
              <VStack align="stretch" spacing={6}>
                <Text fontSize="sm" color="gray.600">
                  Upload background images for your children's dashboard themes. Each child has their own set of images that only they can see.
                </Text>

                {/* Child and Theme selector */}
                <HStack spacing={4} flexWrap="wrap">
                  <FormControl maxW="250px">
                    <FormLabel>Select Child</FormLabel>
                    <Select 
                      value={selectedChild} 
                      onChange={(e) => setSelectedChild(e.target.value)}
                      size="lg"
                      isDisabled={loadingChildren}
                      icon={<FiUser />}
                    >
                      {children.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl maxW="250px">
                    <FormLabel>Select Theme</FormLabel>
                    <Select 
                      value={selectedTheme} 
                      onChange={(e) => setSelectedTheme(e.target.value)}
                      size="lg"
                    >
                      <option value="pusheen">Pusheen</option>
                      <option value="minecraft">Minecraft</option>
                      <option value="default">Default</option>
                    </Select>
                  </FormControl>
                  
                  <FormControl maxW="250px">
                    <FormLabel>Upload New Image</FormLabel>
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
                      size="lg"
                    >
                      Upload Background
                    </Button>
                  </FormControl>
                </HStack>

                <Divider />

                {/* Display uploaded images */}
                <Box>
                  <Heading size="md" mb={4}>
                    {selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} Theme Images
                    {selectedChild && children.find(c => c.id === selectedChild) && (
                      <Text as="span" fontSize="sm" color="gray.500" ml={2}>
                        for {children.find(c => c.id === selectedChild)?.name}
                      </Text>
                    )}
                  </Heading>
                  {themeImages[selectedTheme]?.length > 0 ? (
                    <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={4}>
                      {themeImages[selectedTheme].map((imagePath) => (
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
                            h="150px"
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
                        Click "Upload Background" to add images.
                      </Text>
                    </Box>
                  )}
                </Box>
              </VStack>
            </GlassPanel>
          </VStack>
        </Container>
      </Box>
    </DashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const user = session.user as any;

  // Only parents can access this page
  if (!user.isParent && user.platformRole !== 'platform-admin') {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
