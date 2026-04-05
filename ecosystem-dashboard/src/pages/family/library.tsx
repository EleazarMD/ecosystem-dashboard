/**
 * Family Library Page
 * 
 * View and manage shared content (books, images) across family members
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Icon,
  Badge,
  Avatar,
  Spinner,
  useToast,
  SimpleGrid,
  Image,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import {
  FiBook,
  FiImage,
  FiShare2,
  FiArrowLeft,
  FiRefreshCw,
  FiMoreVertical,
  FiTrash2,
  FiExternalLink,
  FiUsers,
  FiBarChart2,
  FiX,
} from 'react-icons/fi';
import BookInsightsPanel from '@/components/family/BookInsightsPanel';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface SharedBook {
  share_id: string;
  content_id: string;
  title: string;
  author: string;
  cover_url?: string;
  shared_by_name: string;
  shared_at: string;
}

interface SharedImage {
  share_id: string;
  content_id: string;
  prompt: string;
  image_url: string;
  thumbnail_url?: string;
  shared_by_name: string;
  shared_at: string;
}

interface FamilyBook {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
  owner_name: string;
  owner_id: string;
  is_shared: boolean;
}

export default function FamilyLibraryPage() {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  
  const [loading, setLoading] = useState(true);
  const [sharedBooks, setSharedBooks] = useState<SharedBook[]>([]);
  const [sharedImages, setSharedImages] = useState<SharedImage[]>([]);
  const [familyLibrary, setFamilyLibrary] = useState<FamilyBook[]>([]);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [selectedBookForInsights, setSelectedBookForInsights] = useState<FamilyBook | null>(null);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/family/shared-content?type=all');
      const data = await res.json();
      
      if (res.ok) {
        setSharedBooks(data.sharedBooks || []);
        setSharedImages(data.sharedImages || []);
        setFamilyLibrary(data.familyLibrary || []);
        setTenantName(data.tenantName);
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to load library', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleShare = async (contentType: string, contentId: string) => {
    try {
      const res = await fetch('/api/family/shared-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, contentId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: data.message, status: 'success' });
        fetchContent();
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to share', status: 'error' });
    }
  };

  const handleUnshare = async (shareId: string) => {
    try {
      const res = await fetch('/api/family/shared-content', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: 'Content unshared', status: 'success' });
        fetchContent();
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to unshare', status: 'error' });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container maxW="container.xl" py={6}>
          <VStack spacing={4} py={20}>
            <Spinner size="xl" />
            <Text color={textSecondary}>Loading family library...</Text>
          </VStack>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" flexWrap="wrap" gap={4}>
            <HStack spacing={4}>
              <Button
                as={NextLink}
                href="/family"
                variant="ghost"
                leftIcon={<FiArrowLeft />}
                size="sm"
              >
                Back
              </Button>
              <VStack align="start" spacing={0}>
                <HStack spacing={2}>
                  <Heading size="lg">Family Library</Heading>
                  {tenantName && (
                    <Badge colorScheme="purple" variant="subtle">{tenantName}</Badge>
                  )}
                </HStack>
                <Text color={textSecondary}>Share books and images with your family</Text>
              </VStack>
            </HStack>
            <Button
              leftIcon={<FiRefreshCw />}
              variant="outline"
              size="sm"
              onClick={fetchContent}
            >
              Refresh
            </Button>
          </HStack>

          <Tabs colorScheme="purple">
            <TabList>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiBook} />
                  <Text>Shared Books</Text>
                  {sharedBooks.length > 0 && <Badge>{sharedBooks.length}</Badge>}
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiImage} />
                  <Text>Shared Images</Text>
                  {sharedImages.length > 0 && <Badge>{sharedImages.length}</Badge>}
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiUsers} />
                  <Text>Family Books</Text>
                  {familyLibrary.length > 0 && <Badge>{familyLibrary.length}</Badge>}
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiBarChart2} />
                  <Text>Book Insights</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Shared Books Tab */}
              <TabPanel px={0}>
                {sharedBooks.length === 0 ? (
                  <GlassPanel variant="light" p={8}>
                    <VStack spacing={4}>
                      <Icon as={FiBook} boxSize={12} color="gray.400" />
                      <Heading size="md">No Shared Books</Heading>
                      <Text color={textSecondary} textAlign="center">
                        Books shared with the family will appear here.
                      </Text>
                    </VStack>
                  </GlassPanel>
                ) : (
                  <SimpleGrid columns={{ base: 2, md: 3, lg: 4, xl: 5 }} spacing={4}>
                    {sharedBooks.map((book) => (
                      <GlassPanel key={book.share_id} variant="light" p={3}>
                        <VStack spacing={2} align="stretch">
                          <Box
                            h="160px"
                            bg="gray.100"
                            borderRadius="md"
                            overflow="hidden"
                          >
                            {book.cover_url ? (
                              <Image
                                src={book.cover_url}
                                alt={book.title}
                                w="100%"
                                h="100%"
                                objectFit="cover"
                              />
                            ) : (
                              <VStack h="100%" justify="center">
                                <Icon as={FiBook} boxSize={8} color="gray.400" />
                              </VStack>
                            )}
                          </Box>
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="medium" fontSize="sm" noOfLines={2}>
                              {book.title}
                            </Text>
                            <Text fontSize="xs" color={textSecondary} noOfLines={1}>
                              {book.author}
                            </Text>
                          </VStack>
                          <HStack justify="space-between" fontSize="xs">
                            <Text color={textSecondary}>
                              Shared by {book.shared_by_name}
                            </Text>
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<FiMoreVertical />}
                                variant="ghost"
                                size="xs"
                              />
                              <MenuList>
                                <MenuItem icon={<FiExternalLink />}>
                                  Open Book
                                </MenuItem>
                                <MenuItem
                                  icon={<FiTrash2 />}
                                  color="red.500"
                                  onClick={() => handleUnshare(book.share_id)}
                                >
                                  Unshare
                                </MenuItem>
                              </MenuList>
                            </Menu>
                          </HStack>
                        </VStack>
                      </GlassPanel>
                    ))}
                  </SimpleGrid>
                )}
              </TabPanel>

              {/* Shared Images Tab */}
              <TabPanel px={0}>
                {sharedImages.length === 0 ? (
                  <GlassPanel variant="light" p={8}>
                    <VStack spacing={4}>
                      <Icon as={FiImage} boxSize={12} color="gray.400" />
                      <Heading size="md">No Shared Images</Heading>
                      <Text color={textSecondary} textAlign="center">
                        Images shared with the family will appear here.
                      </Text>
                    </VStack>
                  </GlassPanel>
                ) : (
                  <SimpleGrid columns={{ base: 2, md: 3, lg: 4, xl: 5 }} spacing={4}>
                    {sharedImages.map((image) => (
                      <GlassPanel key={image.share_id} variant="light" p={3}>
                        <VStack spacing={2} align="stretch">
                          <Box
                            h="160px"
                            bg="gray.100"
                            borderRadius="md"
                            overflow="hidden"
                          >
                            <Image
                              src={image.thumbnail_url || image.image_url}
                              alt={image.prompt}
                              w="100%"
                              h="100%"
                              objectFit="cover"
                            />
                          </Box>
                          <Text fontSize="xs" color={textSecondary} noOfLines={2}>
                            {image.prompt}
                          </Text>
                          <HStack justify="space-between" fontSize="xs">
                            <Text color={textSecondary}>
                              By {image.shared_by_name}
                            </Text>
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<FiMoreVertical />}
                                variant="ghost"
                                size="xs"
                              />
                              <MenuList>
                                <MenuItem icon={<FiExternalLink />}>
                                  View Full Size
                                </MenuItem>
                                <MenuItem
                                  icon={<FiTrash2 />}
                                  color="red.500"
                                  onClick={() => handleUnshare(image.share_id)}
                                >
                                  Unshare
                                </MenuItem>
                              </MenuList>
                            </Menu>
                          </HStack>
                        </VStack>
                      </GlassPanel>
                    ))}
                  </SimpleGrid>
                )}
              </TabPanel>

              {/* Family Books Tab */}
              <TabPanel px={0}>
                <VStack spacing={4} align="stretch">
                  <Text color={textSecondary}>
                    All books owned by family members. Share them to make them accessible to everyone.
                  </Text>
                  
                  {familyLibrary.length === 0 ? (
                    <GlassPanel variant="light" p={8}>
                      <VStack spacing={4}>
                        <Icon as={FiBook} boxSize={12} color="gray.400" />
                        <Heading size="md">No Books Yet</Heading>
                        <Text color={textSecondary} textAlign="center">
                          Books uploaded by family members will appear here.
                        </Text>
                      </VStack>
                    </GlassPanel>
                  ) : (
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 4, xl: 5 }} spacing={4}>
                      {familyLibrary.map((book) => (
                        <GlassPanel key={book.id} variant="light" p={3}>
                          <VStack spacing={2} align="stretch">
                            <Box position="relative">
                              <Box
                                h="160px"
                                bg="gray.100"
                                borderRadius="md"
                                overflow="hidden"
                              >
                                {book.cover_url ? (
                                  <Image
                                    src={book.cover_url}
                                    alt={book.title}
                                    w="100%"
                                    h="100%"
                                    objectFit="cover"
                                  />
                                ) : (
                                  <VStack h="100%" justify="center">
                                    <Icon as={FiBook} boxSize={8} color="gray.400" />
                                  </VStack>
                                )}
                              </Box>
                              {book.is_shared && (
                                <Badge
                                  position="absolute"
                                  top={2}
                                  right={2}
                                  colorScheme="green"
                                  fontSize="xs"
                                >
                                  Shared
                                </Badge>
                              )}
                            </Box>
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="medium" fontSize="sm" noOfLines={2}>
                                {book.title}
                              </Text>
                              <Text fontSize="xs" color={textSecondary} noOfLines={1}>
                                {book.author}
                              </Text>
                            </VStack>
                            <HStack justify="space-between" fontSize="xs">
                              <Text color={textSecondary}>
                                {book.owner_name}
                              </Text>
                              {!book.is_shared && (
                                <Button
                                  size="xs"
                                  leftIcon={<FiShare2 />}
                                  variant="outline"
                                  colorScheme="purple"
                                  onClick={() => handleShare('book', book.id)}
                                >
                                  Share
                                </Button>
                              )}
                            </HStack>
                          </VStack>
                        </GlassPanel>
                      ))}
                    </SimpleGrid>
                  )}
                </VStack>
              </TabPanel>

              {/* Book Insights Tab */}
              <TabPanel px={0}>
                <VStack spacing={4} align="stretch">
                  {selectedBookForInsights ? (
                    <>
                      <HStack justify="space-between">
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<FiArrowLeft />}
                          onClick={() => setSelectedBookForInsights(null)}
                        >
                          Back to book list
                        </Button>
                      </HStack>
                      <GlassPanel variant="light" p={4}>
                        <BookInsightsPanel
                          bookId={selectedBookForInsights.id}
                          bookTitle={selectedBookForInsights.title}
                        />
                      </GlassPanel>
                    </>
                  ) : (
                    <>
                      <GlassPanel variant="light" p={4}>
                        <VStack spacing={2} align="start">
                          <Heading size="sm">📊 Analyze Book Content</Heading>
                          <Text fontSize="sm" color={textSecondary}>
                            Select a book to view linguistic analysis, learning insights, and content visualization.
                          </Text>
                        </VStack>
                      </GlassPanel>
                      
                      {familyLibrary.length === 0 ? (
                        <GlassPanel variant="light" p={8}>
                          <VStack spacing={4}>
                            <Icon as={FiBarChart2} boxSize={12} color="gray.400" />
                            <Heading size="md">No Books to Analyze</Heading>
                            <Text color={textSecondary} textAlign="center">
                              Upload books to your family library to analyze their content.
                            </Text>
                          </VStack>
                        </GlassPanel>
                      ) : (
                        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                          {familyLibrary.map((book) => (
                            <Box
                              key={book.id}
                              bg="whiteAlpha.600"
                              backdropFilter="blur(10px)"
                              borderRadius="xl"
                              border="1px solid"
                              borderColor="whiteAlpha.300"
                              p={4}
                              cursor="pointer"
                              _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
                              transition="all 0.2s"
                              onClick={() => setSelectedBookForInsights(book)}
                            >
                              <HStack spacing={4}>
                                <Box
                                  w="60px"
                                  h="80px"
                                  bg="gray.100"
                                  borderRadius="md"
                                  overflow="hidden"
                                  flexShrink={0}
                                >
                                  {book.cover_url ? (
                                    <Image
                                      src={book.cover_url}
                                      alt={book.title}
                                      w="100%"
                                      h="100%"
                                      objectFit="cover"
                                    />
                                  ) : (
                                    <VStack h="100%" justify="center">
                                      <Icon as={FiBook} boxSize={6} color="gray.400" />
                                    </VStack>
                                  )}
                                </Box>
                                <VStack align="start" spacing={1} flex={1}>
                                  <Text fontWeight="medium" noOfLines={2}>
                                    {book.title}
                                  </Text>
                                  <Text fontSize="sm" color={textSecondary}>
                                    {book.author}
                                  </Text>
                                  <Badge colorScheme="purple" size="sm">
                                    View Insights →
                                  </Badge>
                                </VStack>
                              </HStack>
                            </Box>
                          ))}
                        </SimpleGrid>
                      )}
                    </>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </DashboardLayout>
  );
}
