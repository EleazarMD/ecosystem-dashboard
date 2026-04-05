/**
 * Child Reader Index Page
 * 
 * Redirects to book explorer or shows available books when no book ID is provided.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  SimpleGrid,
  Spinner,
  Icon,
  Button,
} from '@chakra-ui/react';
import { FiBook, FiArrowLeft } from 'react-icons/fi';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_image_path?: string;
  page_count?: number;
}

export default function ChildReaderIndex() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const textSecondary = useSemanticToken('text.secondary');
  const bg = useSemanticToken('surface.elevated');

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await fetch('/api/child/books');
        const data = await res.json();
        if (res.ok && data.books) {
          setBooks(data.books);
        }
      } catch (error) {
        console.error('Failed to fetch books:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <Container maxW="container.lg" py={8}>
          <VStack spacing={4} py={20}>
            <Spinner size="xl" color="purple.500" />
            <Text color={textSecondary}>Loading your books...</Text>
          </VStack>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxW="container.lg" py={8}>
        <VStack spacing={6} align="stretch">
          <HStack justify="space-between">
            <VStack align="start" spacing={0}>
              <Heading size="lg">📚 My Books</Heading>
              <Text color={textSecondary}>Choose a book to read</Text>
            </VStack>
            <Button
              as={NextLink}
              href="/child/book-explorer"
              leftIcon={<FiArrowLeft />}
              variant="ghost"
            >
              Back to Explorer
            </Button>
          </HStack>

          {books.length === 0 ? (
            <Box
              bg={bg}
              borderRadius="xl"
              p={12}
              textAlign="center"
            >
              <Icon as={FiBook} boxSize={16} color="gray.400" mb={4} />
              <Heading size="md" mb={2}>No Books Yet!</Heading>
              <Text color={textSecondary} mb={4}>
                Ask a parent to add some books for you to read.
              </Text>
              <Button
                as={NextLink}
                href="/child/book-explorer"
                colorScheme="purple"
              >
                Go to Book Explorer
              </Button>
            </Box>
          ) : (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={4}>
              {books.map((book) => (
                <Box
                  key={book.id}
                  bg={bg}
                  borderRadius="xl"
                  overflow="hidden"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{ transform: 'scale(1.02)', shadow: 'lg' }}
                  onClick={() => router.push(`/child/reader/${book.id}`)}
                >
                  <Box
                    h="180px"
                    bg="purple.100"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {book.cover_image_path ? (
                      <Box
                        as="img"
                        src={book.cover_image_path}
                        alt={book.title}
                        w="100%"
                        h="100%"
                        objectFit="cover"
                      />
                    ) : (
                      <Icon as={FiBook} boxSize={12} color="purple.400" />
                    )}
                  </Box>
                  <Box p={3}>
                    <Text fontWeight="bold" fontSize="sm" noOfLines={2}>
                      {book.title}
                    </Text>
                    <Text fontSize="xs" color={textSecondary} noOfLines={1}>
                      {book.author}
                    </Text>
                    {book.page_count && (
                      <Text fontSize="xs" color="purple.500" mt={1}>
                        {book.page_count} pages
                      </Text>
                    )}
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </VStack>
      </Container>
    </DashboardLayout>
  );
}
