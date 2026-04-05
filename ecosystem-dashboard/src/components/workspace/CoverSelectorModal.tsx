/**
 * Cover Selector Modal
 * Select cover images from Unsplash, gradients, colors, or upload
 */

import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  SimpleGrid,
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
  Text,
  Button,
  useToast,
  Spinner,
  Image,
  HStack,
} from '@chakra-ui/react';
import { FiSearch, FiUpload } from 'react-icons/fi';
import { NOTION_GRADIENTS, NOTION_COLORS } from './PageCover';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface CoverSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCover: (coverUrl: string, coverType: 'image' | 'gradient' | 'solid') => void;
}

// Curated gallery images (Museum/NASA themed)
const GALLERY_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1500',
    title: 'NASA - Nebula',
    source: 'NASA',
  },
  {
    url: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=1500',
    title: 'James Webb - Galaxy',
    source: 'JWST',
  },
  {
    url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1500',
    title: 'Mountain Landscape',
    source: 'Nature',
  },
  {
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1500',
    title: 'Mountain Lake',
    source: 'Nature',
  },
  {
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1500',
    title: 'Abstract Gradient',
    source: 'Abstract',
  },
  {
    url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1500',
    title: 'Abstract Waves',
    source: 'Abstract',
  },
];

export function CoverSelectorModal({
  isOpen,
  onClose,
  onSelectCover,
}: CoverSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const toast = useToast();

  const searchUnsplash = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/unsplash/search?query=${encodeURIComponent(searchQuery)}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setUnsplashResults(data.results || []);

      if (data.results.length === 0) {
        toast({
          title: 'No results',
          description: `No images found for "${searchQuery}"`,
          status: 'info',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Unsplash search failed:', error);
      toast({
        title: 'Search failed',
        description: 'Could not search Unsplash. Check console for details.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectImage = (url: string) => {
    onSelectCover(url, 'image');
    onClose();
  };

  const handleSelectGradient = (gradientKey: string) => {
    onSelectCover(gradientKey, 'gradient');
    onClose();
  };

  const handleSelectColor = (colorKey: string) => {
    onSelectCover(colorKey, 'solid');
    onClose();
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onSelectCover(dataUrl, 'image');
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Cover</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Tabs colorScheme="blue">
            <TabList>
              <Tab>Gallery</Tab>
              <Tab>Unsplash</Tab>
              <Tab>Gradients</Tab>
              <Tab>Colors</Tab>
              <Tab>Upload</Tab>
            </TabList>

            <TabPanels>
              {/* Gallery Tab */}
              <TabPanel>
                <VStack align="stretch" spacing={4}>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    Curated images from NASA, James Webb, and more
                  </Text>
                  <SimpleGrid columns={3} spacing={4}>
                    {GALLERY_IMAGES.map((image, idx) => (
                      <Box
                        key={idx}
                        position="relative"
                        borderRadius="md"
                        overflow="hidden"
                        cursor="pointer"
                        _hover={{ transform: 'scale(1.05)', transition: 'all 0.2s' }}
                        onClick={() => handleSelectImage(image.url)}
                      >
                        <Image
                          src={image.url}
                          alt={image.title}
                          w="100%"
                          h="120px"
                          objectFit="cover"
                        />
                        <Box
                          position="absolute"
                          bottom={0}
                          left={0}
                          right={0}
                          p={2}
                          bg="blackAlpha.600"
                          backdropFilter="blur(10px)"
                        >
                          <Text fontSize="xs" color="whiteAlpha.900" fontWeight="600">
                            {image.title}
                          </Text>
                          <Text fontSize="xs" color="whiteAlpha.700">
                            {image.source}
                          </Text>
                        </Box>
                      </Box>
                    ))}
                  </SimpleGrid>
                </VStack>
              </TabPanel>

              {/* Unsplash Tab */}
              <TabPanel>
                <VStack align="stretch" spacing={4}>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiSearch} color={useSemanticToken('text.tertiary')} />
                    </InputLeftElement>
                    <Input
                      placeholder="Search millions of images..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchUnsplash()}
                    />
                    <Button ml={2} colorScheme="blue" onClick={searchUnsplash} isLoading={isSearching}>
                      Search
                    </Button>
                  </InputGroup>

                  {isSearching ? (
                    <Box textAlign="center" py={8}>
                      <Spinner size="xl" />
                    </Box>
                  ) : unsplashResults.length > 0 ? (
                    <SimpleGrid columns={3} spacing={4}>
                      {unsplashResults.map((image) => (
                        <Box
                          key={image.id}
                          borderRadius="md"
                          overflow="hidden"
                          cursor="pointer"
                          _hover={{ transform: 'scale(1.05)', transition: 'all 0.2s' }}
                          onClick={() => handleSelectImage(image.urls.regular)}
                        >
                          <Image
                            src={image.urls.regular}
                            alt={image.alt_description}
                            w="100%"
                            h="120px"
                            objectFit="cover"
                          />
                        </Box>
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Box textAlign="center" py={8}>
                      <Text color={useSemanticToken('text.secondary')}>
                        Search for images on Unsplash
                      </Text>
                      <Text fontSize="sm" color={useSemanticToken('text.tertiary')} mt={2}>
                        All photos are free to use
                      </Text>
                    </Box>
                  )}
                </VStack>
              </TabPanel>

              {/* Gradients Tab */}
              <TabPanel>
                <SimpleGrid columns={4} spacing={4}>
                  {Object.entries(NOTION_GRADIENTS).map(([key, gradient]) => (
                    <Box
                      key={key}
                      h="80px"
                      borderRadius="md"
                      background={gradient}
                      cursor="pointer"
                      _hover={{ transform: 'scale(1.05)', transition: 'all 0.2s' }}
                      onClick={() => handleSelectGradient(key)}
                      boxShadow="md"
                    />
                  ))}
                </SimpleGrid>
              </TabPanel>

              {/* Colors Tab */}
              <TabPanel>
                <SimpleGrid columns={5} spacing={4}>
                  {Object.entries(NOTION_COLORS).map(([key, color]) => (
                    <VStack key={key} spacing={1}>
                      <Box
                        h="60px"
                        w="100%"
                        borderRadius="md"
                        bg={color}
                        cursor="pointer"
                        _hover={{ transform: 'scale(1.05)', transition: 'all 0.2s' }}
                        onClick={() => handleSelectColor(key)}
                        boxShadow="md"
                      />
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} textTransform="capitalize">
                        {key}
                      </Text>
                    </VStack>
                  ))}
                </SimpleGrid>
              </TabPanel>

              {/* Upload Tab */}
              <TabPanel>
                <VStack spacing={4} py={8}>
                  <Icon as={FiUpload} boxSize={12} color={useSemanticToken('text.tertiary')} />
                  <Text fontSize="lg" fontWeight="600">
                    Upload an image
                  </Text>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')} textAlign="center">
                    Recommended: 1500px wide for optimal quality
                  </Text>
                  <Button
                    as="label"
                    htmlFor="cover-upload"
                    colorScheme="blue"
                    cursor="pointer"
                  >
                    Choose File
                    <input
                      id="cover-upload"
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleUpload}
                    />
                  </Button>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
